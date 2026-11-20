function mailEnvelope(message) {
  const split = message.indexOf("\n\n");
  if (split < 0) invalid("emailFile", "invalid_email_file", "В письме отсутствуют заголовки.");
  const headers = Object.create(null);
  for (const line of message.slice(0, split).replace(/\n[ \t]+/g, " ").split("\n")) {
    const separator = line.indexOf(":");
    if (separator > 0) headers[line.slice(0, separator).toLowerCase()] ??= line.slice(separator + 1).trim();
  }
  return { headers, body: message.slice(split + 2) };
}
function transferBytes(body, encoding) {
  if (/^base64$/i.test(encoding || "")) {
    try { return Uint8Array.from(atob(body.replace(/\s+/g, "")), char => char.charCodeAt(0)); }
    catch { invalid("emailFile", "invalid_encoding", "Письмо содержит повреждённое вложение."); }
  }
  if (/^quoted-printable$/i.test(encoding || "")) {
    const input = textEncoder.encode(body.replace(/=\n/g,""));
    const output = new Uint8Array(input.length);
    let length = 0;
    for (let index=0; index<input.length; index++) {
      if (input[index] === 61 && index+2 < input.length) {
        const pair = String.fromCharCode(input[index+1],input[index+2]);
        if (/^[0-9a-f]{2}$/i.test(pair)) {
          output[length++] = Number.parseInt(pair,16);
          index += 2;
          continue;
        }
      }
      output[length++] = input[index];
    }
    return output.subarray(0,length);
  }
  return textEncoder.encode(body);
}
function decodeMailText(bytes, encoding = "utf-8") {
  try { return new TextDecoder(encoding).decode(Uint8Array.from(bytes)); }
  catch { return textDecoder.decode(Uint8Array.from(bytes)); }
}
function decodeMailHeader(header = "") {
  return header.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, charset, mode, word) =>
    decodeMailText(transferBytes(mode.toUpperCase() === "B" ? word : word.replaceAll("_", " "),
      mode.toUpperCase() === "B" ? "base64" : "quoted-printable"), charset));
}
function mimeParameter(header, name) {
  const match = new RegExp("(?:^|;)\\s*" + name + "\\s*=\\s*(?:\"([^\"]*)\"|([^;\\s]+))", "i").exec(header || "");
  return match?.[1] ?? match?.[2] ?? "";
}
function mailParts({ headers, body }, parts, depth = 0) {
  if (depth > 6 || ++parts.count > 100) invalid("emailFile", "too_many_parts", "В письме слишком много вложенных частей.");
  const type = headers["content-type"] || "text/plain";
  if (/^multipart\//i.test(type)) {
    const boundary = mimeParameter(type, "boundary");
    if (!boundary) invalid("emailFile", "invalid_boundary", "Не удалось прочитать части письма.");
    const start = "--" + boundary;
    let lines = null;
    for (const line of body.split("\n")) {
      if (line === start || line === start + "--") {
        if (lines?.length) mailParts(mailEnvelope(lines.join("\n")), parts, depth + 1);
        if (line === start + "--") break;
        lines = [];
      } else if (lines) lines.push(line);
    }
    return;
  }
  const disposition = headers["content-disposition"];
  let filename = mimeParameter(disposition, "filename\\*");
  if (filename) {
    try { filename = decodeURIComponent(filename.replace(/^[^']*'[^']*'/, "")); } catch {}
  } else filename = decodeMailHeader(mimeParameter(disposition, "filename") || mimeParameter(type, "name"));
  if (filename && allowedExt.has(filename.toLowerCase().split(".").at(-1))) {
    const bytes = Uint8Array.from(transferBytes(body, headers["content-transfer-encoding"]));
    parts.files.push(new File([bytes], filename));
  } else if (!filename && !parts.text && /^text\/plain(?:;|$)/i.test(type)) {
    parts.text = decodeMailText(transferBytes(body, headers["content-transfer-encoding"]),mimeParameter(type,"charset") || "utf-8").trim();
  }
}
async function applicationReport(ctx, app) {
  const assessment = await assessView(ctx, app);
  const source = await get(ctx,"source",app.sourceId);
  const supplied = [source, ...app.answers.filter(q=>q.value).map(q=>({ id:q.questionId, type:"test", text:q.value }))];
  if (app.clarificationThreadId) {
    const additional = await rows(ctx,"SELECT * FROM records WHERE kind='source' AND scope=? AND json_extract(data,'$.type')='clarification'",app.id);
    supplied.push(...additional);
  }
  supplied.push(...await interviewAnswerSources(ctx,app.id));
  const lastDecision = await prep(ctx, "SELECT * FROM records WHERE kind='stage_event' AND scope=? AND json_extract(data,'$.action')!='receive' ORDER BY sort DESC,id LIMIT 1", app.id).first();
  return {
    applicationId:app.id, vacancyTitle:app.vacancyTitle, fullName:app.fullName,
    assessmentStatus:assessment.assessmentStatus, criteria:assessment.items, facts:educationalEvidence(supplied), stage:viewStage(app),
    decision:decodeRow(lastDecision)
  };
}
function relatedVacancySources(ctx,app) {
  return rows(ctx,`SELECT * FROM records WHERE kind='source' AND scope=?
    AND json_extract(data,'$.type') IN ('resume','clarification','interview') AND length(trim(json_extract(data,'$.text')))>0
    ORDER BY (id=?) DESC,sort DESC,id LIMIT 9`,app.id,app.sourceId);
}
async function reviewOtherVacancy(ctx, app) {
  if (!safePath(ctx.body.vacancyId) || ctx.body.vacancyId === app.scope) invalid("vacancyId","invalid_vacancy","Выберите другую опубликованную вакансию.");
  const vacancy = await get(ctx,"vacancy",ctx.body.vacancyId);
  if (!vacancy.publishedVersionId) fail(409,"vacancy_not_published","Сначала опубликуйте вакансию.");
  const version = await get(ctx,"version",vacancy.publishedVersionId);
  const sources = await relatedVacancySources(ctx,app);
  const other = make({ vacancyId:vacancy.id, vacancyTitle:version.title, versionId:version.id, criteriaVersionId:version.criteriaVersionId,
    criteria:version.criteria.map(criterion=>scoreCriterion(criterion,sources)), reviewedBy:ctx.actor.name, reviewedAt:isoNow() },app.id);
  return commit(ctx,[put(ctx,"related_review",other)],result(other,201));
}
function interviewAnswerSources(ctx, applicationId) {
  return rows(ctx,"SELECT * FROM records WHERE kind='source' AND scope=? AND json_extract(data,'$.type')='interview' ORDER BY sort DESC,id LIMIT 30",applicationId);
}
async function recordInterviewAnswer(ctx,app) {
  if (app.stage.outcome) fail(409,"selection_finished","Подбор по этому отклику завершён.");
  if (app.assessmentStatus==="pending") fail(409,"assessment_pending","Дождитесь окончания первичного разбора.");
  const version = await get(ctx,"version",app.versionId);
  const criterionId = ctx.body.criterionId || null;
  if (criterionId && !version.criteria.some(c=>c.id===criterionId)) invalid("criterionId","unknown_criterion","Выберите вопрос по требованиям этого отклика.");
  const question = field(ctx.body.question,"question",300,true);
  const text = field(ctx.body.text,"text",limits.answer,true);
  const nextStep = field(ctx.body.nextStep,"nextStep",limits.notes);
  const source = make({ type:"interview", criterionId, question, text, searchText:lowered(text), nextStep,
    actorName:ctx.actor.name, actorId:ctx.actor.id, recordedAt:isoNow() },app.id);
  const recheck = criterionId && app.assessmentStatus==="ready"
    ? event(ctx,"interview.answer_recorded",{applicationId:app.id,criterionId,answerId:source.id}) : null;
  return commit(ctx,[...expect(ctx,"application",app),put(ctx,"source",source),...(recheck?[recheck.stmt]:[])],
    result({sourceId:source.id,recordedAt:source.recordedAt},201,{process:recheck?.id}));
}
async function handoffPreview(ctx,app,assessment) {
  if (app.assessmentStatus==="pending") fail(409,"assessment_pending","Дождитесь окончания первичного разбора.");
  const evaluation = assessment || await assessView(ctx,app);
  return { fullName:app.fullName, vacancyTitle:app.vacancyTitle,
    criteria:evaluation.items.map(({label,reference,status,hrOverride,question})=>({
      label,reference,status:hrOverride?.status || status,question:hrOverride?.status==="matched"?null:question,
      reviewReason:hrOverride?.reason || null
    })) };
}
async function sendHandoff(ctx, app) {
  if (app.stage.outcome) fail(409,"selection_finished","Подбор по этому отклику завершён.");
  const assigneeId = field(ctx.body.assigneeId,"assigneeId",160,true);
  const hosted = ctx.env.TRUST_PLATFORM === true || ctx.env.TRUST_PLATFORM === "1";
  const assigned = hosted ? hostedStaff(ctx,assigneeId)?.role === "department"
    : assigneeId === "department" && (ctx.env.DEMO_MODE === true || Boolean(ctx.env.DEPARTMENT_PASSWORD));
  if (!assigned) invalid("assigneeId","assignee_unavailable","Укажите аккаунт с ролью представителя подразделения.");
  const dueAt = dateValue(ctx.body.dueAt,"dueAt",true);
  if (dueAt < isoNow()) invalid("dueAt","past_due","Укажите срок в будущем.");
  const note = field(ctx.body.note,"note",limits.notes);
  const assessment = await get(ctx,"assessment",app.id,false);
  const shared = await handoffPreview(ctx,app,assessment);
  if (ctx.body.previewDigest && ctx.body.previewDigest!==await sha(JSON.stringify(shared))) {
    fail(409,"preview_changed","Сведения изменились. Откройте предварительный просмотр снова.");
  }
  const existing = await get(ctx,"handoff",app.id,false);
  if (existing) fail(409,"handoff_exists","Карточка уже передана подразделению.");
  const handoff = make({ assigneeId, dueAt, note, shared, sentBy:ctx.actor.name, sentAt:isoNow(), response:null },assigneeId,isoNow(),app.id);
  return commit(ctx,[...expect(ctx,"application",app),...(assessment?expect(ctx,"assessment",assessment):[]),
    put(ctx,"handoff",handoff)],result(handoff,201));
}
async function departmentRoutes(ctx, method, parts) {
  if (!ctx.actor) fail(401,"unauthorized","Войдите в кабинет подразделения.");
  if (ctx.actor.role !== "department") denied();
  if (parts[0] === "requisitions") return departmentRequisitions(ctx,method,parts);
  if (parts[0] !== "handoffs") missing();
  if (parts.length === 1 && method === "GET") return result(await page(ctx,"handoff",["scope=?"],[ctx.actor.id]));
  if (parts.length !== 3 || parts[2] !== "response" || method !== "POST") missing();
  const handoff = await get(ctx,"handoff",parts[1]);
  if (handoff.assigneeId !== ctx.actor.id) denied();
  if (handoff.response) fail(409,"handoff_answered","Ответ уже сохранён.");
  const outcome = ctx.body.outcome;
  if (!["proceed","clarify","decline"].includes(outcome)) invalid("outcome","invalid_outcome","Выберите результат рассмотрения.");
  const note = field(ctx.body.note,"note",limits.notes,true);
  const response = { outcome, note, actor:ctx.actor.name, at:isoNow() };
  return commit(ctx,[...expect(ctx,"handoff",handoff),update(ctx,"handoff",{...handoff,response})],result(response,201));
}
async function departmentRequisitions(ctx,method,parts) {
  if (parts.length===1 && method==="GET") return result(await page(ctx,"requisition",["scope=?"],[ctx.actor.id]));
  if (parts.length===1 && method==="POST") {
    const draft=make({...requisitionFields(ctx),status:"draft",createdAt:isoNow()},ctx.actor.id);
    return commit(ctx,[put(ctx,"requisition",draft)],result(draft,201));
  }
  if (parts.length!==2 && parts.length!==3) missing();
  const draft=await get(ctx,"requisition",parts[1]);
  if (draft.scope!==ctx.actor.id) denied();
  if (parts.length===2 && method==="GET") return result(draft);
  if (draft.status!=="draft") fail(409,"request_sent","Заявка уже передана кадровику.");
  const now=isoNow();
  let revision;
  if (parts.length===2 && method==="PUT") revision={...draft,...requisitionFields(ctx),sort:now};
  else if (parts.length===3 && parts[2]==="submit" && method==="POST") revision={...draft,status:"submitted",submittedAt:now,sort:now};
  else missing();
  return commit(ctx,[...expect(ctx,"requisition",draft),update(ctx,"requisition",revision)],result(revision));
}
function requisitionFields(ctx) {
  const b=ctx.body;
  return {title:field(b.title,"title",limits.title,true),department:field(ctx.actor.department || b.department,"department",limits.department,true),
    description:field(b.description,"description",limits.description,true)};
}
async function receiveMail(ctx) {
  const b = ctx.body;
  const file = b.emailFile;
  if (!(file instanceof File) || !/\.eml$/i.test(file.name) || !file.size) invalid("emailFile", "invalid_email_file", "Приложите письмо в формате EML.");
  const sourceAccount = field(b.sourceAccount, "sourceAccount", 160, true);
  const envelope = mailEnvelope((await file.text()).replace(/\r\n?/g, "\n"));
  const from = decodeMailHeader(envelope.headers.from).trim();
  const address = /^(.*?)<([^<>]+)>$/.exec(from);
  const email = b.contact || address?.[2] || from;
  const fullName = b.fullName || address?.[1].trim().replace(/^"|"$/g, "") || email;
  const parts = { files:[], text:"", count:0 };
  mailParts(envelope, parts);
  if (parts.files.length > 1) invalid("emailFile", "multiple_resumes", "В письме несколько подходящих файлов. Выберите резюме и добавьте отклик вручную.");
  const parsedDate = Date.parse(envelope.headers.date);
  const body = {
    vacancyId:b.vacancyId, fullName, contact:email, sourceAccount, sourceChannel:"email",
    sourceSubject:decodeMailHeader(envelope.headers.subject).slice(0, 250),
    deliveryId:envelope.headers["message-id"] || await sha(await file.arrayBuffer()),
    sourceReceivedAt:Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : null,
    ...(parts.files.length ? {resumeFile:parts.files[0]} : {resumeText:parts.text.slice(0,limits.resume)})
  };
  return receiveStaffApplication({...ctx,body});
}
