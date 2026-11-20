const appView = (app, source) => ({
  ...applicationSummary(app), criteriaVersionId: app.criteriaVersionId, testVersionId: app.testVersionId, testStatus: app.testStatus,
  acceptedAt: app.acceptedAt, sourceReceivedAt: app.sourceReceivedAt, importedAt: app.importedAt,
  sourceAccount: app.sourceAccount || "", sourceSubject: app.sourceSubject || "",
  answers: app.answers, resumeSource: { sourceId: source.id, type: source.type, text: source.text, attachment: source.attachment, extractStatus: source.extractStatus },
  clarificationThreadId: app.clarificationThreadId, stage: viewStage(app)
});
async function hrLogin(ctx) {
  if (ctx.actor) return result({ authenticated: true, ...ctx.actor });
  if (ctx.env.TRUST_PLATFORM === true || ctx.env.TRUST_PLATFORM === "1") denied();
  const user = field(ctx.body.user, "user", 80, true);
  const password = field(ctx.body.password, "password", 256);
  let role = null;
  if (user === "department" && (ctx.env.DEMO_MODE === true || (ctx.env.DEPARTMENT_PASSWORD && await sha(password) === await sha(ctx.env.DEPARTMENT_PASSWORD)))) role = "department";
  if (user === "demo-hr" && ctx.env.DEMO_MODE === true) role = "hr";
  if (user === "demo" && ctx.env.DEMO_MODE === true) role = "admin";
  if (user === "admin" && ctx.env.ADMIN_PASSWORD && await sha(password) === await sha(ctx.env.ADMIN_PASSWORD)) role = "admin";
  if (user === "hr" && ctx.env.HR_PASSWORD && await sha(password) === await sha(ctx.env.HR_PASSWORD)) role = "hr";
  if (!role) fail(401, "invalid_credentials", "Проверьте логин и пароль.");
  const session = make({ actorId: user, role, name: user === "demo" ? "Кадровая команда" : role === "admin" ? "Руководитель HR" : role === "department" ? "Представитель подразделения" : "Специалист HR", expiresAt: inDays(1) });
  return commit(ctx, [put(ctx, "staff_session", session)], result({ authenticated: true, role, name: session.name }, 200, { session: ["hr", session.id] }));
}
async function publicRoutes(ctx, method, p) {
  if (p[0] === "vacancies") {
    if (method !== "GET") missing();
    if (p.length === 2) {
      const slug = await get(ctx, "slug", p[1]);
      const v = await get(ctx, "vacancy", slug.vacancyId);
      if (!v.publishedVersionId) missing();
      return result(publicVacancy(v, await get(ctx, "version", v.publishedVersionId)));
    }
    if (p.length !== 1) missing();
    const paged = await page(ctx, "vacancy", ["json_extract(data,'$.publishedVersionId') IS NOT NULL"]);
    if (!paged.items.length) return result({ items: [], nextCursor: null });
    const versions = await rows(ctx, `SELECT * FROM records WHERE kind='version' AND id IN (${paged.items.map(() => "?").join(",")})`, ...paged.items.map(v => v.publishedVersionId));
    const byId = new Map(versions.map(x => [x.id, x]));
    const items = paged.items.map(v => {
      const x = byId.get(v.publishedVersionId);
      return { vacancyId: v.id, slug: x.slug, title: x.title, department: x.department, schedule: x.schedule, location: x.location, description: x.description.slice(0, 260), hasTest: false };
    });
    return result({ items, nextCursor: paged.nextCursor });
  }
  if (method === "POST" && p.join("/") === "applications") return receive(ctx, true);
  if (method === "GET" && p.length === 2 && p[0] === "receipts") {
    const r = await get(ctx, "receipt", p[1]);
    if (r.expiresAt <= isoNow() || !r.visitorId || r.visitorId !== await visitor(ctx)) denied();
    const app = await get(ctx, "application", r.applicationId);
    return result({ receiptNumber: r.id, assessmentStatus: app.assessmentStatus, clarificationThreadId: null,
      stage:app.stage.currentStage, outcome:app.stage.outcome, candidateMessage:app.stage.candidateMessage || null });
  }
  if (p[0] === "surveys" && ((method === "GET" && p.length === 2) || (method === "POST" && p.length === 3 && p[2] === "responses"))) return publicSurvey(ctx, p[1]);
  if (p[0] === "clarifications" && ((method === "GET" && p.length === 2) || (method === "POST" && p.length === 3 && p[2] === "answers"))) return publicClarification(ctx, p[1]);
  if (method === "POST" && p.join("/") === "clarification-sessions") return exchangeClarification(ctx);
  missing();
}
async function hrApplications(ctx, method, p) {
  if (p.length === 1) {
    if (method === "POST") return receiveStaffApplication(ctx);
    if (method !== "GET") missing();
    const { vacancyId,from,to } = periodFilter(ctx);
    const q = field(ctx.url.searchParams.get("q"), "q", 160);
    const stage = ctx.url.searchParams.get("stage") || "";
    const channel = ctx.url.searchParams.get("channel") || "";
    const conditions = [];
    const params = [];
    vacancyScope(ctx, "scope", conditions, params);
    if (vacancyId) { conditions.push("scope=?"); params.push(vacancyId); }
    if (from) { conditions.push("sort>=?");params.push(periodStart(from)); }
    if (to) { conditions.push("sort<=?");params.push(periodEnd(to)); }
    if (ctx.url.searchParams.get("activity")==="without_action") {
      conditions.push(`json_extract(data,'$.stage.outcome') IS NULL AND (${firstStageAction("records.id","coalesce(json_extract(records.data,'$.acceptedAt'),records.sort)")}) IS NULL`);
    }
    if (q) { conditions.push("instr(json_extract(data,'$.searchName'),?)>0"); params.push(lowered(q)); }
    if (stageOrder.includes(stage)) { conditions.push("json_extract(data,'$.stage.currentStage')=? AND json_extract(data,'$.stage.outcome') IS NULL"); params.push(stage); }
    if (["hired","rejected"].includes(stage)) { conditions.push("json_extract(data,'$.stage.outcome')=?"); params.push(stage); }
    if (channel && channels.has(channel)) { conditions.push("json_extract(data,'$.sourceChannel')=?"); params.push(channel); }
    return result(await applicationQueue(ctx, conditions, params, Boolean(vacancyId && ctx.url.searchParams.get("priority") === "on")));
  }
  let app = await get(ctx, "application", p[1]);
  if (method === "GET") {
    if (ctx.env.GIGACHAT_AUTH_KEY?.trim()) {
      if (app.assessmentStatus === "pending") ctx.execution.waitUntil(processPending(ctx, app.id).catch(console.error));
    } else {
      await processPending(ctx, app.id);
      await refreshStoredAssessment(ctx, app);
      app = await get(ctx, "application", p[1]);
    }
  }
  if (method === "GET" && p.length === 2) {
    const [source, triage] = await Promise.all([get(ctx, "source", app.sourceId, false), getTriage(ctx, app.id)]);
    return result({ ...appView(app, source || { id: app.sourceId, type: "resume", text: "" }), triage });
  }
  if (method === "PUT" && p.length === 3 && p[2] === "candidate") return linkCandidate(ctx, app);
  if (p.length === 3 && p[2] === "report" && method === "GET") return result(await applicationReport(ctx,app));
  if (p.length === 3 && p[2] === "related-reviews") {
    if (method === "POST") return reviewOtherVacancy(ctx,app);
    if (method === "GET") {
      const conditions = ["scope=?"], params = [app.id];
      vacancyScope(ctx, "json_extract(data,'$.vacancyId')", conditions, params);
      return result(await page(ctx,"related_review",conditions,params));
    }
  }
  if (p.length === 3 && p[2] === "handoff") {
    if (method === "POST") return sendHandoff(ctx,app);
    if (method === "GET") return result(await get(ctx,"handoff",app.id,false));
  }
  if (p.length === 3 && p[2] === "handoff-preview" && method === "GET") return result(await handoffPreview(ctx,app));
  if (p.length === 3 && p[2] === "interview-notes" && method === "POST") return recordInterviewAnswer(ctx,app);
  if (p[2] === "assessment") {
    if (method === "GET" && p.length === 3) return result(await assessView(ctx, app));
    if (method === "POST" && p.length === 3) return requestAssessment(ctx, app);
    if (method === "PATCH" && p.length === 4) return overrideAssessment(ctx, app, p[3]);
  }
  if (p[2] === "interview-draft" && p.length === 3 && method === "POST") return interviewDraft(ctx, app);
  if (p[2] === "interview-questions" && p.length === 3 && method === "GET") return recommendedInterviewQuestions(ctx, app);
  if (p[2] === "interview-plan" && p.length === 3 && method === "GET") return interviewPlan(ctx, app);
  if (p.length === 3 && p[2] === "interviews" && method === "GET") return result(await page(ctx,"interview",["scope=?"],[app.id]));
  if (p[2] === "stage" && p.length === 3 && method === "GET") return result(viewStage(app));
  if (p[2] === "transitions" && p.length === 3 && method === "POST") return transition(ctx, app);
  if (p[2] === "history" && p.length === 3 && method === "GET") {
    const found = await page(ctx, "stage_event", ["scope=?"], [app.id], { ...pageOptions(ctx.url), ascending: true });
    return result(found);
  }
  missing();
}
function duplicateDelivery(previous, digest) {
  if (previous.digest !== digest) fail(409, "delivery_changed", "Эта запись источника уже принята с другими данными. Сверьте её с исходным откликом.");
  return result({ applicationId: previous.applicationId, receiptNumber: previous.receiptNumber }, 200);
}
async function applicationDelivery(ctx) {
  const b = ctx.body;
  if (b.fileIntake === "on" || b.fileIntake === true) {
    if (!(b.resumeFile instanceof File) || !b.resumeFile.size) invalid("resumeFile","required","Выберите файл резюме.");
    const fullName = lowered(field(b.fullName,"fullName",limits.name,true));
    const email = lowered(contact(b.contact,false));
    const bytes = await sha(await b.resumeFile.arrayBuffer());
    const digest = await sha(JSON.stringify([b.vacancyId,fullName,email,bytes]));
    return { id:await sha("file-intake:"+digest), digest };
  }
  const sourceAccount = field(b.sourceAccount, "sourceAccount", 160);
  const deliveryId = field(b.deliveryId, "deliveryId", 250);
  if (deliveryId && !sourceAccount) invalid("sourceAccount", "required", "Укажите учётную запись источника.");
  if (!deliveryId && !ctx.importing) return null;
  const channel = b.sourceChannel || "manual";
  if (!channels.has(channel) || channel === "public_form") invalid("sourceChannel", "invalid_channel", "Выберите источник отклика.");
  const file = b.resumeFile instanceof File && b.resumeFile.size
    ? [b.resumeFile.name, await sha(await b.resumeFile.arrayBuffer())] : null;
  const digest = await sha(JSON.stringify([b.vacancyId, field(b.fullName, "fullName", limits.name, true),
    contact(b.contact, false), field(b.resumeText, "resumeText", limits.resume), dateValue(b.sourceReceivedAt, "sourceReceivedAt"), file]));
  return { digest, id: await sha(JSON.stringify([channel, sourceAccount, deliveryId || digest])) };
}
async function receiveStaffApplication(ctx) {
  const delivery = await applicationDelivery(ctx);
  if (ctx.actor.vacancyIds && !ctx.actor.vacancyIds.includes(ctx.body.vacancyId)) denied();
  const previous = delivery && await get(ctx, "application_delivery", delivery.id, false);
  if (previous) return commit(ctx, [], duplicateDelivery(previous, delivery.digest));
  return receive({ ...ctx, delivery }, false);
}
async function archiveDocument(ctx) {
  const b = ctx.body;
  const {person,text,attachment,fileDigest,sourceDigest}=await archiveSource(ctx);
  const reviewedSource=field(b.sourceDigest,"sourceDigest",64);
  if (reviewedSource && reviewedSource!==sourceDigest) fail(409,"archive_source_changed","Исходник изменился. Разберите его снова.");
  const title = field(b.title, "title", 180, true);
  const sourceAccount = field(b.sourceAccount, "sourceAccount", 160, true);
  const deliveryId = field(b.deliveryId, "deliveryId", 250);
  const education = field(b.education,"education",500);
  const additionalEducation = field(b.additionalEducation,"additionalEducation",500);
  const sourceText=text.replace(/\r\n?/g,"\n");
  const events = collection(b.events ?? [], "events", maxArchiveEvents).map((entry, i) => {
    const prefix = `events.${i}`;
    const type = field(entry?.type,prefix+".type",25);
    const outcome = field(entry?.outcome,prefix+".outcome",25);
    const excerpt = field(entry?.excerpt,prefix+".excerpt",500).replace(/\r\n?/g,"\n");
    if (type && !["application","interview","decision","other"].includes(type)) invalid(prefix+".type","invalid_type","Выберите вид архивного события.");
    if (outcome && !["hired","rejected","withdrawn","pending"].includes(outcome)) invalid(prefix+".outcome","invalid_outcome","Выберите известный итог.");
    if (excerpt && !sourceText.includes(excerpt)) invalid(prefix+".excerpt","excerpt_not_found","Используйте точный фрагмент из текста документа.");
    return {
      position:field(entry?.position,prefix+".position",limits.title,true),date:dateValue(entry?.date,prefix+".date"),
      note:field(entry?.note,prefix+".note",limits.notes,true),
      ...(type?{type}:{}),...(outcome?{outcome}:{}),...(excerpt?{excerpt}:{})
    };
  });
  const canonicalEvents = events.map(entry => JSON.stringify(entry)).sort();
  const digestFields = [person.id,title,text,canonicalEvents,fileDigest];
  if (education || additionalEducation) digestFields.push(education,additionalEducation);
  const digest = await sha(JSON.stringify(digestFields));
  const anonymousMatch = await sha(JSON.stringify([person.id, fileDigest || lowered(text).replace(/\s+/g," ")]));
  const id = await sha(JSON.stringify([sourceAccount, deliveryId || anonymousMatch]));
  const storageId = attachment ? uuid() : null;
  const file = attachment ? {name:attachment.name,size:attachment.size,type:attachment.type} : null;
  const document = make({ title, text, sourceDigest, searchText:lowered(text), education, educationSearch:lowered(education),
    additionalEducation, additionalEducationSearch:lowered(additionalEducation),
    sourceAccount, deliveryId: deliveryId || null, events, digest, storageId, attachment:file,
    addedBy: ctx.actor.name, addedAt: isoNow() }, person.id, isoNow(), id);
  const repeat = previous => {
    if (previous.scope!==person.id) fail(409,"delivery_changed","Номер этого документа уже связан с другим профилем.");
    if (reviewedSource && previous.sourceDigest===sourceDigest && JSON.stringify(previous.events.map(entry=>JSON.stringify(entry)).sort())===JSON.stringify(canonicalEvents)) {
      return result({documentId:id,duplicate:true});
    }
    if (!deliveryId && b.confirmDuplicate !== true && b.confirmDuplicate !== "on") fail(409,"archive_match",
      `В истории уже есть документ "${previous.title}". Сверьте его и подтвердите повтор или укажите номер отдельного документа.`);
    if (deliveryId && previous.digest !== digest) fail(409, "delivery_changed", "Этот архивный документ уже зарегистрирован с другими сведениями.");
    return result({ documentId: id, duplicate: true });
  };
  const previous = await get(ctx, "archive_document", id, false);
  if (previous?.scope===person.id && reviewedSource && events.length && !previous.events.length && previous.text===text) {
    const stored = !previous.sourceDigest && previous.storageId && await ctx.env.BUCKET?.get(previous.storageId);
    const matches = previous.sourceDigest===sourceDigest || (!previous.sourceDigest &&
      (stored ? await sha(await new Response(stored.body).arrayBuffer())===fileDigest : !previous.storageId && !attachment));
    if (matches) {
      // A compare-and-set protects the already reviewed events from another edit.
      const fields=[person.id,previous.title,previous.text,canonicalEvents,fileDigest];
      if (previous.education || previous.additionalEducation) fields.push(previous.education || "",previous.additionalEducation || "");
      const filled={...previous,events,sourceDigest,digest:await sha(JSON.stringify(fields))};
      try {
        return await commit(ctx,[...expect(ctx,"archive_document",previous),update(ctx,"archive_document",filled)],
          result({documentId:id,duplicate:false,historyFilled:true}));
      } catch(error) {
        if (error.code!=="version_conflict") throw error;
        return commit(ctx,[],repeat(await get(ctx,"archive_document",id)));
      }
    }
  }
  if (previous) return commit(ctx, [], repeat(previous));
  if (attachment) await ctx.env.BUCKET.put(storageId,attachment.bytes);
  try {
    const saved = await commit(ctx, [put(ctx, "archive_document", document)], result({ documentId: id, duplicate: false }, 201, {storageId}));
    if (attachment && saved.storageId !== storageId) await ctx.env.BUCKET.delete(storageId).catch(()=>{});
    return saved;
  } catch (error) {
    if (attachment) await ctx.env.BUCKET.delete(storageId).catch(()=>{});
    if (error.code !== "version_conflict") throw error;
    const previous = await get(ctx, "archive_document", id, false);
    if (!previous) throw error;
    return commit(ctx, [], repeat(previous));
  }
}
async function backfillSearch(ctx) {
  const flag = "unicode_search_v2";
  if (await get(ctx, "system", flag, false)) return;
  const missingFields = `(kind='candidate' AND json_type(data,'$.educationSearch') IS NULL)
    OR (kind IN ('source','archive_document') AND json_type(data,'$.searchText') IS NULL)`;
  while (true) {
    const records = await all(ctx, `SELECT * FROM records WHERE ${missingFields} LIMIT 50`);
    if (!records.length) break;
    await ctx.env.DB.batch(records.map(record => {
      const item = decodeRow(record);
      const fields = record.kind === "candidate" ? { searchName: lowered(item.fullName || ""), educationSearch: lowered(item.education || ""),
        additionalEducationSearch: lowered(item.additionalEducation || ""), experienceSearch: lowered(item.experience || "") }
        : { searchText: lowered(item.text || "") };
      return update(ctx, record.kind, { ...item, ...fields });
    }));
  }
  await prep(ctx, "INSERT OR IGNORE INTO records(kind,id,scope,sort,data) VALUES('system',?,'',?,'{}')", flag, isoNow()).run();
}
async function downloadAttachment(ctx, id, attachment) {
  if (!id || !attachment || !ctx.env.BUCKET) missing();
  const file = await ctx.env.BUCKET.get(id);
  if (!file) missing();
  return new Response(file.body,{headers:{...securityHeaders,"cache-control":"private,no-store",
    "content-type":attachment.type,"content-disposition":`attachment; filename*=UTF-8''${encodeURIComponent(attachment.name).replaceAll("'","%27")}`}});
}
async function candidateWithResumeFacts(ctx, person) {
  const summary = candidateSummary(person);
  if (summary.removedFromReserve || (summary.education && summary.experience)) return summary;
  const filters = ["a.kind='application'", "json_extract(a.data,'$.candidateId')=?"];
  const args = [person.id];
  vacancyScope(ctx, "a.scope", filters, args);
  const entries = await rows(ctx, `SELECT evaluation.* FROM records a JOIN records evaluation
    ON evaluation.kind='assessment' AND evaluation.id=a.id
    WHERE ${filters.join(" AND ")} AND json_extract(evaluation.data,'$.provider')='gigachat'
    ORDER BY json_extract(evaluation.data,'$.assessedAt') DESC, a.sort DESC,a.id LIMIT 1`, ...args);
  return { ...summary,
    education: summary.education || resumeProfileField(entries[0]?.education, 500),
    experience: summary.experience || resumeProfileField(entries[0]?.experience, 1000) };
}
async function searchCandidates(ctx) {
  await backfillSearch(ctx);
  const query = field(ctx.url.searchParams.get("q"), "q", limits.name);
  const education = field(ctx.url.searchParams.get("education"), "education", 160);
  const additional = field(ctx.url.searchParams.get("additionalEducation"), "additionalEducation", 160);
  const skills = field(ctx.url.searchParams.get("skills"), "skills", 120);
  const profilesOnly = ctx.url.searchParams.get("profilesOnly") === "1";
  const conditions = [`(kind='candidate' AND json_extract(data,'$.removedFromReserveAt') IS NULL OR
    kind='application' AND (json_extract(data,'$.candidateId') IS NULL OR EXISTS (
      SELECT 1 FROM records c WHERE c.kind='candidate' AND c.id=json_extract(records.data,'$.candidateId')
      AND json_extract(c.data,'$.removedFromReserveAt') IS NOT NULL AND coalesce(json_extract(records.data,'$.stage.outcome'),'')<>'hired')))`];
  const params = [];
  const canSearchArchives = !ctx.actor.vacancyIds;
  const archiveSearch = key => `EXISTS (SELECT 1 FROM records d
    WHERE records.kind='candidate' AND d.kind='archive_document' AND d.scope=records.id
    AND instr(json_extract(d.data,'$.${key}'),?)>0)`;
  if (ctx.actor.vacancyIds) {
    const ids = JSON.stringify(ctx.actor.vacancyIds);
    conditions.push(`((kind='application' AND scope IN (SELECT value FROM json_each(?))) OR (kind='candidate' AND
      (json_extract(data,'$.ownerId')=? OR EXISTS (SELECT 1 FROM records a WHERE a.kind='application'
        AND json_extract(a.data,'$.candidateId')=records.id AND a.scope IN (SELECT value FROM json_each(?))))))`);
    params.push(ids,ctx.actor.id,ids);
  }
  for (const [key, value] of [["searchName", query], ["educationSearch", education], ["additionalEducationSearch", additional]]) {
    if (!value) continue;
    const candidateField = `instr(json_extract(data,'$.${key}'),?)>0`;
    const archived = canSearchArchives && key!=="searchName";
    conditions.push(archived ? `(${candidateField} OR ${archiveSearch(key)})` : candidateField);
    params.push(lowered(value));
    if(archived) params.push(lowered(value));
  }
  for (const word of new Set(lowered(skills).split(/\s+/).filter(Boolean).slice(0, 6))) {
    const scopes = [];
    const scopeParams = [];
    vacancyScope(ctx, "a.scope", scopes, scopeParams);
    conditions.push(`(instr(json_extract(data,'$.experienceSearch'),?)>0 OR EXISTS (
      SELECT 1 FROM records a JOIN records s ON s.kind='source' AND s.id=json_extract(a.data,'$.sourceId')
      WHERE a.kind='application' AND ((records.kind='candidate' AND json_extract(a.data,'$.candidateId')=records.id)
        OR (records.kind='application' AND a.id=records.id))
      AND instr(json_extract(s.data,'$.searchText'),?)>0${scopes.length ? " AND " + scopes.join(" AND ") : ""})
      ${canSearchArchives?"OR "+archiveSearch("searchText"):""})`);
    params.push(word, word, ...scopeParams);
    if(canSearchArchives) params.push(word);
  }
  const found = await page(ctx, profilesOnly ? "candidate" : ["candidate","application"], conditions, params);
  const items = await Promise.all(found.items.map(async item => {
    if (!item.stage) return { kind: "candidate", ...await candidateWithResumeFacts(ctx,item) };
    const a = await get(ctx, "assessment", item.id, false);
    return { kind: "application", ...applicationSummary(item),
      education: resumeProfileField(a?.education, 500), experience: resumeProfileField(a?.experience, 1000) };
  }));
  return result({ ...found, items });
}
async function importBatch(ctx) {
  const batch = collection(ctx.body.items, "items", 20);
  if (!batch.length) invalid("items", "required", "Добавьте хотя бы один отклик.");
  const accepted = [];
  const duplicates = [];
  const errors = [];
  for (const [index, entry] of batch.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push({ index, code: "invalid_item", message: "Строка должна содержать поля отклика." });
      continue;
    }
    const sub = { ...ctx, importing: true, body: { ...entry, vacancyId: entry.vacancyId || ctx.body.vacancyId,
      sourceChannel: entry.sourceChannel || ctx.body.sourceChannel || "archive", sourceAccount: entry.sourceAccount || ctx.body.sourceAccount }, idem: { id: await sha(`${ctx.idem.id}:${index}`), digest: ctx.idem.digest } };
    try {
      const response = await replay(sub) || await receiveStaffApplication(sub);
      if (response.status === 200) duplicates.push({ index, ...response.body });
      else accepted.push(response.body);
      if (response.process) ctx.execution.waitUntil(processEvent(sub, response.process).catch(console.error));
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      if (error.code === "idempotency_conflict") throw error;
      errors.push({ index, code: error.code, message: error.message, fields: error.fields });
    }
  }
  return commit(ctx, [], result({ accepted, duplicates, errors }, 201));
}
async function hrRoutes(ctx, method, p) {
  if (p[0] === "news") {
    if (p.length === 1 && method === "GET") return newsList(ctx);
    if (p.length === 2 && p[1] === "read" && method === "POST") return markNewsRead(ctx);
    if (p.length === 2 && p[1] === "sources" && method === "GET") return result({items:newsCatalog});
  }
  const action = p.join("/");
  if (p[0]==="requisitions" && method==="GET") {
    if (ctx.actor.vacancyIds) denied();
    if (p.length===1) return result(await page(ctx,"requisition",["json_extract(data,'$.status')='submitted'"]));
    if (p.length===2) {
      const request = await get(ctx,"requisition",p[1]);
      if (request.status==="draft") missing();
      return result(request);
    }
  }
  if (p[0] === "vacancies") {
    if (ctx.actor.vacancyIds && p.length === 1 && method !== "GET") denied();
    if (p.length === 1 && method === "GET") {
      const conditions = [], params = [];
      vacancyScope(ctx, "id", conditions, params);
      const found = await page(ctx, "vacancy", conditions, params);
      return result({ ...found, items: found.items.map(vacancySummary) });
    }
    if (p.length === 1 && method === "POST") return editVacancy(ctx, "create");
    if (p.length === 2 && method === "GET") {
      const v = await get(ctx, "vacancy", p[1]);
      return result({ ...vacancySummary(v), draft: v.draft });
    }
    if (p.length === 3 && p[2] === "draft" && method === "PUT") return editVacancy(ctx, "update", p[1]);
    if (p.length === 3 && ["submit","approve","request_changes"].includes(p[2]) && method === "POST") return reviewVacancyDraft(ctx,p[1],p[2]);
    if (p.length === 3 && p[2] === "publish" && method === "POST") return editVacancy(ctx, "publish", p[1]);
  }
  if (p[0] === "applications") return hrApplications(ctx, method, p);
  if (action === "email-imports" && method === "POST") return receiveMail(ctx);
  if (action === "application-imports" && method === "POST") return importBatch(ctx);
  if (action === "archive-previews" && method === "POST") {
    if (ctx.actor.vacancyIds) denied();
    return previewArchive(ctx);
  }
  if (action === "archive-documents" && method === "POST") {
    if (ctx.actor.vacancyIds) denied();
    return archiveDocument(ctx);
  }
  if (p[0] === "archive-documents" && p.length === 2 && method === "GET") {
    const document = await get(ctx,"archive_document",p[1]);
    return downloadAttachment(ctx,document.storageId,document.attachment);
  }
  if (action === "archive-example" && method === "GET") return result({items: [{fullName:"Пример Кандидата",contact:"candidate@example.com",resumeText:"Готовил отчёты и анализировал данные.",sourceReceivedAt:"2026-11-14"}]});
  if (p[0] === "candidates") {
    if (p.length === 1 && method === "POST") return saveCandidate(ctx);
    if (p.length === 1 && method === "GET") return searchCandidates(ctx);
    if (p.length === 2 && ["GET","PATCH","DELETE"].includes(method)) {
      const person = await get(ctx, "candidate", p[1]);
      if (method === "GET" && ctx.url.searchParams.get("summary") === "1") return result(await candidateWithResumeFacts(ctx,person));
      if (person.removedFromReserveAt) missing();
      if (method === "PATCH") return saveCandidate(ctx, person);
      if (method === "DELETE") return removeReserveProfile(ctx, person);
      const conditions = ["json_extract(data,'$.candidateId')=?"], params = [person.id];
      vacancyScope(ctx, "scope", conditions, params);
      const apps = await page(ctx, "application", conditions, params);
      const archiveUrl = new URL(ctx.url);
      archiveUrl.searchParams.delete("cursor");
      if (ctx.url.searchParams.has("archiveCursor")) archiveUrl.searchParams.set("cursor", ctx.url.searchParams.get("archiveCursor"));
      const archive = ctx.actor.vacancyIds ? {items:[],nextCursor:null} : await page(ctx, "archive_document", ["scope=?"], [person.id], pageOptions(archiveUrl));
      const archiveDocuments = archive.items.map(({ id, title, text, sourceAccount, deliveryId, events, addedBy, addedAt, attachment,education,additionalEducation }) =>
        ({ documentId:id,title,text,sourceAccount,deliveryId,events,addedBy,addedAt,attachment,education,additionalEducation }));
      return result({ ...await candidateWithResumeFacts(ctx,person), factsSource: person.factsSource, canManage: canManageCandidate(ctx, person), archiveDocuments, archiveNextCursor: archive.nextCursor, applicationIds: apps.items.map(a => a.id), applications: apps.items.map(applicationSummary), nextCursor: apps.nextCursor });
    }
  }
  if (p[0] === "resume-sources" && p.length === 2 && method === "GET") {
    const source = await get(ctx, "source", p[1]);
    if (ctx.url.searchParams.get("download") === "1") {
      return downloadAttachment(ctx,source.id,source.attachment);
    }
    return result({ sourceId: source.id, applicationId: source.scope, type: source.type, text: source.text, attachment: source.attachment, extractStatus: source.extractStatus });
  }
  if (p[0] === "clarifications") {
    if (p.length === 2 && method === "GET") {
      const thread = await get(ctx, "thread", p[1]);
      return result({ threadId: thread.id, questions: thread.questions });
    }
    if (p.length === 3 && p[2] === "links" && method === "POST") return clarificationLink(ctx, p[1]);
  }
  if (p[0] === "interviews") {
    if (method === "GET" && p.length === 2) {
      const i = await get(ctx, "interview", p[1]);
      return result({ interviewId: i.id, scheduledAt: i.scheduledAt ?? null, completedAt: i.completedAt, invitationId: i.invitationId, format:i.format || null, result:i.result || null, notes:i.notes || "" });
    }
    if (method === "POST" && p.length === 3 && p[2] === "survey-invitations") return createInterviewInvitation(ctx, p[1]);
  }
  if (p[0] === "employments") {
    if (p.length === 2 && method === "GET") {
      const employment = await get(ctx, "employment", p[1]);
      const termination = employment.terminationId && ctx.actor.role === "admin" ? await get(ctx, "termination", employment.terminationId) : null;
      return result({ employmentId: employment.id, status: employment.status, startedAt: employment.startedAt, termination });
    }
    if (p.length === 3 && p[2] === "terminations" && method === "POST") return terminate(ctx, p[1]);
  }
  if (p[0] === "survey-invitations") {
    if (p.length === 1 && method === "GET") {
      const type = ctx.url.searchParams.get("type") || "interview_feedback";
      if (!Object.hasOwn(questionnaires, type)) missing();
      if (isExitSurvey(type)) requireExit(ctx);
      const status = ctx.url.searchParams.get("status") || "";
      const conditions = ["scope=?"];
      const params = [type];
      vacancyScope(ctx, "json_extract(data,'$.vacancyId')", conditions, params);
      if (status === "answered") conditions.push("json_extract(data,'$.responseId') IS NOT NULL");
      if (status === "sent" || status === "prepared") {
        conditions.push("json_extract(data,'$.status')=? AND json_extract(data,'$.expiresAt')>?");
        params.push(status, isoNow());
      }
      const found = await page(ctx, "invitation", conditions, params);
      return result({ ...found, items: found.items.map(inviteSummary) });
    }
    if (p.length === 2 && method === "GET") return result(await inviteView(ctx, await get(ctx, "invitation", p[1])));
    if (p.length === 3 && p[2] === "mark-sent" && method === "POST") return markSent(ctx, p[1]);
  }
  if (action === "analytics/departures" && method === "GET") return departureAnalytics(ctx);
  if (action === "analytics/departures/decision" && method === "POST") return saveDepartureDecision(ctx);
  if (action === "analytics" && method === "GET") return analytics(ctx);
  if (action === "analytics/brief" && method === "POST") return analyticsBrief(ctx);
  missing();
}
async function renderResult(ctx, response) {
  if (response instanceof Response) return response;
  let body = response.body;
  const headers = {};
  if (response.session) {
    const [kind, id] = response.session;
    const value = `${id}.${await token(ctx, kind, id)}`;
    headers["set-cookie"] = cookieString(ctx, kind === "hr" ? "kadry_hr" : "kadry_guest", value, kind === "hr" ? 86400 : 7 * 86400);
  }
  if (response.logout) headers["set-cookie"] = cookieString(ctx, "kadry_hr", "", 0);
  if (response.invitationId) body = { ...body, ...await inviteView(ctx, await get(ctx, "invitation", response.invitationId)) };
  if (response.clarifyLinkId) {
    const id = response.clarifyLinkId;
    body = { ...body, link: `${ctx.url.origin}/clarifications/access/${id}.${await token(ctx, "clarify-link", id)}` };
  }
  const ids = [response.process].flat().filter(Boolean);
  if (ids.length) ctx.execution.waitUntil((async () => {
    for (const id of ids) await processEvent(ctx, id);
  })().catch(console.error));
  return json(body, response.status, headers);
}
async function api(req, env, execution, url) {
  const ctx = { req, env, execution, url, cookies: cookies(req), idem: null };
  const [group, ...parts] = url.pathname.slice("/api/v1/".length).split("/");
  const method = req.method;
  await ensureData(ctx);
  if (["hr","auth","department"].includes(group)) ctx.actor = await auth(ctx);
  if (group === "hr") requireHr(ctx);
  const route = parts.join("/");
  if (group === "auth" && route === "session" && method === "GET") return json({
    authenticated:Boolean(ctx.actor),
    actor:ctx.actor ? {id:ctx.actor.id,role:ctx.actor.role,name:ctx.actor.name,department:ctx.actor.department || null,
      hosted:Boolean(ctx.actor.hosted),scoped:Boolean(ctx.actor.vacancyIds)} : null,
    demoAvailable:env.DEMO_MODE===true
  });
  if (group === "public" && route === "session" && method === "GET") {
    const id = (await visitor(ctx)) || uuid();
    return renderResult(ctx, result({ ready: true, syntheticOnly: syntheticOnly(env) }, 200, { session: ["visitor", id] }));
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    sameOrigin(ctx);
    const { body, digest } = await readBody(req);
    ctx.body = body;
    ctx.idem = await idempotency(ctx, digest);
    const previous = await replay(ctx);
    if (previous) return renderResult(ctx, previous);
  } else if (method !== "GET") {
    fail(405, "method_not_allowed", "Метод недоступен.");
  }
  if (group === "public") return renderResult(ctx, await publicRoutes(ctx, method, parts));
  if (group === "hr") return renderResult(ctx, await hrRoutes(ctx, method, parts));
  if (group === "department") return renderResult(ctx, await departmentRoutes(ctx, method, parts));
  if (group === "auth" && route === "login" && method === "POST") return renderResult(ctx, await hrLogin(ctx));
  if (group === "auth" && route === "logout" && method === "POST") {
    if (!ctx.actor?.sessionId) return renderResult(ctx, result({ authenticated: false }, 200, { logout: true }));
    return renderResult(ctx, await commit(ctx, [remove(ctx, "staff_session", ctx.actor.sessionId)], result({ authenticated: false }, 200, { logout: true })));
  }
  missing();
}
const assetTypes = { "/app.js":"text/javascript; charset=utf-8", "/style.css":"text/css; charset=utf-8", "/mark.svg":"image/svg+xml",
  "/inter-cyrillic.woff2":"font/woff2", "/inter-latin.woff2":"font/woff2" };
async function siteFetch(req, runtimeEnv, execution) {
  try {
    const url = new URL(req.url);
    const env = runtimeEnv.LOCAL_RUNTIME ? runtimeEnv : { TRUST_PLATFORM: true, ...runtimeEnv };
    if (url.pathname === "/health") return json({ ok: true, version: buildVersion });
    if (url.pathname.startsWith("/api/v1/")) {
      if (!env.DB) fail(503, "database_unavailable", "База данных пока недоступна.");
      return await api(req, env, execution, url);
    }
    if (!["GET", "HEAD"].includes(req.method)) fail(405, "method_not_allowed", "Метод недоступен.");
    const assetType=assetTypes[url.pathname];
    if (assetType) {
      const asset=assets[url.pathname];
      const body=req.method==="HEAD"?null:assetType==="font/woff2"?Uint8Array.from(atob(asset),char=>char.charCodeAt(0)):asset;
      return new Response(body,{headers:{...securityHeaders,"content-type":assetType,"cache-control":"public,max-age=300"}});
    }
    if (!/^\/(?:hr(?:\/[^.]+)?|department|vacancies(?:\/[a-z0-9-]+)?|receipts\/[A-Z0-9]+|clarifications\/[a-f0-9-]+|clarifications\/access\/[a-f0-9.-]+|surveys\/[a-f0-9.-]+)?\/?$/.test(url.pathname)) missing();
    return new Response(req.method === "HEAD" ? null : assets["/"], { headers: { ...securityHeaders, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpError) return json({ code: error.code, message: error.message, fields: error.fields }, error.status);
    console.error("Request failed", error?.message);
    return json({ code: "internal_error", message: "Не удалось обработать запрос. Повторите попытку.", fields: [] }, 500);
  }
}
