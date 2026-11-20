const channels = new Set(["public_form", "email", "archive", "manual", "unknown"]);
const skillCodes = {
  sql: ["SQL", "PostgreSQL", "ClickHouse", "SQLite"],
  python: ["Python", "Pandas", "NumPy"],
  analytics: ["аналитика", "аналитики", "аналитиком", "анализ данных", "воронка", "дашборд", "отчётность", "отчетность", "метрики"],
  api: ["REST API", " API", "FastAPI", "HTTP"],
  communication: ["коммуникация", "коммуникации", "переговоры", "презентации", "стейкхолдер"],
  education: ["образование", "бакалавр", "магистр", "университет", "выпускник"],
  project: ["проект", "координация", "roadmap", "дорожная карта"],
  office: ["Excel", "Word", "документооборот", "делопроизводство"],
  experience: []
};
const statuses = new Set(["matched", "partial", "needs_clarification", "not_met"]);
const commonWord = new Set(["работа", "работы", "наличие", "умение", "знание", "опыт"]);
function validateVacancy(body, previous = {}) {
  const title = field(body.title, "title", limits.title, true);
  const department = field(body.department, "department", limits.department, true);
  const description = field(body.description, "description", limits.description, true);
  const slug = field(body.slug, "slug", 90, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) invalid("slug", "invalid_slug", "Для адреса используйте латиницу, цифры и дефисы.");
  const location = field(body.location, "location", 120) || "Нижний Новгород";
  const schedule = field(body.schedule, "schedule", 80) || "Полная занятость";
  const inputFields = collection(body.formFields ?? [{ id: "resume", required: true }], "formFields", 8);
  const formFields = [
    { id: "fullName", label: "Фамилия и имя", required: true },
    { id: "contact", label: "Email для связи", required: true },
    { id: "resume", label: "Резюме", required: inputFields.find(x => x?.id === "resume")?.required !== false }
  ];
  const ids = new Set();
  function listId(item, key) {
    if (!item || typeof item !== "object") invalid(key, "invalid_item", "Некорректная строка.");
    const id = item.id || uuid();
    if (!safePath(id) || ids.has(id)) invalid(key, "duplicate_id", "У строк должны быть разные идентификаторы.");
    ids.add(id);
    return id;
  }
  const criteria = collection(body.criteria ?? [], "criteria", 8).map((item, i) => {
    const key = `criteria.${i}`;
    const id = listId(item, key);
    const label = field(item.label ?? item.text, `${key}.label`, 160, true);
    const code = field(item.code, `${key}.code`, 32) || "custom";
    if (code !== "custom" && !Object.hasOwn(skillCodes, code)) invalid(`${key}.code`, "invalid_code", "Выберите тип критерия.");
    const keywords = collection(item.keywords ?? [], `${key}.keywords`, 12).map(value => field(value, `${key}.keywords`, 70, true));
    return { id, label, code, keywords, reference: field(item.reference, `${key}.reference`, 250), required: item.required !== false, question: field(item.question, `${key}.question`, 300) || `Расскажите подробнее, как ваш опыт связан с требованием «${label}».` };
  });
  const testQuestions = collection(body.testQuestions ?? [], "testQuestions", 6).map((item, i) => {
    const key = `testQuestions.${i}`;
    return { id: listId(item, key), text: field(item.text, `${key}.text`, 400, true), required: item.required !== false };
  });
  if (previous.publishedVersionId && slug !== previous.slug) invalid("slug", "published_slug", "Адрес опубликованной вакансии закреплён.");
  return { title, department, description, slug, location, schedule, formFields, criteria, testQuestions };
}
const vacancySummary = v => ({ vacancyId: v.id, slug: v.slug, title: v.draft.title, department: v.draft.department, location: v.draft.location, schedule: v.draft.schedule, status: v.publishedVersionId ? "published" : "draft", publishedVersionId: v.publishedVersionId, updatedAt: v.sort,
  draftNumber:v.draftNumber || 1, draftAuthor:v.draftAuthor || null, approval:v.approval || null });
const publicVacancy = (v, version) => ({
  vacancyId: v.id, slug: version.slug, publishedVersionId: version.id, title: version.title,
  department: version.department, description: version.description, schedule: version.schedule, location: version.location,
  formFields: version.formFields, testVersionId: version.testVersionId, questions: version.testQuestions
});
function newVersion(v) {
  return make({ ...v.draft, vacancyId: v.id, criteriaVersionId: uuid(), testVersionId: v.draft.testQuestions.length ? uuid() : null }, v.id);
}
async function editVacancy(ctx, action, id) {
  if (action === "create") {
    const draft = validateVacancy(ctx.body);
    if (await get(ctx, "slug", draft.slug, false)) invalid("slug", "duplicate_slug", "Такой адрес уже занят.");
    const requisitionId=ctx.body.requisitionId || null;
    if(requisitionId && !safePath(requisitionId)) invalid("requisitionId","invalid_id","Выберите заявку подразделения.");
    const request=requisitionId?await get(ctx,"requisition",requisitionId):null;
    if(request && request.status!=="submitted") fail(409,"request_unavailable","По этой заявке нельзя создать ещё одну вакансию.");
    const v = make({ draft, slug: draft.slug, requisitionId, publishedVersionId: null, createdAt: isoNow(), draftNumber:1, draftAuthor:{id:ctx.actor.id,name:ctx.actor.name,at:isoNow()} });
    const statements=[put(ctx,"vacancy",v),put(ctx,"slug",make({vacancyId:v.id},"",v.sort,v.slug))];
    if(request) statements.push(...expect(ctx,"requisition",request),update(ctx,"requisition",{...request,status:"vacancy_draft",vacancyId:v.id,sort:isoNow()}));
    return commit(ctx,statements,result({...vacancySummary(v),draft},201));
  }
  const v = await get(ctx, "vacancy", id);
  const guard = expect(ctx, "vacancy", v);
  if (action === "update") {
    const draft = validateVacancy(ctx.body, v);
    const statements = [...guard];
    if (draft.slug !== v.slug) {
      if (await get(ctx, "slug", draft.slug, false)) invalid("slug", "duplicate_slug", "Такой адрес уже занят.");
      statements.push(remove(ctx, "slug", v.slug), put(ctx, "slug", make({ vacancyId: v.id }, "", isoNow(), draft.slug)));
    }
    if (JSON.stringify(v.draft) === JSON.stringify(draft)) return commit(ctx, [], result({ ...vacancySummary(v), draft }));
    const editing = { ...v, slug: draft.slug, sort: isoNow(), draft, draftNumber:(v.draftNumber || 1)+1, approval:null,
      draftAuthor:{id:ctx.actor.id,name:ctx.actor.name,at:isoNow()} };
    return commit(ctx, [...statements, update(ctx, "vacancy", editing)], result({ ...vacancySummary(editing), draft }));
  }
  if (v.publishedVersionId) {
    if (v.approval?.status !== "approved" || v.approval.version !== v.draftNumber) fail(409,"approval_required","Согласуйте эту версию черновика перед публикацией.");
    if (ctx.body.draftNumber !== v.draftNumber) conflict();
  }
  const version = newVersion(v);
  Object.assign(version,{draftNumber:v.draftNumber || 1, author:v.draftAuthor || null, approval:v.approval || null, publishedBy:ctx.actor.name});
  const published = { ...v, publishedVersionId: version.id, approval:null, draftAuthor:null, sort: isoNow() };
  const statements=[...guard,put(ctx,"version",version),update(ctx,"vacancy",published)];
  if(v.requisitionId && !v.publishedVersionId){
    const request=await get(ctx,"requisition",v.requisitionId);
    statements.push(...expect(ctx,"requisition",request),update(ctx,"requisition",{...request,status:"published",vacancySlug:v.slug,sort:isoNow()}));
  }
  return commit(ctx,statements,result({...vacancySummary(published),criteriaVersionId:version.criteriaVersionId,testVersionId:version.testVersionId},201));
}
async function reviewVacancyDraft(ctx, id, action) {
  const vacancy = await get(ctx,"vacancy",id);
  if (!vacancy.publishedVersionId || !vacancy.draftAuthor) fail(409,"draft_unavailable","Сначала сохраните изменения черновика.");
  if (ctx.body.draftNumber !== vacancy.draftNumber) conflict();
  const current = vacancy.approval;
  const meta = { id:ctx.actor.id, name:ctx.actor.name, at:isoNow() };
  let approval;
  if (action === "submit") {
    if (current && current.status !== "changes_requested") fail(409,"already_submitted","Этот черновик уже передан на согласование.");
    approval = { status:"submitted", version:vacancy.draftNumber, submittedBy:meta };
  } else {
    requireExit(ctx);
    if (current?.status !== "submitted" || current.version !== vacancy.draftNumber) fail(409,"draft_changed","Передайте текущий черновик на согласование.");
    if ([vacancy.draftAuthor.id,current.submittedBy.id].includes(ctx.actor.id)) denied();
    const note = field(ctx.body.note,"note",limits.notes,action==="request_changes");
    approval = { ...current, status:action==="approve"?"approved":"changes_requested", reviewedBy:meta, note };
  }
  const revised = {...vacancy,approval,sort:isoNow()};
  return commit(ctx,[...expect(ctx,"vacancy",vacancy),update(ctx,"vacancy",revised),
    put(ctx,"vacancy_review",make(approval,vacancy.id))],result(vacancySummary(revised)));
}
function stageState() {
  return { currentStage: "received", outcome: null, rejectedAtStage: null, version: 0, interviewId: null, employmentId: null };
}
function applicationSummary(a) {
  return {
    applicationId: a.id, vacancyId: a.scope, vacancyTitle: a.vacancyTitle, fullName: a.fullName,
    contact: a.contact, receivedAt: a.receivedAt, sourceChannel: a.sourceChannel, stage: a.stage.currentStage,
    outcome: a.stage.outcome, assessmentStatus: a.assessmentStatus, candidateId: a.candidateId
  };
}
async function receive(ctx, isPublic) {
  const b = ctx.body;
  if (!safePath(b.vacancyId)) invalid("vacancyId", "required", "Выберите вакансию.");
  const vacancy = await get(ctx, "vacancy", b.vacancyId);
  if (!vacancy.publishedVersionId) fail(409, "vacancy_not_published", "Сначала опубликуйте вакансию.");
  const version = await get(ctx, "version", vacancy.publishedVersionId);
  if (isPublic && (b.publishedVersionId !== version.id || (b.testVersionId || null) !== version.testVersionId)) {
    fail(409, "vacancy_version_changed", "Вакансия обновилась. Откройте форму ещё раз.");
  }
  const fullName = field(b.fullName, "fullName", limits.name, true);
  const email = contact(b.contact, isPublic);
  if (isPublic && syntheticOnly(ctx.env)) {
    if (b.demoAcknowledged !== true && b.demoAcknowledged !== "on") invalid("demoAcknowledged", "required", "Подтвердите, что используете вымышленные данные.");
    if (!/@[^@]+\.(test|example)$/i.test(email)) invalid("contact", "demo_email", "Введите вымышленный адрес, например candidate@example.test.");
  }
  const contents = await prepareResume(ctx, isPublic ? version.formFields.find(f => f.id === "resume").required : true);
  const selectedChannel = isPublic ? "public_form" : (b.sourceChannel || "manual");
  if (!channels.has(selectedChannel) || (!isPublic && selectedChannel === "public_form")) invalid("sourceChannel", "invalid_channel", "Выберите источник отклика.");
  const sourceReceivedAt = isPublic ? isoNow() : dateValue(b.sourceReceivedAt, "sourceReceivedAt");
  const supplied = new Map();
  if (isPublic) {
    for (const entry of collection(b.answers ?? [], "answers", 6)) {
      const q = version.testQuestions.find(x => x.id === entry?.questionId);
      if (!q || supplied.has(q.id)) invalid("answers", "invalid_question", "В форме есть неизвестный или повторяющийся вопрос.");
      supplied.set(q.id, field(entry.value, `answer_${q.id}`, limits.answer));
    }
  }
  const answers = version.testQuestions.map(q => ({ questionId: q.id, question: q.text, required: q.required, value: supplied.get(q.id) || "" }));
  if (isPublic) {
    const errors = answers.filter(q => q.required && !q.value).map(q => ({field: `answer_${q.questionId}`, code: "required"}));
    if (errors.length) fail(422, "validation_failed", "Ответьте на обязательные вопросы.", errors);
  }
  const acceptedAt = isoNow();
  const receivedAt = sourceReceivedAt || acceptedAt;
  const applicationId = uuid();
  const receiptNumber = uuid().slice(0, 13).replace("-", "").toUpperCase();
  const { attachment } = contents;
  const source = make({
    type: "resume", text: contents.text, searchText: lowered(contents.text), extractStatus: contents.extractStatus,
    readable: /\p{L}/u.test(contents.text.replace(/\b(?:https?:\/\/|www\.)\S+/giu, "")),
    attachment: attachment && { name: attachment.name, size: attachment.size, type: attachment.type }
  }, applicationId);
  const app = make({
    vacancyTitle: version.title, versionId: version.id, criteriaVersionId: version.criteriaVersionId,
    testVersionId: version.testVersionId, testStatus: !answers.length ? "not_required" : isPublic && answers.some(q => q.value) ? "completed" : "not_completed",
    answers, fullName, searchName: lowered(fullName), contact: email, sourceId: source.id, sourceChannel: selectedChannel,
    sourceAccount: field(b.sourceAccount, "sourceAccount", 160), sourceSubject: field(b.sourceSubject, "sourceSubject", 250),
    sourceReceivedAt, importedAt: isPublic ? null : acceptedAt, receivedAt, acceptedAt,
    candidateId: null, assessmentStatus: "pending", clarificationThreadId: null, stage: stageState()
  }, vacancy.id, receivedAt, applicationId);
  const visitorId = isPublic ? (await visitor(ctx)) || uuid() : null;
  const receipt = make({ applicationId, visitorId, expiresAt: inDays(7) }, applicationId, acceptedAt, receiptNumber);
  const created = event(ctx, "application.created", { applicationId, vacancyId: vacancy.id, criteriaVersionId: app.criteriaVersionId, sourceChannel: selectedChannel, receivedAt });
  const delivery = ctx.delivery && make({ applicationId, receiptNumber, digest: ctx.delivery.digest }, "", acceptedAt, ctx.delivery.id);
  const first = make({ fromStage: null, toStage: "received", action: "receive", outcome: null, actorId: ctx.actor?.id ?? "public", actorName: ctx.actor?.name ?? "Публичная форма", occurredAt: acceptedAt }, applicationId, acceptedAt);
  if (attachment) await ctx.env.BUCKET.put(source.id, attachment.bytes);
  let response;
  try {
    response = await commit(ctx, [
      ...expect(ctx, "vacancy", vacancy), put(ctx, "application", app), put(ctx, "source", source),
      put(ctx, "receipt", receipt), put(ctx, "stage_event", first), created.stmt,
      ...(delivery ? [put(ctx, "application_delivery", delivery)] : [])
    ], result({ applicationId, receiptNumber, assessmentStatus: "pending" }, 201, { session: isPublic ? ["visitor", visitorId] : null, process: created.id }));
  } catch (error) {
    if (attachment) await ctx.env.BUCKET.delete(source.id).catch(() => {});
    if (error.code === "version_conflict" && delivery) {
      const previous = await get(ctx, "application_delivery", delivery.id, false);
      if (previous) return duplicateDelivery(previous, delivery.digest);
    }
    if (error.code === "version_conflict" && isPublic) {
      const latest = await get(ctx, "vacancy", b.vacancyId);
      if (latest.publishedVersionId !== b.publishedVersionId) fail(409, "vacancy_version_changed", "Вакансия обновилась. Откройте форму ещё раз.");
    }
    throw error;
  }
  if (attachment && response.body.applicationId !== app.id) await ctx.env.BUCKET.delete(source.id).catch(() => {});
  return response;
}
function termPattern(term) {
  const literal = lowered(term.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${literal}(?![\\p{L}\\p{N}])`, "giu");
}
function locateEvidence(source, patterns) {
  const separators = /[.!?;\n]+|,\s*(?:но|однако|зато|когда|если|поскольку|потому что|хотя)\s+/giu;
  let start = 0;
  for (const end of [...source.text.matchAll(separators), { index: source.text.length, 0: "" }]) {
    const clause = source.text.slice(start, end.index);
    const clean = clause.replaceAll("ё","е").replaceAll("Ё","Е");
    const match = patterns.flatMap(pattern => [...clean.matchAll(pattern)]).sort((a,b) => a.index-b.index)
      .find(hit => !negatesEvidence(clean, hit));
    if (match) {
      const offset = start + Math.max(clause.length - clause.trimStart().length, match.index - 90);
      const quote = source.text.slice(offset, Math.min(end.index, offset + 260)).trimEnd();
      return { sourceId: source.id, type: source.type, quote, offset };
    }
    start = end.index + end[0].length;
  }
  return null;
}
function negatesEvidence(clause, match) {
  const before = lowered(clause.slice(0, match.index)).split(/[,;]|\s+и\s+/u).at(-1);
  const after = lowered(clause.slice(match.index + match[0].length));
  return /(?:^|[^\p{L}])(?:не(?!\s+только(?!\p{L}))|нет|без|отсутствует|not|never|no)(?:\s+[\p{L}-]+){0,5}\s*$/u.test(before)
    || /^\s*(?:[:—-]\s*)?(?:не\s+(?:зна[юе]|использ|работал|владе)|нет(?:\s|$)|отсутствует)/u.test(after);
}
function conditionalRequirement(criterion) {
  const label = lowered(criterion.label);
  if (/(?:^|[^\p{L}])(?:лет|год(?:а|ов)?|месяц[а-я]*|стаж[а-я]*)(?!\p{L})/u.test(label)) return "Укажите продолжительность и даты работы по этому требованию и приведите пример задачи.";
  if (criterion.code === "custom" || /,|(?:^|\s)(?:и|или|вместе с)\s/u.test(label)) return criterion.question;
  return null;
}
const higherEducation = /(?:высш[а-я]*\s+(?:профессиональн[а-я]*\s+)?образован[а-я]*|бакалавр[а-я]*|магистр[а-я]*|специалитет[а-я]*)/u;
const legalProfile = /(?:юриспруденц[а-я]*|государственн[а-я]*\s+и\s+муниципальн[а-я]*\s+управлен[а-я]*)/u;
const retraining = /(?:профессиональн[а-я]*\s+переподготов[а-я]*|профпереподготов[а-я]*)/u;
const refresher = /повышени[а-я]*\s+квалификаци[а-я]*/u;
function educationalEvidence(sources) {
  const facts = { education: [], retraining: [], refresher: [] };
  for (const source of sources) {
    for (const match of source.text.matchAll(/[^.!?;\n]+/gu)) {
      const quote = match[0].trim();
      const clean = quote.toLowerCase().replaceAll("ё","е");
      const offset = match.index + match[0].length - match[0].trimStart().length;
      for (const [key, pattern] of [["education",higherEducation],["retraining",retraining],["refresher",refresher]]) {
        const hit = pattern.exec(clean);
        if (!hit || negatesEvidence(clean, hit) || facts[key].length >= 3) continue;
        const profile = legalProfile.exec(clean);
        facts[key].push({ sourceId:source.id, type:source.type, quote:quote.slice(0, 260), offset,
          profile:Boolean(profile && !negatesEvidence(clean, profile)) });
      }
    }
  }
  return facts;
}
function sectorEducation(sources, item) {
  const facts = educationalEvidence(sources);
  const direct = facts.education.find(x=>x.profile && !retraining.test(lowered(x.quote)) && !refresher.test(lowered(x.quote)));
  const conversion = facts.retraining.find(x=>x.profile);
  const degree = facts.education[0];
  const evidence = direct ? [direct] : [degree,conversion].filter(Boolean);
  const educationPath = direct ? "profile_degree" : degree && conversion ? "degree_and_retraining" : null;
  let question = "Укажите специальность высшего образования и приложите сведения о дипломе.";
  if (degree && !conversion && !direct) question = "Проходили ли вы профессиональную переподготовку по юриспруденции или государственному и муниципальному управлению?";
  if (educationPath) question = "Сверьте реквизиты диплома и профиль программы по документам.";
  return {...item, evidence, educationPath, status:evidence.length ? "partial" : "needs_clarification", question};
}
function scoreCriterion(criterion, sources) {
  const fallback = lowered(criterion.label).split(/[^\p{L}\p{N}+#]+/u).filter(word => word.length >= 3 && !commonWord.has(word));
  const dictionary = skillCodes[criterion.code] || [];
  const education = criterion.code === "education";
  const configured = education && criterion.keywords.length ? criterion.keywords : [...criterion.keywords, ...dictionary];
  const terms = configured.length ? [...new Set(configured)] : [...new Set(fallback)].slice(0, 6);
  const patterns = terms.map(termPattern);
  const followup = conditionalRequirement(criterion);
  const evidence = [];
  let status = "needs_clarification";
  for (const source of sources) {
    const found = locateEvidence(source, patterns);
    if (!found) continue;
    const tentative = education || followup || /(?:изучаю|базовы|немного|начальный|учусь|теори)/iu.test(found.quote);
    if (status !== "matched") status = tentative ? "partial" : "matched";
    evidence.push(found);
    if (evidence.length >= 3) break;
  }
  const item = { criterionId: criterion.id, label: criterion.label, reference: criterion.reference || "", required: criterion.required, status, evidence, question: ["needs_clarification", "partial"].includes(status) ? (followup || criterion.question) : null, hrOverride: null };
  return education && criterion.id === "req_sector_education" ? sectorEducation(sources,item) : item;
}
const currentScoringVersion = 2;
const initialSources = (app, source) => [source, ...app.answers.filter(q => q.value).map(q => ({ id:q.questionId,type:"test",text:q.value }))];
async function refreshStoredAssessment(ctx, app) {
  const old = await get(ctx,"assessment",app.id,false);
  if (!old || old.scoringVersion === currentScoringVersion) return;
  const [version,source,thread,interviewNotes] = await Promise.all([
    get(ctx,"version",app.versionId), get(ctx,"source",app.sourceId,false),
    app.clarificationThreadId ? get(ctx,"thread",app.clarificationThreadId,false) : null,
    interviewAnswerSources(ctx,app.id)
  ]);
  if (!source) return;
  const clarificationSources = thread ? await rows(ctx,
    "SELECT * FROM records WHERE kind='source' AND scope=? AND json_extract(data,'$.type')='clarification'",app.id) : [];
  const byQuestion = new Map(clarificationSources.map(item=>[item.questionId,item]));
  const base = initialSources(app,source);
  const rescored = { ...old, scoringVersion:currentScoringVersion, assessedAt:isoNow() };
  rescored.items = version.criteria.map(criterion=>{
    const previous = old.items.find(item=>item.criterionId===criterion.id);
    const answers = (thread?.questions || []).filter(q=>q.criterionId===criterion.id).map(q=>byQuestion.get(q.questionId)).filter(Boolean);
    const notes = interviewNotes.filter(note=>note.criterionId===criterion.id);
    return { ...scoreCriterion(criterion,[...notes,...answers,...base]), hrOverride:previous?.hrOverride || null };
  });
  const existingQuestions = thread?.questions || [];
  const newQuestions = app.stage.outcome ? [] : rescored.items.filter(item=>item.question && !item.hrOverride
    && !existingQuestions.some(q=>q.criterionId===item.criterionId)).map(item=>({
    questionId:uuid(), criterionId:item.criterionId, text:item.question, status:"open"
  }));
  const statements = [...expect(ctx,"assessment",old),update(ctx,"assessment",rescored)];
  if (newQuestions.length && thread) {
    statements.push(...expect(ctx,"thread",thread),update(ctx,"thread",{...thread,questions:[...existingQuestions,...newQuestions]}));
  } else if (newQuestions.length) {
    const added = make({applicationId:app.id,assessmentId:app.id,questions:newQuestions},app.id);
    statements.push(...expect(ctx,"application",app),put(ctx,"thread",added),update(ctx,"application",{...app,clarificationThreadId:added.id}));
  }
  try { await commit({...ctx,idem:null},statements); }
  catch (error) { if (error.code !== "version_conflict") throw error; }
}
async function refreshQueueAssessments(ctx, conditions, params) {
  const where = ["kind='application'",...conditions,"EXISTS (SELECT 1 FROM records s WHERE s.kind='source' AND s.id=json_extract(records.data,'$.sourceId'))",`EXISTS (SELECT 1 FROM records old WHERE old.kind='assessment' AND old.id=records.id
    AND coalesce(json_extract(old.data,'$.scoringVersion'),0)<>?)`];
  const outdated = await rows(ctx,`SELECT * FROM records WHERE ${where.join(" AND ")} ORDER BY sort DESC,id LIMIT 5`,
    ...params,currentScoringVersion);
  for (const app of outdated) await refreshStoredAssessment(ctx,app);
}
async function runAssessment(ctx, e) {
  const app = await get(ctx, "application", e.payload.applicationId);
  const version = await get(ctx, "version", app.versionId);
  const source = await get(ctx, "source", app.sourceId);
  const old = await get(ctx, "assessment", app.id, false);
  if (e.type === "application.created" && old) return [];
  const base = initialSources(app,source);
  let items;
  const changes = [...expect(ctx, "application", app)];
  if (e.type === "application.created") {
    items = version.criteria.map(criterion => scoreCriterion(criterion, base));
    const questions = items.filter(item => item.question).map(item => ({ questionId: uuid(), criterionId: item.criterionId, text: item.question, status: "open" }));
    if (questions.length) {
      const thread = make({ applicationId: app.id, questions, assessmentId: app.id }, app.id);
      app.clarificationThreadId = thread.id;
      changes.push(put(ctx, "thread", thread));
    }
    changes.push(put(ctx, "assessment", make({ scoringVersion:currentScoringVersion, criteriaVersionId: app.criteriaVersionId, assessmentStatus: "ready", items, assessedAt: isoNow() }, app.id, isoNow(), app.id)));
  } else {
    const answer = await get(ctx, "source", e.payload.answerId);
    const criterion = version.criteria.find(c => c.id === e.payload.criterionId);
    const previousAnswerSources = await rows(ctx,`SELECT * FROM records WHERE kind='source' AND scope=? AND id<>?
      AND json_extract(data,'$.criterionId')=? AND json_extract(data,'$.type') IN ('interview','clarification')
      ORDER BY sort DESC,id LIMIT 12`,app.id,answer.id,criterion.id);
    const measured = scoreCriterion(criterion, [answer, ...previousAnswerSources, ...base]);
    items = old.items.map(item => item.criterionId === criterion.id ? { ...measured, hrOverride: item.hrOverride } : item);
    changes.push(...expect(ctx, "assessment", old), update(ctx, "assessment", { ...old, items, assessedAt: isoNow() }));
  }
  changes.push(update(ctx, "application", { ...app, assessmentStatus: "ready" }));
  return changes;
}
async function processEvent(ctx, eventId) {
  const work = { ...ctx, idem: null };
  for (let attempt = 0; attempt < 3; attempt++) {
    const e = await get(work, "event", eventId, false);
    if (!e || e.doneAt || e.failedAt) return;
    try {
      const changes = ["application.created", "clarification.answered", "interview.answer_recorded"].includes(e.type) ? await runAssessment(work, e) : [];
      await commit(work, [...expect(work, "event", e), ...changes, update(work, "event", { ...e, doneAt: isoNow() })]);
      return;
    } catch (error) {
      if (error.code === "version_conflict") continue;
      const attempts = (e.attempts || 0) + 1;
      const changes = [...expect(work, "event", e), update(work, "event", { ...e, attempts, failedAt: attempts >= 3 ? isoNow() : null })];
      if (attempts >= 3 && e.type === "application.created") {
        const app = await get(work, "application", e.payload.applicationId);
        changes.push(...expect(work, "application", app), update(work, "application", { ...app, assessmentStatus: "failed" }));
      }
      try { await commit(work, changes); } catch (err) { if (err.code !== "version_conflict") throw err; }
    }
  }
}
async function processPending(ctx, scope) {
  const conditions = ["kind='event'", "json_extract(data,'$.doneAt') IS NULL", "json_extract(data,'$.failedAt') IS NULL"];
  const params = [];
  if (scope) {
    conditions.push("json_extract(data,'$.payload.applicationId')=?");
    params.push(scope);
  }
  const pending = await all(ctx, `SELECT id FROM records WHERE ${conditions.join(" AND ")} ORDER BY sort, id LIMIT 8`, ...params);
  for (const item of pending) await processEvent(ctx, item.id);
}
async function assessView(ctx, app) {
  const value = await get(ctx, "assessment", app.id, false);
  if (!value) {
    const version = await get(ctx, "version", app.versionId);
    const items = version.criteria.map(c => ({ criterionId: c.id, label: c.label, status: "needs_clarification", question: c.question, evidence: [], hrOverride: null, required: c.required }));
    return { assessmentId: null, criteriaVersionId: app.criteriaVersionId, assessmentStatus: app.assessmentStatus, items };
  }
  return { assessmentId: value.id, criteriaVersionId: value.criteriaVersionId, assessmentStatus: app.assessmentStatus, assessedAt: value.assessedAt, items: value.items };
}
async function overrideAssessment(ctx, app, criterionId) {
  let a = await get(ctx, "assessment", app.id, false);
  if (!statuses.has(ctx.body.status)) invalid("status", "invalid_status", "Выберите статус критерия.");
  const reason = field(ctx.body.reason, "reason", limits.notes, true);
  const items = a?.items ?? (await assessView(ctx, app)).items;
  if (!items.some(i => i.criterionId === criterionId)) missing();
  const hrOverride = { status: ctx.body.status, reason, actorId: ctx.actor.id, actorName: ctx.actor.name, at: isoNow() };
  const revised = items.map(item => item.criterionId === criterionId ? { ...item, hrOverride } : item);
  const stmts = [];
  if (a) {
    stmts.push(...expect(ctx, "assessment", a), update(ctx, "assessment", { ...a, items: revised }));
  } else {
    if (app.assessmentStatus === "pending") fail(409, "assessment_pending", "Дождитесь окончания первичной проверки.");
    a = make({ criteriaVersionId: app.criteriaVersionId, assessmentStatus: app.assessmentStatus, items: revised }, app.id, isoNow(), app.id);
    stmts.push(put(ctx, "assessment", a));
  }
  stmts.push(put(ctx, "override", make({ applicationId: app.id, criterionId, ...hrOverride }, app.id)));
  return commit(ctx, stmts, result({ assessmentId: a.id, criteriaVersionId: app.criteriaVersionId, assessmentStatus: app.assessmentStatus, items: revised }));
}
function candidateSummary(person) {
  return { candidateId: person.id, fullName: person.fullName, contact: person.contact, education: person.education, additionalEducation: person.additionalEducation || "", experience: person.experience, updatedAt: person.sort };
}
async function createCandidate(ctx) {
  const b = ctx.body;
  const fullName = field(b.fullName, "fullName", limits.name, true);
  const email = contact(b.contact, false);
  const education = field(b.education, "education", 500);
  const additionalEducation = field(b.additionalEducation, "additionalEducation", 500);
  const experience = field(b.experience, "experience", 1000);
  const person = make({ ownerId:ctx.actor.id, fullName, searchName: lowered(fullName), contact: email, education, educationSearch: lowered(education), additionalEducation, additionalEducationSearch: lowered(additionalEducation), experience, experienceSearch: lowered(experience), factsSource: { type: "hr", actorName: ctx.actor.name, at: isoNow() } });
  return commit(ctx, [put(ctx, "candidate", person)], result(candidateSummary(person), 201));
}
async function linkCandidate(ctx, a) {
  if (!safePath(ctx.body.candidateId)) invalid("candidateId", "invalid_id", "Выберите профиль кандидата.");
  if (a.stage.outcome === "hired" && a.candidateId !== ctx.body.candidateId) fail(409, "candidate_locked", "Связь закреплена при найме.");
  const person = await get(ctx, "candidate", ctx.body.candidateId);
  if (a.candidateId === person.id) return commit(ctx, [], result({ applicationId: a.id, candidateId: person.id }));
  const applied = { ...a, candidateId: person.id };
  const history = make({ applicationId: a.id, candidateId: person.id, previousCandidateId: a.candidateId, at: isoNow(), actorId: ctx.actor.id }, a.id);
  return commit(ctx, [...expect(ctx, "application", a), update(ctx, "application", applied), put(ctx, "candidate_link", history)], result({ applicationId: a.id, candidateId: person.id }));
}
