const stageOrder = ["received", "review", "interview", "decision"];
const stageActions = {
  received: "start_review",
  review: "invite_interview",
  interview: "complete_interview",
  decision: "hire"
};
function getActions(a) {
  const s = a.stage;
  if (s.outcome) return [];
  const action = s.currentStage === "interview" && s.interviewCompletedAt ? "move_to_decision" : stageActions[s.currentStage];
  return [action, "reject"];
}
const viewStage = a => ({ ...a.stage, transitions: getActions(a) });
async function transition(ctx, app) {
  const { action, expectedVersion } = ctx.body;
  const s = { ...app.stage };
  if (!Number.isInteger(expectedVersion) || expectedVersion !== s.version) conflict();
  if (!getActions(app).includes(action)) fail(409, "invalid_transition", "На текущем этапе действие недоступно.");
  const reason = field(ctx.body.reason, "reason", limits.notes);
  const previous = s.currentStage;
  const at = isoNow();
  const statements = [...expect(ctx, "application", app)];
  if (action === "start_review") s.currentStage = "review";
  if (action === "invite_interview") {
    s.currentStage = "interview";
    const scheduledAt = dateValue(ctx.body.scheduledAt, "scheduledAt");
    if (scheduledAt && scheduledAt <= at) invalid("scheduledAt", "past_interview", "Выберите время интервью в будущем.");
    const interview = make({ applicationId: app.id, scheduledAt, completedAt: null, invitationId: null }, app.id, at);
    s.interviewId = interview.id;
    statements.push(put(ctx, "interview", interview));
  }
  if (action === "complete_interview") {
    const interview = await get(ctx, "interview", s.interviewId);
    s.interviewCompletedAt = at;
    statements.push(...expect(ctx, "interview", interview), update(ctx, "interview", { ...interview, completedAt: at }));
  }
  if (action === "move_to_decision") s.currentStage = "decision";
  if (action === "reject") {
    s.outcome = "rejected";
    s.rejectedAtStage = previous;
  }
  let candidateId = app.candidateId;
  if (action === "hire") {
    s.outcome = "hired";
    if (!candidateId) {
      const candidate = candidateFromApplication(app);
      candidateId = candidate.id;
      statements.push(put(ctx, "candidate", candidate));
    }
    const employment = make({ applicationId: app.id, candidateId, vacancyId: app.scope, startedAt: at, status: "active", terminationId: null }, app.id, at);
    s.employmentId = employment.id;
    statements.push(put(ctx, "employment", employment));
  }
  s.version++;
  const meta = { applicationId: app.id, fromStage: previous, toStage: s.currentStage, action, outcome: s.outcome, actorId: ctx.actor.id, actorName: ctx.actor.name, occurredAt: at, reason };
  const changed = event(ctx, "application.stage_changed", meta);
  statements.push(update(ctx, "application", { ...app, candidateId, stage: s }), put(ctx, "stage_event", make(meta, app.id, at, changed.id)), changed.stmt);
  return commit(ctx, statements, result({ stage: s.currentStage, outcome: s.outcome, eventId: changed.id, employmentId: s.employmentId }, 200, { process: changed.id }));
}
const questionnaires = {
  interview_feedback: [
    { id: "clarity", text: "Насколько понятным был процесс интервью?", type: "rating", required: true },
    { id: "comment", text: "Что можно улучшить?", type: "text", required: false }
  ],
  exit_feedback: [
    { id: "clarity", text: "Насколько понятно вам объяснили решение?", type: "rating", required: true },
    { id: "communication", text: "Как вы оцениваете коммуникацию в процессе увольнения?", type: "rating", required: true },
    { id: "comment", text: "Что можно улучшить?", type: "text", required: false }
  ]
};
const surveyTitles = { interview_feedback: "Обратная связь после интервью", exit_feedback: "Обратная связь после увольнения" };
async function invitation(ctx, type, app, sourceId, email, name = app.fullName) {
  const id = uuid();
  return make({
    type, applicationId: app.id, vacancyId: app.scope, vacancyTitle: app.vacancyTitle, fullName: name, contact: email,
    sourceId, status: email ? "prepared" : "no_contact", expiresAt: inDays(14), sentAt: null, responseId: null,
    tokenHash: email ? await sha(await token(ctx, "survey", id)) : null
  }, type, isoNow(), id);
}
const invitationLive = inv => inv.status !== "no_contact" && !inv.responseId && inv.expiresAt > isoNow();
function inviteSummary(inv) {
  const status = !invitationLive(inv) && !inv.responseId && inv.status !== "no_contact" ? "expired" : inv.status;
  return { invitationId: inv.id, type: inv.type, status, expiresAt: inv.expiresAt, sentAt: inv.sentAt, fullName: inv.fullName, vacancyTitle: inv.vacancyTitle, applicationId: inv.applicationId };
}
async function inviteView(ctx, inv) {
  if (inv.type === "exit_feedback") requireExit(ctx);
  const response = inv.responseId ? await get(ctx, "survey_response", inv.responseId) : null;
  const link = invitationLive(inv) ? `${ctx.url.origin}/surveys/${inv.id}.${await token(ctx, "survey", inv.id)}` : null;
  return {
    ...inviteSummary(inv), link, contact: inv.contact, response: response && { answers: response.answers, answeredAt: response.answeredAt },
    letter: link ? { subject: surveyTitles[inv.type], text: `Здравствуйте! Приглашаем поделиться обратной связью. Анкета добровольная, ссылка действует до ${new Date(inv.expiresAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}.\n\n${link}` } : null
  };
}
async function createInterviewInvitation(ctx, id) {
  const interview = await get(ctx, "interview", id);
  if (!interview.completedAt) fail(409, "interview_incomplete", "Отметьте интервью состоявшимся.");
  if (interview.invitationId) return commit(ctx, [], result({}, 201, { invitationId: interview.invitationId }));
  const app = await get(ctx, "application", interview.applicationId);
  const person = app.candidateId ? await get(ctx, "candidate", app.candidateId) : null;
  const entry = await invitation(ctx, "interview_feedback", app, interview.id, app.contact || person?.contact);
  return commit(ctx, [
    ...expect(ctx, "interview", interview), put(ctx, "invitation", entry),
    update(ctx, "interview", { ...interview, invitationId: entry.id })
  ], result({}, 201, { invitationId: entry.id }));
}
async function markSent(ctx, id) {
  const inv = await get(ctx, "invitation", id);
  if (inv.type === "exit_feedback") requireExit(ctx);
  if (inv.sentAt) return commit(ctx, [], result({}, 200, { invitationId: inv.id }));
  if (inv.status === "no_contact" || (!inv.responseId && inv.expiresAt <= isoNow())) fail(409, "cannot_send", "Активная ссылка недоступна.");
  const updated = { ...inv, status: inv.responseId ? "answered" : "sent", sentAt: isoNow(), sentBy: ctx.actor.id };
  return commit(ctx, [...expect(ctx, "invitation", inv), update(ctx, "invitation", updated)], result({}, 200, { invitationId: inv.id }));
}
async function terminate(ctx, id) {
  requireExit(ctx);
  const emp = await get(ctx, "employment", id);
  if (emp.status !== "active") fail(409, "employment_terminated", "Увольнение уже оформлено.");
  const effectiveAt = dateValue(ctx.body.effectiveAt, "effectiveAt", true);
  if (moscowDay(effectiveAt) < moscowDay(emp.startedAt) || moscowDay(effectiveAt) > moscowDay(isoNow())) invalid("effectiveAt", "invalid_date_range", "Укажите дату состоявшегося увольнения в периоде работы.");
  const reasonCategory = ctx.body.reasonCategory;
  if (!["employer_initiated", "voluntary", "agreement", "other"].includes(reasonCategory)) invalid("reasonCategory", "invalid_category", "Выберите основание увольнения.");
  const app = await get(ctx, "application", emp.applicationId);
  const person = await get(ctx, "candidate", emp.candidateId);
  const termination = make({ employmentId: emp.id, effectiveAt, reasonCategory, actorId: ctx.actor.id, invitationId: null }, emp.id);
  const statements = [...expect(ctx, "employment", emp)];
  let survey = null;
  if (reasonCategory === "employer_initiated") {
    survey = await invitation(ctx, "exit_feedback", app, termination.id, person.contact || app.contact, person.fullName);
    termination.invitationId = survey.id;
    statements.push(put(ctx, "invitation", survey));
  }
  const e = event(ctx, "employment.terminated", { employmentId: emp.id, terminationId: termination.id, effectiveAt, reasonCategory });
  statements.push(put(ctx, "termination", termination), update(ctx, "employment", { ...emp, status: "terminated", terminationId: termination.id }), e.stmt);
  return commit(ctx, statements, result({ terminationId: termination.id, employmentStatus: "terminated", surveyInvitationId: survey?.id || null, linkStatus: survey?.status || null }, 201, { process: e.id }));
}
async function publicSurvey(ctx, supplied) {
  if (!/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(supplied)) gone();
  const inv = await get(ctx, "invitation", supplied.split(".")[0], false);
  if (!inv || !invitationLive(inv) || inv.tokenHash !== await sha(supplied.split(".")[1])) gone();
  if (ctx.req.method === "GET") return result({
    type: inv.type, title: surveyTitles[inv.type], questions: questionnaires[inv.type],
    audience: inv.type === "exit_feedback" ? "Ответы увидят сотрудники HR с доступом к анкетам после увольнения." : "Ответы увидит кадровая команда, которая проводит подбор."
  });
  const submitted = new Map();
  for (const a of collection(ctx.body.answers, "answers", 3)) {
    const question = questionnaires[inv.type].find(q => q.id === a?.questionId);
    if (!question || submitted.has(question.id)) invalid("answers", "invalid_question", "В форме есть неизвестный или повторяющийся вопрос.");
    if (question.type === "rating") {
      if (!Number.isInteger(a.value) || a.value < 1 || a.value > 5) invalid(question.id, "invalid_rating", "Выберите оценку от 1 до 5.");
      submitted.set(question.id, a.value);
    } else {
      submitted.set(question.id, field(a.value, question.id, limits.notes));
    }
  }
  const answers = questionnaires[inv.type].map(q => {
    if (!submitted.has(q.id) && q.required) invalid(q.id, "required", "Выберите оценку.");
    return { questionId: q.id, value: submitted.get(q.id) ?? "" };
  });
  const record = make({ invitationId: inv.id, type: inv.type, answeredAt: isoNow(), answers }, inv.id);
  const e = event(ctx, "survey.responded", { invitationId: inv.id, surveyType: inv.type, responseId: record.id });
  try {
    return await commit(ctx, [
      ...expect(ctx, "invitation", inv), update(ctx, "invitation", { ...inv, responseId: record.id, status: "answered" }),
      put(ctx, "survey_response", record), e.stmt
    ], result({ responseId: record.id }, 201, { process: e.id }));
  } catch (error) {
    if (error.code === "version_conflict" && !invitationLive(await get(ctx, "invitation", inv.id))) gone();
    throw error;
  }
}
async function clarificationLink(ctx, threadId) {
  const thread = await get(ctx, "thread", threadId);
  const app = await get(ctx, "application", thread.applicationId);
  if (ctx.body.contactVerified !== true || !(app.contact || (app.candidateId && (await get(ctx, "candidate", app.candidateId)).contact))) {
    invalid("contactVerified", "verification_required", "Подтвердите проверку контактного email.");
  }
  if (!thread.questions.some(q => q.status === "open")) fail(409, "no_open_questions", "На все уточнения уже ответили.");
  const id = uuid();
  const expiresAt = inDays(7);
  const entry = make({ threadId, expiresAt, tokenHash: await sha(await token(ctx, "clarify-link", id)), usedAt: null }, threadId, isoNow(), id);
  return commit(ctx, [put(ctx, "clarify_link", entry)], result({ expiresAt }, 201, { clarifyLinkId: id }));
}
async function exchangeClarification(ctx) {
  const supplied = ctx.body.token;
  if (typeof supplied !== "string" || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(supplied)) gone();
  const [id, secret] = supplied.split(".");
  const link = await get(ctx, "clarify_link", id, false);
  if (!link || link.usedAt || link.expiresAt <= isoNow() || link.tokenHash !== await sha(secret)) gone();
  const visitorId = (await visitor(ctx)) || uuid();
  const grantId = await sha(`${visitorId}:${link.threadId}`);
  const existing = await get(ctx, "clarify_grant", grantId, false);
  const grant = make({ expiresAt: inDays(7) }, link.threadId, isoNow(), grantId);
  const writeGrant = existing ? update(ctx, "clarify_grant", { ...existing, expiresAt: grant.expiresAt }) : put(ctx, "clarify_grant", grant);
  return commit(ctx, [...expect(ctx, "clarify_link", link), update(ctx, "clarify_link", { ...link, usedAt: isoNow() }), writeGrant], result({ threadId: link.threadId }, 201, { session: ["visitor", visitorId] }));
}
async function canUseThread(ctx, thread) {
  const visitorId = await visitor(ctx);
  if (!visitorId) denied();
  const grant = await get(ctx, "clarify_grant", await sha(`${visitorId}:${thread.id}`), false);
  if (grant && grant.expiresAt > isoNow()) return;
  denied();
}
async function publicClarification(ctx, id) {
  const thread = await get(ctx, "thread", id);
  await canUseThread(ctx, thread);
  if (ctx.req.method === "GET") return result({ threadId: id, questions: thread.questions.map(({ questionId, text, status, answer }) => ({ questionId, text, status, answer })) });
  const sourceAnswers = new Map();
  for (const a of collection(ctx.body.answers, "answers", 8)) {
    const question = thread.questions.find(q => q.questionId === a?.questionId);
    if (!question || sourceAnswers.has(question.questionId)) invalid("answers", "invalid_question", "В форме есть неизвестный или повторяющийся вопрос.");
    if (question.status !== "open") fail(409, "already_answered", "Ответ на этот вопрос уже сохранён.");
    sourceAnswers.set(question.questionId, field(a.text, `q_${question.questionId}`, limits.answer, true));
  }
  if (!sourceAnswers.size) invalid("answers", "required", "Добавьте хотя бы один ответ.");
  const changed = [...expect(ctx, "thread", thread)];
  const pending = [];
  const questions = thread.questions.map(q => {
    if (!sourceAnswers.has(q.questionId)) return q;
    const answer = sourceAnswers.get(q.questionId);
    const source = make({ type: "clarification", text: answer, questionId: q.questionId }, thread.applicationId);
    const e = event(ctx, "clarification.answered", { applicationId: thread.applicationId, threadId: thread.id, questionId: q.questionId, criterionId: q.criterionId, answerId: source.id });
    pending.push(e.id);
    changed.push(put(ctx, "source", source), e.stmt);
    return { ...q, status: "answered", answer, answerId: source.id };
  });
  changed.push(update(ctx, "thread", { ...thread, questions }));
  return commit(ctx, changed, result({ accepted: true }, 202, { process: pending }));
}
const moscowDay = value => new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 10);
const periodStart = value => new Date(`${value}T00:00:00+03:00`).toISOString();
const periodEnd = value => new Date(`${value}T23:59:59.999+03:00`).toISOString();
function periodFilter(ctx, fromField = "from", toField = "to") {
  const vacancyId = ctx.url.searchParams.get("vacancyId") || "";
  const from = ctx.url.searchParams.get(fromField) || "";
  const to = ctx.url.searchParams.get(toField) || "";
  if (vacancyId && !safePath(vacancyId)) invalid("vacancyId", "invalid_id", "Выберите вакансию.");
  if ((from && (!day(from) || from.length !== 10)) || (to && (!day(to) || to.length !== 10)) || (from && to && from > to)) invalid("period", "invalid_period", "Укажите корректный период.");
  return { vacancyId, from, to };
}
async function analytics(ctx) {
  const { vacancyId, from, to } = periodFilter(ctx);
  const conditions = ["kind='application'"];
  const args = [];
  if (vacancyId) { conditions.push("scope=?"); args.push(vacancyId); }
  if (from) { conditions.push("sort >= ?"); args.push(periodStart(from)); }
  if (to) { conditions.push("sort <= ?"); args.push(periodEnd(to)); }
  const counts = await all(ctx, `SELECT json_extract(data,'$.stage.currentStage') stage,
    json_extract(data,'$.stage.outcome') outcome, COUNT(*) total
    FROM records WHERE ${conditions.join(" AND ")} GROUP BY stage,outcome`, ...args);
  const reached = await all(ctx, `WITH cohort AS (SELECT id FROM records WHERE ${conditions.join(" AND ")})
    SELECT json_extract(e.data,'$.toStage') stage, COUNT(DISTINCT e.scope) total
    FROM cohort c JOIN records e ON e.kind='stage_event' AND e.scope=c.id
    GROUP BY stage`, ...args);
  const funnel = stageOrder.map(stage => counts.reduce((acc, row) => {
    if (row.stage === stage && !row.outcome) acc.current += row.total;
    if (row.stage === stage && row.outcome === "rejected") acc.rejected += row.total;
    return acc;
  }, { stage, reached: reached.find(row => row.stage === stage)?.total || 0, current: 0, rejected: 0 }));
  const totals = counts.reduce((acc, row) => {
    acc.received += row.total;
    if (row.outcome === "hired") acc.hired += row.total;
    if (row.outcome === "rejected") acc.rejected += row.total;
    return acc;
  }, { received: 0, interview: funnel[2].reached, hired: 0, rejected: 0 });
  const allowed = ctx.actor.role === "admin" ? Object.keys(questionnaires) : ["interview_feedback"];
  const surveyPeriod = ctx.url.searchParams.has("surveyFrom") || ctx.url.searchParams.has("surveyTo") || ctx.url.searchParams.has("separateSurveys")
    ? periodFilter(ctx, "surveyFrom", "surveyTo") : { from, to };
  const dates = [];
  const dateArgs = [];
  if (vacancyId) { dates.push("json_extract(i.data,'$.vacancyId')=?"); dateArgs.push(vacancyId); }
  if (surveyPeriod.from) { dates.push("json_extract(i.data,'$.sentAt')>=?"); dateArgs.push(periodStart(surveyPeriod.from)); }
  if (surveyPeriod.to) { dates.push("json_extract(i.data,'$.sentAt')<=?"); dateArgs.push(periodEnd(surveyPeriod.to)); }
  const surveys = [];
  for (const type of allowed) {
    const metrics = await prep(ctx, `SELECT COUNT(*) sent, COUNT(r.id) answered,
      AVG(json_extract(r.data,'$.answers[0].value')) clarity,
      AVG(CASE WHEN i.scope='exit_feedback' THEN json_extract(r.data,'$.answers[1].value') END) communication
      FROM records i LEFT JOIN records r ON r.kind='survey_response' AND r.id=json_extract(i.data,'$.responseId')
      WHERE i.kind='invitation' AND i.scope=? AND json_extract(i.data,'$.sentAt') IS NOT NULL${dates.length ? " AND " + dates.join(" AND ") : ""}`, type, ...dateArgs).first();
    const averages = { clarity: metrics.clarity == null ? null : Number(metrics.clarity.toFixed(2)) };
    if (type === "exit_feedback") averages.communication = metrics.communication == null ? null : Number(metrics.communication.toFixed(2));
    surveys.push({ type, sent: metrics.sent, answered: metrics.answered, averages });
  }
  const finish = to || moscowDay(isoNow());
  const recentFrom = new Date(Date.parse(finish) - 6 * 86400000).toISOString().slice(0, 10);
  const start = from || recentFrom;
  const ts = await all(ctx, `SELECT date(sort,'+3 hours') day,COUNT(*) total FROM records
    WHERE ${conditions.join(" AND ")} AND sort>=? GROUP BY day ORDER BY day LIMIT 31`, ...args, periodStart(start));
  const series = [];
  for (let date = new Date(start), n = 0; day(date.toISOString()) <= finish && n < 31; date.setUTCDate(date.getUTCDate() + 1), n++) {
    const key = day(date.toISOString());
    series.push({ date: key, value: ts.find(x => x.day === key)?.total || 0 });
  }
  let departures;
  if (ctx.actor.role === "admin") {
    const scope = ["t.kind='termination'"];
    const values = [];
    if (vacancyId) { scope.push("a.scope=?"); values.push(vacancyId); }
    if (from) { scope.push("json_extract(t.data,'$.effectiveAt')>=?"); values.push(periodStart(from)); }
    if (to) { scope.push("json_extract(t.data,'$.effectiveAt')<=?"); values.push(periodEnd(to)); }
    departures = await all(ctx, `SELECT json_extract(v.data,'$.department') department,
      strftime('%Y-%m',json_extract(t.data,'$.effectiveAt'),'+3 hours') month,
      json_extract(t.data,'$.reasonCategory') category, COUNT(*) total
      FROM records t
      JOIN records e ON e.kind='employment' AND e.id=t.scope
      JOIN records a ON a.kind='application' AND a.id=json_extract(e.data,'$.applicationId')
      JOIN records v ON v.kind='version' AND v.id=json_extract(a.data,'$.versionId')
      WHERE ${scope.join(" AND ")} GROUP BY month,department,category
      ORDER BY month DESC,total DESC,department,category`, ...values);
  }
  return result({ totals, funnel, surveys, series, ...(departures ? { departures } : {}) });
}
