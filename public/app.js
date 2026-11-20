const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const base = "/api/v1";
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  brief:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2"/>',
  inbox:'<path d="M5 4h14l3 9v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5l3-9z"/><path d="M2 13h6l2 3h4l2-3h6"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8"/><circle cx="9" cy="7" r="4"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>',
  bars:'<path d="M4 5v15h16M9 15v-4m5 4V8m5 7V4"/>',
  feedback:'<path d="M21 12a8 8 0 0 1-8 8H4l2-4a8 8 0 0 1-1-4 8 8 0 0 1 16 0z"/><path d="M9 12h8m-8 3h5"/>',
  chat:'<path d="M21 11a8 8 0 0 1-8 8H4l2-4a8 8 0 0 1-1-4 8 8 0 0 1 16 0z"/><path d="M9 11h8m-8 3h5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a16 16 0 0 1 0 18 16 16 0 0 1 0-18z"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  calendar:'<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 3v6m8-6v6M4 11h16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M12 3v12m-5-7 5-5 5 5"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  checkUser:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v2m1-10 2 2 4-5"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  xCircle:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  search:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  file:'<path d="M6 3h8l4 4v14H6zM14 3v5h4m-9 4h6m-6 4h6"/>',
  funnel:'<path d="M4 5h16l-6 8v5l-4 2v-7z"/>',
  history:'<path d="M3 12a9 9 0 1 0 2.5-6M3 5v5h5m4-3v5l3 2"/>',
  pin:'<path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  edit:'<path d="m13 6 5 5M3 21l4-.8L20 7a2.1 2.1 0 1 0-3-3L4 17l-1 4z"/>',
  link:'<path d="M10 13a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-2 2m3 5a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l2-2"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  logout:'<path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9"/>',
  building:'<path d="M3 21h18M6 21V9h5V3h7v18m-8-8h1m-1 4h1m4-10h1m-1 4h1m-1 4h1"/>',
  download:'<path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M12 3v12m-5-5 5 5 5-5"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
const ic = n => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[n] || icons.file}</svg>`;
const esc = (s = "") => String(s ?? "").replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[x]);
const enc = (s = "") => encodeURIComponent(s);
const formatter = new Intl.DateTimeFormat("ru-RU", { day:"numeric",month:"short",year:"numeric",timeZone:"Europe/Moscow" });
const timeFormat = new Intl.DateTimeFormat("ru-RU", { day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Moscow" });
const monthDay = new Intl.DateTimeFormat("ru-RU", { day:"numeric",month:"short",timeZone:"Europe/Moscow" });
const dayInput = new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Europe/Moscow"});
const date = (s, time = false) => s ? (time ? timeFormat : formatter).format(new Date(s)).replace(/ г\.$/, "") : "Не указано";
const number = n => new Intl.NumberFormat("ru-RU").format(n ?? 0);
const chip = (label, color = "", dot = false) => `<span class="pill ${color ? "pill-" + color : ""}">${dot ? '<span class="pill-dot"></span>' : ""}${esc(label)}</span>`;
const tile = (name, color = "") => `<span class="tile-icon ${color}">${ic(name)}</span>`;
const btn = (label, attr = "", style = "secondary", icon = "") => `<button type="button" class="btn btn-${style}" ${attr}>${icon ? ic(icon) : ""}${esc(label)}</button>`;
const link = (href, label, style = "secondary", icon = "") => `<a data-link class="btn btn-${style}" href="${esc(href)}">${icon ? ic(icon) : ""}${esc(label)}</a>`;
const submit = (label, icon = "", name = "") => `<button type="submit" class="btn btn-primary"${name ? ` name="mode" value="${esc(name)}"` : ""}>${icon ? ic(icon) : ""}${esc(label)}</button>`;
const avatar = (name = "", index = 0) => `<span class="letter-avatar avatar-${index % 5}" aria-hidden="true">${esc(name.trim().split(/\s+/u).slice(0,2).map(x => Array.from(x)[0] || "").join("").toUpperCase().slice(0,4) || "HR")}</span>`;
const brand = (url = "/hr") => `<a class="brand" href="${url}" data-link><img src="/mark.svg" width="37" height="37" alt=""><span class="brand-text">Кадры<span aria-hidden="true"> · </span>Горький<span class="brand-sub">Муниципальный подбор</span></span></a>`;
const stages = { received:["Получен","purple"],review:["Рассмотрение","blue"],interview:["Интервью","amber"],decision:["Решение","purple"],hired:["Принят на работу","green"],rejected:["Отказ","red"] };
const statusNames = { matched:["Есть сведения","green"],partial:["Частично","amber"],needs_clarification:["Уточнить","purple"],not_met:["Не соответствует","red"] };
const sourceNames = { public_form:"Гостевая форма", email:"Электронная почта", archive:"Архив", manual:"Ручное добавление", unknown:"Источник неизвестен" };
const actions = { schedule_followup:"Назначить следующее интервью", receive:"Отклик получен", start_review:"Начать рассмотрение", invite_interview:"Пригласить на интервью", complete_interview:"Отметить интервью состоявшимся",move_to_decision:"Перевести на этап решения",hire:"Принять на работу",reject:"Зафиксировать отказ" };
const invitationLabels = { prepared:["Подготовлена","purple"],sent:["Отправлена","blue"],answered:["Есть ответ","green"],no_contact:["Нет контакта","amber"],expired:["Срок истёк","red"] };
const typeLabels = { interview_feedback:"После интервью",exit_feedback:"По инициативе работодателя",voluntary_exit:"Причины добровольного ухода" };
const known = x => x ? esc(x) : '<span class="muted">Не указано</span>';
const stagePill = (a, dot = true) => chip(...(stages[a.outcome || a.stage || a.currentStage] || stages.received), dot);
const pagePath = (href, q = {}, keep = false) => {
  const url = new URL(href, location.origin);
  if (keep) url.search = location.search;
  for (const [k, v] of Object.entries(q)) if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  return url.pathname + url.search;
};
const getJSON = path => api(path);
const queueScroll = new Map();
const listPaths = new Set(["/hr/applications","/hr/candidates"]);
const returnPath = path => listPaths.has(path) || /^\/hr\/candidates\/[\w-]{1,140}$/.test(path);
function returnLocation(fallback) {
  const value = new URLSearchParams(location.search).get("back");
  if (!value?.startsWith("/hr/")) return fallback;
  try {
    const url = new URL(value, location.origin);
    if (url.origin === location.origin && returnPath(url.pathname)) return url.pathname + url.search;
  } catch {}
  return fallback;
}
function listDetail(path) {
  return returnPath(location.pathname) ? pagePath(path, {back:location.pathname + location.search}) : path;
}
function listSettings(key, defaultValue) {
  try { return JSON.parse(localStorage.getItem(key)) ?? defaultValue; } catch { return defaultValue; }
}
let navRun = 0;
let actor = null;
let demoAvailable = false;
let activeReceipt = "";
let submission = null;
let appDetailData = null;
let connectData = null;
let vacancyParts = null;
let candidateSearchSeq = 0;
async function api(path, { method = "GET", body, key = crypto.randomUUID() } = {}) {
  const headers = {};
  let payload = body;
  if (method !== "GET") {
    headers["Idempotency-Key"] = key;
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body || {});
    }
  }
  function request() { return fetch(base + path, { method, headers, body: payload }); }
  let response;
  try { response = await request(); }
  catch { response = await request(); }
  const data = await response.json().catch(() => ({ message:"Сервер вернул неожиданный ответ." }));
  if (!response.ok) throw Object.assign(new Error(data.message), { ...data, status: response.status });
  return data;
}
function heading(title, description = "", actionsHtml = "") {
  return `<div class="page-head"><div><h1 tabindex="-1">${esc(title)}</h1>${description ? `<p class="muted">${esc(description)}</p>` : ""}</div>${actionsHtml ? `<div class="row wrap">${actionsHtml}</div>` : ""}</div>`;
}
function empty(title, message = "", icon = "inbox", action = "") {
  return `<div class="empty">${tile(icon)}<h3>${esc(title)}</h3>${message ? `<p>${esc(message)}</p>` : ""}${action}</div>`;
}
function city() {
  return '<div class="city-art" aria-hidden="true"><div class="grid"></div><div class="halo"></div><div class="buildings">' + [32,53,38,69,92,62,81,55,35].map(h => `<i style="--height:${h}%"></i>`).join("") + "</div></div>";
}
function pagination(next, path = location.pathname, keep = true, previous = true) {
  const current = new URLSearchParams(location.search).get("cursor");
  if (!next && !current) return "";
  return `<div class="load-row"><div class="row wrap">${current && previous ? link(pagePath(path,{cursor:null},keep),"В начало") : ""}${next ? link(pagePath(path,{cursor:next},keep),"Следующая страница") : ""}</div></div>`;
}
function toast(message, error = false) {
  const div = document.createElement("div");
  div.className = "toast" + (error ? " error" : "");
  div.textContent = message;
  document.querySelector("#toasts").append(div);
  setTimeout(() => div.remove(), 4000);
}
function choose(name, values, current, attrs = "") {
  const label = values.find(([value])=>String(value)===String(current??""))?.[1] || values[0]?.[1] || "";
  return `<span class="select-wrap"><select name="${esc(name)}" ${attrs}>${values.map(([value,text]) => `<option value="${esc(value)}" ${String(value) === String(current ?? "") ? "selected" : ""}>${esc(text)}</option>`).join("")}</select><span class="select-display" aria-hidden="true"><span>${esc(label)}</span>${ic("down")}</span></span>`;
}
function input(name, label, options = {}) {
  const id = options.id || `field_${name.replace(/[^\w-]/g,"_")}`;
  const { required, max, value, placeholder, hint, type = "text", attrs = "" } = options;
  let control = options.content;
  if (control == null) {
    const common = `id="${esc(id)}" name="${esc(name)}" ${required ? "required" : ""} ${max ? `maxlength="${max}"` : ""} ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} ${hint ? `aria-describedby="${esc(id)}_hint"` : ""} ${attrs}`;
    control = type === "textarea" ? `<textarea ${common} rows="${options.rows || 3}">${esc(value)}</textarea>` : `<input type="${type}" ${common} ${type === "file" ? "" : `value="${esc(value)}"`}>`;
  }
  return `<div class="field ${options.className || ""}"><label for="${esc(id)}">${esc(label)}${options.optional ? ' <span class="optional">необязательно</span>' : ""}</label>${control}${hint ? `<span id="${esc(id)}_hint" class="field-hint">${esc(hint)}</span>` : ""}</div>`;
}
const selectField = (name,label,values,value,attrs = "") => input(name,label,{content:choose(name,values,value,`id="field_${name}" ${attrs}`)});
const searchField = (value, label = "Поиск", conditional = "") => input("q",label,{className:"search-field",content:`<span class="search-control">${ic("search")}<input id="field_q" name="q" type="search" maxlength="160" value="${esc(value)}" placeholder="Фамилия или имя" ${conditional}></span>`});
const check = (name, label, selected = false) => `<div class="check"><input type="checkbox" name="${esc(name)}" id="field_${esc(name)}" ${selected ? "checked" : ""}><label for="field_${esc(name)}">${esc(label)}</label></div>`;
const errors = '<div class="error-box" data-form-error hidden role="alert"></div>';
const pair = (a,b) => `<div class="field-pair">${a}${b}</div>`;
const meta = data => `<dl class="metadata">${data.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
const cardHead = (title, text = "", side = "") => `<div class="card-head"><div class="grow"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}</div>${side}</div>`;
function table(headers, rows, options = {}) {
  const classes = `table ${options.responsive === false ? "" : "responsive-table"} ${options.tight ? "tight-table" : ""}`;
  return `<div class="table-wrap"><table class="${classes}"><thead><tr>${headers.map(h => {
    const [label,width] = Array.isArray(h) ? h : [h];
    return `<th scope="col" ${width ? `style="width:${width}%"` : ""} ${label ? "" : 'aria-label="Действия"'}>${esc(label)}</th>`;
  }).join("")}</tr></thead><tbody>${rows.map(row => `<tr${row.href ? ` data-href="${esc(row.href)}"` : ""}>${row.cells.map((cell,i) => {
    const h = headers[i]; const label = Array.isArray(h) ? h[0] : h;
    return `<td${i > 0 && label ? ` data-label="${esc(label)}"` : ""}${!label ? ' class="col-action"' : ""}>${cell}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`;
}
const navItems = [
  ["/hr","Обзор","grid"], ["/hr/vacancies","Вакансии","brief"], ["/hr/applications","Отклики","inbox"],
  ["/hr/candidates","Кандидаты","users"], ["/hr/analytics","Аналитика","bars"], ["/hr/feedback","Обратная связь","feedback"]
];
const mainNav = navItems.slice(1, 4);
const extraNav = [navItems[0], ...navItems.slice(4), ["/vacancies","Публичные вакансии","globe"]];
function navItem([href,label,icon], active) {
  return `<a class="nav-item" href="${href}" data-link ${active ? 'aria-current="page"' : ""}>${ic(icon)}${esc(label)}</a>`;
}
function hrShell(content) {
  const { pathname } = location;
  const section = navItems.find(([href]) => href === pathname || (href !== "/hr" && pathname.startsWith(href + "/"))) || navItems[0];
  const item = record => navItem(record, record[0] === section[0]);
  return `<div class="shell">
    <aside class="rail" id="rail" aria-label="Боковая панель"><div class="rail-brand">${brand()}</div>
      <nav class="nav-body" aria-label="Кабинет HR">
        <div class="nav-group">${mainNav.map(item).join("")}</div>
        <details class="nav-extra"><summary class="nav-item">Дополнительно ${ic("down")}</summary>
          <div class="nav-group">${extraNav.map(item).join("")}</div></details>
      </nav>
    </aside>
    <button class="mobile-scrim" aria-label="Закрыть меню" data-action="menu"></button>
    <header class="top"><div class="row">${btn("","data-action=menu aria-label=\"Открыть меню\" aria-expanded=\"false\" aria-controls=\"rail\"","quiet btn-icon mobile-menu","menu")}
      <span class="crumb">${esc(section[1])}</span></div>
      <details class="profile-menu"><summary class="top-profile">${avatar(actor?.name || "Кадровая команда")}<span class="profile-text small strong">${esc(actor?.name || "Кадровая команда")}</span>${ic("down")}</summary>
        <div class="drop">${actor?.hosted ? '<a class="btn btn-quiet" target="_top" href="/signout-with-chatgpt?returnTo=%2Fvacancies">Выйти из аккаунта</a>' : btn("Выйти из кабинета",'data-action="logout"',"quiet","logout")}</div>
      </details>
    </header><main class="main" id="main"><div class="inner">${content}</div></main>
  </div>`;
}
function publicShell(content) {
  const secondary = location.pathname === "/vacancies" ? "" : link("/vacancies","Все вакансии","quiet");
  const staff = actor?.role==="department" || location.pathname==="/department"
    ? link("/department","Кабинет подразделения","secondary","lock") : link("/hr","Кабинет HR","secondary","lock");
  return `<div class="public-shell"><header class="public-header"><div class="public-header-inner">${brand("/vacancies")}<nav aria-label="Основная навигация" class="row wrap">${secondary}${staff}</nav></div></header>
  <main class="public-main" id="main">${content}</main><footer class="public-footer"><div>Кадры · Горький <span aria-hidden="true">·</span> Нижний Новгород</div></footer></div>`;
}
function loginView(department=false) {
  return publicShell(`<div class="public-narrow card pad stack-lg" style="max-width:420px;margin-block:22px">
    ${heading(department?"Кабинет подразделения":"Кабинет HR",department?"Войдите, чтобы ответить кадровику.":"Войдите, чтобы работать с откликами и вакансиями.")}
    <form class="stack" data-form="login">${errors}
      ${input("user","Логин",{required:true,max:80,attrs:'autocomplete="username"'})}
      ${input("password","Пароль",{type:"password",required:true,max:256,attrs:'autocomplete="current-password"'})}
      ${submit("Войти","lock")}
    </form>${demoAvailable ? `<div class="row wrap">${department ? btn("Демо подразделения",'data-action="demo-login" data-user="department"',"secondary") : btn("Открыть демо-кабинет",'data-action="demo-login"',"secondary")+btn("Демо кадровика",'data-action="demo-login" data-user="demo-hr"',"secondary")}</div>` : ""}
  </div>`);
}
function metric(label, value, icon, color) {
  return `<div class="card metric">${tile(icon,color)}<strong>${number(value)}</strong><div class="metric-label">${esc(label)}</div></div>`;
}
const metrics = x => `<div class="metric-grid">
  ${metric("Получено откликов",x.received,"inbox","")}
  ${metric("Дошли до интервью",x.interview,"calendar","blue")}
  ${metric("Приняты на работу",x.hired,"checkUser","green")}
  ${metric("Получили отказ",x.rejected,"xCircle","red")}
</div>`;
function spark(series) {
  if (!series.length) return empty("Период без данных");
  const W=440,H=156,L=31,R=11,T=8,B=17;
  const high = Math.max(4, ...series.map(x=>x.value));
  const step = Math.max(1, Math.ceil(high / 4));
  const max = step * 4;
  const sx = i => L + i / Math.max(1, series.length - 1) * (W-L-R);
  const sy = value => T + (1 - value/max) * (H-T-B);
  const coords=series.map((x,i)=>[sx(i),sy(x.value)]);
  const path=coords.map(([x,y],i)=>`${i ? "L" : "M"}${x} ${y}`).join(" ");
  const fill=`${path} L${coords.at(-1)[0]} ${sy(0)} L${L} ${sy(0)} Z`;
  const ticks=Array.from({length:5},(_,i)=>i*step);
  const labelStep=Math.max(1,Math.ceil(series.length/7));
  return `<figure class="chart-box"><svg class="spark-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Число откликов по дням">
    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#b7a8fb" stop-opacity=".46"/><stop offset="1" stop-color="#f3efff" stop-opacity=".25"/></linearGradient></defs>
    ${ticks.map(n=>`<path d="M${L} ${sy(n)} H${W-R}" stroke="#ebeaf3"/><text x="19" y="${sy(n)+4}" text-anchor="end" font-size="10" fill="#727993">${n}</text>`).join("")}
    <path d="${fill}" fill="url(#chartFill)"/><path d="${path}" fill="none" stroke="#6f53e5" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="3.6" fill="#fff" stroke="#6f53e5" stroke-width="1.7"><title>${esc(date(series[i].date))} · ${series[i].value}</title></circle>`).join("")}
    </svg><ul class="chart-labels">${series.filter((_,i)=>i%labelStep===0).map(x=>`<li>${esc(monthDay.format(new Date(x.date)))}</li>`).join("")}</ul></figure>`;
}
function funnelChart(rows, total) {
  return `<div class="funnel-list">${rows.map(x => `<div class="funnel-${x.stage}"><div class="funnel-head"><span>${esc(stages[x.stage][0])}</span><b>${number(x.reached)}</b></div>
  <div class="funnel-track" role="meter" aria-label="${esc(stages[x.stage][0])}" aria-valuemin="0" aria-valuemax="${Math.max(1,total)}" aria-valuenow="${x.reached}"><span style="--progress:${total ? x.reached / total * 100 : 0}%"></span></div></div>`).join("")}</div>`;
}
const intakeStatuses = {
  review_first: ["В приоритете", "green"],
  clarify: ["Нужно уточнение", "amber"],
  check_source: ["Проверить данные", "amber"],
  confirmed_gap: ["Расхождение подтверждено HR", "purple"],
  manual_review: ["Ручной разбор", ""],
  processing: ["Идёт разбор", ""],
  closed: ["Завершён", ""]
};
const intakeReasons = {
  finished: "Этап подбора завершён.",
  hr_confirmed_gap: "Кадровик отметил несоответствие по обязательному требованию.",
  missing_source: "Источник отклика недоступен.",
  unreadable_attachment: "В файле нет текста для разбора. Откройте вложение или запросите текст.",
  missing_text: "Нет читаемого текста резюме или ответов на тест.",
  missing_contact: "В отклике и профиле нет email для связи.",
  analysis_pending: "Проверяем требования по материалам отклика.",
  analysis_unavailable: "Автоматический разбор не готов. Проверьте материалы вручную.",
  no_required_criteria: "У вакансии нет обязательных критериев. Просмотрите отклик вручную.",
  required_supported: "По каждому обязательному требованию есть цитата или подтверждение кадровика.",
  required_need_evidence: "По части обязательных требований нужны дополнительные сведения.",
  test_incomplete: "В обязательных вопросах теста есть пропуски."
};
function intakeStatus(triage) {
  const status = intakeStatuses[triage?.status];
  return status ? chip(status[0],status[1],true) : "";
}
function applicationTable(items, compact = false, filtered = false) {
  const headers = compact
    ? [["Кандидат",29],["Вакансия",31],["Этап",23],["Получен",17]]
    : [["Кандидат",25],["Вакансия",25],["Этап",18],["Источник",17],["Получен",15]];
  const rows = items.map((x,i) => {
    const url = listDetail(`/hr/applications/${enc(x.applicationId)}`);
    const person = `<div class="person-ct">${avatar(x.fullName,i)}<div><a data-link class="table-name" href="${esc(url)}">${esc(x.fullName)}</a></div></div>`;
    const progress = !compact && x.reviewProgress;
    const stage = stagePill(x) + (!compact && x.triage ? `<details class="queue-status"><summary>${intakeStatus(x.triage)}${progress ? ` <span class="tiny muted">${progress.withEvidence}/${progress.required}</span>` : ""}</summary><p class="tiny">${esc(intakeReasons[x.triage.reason])}${progress ? ` · Подтверждено HR ${progress.confirmed}/${progress.required}` : ""}</p></details>` : "")
      + (!compact && x.handoffStatus ? `<div class="table-meta">${chip(x.handoffStatus==="answered"?"Есть ответ подразделения":"Ожидаем подразделение",x.handoffStatus==="answered"?"blue":"amber")}</div>`:"");
    return { href:url,cells:[person,esc(x.vacancyTitle),stage,...(!compact ? [`<span class="muted">${esc(sourceNames[x.sourceChannel])}</span>`] : []),`<span class="muted">${esc(date(x.receivedAt))}</span>`] };
  });
  return items.length ? table(headers,rows,{tight:!compact}) : filtered ? empty("По этим условиям ничего не найдено","","search",link("/hr/applications","Сбросить фильтры","secondary")) : empty("Откликов пока нет","Когда соискатель заполнит форму, отклик появится здесь.");
}
async function overview() {
  const [a,r] = await Promise.all([getJSON("/hr/analytics"),getJSON("/hr/applications?limit=5")]);
  return `<section class="hero"><div class="hero-body"><div class="hero-kicker">${ic("building")} Нижний Новгород</div><h1 tabindex="-1">Кабинет подбора</h1><p>Публикуйте вакансии, разбирайте отклики и следите за ходом найма.</p><div class="hero-actions">
    ${actor.scoped?"":link("/hr/vacancies/new","Создать вакансию","primary","plus")}${link("/hr/applications","Открыть отклики",actor.scoped?"primary":"secondary","inbox")}
  </div></div>${city()}</section>
  <section class="stack" aria-labelledby="overview-label"><div class="overview-head"><h2 id="overview-label">Подбор в цифрах</h2>${link("/hr/analytics","Открыть аналитику","quiet btn-sm","bars")}</div>${metrics(a.totals)}</section>
  <div class="dashboard-grid"><section class="card pad">${cardHead("Динамика откликов","За последние 7 дней",chip("7 дней"))}${spark(a.series)}</section>
  <section class="card pad">${cardHead("Воронка найма","Дошли до этапа",tile("funnel"))}${funnelChart(a.funnel,a.totals.received)}</section></div>
  <section class="card"><div class="table-title"><h2>Последние отклики</h2>${link("/hr/applications","Все отклики","quiet btn-sm")}</div>${applicationTable(r.items,true)}</section>`;
}
const vacancyChoices = (vacancies, all = true) => [[ "", all ? "Все вакансии" : "Выберите вакансию" ], ...vacancies.map(v=>[v.vacancyId, v.title])];
const requisitionStatuses={draft:"Черновик",submitted:"У кадровика",vacancy_draft:"Вакансия готовится",published:"Вакансия опубликована"};
function vacancyTabs(requests) {
  if(actor.scoped)return "";
  return `<nav class="tabs" aria-label="Работа с вакансиями"><a data-link href="/hr/vacancies" ${!requests?'aria-current="page"':""}>Вакансии</a>
    <a data-link href="/hr/vacancies?view=requests" ${requests?'aria-current="page"':""}>Заявки подразделений</a></nav>`;
}
async function listVacancies() {
  if(!actor.scoped&&new URLSearchParams(location.search).get("view")==="requests"){
    const requests=await getJSON("/hr/requisitions"+location.search);
    return `${heading("Заявки подразделений")}${vacancyTabs(true)}
      ${requests.items.map(item=>`<section class="card pad stack-sm">${cardHead(item.title,item.department)}
      <p class="pre">${esc(item.description)}</p><div>${link(pagePath("/hr/vacancies/new",{request:item.id}),"Подготовить вакансию","primary","brief")}</div>
      </section>`).join("")||`<section class="card">${empty("Подтверждённых заявок пока нет","","brief")}</section>`}${pagination(requests.nextCursor)}`;
  }
  const r=await getJSON("/hr/vacancies"+location.search);
  const list=r.items.map(v=>`<article class="card vac-card"><div class="row between align-start">${tile("brief")}${v.status==="published"?chip("Опубликована","green",true):chip("Черновик","",true)}</div>
  <div><h2><a data-link href="/hr/vacancies/${enc(v.vacancyId)}">${esc(v.title)}</a></h2><p class="vac-meta">${esc(v.department)}</p></div>
  <div class="row wrap muted small">${ic("pin")}${esc(v.location)}</div><div class="vac-foot">
  ${link("/hr/vacancies/"+enc(v.vacancyId),"Редактировать","secondary btn-sm","edit")}
  ${link(pagePath("/hr/applications",{vacancyId:v.vacancyId}),"Отклики","quiet btn-sm","inbox")}
  </div></article>`).join("");
  return `${heading("Вакансии","Черновики, опубликованные вакансии и тесты для соискателей.",actor.scoped?"":link("/hr/vacancies/new","Создать вакансию","primary","plus"))}
  ${vacancyTabs(false)}${list ? `<div class="list-grid">${list}</div>` : `<div class="card">${actor.scoped?empty("Вам пока не назначены вакансии","","brief"):empty("Вакансий пока нет","Создайте первую вакансию и опубликуйте форму отклика.","brief")}</div>`}${pagination(r.nextCursor)}`;
}
async function vacancyMenu(current = "", publishedOnly = false) {
  const found=await getJSON("/hr/vacancies?limit=50");
  const items=found.items.filter(x=>!publishedOnly||x.status==="published");
  if (current && !items.some(x=>x.vacancyId===current)) {
    const single=await getJSON("/hr/vacancies/"+enc(current)).catch(()=>null);
    if (single && (!publishedOnly||single.status==="published")) items.unshift(single);
  }
  return { items, nextCursor:found.nextCursor, publishedOnly };
}
function vacancySelect(menu, current, all = true) {
  const options=vacancyChoices(menu.items,all);
  if (menu.nextCursor) options.push(["__more","Загрузить ещё вакансии…"]);
  return selectField("vacancyId","Вакансия",options,current,`${all?"":"required"} data-vacancy-cursor="${esc(menu.nextCursor||"")}" data-published-only="${menu.publishedOnly?"1":"0"}" data-value="${esc(current||"")}"`);
}
const codeLabels = { custom:"Свои ключевые слова",sql:"SQL",python:"Python",analytics:"Аналитика",api:"Работа с API",communication:"Коммуникация",education:"Образование",project:"Проектная работа",office:"Офисные инструменты",experience:"Опыт работы" };
function vacancyEditorPart(kind,v,i) {
  const suffix=v.id;
  const drop=btn("Удалить",`data-action="remove-part" data-kind="${kind}" data-id="${esc(suffix)}"`,"quiet btn-sm","close");
  if (kind==="criteria") return `<div class="form-block stack-sm"><div class="row between"><h3>Критерий ${i+1}</h3>${drop}</div>
    ${pair(input("criteria_"+suffix+"_label","Требование",{required:true,max:160,value:v.label,placeholder:"Например, опыт работы с SQL"}),selectField("criteria_"+suffix+"_code","Тип критерия",Object.entries(codeLabels),v.code||"custom"))}
    ${input("criteria_"+suffix+"_keywords","Ключевые слова",{max:850,value:(v.keywords||[]).join(", "),optional:true,hint:"Перечислите через запятую. Слова используются для локальной проверки."})}
    ${input("criteria_"+suffix+"_question","Вопрос для уточнения",{max:300,value:v.question,optional:true})}
    ${input("criteria_"+suffix+"_reference","Основание или пункт инструкции",{max:250,value:v.reference,optional:true})}
    ${check("criteria_"+suffix+"_required","Обязательный критерий",v.required!==false)}</div>`;
  return `<div class="form-block stack-sm"><div class="row between"><h3>Вопрос ${i+1}</h3>${drop}</div>
    ${input("test_"+suffix+"_text","Формулировка",{type:"textarea",rows:2,required:true,max:400,value:v.text})}
    ${check("test_"+suffix+"_required","Ответ обязателен",v.required!==false)}</div>`;
}
function paintVacancyParts() {
  for (const kind of ["criteria","testQuestions"]) {
    const list=document.querySelector("[data-parts="+kind+"]");
    if (list) list.innerHTML=vacancyParts[kind].map((v,i)=>vacancyEditorPart(kind,v,i)).join("");
    const button=document.querySelector(`[data-action="add-part"][data-kind="${kind}"]`);
    if (button) button.disabled=vacancyParts[kind].length>=(kind==="criteria"?8:6);
  }
}
function captureVacancyParts(form) {
  const f=new FormData(form);
  for (const v of vacancyParts.criteria) {
    const key="criteria_"+v.id+"_";
    Object.assign(v,{label:f.get(key+"label")||"",code:f.get(key+"code")||"custom",keywords:String(f.get(key+"keywords")||"").split(",").map(x=>x.trim()).filter(Boolean),question:f.get(key+"question")||"",reference:f.get(key+"reference")||"",required:f.has(key+"required")});
  }
  for (const v of vacancyParts.testQuestions) {
    const key="test_"+v.id+"_";
    Object.assign(v,{text:f.get(key+"text")||"",required:f.has(key+"required")});
  }
}
async function editVacancyPage(id) {
  const existing=id&&id!=="new"?await getJSON("/hr/vacancies/"+enc(id)):null;
  const requestId=!existing&&!actor.scoped?new URLSearchParams(location.search).get("request"):null;
  const request=requestId?await getJSON("/hr/requisitions/"+enc(requestId)):null;
  if(request&&request.status!=="submitted")return heading("По заявке уже есть вакансия","",link("/hr/vacancies/"+enc(request.vacancyId),"Открыть вакансию","primary"));
  const v=existing?.draft||{title:request?.title||"",slug:request?convertSlug(request.title):"",department:request?.department||"",description:request?.description||"",location:"Нижний Новгород",schedule:"Полная занятость",criteria:[],testQuestions:[],formFields:[{id:"resume",required:true}]};
  vacancyParts={criteria:v.criteria,testQuestions:v.testQuestions};
  const publicLink=existing?.publishedVersionId?link("/vacancies/"+enc(existing.slug),"Открыть вакансию","secondary","globe"):"";
  const actionsHtml=existing?publicLink+link(pagePath("/hr/applications",{vacancyId:id}),"Отклики","secondary","inbox"):"";
  if(actor.scoped&&!existing) return heading("Новая вакансия","Создание вакансий доступно руководителю.");
  const approval=existing?.approval;
  const canReview=approval?.status==="submitted"&&actor.role==="admin"&&![existing.draftAuthor?.id,approval.submittedBy?.id].includes(actor.id);
  const approvalLabels={submitted:"На согласовании",approved:"Согласована",changes_requested:"Возвращена на доработку"};
  return `<div class="row wrap">${link("/hr/vacancies","Вакансии","quiet btn-sm","brief")}${existing?.publishedVersionId?chip("Опубликована","green",true):chip("Черновик")}</div>
  ${heading(existing ? existing.title : "Новая вакансия",existing?"Изменения на витрине появятся после публикации новой версии.":"Подготовьте описание, критерии проверки и тест.",actionsHtml)}
  <form data-form="vacancy" data-id="${esc(existing?.vacancyId||"")}" data-requisition="${esc(request?.id||"")}" class="stack-lg">
    <section class="card pad stack">${cardHead("Основная информация")}
      ${pair(input("title","Название вакансии",{value:v.title,placeholder:"Аналитик данных",required:true,max:150}),input("department","Подразделение",{value:v.department,required:true,max:140}))}
      ${pair(input("location","Город",{value:v.location,max:120}),input("schedule","Занятость",{value:v.schedule,max:80}))}
      ${input("slug","Адрес вакансии",{value:v.slug,placeholder:"data-analyst",max:90,required:true,attrs:existing?.publishedVersionId?"readonly":'pattern="[a-z0-9]+(-[a-z0-9]+)*" data-slug-field',hint:"Латинские буквы, цифры и дефисы."})}
      ${input("description","Описание и задачи",{type:"textarea",rows:7,value:v.description,required:true,max:12000})}
    </section>
    <section class="card pad stack">
      ${cardHead("Форма отклика","Фамилия, имя и email обязательны.")}
      ${check("resumeRequired","Требовать резюме при отклике",v.formFields.find(x=>x.id==="resume")?.required!==false)}
    </section>
    <section class="card pad stack">
      ${cardHead("Критерии проверки","Закрепляются в опубликованной версии вакансии.",btn("Добавить критерий",'data-action="add-part" data-kind="criteria"',"secondary btn-sm","plus"))}
      <div class="stack-sm" data-parts="criteria">${v.criteria.map((item,i)=>vacancyEditorPart("criteria",item,i)).join("")}</div>
    </section>
    <section class="card pad stack">
      ${cardHead("Тест при отклике","Текстовые вопросы видны в гостевой форме.",btn("Добавить вопрос",'data-action="add-part" data-kind="testQuestions"',"secondary btn-sm","plus"))}
      <div class="stack-sm" data-parts="testQuestions">${v.testQuestions.map((item,i)=>vacancyEditorPart("testQuestions",item,i)).join("")}</div>
    </section>
    ${errors}<div class="row wrap"><button type="submit" class="btn btn-secondary" name="mode" value="draft">Сохранить черновик</button>${!existing?.publishedVersionId?submit("Опубликовать","check","publish"):""}</div>
  </form>${existing?.publishedVersionId?`<section class="card pad stack-sm" data-draft-number="${existing.draftNumber}"><h2>Согласование версии № ${existing.draftNumber}</h2>
  ${existing.draftAuthor?`<p>Автор - ${esc(existing.draftAuthor.name)}</p>`:""}
  ${approval?`<p>${esc(approvalLabels[approval.status])}${approval.reviewedBy?" · "+esc(approval.reviewedBy.name):""} ${esc(approval.note)}</p>`:""}
  <div class="row wrap">${existing.draftAuthor&&(!approval||approval.status==="changes_requested")?btn("Передать на согласование",'data-action="vacancy-approval" data-mode="submit"'):""}
  ${canReview?btn("Согласовать",'data-action="vacancy-approval" data-mode="approve"',"primary")+btn("Вернуть на доработку",'data-action="vacancy-approval" data-mode="request_changes"'):""}
  ${approval?.status==="approved"?btn("Опубликовать версию",'data-action="vacancy-approval" data-mode="publish"',"primary"):""}</div></section>`:""}`;
}
async function applicationList() {
  const q=new URLSearchParams(location.search);
  const [r,menu]=await Promise.all([getJSON("/hr/applications"+location.search),vacancyMenu(q.get("vacancyId"))]);
  const totals=r.triageTotals;
  const queues=[["",`Вся очередь (${Object.values(totals).reduce((a,b)=>a+b,0)})`],
    ...Object.entries(intakeStatuses).map(([key,[label]])=>[key,`${label} (${totals[key]||0})`])];
  const context=[q.get("activity")==="without_action"?"Без действий по этапу":"",
    q.get("from")?"С "+date(q.get("from")):"",q.get("to")?"По "+date(q.get("to")):""].filter(Boolean);
  return `${heading("Отклики",context.join(" · "),btn("Импортировать",'data-action="intake-options"',"secondary","upload")+btn("Добавить отклик",'data-action="import-application"',"primary","plus"))}
  <form class="card pad stack-sm queue-filters" data-form="app-filters">
    ${["activity","from","to"].filter(key=>q.get(key)).map(key=>`<input type="hidden" name="${key}" value="${esc(q.get(key))}">`).join("")}
    <div class="queue-main">${searchField(q.get("q"),"Поиск по кандидату")}
    ${vacancySelect(menu,q.get("vacancyId"))}
    ${selectField("triage","Очередь разбора",queues,q.get("triage"))}</div>
    <details ${["stage","channel","priority","handoff"].some(key=>q.get(key)) ? "open" : ""}><summary>Дополнительные фильтры</summary><div class="queue-main">
    ${selectField("stage","Этап", [["","Все этапы"],...Object.entries(stages).map(([id,[text]])=>[id,text])],q.get("stage"))}
    ${selectField("channel","Источник",[["","Все источники"],...Object.entries(sourceNames)],q.get("channel"))}
    ${selectField("handoff","Ответ подразделения",[["","Любое состояние"],["waiting","Ожидаем подразделение"],["answered","Есть ответ"]],q.get("handoff"))}
    <div>${check("priority","По приоритету проверки",q.get("priority")==="on" && !!q.get("vacancyId"))}<small class="muted" data-priority-hint>Выберите вакансию для сортировки по приоритету.</small></div></div></details>
    <div class="row wrap">${submit("Применить","funnel")}${link("/hr/applications","Сбросить","quiet")}
      ${btn("Сохранить фильтры",'data-action="save-filters"',"quiet")}${listSettings("kadry-filters",null) ? btn("Мои фильтры",'data-action="restore-filters"',"quiet") : ""}</div>
  </form>
  <section class="card">${applicationTable(r.items,false,["q","vacancyId","stage","channel","triage","handoff","activity","from","to"].some(key=>q.get(key)))}${pagination(r.nextCursor)}</section>`;
}
function resumeFields(required) {
  return `<div class="form-block stack-sm"><h3>Резюме${required ? " *" : ""}</h3>
  ${input("resumeFile","Файл резюме",{type:"file",attrs:'accept=".pdf,.docx,.txt"',hint:"PDF, DOCX или TXT, до 5 МБ. Для разбора PDF можно добавить текст ниже."})}
  ${input("resumeText","Текст резюме",{type:"textarea",rows:5,max:20000,placeholder:"Опыт работы, образование и навыки",hint:"До 20 000 символов."})}</div>`;
}
async function importModal(archive) {
  const current=new URLSearchParams(location.search).get("vacancyId")||"";
  const menu=await vacancyMenu(current,true);
  if (!menu.items.length && !menu.nextCursor) {
    showDialog("Добавление отклика",empty("Сначала опубликуйте вакансию","Отклик связывается с опубликованной версией вакансии.","brief",link("/hr/vacancies/new","Создать вакансию","primary")));
    return;
  }
  if (archive) {
    showDialog("Импорт поступивших откликов",`<form data-form="import-archive" class="stack">${vacancySelect(menu,current,false)}
    ${selectField("sourceChannel","Источник",Object.entries(sourceNames).filter(([id])=>["email","manual","unknown"].includes(id)),"email")}${input("sourceAccount","Учётная запись источника",{max:160,optional:true,hint:"Нужна для строк со стабильным deliveryId."})}
    ${input("archive","Файл выгрузки",{type:"file",required:true,attrs:'accept=".json,application/json"',hint:"JSON, до 20 откликов и 120 КБ."})}
    <a class="text-link small" href="/api/v1/hr/archive-example" download="archive-example.json">Скачать пример выгрузки</a>
    <p class="muted small">Старые документы и события добавляются из профиля кандидата.</p>
    ${errors}<div data-import-result></div><div>${submit("Импортировать","upload")}</div></form>`);
    return;
  }
  showDialog("Добавить отклик",`<form data-form="import-application" class="stack">
    ${vacancySelect(menu,current,false)}
    ${pair(input("fullName","Фамилия и имя",{max:160,required:true}),input("contact","Email",{type:"email",max:254,optional:true}))}
    ${pair(selectField("sourceChannel","Источник",Object.entries(sourceNames).filter(x=>x[0]!=="public_form"),"email"),input("sourceReceivedAt","Дата получения",{type:"date",optional:true}))}
    ${resumeFields(true)}${errors}<div>${submit("Сохранить отклик","check")}</div></form>`);
}
function applicantCard(person, fallback = "") {
  return `<div class="row align-start">${avatar(person.fullName)}<div class="grow"><a class="text-link" data-link href="/hr/candidates/${enc(person.candidateId)}">${esc(person.fullName)}</a><p class="muted small">${known(person.contact || fallback)}</p></div></div>`;
}
function assessmentCards(assessment) {
  const hrLabel = status => statusNames[status] || statusNames.needs_clarification;
  if (!assessment.items.length) return empty("Критерии не заданы","Добавьте критерии при подготовке новой версии вакансии.","check");
  const states = { pending:"Проверяем источники…",failed:"Разбор прервался. Критерии доступны для ручной проверки." };
  return `${states[assessment.assessmentStatus] ? `<div class="note">${esc(states[assessment.assessmentStatus])}</div>` : ""}
  <div class="stack-sm">${assessment.items.map(x=>{
    const [status,color]=hrLabel(x.hrOverride?.status || x.status);
    const proof=x.evidence.map(e=>`<div class="stack-sm"><blockquote class="quote">${esc(e.quote)}</blockquote>
      <div>${btn(e.type==="resume"?"Открыть резюме":e.type==="test"?"Открыть ответ теста":"Открыть ответ кандидата",`data-action="evidence" data-type="${esc(e.type)}" data-id="${esc(e.sourceId)}" data-offset="${esc(e.offset)}" data-length="${e.quote.length}"`,"quiet btn-sm","file")}</div></div>`).join("");
    return `<article class="criterion"><div class="row between wrap"><h3 class="grow">${esc(x.label)}</h3>${chip(x.hrOverride?.status==="matched"?"Подтверждено HR":status,color,true)}</div>
      ${x.reference ? `<p class="small muted">${esc(x.reference)}</p>` : ""}
      ${proof || '<p class="small muted">Сведения в источниках не указаны.</p>'}
      ${x.question && !x.hrOverride ? `<p class="small"><strong>Уточнение.</strong> ${esc(x.question)}</p>` : ""}
      ${x.hrOverride ? `<div class="note"><strong>Правка HR.</strong> ${esc(x.hrOverride.reason)}<p class="tiny muted">${esc(x.hrOverride.actorName)} · ${esc(date(x.hrOverride.at,true))}</p></div>` : ""}
      <div>${btn("Изменить вывод",`data-action="override" data-id="${esc(x.criterionId)}"`,"secondary btn-sm","edit")}</div></article>`;
  }).join("")}</div>`;
}
function evidenceText(text, target) {
  if (!target || !text) return `<div class="resume" tabindex="0">${esc(text || "Текст не указан.")}</div>`;
  const offset = Number(target.dataset.offset);
  const length = Number(target.dataset.length);
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(length) || length < 1 || offset + length > text.length) return evidenceText(text);
  const start = Math.min(offset,Math.max(0,text.lastIndexOf("\n",Math.max(0,offset-320)) + 1,offset-600));
  const next = text.indexOf("\n",offset+length+320);
  const end = Math.min(text.length,next<0?text.length:next,offset+length+600);
  return `<div class="resume" tabindex="0">${start ? "…\n" : ""}${esc(text.slice(start,offset))}<mark data-evidence-mark>${esc(text.slice(offset,offset+length))}</mark>${esc(text.slice(offset+length,end))}${end<text.length ? "\n…" : ""}</div>`;
}
function sourceCard(a, target) {
  const s=a.resumeSource;
  const attachment=s.attachment ? `<div class="attachment row wrap">${tile("file")}<div class="grow"><div class="strong small">${esc(s.attachment.name)}</div><div class="muted tiny">${number(Math.ceil(s.attachment.size/1024))} КБ</div></div><a class="btn btn-secondary btn-sm" href="${base}/hr/resume-sources/${enc(s.sourceId)}?download=1">${ic("download")} Скачать</a></div>` : "";
  return `<div class="stack">${attachment}${s.extractStatus==="manual"?'<p class="note">Исходник сохранён. Текст вложения доступен для ручной проверки после скачивания.</p>':s.extractStatus==="truncated"?'<p class="note">На странице показаны первые 20 000 символов. Полный текст есть в исходном файле.</p>':""}${s.text?evidenceText(s.text,target):'<p class="muted small">Текст не указан.</p>'}</div>`;
}
const handoffOutcomes={proceed:"Продолжить подбор",clarify:"Запросить уточнение",decline:"Не продолжать"};
const interviewFormats={phone:"Телефонное",onsite:"Очное"};
const voluntaryReasons={new_job:"Другая работа",workload:"Нагрузка или условия работы",growth:"Профессиональное развитие",personal:"Личные обстоятельства",other:"Другая причина",undisclosed:"Предпочитаю не отвечать"};
function reportPanel(data) {
  const labels={education:"Высшее образование",retraining:"Профессиональная переподготовка",refresher:"Повышение квалификации"};
  const paths={profile_degree:"Профильное высшее образование",degree_and_retraining:"Высшее образование и профильная переподготовка"};
  const last=data.decision;
  const quotes=items=>items.map(e=>`<blockquote class="quote">${esc(e.quote)}</blockquote>`).join("");
  return `<article class="stack" id="print-report">
    ${cardHead("Справка по отклику",data.fullName+" · "+data.vacancyTitle,btn("Печать / PDF",'data-action="print-report"',"secondary btn-sm","download"))}
    ${Object.entries(labels).map(([key,label])=>`<div class="criterion"><h3>${esc(label)}</h3>${quotes(data.facts[key])||'<p class="muted small">Сведений в источниках нет.</p>'}</div>`).join("")}
    ${data.criteria.map(c=>`<div class="criterion"><h3>${esc(c.label)}</h3>
      ${c.reference?`<p>${esc(c.reference)}</p>`:""}${c.educationPath?`<p>${esc(paths[c.educationPath])}</p>`:""}
      <p>${esc(statusNames[c.hrOverride?.status||c.status][0])}${c.hrOverride?" · "+esc(c.hrOverride.actorName):""}</p>
      ${quotes(c.evidence)}<p>${esc(c.hrOverride?.reason||c.question)}</p></div>`).join("")}
    ${meta([["Следующий шаг",esc(actions[data.stage.transitions[0]] || (data.stage.outcome?stages[data.stage.outcome][0]:"Сверить сведения"))],
    ["Последнее решение",last?`${esc(actions[last.action]||last.action)} · ${esc(last.actorName)} · ${esc(date(last.occurredAt,true))}${last.reason?" · "+esc(last.reason):""}`:"Решение ещё не зафиксировано"]])}</article>`;
}
function handoffAnswer(answer) {
  return answer?`<div class="note">${esc(handoffOutcomes[answer.outcome])} · ${esc(answer.actor)} · ${esc(date(answer.at,true))}<p>${esc(answer.note)}</p></div>`:'<p class="muted small">Ожидает ответа подразделения.</p>';
}
function handoffBrief(data, showIdentity=true) {
  return `<div class="stack-sm">${showIdentity?`<h3>${esc(data.fullName)}</h3><p class="muted small">${esc(data.vacancyTitle)}</p>`:""}
    <ul class="review-brief">${data.criteria.map(c=>`<li><strong>${esc(c.label)}</strong>
      <p class="small">${esc(statusNames[c.status][0])}${c.reference?" · "+esc(c.reference):""}</p>
      ${c.reviewReason?`<p class="small">${esc(c.reviewReason)}</p>`:""}
      ${c.question?`<p class="small">${esc(c.question)}</p>`:""}</li>`).join("")}</ul></div>`;
}
function workflowPanel(handoff,reviews,interviews,canSend) {
  return `<div class="stack">${cardHead("Передача подразделению","",!handoff&&canSend?btn("Передать карточку",'data-action="handoff"',"secondary","link"):"")}
  ${handoff?`${meta([["Ответственный",esc(handoff.assigneeId)],["Ответить до",esc(date(handoff.dueAt,true))],["Передал",esc(handoff.sentBy)]])}${handoffAnswer(handoff.response)}`:""}
  ${cardHead("Интервью")}${interviews.items.map(i=>`<div class="criterion">${esc(interviewFormats[i.format]||"Интервью")} · ${esc(date(i.completedAt||i.scheduledAt,true))} · ${esc(i.completedAt?(handoffOutcomes[i.result]||"Состоялось"):"Назначено")}${i.notes?`<p>${esc(i.notes)}</p>`:""}
    ${i.completedAt?(i.invitationId?btn("Открыть анкету",`data-action="invitation" data-id="${esc(i.invitationId)}"`):btn("Запросить обратную связь",`data-action="interview-survey" data-id="${esc(i.id)}"`)):""}</div>`).join("") || '<p class="muted small">Интервью пока нет.</p>'}
  ${interviews.nextCursor?link(pagePath(location.pathname,{interviewCursor:interviews.nextCursor},true),"Следующие интервью"):""}
  ${cardHead("Смежные вакансии","",btn("Проверить по другой вакансии",'data-action="related-review"',"secondary","brief"))}
  ${reviews.items.map(review=>`<details class="criterion"><summary>${esc(review.vacancyTitle)} · ${esc(date(review.reviewedAt,true))} · ${esc(review.reviewedBy)}</summary>
    ${review.criteria.map(c=>`<p>${esc(c.label)} · ${esc(statusNames[c.status][0])}${c.question?" · "+esc(c.question):""}</p>`).join("")}</details>`).join("") || '<p class="muted small">Дополнительных проверок пока нет.</p>'}
  ${reviews.nextCursor?link(pagePath(location.pathname,{reviewCursor:reviews.nextCursor},true),"Следующие проверки"):""}</div>`;
}
async function departmentView() {
  const requests=new URLSearchParams(location.search).get("tab")==="requests";
  const signOut=actor.hosted?'<a class="btn btn-quiet" target="_top" href="/signout-with-chatgpt?returnTo=%2Fvacancies">Выйти</a>':btn("Выйти",'data-action="logout"',"quiet","logout");
  const nav=`<nav class="tabs" aria-label="Работа подразделения"><a data-link href="/department" ${!requests?'aria-current="page"':""}>Карточки от HR</a>
    <a data-link href="/department?tab=requests" ${requests?'aria-current="page"':""}>Заявки на подбор</a></nav>`;
  if(requests){
    const data=await getJSON("/department/requisitions"+location.search);
    return `<div class="public-narrow stack">${heading("Кабинет подразделения","",signOut)}${nav}
      <div>${btn("Создать заявку",'data-action="new-requisition"',"primary","plus")}</div>
      ${data.items.map(item=>`<section class="card pad stack-sm">${cardHead(item.title,item.department,chip(requisitionStatuses[item.status]))}
        <p class="pre">${esc(item.description)}</p><div class="row wrap">${item.status==="draft"?btn("Подтвердить и передать",`data-action="submit-requisition" data-id="${enc(item.id)}"`,"primary","check")
          +btn("Изменить",`data-action="edit-requisition" data-id="${enc(item.id)}"`,"secondary","edit"):""}
          ${item.vacancySlug?link("/vacancies/"+enc(item.vacancySlug),"Открыть вакансию","secondary","brief"):""}</div></section>`).join("")||empty("Заявок пока нет")}
      ${pagination(data.nextCursor)}</div>`;
  }
  const data=await getJSON("/department/handoffs"+location.search);
  return `<div class="public-narrow stack">${heading("Кабинет подразделения","",signOut)}${nav}
  ${data.items.map(item=>`<section class="card pad stack-sm">${cardHead(item.shared.fullName,item.shared.vacancyTitle)}
    ${meta([["Ответить до",esc(date(item.dueAt,true))],["Передал",esc(item.sentBy)]])}${item.note?`<p>${esc(item.note)}</p>`:""}
    ${handoffBrief(item.shared,false)}
    ${item.response?handoffAnswer(item.response):`<form class="stack-sm" data-form="handoff-response" data-id="${esc(item.id)}">
      ${selectField("outcome","Результат",Object.entries(handoffOutcomes),"proceed")}${input("note","Обоснование",{type:"textarea",required:true,max:1200})}
      ${errors}<div>${submit("Ответить","check")}</div></form>`}</section>`).join("") || empty("Карточек пока нет")}
  ${pagination(data.nextCursor)}</div>`;
}
function interviewCard(record) {
  if (!record.interview) return "";
  const i=record.interview;
  return `<section class="card pad stack-sm"><h2>Интервью</h2>
  <div>${i.completedAt ? chip("Состоялось","green",true) : chip("Назначено","amber",true)}</div>
  ${i.scheduledAt ? meta([["Назначено (МСК)",esc(date(i.scheduledAt,true))]]) : '<p class="small muted">Время интервью не указано.</p>'}
  ${i.completedAt ? (i.invitationId ? btn("Открыть анкету",`data-action="invitation" data-id="${esc(i.invitationId)}"`,"secondary","feedback") : btn("Запросить обратную связь",`data-action="interview-survey" data-id="${esc(i.interviewId)}"`,"secondary","feedback")) : ""}</section>`;
}
function employmentCard(e) {
  if (!e) return "";
  const actionsHtml=e.termination?.invitationId?btn("Открыть анкету",`data-action="invitation" data-id="${esc(e.termination.invitationId)}"`,"secondary","feedback"):actor?.role==="admin"&&e.status==="active"?btn("Зафиксировать увольнение",`data-action="termination" data-id="${esc(e.employmentId)}"`,"secondary","file"):"";
  return `<section class="card pad stack-sm"><h2>Трудоустройство</h2><div>${e.status==="active"?chip("Работает","green",true):chip("Трудоустройство завершено","",true)}</div>
  ${meta([["Дата найма",esc(date(e.startedAt))],...(e.termination?[["Дата увольнения",esc(date(e.termination.effectiveAt))]]:[])])}${actionsHtml}</section>`;
}

const questionReasons = {
  required_gap: "Уточнить обязательное требование",
  optional_gap: "Уточнить дополнительное требование",
  verify_evidence: "Проверить пример из отклика",
  opening: "Начать разговор"
};

function interviewQuestionRow(question, selected, canRecord=false) {
  return `<div class="interview-question" data-plan-question="${esc(question.criterionId)}">
    <div class="row between wrap">
      <label class="interview-select"><input type="checkbox" data-plan-selected ${selected?"checked":""}>
        <strong>${esc(question.label)}</strong></label>
      <span class="tiny muted">${esc(questionReasons[question.reason])}</span>
    </div>
    <textarea class="control" rows="3" maxlength="300" aria-label="Вопрос: ${esc(question.label)}" data-plan-text>${esc(question.question)}</textarea>
    ${question.evidence?`<blockquote class="quote small">${esc(question.evidence.quote)}</blockquote>`:""}
    ${canRecord?`<div>${btn("Записать ответ",`data-action="interview-answer" data-criterion="${question.reason==="opening"?"":enc(question.criterionId)}"`,"quiet btn-sm","edit")}</div>`:""}
  </div>`;
}

function interviewPlanPanel(plan, canRecord) {
  return `<div class="interview-plan stack" data-interview-plan>
    <div class="stack-sm">
      ${cardHead("Вопросы по отклику","Сначала вопросы по требованиям, для которых нужно больше сведений.")}
      <div class="row wrap">
        ${btn("Скопировать выбранные",'data-action="copy-interview-plan"',"primary","copy")}
        ${plan.canRefine?btn("Уточнить формулировки с ИИ",'data-action="refine-interview-plan"',"secondary","chat"):""}
      </div>
      <p class="small muted" data-plan-status aria-live="polite" hidden></p>
    </div>
    <div class="stack-sm" data-current-questions>
      ${plan.questions.map((q,i)=>interviewQuestionRow(q,i<4,canRecord)).join("")}
    </div>
    ${plan.notes.length?`<section class="stack-sm"><h2>Ответы со звонков и встреч</h2>
      ${plan.notes.map(note=>`<div class="criterion stack-sm"><h3>${esc(note.question)}</h3>
        <p class="pre">${esc(note.text)}</p>${note.nextStep?`<p class="small"><strong>Следующий шаг.</strong> ${esc(note.nextStep)}</p>`:""}
        <p class="tiny muted">${esc(note.actorName)} · ${esc(date(note.recordedAt,true))}</p></div>`).join("")}</section>`:""}
    <section class="stack-sm">
      ${cardHead("Другие вакансии для обсуждения")}
      ${plan.moreVacancies?`<p class="small muted">Проверены ${plan.comparedVacancies} недавно обновлённых вакансий. Другие доступны во вкладке "Взаимодействие".</p>`:""}
      ${plan.alternatives.length?plan.alternatives.map((option,i)=>`<details class="criterion alternative-role" ${i===0?"open":""}>
        <summary><strong>${esc(option.title)}</strong><span class="small muted">${esc(option.department)}</span></summary>
        <div class="stack-sm">
          ${option.required?`<p class="small">Есть сведения по ${option.supportedRequired} из ${option.required} обязательных требований.</p>`:""}
          ${option.evidence.map(item=>`<div class="stack-sm"><strong class="small">${esc(item.label)}</strong><blockquote class="quote">${esc(item.quote)}</blockquote></div>`).join("")}
          ${option.questions.map(q=>interviewQuestionRow(q,false)).join("")}
          <div class="row wrap">${btn("Сохранить проверку",`data-action="save-interview-role" data-vacancy="${enc(option.vacancyId)}"`,"secondary btn-sm","check")}
            <span class="small muted" data-related-status aria-live="polite"></span></div>
        </div>
      </details>`).join(""):`<p class="small muted">${plan.comparedVacancies ? "В источниках нет оснований предложить другую вакансию." : "Других опубликованных вакансий пока нет."}</p>`}
    </section>
  </div>`;
}

async function applicationDetail(id,renderRun) {
  const url="/hr/applications/"+enc(id);
  const a=await getJSON(url);
  const p=new URLSearchParams(location.search);
  const tabs=[["assessment","Разбор"],["interview","Вопросы для интервью"],["resume","Резюме"],["test","Тест"],["clarification","Уточнения"],["history","История"],["report","Справка"],["workflow","Взаимодействие"]];
  const active=tabs.find(([key])=>key===p.get("tab"))?.[0]||"assessment";
  const [evaluation,person,thread,history,employment,interview]=await Promise.all([
    active==="assessment" ? getJSON(url+"/assessment") : null,
    a.candidateId ? getJSON("/hr/candidates/"+enc(a.candidateId)+"?summary=1") : null,
    active==="clarification"&&a.clarificationThreadId ? getJSON("/hr/clarifications/"+enc(a.clarificationThreadId)) : null,
    active==="history" ? getJSON(url+"/history"+(p.get("cursor")?"?cursor="+enc(p.get("cursor")):"")) : null,
    a.stage.employmentId ? getJSON("/hr/employments/"+enc(a.stage.employmentId)) : null,
    a.stage.interviewId ? getJSON("/hr/interviews/"+enc(a.stage.interviewId)) : null
  ]);
  const record={a,evaluation,person,thread,history,employment,interview};
  let detail="";
  if(active==="assessment") detail=`<div class="stack">${cardHead("Разбор по критериям","Локальная проверка по источникам отклика.",
    evaluation.assessmentStatus!=="pending" ? link(pagePath(url,{tab:"interview",back:p.get("back")}),"Вопросы для интервью","secondary btn-sm","chat") : "")}${assessmentCards(evaluation)}</div>`;
  if(active==="interview") detail=interviewPlanPanel(await getJSON(url+"/interview-plan"),!a.outcome);
  if(active==="resume") detail=`<div class="stack">${cardHead("Исходное резюме")}${sourceCard(a)}</div>`;
  if(active==="test") detail=`<div class="stack">${cardHead("Тест при отклике",a.testStatus==="not_completed"?"Тест не заполнен.":"Сохранённые вопросы и ответы.")}${a.answers.length?a.answers.map(x=>`<article class="criterion"><h3>${esc(x.question)}</h3><div class="small pre">${known(x.value)}</div></article>`).join(""):empty("Тест не прикреплён")}</div>`;
  if(active==="clarification") detail=`<div class="stack">${cardHead("Уточнения кандидату","Ответы хранятся вместе с источником отклика.")}${thread ? thread.questions.map(q=>`<article class="criterion"><div class="chat-bubble pre">${esc(q.text)}</div>
    ${q.answer?`<div class="chat-answer pre">${esc(q.answer)}</div>`:chip("Ожидает ответа","amber",true)}</article>`).join(""):empty("Уточнений пока нет","","chat")}
    ${!a.outcome&&thread?.questions.some(q=>q.status==="open")&&(a.contact||person?.contact)?btn("Подготовить ссылку для кандидата",`data-action="clarify-link" data-id="${enc(thread.threadId)}"`,"secondary","link"):""}</div>`;
  if(active==="history") detail=`<div class="stack">${cardHead("История этапов")}
    <ol class="history">${history.items.map(e=>`<li><strong class="small">${esc(actions[e.action]||stages[e.toStage]?.[0]||"Обновление")}</strong><p class="tiny muted">${esc(date(e.occurredAt,true))} · ${esc(e.actorName)}</p>
    ${e.reason?`<p class="small">${esc(e.reason)}</p>`:""}</li>`).join("")}</ol>${pagination(history.nextCursor)}</div>`;
  if(active==="report") detail=reportPanel(await getJSON(url+"/report"));
  if(active==="workflow") detail=workflowPanel(...await Promise.all([getJSON(url+"/handoff"),getJSON(url+"/related-reviews?"+new URLSearchParams({cursor:p.get("reviewCursor")||""})),getJSON(url+"/interviews?"+new URLSearchParams({cursor:p.get("interviewCursor")||""}))]),!a.outcome);
  const activeIndex=["received","review","interview","decision"].indexOf(a.stage.currentStage);
  const back=returnLocation("/hr/applications");
  const backLabel=back.startsWith("/hr/candidates/")?"Назад к кандидату":back.startsWith("/hr/candidates")?"Назад к кандидатам":"Назад к откликам";
  if(renderRun===navRun)appDetailData=record;
  return `<div class="row wrap">${link(back,backLabel,"secondary btn-sm")}
    ${chip(sourceNames[a.sourceChannel])}</div>
  <div class="page-head"><div class="detail-title">${avatar(a.fullName)}<div class="grow"><h1 tabindex="-1">${esc(a.fullName)}</h1><p class="muted">${esc(a.vacancyTitle)}</p></div></div>${stagePill(a)}</div>
  <div class="details-grid"><section class="card pad stack"><nav class="tabs" aria-label="Материалы отклика">${tabs.map(([key,label])=>`<a data-link href="${esc(pagePath(url,{tab:key==="assessment"?"":key,back:p.get("back")}))}" ${key===active?'aria-current="page"':""}>${esc(label)}</a>`).join("")}</nav>${detail}</section>
  <aside class="stack">
    <section class="card pad stack-sm"><h2>Этап подбора</h2><div>${stagePill(a)}</div>
    ${a.triage && a.triage.status!=="closed" ? `<div class="note stack-sm">${intakeStatus(a.triage)}<p>${esc(intakeReasons[a.triage.reason])}</p></div>` : ""}
    <div class="stage-progress" aria-hidden="true">${Array.from({length:4},(_,i)=>`<i class="${i<=activeIndex?"filled":""}"></i>`).join("")}</div>
    ${a.stage.transitions.length?`<div class="stack-sm">${a.stage.transitions.map(action=>btn(actions[action],`data-action="transition" data-stage-action="${action}"`,action==="reject"?"danger":"primary",action==="reject"?"xCircle":"check")).join("")}</div>`:""}
    ${a.stage.currentStage==="decision"&&!a.stage.outcome&&!a.candidateId?'<p class="small muted">Чтобы оформить найм, подтвердите связь с карточкой кандидата.</p>':""}</section>
    <section class="card pad stack-sm"><h2>Карточка кандидата</h2>
      ${person?applicantCard(person):'<p class="small muted">Связь с профилем ждёт подтверждения.</p>'}
      ${a.outcome!=="hired"?btn(person?"Изменить связь":"Связать с профилем",'data-action="candidate-link"',"secondary","link"):""}
    </section>
    ${interviewCard(record)}${employmentCard(employment)}
    <section class="card pad stack-sm"><h2>Сведения об отклике</h2>${meta([["Email",known(a.contact)],["Дата получения",a.sourceReceivedAt?esc(date(a.sourceReceivedAt,true)):"Не указано"],...(a.sourceAccount?[["Учётная запись источника",esc(a.sourceAccount)]]:[]),...(a.sourceSubject?[["Тема письма",esc(a.sourceSubject)]]:[]),...(a.importedAt?[["Дата импорта",esc(date(a.importedAt,true))]]:[])])}</section>
  </aside></div>`;
}
async function candidatesView() {
  const p=new URLSearchParams(location.search);
  const r=await getJSON("/hr/candidates"+location.search);
  const columns=[["contact","Email"],["education","Образование"],["additionalEducation","Доп. образование"],["experience","Опыт"]];
  const shown=listSettings("kadry-candidate-columns",columns.map(([key])=>key));
  const visible=columns.filter(([key])=>shown.includes(key));
  const rows=r.items.map((x,i)=>{
    const unlinked=x.kind==="application";
    const url=listDetail(unlinked?"/hr/applications/"+enc(x.applicationId):"/hr/candidates/"+enc(x.candidateId));
    const summary=unlinked?`<span class="table-meta">${esc(x.vacancyTitle)} · ${esc(date(x.receivedAt))} · ${esc(sourceNames[x.sourceChannel])}</span>`:"";
    const actions=unlinked?`<div class="row wrap">${link(url+"&candidateAction=link","Связать","quiet btn-sm")}${link(url+"&candidateAction=create","Создать профиль","quiet btn-sm")}</div>`:"";
    return {href:url,cells:[`<div class="person-ct">${avatar(x.fullName,i)}<div><a data-link href="${esc(url)}" class="table-name">${esc(x.fullName)}</a>${summary}${actions}</div></div>`,...visible.map(([key])=>known(x[key]))]};
  });
  return `${heading("Кандидаты","Найдите профиль или новый отклик по фамилии.",btn("Создать профиль",'data-action="new-candidate"',"primary","plus"))}
  <form class="card pad row wrap" data-form="candidate-filter">${searchField(p.get("q"))}${input("skills","Навыки и опыт",{max:120,value:p.get("skills")})}${input("education","Образование",{max:160,value:p.get("education")})}${input("additionalEducation","Доп. образование",{max:160,value:p.get("additionalEducation")})}
  <div class="row wrap" style="align-self:end">${submit("Найти","search")}${link("/hr/candidates","Сбросить","quiet")}</div></form>
  <details class="card pad"><summary>Колонки реестра</summary><form data-form="candidate-columns" class="row wrap">${columns.map(([key,label])=>check(key,label,shown.includes(key))).join("")}${submit("Сохранить")}</form></details>
  <section class="card">${rows.length?table(["Кандидат",...visible.map(([,label])=>label)],rows):empty("Кандидаты не найдены","Измените параметры поиска или создайте профиль.","users")}${pagination(r.nextCursor)}</section>`;
}
async function candidateView(id) {
  const person=await getJSON("/hr/candidates/"+enc(id)+location.search);
  const source=person.factsSource?.type==="resume"?link("/hr/applications/"+enc(person.factsSource.applicationId)+"?tab=resume","Исходное резюме","quiet btn-sm","file"):person.factsSource?.actorName?`<div class="small muted">Запись HR · ${esc(person.factsSource.actorName)} · ${esc(date(person.factsSource.at))}</div>`:"";
  return `<div>${link(returnLocation("/hr/candidates"),"Назад к кандидатам","secondary btn-sm")}</div>${heading(person.fullName,person.contact||"Email не указан")}
  <section class="card pad stack-sm"><h2>Профиль кандидата</h2>${meta([["Образование",known(person.education)],["Доп. образование",known(person.additionalEducation)],["Опыт",known(person.experience)]])}${source}</section>
  <section class="card"><div class="table-title"><h2>История откликов</h2></div>${applicationTable(person.applications,true)}${pagination(person.nextCursor)}</section>
  ${actor.scoped?"":`<section class="card pad stack-sm">${cardHead("Архивные документы","",btn("Добавить документ",`data-action="archive-document" data-id="${enc(id)}"`,"secondary","upload"))}
  ${person.archiveDocuments.map(archiveDocumentView).join("") || '<p class="muted">Документов пока нет.</p>'}
  ${person.archiveNextCursor?link(pagePath(location.pathname,{archiveCursor:person.archiveNextCursor},true),"Следующие документы"):""}</section>`}`;
}
const archiveTypes={application:"Отклик",interview:"Интервью",decision:"Решение",other:"Другое"};
const archiveOutcomes={hired:"Принят",rejected:"Отказ",withdrawn:"Отозван",pending:"В работе"};
function archiveEventRow(event={}) {
  const id=crypto.randomUUID();
  return `<div class="criterion stack-sm" data-archive-event>
    ${pair(input("","Должность",{id:id+"_position",required:true,max:150,value:event.position,attrs:'data-event="position"'}),
      input("","Дата",{id:id+"_date",type:"date",value:event.date,attrs:'data-event="date"'}))}
    ${pair(input("","Вид",{id:id+"_type",content:choose("",[["","Не указан"],...Object.entries(archiveTypes)],event.type,`id="${id}_type" data-event="type"`)}),
      input("","Итог",{id:id+"_outcome",content:choose("",[["","Не указан"],...Object.entries(archiveOutcomes)],event.outcome,`id="${id}_outcome" data-event="outcome"`)}))}
    ${input("","Событие",{id:id+"_note",required:true,max:1200,value:event.note,attrs:'data-event="note"'})}
    ${input("","Фрагмент документа",{id:id+"_excerpt",type:"textarea",rows:2,max:500,optional:true,value:event.excerpt,attrs:'data-event="excerpt"'})}
    <div>${btn("Убрать событие",'data-action="remove-archive-event"',"quiet")}</div></div>`;
}
function archiveEventKey(event) {
  return JSON.stringify([event.position.trim().toLowerCase(),event.date,event.type||""]);
}
async function loadArchivePreview(form) {
  const status=form.querySelector("[data-archive-status]");
  const button=form.querySelector('[data-action="archive-preview"]');
  const submitButton=form.querySelector('[type="submit"]');
  const run=String((Number(form.dataset.previewRun)||0)+1);
  form.dataset.previewRun=run;
  const body=new FormData();
  const file=form.elements.resumeFile.files[0];
  const text=form.elements.text.value;
  if (file) body.set("resumeFile",file);
  body.set("text",text);
  body.set("candidateId",form.dataset.id);
  status.textContent="Читаем документ…";
  button.disabled=true;
  submitButton.disabled=true;
  try {
    const preview=await api("/hr/archive-previews",{method:"POST",body});
    if (!form.isConnected || form.dataset.previewRun!==run) return;
    if (form.elements.resumeFile.files[0]!==file || form.elements.text.value!==text) {
      status.textContent="Исходник изменён. Повторите разбор.";
      return;
    }
    if (!form.elements.title.value.trim()&&preview.title) form.elements.title.value=preview.title;
    const list=form.querySelector("[data-archive-events]");
    const existing=new Set([...list.children].map(row=>archiveEventKey(Object.fromEntries([...row.querySelectorAll("[data-event]")].map(el=>[el.dataset.event,el.value])))));
    for(const event of preview.events) {
      if(list.children.length>=20)break;
      const key=archiveEventKey(event);
      if(existing.has(key))continue;
      existing.add(key);
      list.insertAdjacentHTML("beforeend",archiveEventRow(event));
    }
    form.elements.sourceDigest.value=preview.events.length?preview.sourceDigest:"";
    status.textContent=preview.events.length
      ? `Найдено событий: ${number(preview.events.length)}. Проверьте даты, должности и фрагменты перед сохранением.${preview.truncated?" Проверьте, есть ли продолжение в исходнике.":""}`
      : preview.readable?"В тексте не найдено записей поддерживаемого формата. Можно добавить события вручную."
        :"Не удалось прочитать текст. Вставьте его из документа и повторите разбор.";
  } catch(error) {
    if (form.dataset.previewRun===run) status.textContent=error.message||"Не удалось разобрать документ.";
  } finally {
    if (form.dataset.previewRun===run) {
      button.disabled=false;
      submitButton.disabled=false;
    }
  }
}
function archiveDocumentView(doc) {
  const events=[...doc.events].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
  return `<details class="criterion"><summary>${esc(doc.title)} · ${esc(doc.sourceAccount)}</summary>
    <div class="stack-sm archive-doc-body">
      ${doc.attachment?`<a class="btn btn-secondary btn-sm" href="${base}/hr/archive-documents/${enc(doc.documentId)}">Скачать ${esc(doc.attachment.name)}</a>`:""}
      ${doc.education||doc.additionalEducation?meta([...(doc.education?[["Образование",esc(doc.education)]]:[]),...(doc.additionalEducation?[["Доп. образование",esc(doc.additionalEducation)]]:[])]):""}
      ${events.length?`<ol class="history">${events.map(e=>`<li><strong>${esc(e.position)}</strong>
        <p class="small muted">${esc([date(e.date),archiveTypes[e.type],archiveOutcomes[e.outcome]].filter(Boolean).join(" · "))}</p>
        <p class="small">${esc(e.note)}</p>${e.excerpt?`<blockquote class="quote small">${esc(e.excerpt)}</blockquote>`:""}</li>`).join("")}</ol>`:""}
      ${doc.text?`<details><summary>Исходный текст</summary><div class="resume">${esc(doc.text)}</div></details>`:""}
    </div></details>`;
}
function surveySummary(cards) {
  return `<div class="dashboard-grid">${cards.map(x=>{
    const names=[["Отправлено",number(x.sent)],["Ответили",number(x.answered)]];
    if(x.type==="voluntary_exit") names.push(...(x.reasons||[]).map(r=>[voluntaryReasons[r.category]||r.category,number(r.total)]));
    else names.push(["Средняя оценка понятности",x.averages.clarity==null?"—":number(x.averages.clarity)+" / 5"]);
    if(x.type==="exit_feedback") names.push(["Средняя оценка коммуникации",x.averages.communication==null?"—":number(x.averages.communication)+" / 5"]);
    return `<section class="card pad stack-sm">${cardHead(typeLabels[x.type],"",tile("feedback"))}${meta(names)}</section>`;
  }).join("")}</div>`;
}
const departureReasons={employer_initiated:"По инициативе работодателя",voluntary:"По инициативе сотрудника",agreement:"По соглашению сторон",other:"Другое"};
function departureSummary(rows) {
  const entries=rows.map(x=>({cells:[esc(x.department),esc(x.month),esc(departureReasons[x.category]||departureReasons.other),number(x.total)]}));
  return `<section class="card"><div class="table-title"><h2>Увольнения по подразделениям</h2></div>
    ${entries.length ? table([["Подразделение",32],["Месяц",16],["Основание",39],["Ушли",13]],entries) : empty("Увольнений за период нет")}</section>`;
}
function operationsPanel(ops,p,canUseGigaChat) {
  const filters=Object.fromEntries(["vacancyId","from","to"].map(key=>[key,p.get(key)]));
  const waiting=pagePath("/hr/applications",{...filters,handoff:"waiting"});
  const idle=pagePath("/hr/applications",{...filters,activity:"without_action"});
  const rows=ops.channels.map(row=>({cells:[esc(sourceNames[row.channel]||sourceNames.unknown),number(row.received),number(row.withoutAction)]}));
  const briefQuery=new URLSearchParams(Object.entries(filters).filter(([,value])=>value));
  return `<section class="card pad stack">
    ${cardHead("Рабочая нагрузка","По откликам выбранного периода. Архивная история учитывается отдельно.",
      ops.channels.length ? btn(canUseGigaChat?"Приоритеты с GigaChat":"Показать приоритеты",`data-action="analytics-brief" data-query="${esc(briefQuery)}"`,"secondary","bars"):"")}
    <div class="dashboard-grid">
      <section class="criterion stack-sm"><h3>Первое действие</h3>
        ${meta([["Открытые без действий",number(ops.withoutAction)],["Медиана от регистрации",ops.firstAction.medianMinutes==null?"Нет замеров":number(ops.firstAction.medianMinutes)+" мин"],
          ["Откликов с замером",number(ops.firstAction.samples)]])}
        <p class="muted small">Считается первое записанное действие по этапу.</p>
        ${ops.withoutAction?link(idle,"Открыть очередь без действий","quiet btn-sm"):""}
      </section>
      <section class="criterion stack-sm"><h3>Ответы подразделений</h3>
        ${meta([["Ожидаем",number(ops.handoffs.waiting)],["Из них просрочено",number(ops.handoffs.overdue)],["Получен ответ",number(ops.handoffs.answered)]])}
        ${ops.handoffs.waiting?link(waiting,"Открыть ожидающие карточки","quiet btn-sm"):""}
      </section>
    </div>
    <div class="note stack-sm" data-analytics-brief aria-live="polite" hidden></div>
    <div class="stack-sm"><h3>Нагрузка по источникам</h3>
      ${rows.length?table(["Источник","Поступило","Без действий"],rows,{tight:true}):'<p class="muted small">За этот период откликов нет.</p>'}</div>
  </section>`;
}
async function analyticsView() {
  const p=new URLSearchParams(location.search);
  const [stats,menu]=await Promise.all([getJSON("/hr/analytics"+location.search),vacancyMenu(p.get("vacancyId"))]);
  const data=stats.funnel.map(x=>({ cells:[`<strong>${esc(stages[x.stage][0])}</strong>`,number(x.reached),number(x.current),number(x.rejected)]}));
  return `${heading("Аналитика найма","Этапы подбора и ответы на анкеты по выбранной вакансии и периоду.")}
  <form class="card pad filters filters-small" data-form="analytics-filter"><input type="hidden" name="separateSurveys" value="1">${vacancySelect(menu,p.get("vacancyId"))}
  ${["surveyFrom","surveyTo"].map(name=>`<input type="hidden" name="${name}" value="${esc(p.get(name)||"")}">`).join("")}
  ${input("from","С даты",{type:"date",value:p.get("from")})}${input("to","По дату",{type:"date",value:p.get("to")})}
  <div class="row wrap">${submit("Применить","funnel")}${link("/hr/analytics","Сбросить","quiet")}</div>${errors}</form>
  ${metrics(stats.totals)}
  ${operationsPanel(stats.operations,p,stats.canUseGigaChat)}
  <div class="dashboard-grid"><section class="card pad">${cardHead("Динамика откликов",stats.series.length===31?"Первые 31 день периода":"Отклики по дням")}${spark(stats.series)}</section>
  <section class="card pad">${cardHead("Воронка найма","Дошли до этапа",tile("funnel"))}${funnelChart(stats.funnel,stats.totals.received)}</section></div>
  <section class="card"><div class="table-title"><h2>Детализация по этапам</h2></div>${table([["Этап",30],["Дошли",23],["Сейчас на этапе",25],["Отказ",22]],data)}</section>
  ${stats.departures ? departureSummary(stats.departures) : ""}
  <section class="stack-sm"><h2>Обратная связь</h2>
  <form class="card pad row wrap" data-form="analytics-filter">
    ${["vacancyId","from","to"].map(name=>`<input type="hidden" name="${name}" value="${esc(p.get(name)||"")}">`).join("")}
    <input type="hidden" name="separateSurveys" value="1">
    ${input("surveyFrom","Анкеты отправлены с",{type:"date",value:p.get("surveyFrom")})}
    ${input("surveyTo","Анкеты отправлены по",{type:"date",value:p.get("surveyTo")})}
    <div class="row" style="align-self:end">${submit("Применить к анкетам","funnel")}</div>
  </form>${surveySummary(stats.surveys)}</section>`;
}
async function feedbackView() {
  const p=new URLSearchParams(location.search);
  const type=actor.role==="admin"&&Object.hasOwn(typeLabels,p.get("type"))?p.get("type"):"interview_feedback";
  const status=p.get("status")||"";
  const [r,analytics]=await Promise.all([
    getJSON(pagePath("/hr/survey-invitations",{type,status,cursor:p.get("cursor"),limit:8})),
    getJSON("/hr/analytics")
  ]);
  const rows=r.items.map((item,i)=>({ cells:[
    `<div class="person-ct">${avatar(item.fullName,i)}<div><a class="table-name" data-link href="/hr/applications/${enc(item.applicationId)}">${esc(item.fullName)}</a><span class="table-meta">${esc(item.vacancyTitle)}</span></div></div>`,
    chip(...(invitationLabels[item.status]||invitationLabels.prepared),true),esc(date(item.sentAt)),
    btn("Открыть",`data-action="invitation" data-id="${esc(item.invitationId)}"`,"secondary btn-sm","feedback")
  ] }));
  const nav=Object.entries(typeLabels).filter(([id])=>id==="interview_feedback"||actor.role==="admin").map(([id,label])=>`<a data-link href="/hr/feedback?type=${id}" ${type===id?'aria-current="page"':""}>${esc(label)}</a>`).join("");
  const overview=analytics.surveys.filter(item=>item.type===type);
  const filters=[["","Все анкеты"],["prepared","К отправке"],["sent","Ждут ответа"],["answered","С ответами"]].map(([value,label])=>link(pagePath("/hr/feedback",{type,status:value}),label,status===value?"secondary btn-sm":"quiet btn-sm")).join("");
  return `${heading("Обратная связь","Отдельно по интервью и увольнениям.")}
  <nav class="tabs" aria-label="Тип анкеты">${nav}</nav>${surveySummary(overview)}
  <div class="row wrap" aria-label="Фильтр анкет">${filters}</div>
  <section class="card">${rows.length?table([["Получатель",39],["Статус",22],["Отправлена",22],["",17]],rows):empty("Анкет в этой выборке нет","","feedback")}${pagination(r.nextCursor)}</section>`;
}
async function publicVacancies() {
  const r=await getJSON("/public/vacancies"+location.search);
  const cards=r.items.map(v=>`<article class="card vac-card"><div class="row between align-start">${tile("brief")}${v.hasTest?chip("С тестом","purple"):""}</div>
    <div><h2><a data-link href="/vacancies/${enc(v.slug)}">${esc(v.title)}</a></h2><p class="vac-meta">${esc(v.department)}</p></div>
    <p class="small muted">${esc(v.description)}</p>
    <div class="row muted small">${ic("pin")}${esc(v.location)}</div><div class="vac-foot">${link("/vacancies/"+enc(v.slug),"Посмотреть вакансию","secondary")}</div></article>`).join("");
  return `<section class="hero"><div class="hero-body"><div class="hero-kicker">${ic("building")} Нижний Новгород</div>
    <h1 tabindex="-1">Работа в городской команде</h1><p>Вакансии муниципальных подразделений Нижнего Новгорода.</p></div>${city()}</section>
    <section class="stack"><h2>Открытые вакансии</h2>${cards?`<div class="list-grid">${cards}</div>`:`<div class="card">${empty("Открытых вакансий пока нет","","brief")}</div>`}${pagination(r.nextCursor)}</section>`;
}
async function prepareGuest() {
  return getJSON("/public/session");
}
async function publicVacancyView(slug) {
  const v=await getJSON("/public/vacancies/"+enc(slug));
  const apply=new URLSearchParams(location.search).get("apply")==="1";
  if (apply) {
    const { syntheticOnly } = await prepareGuest();
    return `<div class="public-narrow stack"><div>${link("/vacancies/"+enc(slug),"К вакансии","quiet btn-sm","brief")}</div>
    ${heading("Отклик на вакансию",v.title)}
    <form data-form="public-application" data-vacancy="${esc(v.vacancyId)}" data-version="${esc(v.publishedVersionId)}" data-test="${esc(v.testVersionId||"")}" data-slug="${esc(slug)}" data-require-resume="${v.formFields.find(f=>f.id==="resume")?.required!==false?"1":"0"}" class="card pad stack">
      ${syntheticOnly ? `<p class="note">Учебная форма. Используйте вымышленные имя, email и резюме.</p>${check("demoAcknowledged","Использую вымышленные данные")}` : ""}
      ${pair(input("fullName","Фамилия и имя",{required:true,max:160,attrs:syntheticOnly?'autocomplete="off"':'autocomplete="name"'}),input("contact","Email для связи",{type:"email",required:true,max:254,...(syntheticOnly?{placeholder:"candidate@example.test",attrs:'autocomplete="off"'}:{attrs:'autocomplete="email"'})}))}
      ${resumeFields(v.formFields.find(f=>f.id==="resume")?.required!==false)}
      ${v.questions.length?`<div class="form-block stack"><h2>Вопросы при отклике</h2>${v.questions.map(q=>input("answer_"+q.id,q.text,{type:"textarea",required:q.required,optional:!q.required,max:2000,attrs:`data-question="${esc(q.id)}"`})).join("")}</div>`:""}
      ${errors}<div>${submit("Отправить отклик","check")}</div>
    </form></div>`;
  }
  return `<div>${link("/vacancies","Все вакансии","quiet btn-sm","brief")}</div>
    ${heading(v.title,v.department)}
    <div class="job-detail"><section class="card pad stack"><h2>Описание вакансии</h2><div class="pre job-content">${esc(v.description)}</div></section>
    <aside class="card pad stack"><h2>Условия и отклик</h2><div class="row muted small">${ic("pin")}${esc(v.location)}</div><div class="row muted small">${ic("clock")}${esc(v.schedule)}</div>
    ${v.questions.length?`<p class="note">${v.questions.length===1?"В форме отклика будет один вопрос.":`В форме отклика будет несколько вопросов (${v.questions.length}).`}</p>`:""}
    ${link("/vacancies/"+enc(slug)+"?apply=1","Откликнуться","primary","check")}</aside></div>`;
}
function chatForm(thread) {
  if(thread.closed)return '<section class="card pad"><p class="note">Уточнения закрыты. Подбор по этому отклику завершён.</p></section>';
  const open=thread.questions.filter(q=>q.status==="open");
  return `<section class="card pad stack"><h2>Уточнения по отклику</h2><p class="small muted">Отвечайте только о рабочих навыках и опыте. Не указывайте сведения о здоровье, семье и контакты других людей.</p>
    <form class="stack" data-form="clarifications" data-id="${esc(thread.threadId)}">
    ${thread.questions.map((q,i)=>`<article class="criterion"><h3 class="chat-bubble">${esc(q.text)}</h3>${q.status==="answered"?`<div class="chat-answer pre">${esc(q.answer)}</div>`:input("q_"+q.questionId,"Ваш ответ",{type:"textarea",max:2000,attrs:`data-question="${esc(q.questionId)}"`,placeholder:"Ответьте на этот вопрос, если можете уточнить детали"})}</article>`).join("")}
    ${errors}${open.length?`<div>${submit("Отправить ответы","check")}</div>`:'<p class="note">Ответы сохранены. Спасибо!</p>'}</form></section>`;
}
async function receiptView(code, generation) {
  const r=await getJSON("/public/receipts/"+enc(code));
  const thread=r.clarificationThreadId?await getJSON("/public/clarifications/"+enc(r.clarificationThreadId)):null;
  if(r.assessmentStatus==="pending"){ activeReceipt=code; setTimeout(()=>{
    if(activeReceipt===code && generation===navRun) render();
  },1600); }
  const label={ pending:"Проверяем, нужны ли уточнения.",ready:thread?"Можно ответить на вопросы ниже.":"Кадровая команда получила ваш отклик.",failed:"Кадровая команда проверит резюме вручную." };
  const progress={received:"Отклик получен",review:"На рассмотрении",interview:"Этап интервью",decision:"Рассматривается решение"};
  const finalStatus={hired:"Принят на работу",rejected:"Отбор завершён"};
  const status=r.outcome?finalStatus[r.outcome]:progress[r.stage];
  return `<div class="public-narrow stack"><div class="card pad stack success-banner">${tile("check","green")}<h1 tabindex="-1">Статус отклика</h1>
    <div class="small muted">Номер отклика <span class="receipt-code">${esc(code)}</span></div><strong>${esc(status||progress.received)}</strong>
    ${!r.outcome?`<p class="small muted">${esc(label[r.assessmentStatus]||label.ready)}</p>`:""}
    ${r.candidateMessage?`<p class="note pre">${esc(r.candidateMessage)}</p>`:""}
    <p class="tiny muted">Сохраните ссылку и открывайте её в этом браузере.</p></div>
    ${thread&&!r.outcome?chatForm(thread):""}</div>`;
}
async function clarificationView(id) {
  const thread=await getJSON("/public/clarifications/"+enc(id));
  return `<div class="public-narrow stack">${heading("Уточнение отклика")}${chatForm(thread)}</div>`;
}
async function clarificationAccess(token) {
  return `<div class="public-narrow card pad stack">${heading("Уточнение отклика","Откройте вопросы, которые кадровая команда отправила по вашему резюме.")}
    <form class="stack" data-form="clarification-access" data-token="${esc(token)}">${errors}<div>${submit("Открыть вопросы","chat")}</div></form></div>`;
}
async function surveyView(token) {
  const data=submission===token?{submitted:true}:await getJSON("/public/surveys/"+enc(token));
  if(data.submitted) return `<div class="public-narrow card pad stack success-banner">${tile("check","green")}<h1 tabindex="-1">Спасибо за обратную связь</h1><p class="muted small">Ваш ответ сохранён.</p></div>`;
  return `<div class="public-narrow card pad stack-lg">${heading(data.title,"Заполнение анкеты добровольное.")}
  <p class="note">${esc(data.audience)}</p><form class="stack-lg" data-form="survey" data-token="${esc(token)}">
    ${data.questions.map(q=>q.type==="rating"?`<fieldset class="rating-set" data-rating="${esc(q.id)}"><legend>${esc(q.text)}</legend><div class="rating">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${esc(q.id)}" value="${n}" required><span>${n}</span></label>`).join("")}</div></fieldset>`:q.type==="choice"?selectField(q.id,q.text,[["","Выберите ответ"],...Object.entries(q.options)],"","required"):input(q.id,q.text,{type:"textarea",optional:!q.required,max:1200})).join("")}
    ${errors}<div>${submit("Отправить ответ","check")}</div>
  </form></div>`;
}
function showDialog(title, content) {
  const replacing=modal.open;
  modal.innerHTML=`<div class="dialog-head"><h2 id="dialog-title" tabindex="-1">${esc(title)}</h2>${btn("","data-action=close-dialog aria-label=\"Закрыть\"","quiet btn-icon","close")}</div><div class="dialog-body">${content}</div>`;
  if(!replacing) modal.showModal(); else modal.querySelector("#dialog-title").focus();
  modal.scrollTop=0;
  modal.querySelector("[data-evidence-mark]")?.scrollIntoView({block:"center"});
}
function candidateForm(a) {
  return `<form class="stack" data-form="create-candidate" data-link-id="${esc(a?.applicationId||"")}">${errors}
  ${input("fullName","Фамилия и имя",{max:160,required:true,value:a?.fullName||""})}${input("contact","Email",{type:"email",max:254,optional:true,value:a?.contact||""})}
  ${input("education","Образование",{max:500,optional:true})}${input("additionalEducation","Доп. образование",{max:500,optional:true})}${input("experience","Опыт",{type:"textarea",max:1000,optional:true})}
  <div>${submit(a?"Создать и связать":"Создать профиль","check")}</div></form>`;
}
async function candidateMatches(query, append = false, cursor = "") {
  const seq=++candidateSearchSeq;
  const result=await getJSON("/hr/candidates?q="+enc(query)+"&profilesOnly=1&limit=8"+(cursor?"&cursor="+enc(cursor):""));
  const target=modal.querySelector("[data-matches]");
  if(!target||seq!==candidateSearchSeq)return;
  const items=result.items.map(x=>`<div class="criterion"><div class="row align-start">
    ${avatar(x.fullName)}<div class="grow"><strong>${esc(x.fullName)}</strong><p class="muted small">${known(x.contact)}</p>${x.education?`<p class="tiny muted">${esc(x.education)}</p>`:""}</div>
    ${btn("Связать",`data-action="confirm-candidate" data-id="${enc(x.candidateId)}"`,"secondary btn-sm","link")}</div></div>`).join("");
  if(!append) target.innerHTML="";
  target.querySelector("[data-action=more-candidates]")?.remove();
  target.insertAdjacentHTML("beforeend",items||(!append?'<p class="muted small">Профили не найдены.</p>':""));
  if(result.nextCursor)target.insertAdjacentHTML("beforeend",btn("Следующие кандидаты",`data-action="more-candidates" data-cursor="${esc(result.nextCursor)}"`,"quiet btn-sm"));
}
async function candidateLinkModal() {
  const {a}=appDetailData;
  connectData={applicationId:a.applicationId, query:a.fullName.trim().split(/\s+/u).at(-1)||""};
  showDialog("Связать с кандидатом",`<div class="stack"><p class="small muted">Сверьте имя и контакт. Выбранный профиль получит этот отклик в истории.</p>
    <form class="row wrap" data-form="candidate-picker">${searchField(connectData.query,"Поиск по ФИО","data-candidate-search")}
    <div style="align-self:end">${submit("Найти","search")}</div></form>
    <div class="stack-sm" data-matches aria-live="polite"><div class="spinner" aria-label="Ищем совпадения"></div></div><div>${btn("Создать новый профиль",'data-action="new-linked-candidate"',"primary","plus")}</div></div>`);
  await candidateMatches(connectData.query);
}
function letterDialog(data) {
  const [label,color]=invitationLabels[data.status]||invitationLabels.prepared;
  const response=data.response;
  const answers=response?.answers.map(a=>[a.questionId==="clarity"?"Понятность":a.questionId==="communication"?"Коммуникация":"Комментарий",typeof a.value==="number"?number(a.value)+" / 5":known(a.value)])||[];
  showDialog(typeLabels[data.type]||"Приглашение",`<div class="stack">
    <div class="row wrap between"><h3>${esc(data.fullName)}</h3>${chip(label,color,true)}</div>
    ${meta([["Email",known(data.contact)],["Отправлена",esc(date(data.sentAt,true))],["Срок действия",esc(date(data.expiresAt,true))]])}
    ${response?`<section class="form-block stack"><h3>Ответ от ${esc(date(response.answeredAt,true))}</h3>${meta(answers)}</section>`:""}
    ${data.link?`<div class="stack-sm">${input("survey_link","Персональная ссылка",{value:data.link,attrs:"readonly data-copy-source"})}
      <div class="row wrap">${btn("Скопировать ссылку",'data-action="copy"',"secondary","copy")}<a class="btn btn-secondary" href="${esc(data.link)}" target="_blank" rel="noopener noreferrer">Открыть анкету</a></div>
      ${input("letter","Текст письма",{type:"textarea",rows:5,value:data.letter.text,attrs:"readonly"})}</div>`:""}
    ${!data.sentAt&&(data.link||data.response)?btn("Отметить отправленной",`data-action="mark-sent" data-id="${esc(data.invitationId)}"`,"primary","check"):""}
  </div>`);
}
function clarifyLetter(data) {
  showDialog("Ссылка для уточнения",`<div class="stack"><p class="muted small">Отправьте ссылку на проверенный контакт. Она действует до ${esc(date(data.expiresAt,true))} и открывает один чат.</p>
  ${input("clarification_url","Персональная ссылка",{value:data.link,attrs:"readonly data-copy-source"})}<div>${btn("Скопировать ссылку",'data-action="copy"',"secondary","copy")}</div></div>`);
}
function loadError(error, isHr) {
  const expired=error.status===410;
  const title=expired?"Ссылка недоступна":error.status===404?"Страница не найдена":error.status===403?"Доступ ограничен":"Не удалось загрузить страницу";
  const main=`<div class="${isHr?"":"public-narrow "}card">${empty(title,error.message,expired?"clock":"inbox",link(isHr?"/hr":"/vacancies",isHr?"К обзору":"К вакансиям","primary"))}</div>`;
  return isHr?hrShell(main):publicShell(main);
}
async function render({focus=false}={}) {
  const run=++navRun;
  const path=location.pathname.replace(/\/$/,"")||"/";
  const bits=path.split("/").filter(Boolean);
  const isHr=path==="/hr"||path.startsWith("/hr/");
  activeReceipt="";
  try {
    const isDepartment=path==="/department";
    if(path==="/"||isHr||isDepartment) {
      const session=await getJSON("/auth/session");
      if(run!==navRun)return;
      actor=session.actor;
      demoAvailable=session.demoAvailable;
      if(path==="/")return go(actor?.role==="department"?"/department":actor?"/hr":"/vacancies",true);
      if(isHr&&actor?.role==="department")return go("/department",true);
      if (!session.authenticated) {
        app.innerHTML=loginView(isDepartment);
        document.title="Вход · Кадры · Горький";
        return;
      }
    }
    let view;
    if(isDepartment) view=await departmentView();
    else if(isHr) {
      if(bits.length===1)view=await overview();
      else if(bits[1]==="vacancies")view=bits[2]?await editVacancyPage(bits[2]):await listVacancies();
      else if(bits[1]==="applications")view=bits[2]?await applicationDetail(bits[2],run):await applicationList();
      else if(bits[1]==="candidates")view=bits[2]?await candidateView(bits[2]):await candidatesView();
      else if(bits[1]==="analytics")view=await analyticsView();
      else if(bits[1]==="feedback")view=await feedbackView();
    } else {
      if(bits[0]==="vacancies")view=bits[1]?await publicVacancyView(bits[1]):await publicVacancies();
      if(bits[0]==="receipts")view=await receiptView(bits[1],run);
      if(bits[0]==="clarifications")view=bits[1]==="access"?await clarificationAccess(bits[2]):await clarificationView(bits[1]);
      if(bits[0]==="surveys")view=await surveyView(bits[1]);
    }
    if(run!==navRun)return;
    if(view==null)throw Object.assign(new Error("Проверьте адрес страницы."),{status:404});
    app.innerHTML=isHr?hrShell(view):publicShell(view);
    const title=app.querySelector("h1");
    document.title=(title?.textContent?title.textContent+" · ":"")+"Кадры · Горький";
    if(focus)title?.focus({preventScroll:true});
    syncPriorityFilter();
    const candidateAction=new URLSearchParams(location.search).get("candidateAction");
    if (bits[1]==="applications" && bits[2] && ["link","create"].includes(candidateAction)) {
      history.replaceState(history.state,"",pagePath(location.pathname,{candidateAction:null},true));
      if(candidateAction==="link") await candidateLinkModal();
      else showDialog("Создать профиль",candidateForm(appDetailData.a));
    }
  } catch(error) {
    if(run===navRun)app.innerHTML=loadError(error,isHr&&!!actor);
  }
}
function currentPage() { return location.pathname + location.search; }
function rememberQueue() { if (returnPath(location.pathname)) queueScroll.set(currentPage(),window.scrollY); }
async function go(url, replace=false) {
  if(url!==currentPage()) {
    rememberQueue();
    history[replace?"replaceState":"pushState"]({},"",url);
  }
  if(modal.open)modal.close();
  await render({focus:true});
  window.scrollTo(0,queueScroll.get(currentPage()) || 0);
}
history.scrollRestoration = "manual";
window.addEventListener("popstate",async()=>{ if(modal.open)modal.close(); await render({focus:true}); window.scrollTo(0,queueScroll.get(currentPage()) || 0); });
function syncPriorityFilter() {
  const form=document.querySelector('[data-form="app-filters"]');
  if(!form) return;
  const enabled=Boolean(form.elements.vacancyId.value);
  form.elements.priority.disabled=!enabled;
  if(!enabled) form.elements.priority.checked=false;
  form.querySelector("[data-priority-hint]").hidden=enabled;
}
function formError(form,error) {
  const box=form.querySelector("[data-form-error]");
  if(box){
    box.textContent=error.message||"Ошибка при сохранении.";
    box.hidden=false;
    if(error.code==="vacancy_version_changed") {
      const reload=document.createElement("a");
      reload.href=location.href;
      reload.className="text-link";
      reload.textContent=" Открыть обновлённую форму";
      box.append(reload);
    }
  } else toast(error.message,true);
  for(const f of error.fields||[]) {
    const item=form.elements.namedItem(f.field);
    if(item instanceof HTMLElement)item.setAttribute("aria-invalid","true");
  }
  const first=form.querySelector('[aria-invalid="true"]');
  if(first) first.focus();
  else box?.scrollIntoView({block:"nearest"});
}
function clearFormError(form) {
  const box=form.querySelector("[data-form-error]");
  if(box)box.hidden=true;
  for(const field of form.querySelectorAll('[aria-invalid="true"]'))field.removeAttribute("aria-invalid");
}
const zKeys = new WeakMap();
const keyFor = (form,purpose) => {
  let keys=zKeys.get(form);
  if(!keys){keys=new Map();zKeys.set(form,keys);}
  if(!keys.has(purpose))keys.set(purpose,crypto.randomUUID());
  return keys.get(purpose);
};
async function mutate(form,purpose,path,method,body) {
  const key=keyFor(form,purpose);
  try {
    const value=await api(path,{method,body,key});
    zKeys.get(form)?.delete(purpose);
    return value;
  } catch(error) {
    if(error.status&&error.status<500)zKeys.get(form)?.delete(purpose);
    throw error;
  }
}
function convertSlug(raw) {
  const cyr="абвгдежзийклмнопрстуфхцчшщъыьэюя";
  const latin="a b v g d e zh z i y k l m n o p r s t u f kh ts ch sh shch  y  e yu ya".split(" ");
  return raw.toLowerCase().replaceAll("ё","е").split("").map(c=>cyr.includes(c)?latin[cyr.indexOf(c)]:c).join("").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90);
}
function applicationForm(form, mode) {
  const data=new FormData(form);
  const file=data.get("resumeFile");
  const text=String(data.get("resumeText")||"").trim();
  if(file?.size>5*1024*1024)throw Object.assign(new Error("Размер файла превышает 5 МБ."),{fields:[{field:"resumeFile"}]});
  if(!file?.size)data.delete("resumeFile");
  if(!file?.size&&!text&&(mode==="import"||form.dataset.requireResume==="1"))throw Object.assign(new Error("Добавьте текст или файл резюме."),{fields:[{field:"resumeText"}]});
  if(mode==="public") {
    data.set("vacancyId",form.dataset.vacancy);
    data.set("publishedVersionId",form.dataset.version);
    if(form.dataset.test)data.set("testVersionId",form.dataset.test);
    const answers=Array.from(form.querySelectorAll("[data-question]")).map(x=>({questionId:x.dataset.question,value:x.value}));
    answers.forEach(q=>data.delete("answer_"+q.questionId));
    data.set("answers",JSON.stringify(answers));
  }
  return data;
}
const submitHandlers = {
  async login(form,f) {
    await mutate(form,"login","/auth/login","POST",{user:f.get("user"),password:f.get("password")});
    await render();
  },
  async vacancy(form,f,trigger) {
    captureVacancyParts(form);
    const body=Object.fromEntries(["title","department","location","schedule","slug","description"].map(x=>[x,f.get(x)]));
    Object.assign(body,vacancyParts,{formFields:[{id:"resume",required:f.has("resumeRequired")}]});
    const current=form.dataset.id;
    if(!current&&form.dataset.requisition)body.requisitionId=form.dataset.requisition;
    const v=await mutate(form,"save",current?"/hr/vacancies/"+enc(current)+"/draft":"/hr/vacancies",current?"PUT":"POST",body);
    form.dataset.id=v.vacancyId;
    const doPublish=trigger?.value==="publish";
    if(doPublish)await mutate(form,"publish","/hr/vacancies/"+enc(v.vacancyId)+"/publish","POST",{});
    toast(doPublish?"Вакансия опубликована.":"Черновик сохранён.");
    await go("/hr/vacancies/"+enc(v.vacancyId));
  },
  async "app-filters"(form,f) {
    await go(pagePath("/hr/applications",Object.fromEntries(f)));
  },
  async "candidate-columns"(form,f) {
    localStorage.setItem("kadry-candidate-columns",JSON.stringify([...f.keys()]));
    await render();
  },
  async "candidate-filter"(form,f) {
    await go(pagePath("/hr/candidates",Object.fromEntries(f)));
  },
  async "analytics-filter"(form,f) {
    if(f.get("from")&&f.get("to")&&f.get("from")>f.get("to"))throw Object.assign(new Error("Дата окончания должна быть позже даты начала."),{fields:[{field:"to"}]});
    if(f.get("surveyFrom")&&f.get("surveyTo")&&f.get("surveyFrom")>f.get("surveyTo"))throw Object.assign(new Error("Проверьте период отправки анкет."),{fields:[{field:"surveyTo"}]});
    await go(pagePath("/hr/analytics",Object.fromEntries(f)));
  },
  async "candidate-picker"(form,f) {
    connectData.query=String(f.get("q")||"").trim();
    await candidateMatches(connectData.query);
  },
  async "email-import"(form,f) {
    const file=f.get("emailFile");
    if(file.size>5*1024*1024) throw new Error("Размер письма превышает 5 МБ.");
    const a=await mutate(form,"email","/hr/email-imports","POST",f);
    toast("Почтовый отклик готов к проверке.");
    await go(listDetail("/hr/applications/"+enc(a.applicationId)));
  },
  async "related-review"(form,f) {
    await mutate(form,"related","/hr/applications/"+enc(appDetailData.a.applicationId)+"/related-reviews","POST",{vacancyId:f.get("vacancyId")});
    await go(currentPage());
  },
  async handoff(form,f) {
    await mutate(form,"handoff","/hr/applications/"+enc(appDetailData.a.applicationId)+"/handoff","POST",
      {assigneeId:f.get("assigneeId"),dueAt:f.get("dueAt")+":00+03:00",note:f.get("note"),previewDigest:form.dataset.preview});
    await go(currentPage());
  },
  async "interview-answer"(form,f) {
    await mutate(form,"interview-note","/hr/applications/"+enc(appDetailData.a.applicationId)+"/interview-notes","POST",
      {criterionId:form.dataset.criterion||null,question:f.get("question"),text:f.get("text"),nextStep:f.get("nextStep")});
    toast("Ответ записан.");
    await go(currentPage());
  },
  async "handoff-response"(form,f) {
    await mutate(form,"handoff-response","/department/handoffs/"+enc(form.dataset.id)+"/response","POST",Object.fromEntries(f));
    await go(currentPage());
  },
  async requisition(form,f) {
    const id=form.dataset.id;
    await mutate(form,"requisition","/department/requisitions"+(id?"/"+enc(id):""),id?"PUT":"POST",Object.fromEntries(f));
    toast("Черновик заявки сохранён.");
    await go(currentPage());
  },
  async "vacancy-changes"(form,f) {
    await mutate(form,"vacancy-changes",location.pathname+"/request_changes","POST",{draftNumber:Number(form.dataset.draft),note:f.get("note")});
    await go(currentPage());
  },
  async "import-application"(form) {
    const a=await mutate(form,"application","/hr/applications","POST",applicationForm(form,"import"));
    toast("Отклик сохранён.");
    await go(listDetail("/hr/applications/"+enc(a.applicationId)));
  },
  async "import-files"(form,f) {
    const files=[...form.elements.resumeFiles.files];
    if(!files.length||files.length>20)throw new Error("Выберите от 1 до 20 файлов.");
    const statuses=[...form.querySelectorAll("[data-file-status]")];
    let saved=0;
    for(const [index,file] of files.entries()){
      const status=statuses[index];
      if(status.dataset.done==="1"){saved++;continue;}
      status.textContent="Загружаем…";
      const body=new FormData();
      body.set("vacancyId",f.get("vacancyId"));
      body.set("fullName",f.get("file_name_"+index));
      body.set("resumeFile",file);
      body.set("fileIntake","on");
      try{
        if(file.size>5*1024*1024)throw new Error("Файл больше 5 МБ.");
        const response=await mutate(form,"file_"+index,"/hr/applications","POST",body);
        status.innerHTML=link(listDetail("/hr/applications/"+enc(response.applicationId)),"Открыть отклик","quiet btn-sm");
        status.dataset.done="1";
        saved++;
      }catch(error){status.textContent=error.message;}
    }
    form.querySelector("[data-file-summary]").textContent=`В очереди ${saved} из ${files.length} откликов.`;
    if(saved===files.length)form.querySelector('button[type="submit"]').hidden=true;
  },
  async "import-archive"(form,f) {
    const file=f.get("archive");
    if(file.size>120*1024)throw Object.assign(new Error("Допустимый размер архива — 120 КБ."),{fields:[{field:"archive"}]});
    let data;
    try { data=JSON.parse(await file.text()); } catch { throw Object.assign(new Error("Не удалось прочитать JSON. Проверьте формат файла."),{fields:[{field:"archive"}]}); }
    const items=Array.isArray(data)?data:data?.items;
    if(!Array.isArray(items)||!items.length||items.length>20)throw new Error("В архиве должно быть от 1 до 20 откликов.");
    const r=await mutate(form,"archive","/hr/application-imports","POST",{vacancyId:f.get("vacancyId"),sourceChannel:f.get("sourceChannel"),sourceAccount:f.get("sourceAccount"),items});
    form.querySelector("[data-import-result]").innerHTML=`<div class="note stack-sm"><strong>Принято ${number(r.accepted.length)} из ${number(items.length)}</strong>
      ${r.duplicates.map(x=>`<p>Строка ${x.index+1}. ${link("/hr/applications/"+enc(x.applicationId),"Уже принята","quiet btn-sm")}</p>`).join("")}
      ${r.errors.map(x=>`<p>Строка ${x.index+1}. ${esc(x.message)}</p>`).join("")}${link("/hr/applications","Открыть отклики","secondary btn-sm")}</div>`;
    form.querySelector('button[type="submit"]').hidden=true;
  },
  async "archive-document"(form,f) {
    const events=[...form.querySelectorAll("[data-archive-event]")].map(row=>Object.fromEntries([...row.querySelectorAll("[data-event]")].map(input=>[input.dataset.event,input.value])));
    f.set("candidateId",form.dataset.id);
    f.set("events",JSON.stringify(events));
    if(!f.get("resumeFile")?.size)f.delete("resumeFile");
    const result=await mutate(form,"document","/hr/archive-documents","POST",f);
    toast(result.historyFilled?"События добавлены в существующий документ.":result.duplicate?"Документ уже есть в истории.":"Архивный документ добавлен.");
    await go(currentPage());
  },
  async "public-application"(form) {
    const data=await mutate(form,"public","/public/applications","POST",applicationForm(form,"public"));
    await go("/receipts/"+enc(data.receiptNumber));
  },
  async "create-candidate"(form,f) {
    const body=Object.fromEntries(f);
    const candidateId=form.dataset.candidate||((await mutate(form,"candidate","/hr/candidates","POST",body)).candidateId);
    form.dataset.candidate=candidateId;
    if(form.dataset.linkId){
      await mutate(form,"link","/hr/applications/"+enc(form.dataset.linkId)+"/candidate","PUT",{candidateId});
      toast("Профиль создан и связан с откликом.");
      await go(location.pathname+location.search);
    } else {
      toast("Профиль создан.");
      await go("/hr/candidates/"+enc(candidateId));
    }
  },
  async override(form,f) {
    await mutate(form,"override","/hr/applications/"+enc(appDetailData.a.applicationId)+"/assessment/"+enc(form.dataset.id),"PATCH",{status:f.get("status"),reason:f.get("reason")});
    toast("Правка сохранена.");
    await go(location.pathname+location.search);
  },
  async transition(form,f) {
    const a=appDetailData.a;
    const scheduled = f.get("scheduledAt");
    await mutate(form,"transition","/hr/applications/"+enc(a.applicationId)+"/transitions","POST",{action:form.dataset.stageAction,expectedVersion:a.stage.version,reason:f.get("reason")||"",candidateMessage:f.get("candidateMessage"),format:f.get("format"),interviewResult:f.get("interviewResult"),...(scheduled?{scheduledAt:scheduled+":00+03:00"}:{})});
    toast("Этап отклика обновлён.");
    await go(location.pathname+location.search);
  },
  async "clarify-link"(form,f) {
    const r=await mutate(form,"link","/hr/clarifications/"+enc(form.dataset.id)+"/links","POST",{contactVerified:f.has("contactVerified")});
    clarifyLetter(r);
  },
  async "clarification-access"(form) {
    await prepareGuest();
    const r=await mutate(form,"access","/public/clarification-sessions","POST",{token:form.dataset.token});
    await go("/clarifications/"+enc(r.threadId),true);
  },
  async clarifications(form) {
    const answers=Array.from(form.querySelectorAll("[data-question]")).filter(x=>x.value.trim()).map(x=>({questionId:x.dataset.question,text:x.value}));
    if(!answers.length)throw new Error("Напишите хотя бы один ответ.");
    await mutate(form,"answers","/public/clarifications/"+enc(form.dataset.id)+"/answers","POST",{answers});
    toast("Ответы сохранены.");
    await render();
  },
  async termination(form,f) {
    const r=await mutate(form,"termination","/hr/employments/"+enc(form.dataset.id)+"/terminations","POST",{effectiveAt:f.get("effectiveAt"),reasonCategory:f.get("reasonCategory")});
    toast("Увольнение зафиксировано.");
    await go(location.pathname+location.search);
    if(r.surveyInvitationId)letterDialog(await getJSON("/hr/survey-invitations/"+enc(r.surveyInvitationId)));
  },
  async survey(form,f) {
    const answers=Array.from(f,([questionId,value])=>({questionId,value:["clarity","communication"].includes(questionId)?Number(value):String(value)}));
    await mutate(form,"survey","/public/surveys/"+enc(form.dataset.token)+"/responses","POST",{answers});
    submission=form.dataset.token;
    await render();
  }
};
document.addEventListener("submit",async e=>{
  const form=e.target;
  const handler=submitHandlers[form.dataset.form];
  if(!handler)return;
  e.preventDefault();
  if(form.dataset.busy==="1")return;
  clearFormError(form);
  const f=new FormData(form);
  const buttons=Array.from(form.querySelectorAll('button[type="submit"]'));
  buttons.forEach(b=>b.disabled=true);
  form.dataset.busy="1";
  try{await handler(form,f,e.submitter);}
  catch(error){formError(form,error);}
  finally{form.dataset.busy="";buttons.forEach(b=>b.disabled=false);}
});
const clickActions = {
  menu(target) {
    const open=document.querySelector("#rail")?.classList.toggle("open");
    document.querySelector(".mobile-scrim")?.classList.toggle("show",!!open);
    const control=document.querySelector(".mobile-menu");
    control?.setAttribute("aria-expanded",String(!!open));
    if(open)document.querySelector(".rail .nav-item")?.focus();
    else control?.focus();
  },
  "close-dialog"() {modal.close();},
  async "demo-login"(target) {
    await api("/auth/login",{method:"POST",body:{user:target.dataset.user||"demo"}});
    await render();
  },
  async logout(){
    await api("/auth/logout",{method:"POST",body:{}});
    actor=null;
    await go("/vacancies");
  },
  "new-requisition"(){ requisitionDialog(); },
  async "edit-requisition"(target){
    requisitionDialog(await getJSON("/department/requisitions/"+enc(target.dataset.id)));
  },
  async "submit-requisition"(target){
    await api("/department/requisitions/"+enc(target.dataset.id)+"/submit",{method:"POST",body:{},key:target.dataset.key||=crypto.randomUUID()});
    toast("Заявка передана кадровику.");
    await go(currentPage());
  },
  "add-part"(target){
    const form=target.closest("form");
    captureVacancyParts(form);
    const kind=target.dataset.kind;
    if(vacancyParts[kind].length>=(kind==="criteria"?8:6))return;
    vacancyParts[kind].push({id:crypto.randomUUID(),required:true});
    paintVacancyParts();
    form.querySelector(`[data-parts="${kind}"] > div:last-child input[type=text], [data-parts="${kind}"] > div:last-child textarea`)?.focus();
  },
  "remove-part"(target){
    const form=target.closest("form");
    captureVacancyParts(form);
    const {kind,id}=target.dataset;
    vacancyParts[kind]=vacancyParts[kind].filter(x=>x.id!==id);
    paintVacancyParts();
    form.querySelector(`[data-action="add-part"][data-kind="${kind}"]`)?.focus();
  },
  "import-application"(){return importModal(false);},
  "import-archive"(){return importModal(true);},
  "intake-options"(){
    showDialog("Импорт откликов",`<div class="stack" aria-label="Источник импорта">
      ${btn("Пакет DOCX или TXT",'data-action="import-files"',"secondary","upload")}
      ${btn("Выгрузка JSON",'data-action="import-archive"',"secondary","file")}
      ${btn("Письмо EML",'data-action="import-email"',"secondary","mail")}</div>`);
  },
  async "import-files"(){
    const current=new URLSearchParams(location.search).get("vacancyId")||"";
    const menu=await vacancyMenu(current,true);
    showDialog("Пакет резюме",`<form class="stack" data-form="import-files">
      ${vacancySelect(menu,current,false)}
      ${input("resumeFiles","Файлы резюме",{type:"file",required:true,attrs:'accept=".docx,.txt" multiple',hint:"До 20 файлов. Каждый файл до 5 МБ."})}
      <div class="stack-sm" data-file-list></div><p class="small" data-file-summary aria-live="polite"></p>
      ${errors}<div>${submit("Добавить в очередь","upload")}</div>
    </form>`);
  },
  async "import-email"(){
    const selected=new URLSearchParams(location.search).get("vacancyId")||"";
    const menu=await vacancyMenu(selected,true);
    showDialog("Загрузить письмо",`<form class="stack" data-form="email-import">
      ${vacancySelect(menu,selected,false)}
      ${input("sourceAccount","Почтовый ящик",{required:true,max:160})}
      ${input("emailFile","Письмо EML",{type:"file",required:true,attrs:'accept=".eml,message/rfc822"'})}
      ${input("fullName","Фамилия и имя (если отличаются от отправителя)",{max:160,optional:true})}
      ${errors}<div>${submit("Принять отклик","upload")}</div></form>`);
  },
  async "related-review"(){
    const menu=await vacancyMenu("",true);
    menu.items=menu.items.filter(v=>v.vacancyId!==appDetailData.a.vacancyId);
    showDialog("Проверить смежную вакансию",`<form class="stack" data-form="related-review">${vacancySelect(menu,"",false)}${errors}<div>${submit("Проверить")}</div></form>`);
  },
  async handoff(){
    const preview=await getJSON("/hr/applications/"+enc(appDetailData.a.applicationId)+"/handoff-preview");
    const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(preview)));
    const digest=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("");
    showDialog("Передать карточку",`<form class="stack" data-form="handoff" data-preview="${digest}">
      <section class="criterion stack-sm"><h3>Что увидит подразделение</h3>${handoffBrief(preview)}</section>
      ${input("assigneeId","Логин или ID ответственного",{required:true,max:160,value:demoAvailable?"department":""})}
      ${input("dueAt","Ответить до (МСК)",{type:"datetime-local",required:true})}
      ${input("note","Комментарий",{type:"textarea",optional:true,max:1200})}${errors}<div>${submit("Передать")}</div></form>`);
  },
  "interview-answer"(target){
    const question=target.closest("[data-plan-question]").querySelector("[data-plan-text]").value.trim();
    showDialog("Ответ со слов кандидата",`<form class="stack" data-form="interview-answer" data-criterion="${esc(target.dataset.criterion)}">
      ${input("question","Вопрос",{value:question,max:300,required:true})}
      ${input("text","Ответ",{type:"textarea",max:2000,required:true})}
      ${input("nextStep","Следующий шаг",{type:"textarea",max:1200,optional:true,placeholder:"Например, запросить реквизиты диплома"})}
      ${errors}<div>${submit("Записать ответ","check")}</div></form>`);
  },
  async "vacancy-approval"(target){
    const mode=target.dataset.mode;
    const draftNumber=Number(target.closest("[data-draft-number]").dataset.draftNumber);
    if(mode==="request_changes"){
      showDialog("Вернуть черновик",`<form class="stack" data-form="vacancy-changes" data-draft="${draftNumber}">${input("note","Что нужно изменить",{type:"textarea",required:true,max:1200})}${errors}<div>${submit("Вернуть")}</div></form>`);
      return;
    }
    await api(location.pathname+"/"+mode,{method:"POST",body:{draftNumber}});
    await go(currentPage());
  },
  "print-report"(){window.print();},
  async "analytics-brief"(target) {
    const slot=target.closest("section.card").querySelector("[data-analytics-brief]");
    slot.hidden=false;
    slot.textContent="Оцениваем приоритеты…";
    try {
      const query=new URLSearchParams(target.dataset.query);
      const result=await api("/hr/analytics/brief?"+query,{method:"POST",body:{}});
      const facts=result.facts;
      const filters=Object.fromEntries(query);
      const messages={
        handoffs:`Проверьте ожидающие карточки подразделений. В ожидании: ${number(facts.handoffsWaiting)}, просрочено: ${number(facts.handoffsOverdue)}.`,
        first_action:`Разберите открытые отклики без первого действия: ${number(facts.withoutAction)}.`,
        timing:`Сверьте время первичного разбора. Медиана: ${number(facts.medianMinutes)} мин по ${number(facts.measuredApplications)} откликам.`
      };
      slot.innerHTML=`<strong>${result.source==="gigachat"?"Приоритеты по данным и GigaChat":"Приоритеты по данным"}</strong>
        ${result.priorities.length?`<ol>${result.priorities.map(key=>`<li>${esc(messages[key])}
          ${key==="handoffs"?link(pagePath("/hr/applications",{...filters,handoff:"waiting"}),"Открыть очередь","quiet btn-sm"):
            key==="first_action"?link(pagePath("/hr/applications",{...filters,activity:"without_action"}),"Открыть очередь","quiet btn-sm"):""}</li>`).join("")}</ol>`:
          '<p>За этот период нет задач, требующих разбора.</p>'}`;
    } catch(error) {
      slot.textContent="Приоритеты недоступны. Проверьте показатели в таблице выше.";
      throw error;
    }
  },
  "save-filters"(target) {
    localStorage.setItem("kadry-filters",JSON.stringify(Object.fromEntries(new FormData(target.closest("form")))));
    toast("Фильтры сохранены в этом браузере.");
    return render();
  },
  "restore-filters"(){return go(pagePath("/hr/applications",listSettings("kadry-filters",{})));},
  "archive-event"(target) {
    const list=target.closest("form").querySelector("[data-archive-events]");
    if(list.children.length>=20)return;
    list.insertAdjacentHTML("beforeend",archiveEventRow());
    list.lastElementChild.querySelector("input").focus();
  },
  "remove-archive-event"(target){target.closest("[data-archive-event]").remove();},
  "archive-preview"(target){return loadArchivePreview(target.closest("form"));},
  "archive-document"(target) {
    showDialog("Исторический документ",`<form class="stack" data-form="archive-document" data-id="${esc(target.dataset.id)}">
    <input type="hidden" name="sourceDigest">
    ${input("title","Название документа",{required:true,max:180})}
    ${pair(input("sourceAccount","Папка или реестр",{required:true,max:160}),input("deliveryId","Номер документа",{optional:true,max:250}))}
    ${input("resumeFile","Исходный документ",{type:"file",attrs:'accept=".docx,.txt,.pdf"',optional:true})}
    ${input("text","Текст документа",{type:"textarea",max:20000,hint:"Вставьте текст или приложите файл."})}
    <div class="stack-sm"><div>${btn("Найти события в документе",'data-action="archive-preview"',"secondary","search")}</div>
    <p class="muted small" data-archive-status aria-live="polite"></p></div>
    ${input("education","Образование из документа",{max:500,optional:true})}
    ${input("additionalEducation","Доп. образование из документа",{max:500,optional:true})}
    <h3>Прежние события</h3><div class="stack-sm" data-archive-events></div>
    <div>${btn("Добавить событие",'data-action="archive-event"',"secondary","plus")}</div>
    ${check("confirmDuplicate","Подтверждаю повтор после сверки с историей")}
    ${errors}<div>${submit("Сохранить документ","check")}</div></form>`);
  },
  "new-candidate"(){showDialog("Новый профиль",candidateForm());},
  "new-linked-candidate"(){showDialog("Новый профиль",candidateForm(appDetailData.a));},
  "candidate-link"(){return candidateLinkModal();},
  "more-candidates"(target){return candidateMatches(connectData.query,true,target.dataset.cursor);},
  async "confirm-candidate"(target){
    const id=connectData.applicationId;
    await api("/hr/applications/"+enc(id)+"/candidate",{method:"PUT",body:{candidateId:target.dataset.id},key:target.dataset.key||=crypto.randomUUID()});
    toast("Связь с профилем подтверждена.");
    await go(location.pathname+location.search);
  },
  override(target){
    const item=appDetailData.evaluation.items.find(x=>x.criterionId===target.dataset.id);
    showDialog("Правка критерия",`<form class="stack" data-form="override" data-id="${esc(item.criterionId)}"><p class="small muted">${esc(item.label)}</p>
    ${selectField("status","Вывод HR",Object.entries(statusNames).map(([k,[v]])=>[k,v]),item.hrOverride?.status||item.status)}
    ${input("reason","Основание",{type:"textarea",required:true,max:1200,value:item.hrOverride?.reason})}${errors}<div>${submit("Сохранить","check")}</div></form>`);
  },
  async "copy-interview-plan"(target) {
    const panel=target.closest("[data-interview-plan]");
    const questions=[...panel.querySelectorAll("[data-plan-selected]:checked")].map(box=>box.closest("[data-plan-question]").querySelector("[data-plan-text]").value.trim()).filter(Boolean);
    if(!questions.length) throw new Error("Выберите хотя бы один вопрос.");
    await navigator.clipboard.writeText(questions.map((question,i)=>`${i+1}. ${question}`).join("\n"));
    toast("Вопросы скопированы.");
  },
  async "refine-interview-plan"(target) {
    const panel=target.closest("[data-interview-plan]");
    const status=panel.querySelector("[data-plan-status]");
    const rows=[...panel.querySelectorAll("[data-current-questions] [data-plan-question]")];
    target.disabled=true;
    status.hidden=false;
    status.textContent="Готовим формулировки…";
    try {
      const draft=await api("/hr/applications/"+enc(appDetailData.a.applicationId)+"/interview-draft",{
        method:"POST",body:{priorityOnly:true},key:target.dataset.key||=crypto.randomUUID()
      });
      delete target.dataset.key;
      if(!panel.isConnected) return;
      const revised=new Map(draft.questions.filter(question=>question.source==="model").map(question=>[question.criterionId,question.question]));
      let changed=0;
      for(const row of rows){
        const text=row.querySelector("[data-plan-text]");
        const question=revised.get(row.dataset.planQuestion);
        if(!question||text.value!==text.defaultValue)continue;
        text.defaultValue=question;
        text.value=question;
        changed++;
      }
      status.textContent=changed ? "Предложены новые формулировки. Проверьте их перед интервью."
        : revised.size ? "Ваши правки сохранены." : "Доступны локальные вопросы.";
    } catch (error) {
      status.textContent="Доступны локальные вопросы.";
      throw error;
    } finally { target.disabled=false; }
  },
  async "save-interview-role"(target) {
    await api("/hr/applications/"+enc(appDetailData.a.applicationId)+"/related-reviews",{
      method:"POST",body:{vacancyId:target.dataset.vacancy},key:target.dataset.key||=crypto.randomUUID()
    });
    target.disabled=true;
    target.parentElement.querySelector("[data-related-status]").textContent='Проверка добавлена во вкладку "Взаимодействие".';
  },
  async evidence(target){
    const {a}=appDetailData;
    const id=target.dataset.id;
    if(target.dataset.type==="test"){
      const answer=a.answers.find(x=>x.questionId===id);
      showDialog("Ответ на вопрос теста",`<div class="stack"><h3>${esc(answer?.question)}</h3>${evidenceText(answer?.value,target)}</div>`);
      return;
    }
    if(target.dataset.type==="resume"){
      showDialog("Исходное резюме",sourceCard(a,target));
      return;
    }
    const source=await getJSON("/hr/resume-sources/"+enc(id));
    showDialog("Ответ кандидата",evidenceText(source.text,target));
  },
  transition(target){
    const action=target.dataset.stageAction;
    showDialog(actions[action],`<form class="stack" data-form="transition" data-stage-action="${esc(action)}">
    ${["invite_interview","schedule_followup"].includes(action)?pair(input("scheduledAt","Дата и время интервью (МСК)",{type:"datetime-local",required:true}),selectField("format","Вид интервью",Object.entries(interviewFormats),"phone")):""}
    ${action==="complete_interview"?selectField("interviewResult","Результат интервью",Object.entries(handoffOutcomes),"proceed"):""}
    ${input("reason",action==="reject"?"Внутренняя причина отказа":"Комментарий к этапу",{type:"textarea",max:1200,required:action==="reject",optional:action!=="reject"})}
    ${["reject","hire"].includes(action)?input("candidateMessage","Сообщение соискателю",{type:"textarea",max:1200,optional:true,hint:"Отображается в его статусе отклика."}):""}
    ${errors}<div>${submit(actions[action],"check")}</div></form>`);
  },
  "clarify-link"(target){
    showDialog("Подготовить ссылку",`<form class="stack" data-form="clarify-link" data-id="${esc(target.dataset.id)}">
    ${check("contactVerified","Я проверил email кандидата")}${errors}<div>${submit("Создать ссылку","link")}</div></form>`);
  },
  async copy(){
    const field=modal.querySelector("[data-copy-source]");
    if(!field)return;
    try {await navigator.clipboard.writeText(field.value);toast("Ссылка скопирована.");}
    catch {field.select();if(document.execCommand("copy"))toast("Ссылка скопирована.");else toast("Скопируйте выделенную ссылку.");}
  },
  async "interview-survey"(target){
    const r=await api("/hr/interviews/"+enc(target.dataset.id)+"/survey-invitations",{method:"POST",body:{},key:target.dataset.key||=crypto.randomUUID()});
    await render();
    letterDialog(r);
  },
  async invitation(target){letterDialog(await getJSON("/hr/survey-invitations/"+enc(target.dataset.id)));},
  async "mark-sent"(target){
    const r=await api("/hr/survey-invitations/"+enc(target.dataset.id)+"/mark-sent",{method:"POST",body:{},key:target.dataset.key||=crypto.randomUUID()});
    toast("Отправка отмечена.");
    await render();
    letterDialog(r);
  },
  termination(target){
    const d=dayInput.format(new Date());
    const emp=appDetailData.employment;
    showDialog("Зафиксировать увольнение",`<form class="stack" data-form="termination" data-id="${esc(target.dataset.id)}">
    ${input("effectiveAt","Дата увольнения",{type:"date",value:d,required:true,attrs:`max="${d}" min="${esc(dayInput.format(new Date(emp.startedAt)))}"`})}
    ${selectField("reasonCategory","Основание",Object.entries(departureReasons),"employer_initiated")}
    <p class="note">При добровольном уходе или увольнении по инициативе работодателя будет подготовлена анкета для бывшего сотрудника.</p>
    ${errors}<div>${submit("Зафиксировать","check")}</div></form>`);
  }
};
document.addEventListener("click",async e=>{
  if(!(e.target instanceof Element))return;
  const a=e.target.closest("a[data-link]");
  if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0){
    e.preventDefault();
    await go(a.getAttribute("href"));
    return;
  }
  const button=e.target.closest("[data-action]");
  const handler=clickActions[button?.dataset.action];
  if(handler){
    if(button.dataset.loading==="1")return;
    button.dataset.loading="1";
    try{await handler(button);}
    catch(error){toast(error.message||"Не удалось выполнить действие.",true);}
    finally{button.dataset.loading="";}
    return;
  }
  const row=e.target.closest("tr[data-href]");
  if(row&&!e.target.closest("button,a,input,label,details")&&e.button===0)await go(row.dataset.href);
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&document.querySelector(".rail.open"))clickActions.menu();
});
document.addEventListener("input",e=>{
  const target=e.target;
  if (target.name==="text" && target.form?.dataset.form==="archive-document" && target.form.elements.sourceDigest.value) {
    target.form.elements.sourceDigest.value="";
    target.form.querySelector("[data-archive-status]").textContent="Текст изменён. Проверьте события или повторите разбор.";
  }
  if(target.name==="title"){
    const slug=target.form?.querySelector("[data-slug-field]");
    if(slug&&!slug.dataset.edited)slug.value=convertSlug(target.value);
  }
  if(target.matches?.("[data-slug-field]"))target.dataset.edited="1";
  if(target.getAttribute?.("aria-invalid")==="true")target.removeAttribute("aria-invalid");
});
document.addEventListener("change",async e=>{
  const select=e.target;
  if (select.name==="resumeFile" && select.form?.dataset.form==="archive-document") {
    select.form.elements.sourceDigest.value="";
    if(select.files.length) await loadArchivePreview(select.form);
    else select.form.querySelector("[data-archive-status]").textContent="Файл снят. Проверьте события перед сохранением.";
    return;
  }
  if(select.name==="resumeFiles"&&select.form?.dataset.form==="import-files"){
    const form=select.form;
    const files=[...select.files];
    select.setCustomValidity(files.length>20?"Выберите не больше 20 файлов.":"");
    form.querySelector("[data-file-list]").innerHTML=files.length<=20?files.map((file,index)=>`<div class="criterion stack-sm">
      <strong class="small">${esc(file.name)}</strong>
      ${input("file_name_"+index,"Фамилия и имя",{required:true,max:160,value:file.name.replace(/\.[^.]+$/u,"").replaceAll("_"," ").slice(0,160)})}
      <p class="muted small" data-file-status aria-live="polite"></p></div>`).join(""):"";
    form.querySelector("[data-file-summary]").textContent="";
    form.querySelector('button[type="submit"]').hidden=false;
    return;
  }
  if(select.matches?.(".select-wrap select"))syncSelectDisplay(select);
  if(!select.matches?.("[data-vacancy-cursor]"))return;
  if(select.value!=="__more"){select.dataset.value=select.value;syncPriorityFilter();return;}
  select.value=select.dataset.value||"";
  const cursor=select.dataset.vacancyCursor;
  if(!cursor)return;
  select.disabled=true;
  try{
    const page=await getJSON("/hr/vacancies?limit=50&cursor="+enc(cursor));
    select.querySelector('option[value="__more"]')?.remove();
    for(const v of page.items){
      if(select.dataset.publishedOnly==="1"&&v.status!=="published")continue;
      if(!Array.from(select.options).some(o=>o.value===v.vacancyId))select.add(new Option(v.title,v.vacancyId));
    }
    select.dataset.vacancyCursor=page.nextCursor||"";
    if(page.nextCursor)select.add(new Option("Загрузить ещё вакансии…","__more"));
    toast("Список вакансий обновлён.");
  }catch(error){toast(error.message,true);}
  finally{select.disabled=false;syncSelectDisplay(select);select.focus();}
});
function requisitionDialog(draft={}) {
  showDialog("Заявка на подбор",`<form class="stack" data-form="requisition" data-id="${esc(draft.id)}">
    ${input("title","Должность",{max:150,required:true,value:draft.title})}
    ${input("department","Подразделение",{max:140,required:true,value:actor.department||draft.department,attrs:actor.department?"readonly":""})}
    ${input("description","Задачи и ожидаемый результат",{type:"textarea",max:12000,required:true,value:draft.description})}
    ${errors}<div>${submit("Сохранить черновик","check")}</div></form>`);
}
function syncSelectDisplay(select) {
  select.parentElement.querySelector(".select-display > span").textContent=select.selectedOptions[0]?.textContent||"";
}
render();
