const newsLimit = 45;
const newsFeeds = [
  { id: "mintrud", name: "Минтруд России", rss: "https://mintrud.gov.ru/document/rss", hosts: ["mintrud.gov.ru", "www.mintrud.gov.ru"] },
  { id: "cbr", name: "Банк России", rss: "https://www.cbr.ru/rss/RssNews", hosts: ["www.cbr.ru", "cbr.ru"] },
  { id: "hse", name: "НИУ ВШЭ", rss: "https://www.hse.ru/rss/rss_news_expertise.rss", hosts: ["www.hse.ru", "hse.ru", "issek.hse.ru", "lirt.hse.ru"] }
];
const newsStarter = [
  {
    title: "Мониторинг предприятий. Ноябрь 2026",
    detail: "Выпуск содержит квартальные оценки обеспеченности кадрами по отраслям и планы предприятий по оплате труда.",
    url: "https://www.cbr.ru/press/event?id=32991", source: "cbr", topic: "market", publishedAt: "2026-11-17"
  },
  {
    title: "Генеративный ИИ меняет рынок труда",
    detail: "ИСИЭЗ НИУ ВШЭ и Cloud.ru изучили, как генеративный ИИ влияет на профессии и требования к навыкам.",
    url: "https://issek.hse.ru/news/1213216577.html", source: "hse", topic: "skills", publishedAt: "2026-10-27"
  },
  {
    title: "Минтруд утвердил план апробации подписания электронных кадровых документов",
    detail: "Приказ № 423 от 17 сентября 2026 года описывает эксперимент с подписанием кадровых документов.",
    url: "https://mintrud.gov.ru/docs/mintrud/orders/3231", source: "mintrud", topic: "regulation", publishedAt: "2026-09-18"
  }
];
const newsTopics = [
  ["regulation", /трудов\S* (?:кодекс|законодательств|договор|отношени|прав|гаранти)|кадров\S* (?:документ|электронн\S* документооборот)|охран\S* труда|минимальн\S+ размер\S* оплат\S* труда|(?:^|[^а-я])мрот(?=$|[^а-я])|производственн\S* травм/u],
  ["skills", /(?:кадров\S*|цифров\S*|профессиональн\S*) (?:навык|компетенц|подготовк|переподготовк|квалификац|обучени)|подготовк\S* кадр|повышени\S* квалификац|переобучени\S*|ии[- ]грамотност\S*|(?:\bhr\b|рын\S* труда|подбор\S* персонал|навык\S+|професси\S+).*(?:искусственн\S* интеллект|(?:^|[^а-я])ии(?=$|[^а-я]))|(?:искусственн\S* интеллект|(?:^|[^а-я])ии(?=$|[^а-я])).*(?:рын\S* труда|подбор\S* персонал|кадров\S*|навык\S+|компетенц\S+|в работе|професси\S+)/u],
  ["market", /рын\S* труда|безработиц|занятост|трудоустройств|кадров\S* (?:дефицит|потребност|прогноз|обеспеченн)|дефицит\S* кадр|нехватк\S* (?:кадр|работник)|обеспеченност\S* (?:кадр|работник|персонал)|зарплат|заработн\S* плат|оплат\S* труда|мониторинг предприятий/u]
];
function newsXmlText(value) {
  const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (_, entity) => {
    const key = entity.toLowerCase();
    if (key[0] !== "#") return entities[key];
    const point = key.startsWith("#x") ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return point > 0 && point <= 0x10FFFF ? String.fromCodePoint(point) : "";
  });
}
function newsEntryUrl(value, feed) {
  try {
    const url = new URL(value, feed.rss);
    if (!["http:", "https:"].includes(url.protocol) || !feed.hosts.includes(url.hostname) || url.port || url.username || url.password) return null;
    url.protocol = "https:";
    if (url.hostname === "cbr.ru") url.hostname = "www.cbr.ru";
    if (url.hostname === "hse.ru") url.hostname = "www.hse.ru";
    if (url.hostname === "www.mintrud.gov.ru") url.hostname = "mintrud.gov.ru";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ysclid$|gclid$|fbclid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}
async function newsItem(item) {
  return {...item, id: await sha(item.url)};
}
async function fetchNewsFeed(ctx, feed, now) {
  const request = ctx.env.NEWS_FETCH || fetch;
  const response = await request(feed.rss, { redirect:"error", signal:AbortSignal.timeout(5000) });
  if (!response.ok || !response.body) throw new Error("RSS unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let xml = "", bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 512 * 1024) {
      await reader.cancel();
      throw new Error("RSS too large");
    }
    xml += decoder.decode(value, {stream:true});
  }
  xml += decoder.decode();
  if (!/<rss(?:\s[^<>]*)?>\s*<channel(?:\s[^<>]*)?>[\s\S]*<\/channel>\s*<\/rss>\s*$/i.test(xml)) throw new Error("Invalid RSS");
  const matched = new Map();
  for (const [, entry] of xml.matchAll(/<item(?:\s[^<>]*)?>([\s\S]*?)<\/item>/gi)) {
    const title = newsXmlText(entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 360);
    const topic = newsTopics.find(([, pattern]) => pattern.test(lowered(title)))?.[0];
    if (!topic) continue;
    const link = newsXmlText(entry.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const url = link && newsEntryUrl(link, feed);
    const published = Date.parse(newsXmlText(entry.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || ""));
    if (!url || !Number.isFinite(published) || published > now + 86400000 || matched.has(url)) continue;
    matched.set(url, { title, url, topic, publishedAt: new Date(published).toISOString(), source:feed.id });
    if (matched.size >= newsLimit) break;
  }
  return Promise.all([...matched.values()].map(newsItem));
}
async function refreshNews(ctx, cached) {
  const now = Date.now();
  const previous = new Date(now).toISOString();
  // The database lease also prevents separate server processes from refreshing the same feeds at once.
  const lease = await prep(ctx, `INSERT INTO records(kind,id,sort,data) VALUES('system','news-refresh',?,'{}')
    ON CONFLICT(kind,id) DO UPDATE SET sort=excluded.sort WHERE records.sort<=? RETURNING id`,
  new Date(now + 5 * 60000).toISOString(), previous).first();
  if (!lease) return cached || await get(ctx, "system", "news-cache", false);

  const outcomes = await Promise.allSettled(newsFeeds.map(feed => fetchNewsFeed(ctx, feed, now)));
  const sources = newsFeeds.map(({id,name}, index) => ({id, name, available:outcomes[index].status === "fulfilled"}));
  const articles = new Map((cached?.items || []).map(item => [item.id, item]));
  for (const outcome of outcomes) {
    if (outcome.status === "fulfilled") for (const item of outcome.value) articles.set(item.id, item);
  }
  const updatedAt = isoNow();
  const items = newestNews(articles.values());
  const cache = { items, sources, updatedAt };
  const retryAt = new Date(Date.parse(updatedAt) + (sources.every(source => source.available) ? 30 : 5) * 60000).toISOString();
  await commit(ctx, [
    prep(ctx, `INSERT INTO records(kind,id,sort,data) VALUES('system','news-cache',?,?)
      ON CONFLICT(kind,id) DO UPDATE SET sort=excluded.sort,data=excluded.data`, updatedAt, JSON.stringify(cache)),
    prep(ctx, "UPDATE records SET sort=? WHERE kind='system' AND id='news-refresh'", retryAt)
  ], null);
  return cache;
}
function newestNews(items) {
  return [...items].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id)).slice(0, newsLimit);
}
async function visibleNews(cached) {
  const items = new Map((await Promise.all(newsStarter.map(newsItem))).map(item => [item.id, item]));
  for (const article of cached?.items || []) {
    const entry = items.get(article.id);
    items.set(article.id, entry ? {...entry, ...article} : article);
  }
  return newestNews(items.values());
}
async function newsList(ctx) {
  const cached = await refreshNews(ctx, await get(ctx, "system", "news-cache", false));
  const visible = await visibleNews(cached);
  const ids = JSON.stringify(visible.map(item => item.id));
  const read = new Set((await all(ctx, "SELECT json_extract(data,'$.newsId') AS newsId FROM records WHERE kind='news_read' AND scope=? AND id IN (SELECT ? || value FROM json_each(?))",
    ctx.actor.id, await newsReadPrefix(ctx), ids)).map(row => row.newsId));
  return result({
    items: visible.map(item => ({...item, read:read.has(item.id)})),
    unreadCount: visible.length - read.size,
    sources: cached?.sources ?? newsFeeds.map(({id,name}) => ({id,name,available:null})),
    updatedAt: cached?.updatedAt ?? null
  });
}
const newsReadPrefix = async ctx => (await sha(ctx.actor.id)) + ":";
async function markNewsRead(ctx) {
  const ids = collection(ctx.body.ids, "ids", newsLimit);
  if (!ids.every(id => typeof id === "string" && /^[a-f0-9]{64}$/.test(id))) invalid("ids", "invalid_id", "Выберите публикации из ленты.");
  const cached = await get(ctx, "system", "news-cache", false);
  const visible = new Set((await visibleNews(cached)).map(item => item.id));
  const validIds = [...new Set(ids)].filter(id => visible.has(id));
  const prefix = await newsReadPrefix(ctx);
  return commit(ctx, [prep(ctx, `INSERT OR IGNORE INTO records(kind,id,scope,sort,data)
    SELECT 'news_read',? || value,?,?,json_object('newsId',value) FROM json_each(?)`, prefix, ctx.actor.id, isoNow(), JSON.stringify(validIds))],
  result({marked:validIds.length}));
}
