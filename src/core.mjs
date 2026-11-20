const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const MAX_FILE = 5 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 256 * 1024;
const limits = { name: 160, contact: 254, title: 150, department: 140, description: 12000, resume: 20000, answer: 2000, notes: 1200 };
const uuid = () => crypto.randomUUID();
const isoNow = () => new Date().toISOString();
const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();
const hex = (bytes) => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, "0")).join("");
const sha = async (value) => hex(await crypto.subtle.digest("SHA-256", typeof value === "string" ? textEncoder.encode(value) : value));
const randomSecret = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const lowered = value => value.toLowerCase().replaceAll("ё", "е");
const fullDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}.*)?$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value.slice(0, 10)).toISOString().slice(0, 10) === value.slice(0, 10);
const day = (value) => fullDate(value) ? value.slice(0, 10) : null;
const safePath = (value) => typeof value === "string" && /^[\w-]{1,140}$/.test(value);
const pageSize = 24;

class HttpError extends Error {
  constructor(status, code, message, fields = []) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
const fail = (status, code, message, fields) => { throw new HttpError(status, code, message, fields); };
const invalid = (field, code, message) => fail(422, "validation_failed", message, [{ field, code }]);
const missing = () => fail(404, "not_found", "Запись не найдена.");
const conflict = () => fail(409, "version_conflict", "Запись уже обновилась. Откройте её снова.");
const denied = () => fail(403, "forbidden", "У вас нет доступа к этой записи.");
const gone = () => fail(410, "link_unavailable", "Срок действия ссылки истёк или она уже использована.");
const collection = (value, field, max) => {
  if (!Array.isArray(value) || value.length > max) invalid(field, "invalid_list", `Допустимо не более ${max} элементов.`);
  return value;
};
function field(value, key, max, required = false) {
  if (value == null) value = "";
  if (typeof value !== "string") invalid(key, "invalid_type", "Введите текст.");
  if (value.length > max) invalid(key, "too_long", `Допустимо до ${max} символов.`);
  value = value.trim();
  if (required && !value) invalid(key, "required", "Заполните обязательное поле.");
  return value;
}
function contact(value, required) {
  const email = field(value, "contact", limits.contact, required);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) invalid("contact", "invalid_email", "Укажите корректный email.");
  return email;
}
function dateValue(value, key, required = false) {
  if (!value && !required) return null;
  if (!fullDate(value)) invalid(key, "invalid_date", "Укажите действительную дату.");
  return new Date(value).toISOString();
}
function decodeRow(row) {
  return row ? { ...JSON.parse(row.data), id: row.id, rev: row.rev, scope: row.scope, sort: row.sort } : null;
}
function packed(value) {
  const { id, rev, scope, sort, ...data } = value;
  return JSON.stringify(data);
}
const prep = (ctx, sql, ...args) => ctx.env.DB.prepare(sql).bind(...args);
const get = async (ctx, kind, id, must = true) => {
  const row = decodeRow(await prep(ctx, "SELECT * FROM records WHERE kind = ? AND id = ?", kind, id).first());
  if (!row && must) missing();
  return row;
};
const all = async (ctx, sql, ...args) => (await prep(ctx, sql, ...args).all()).results;
const rows = async (ctx, sql, ...args) => (await all(ctx, sql, ...args)).map(decodeRow);
const make = (data, scope = "", sort = isoNow(), id = uuid()) => ({ ...data, id, scope, sort });
const put = (ctx, kind, value) => prep(ctx, "INSERT INTO records(kind,id,scope,sort,data) VALUES(?,?,?,?,?)", kind, value.id, value.scope, value.sort, packed(value));
const update = (ctx, kind, value) => prep(ctx, "UPDATE records SET scope=?,sort=?,data=?,rev=rev+1 WHERE kind=? AND id=? AND rev=?", value.scope, value.sort, packed(value), kind, value.id, value.rev);
const remove = (ctx, kind, id) => prep(ctx, "DELETE FROM records WHERE kind=? AND id=?", kind, id);
function expect(ctx, kind, value) {
  const id = uuid();
  return [
    prep(ctx, "INSERT INTO transaction_guard(id,ok) VALUES (?,EXISTS(SELECT 1 FROM records WHERE kind=? AND id=? AND rev=?))", id, kind, value.id, value.rev),
    prep(ctx, "DELETE FROM transaction_guard WHERE id=?", id)
  ];
}
function pageOptions(url) {
  const requested = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor");
  let after = null;
  if (cursor) {
    const [sort, id, ...extra] = cursor.split("~");
    if (!sort || !fullDate(sort) || !safePath(id) || extra.length) invalid("cursor", "invalid_cursor", "Некорректная позиция списка.");
    after = { sort, id };
  }
  return { limit: requested && /^\d{1,3}$/.test(requested) ? Math.max(1, Math.min(50, Number(requested))) : pageSize, after };
}
async function page(ctx, kind, conditions = [], params = [], opts = pageOptions(ctx.url)) {
  const where = ["kind = ?", ...conditions];
  const args = [kind, ...params];
  if (opts.after) {
    where.push(`(sort ${opts.ascending ? ">" : "<"} ? OR (sort = ? AND id > ?))`);
    args.push(opts.after.sort, opts.after.sort, opts.after.id);
  }
  const found = await rows(ctx, `SELECT * FROM records WHERE ${where.join(" AND ")} ORDER BY sort ${opts.ascending ? "ASC" : "DESC"}, id LIMIT ?`, ...args, opts.limit + 1);
  const list = found.slice(0, opts.limit);
  const last = list.at(-1);
  return { items: list, nextCursor: found.length > list.length ? `${last.sort}~${last.id}` : null };
}
const result = (body, status = 200, extra = {}) => ({ status, body, ...extra });
const event = (ctx, type, payload) => {
  const occurredAt = isoNow();
  const e = make({ type, schemaVersion: 1, occurredAt, payload }, type, occurredAt);
  return { id: e.id, stmt: put(ctx, "event", e) };
};
const cookies = (request) => Object.fromEntries((request.headers.get("cookie") || "").split(";").map(part => part.trim().split("=")).filter(pair => pair.length === 2));
const cookieString = (ctx, key, value, age) => `${key}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${age}${ctx.url.protocol === "https:" ? "; Secure" : ""}`;
async function signature(secret, kind, id) {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, textEncoder.encode(`${kind}:${id}`)));
}
const token = async (ctx, kind, id) => signature((await get(ctx, "system", "secret")).value, kind, id);
async function auth(ctx) {
  if (ctx.env.TRUST_PLATFORM === true || ctx.env.TRUST_PLATFORM === "1") {
    const owner = ctx.req.headers.get("oai-authenticated-user-id");
    if (owner && (!ctx.env.OWNER_ID || owner === ctx.env.OWNER_ID)) {
      return { id: owner, role: "admin", name: "Кабинет HR", hosted: true };
    }
  }
  const val = ctx.cookies.kadry_hr;
  if (!val || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(val)) return null;
  const [id, supplied] = val.split(".");
  const session = await get(ctx, "staff_session", id, false);
  if (!session || session.expiresAt < isoNow() || supplied !== await token(ctx, "hr", id)) return null;
  return { id: session.actorId, role: session.role, name: session.name, sessionId: id };
}
async function visitor(ctx) {
  const value = ctx.cookies.kadry_guest;
  if (!value || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(value)) return null;
  const [id, code] = value.split(".");
  return code === await token(ctx, "visitor", id) ? id : null;
}
const requireHr = ctx => { if (!ctx.actor) fail(401, "unauthorized", "Войдите в кабинет HR."); };
const requireExit = ctx => { requireHr(ctx); if (ctx.actor.role !== "admin") denied(); };
function sameOrigin(ctx) {
  const origin = ctx.req.headers.get("origin");
  if (origin && origin !== ctx.url.origin) denied();
}
async function readBody(req) {
  const contentType = req.headers.get("content-type") || "";
  const max = /^multipart\/form-data/i.test(contentType) ? MAX_BODY : 128 * 1024;
  if (Number(req.headers.get("content-length")) > max) fail(413, "payload_too_large", "Объём данных превышает допустимый.");
  if (!req.body) return { body: {}, digest: await sha("{}") };
  const reader = req.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      fail(413, "payload_too_large", "Объём данных превышает допустимый.");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  if (!size) return { body: {}, digest: await sha("{}") };
  if (/^multipart\/form-data/i.test(contentType)) {
    let form;
    try { form = await new Response(buffer, { headers: { "content-type": contentType } }).formData(); }
    catch { fail(400, "invalid_body", "Не удалось прочитать форму."); }
    const body = {};
    const parts = [];
    for (const [key, value] of form) {
      if (!/^[a-zA-Z][\w]{0,70}$/.test(key) || Object.hasOwn(body, key)) fail(400, "invalid_body", "Некорректное поле формы.");
      if (typeof value === "string") {
        body[key] = value;
        parts.push([key, value]);
      } else {
        if (key !== "resumeFile" || value.size > MAX_FILE) fail(413, "file_too_large", "Допустимый размер файла резюме — до 5 МБ.");
        body[key] = value;
        parts.push([key, value.name, await sha(await value.arrayBuffer())]);
      }
    }
    if (typeof body.answers === "string") {
      try { body.answers = JSON.parse(body.answers); }
      catch { invalid("answers", "invalid_list", "Не удалось прочитать ответы."); }
    }
    return { body, digest: await sha(JSON.stringify(parts.sort(([a], [b]) => a.localeCompare(b)))) };
  }
  if (!/^application\/json/i.test(contentType)) fail(415, "invalid_content_type", "Используйте JSON или форму с вложением.");
  let body;
  try { body = JSON.parse(textDecoder.decode(buffer)); }
  catch { fail(400, "invalid_json", "Не удалось прочитать запрос."); }
  if (!body || Array.isArray(body) || typeof body !== "object") fail(400, "invalid_json", "Ожидается JSON-объект.");
  return { body, digest: await sha(buffer) };
}
async function idempotency(ctx, digest) {
  const key = ctx.req.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9._-]{8,128}$/.test(key)) fail(400, "idempotency_key_required", "Запросу нужен действительный Idempotency-Key.");
  const identity = ctx.actor?.id || (await visitor(ctx)) || "guest";
  const id = await sha(`${identity}\n${ctx.req.method}\n${ctx.url.pathname}\n${key}`);
  return { id, digest };
}
async function replay(ctx) {
  const previous = await get(ctx, "idempotency", ctx.idem.id, false);
  if (!previous) return null;
  if (previous.digest !== ctx.idem.digest) fail(409, "idempotency_conflict", "Ключ уже использован для другого запроса.");
  return previous.response;
}
async function commit(ctx, statements, response) {
  const idempotent = ctx.idem && put(ctx, "idempotency", make({ digest: ctx.idem.digest, response }, "", isoNow(), ctx.idem.id));
  try {
    await ctx.env.DB.batch(idempotent ? [idempotent, ...statements] : statements);
  } catch (error) {
    if (ctx.idem) {
      const previous = await replay(ctx);
      if (previous) return previous;
    }
    if (/constraint|UNIQUE/i.test(String(error))) conflict();
    throw error;
  }
  return response;
}
const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"
};
function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { ...securityHeaders, "cache-control": "no-store", ...headers } });
}
