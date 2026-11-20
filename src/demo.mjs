const demoVacancies = [
  {
    title: "Аналитик данных", slug: "data-analyst", department: "Департамент цифрового развития",
    description: "Команда цифрового развития ищет аналитика для работы с данными городских сервисов. Вы будете собирать метрики, исследовать пользовательские сценарии и помогать команде принимать решения на основе данных.\n\nЧто предстоит делать\n• Писать запросы на SQL и проверять качество данных.\n• Собирать отчёты и визуализации для проектных команд.\n• Обсуждать выводы с заказчиками и специалистами смежных подразделений.\n\nБудет преимуществом опыт с Python и участие в проектах цифровизации.",
    criteria: [
      { id: "req_sql", label: "Практический опыт работы с SQL", code: "sql", question: "Приведите пример SQL-запроса, который вы написали для рабочего или учебного проекта." },
      { id: "req_python", label: "Опыт работы с Python", code: "python", question: "Расскажите об одном проекте на Python и что в нём сделали лично." },
      { id: "req_analytics", label: "Анализ данных и работа с метриками", code: "analytics", question: "Какие метрики вы рассчитывали и как использовали результаты?" }
    ],
    testQuestions: [
      { id: "test_project", text: "Опишите проект с данными. Что вы сделали лично и какой результат получили?", required: true },
      { id: "test_quality", text: "Как вы проверяете корректность данных перед подготовкой отчёта?", required: false }
    ]
  },
  {
    title: "Координатор городских проектов", slug: "project-coordinator", department: "Управление проектной деятельности",
    description: "Помогайте проектным командам доводить городские инициативы до результата. В задачи входят планирование сроков, подготовка статусов и координация работы подразделений.\n\nМы ждём опыт командной работы и умение понятно формулировать задачи.",
    criteria: [{ id: "req_project", label: "Координация проектов", code: "project" }, { id: "req_comm", label: "Коммуникация с участниками проекта", code: "communication" }]
  },
  {
    title: "Специалист по документообороту", slug: "records-specialist", department: "Департамент организационной работы",
    description: "Организуйте регистрацию и движение документов в муниципальных подразделениях. В работе пригодятся внимательность, уверенная работа с офисными программами и умение соблюдать сроки.",
    criteria: [{ id: "req_office", label: "Опыт ведения документооборота", code: "office" }]
  }
];
const demoPeople = [
  ["Мария Соколова", 0, "received", null, "public_form"], ["Артём Кузнецов", 1, "review", null, "email"],
  ["Елена Морозова", 0, "interview", null, "public_form"], ["Иван Волков", 2, "decision", "hired", "public_form"],
  ["Анна Петрова", 0, "interview", "rejected", "public_form"], ["Олег Смирнов", 2, "received", null, "archive"],
  ["Мария Соколова", 1, "review", null, "email"], ["София Климова", 0, "decision", "hired", "public_form"],
  ["Дмитрий Павлов", 0, "review", "rejected", "email"], ["Ксения Белова", 1, "decision", null, "public_form"],
  ["Роман Тихонов", 0, "interview", null, "public_form"], ["Наталья Орлова", 1, "decision", "hired", "public_form"],
  ["Михаил Борисов", 2, "received", null, "public_form"], ["Алина Новикова", 2, "received", "rejected", "email"],
  ["Павел Романов", 0, "received", null, "public_form"], ["Андрей Егоров", 1, "review", "rejected", "archive"],
  ["Екатерина Фомина", 0, "decision", "hired", "public_form"], ["Ольга Алексеева", 0, "received", null, "public_form"],
  ["Виктор Лебедев", 2, "received", null, "archive"], ["Дарья Рябова", 1, "review", null, "public_form"]
];
const demoAge = [0,0,0,1,1,2,2,2,2,3,4,4,4,5,5,5,5,6,9,14];
async function ensureData(ctx) {
  if (await get(ctx, "system", "secret", false)) return;
  const entries = [];
  const add = (kind, value) => { entries.push([kind, value]); return value; };
  const secret = randomSecret();
  add("system", make({ value: secret }, "", isoNow(), "secret"));
  if (ctx.env.SEED_DEMO !== false && ctx.env.SEED_DEMO !== "0") {
    const vList = demoVacancies.map((item, i) => {
      const draft = validateVacancy(item);
      const v = make({ draft, slug: draft.slug, publishedVersionId: null, createdAt: inDays(-10 - i) }, "", inDays(-i - 2), "vacancy_" + (i + 1));
      const version = newVersion(v);
      v.publishedVersionId = version.id;
      add("vacancy", v);
      add("slug", make({ vacancyId: v.id }, "", v.sort, v.slug));
      add("version", version);
      return { v, version };
    });
    let firstCandidate;
    for (const [i, [fullName, vIndex, currentStage, outcome, sourceChannel]] of demoPeople.entries()) {
      const { v, version } = vList[vIndex];
      const at = new Date(Date.now() - (demoAge[i] * 86400 + i * 180) * 1000).toISOString();
      const traceTimestamp = (step) => new Date(Date.parse(at) + step * 7000).toISOString();
      const email = ["m.sokolova", "a.kuznetsov", "elena.m", "i.volkov", "a.petrova", "o.smirnov", "maria.sokolova"][i] || `candidate${i + 1}`;
      const id = "app_demo_" + (i + 1);
      const contact = email + "@example.com";
      const person = add("candidate", make({
        fullName, searchName: lowered(fullName), contact,
        education: i === 0 ? "НИУ ВШЭ, прикладная математика и информатика" : i === 6 ? "ННГУ, государственное и муниципальное управление" : "",
        experience: vIndex === 0 ? "Анализ данных и подготовка отчётности" : vIndex === 1 ? "Проектная работа" : "Работа с документами",
        factsSource: { type: "resume", applicationId: id, at }
      }, "", at, "candidate_demo_" + (i + 1)));
      if (i === 0) firstCandidate = person;
      const resume = vIndex === 0
        ? "Опыт\nДелал SQL-запросы для отчётности городского сервиса.\nСобирал метрики и воронку по пользовательским сценариям.\n" + (i % 2 ? "Автоматизировал выгрузки на Python." : "Работал с данными в команде из трёх человек.")
        : vIndex === 1 ? "Координация городского проекта и подготовка статусов.\nПереговоры с участниками и подготовка дорожной карты." : "Ведение документооборота подразделения.\nПодготовка таблиц в Excel.";
      const source = add("source", make({ type: "resume", text: resume, extractStatus: "not_needed", attachment: null }, id, at));
      const s = { ...stageState(), currentStage, outcome, rejectedAtStage: outcome === "rejected" ? currentStage : null, version: stageOrder.indexOf(currentStage) + (outcome ? 1 : 0) };
      const answers = version.testQuestions.map((q, j) => ({ questionId: q.id, question: q.text, required: q.required, value: sourceChannel === "public_form" ? (j ? "Проверяю пропуски, дубликаты и сверяю агрегаты." : "Собрал отчёт по активности пользователей. Подготовил витрину и проверил метрики на SQL.") : "" }));
      const app = make({
        vacancyTitle: version.title, versionId: version.id, criteriaVersionId: version.criteriaVersionId, testVersionId: version.testVersionId,
        testStatus: answers.length ? (sourceChannel === "public_form" ? "completed" : "not_completed") : "not_required", answers,
        fullName: i === 14 ? firstCandidate.fullName : fullName, searchName: lowered(i === 14 ? firstCandidate.fullName : fullName), contact: i === 14 ? firstCandidate.contact : contact,
        sourceId: source.id, sourceChannel, sourceReceivedAt: sourceChannel === "archive" && i === 18 ? null : at,
        receivedAt: at, acceptedAt: at, importedAt: sourceChannel === "public_form" ? null : traceTimestamp(1),
        candidateId: i === 14 ? firstCandidate.id : outcome || [2, 6, 9, 11].includes(i) ? person.id : null,
        assessmentStatus: "ready", clarificationThreadId: null, stage: s
      }, v.id, at, id);
      const items = version.criteria.map(c => scoreCriterion(c, [source]));
      const open = items.filter(x => x.question);
      if (open.length) {
        const thread = add("thread", make({ applicationId: id, assessmentId: id, questions: open.map(x => ({ questionId: uuid(), criterionId: x.criterionId, text: x.question, status: "open" })) }, id, at));
        app.clarificationThreadId = thread.id;
      }
      add("application", app);
      add("assessment", make({ assessmentStatus: "ready", criteriaVersionId: app.criteriaVersionId, items, assessedAt: traceTimestamp(1) }, id, at, id));
      const states = stageOrder.slice(0, stageOrder.indexOf(currentStage) + 1);
      states.forEach((stage, j) => add("stage_event", make({
        fromStage: states[j - 1] || null, toStage: stage, outcome: null, action: ["receive", "start_review", "invite_interview", "move_to_decision"][j],
        occurredAt: traceTimestamp(j), actorName: j ? "Кадровая команда" : "Приём отклика", actorId: "demo"
      }, id, traceTimestamp(j))));
      if (states.includes("interview")) {
        const completedAt = currentStage === "decision" || outcome === "rejected" ? traceTimestamp(3) : null;
        const interview = add("interview", make({ applicationId: id, completedAt, invitationId: null }, id, traceTimestamp(2)));
        s.interviewId = interview.id;
        if (completedAt) s.interviewCompletedAt = completedAt;
        if ([4, 7, 9].includes(i)) {
          const invId = uuid();
          const answered = i === 4 || i === 7;
          const response = answered && add("survey_response", make({ type: "interview_feedback", invitationId: invId, answeredAt: traceTimestamp(6), answers: [{questionId:"clarity",value:i === 4 ? 4 : 5},{questionId:"comment",value:i === 4 ? "Полезно заранее уточнять формат технической части." : "Всё понятно, спасибо."}] }, invId, traceTimestamp(6)));
          const inv = add("invitation", make({ type:"interview_feedback", applicationId:id, vacancyId:v.id, vacancyTitle:app.vacancyTitle, fullName, contact, status:answered ? "answered" : "sent", expiresAt:inDays(10), sentAt:traceTimestamp(4), sourceId:interview.id, responseId:response?.id || null, tokenHash:await sha(await signature(secret,"survey",invId)) }, "interview_feedback", traceTimestamp(4), invId));
          interview.invitationId = inv.id;
        }
      }
      if (outcome) add("stage_event", make({ fromStage: currentStage, toStage: currentStage, outcome, action: outcome === "hired" ? "hire" : "reject", occurredAt: traceTimestamp(5), actorName: "Кадровая команда", actorId: "demo", reason: outcome === "rejected" ? "По итогам рассмотрения" : "" }, id, traceTimestamp(5)));
      if (outcome === "hired") {
        const employed = add("employment", make({ applicationId: id, candidateId: app.candidateId, vacancyId: v.id, startedAt: traceTimestamp(5), status: i === 3 ? "terminated" : "active", terminationId: null }, id, traceTimestamp(5)));
        s.employmentId = employed.id;
        if (i === 3) {
          const invId = uuid();
          const termination = add("termination", make({ employmentId: employed.id, effectiveAt: traceTimestamp(6), reasonCategory: "employer_initiated", actorId: "demo", invitationId: invId }, employed.id, traceTimestamp(6)));
          employed.terminationId = termination.id;
          const response = add("survey_response", make({ type: "exit_feedback", invitationId: invId, answeredAt: traceTimestamp(9), answers: [{questionId:"clarity",value:4},{questionId:"communication",value:5},{questionId:"comment",value:"Хотелось бы заранее получить список документов."}] }, invId, traceTimestamp(9)));
          add("invitation", make({ type:"exit_feedback", applicationId:id, vacancyId:v.id, vacancyTitle:app.vacancyTitle, fullName, contact, status:"answered", expiresAt:inDays(10), sentAt:traceTimestamp(8), sourceId:termination.id, responseId:response.id, tokenHash:await sha(await signature(secret,"survey",invId)) }, "exit_feedback", traceTimestamp(8), invId));
        }
      }
    }
  }
  const statements = [];
  for (let i = 0; i < entries.length; i += 12) {
    const slice = entries.slice(i, i + 12);
    statements.push(prep(ctx, `INSERT INTO records(kind,id,scope,sort,data) VALUES ${slice.map(() => "(?,?,?,?,?)").join(",")}`,
      ...slice.flatMap(([kind, value]) => [kind, value.id, value.scope, value.sort, packed(value)])));
  }
  try { await ctx.env.DB.batch(statements); }
  catch (error) { if (!await get(ctx, "system", "secret", false)) throw error; }
}
