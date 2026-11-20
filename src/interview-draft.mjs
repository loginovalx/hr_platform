const yandexCompletionUrl = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const interviewSourceTypes = new Set(["resume", "test", "clarification"]);

async function generateInterviewQuestions(env, facts) {
  const key = env.YANDEX_API_KEY?.trim();
  const folder = env.YANDEX_FOLDER_ID?.trim();
  const model = env.YANDEX_MODEL?.trim() || "yandexgpt-lite";
  if (!key || !folder || !/^[a-z0-9-]+$/i.test(folder) || !/^[a-z0-9._-]+(?:\/[a-z0-9._-]+)?$/i.test(model) || !facts.length) return new Map();
  try {
    const response = await (env.YANDEX_FETCH || fetch)(yandexCompletionUrl, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(7000),
      headers: { "Content-Type": "application/json", Authorization: "Api-Key " + key },
      body: JSON.stringify({
        modelUri: `gpt://${folder}/${model}`,
        completionOptions: { stream: false, temperature: 0.2, maxTokens: "700" },
        jsonObject: true,
        messages: [{
          role: "system",
          text: 'Подготовь по одному короткому практическому вопросу на русском для интервью по каждому известному типу профессионального требования. Если проверка неполная, попроси конкретный пример. Не оценивай человека, не выдумывай факты, не спрашивай о личной жизни. Верни только JSON: {"questions":[{"criterionKey":"c1","question":"Текст вопроса?"}]}. Используй только переданные criterionKey.'
        }, { role: "user", text: JSON.stringify(facts) }]
      })
    });
    if (!response.ok) return new Map();
    const body = await response.json();
    const text = body.result?.alternatives?.[0]?.message?.text;
    if (typeof text !== "string" || text.length > 8000) return new Map();
    const { questions } = JSON.parse(text);
    if (!Array.isArray(questions)) return new Map();
    const known = new Set(facts.map(({ criterionKey }) => criterionKey));
    const drafts = new Map();
    for (const row of questions.slice(0, 8)) {
      if (!known.has(row?.criterionKey) || typeof row.question !== "string" || drafts.has(row.criterionKey)) continue;
      const question = row.question.trim();
      if (question && question.length <= 300 && question.endsWith("?") && !/[\r\n]/u.test(question)) drafts.set(row.criterionKey, question);
    }
    return drafts;
  } catch {
    return new Map();
  }
}

async function interviewDraft(ctx, app) {
  const assessment = await assessView(ctx, app);
  if (assessment.assessmentStatus === "pending") fail(409, "assessment_pending", "Дождитесь окончания первичной проверки.");
  const version = await get(ctx, "version", app.versionId);
  const byId = new Map(assessment.items.map(item => [item.criterionId, item]));
  const entries = version.criteria.map((criterion, index) => {
    const item = byId.get(criterion.id);
    return {
      criterion,
      fact: {
        criterionKey: "c" + (index + 1),
        requirementCode: criterion.code,
        status: item?.hrOverride?.status || item?.status || "needs_clarification",
        required: criterion.required,
        evidenceTypes: [...new Set((item?.evidence || []).map(entry => entry.type).filter(type => interviewSourceTypes.has(type)))]
      }
    };
  });
  const facts = entries.map(({ fact }) => fact).filter(({ requirementCode }) => Object.hasOwn(skillCodes, requirementCode));
  const generated = await generateInterviewQuestions(ctx.env, facts);
  const questions = entries.map(({ criterion, fact }) => ({
    criterionId: criterion.id,
    label: criterion.label,
    question: generated.get(fact.criterionKey) || criterion.question || "Расскажите о рабочей задаче, где вы применяли этот навык, и как проверили результат?"
  }));
  return commit(ctx, [], result({ source: generated.size ? "yandexgpt" : "local", questions }));
}
