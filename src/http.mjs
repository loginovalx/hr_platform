const appView = (app, source) => ({
  ...applicationSummary(app), criteriaVersionId: app.criteriaVersionId, testVersionId: app.testVersionId, testStatus: app.testStatus,
  acceptedAt: app.acceptedAt, sourceReceivedAt: app.sourceReceivedAt, importedAt: app.importedAt,
  answers: app.answers, resumeSource: { sourceId: source.id, type: source.type, text: source.text, attachment: source.attachment, extractStatus: source.extractStatus },
  clarificationThreadId: app.clarificationThreadId, stage: viewStage(app)
});
async function hrLogin(ctx) {
  if (ctx.actor) return result({ authenticated: true, ...ctx.actor });
  const user = field(ctx.body.user, "user", 80, true);
  const password = field(ctx.body.password, "password", 256);
  let role = null;
  if (user === "demo" && ctx.env.DEMO_MODE === true) role = "admin";
  if (user === "admin" && ctx.env.ADMIN_PASSWORD && await sha(password) === await sha(ctx.env.ADMIN_PASSWORD)) role = "admin";
  if (user === "hr" && ctx.env.HR_PASSWORD && await sha(password) === await sha(ctx.env.HR_PASSWORD)) role = "hr";
  if (!role) fail(401, "invalid_credentials", "Проверьте логин и пароль.");
  const session = make({ actorId: user, role, name: user === "demo" ? "Кадровая команда" : role === "admin" ? "Руководитель HR" : "Специалист HR", expiresAt: inDays(1) });
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
      return { vacancyId: v.id, slug: x.slug, title: x.title, department: x.department, schedule: x.schedule, location: x.location, description: x.description.slice(0, 260), hasTest: Boolean(x.testVersionId) };
    });
    return result({ items, nextCursor: paged.nextCursor });
  }
  if (method === "POST" && p.join("/") === "applications") return receive(ctx, true);
  if (method === "GET" && p.length === 2 && p[0] === "receipts") {
    const r = await get(ctx, "receipt", p[1]);
    if (r.expiresAt <= isoNow() || !r.visitorId || r.visitorId !== await visitor(ctx)) denied();
    await processPending(ctx, r.applicationId);
    const app = await get(ctx, "application", r.applicationId);
    return result({ receiptNumber: r.id, assessmentStatus: app.assessmentStatus, clarificationThreadId: app.clarificationThreadId });
  }
  if (p[0] === "surveys" && ((method === "GET" && p.length === 2) || (method === "POST" && p.length === 3 && p[2] === "responses"))) return publicSurvey(ctx, p[1]);
  if (p[0] === "clarifications" && ((method === "GET" && p.length === 2) || (method === "POST" && p.length === 3 && p[2] === "answers"))) return publicClarification(ctx, p[1]);
  if (method === "POST" && p.join("/") === "clarification-sessions") return exchangeClarification(ctx);
  missing();
}
async function hrApplications(ctx, method, p) {
  if (p.length === 1) {
    if (method === "POST") return receive(ctx, false);
    if (method !== "GET") missing();
    const { vacancyId } = periodFilter(ctx);
    const q = field(ctx.url.searchParams.get("q"), "q", 160);
    const stage = ctx.url.searchParams.get("stage") || "";
    const channel = ctx.url.searchParams.get("channel") || "";
    const conditions = [];
    const params = [];
    if (vacancyId) { conditions.push("scope=?"); params.push(vacancyId); }
    if (q) { conditions.push("instr(json_extract(data,'$.searchName'),?)>0"); params.push(lowered(q)); }
    if (stageOrder.includes(stage)) { conditions.push("json_extract(data,'$.stage.currentStage')=? AND json_extract(data,'$.stage.outcome') IS NULL"); params.push(stage); }
    if (["hired","rejected"].includes(stage)) { conditions.push("json_extract(data,'$.stage.outcome')=?"); params.push(stage); }
    if (channel && channels.has(channel)) { conditions.push("json_extract(data,'$.sourceChannel')=?"); params.push(channel); }
    const found = await page(ctx, "application", conditions, params);
    return result({ ...found, items: found.items.map(applicationSummary) });
  }
  if (method === "GET") await processPending(ctx, p[1]);
  const app = await get(ctx, "application", p[1]);
  if (method === "GET" && p.length === 2) return result(appView(app, await get(ctx, "source", app.sourceId)));
  if (method === "PUT" && p.length === 3 && p[2] === "candidate") return linkCandidate(ctx, app);
  if (p[2] === "assessment") {
    if (method === "GET" && p.length === 3) return result(await assessView(ctx, app));
    if (method === "PATCH" && p.length === 4) return overrideAssessment(ctx, app, p[3]);
  }
  if (p[2] === "interview-draft" && p.length === 3 && method === "POST") return interviewDraft(ctx, app);
  if (p[2] === "stage" && p.length === 3 && method === "GET") return result(viewStage(app));
  if (p[2] === "transitions" && p.length === 3 && method === "POST") return transition(ctx, app);
  if (p[2] === "history" && p.length === 3 && method === "GET") {
    const found = await page(ctx, "stage_event", ["scope=?"], [app.id]);
    return result(found);
  }
  missing();
}
async function importBatch(ctx) {
  const batch = collection(ctx.body.items, "items", 20);
  if (!batch.length) invalid("items", "required", "Добавьте хотя бы один отклик.");
  const accepted = [];
  const errors = [];
  for (const [index, entry] of batch.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push({ index, code: "invalid_item", message: "Строка должна содержать поля отклика." });
      continue;
    }
    const sub = { ...ctx, body: { ...entry, vacancyId: entry.vacancyId || ctx.body.vacancyId, sourceChannel: "archive" }, idem: { id: await sha(`${ctx.idem.id}:${index}`), digest: ctx.idem.digest } };
    try {
      const response = await replay(sub) || await receive(sub, false);
      accepted.push(response.body);
      if (response.process) ctx.execution.waitUntil(processEvent(sub, response.process).catch(console.error));
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      if (error.code === "idempotency_conflict") throw error;
      errors.push({ index, code: error.code, message: error.message, fields: error.fields });
    }
  }
  return commit(ctx, [], result({ accepted, errors }, 201));
}
async function hrRoutes(ctx, method, p) {
  const action = p.join("/");
  if (p[0] === "vacancies") {
    if (p.length === 1 && method === "GET") {
      const found = await page(ctx, "vacancy");
      return result({ ...found, items: found.items.map(vacancySummary) });
    }
    if (p.length === 1 && method === "POST") return editVacancy(ctx, "create");
    if (p.length === 2 && method === "GET") {
      const v = await get(ctx, "vacancy", p[1]);
      return result({ ...vacancySummary(v), draft: v.draft });
    }
    if (p.length === 3 && p[2] === "draft" && method === "PUT") return editVacancy(ctx, "update", p[1]);
    if (p.length === 3 && p[2] === "publish" && method === "POST") return editVacancy(ctx, "publish", p[1]);
  }
  if (p[0] === "applications") return hrApplications(ctx, method, p);
  if (action === "application-imports" && method === "POST") return importBatch(ctx);
  if (action === "archive-example" && method === "GET") return result({items: [{fullName:"Пример Кандидата",contact:"candidate@example.com",resumeText:"Готовил отчёты и анализировал данные.",sourceReceivedAt:"2026-11-14"}]});
  if (p[0] === "candidates") {
    if (p.length === 1 && method === "POST") return createCandidate(ctx);
    if (p.length === 1 && method === "GET") {
      const q = field(ctx.url.searchParams.get("q"), "q", limits.name);
      const additional = field(ctx.url.searchParams.get("additionalEducation"), "additionalEducation", 160);
      const conditions = [];
      const params = [];
      if (q) { conditions.push("instr(json_extract(data,'$.searchName'),?)>0"); params.push(lowered(q)); }
      if (additional) { conditions.push("instr(json_extract(data,'$.additionalEducationSearch'),?)>0"); params.push(lowered(additional)); }
      const found = await page(ctx, "candidate", conditions, params);
      return result({ ...found, items: found.items.map(candidateSummary) });
    }
    if (p.length === 2 && method === "GET") {
      const person = await get(ctx, "candidate", p[1]);
      const apps = await page(ctx, "application", ["json_extract(data,'$.candidateId')=?"], [person.id]);
      return result({ ...candidateSummary(person), factsSource: person.factsSource, applicationIds: apps.items.map(a => a.id), applications: apps.items.map(applicationSummary), nextCursor: apps.nextCursor });
    }
  }
  if (p[0] === "resume-sources" && p.length === 2 && method === "GET") {
    const source = await get(ctx, "source", p[1]);
    if (ctx.url.searchParams.get("download") === "1") {
      if (!source.attachment || !ctx.env.BUCKET) missing();
      const file = await ctx.env.BUCKET.get(source.id);
      if (!file) missing();
      return new Response(file.body, { headers: { ...securityHeaders, "cache-control": "private,no-store", "content-type": source.attachment.type, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(source.attachment.name).replaceAll("'", "%27")}` } });
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
      return result({ interviewId: i.id, completedAt: i.completedAt, invitationId: i.invitationId });
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
      if (type === "exit_feedback") requireExit(ctx);
      const found = await page(ctx, "invitation", ["scope=?"], [type]);
      return result({ ...found, items: found.items.map(inviteSummary) });
    }
    if (p.length === 2 && method === "GET") return result(await inviteView(ctx, await get(ctx, "invitation", p[1])));
    if (p.length === 3 && p[2] === "mark-sent" && method === "POST") return markSent(ctx, p[1]);
  }
  if (action === "analytics" && method === "GET") return analytics(ctx);
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
  if (group === "hr" || group === "auth") ctx.actor = await auth(ctx);
  if (group === "hr") requireHr(ctx);
  const route = parts.join("/");
  if (group === "auth" && route === "session" && method === "GET") return json({ authenticated: Boolean(ctx.actor), actor: ctx.actor ? { role: ctx.actor.role, name: ctx.actor.name, hosted: Boolean(ctx.actor.hosted) } : null, demoAvailable: env.DEMO_MODE === true });
  if (group === "public" && route === "session" && method === "GET") {
    const id = (await visitor(ctx)) || uuid();
    return renderResult(ctx, result({ ready: true }, 200, { session: ["visitor", id] }));
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
  if (group === "auth" && route === "login" && method === "POST") return renderResult(ctx, await hrLogin(ctx));
  if (group === "auth" && route === "logout" && method === "POST") {
    if (!ctx.actor?.sessionId) return renderResult(ctx, result({ authenticated: false }, 200, { logout: true }));
    return renderResult(ctx, await commit(ctx, [remove(ctx, "staff_session", ctx.actor.sessionId)], result({ authenticated: false }, 200, { logout: true })));
  }
  missing();
}
const assetTypes = { "/app.js": "text/javascript; charset=utf-8", "/style.css": "text/css; charset=utf-8", "/mark.svg": "image/svg+xml" };
async function siteFetch(req, runtimeEnv, execution) {
  try {
    const url = new URL(req.url);
    const env = runtimeEnv.LOCAL_RUNTIME ? runtimeEnv : { TRUST_PLATFORM: true, ...runtimeEnv };
    if (url.pathname === "/health") return json({ ok: true });
    if (url.pathname.startsWith("/api/v1/")) {
      if (!env.DB) fail(503, "database_unavailable", "База данных пока недоступна.");
      return await api(req, env, execution, url);
    }
    if (!["GET", "HEAD"].includes(req.method)) fail(405, "method_not_allowed", "Метод недоступен.");
    if (assetTypes[url.pathname]) return new Response(req.method === "HEAD" ? null : assets[url.pathname], { headers: { ...securityHeaders, "content-type": assetTypes[url.pathname], "cache-control": "public,max-age=300" } });
    if (!/^\/(?:hr(?:\/[^.]+)?|vacancies(?:\/[a-z0-9-]+)?|receipts\/[A-Z0-9]+|clarifications\/[a-f0-9-]+|clarifications\/access\/[a-f0-9.-]+|surveys\/[a-f0-9.-]+)?\/?$/.test(url.pathname)) missing();
    return new Response(req.method === "HEAD" ? null : assets["/"], { headers: { ...securityHeaders, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpError) return json({ code: error.code, message: error.message, fields: error.fields }, error.status);
    console.error("Request failed", error?.message);
    return json({ code: "internal_error", message: "Не удалось обработать запрос. Повторите попытку.", fields: [] }, 500);
  }
}
