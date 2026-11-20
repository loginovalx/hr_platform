const yandexCompletionUrl = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const interviewSourceTypes = new Set(["resume", "test", "clarification", "interview"]);
const maxInterviewQuestions = 6;
const maxComparedVacancies = 40;
const refinementCache = new Map();
const openingQuestions = [
  { criterionId:"opening-task", label:"Последняя рабочая задача", reason:"opening", question:"Какую задачу из вашего опыта, близкую к этой вакансии, вы выполняли лично?" },
  { criterionId:"opening-result", label:"Результат работы", reason:"opening", question:"Как вы оценили результат этой работы и чем можете его подтвердить?" }
];

function interviewProvider(env) {
  if (env.GIGACHAT_AUTH_KEY?.trim()) return "gigachat";
  const folder = env.YANDEX_FOLDER_ID?.trim();
  const model = env.YANDEX_MODEL?.trim() || "yandexgpt-lite";
  if (env.YANDEX_API_KEY?.trim() && /^[a-z0-9-]+$/i.test(folder || "") && /^[a-z0-9._-]+(?:\/[a-z0-9._-]+)?$/i.test(model)) return "yandexgpt";
  return "local";
}

async function generateInterviewQuestions(env, facts, tokenLimit = 700) {
  const key = env.YANDEX_API_KEY?.trim();
  const folder = env.YANDEX_FOLDER_ID?.trim();
  const model = env.YANDEX_MODEL?.trim() || "yandexgpt-lite";
  const giga = Boolean(env.GIGACHAT_AUTH_KEY?.trim());
  if (!facts.length || interviewProvider(env) === "local") return new Map();
  try {
    let text;
    if (giga) {
      facts = facts.slice(0, 2);
      text = await cachedGigaCompletion(env, facts);
    } else {
      const response = await (env.YANDEX_FETCH || fetch)(yandexCompletionUrl, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(7000),
      headers: { "Content-Type": "application/json", Authorization: "Api-Key " + key },
      body: JSON.stringify({
        modelUri: `gpt://${folder}/${model}`,
        completionOptions: { stream: false, temperature: 0.2, maxTokens: String(tokenLimit) },
        jsonObject: true,
        messages: [{
          role: "system",
          text: 'Подготовь по одному короткому практическому вопросу на русском для интервью по каждому известному типу профессионального требования. Если проверка неполная, попроси конкретный пример. Не оценивай человека, не выдумывай факты, не спрашивай о личной жизни. Верни только JSON: {"questions":[{"criterionKey":"c1","question":"Текст вопроса?"}]}. Используй только переданные criterionKey.'
        }, { role: "user", text: JSON.stringify(facts) }]
      })
      });
      if (!response.ok) return new Map();
      const body = await response.json();
      text = body.result?.alternatives?.[0]?.message?.text;
    }
    if (typeof text !== "string" || text.length > 8000) return new Map();
    const { questions } = JSON.parse(text);
    if (!Array.isArray(questions)) return new Map();
    const known = new Set(facts.map(({ criterionKey }) => criterionKey));
    const drafts = new Map();
    for (const row of questions.slice(0, 8)) {
      if (!known.has(row?.criterionKey) || typeof row.question !== "string" || drafts.has(row.criterionKey)) continue;
      const question = row.question.trim();
      const personalTopic = /семейн|беремен|декрет|религи|вероисповед|национальност|инвалидност|здоровь|детей|сколько вам лет/iu;
      if (question && question.length <= 300 && question.endsWith("?") && !/[\r\n]/u.test(question) && !personalTopic.test(question)) drafts.set(row.criterionKey, question);
    }
    return drafts;
  } catch {
    return new Map();
  }
}

function interviewEntries(version, items) {
  const byId = new Map(items.map(item => [item.criterionId, item]));
  return version.criteria.map((criterion, index) => {
    const item = byId.get(criterion.id);
    return {
      criterion, item,
      fact: {
        criterionKey: "c" + (index + 1),
        requirementCode: criterion.code,
        status: item?.hrOverride?.status || item?.status || "needs_clarification",
        required: criterion.required,
        evidenceTypes: [...new Set((item?.evidence || []).map(entry => entry.type).filter(type => interviewSourceTypes.has(type)))]
      }
    };
  });
}

function interviewPriority({ fact }) {
  if (fact.status === "matched") return 2;
  return fact.required ? 0 : 1;
}

function rankedInterviewEntries(entries) {
  return entries.filter(entry => entry.fact.status !== "not_met" && entry.item?.hrOverride?.status !== "matched")
    .sort((a, b) => interviewPriority(a) - interviewPriority(b))
    .slice(0, maxInterviewQuestions);
}

function planQuestions(entries, generated = new Map()) {
  const reasons = ["required_gap", "optional_gap", "verify_evidence"];
  const seen = new Set();
  const questions = [];
  for (const { criterion, item, fact } of entries) {
    const revised = generated.get(fact.criterionKey);
    const question = revised || item?.question || criterion.question;
    const key = lowered(question).replace(/[\s?!.]+/gu, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({
      criterionId:criterion.id, label:criterion.label, question, reason:reasons[interviewPriority({fact})],
      evidence:item?.evidence[0] || null, source:revised ? "model" : "local"
    });
  }
  return questions.length ? questions : openingQuestions;
}

function refinableFacts(entries) {
  return entries.filter(({ fact }) => fact.status !== "matched" && Object.hasOwn(skillCodes,fact.requirementCode))
    .slice(0,2).map(({ fact }) => fact);
}

async function cachedRefinement(env, facts) {
  const provider = interviewProvider(env);
  if (!facts.length || provider === "local") return new Map();
  const scope = provider === "gigachat"
    ? [env.GIGACHAT_AUTH_KEY,env.GIGACHAT_SCOPE,env.GIGACHAT_MODEL,env.GIGACHAT_LEGACY_API]
    : [env.YANDEX_API_KEY,env.YANDEX_FOLDER_ID,env.YANDEX_MODEL];
  const key = await sha(JSON.stringify([scope,facts]));
  const existing = refinementCache.get(key);
  if (existing?.until > Date.now()) return existing.promise;
  if (refinementCache.size >= 64) refinementCache.delete(refinementCache.keys().next().value);
  const promise = generateInterviewQuestions(env,facts,240);
  refinementCache.set(key,{promise,until:Date.now()+600000});
  const result = await promise;
  if (!result.size && refinementCache.get(key)?.promise === promise) refinementCache.delete(key);
  return result;
}

async function interviewInputs(ctx, app) {
  const assessment = await assessView(ctx, app);
  if (assessment.assessmentStatus === "pending") fail(409, "assessment_pending", "Дождитесь окончания первичной проверки.");
  const version = await get(ctx, "version", app.versionId);
  return interviewEntries(version,assessment.items);
}

async function suggestedInterviewVacancies(ctx, app) {
  const conditions = ["v.id<>?"], params = [app.scope];
  vacancyScope(ctx,"v.id",conditions,params);
  const versions = await rows(ctx,`SELECT published.* FROM records v JOIN records published
    ON published.kind='version' AND published.id=json_extract(v.data,'$.publishedVersionId')
    WHERE v.kind='vacancy' AND ${conditions.join(" AND ")} ORDER BY v.sort DESC,v.id LIMIT ?`,
    ...params,maxComparedVacancies+1);
  if (!versions.length) return { alternatives:[], comparedVacancies:0, moreVacancies:false };
  const sources = await relatedVacancySources(ctx,app);
  const options = [];
  for (const version of versions.slice(0,maxComparedVacancies)) {
    const items = version.criteria.map(criterion => scoreCriterion(criterion,sources));
    const entries = interviewEntries(version,items);
    const supported = entries.filter(({ criterion, item }) => item.evidence.length
      && (item.status === "matched" || item.educationPath || !["custom","education"].includes(criterion.code)));
    if (!supported.length) continue;
    const required = entries.filter(({ criterion }) => criterion.required).length;
    const supportedRequired = supported.filter(({ criterion }) => criterion.required).length;
    const evidence = supported.slice(0,2).map(({ item }) => ({ ...item.evidence[0], label:item.label }));
    options.push({
      vacancyId:version.vacancyId, title:version.title, department:version.department,
      required, supportedRequired, evidence, questions:planQuestions(rankedInterviewEntries(entries)).slice(0,3),
      matched:supported.filter(({ item }) => item.status === "matched").length,
      coverage:supportedRequired/Math.max(required,1)
    });
  }
  options.sort((a,b) => b.coverage-a.coverage || b.matched-a.matched
    || b.supportedRequired-a.supportedRequired || a.vacancyId.localeCompare(b.vacancyId));
  return {
    alternatives:options.slice(0,3).map(({matched,coverage,...option}) => option),
    comparedVacancies:Math.min(versions.length,maxComparedVacancies), moreVacancies:versions.length>maxComparedVacancies
  };
}

async function interviewPlan(ctx, app) {
  const entries = rankedInterviewEntries(await interviewInputs(ctx,app));
  const [suggestions, notes] = await Promise.all([suggestedInterviewVacancies(ctx,app),interviewAnswerSources(ctx,app.id)]);
  return result({
    questions:planQuestions(entries), ...suggestions,
    notes:notes.map(({id,criterionId,question,text,nextStep,actorName,recordedAt})=>({sourceId:id,criterionId,question,text,nextStep,actorName,recordedAt})),
    canRefine:interviewProvider(ctx.env)!=="local" && refinableFacts(entries).length>0
  });
}

async function interviewDraft(ctx, app) {
  const entries = await interviewInputs(ctx,app);
  if (ctx.body.priorityOnly === true) {
    const ranked = rankedInterviewEntries(entries);
    const generated = await cachedRefinement(ctx.env,refinableFacts(ranked));
    return commit(ctx,[],result({source:generated.size ? interviewProvider(ctx.env) : "local", questions:planQuestions(ranked,generated)}));
  }
  const facts = entries.map(({ fact }) => fact).filter(({ requirementCode }) => Object.hasOwn(skillCodes, requirementCode));
  const generated = await generateInterviewQuestions(ctx.env, facts);
  const questions = entries.map(({ criterion, fact }) => ({
    criterionId: criterion.id,
    label: criterion.label,
    question: generated.get(fact.criterionKey) || criterion.question || "Расскажите о рабочей задаче, где вы применяли этот навык, и как проверили результат?"
  }));
  const source = generated.size ? (ctx.env.GIGACHAT_AUTH_KEY?.trim() ? "gigachat" : "yandexgpt") : "local";
  return commit(ctx, [], result({ source, questions }));
}
