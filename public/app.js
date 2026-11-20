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
const statusNames = { matched:["Подтверждено","green"],partial:["Частично","amber"],needs_clarification:["Уточнить","purple"],not_met:["Не соответствует","red"] };
const sourceNames = { public_form:"Гостевая форма", email:"Электронная почта", archive:"Архив", manual:"Ручное добавление", unknown:"Источник неизвестен" };
const actions = { receive:"Отклик получен", start_review:"Начать рассмотрение", invite_interview:"Пригласить на интервью", complete_interview:"Отметить интервью состоявшимся",move_to_decision:"Перевести на этап решения",hire:"Принять на работу",reject:"Зафиксировать отказ" };
const invitationLabels = { prepared:["Подготовлена","purple"],sent:["Отправлена","blue"],answered:["Есть ответ","green"],no_contact:["Нет контакта","amber"],expired:["Срок истёк","red"] };
const typeLabels = { interview_feedback:"После интервью",exit_feedback:"После увольнения" };
const known = x => x ? esc(x) : '<span class="muted">Не указано</span>';
const stagePill = (a, dot = true) => chip(...(stages[a.outcome || a.stage || a.currentStage] || stages.received), dot);
const pagePath = (href, q = {}, keep = false) => {
  const url = new URL(href, location.origin);
  if (keep) url.search = location.search;
  for (const [k, v] of Object.entries(q)) if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  return url.pathname + url.search;
};
const getJSON = path => api(path);
let navRun = 0;
let actor = null;
let demoAvailable = false;
let submission = null;
let appDetailData = null;
let vacancyParts = null;
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
  return `<span class="select-wrap"><select name="${esc(name)}" ${attrs}>${values.map(([value,label]) => `<option value="${esc(value)}" ${String(value) === String(current ?? "") ? "selected" : ""}>${esc(label)}</option>`).join("")}</select>${ic("down")}</span>`;
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
  return `<div class="public-shell"><header class="public-header"><div class="public-header-inner">${brand("/vacancies")}<nav aria-label="Основная навигация" class="row wrap">${secondary}${link("/hr","Кабинет HR","secondary","lock")}</nav></div></header>
  <main class="public-main" id="main">${content}</main><footer class="public-footer"><div>Кадры · Горький <span aria-hidden="true">·</span> Нижний Новгород</div></footer></div>`;
}
function loginView() {
  return publicShell(`<div class="public-narrow card pad stack-lg" style="max-width:420px;margin-block:22px">
    ${heading("Кабинет HR","Войдите, чтобы работать с откликами и вакансиями.")}
    <form class="stack" data-form="login">${errors}
      ${input("user","Логин",{required:true,max:80,attrs:'autocomplete="username"'})}
      ${input("password","Пароль",{type:"password",required:true,max:256,attrs:'autocomplete="current-password"'})}
      ${submit("Войти","lock")}
    </form>${demoAvailable ? btn("Открыть демо-кабинет",'data-action="demo-login"',"secondary","grid") : ""}
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
  review_first: ["Требования подтверждены", "green"],
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
  missing_text: "Нет читаемого текста резюме.",
  missing_contact: "В отклике и профиле нет email для связи.",
  analysis_pending: "GigaChat сопоставляет резюме с вакансией.",
  analysis_unavailable: "Вывод GigaChat появится после разбора резюме.",
  no_required_criteria: "У вакансии нет обязательных критериев. Просмотрите отклик вручную.",
  required_supported: "По каждому обязательному требованию есть цитата или подтверждение кадровика.",
  required_need_evidence: "По части обязательных требований нужны дополнительные сведения.",
};
function intakeStatus(triage) {
  const status = intakeStatuses[triage?.status];
  return status ? chip(status[0],status[1],true) : "";
}
function applicationTable(items, compact = false) {
  const headers = compact
    ? [["Кандидат",29],["Вакансия",31],["Этап",23],["Получен",17]]
    : [["Кандидат",25],["Вакансия",25],["Этап",18],["Источник",17],["Получен",15]];
  const rows = items.map((x,i) => {
    const url = `/hr/applications/${enc(x.applicationId)}`;
    const person = `<div class="person-ct">${avatar(x.fullName,i)}<div><a data-link class="table-name" href="${url}">${esc(x.fullName)}</a>${!compact && x.contact ? `<span class="table-meta">${esc(x.contact)}</span>` : ""}</div></div>`;
    const progress = !compact && x.reviewProgress;
    const stage = stagePill(x) + (!compact && x.triage ? `<div class="table-meta">${intakeStatus(x.triage)}<small class="table-meta">${esc(intakeReasons[x.triage.reason])}</small></div>` : "")
      + (progress ? `<small class="table-meta">Цитаты ${progress.withEvidence}/${progress.required} · Подтверждено HR ${progress.confirmed}/${progress.required}</small>` : "");
    return { href:url,cells:[person,esc(x.vacancyTitle),stage,...(!compact ? [`<span class="muted">${esc(sourceNames[x.sourceChannel])}</span>`] : []),`<span class="muted">${esc(date(x.receivedAt))}</span>`] };
  });
  return items.length ? table(headers,rows) : empty("Откликов пока нет","Когда соискатель заполнит форму, отклик появится здесь.");
}
async function overview() {
  const [a,r] = await Promise.all([getJSON("/hr/analytics"),getJSON("/hr/applications?limit=5")]);
  return `<section class="hero"><div class="hero-body"><div class="hero-kicker">${ic("building")} Нижний Новгород</div><h1 tabindex="-1">Кабинет подбора</h1><p>Публикуйте вакансии, разбирайте отклики и следите за ходом найма.</p><div class="hero-actions">
    ${link("/hr/vacancies/new","Создать вакансию","primary","plus")}${link("/hr/applications","Открыть отклики","secondary","inbox")}
  </div></div>${city()}</section>
  <section class="stack" aria-labelledby="overview-label"><div class="overview-head"><h2 id="overview-label">Подбор в цифрах</h2>${link("/hr/analytics","Открыть аналитику","quiet btn-sm","bars")}</div>${metrics(a.totals)}</section>
  <div class="dashboard-grid"><section class="card pad">${cardHead("Динамика откликов","За последние 7 дней",chip("7 дней"))}${spark(a.series)}</section>
  <section class="card pad">${cardHead("Воронка найма","Дошли до этапа",tile("funnel"))}${funnelChart(a.funnel,a.totals.received)}</section></div>
  <section class="card"><div class="table-title"><h2>Последние отклики</h2>${link("/hr/applications","Все отклики","quiet btn-sm")}</div>${applicationTable(r.items,true)}</section>`;
}
const vacancyChoices = (vacancies, all = true) => [[ "", all ? "Все вакансии" : "Выберите вакансию" ], ...vacancies.map(v=>[v.vacancyId, v.title])];
async function listVacancies() {
  const r=await getJSON("/hr/vacancies"+location.search);
  const list=r.items.map(v=>`<article class="card vac-card"><div class="row between align-start">${tile("brief")}${v.status==="published"?chip("Опубликована","green",true):chip("Черновик","",true)}</div>
  <div><h2><a data-link href="/hr/vacancies/${enc(v.vacancyId)}">${esc(v.title)}</a></h2><p class="vac-meta">${esc(v.department)}</p></div>
  <div class="row wrap muted small">${ic("pin")}${esc(v.location)}</div><div class="vac-foot">
  ${link("/hr/vacancies/"+enc(v.vacancyId),"Редактировать","secondary btn-sm","edit")}
  ${link(pagePath("/hr/applications",{vacancyId:v.vacancyId}),"Отклики","quiet btn-sm","inbox")}
  </div></article>`).join("");
  return `${heading("Вакансии","Черновики, опубликованные вакансии и тесты для соискателей.",link("/hr/vacancies/new","Создать вакансию","primary","plus"))}
  ${list ? `<div class="list-grid">${list}</div>` : `<div class="card">${empty("Вакансий пока нет","Создайте первую вакансию и опубликуйте форму отклика.","brief")}</div>`}${pagination(r.nextCursor)}`;
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
const codeLabels = { custom:"Другой",sql:"SQL",python:"Python",analytics:"Аналитика",api:"Работа с API",communication:"Коммуникация",education:"Образование",project:"Проектная работа",office:"Офисные инструменты",experience:"Опыт работы" };
function vacancyEditorPart(v,i) {
  const suffix=v.id;
  const drop=btn("Удалить",`data-action="remove-part" data-id="${esc(suffix)}"`,"quiet btn-sm","close");
  return `<div class="form-block stack-sm"><div class="row between"><h3>Критерий ${i+1}</h3>${drop}</div>
    ${pair(input("criteria_"+suffix+"_label","Требование",{required:true,max:160,value:v.label,placeholder:"Например, опыт работы с SQL"}),selectField("criteria_"+suffix+"_code","Тип критерия",Object.entries(codeLabels),v.code||"custom"))}
    ${input("criteria_"+suffix+"_question","Вопрос для уточнения",{max:300,value:v.question,optional:true})}
    ${input("criteria_"+suffix+"_reference","Основание или пункт инструкции",{max:250,value:v.reference,optional:true})}
    ${check("criteria_"+suffix+"_required","Обязательный критерий",v.required!==false)}</div>`;
}
function paintVacancyParts() {
  const list=document.querySelector("[data-parts=criteria]");
  list.innerHTML=vacancyParts.criteria.map(vacancyEditorPart).join("");
  document.querySelector('[data-action="add-part"]').disabled=vacancyParts.criteria.length>=8;
}
function captureVacancyParts(form) {
  const f=new FormData(form);
  for (const v of vacancyParts.criteria) {
    const key="criteria_"+v.id+"_";
    Object.assign(v,{label:f.get(key+"label")||"",code:f.get(key+"code")||"custom",question:f.get(key+"question")||"",reference:f.get(key+"reference")||"",required:f.has(key+"required")});
  }
}
async function editVacancyPage(id) {
  const existing=id&&id!=="new"?await getJSON("/hr/vacancies/"+enc(id)):null;
  const v=existing?.draft||{title:"",slug:"",department:"",description:"",location:"Нижний Новгород",schedule:"Полная занятость",criteria:[],formFields:[{id:"resume",required:true}]};
  vacancyParts={criteria:v.criteria};
  const publicLink=existing?.publishedVersionId?link("/vacancies/"+enc(existing.slug),"Открыть вакансию","secondary","globe"):"";
  const actionsHtml=existing?publicLink+link(pagePath("/hr/applications",{vacancyId:id}),"Отклики","secondary","inbox"):"";
  return `<div class="row wrap">${link("/hr/vacancies","Вакансии","quiet btn-sm","brief")}${existing?.publishedVersionId?chip("Опубликована","green",true):chip("Черновик")}</div>
  ${heading(existing ? existing.title : "Новая вакансия",existing?"Изменения на витрине появятся после публикации новой версии.":"Подготовьте описание и критерии проверки.",actionsHtml)}
  <form data-form="vacancy" data-id="${esc(existing?.vacancyId||"")}" class="stack-lg">
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
      ${cardHead("Критерии проверки","Закрепляются в опубликованной версии вакансии.",btn("Добавить критерий",'data-action="add-part"',"secondary btn-sm","plus"))}
      <div class="stack-sm" data-parts="criteria">${v.criteria.map(vacancyEditorPart).join("")}</div>
    </section>
    ${errors}<div class="row wrap"><button type="submit" class="btn btn-secondary" name="mode" value="draft">Сохранить черновик</button>${submit("Опубликовать","check","publish")}</div>
  </form>`;
}
async function applicationList() {
  const q=new URLSearchParams(location.search);
  const [r,menu]=await Promise.all([getJSON("/hr/applications"+location.search),vacancyMenu(q.get("vacancyId"))]);
  const totals=r.triageTotals;
  const queues=[["",`Вся очередь (${Object.values(totals).reduce((a,b)=>a+b,0)})`],
    ...Object.entries(intakeStatuses).map(([key,[label]])=>[key,`${label} (${totals[key]||0})`])];
  return `${heading("Отклики","Новые заявки, резюме и этапы подбора.",btn("Импорт архива",'data-action="import-archive"',"secondary","upload")+btn("Добавить отклик",'data-action="import-application"',"primary","plus"))}
  <form class="card pad filters" data-form="app-filters">
    ${searchField(q.get("q"),"Поиск по кандидату")}
    ${vacancySelect(menu,q.get("vacancyId"))}
    ${selectField("stage","Этап", [["","Все этапы"],...Object.entries(stages).map(([id,[text]])=>[id,text])],q.get("stage"))}
    ${selectField("channel","Источник",[["","Все источники"],...Object.entries(sourceNames)],q.get("channel"))}
    ${selectField("triage","Очередь разбора",queues,q.get("triage"))}
    <div class="row wrap">${submit("Применить","funnel")}${link("/hr/applications","Сбросить","quiet")}</div>
  </form>
  <section class="card">${applicationTable(r.items)}${pagination(r.nextCursor)}</section>`;
}
function resumeFields(required) {
  return `<fieldset class="form-block stack-sm resume-fields" data-resume-fields><legend class="strong">Резюме${required ? "" : " (необязательно)"}</legend>
    <div class="row wrap">
      <label class="check"><input type="radio" name="resumeMode" value="file" checked>Прикрепить файл</label>
      <label class="check"><input type="radio" name="resumeMode" value="text">Написать текст</label>
    </div>
    <div data-resume-input="file">${input("resumeFile","Файл резюме",{type:"file",attrs:'accept=".pdf,.docx,.txt"',hint:"PDF, DOCX или TXT, до 5 МБ."})}</div>
    <div data-resume-input="text" hidden>${input("resumeText","Текст резюме",{type:"textarea",rows:5,max:20000,attrs:"disabled",placeholder:"Опыт работы, образование и навыки",hint:"До 20 000 символов."})}</div>
  </fieldset>`;
}
async function importModal(archive) {
  const current=new URLSearchParams(location.search).get("vacancyId")||"";
  const menu=await vacancyMenu(current,true);
  if (!menu.items.length && !menu.nextCursor) {
    showDialog("Добавление отклика",empty("Сначала опубликуйте вакансию","Отклик связывается с опубликованной версией вакансии.","brief",link("/hr/vacancies/new","Создать вакансию","primary")));
    return;
  }
  if (archive) {
    showDialog("Импорт архива",`<form data-form="import-archive" class="stack">${vacancySelect(menu,current,false)}
    ${input("archive","Файл выгрузки",{type:"file",required:true,attrs:'accept=".json,application/json"',hint:"JSON, до 20 откликов и 120 КБ."})}
    <a class="text-link small" href="/api/v1/hr/archive-example" download="archive-example.json">Скачать пример архива</a>
    <p class="muted small">В строке укажите имя, текст резюме и, если известны, email и исходную дату поступления.</p>
    ${errors}<div data-import-result></div><div>${submit("Импортировать","upload")}</div></form>`);
    return;
  }
  showDialog("Добавить отклик",`<form data-form="import-application" class="stack">
    ${vacancySelect(menu,current,false)}
    ${pair(input("fullName","Фамилия и имя",{max:160,required:true}),input("contact","Email",{type:"email",max:254,optional:true}))}
    ${pair(selectField("sourceChannel","Источник",Object.entries(sourceNames).filter(x=>x[0]!=="public_form"),"email"),input("sourceReceivedAt","Дата получения",{type:"date",optional:true}))}
    ${resumeFields(true)}${errors}<div>${submit("Сохранить отклик","check")}</div></form>`);
}
const assessmentMessages = {
  gigachat_not_configured: "Ключ GigaChat отсутствует. Задайте GIGACHAT_AUTH_KEY и перезапустите сервер.",
  gigachat_auth: "GigaChat отклонил авторизацию. Проверьте ключ и значение GIGACHAT_SCOPE.",
  gigachat_tls: "Сервер не может проверить сертификат GigaChat. Настройте NODE_EXTRA_CA_CERTS.",
  gigachat_unavailable: "GigaChat сейчас недоступен. Повторите разбор.",
  gigachat_invalid_response: "GigaChat вернул неполный вывод. Повторите разбор.",
  pdf_extractor_unavailable: "Для чтения PDF установите Poppler. Для сканов также нужен Tesseract с русским языком. Затем повторите разбор.",
  resume_unreadable: "Не удалось прочитать текст резюме. Проверьте исходный файл. Для скана используйте PDF с читаемым текстом или загрузите резюме текстом."
};
function assessmentCards(assessment) {
  const hrLabel = status => statusNames[status] || statusNames.needs_clarification;
  const states = { pending:"GigaChat разбирает резюме…",not_analyzed:"Нажмите «Разобрать резюме», чтобы получить вывод GigaChat.",failed:assessmentMessages[assessment.issue] || "Не удалось завершить разбор. Повторите попытку." };
  const state = states[assessment.assessmentStatus];
  return `${state ? `<div class="note" role="status">${esc(state)}</div>` : ""}
  ${assessment.provider ? `<section class="criterion"><h3>Образование</h3>${assessment.education?.length ? assessment.education.map(line=>`<p>${esc(line)}</p>`).join("") : `<p class="muted">${assessment.education===null ? "Повторите разбор, чтобы вывести образование." : "Сведения об образовании в резюме не найдены."}</p>`}</section>` : ""}
  ${assessment.summary ? `<section class="note stack-sm"><h3>${assessment.assessmentStatus==="ready" ? "Краткий вывод по резюме" : "Предыдущий вывод по резюме"}</h3><p class="pre">${esc(assessment.summary)}</p></section>` : ""}
  ${assessment.items.length ? '<h3>Требования вакансии</h3>' : ""}
  <div class="stack-sm">${assessment.items.map(x=>{
    const stateKey=x.hrOverride?.status || x.status;
    const [status,color]=hrLabel(stateKey);
    const mark={ matched:"✓", partial:"◐", needs_clarification:"?", not_met:"×" }[stateKey] || "?";
    const proof=x.evidence.map(e=>`<div class="stack-sm"><blockquote class="quote">${esc(e.quote)}</blockquote>
      <div>${btn(e.type==="resume"?"Открыть резюме":e.type==="test"?"Открыть ответ теста":"Открыть ответ кандидата",`data-action="evidence" data-type="${esc(e.type)}" data-id="${esc(e.sourceId)}"`,"quiet btn-sm","file")}</div></div>`).join("");
    return `<article class="criterion"><div class="row between wrap"><h4 class="grow">${esc(x.label)}</h4>${assessment.provider||x.hrOverride ? `<span class="pill pill-${color}"><span aria-hidden="true">${mark}</span> ${esc(status)}</span>` : ""}</div>
      ${x.reference ? `<p class="small muted">${esc(x.reference)}</p>` : ""}
      ${x.comment && !x.hrOverride ? `<p class="small">${esc(x.comment)}</p>` : ""}
      ${proof}
      ${x.question && !x.hrOverride ? `<p class="small"><strong>Уточнение.</strong> ${esc(x.question)}</p>` : ""}
      ${x.hrOverride ? `<div class="note"><strong>Правка HR.</strong> ${esc(x.hrOverride.reason)}<p class="tiny muted">${esc(x.hrOverride.actorName)} · ${esc(date(x.hrOverride.at,true))}</p></div>` : ""}
      ${assessment.assessmentStatus!=="pending" ? `<div>${btn("Изменить вывод",`data-action="override" data-id="${esc(x.criterionId)}"`,"secondary btn-sm","edit")}</div>` : ""}</article>`;
  }).join("")}</div>`;
}
function sourceCard(a) {
  const s=a.resumeSource;
  const attachment=s.attachment ? `<div class="attachment row wrap">${tile("file")}<div class="grow"><div class="strong small">${esc(s.attachment.name)}</div><div class="muted tiny">${number(Math.ceil(s.attachment.size/1024))} КБ</div></div><a class="btn btn-secondary btn-sm" href="${base}/hr/resume-sources/${enc(s.sourceId)}?download=1">${ic("download")} Скачать</a></div>` : "";
  return `<div class="stack">${attachment}${["manual","tool_missing"].includes(s.extractStatus)?'<p class="note">Текст не удалось извлечь. Исходник доступен для скачивания.</p>':s.extractStatus==="truncated"?'<p class="note">Для разбора использованы первые 20 000 символов. Полный текст есть в исходном файле.</p>':""}${s.text?`<div class="resume" tabindex="0">${esc(s.text)}</div>`:'<p class="muted small">Текст не указан.</p>'}</div>`;
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
async function applicationDetail(id) {
  const url="/hr/applications/"+enc(id);
  const a=await getJSON(url);
  const p=new URLSearchParams(location.search);
  const archivedAnswers=a.answers.filter(x=>x.value);
  const tabs=[["assessment","Разбор"],["resume","Резюме"],...(archivedAnswers.length?[["test","Ответы на тест"]]:[]),["clarification","Уточнения"],["history","История"]];
  const active=tabs.find(([key])=>key===p.get("tab"))?.[0]||"assessment";
  const [evaluation,person,thread,history,employment,interview]=await Promise.all([
    getJSON(url+"/assessment"),
    active==="clarification"&&a.candidateId&&!a.contact ? getJSON("/hr/candidates/"+enc(a.candidateId)+"?limit=1") : null,
    active==="clarification"&&a.clarificationThreadId ? getJSON("/hr/clarifications/"+enc(a.clarificationThreadId)) : null,
    active==="history" ? getJSON(url+"/history"+(p.get("cursor")?"?cursor="+enc(p.get("cursor")):"")) : null,
    a.stage.employmentId ? getJSON("/hr/employments/"+enc(a.stage.employmentId)) : null,
    a.stage.interviewId ? getJSON("/hr/interviews/"+enc(a.stage.interviewId)) : null
  ]);
  const record={a,evaluation,person,thread,history,employment,interview};
  appDetailData=record;
  let detail="";
  if(active==="assessment") {
    const pending=evaluation.assessmentStatus==="pending";
    const analyze=pending ? "" : btn(evaluation.provider||evaluation.assessmentStatus==="failed"?"Повторить разбор":"Разобрать резюме",'data-action="analyze-resume"',"secondary btn-sm","file");
    const interviewDraft=evaluation.items.length&&!pending?btn("Вопросы для интервью",'data-action="interview-draft"',"secondary btn-sm","chat"):"";
    detail=`<div class="stack">${cardHead("Разбор резюме GigaChat","Сопоставление опыта с требованиями вакансии.",analyze)}${assessmentCards(evaluation)}${interviewDraft?'<div>'+interviewDraft+'</div>':""}</div>`;
  }
  if(active==="resume") detail=`<div class="stack">${cardHead("Исходное резюме")}${sourceCard(a)}</div>`;
  if(active==="test") detail=`<div class="stack">${cardHead("Ответы на тест")}${archivedAnswers.map(x=>`<article class="criterion"><h3>${esc(x.question)}</h3><div class="small pre">${esc(x.value)}</div></article>`).join("")}</div>`;
  if(active==="clarification") detail=`<div class="stack">${cardHead("Уточнения кандидату","Ответы хранятся вместе с источником отклика.")}${thread ? thread.questions.map(q=>`<article class="criterion"><div class="chat-bubble pre">${esc(q.text)}</div>
    ${q.answer?`<div class="chat-answer pre">${esc(q.answer)}</div>`:chip("Ожидает ответа","amber",true)}</article>`).join(""):empty("Уточнений пока нет","","chat")}
    ${thread?.questions.some(q=>q.status==="open")&&(a.contact||person?.contact)?btn("Подготовить ссылку для кандидата",`data-action="clarify-link" data-id="${enc(thread.threadId)}"`,"secondary","link"):""}</div>`;
  if(active==="history") detail=`<div class="stack">${cardHead("История этапов")}
    <ol class="history">${history.items.map(e=>`<li><strong class="small">${esc(actions[e.action]||stages[e.toStage]?.[0]||"Обновление")}</strong><p class="tiny muted">${esc(date(e.occurredAt,true))} · ${esc(e.actorName)}</p>
    ${e.reason?`<p class="small">${esc(e.reason)}</p>`:""}</li>`).join("")}</ol>${pagination(history.nextCursor)}</div>`;
  const activeIndex=["received","review","interview","decision"].indexOf(a.stage.currentStage);
  return `<div class="row wrap">${link("/hr/applications","Назад к откликам","secondary btn-sm")}
    ${chip(sourceNames[a.sourceChannel])}</div>
  <div class="page-head"><div class="detail-title">${avatar(a.fullName)}<div class="grow"><h1 tabindex="-1">${esc(a.fullName)}</h1><p class="muted">${esc(a.vacancyTitle)}</p></div></div>${stagePill(a)}</div>
  <div class="details-grid"><section class="card pad stack"><nav class="tabs" aria-label="Материалы отклика">${tabs.map(([key,label])=>`<a data-link href="${esc(pagePath(url,{tab:key==="assessment"?"":key}))}" ${key===active?'aria-current="page"':""}>${esc(label)}</a>`).join("")}</nav>${detail}</section>
  <aside class="stack">
    <section class="card pad stack-sm"><h2>Этап подбора</h2><div>${stagePill(a)}</div>
    ${a.triage && a.triage.status!=="closed" ? `<div class="note stack-sm">${intakeStatus(a.triage)}<p>${esc(intakeReasons[a.triage.reason])}</p></div>` : ""}
    <div class="stage-progress" aria-hidden="true">${Array.from({length:4},(_,i)=>`<i class="${i<=activeIndex?"filled":""}"></i>`).join("")}</div>
    ${a.stage.transitions.length?`<div class="stack-sm">${a.stage.transitions.map(action=>btn(actions[action],`data-action="transition" data-stage-action="${action}"`,action==="reject"?"danger":"primary",action==="reject"?"xCircle":"check")).join("")}</div>`:""}
    </section>
    ${interviewCard(record)}${employmentCard(employment)}
    <section class="card pad stack-sm"><h2>Сведения об отклике</h2>${meta([["Email",known(a.contact)],["Дата получения",a.sourceReceivedAt?esc(date(a.sourceReceivedAt,true)):"Не указано"],...(a.importedAt?[["Дата импорта",esc(date(a.importedAt,true))]]:[])])}</section>
  </aside></div>`;
}
async function candidatesView() {
  const p=new URLSearchParams(location.search);
  const r=await getJSON("/hr/candidates"+location.search);
  const rows=r.items.map((x,i)=>{
    const url="/hr/candidates/"+enc(x.candidateId);
    return {href:url,cells:[`<div class="person-ct">${avatar(x.fullName,i)}<div><a data-link href="${url}" class="table-name">${esc(x.fullName)}</a></div></div>`,known(x.contact),known(x.education),known(x.additionalEducation),known(x.experience)]};
  });
  return `${heading("Кандидаты","Найдите профиль по фамилии или имени и откройте историю откликов.",btn("Создать профиль",'data-action="new-candidate"',"primary","plus"))}
  <form class="card pad row wrap" data-form="candidate-filter">${searchField(p.get("q"))}${input("skills","Навыки и опыт",{max:120,value:p.get("skills"),placeholder:"Например, SQL отчётность"})}${input("additionalEducation","Доп. образование",{max:160,value:p.get("additionalEducation"),placeholder:"Например, юриспруденция"})}
  <div class="row wrap" style="align-self:end">${submit("Найти","search")}${link("/hr/candidates","Сбросить","quiet")}</div></form>
  <section class="card">${rows.length?table([["Кандидат",23],["Email",22],["Образование",18],["Доп. образование",19],["Опыт",18]],rows):empty("Кандидаты не найдены","Измените параметры поиска или создайте профиль.","users")}${pagination(r.nextCursor)}</section>`;
}
async function candidateView(id) {
  const person=await getJSON("/hr/candidates/"+enc(id)+location.search);
  const source=person.factsSource?.type==="resume"?link("/hr/applications/"+enc(person.factsSource.applicationId)+"?tab=resume","Исходное резюме","quiet btn-sm","file"):person.factsSource?.actorName?`<div class="small muted">Запись HR · ${esc(person.factsSource.actorName)} · ${esc(date(person.factsSource.at))}</div>`:"";
  return `<div>${link("/hr/candidates","Назад к кандидатам","secondary btn-sm")}</div>${heading(person.fullName,person.contact||"Email не указан")}
  <section class="card pad stack-sm"><h2>Профиль кандидата</h2>${meta([["Образование",known(person.education)],["Доп. образование",known(person.additionalEducation)],["Опыт",known(person.experience)]])}${source}</section>
  <section class="card"><div class="table-title"><h2>История откликов</h2></div>${applicationTable(person.applications,true)}${pagination(person.nextCursor)}</section>`;
}
function surveySummary(cards) {
  return `<div class="dashboard-grid">${cards.map(x=>{
    const names=[["Отправлено",number(x.sent)],["Ответили",number(x.answered)],["Средняя оценка понятности",x.averages.clarity==null?"—":number(x.averages.clarity)+" / 5"]];
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
  const type=p.get("type")==="exit_feedback"&&actor.role==="admin"?"exit_feedback":"interview_feedback";
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
  const nav=Object.entries(typeLabels).filter(([id])=>id!=="exit_feedback"||actor.role==="admin").map(([id,label])=>`<a data-link href="/hr/feedback?type=${id}" ${type===id?'aria-current="page"':""}>${esc(label)}</a>`).join("");
  const overview=analytics.surveys.filter(item=>item.type===type);
  const filters=[["","Все анкеты"],["prepared","К отправке"],["sent","Ждут ответа"],["answered","С ответами"]].map(([value,label])=>link(pagePath("/hr/feedback",{type,status:value}),label,status===value?"secondary btn-sm":"quiet btn-sm")).join("");
  return `${heading("Обратная связь","Отдельно по интервью и увольнениям.")}
  <nav class="tabs" aria-label="Тип анкеты">${nav}</nav>${surveySummary(overview)}
  <div class="row wrap" aria-label="Фильтр анкет">${filters}</div>
  <section class="card">${rows.length?table([["Получатель",39],["Статус",22],["Отправлена",22],["",17]],rows):empty("Анкет в этой выборке нет","","feedback")}${pagination(r.nextCursor)}</section>`;
}
async function publicVacancies() {
  const r=await getJSON("/public/vacancies"+location.search);
  const cards=r.items.map(v=>`<article class="card vac-card"><div class="row between align-start">${tile("brief")}</div>
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
    <form data-form="public-application" data-vacancy="${esc(v.vacancyId)}" data-version="${esc(v.publishedVersionId)}" data-require-resume="${v.formFields.find(f=>f.id==="resume")?.required!==false?"1":"0"}" class="card pad stack">
      ${syntheticOnly ? `<p class="note">Учебная форма. Используйте вымышленные имя, email и резюме.</p>` : ""}
      ${pair(input("fullName","Фамилия и имя",{required:true,max:160,attrs:syntheticOnly?'autocomplete="off"':'autocomplete="name"'}),input("contact","Email для связи",{type:"email",required:true,max:254,...(syntheticOnly?{placeholder:"candidate@example.test",attrs:'autocomplete="off"'}:{attrs:'autocomplete="email"'})}))}
      ${resumeFields(v.formFields.find(f=>f.id==="resume")?.required!==false)}
      ${errors}<div>${submit("Отправить отклик","check")}</div>
    </form></div>`;
  }
  return `<div>${link("/vacancies","Все вакансии","quiet btn-sm","brief")}</div>
    ${heading(v.title,v.department)}
    <div class="job-detail"><section class="card pad stack"><h2>Описание вакансии</h2><div class="pre job-content">${esc(v.description)}</div></section>
    <aside class="card pad stack"><h2>Условия и отклик</h2><div class="row muted small">${ic("pin")}${esc(v.location)}</div><div class="row muted small">${ic("clock")}${esc(v.schedule)}</div>
    ${link("/vacancies/"+enc(slug)+"?apply=1","Откликнуться","primary","check")}</aside></div>`;
}
function chatForm(thread) {
  const open=thread.questions.filter(q=>q.status==="open");
  return `<section class="card pad stack"><h2>Уточнения по отклику</h2><p class="small muted">Отвечайте только о рабочих навыках и опыте. Не указывайте сведения о здоровье, семье и контакты других людей.</p>
    <form class="stack" data-form="clarifications" data-id="${esc(thread.threadId)}">
    ${thread.questions.map((q,i)=>`<article class="criterion"><h3 class="chat-bubble">${esc(q.text)}</h3>${q.status==="answered"?`<div class="chat-answer pre">${esc(q.answer)}</div>`:input("q_"+q.questionId,"Ваш ответ",{type:"textarea",max:2000,attrs:`data-question="${esc(q.questionId)}"`,placeholder:"Ответьте на этот вопрос, если можете уточнить детали"})}</article>`).join("")}
    ${errors}${open.length?`<div>${submit("Отправить ответы","check")}</div>`:'<p class="note">Ответы сохранены. Спасибо!</p>'}</form></section>`;
}
async function receiptView(code) {
  const receipt=await getJSON("/public/receipts/"+enc(code));
  return `<div class="public-narrow card pad stack success-banner">${tile("check","green")}<h1 tabindex="-1">Отклик отправлен</h1>
    <div class="small muted">Номер отклика <span class="receipt-code">${esc(receipt.receiptNumber)}</span></div>
    <p class="small muted">Кадровая команда получила ваш отклик.</p></div>`;
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
  if (submission===token) return `<div class="public-narrow card pad stack success-banner">${tile("check","green")}<h1 tabindex="-1">Спасибо за обратную связь</h1><p class="muted small">Ваш ответ сохранён.</p></div>`;
  const data=await getJSON("/public/surveys/"+enc(token));
  return `<div class="public-narrow card pad stack-lg">${heading(data.title,"Заполнение анкеты добровольное.")}
  <p class="note">${esc(data.audience)}</p><form class="stack-lg" data-form="survey" data-token="${esc(token)}">
    ${data.questions.map(q=>q.type==="rating"?`<fieldset class="rating-set" data-rating="${esc(q.id)}"><legend>${esc(q.text)}</legend><div class="rating">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${esc(q.id)}" value="${n}" required><span>${n}</span></label>`).join("")}</div></fieldset>`:input(q.id,q.text,{type:"textarea",optional:!q.required,max:1200})).join("")}
    ${errors}<div>${submit("Отправить ответ","check")}</div>
  </form></div>`;
}
function showDialog(title, content) {
  modal.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${btn("","data-action=close-dialog aria-label=\"Закрыть\"","quiet btn-icon","close")}</div><div class="dialog-body">${content}</div>`;
  if(!modal.open) modal.showModal();
  modal.scrollTop=0;
}
function candidateForm() {
  return `<form class="stack" data-form="create-candidate">${errors}
  ${input("fullName","Фамилия и имя",{max:160,required:true})}${input("contact","Email",{type:"email",max:254,optional:true})}
  ${input("education","Образование",{max:500,optional:true})}${input("additionalEducation","Доп. образование",{max:500,optional:true})}${input("experience","Опыт",{type:"textarea",max:1000,optional:true})}
  <div>${submit("Создать профиль","check")}</div></form>`;
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
function pollAssessment(id, run) {
  setTimeout(async () => {
    if (run!==navRun) return;
    try {
      const evaluation=await getJSON("/hr/applications/"+enc(id)+"/assessment");
      if (run!==navRun) return;
      if (evaluation.assessmentStatus!=="pending"&&!modal.open) await render();
      else pollAssessment(id,run);
    } catch {
      if (run===navRun) toast("Не удалось проверить разбор. Обновите страницу.",true);
    }
  },1800);
}
async function render({focus=false}={}) {
  const run=++navRun;
  const path=location.pathname.replace(/\/$/,"")||"/";
  const bits=path.split("/").filter(Boolean);
  const isHr=path==="/hr"||path.startsWith("/hr/");
  try {
    if(path==="/"||isHr) {
      const session=await getJSON("/auth/session");
      if(run!==navRun)return;
      actor=session.actor;
      demoAvailable=session.demoAvailable;
      if(path==="/")return go(actor?"/hr":"/vacancies",true);
      if (!session.authenticated) {
        app.innerHTML=loginView();
        document.title="Вход · Кадры · Горький";
        return;
      }
    }
    let view;
    if(isHr) {
      if(bits.length===1)view=await overview();
      else if(bits[1]==="vacancies")view=bits[2]?await editVacancyPage(bits[2]):await listVacancies();
      else if(bits[1]==="applications")view=bits[2]?await applicationDetail(bits[2]):await applicationList();
      else if(bits[1]==="candidates")view=bits[2]?await candidateView(bits[2]):await candidatesView();
      else if(bits[1]==="analytics")view=await analyticsView();
      else if(bits[1]==="feedback")view=await feedbackView();
    } else {
      if(bits[0]==="vacancies")view=bits[1]?await publicVacancyView(bits[1]):await publicVacancies();
      if(bits[0]==="receipts")view=await receiptView(bits[1]);
      if(bits[0]==="clarifications")view=bits[1]==="access"?await clarificationAccess(bits[2]):await clarificationView(bits[1]);
      if(bits[0]==="surveys")view=await surveyView(bits[1]);
    }
    if(run!==navRun)return;
    if(view==null)throw Object.assign(new Error("Проверьте адрес страницы."),{status:404});
    app.innerHTML=isHr?hrShell(view):publicShell(view);
    if (bits[1]==="applications"&&bits[2]&&appDetailData?.evaluation.assessmentStatus==="pending") pollAssessment(bits[2],run);
    const title=app.querySelector("h1");
    document.title=(title?.textContent?title.textContent+" · ":"")+"Кадры · Горький";
    if(focus)title?.focus({preventScroll:true});
  } catch(error) {
    if(run===navRun)app.innerHTML=loadError(error,isHr&&!!actor);
  }
}
function go(url, replace=false) {
  if(url!==location.pathname+location.search)history[replace?"replaceState":"pushState"]({},"",url);
  if(modal.open)modal.close();
  window.scrollTo(0,0);
  return render({focus:true});
}
window.addEventListener("popstate",()=>{ if(modal.open)modal.close();render({focus:true}); });
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
  if(!file?.size&&!text&&(mode==="import"||form.dataset.requireResume==="1")) {
    const field=data.get("resumeMode")==="text"?"resumeText":"resumeFile";
    throw Object.assign(new Error("Добавьте текст или файл резюме."),{fields:[{field}]});
  }
  data.delete("resumeMode");
  if(mode==="public") {
    data.set("vacancyId",form.dataset.vacancy);
    data.set("publishedVersionId",form.dataset.version);
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
  async "candidate-filter"(form,f) {
    await go(pagePath("/hr/candidates",Object.fromEntries(f)));
  },
  async "analytics-filter"(form,f) {
    if(f.get("from")&&f.get("to")&&f.get("from")>f.get("to"))throw Object.assign(new Error("Дата окончания должна быть позже даты начала."),{fields:[{field:"to"}]});
    if(f.get("surveyFrom")&&f.get("surveyTo")&&f.get("surveyFrom")>f.get("surveyTo"))throw Object.assign(new Error("Проверьте период отправки анкет."),{fields:[{field:"surveyTo"}]});
    await go(pagePath("/hr/analytics",Object.fromEntries(f)));
  },
  async "import-application"(form) {
    const a=await mutate(form,"application","/hr/applications","POST",applicationForm(form,"import"));
    toast("Отклик сохранён.");
    await go("/hr/applications/"+enc(a.applicationId));
  },
  async "import-archive"(form,f) {
    const file=f.get("archive");
    if(file.size>120*1024)throw Object.assign(new Error("Допустимый размер архива — 120 КБ."),{fields:[{field:"archive"}]});
    let data;
    try { data=JSON.parse(await file.text()); } catch { throw Object.assign(new Error("Не удалось прочитать JSON. Проверьте формат файла."),{fields:[{field:"archive"}]}); }
    const items=Array.isArray(data)?data:data?.items;
    if(!Array.isArray(items)||!items.length||items.length>20)throw new Error("В архиве должно быть от 1 до 20 откликов.");
    const r=await mutate(form,"archive","/hr/application-imports","POST",{vacancyId:f.get("vacancyId"),items});
    form.querySelector("[data-import-result]").innerHTML=`<div class="note stack-sm"><strong>Принято ${number(r.accepted.length)} из ${number(items.length)}</strong>
      ${r.errors.map(x=>`<p>Строка ${x.index+1}. ${esc(x.message)}</p>`).join("")}${link("/hr/applications","Открыть отклики","secondary btn-sm")}</div>`;
    form.querySelector('button[type="submit"]').hidden=true;
  },
  async "public-application"(form) {
    const data=await mutate(form,"public","/public/applications","POST",applicationForm(form,"public"));
    await go("/receipts/"+enc(data.receiptNumber));
  },
  async "create-candidate"(form,f) {
    const {candidateId}=await mutate(form,"candidate","/hr/candidates","POST",Object.fromEntries(f));
    toast("Профиль создан.");
    await go("/hr/candidates/"+enc(candidateId));
  },
  async override(form,f) {
    await mutate(form,"override","/hr/applications/"+enc(appDetailData.a.applicationId)+"/assessment/"+enc(form.dataset.id),"PATCH",{status:f.get("status"),reason:f.get("reason")});
    toast("Правка сохранена.");
    await go(location.pathname+location.search);
  },
  async transition(form,f) {
    const a=appDetailData.a;
    const scheduled = f.get("scheduledAt");
    await mutate(form,"transition","/hr/applications/"+enc(a.applicationId)+"/transitions","POST",{action:form.dataset.stageAction,expectedVersion:a.stage.version,reason:f.get("reason")||"",...(scheduled?{scheduledAt:scheduled+":00+03:00"}:{})});
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
    const answers=Array.from(f,([questionId,value])=>({questionId,value:questionId==="comment"?String(value):Number(value)}));
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
  async "demo-login"() {
    await api("/auth/login",{method:"POST",body:{user:"demo"}});
    await render();
  },
  async logout(){
    await api("/auth/logout",{method:"POST",body:{}});
    await go("/vacancies");
  },
  "add-part"(target){
    const form=target.closest("form");
    captureVacancyParts(form);
    if(vacancyParts.criteria.length>=8)return;
    vacancyParts.criteria.push({id:crypto.randomUUID(),required:true});
    paintVacancyParts();
    form.querySelector('[data-parts="criteria"] > div:last-child input[type=text]')?.focus();
  },
  "remove-part"(target){
    const form=target.closest("form");
    captureVacancyParts(form);
    vacancyParts.criteria=vacancyParts.criteria.filter(x=>x.id!==target.dataset.id);
    paintVacancyParts();
    form.querySelector('[data-action="add-part"]')?.focus();
  },
  "import-application"(){return importModal(false);},
  "import-archive"(){return importModal(true);},
  "new-candidate"(){showDialog("Новый профиль",candidateForm());},
  async "analyze-resume"(target){
    const id=appDetailData.a.applicationId;
    target.disabled=true;
    try {
      await api("/hr/applications/"+enc(id)+"/assessment",{method:"POST",body:{},key:crypto.randomUUID()});
      if (!target.isConnected) return;
      toast("GigaChat разбирает резюме…");
      await render();
    } finally {
      target.disabled=false;
    }
  },
  override(target){
    const item=appDetailData.evaluation.items.find(x=>x.criterionId===target.dataset.id);
    showDialog("Правка критерия",`<form class="stack" data-form="override" data-id="${esc(item.criterionId)}"><p class="small muted">${esc(item.label)}</p>
    ${selectField("status","Вывод HR",Object.entries(statusNames).map(([k,[v]])=>[k,v]),item.hrOverride?.status||item.status)}
    ${input("reason","Основание",{type:"textarea",required:true,max:1200,value:item.hrOverride?.reason})}${errors}<div>${submit("Сохранить","check")}</div></form>`);
  },
  async "interview-draft"(target){
    const id=appDetailData.a.applicationId;
    target.disabled=true;
    target.setAttribute("aria-busy","true");
    try {
      const draft=await api("/hr/applications/"+enc(id)+"/interview-draft",{method:"POST",body:{},key:target.dataset.key||=crypto.randomUUID()});
      delete target.dataset.key;
      if(!target.isConnected)return;
      target.disabled=false;
      target.focus({preventScroll:true});
      const source=draft.source==="local"?"Показаны вопросы из настроек вакансии.":`Черновик подготовлен с ${draft.source==="gigachat"?"GigaChat":"YandexGPT"}. Проверьте формулировки перед интервью.`;
      showDialog("Вопросы для интервью",`<div class="stack"><p class="note">${source}</p>
        ${draft.questions.map(({label,question})=>`<article class="criterion"><h3>${esc(label)}</h3><p>${esc(question)}</p></article>`).join("")}</div>`);
    } finally {
      target.disabled=false;
      target.removeAttribute("aria-busy");
    }
  },
  async evidence(target){
    const {a}=appDetailData;
    const id=target.dataset.id;
    if(target.dataset.type==="test"){
      const answer=a.answers.find(x=>x.questionId===id);
      showDialog("Ответ на вопрос теста",`<div class="stack"><h3>${esc(answer?.question)}</h3><div class="resume">${known(answer?.value)}</div></div>`);
      return;
    }
    if(target.dataset.type==="resume"){
      showDialog("Исходное резюме",sourceCard(a));
      return;
    }
    const source=await getJSON("/hr/resume-sources/"+enc(id));
    showDialog("Ответ кандидата",`<div class="resume">${known(source.text)}</div>`);
  },
  transition(target){
    const action=target.dataset.stageAction;
    showDialog(actions[action],`<form class="stack" data-form="transition" data-stage-action="${esc(action)}">
    ${action==="invite_interview"?input("scheduledAt","Дата и время интервью (МСК)",{type:"datetime-local",required:true}):""}
    ${input("reason","Комментарий к этапу",{type:"textarea",max:1200,optional:true})}${errors}<div>${submit(actions[action],"check")}</div></form>`);
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
    ${input("effectiveAt","Дата увольнения",{type:"date",value:d,required:true,attrs:`max="${d}" min="${esc(emp.startedAt.slice(0,10))}"`})}
    ${selectField("reasonCategory","Основание",Object.entries(departureReasons),"employer_initiated")}
    <p class="note">При увольнении по инициативе работодателя будет подготовлена добровольная анкета для бывшего сотрудника.</p>
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
  if(row&&!e.target.closest("button,a,input,label")&&e.button===0)await go(row.dataset.href);
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&document.querySelector(".rail.open"))clickActions.menu();
});
document.addEventListener("input",e=>{
  const target=e.target;
  if(target.name==="title"){
    const slug=target.form?.querySelector("[data-slug-field]");
    if(slug&&!slug.dataset.edited)slug.value=convertSlug(target.value);
  }
  if(target.matches?.("[data-slug-field]"))target.dataset.edited="1";
  if(target.getAttribute?.("aria-invalid")==="true")target.removeAttribute("aria-invalid");
});
document.addEventListener("change",async e=>{
  const select=e.target;
  if(select.matches?.('input[name="resumeMode"]')) {
    for (const panel of select.closest("[data-resume-fields]").querySelectorAll("[data-resume-input]")) {
      const visible=panel.dataset.resumeInput===select.value;
      panel.hidden=!visible;
      panel.querySelector("input, textarea").disabled=!visible;
    }
    return;
  }
  if(!select.matches?.("[data-vacancy-cursor]"))return;
  if(select.value!=="__more"){select.dataset.value=select.value;return;}
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
  finally{select.disabled=false;select.focus();}
});
render();
