const gigaDrafts = new Map();
const gigaTokens = new WeakMap();

function gigaError(code) {
  return Object.assign(new Error(code), { code });
}

function gigaHttpError(stage, status) {
  const codes = { 402: "gigachat_payment_required", 429: "gigachat_rate_limited" };
  const code = codes[status] ??
    (stage === "oauth" && status >= 400 && status < 500 ? "gigachat_auth" :
      { 400: "gigachat_request_rejected", 401: "gigachat_auth",
        403: "gigachat_access_denied", 404: "gigachat_model_unavailable",
        422: "gigachat_request_rejected" }[status] ?? "gigachat_unavailable");
  return Object.assign(gigaError(code), { stage, status });
}

async function gigaCompletion(env, facts, { instruction, maxTokens, timeout, responseFormat }) {
  const send = env.GIGACHAT_FETCH || fetch;
  const key = env.GIGACHAT_AUTH_KEY.trim();
  const scope = env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";
  let token = gigaTokens.get(env);
  if (!token || token.key !== key || token.scope !== scope || token.expiresAt < Date.now() + 30000) {
    token = { key, scope, expiresAt: Infinity };
    token.request = (async () => {
      const auth = await send("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
        headers: { Authorization: "Basic " + key, RqUID: crypto.randomUUID(), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ scope })
      });
      if (!auth.ok) throw gigaHttpError("oauth", auth.status);
      const data = await auth.json();
      if (!data.access_token || !Number.isFinite(data.expires_at)) throw gigaError("gigachat_auth");
      token.expiresAt = data.expires_at;
      return data.access_token;
    })().catch(error => {
      if (gigaTokens.get(env) === token) gigaTokens.delete(env);
      throw error;
    });
    gigaTokens.set(env, token);
  }
  const accessToken = await token.request;
  const response = await send("https://api.giga.chat/v1/chat/completions", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(timeout),
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.GIGACHAT_MODEL || "GigaChat",
      max_tokens: maxTokens, temperature: 0.2, stream: false,
      response_format: responseFormat,
      messages: [{ role: "system", content: instruction },
        { role: "user", content: JSON.stringify(facts) }]
    })
  });
  if (responseFormat && [400, 422].includes(response.status)) throw gigaError("gigachat_request_rejected");
  if (response.status === 401 && gigaTokens.get(env) === token) gigaTokens.delete(env);
  if (!response.ok) throw gigaHttpError("completions", response.status);
  return (await response.json()).choices?.[0]?.message?.content ?? null;
}

async function cachedGigaCompletion(env, facts) {
  const cacheKey = JSON.stringify([env.GIGACHAT_MODEL || "GigaChat", facts]);
  const existing = gigaDrafts.get(cacheKey);
  if (existing && existing.expiresAt > Date.now()) return existing.result;
  if (gigaDrafts.size >= 128) gigaDrafts.delete(gigaDrafts.keys().next().value);
  const result = gigaCompletion(env, facts, {
    maxTokens: 160, timeout: 6500,
    instruction: 'Дай по одному короткому рабочему вопросу на русском на criterionKey. Без личных вопросов и решений о найме. Только JSON {"questions":[{"criterionKey":"c1","question":"Текст?"}]}.'
  }).catch(() => null);
  gigaDrafts.set(cacheKey, { expiresAt: Date.now() + 600000, result });
  return result;
}
