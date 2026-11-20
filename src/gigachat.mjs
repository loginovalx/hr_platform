const gigaDrafts = new Map();
let gigaToken;

async function gigaCompletion(env, facts) {
  const send = env.GIGACHAT_FETCH || fetch;
  const key = env.GIGACHAT_AUTH_KEY.trim();
  const scope = env.GIGACHAT_SCOPE || "GIGACHAT_API_B2B";
  if (!gigaToken || gigaToken.key !== key || gigaToken.scope !== scope || gigaToken.expiresAt < Date.now() + 30000) {
    const auth = await send("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { Authorization: "Basic " + key, RqUID: crypto.randomUUID(), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ scope })
    });
    if (!auth.ok) return null;
    const data = await auth.json();
    if (!data.access_token || !Number.isFinite(data.expires_at)) return null;
    gigaToken = { key, scope, value: data.access_token, expiresAt: data.expires_at };
  }
  const response = await send("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(6500),
    headers: { Authorization: "Bearer " + gigaToken.value, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.GIGACHAT_MODEL || "GigaChat",
      max_tokens: 160, temperature: 0.2, stream: false,
      messages: [{ role: "system", content: 'Дай по одному короткому рабочему вопросу на русском на criterionKey. Без личных вопросов и решений о найме. Только JSON {"questions":[{"criterionKey":"c1","question":"Текст?"}]}.' },
        { role: "user", content: JSON.stringify(facts) }]
    })
  });
  if (response.status === 401) gigaToken = undefined;
  if (!response.ok) return null;
  return (await response.json()).choices?.[0]?.message?.content ?? null;
}

async function cachedGigaCompletion(env, facts) {
  const cacheKey = JSON.stringify([env.GIGACHAT_MODEL || "GigaChat", facts]);
  const existing = gigaDrafts.get(cacheKey);
  if (existing && existing.expiresAt > Date.now()) return existing.result;
  if (gigaDrafts.size >= 128) gigaDrafts.delete(gigaDrafts.keys().next().value);
  const result = gigaCompletion(env, facts).catch(() => null);
  gigaDrafts.set(cacheKey, { expiresAt: Date.now() + 600000, result });
  return result;
}
