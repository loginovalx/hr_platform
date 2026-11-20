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
  const testQuestions = collection(body.testQuestions ?? previous.draft?.testQuestions ?? [], "testQuestions", 6).map((item, i) => {
    const key = `testQuestions.${i}`;
    return { id: listId(item, key), text: field(item.text, `${key}.text`, 400, true), required: item.required !== false };
  });
  if (previous.publishedVersionId && slug !== previous.slug) invalid("slug", "published_slug", "Адрес опубликованной вакансии закреплён.");
  return { title, department, description, slug, location, schedule, formFields, criteria, testQuestions };
}
const vacancySummary = v => ({ vacancyId: v.id, slug: v.slug, title: v.draft.title, department: v.draft.department, location: v.draft.location, schedule: v.draft.schedule, status: v.publishedVersionId ? "published" : "draft", publishedVersionId: v.publishedVersionId, updatedAt: v.sort });
const publicVacancy = (v, version) => ({
  vacancyId: v.id, slug: version.slug, publishedVersionId: version.id, title: version.title,
  department: version.department, description: version.description, schedule: version.schedule, location: version.location,
  formFields: version.formFields, testVersionId: null, questions: []
});
function newVersion(v) {
  return make({ ...v.draft, vacancyId: v.id, criteriaVersionId: uuid(), testVersionId: v.draft.testQuestions.length ? uuid() : null }, v.id);
}
async function editVacancy(ctx, action, id) {
  if (action === "create") {
    const draft = validateVacancy(ctx.body);
    if (await get(ctx, "slug", draft.slug, false)) invalid("slug", "duplicate_slug", "Такой адрес уже занят.");
    const v = make({ draft, slug: draft.slug, publishedVersionId: null, createdAt: isoNow() });
    return commit(ctx, [put(ctx, "vacancy", v), put(ctx, "slug", make({ vacancyId: v.id }, "", v.sort, v.slug))], result({ ...vacancySummary(v), draft }, 201));
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
    const editing = { ...v, slug: draft.slug, sort: isoNow(), draft };
    return commit(ctx, [...statements, update(ctx, "vacancy", editing)], result({ ...vacancySummary(editing), draft }));
  }
  const version = newVersion(v);
  const published = { ...v, publishedVersionId: version.id, sort: isoNow() };
  return commit(ctx, [...guard, put(ctx, "version", version), update(ctx, "vacancy", published)], result({ ...vacancySummary(published), criteriaVersionId: version.criteriaVersionId, testVersionId: version.testVersionId }, 201));
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
  if (isPublic && b.publishedVersionId !== version.id) {
    fail(409, "vacancy_version_changed", "Вакансия обновилась. Откройте форму ещё раз.");
  }
  const fullName = field(b.fullName, "fullName", limits.name, true);
  const email = contact(b.contact, isPublic);
  if (isPublic && (ctx.env.TRUST_PLATFORM || ctx.env.DEMO_MODE)) {
    if (!/@[^@]+\.(test|example)$/i.test(email)) invalid("contact", "demo_email", "Введите вымышленный адрес, например candidate@example.test.");
  }
  const contents = await prepareResume(ctx, isPublic ? version.formFields.find(f => f.id === "resume").required : true, isPublic);
  const selectedChannel = isPublic ? "public_form" : (b.sourceChannel || "manual");
  if (!channels.has(selectedChannel) || (!isPublic && selectedChannel === "public_form")) invalid("sourceChannel", "invalid_channel", "Выберите источник отклика.");
  const sourceReceivedAt = isPublic ? isoNow() : dateValue(b.sourceReceivedAt, "sourceReceivedAt");
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
  const candidate = candidateFromApplication({ id: applicationId, fullName, contact: email, acceptedAt });
  const app = make({
    vacancyTitle: version.title, versionId: version.id, criteriaVersionId: version.criteriaVersionId,
    testVersionId: null, testStatus: "not_required",
    answers: [], fullName, searchName: lowered(fullName), contact: email, sourceId: source.id, sourceChannel: selectedChannel,
    sourceReceivedAt, importedAt: isPublic ? null : acceptedAt, receivedAt, acceptedAt,
    candidateId: candidate.id, assessmentStatus: "pending", clarificationThreadId: null, stage: stageState()
  }, vacancy.id, receivedAt, applicationId);
  const visitorId = isPublic ? (await visitor(ctx)) || uuid() : null;
  const receipt = make({ applicationId, visitorId, expiresAt: inDays(7) }, applicationId, acceptedAt, receiptNumber);
  const created = event(ctx, "application.created", { applicationId, vacancyId: vacancy.id, criteriaVersionId: app.criteriaVersionId, sourceChannel: selectedChannel, receivedAt });
  const first = make({ fromStage: null, toStage: "received", action: "receive", outcome: null, actorId: ctx.actor?.id ?? "public", actorName: ctx.actor?.name ?? "Публичная форма", occurredAt: acceptedAt }, applicationId, acceptedAt);
  if (attachment) await ctx.env.BUCKET.put(source.id, attachment.bytes);
  let response;
  try {
    response = await commit(ctx, [
      ...expect(ctx, "vacancy", vacancy), put(ctx, "application", app), put(ctx, "source", source), put(ctx, "candidate", candidate),
      put(ctx, "receipt", receipt), put(ctx, "stage_event", first), created.stmt
    ], result({ applicationId, receiptNumber, assessmentStatus: "pending" }, 201, { session: isPublic ? ["visitor", visitorId] : null, process: created.id }));
  } catch (error) {
    if (attachment) await ctx.env.BUCKET.delete(source.id).catch(() => {});
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
  return new RegExp(`(?<![\\p{L}\\p{N}])${literal}(?![\\p{L}\\p{N}])`, "u");
}
function locateEvidence(source, patterns) {
  const separators = /[.!?;\n]+|,\s*(?:но|однако|зато)\s+/giu;
  let start = 0;
  for (const end of [...source.text.matchAll(separators), { index: source.text.length, 0: "" }]) {
    const clause = source.text.slice(start, end.index);
    const clean = lowered(clause);
    const match = patterns.map(pattern => pattern.exec(clean)).find(Boolean);
    if (match && !/(?:^|[^\p{L}])(?:не|нет|без|отсутствует|not|never|no)(?:$|[^\p{L}])/u.test(clean)) {
      const offset = start + Math.max(clause.length - clause.trimStart().length, match.index - 90);
      const quote = source.text.slice(offset, Math.min(end.index, offset + 260)).trimEnd();
      return { sourceId: source.id, type: source.type, quote, offset };
    }
    start = end.index + end[0].length;
  }
  return null;
}
function scoreCriterion(criterion, sources) {
  const fallback = lowered(criterion.label).split(/[^\p{L}\p{N}+#]+/u).filter(word => word.length >= 3 && !commonWord.has(word));
  const dictionary = skillCodes[criterion.code] || [];
  const education = criterion.code === "education";
  const configured = education && criterion.keywords.length ? criterion.keywords : [...criterion.keywords, ...dictionary];
  const terms = configured.length ? [...new Set(configured)] : [...new Set(fallback)].slice(0, 6);
  const patterns = terms.map(termPattern);
  const evidence = [];
  let status = "needs_clarification";
  for (const source of sources) {
    const found = locateEvidence(source, patterns);
    if (!found) continue;
    const tentative = education || /(?:изучаю|базовы|немного|начальный|учусь|теори)/iu.test(found.quote);
    if (status !== "matched") status = tentative ? "partial" : "matched";
    evidence.push(found);
    if (evidence.length >= 3) break;
  }
  return { criterionId: criterion.id, label: criterion.label, reference: criterion.reference || "", required: criterion.required, status, evidence, question: ["needs_clarification", "partial"].includes(status) ? criterion.question : null, hrOverride: null };
}
async function runAssessment(ctx, e) {
  const app = await get(ctx, "application", e.payload.applicationId);
  const version = await get(ctx, "version", app.versionId);
  const source = await get(ctx, "source", app.sourceId);
  const old = await get(ctx, "assessment", app.id, false);
  if (e.type === "application.created" && old) return [];
  const base = [source, ...app.answers.filter(q => q.value).map(q => ({ id: q.questionId, type: "test", text: q.value }))];
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
    changes.push(put(ctx, "assessment", make({ criteriaVersionId: app.criteriaVersionId, assessmentStatus: "ready", items, assessedAt: isoNow() }, app.id, isoNow(), app.id)));
  } else {
    const answer = await get(ctx, "source", e.payload.answerId);
    const criterion = version.criteria.find(c => c.id === e.payload.criterionId);
    const measured = scoreCriterion(criterion, [answer, ...base]);
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
      const changes = ["application.created", "clarification.answered"].includes(e.type) ? await runAssessment(work, e) : [];
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
function candidateFromApplication(app) {
  return make({
    fullName: app.fullName, searchName: lowered(app.fullName), contact: app.contact,
    education: "", additionalEducation: "", additionalEducationSearch: "", experience: "",
    factsSource: { type: "resume", applicationId: app.id, at: app.acceptedAt }
  });
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
  const person = make({ fullName, searchName: lowered(fullName), contact: email, education, additionalEducation, additionalEducationSearch: lowered(additionalEducation), experience, factsSource: { type: "hr", actorName: ctx.actor.name, at: isoNow() } });
  return commit(ctx, [put(ctx, "candidate", person)], result(candidateSummary(person), 201));
}
async function linkCandidate(ctx, a) {
  if (!safePath(ctx.body.candidateId)) invalid("candidateId", "invalid_id", "Выберите профиль кандидата.");
  if (a.stage.outcome === "hired" && a.candidateId !== ctx.body.candidateId) fail(409, "candidate_locked", "Связь закреплена при найме.");
  const person = await get(ctx, "candidate", ctx.body.candidateId);
  const applied = { ...a, candidateId: person.id };
  const history = make({ applicationId: a.id, candidateId: person.id, previousCandidateId: a.candidateId, at: isoNow(), actorId: ctx.actor.id }, a.id);
  return commit(ctx, [...expect(ctx, "application", a), update(ctx, "application", applied), put(ctx, "candidate_link", history)], result({ applicationId: a.id, candidateId: person.id }));
}
