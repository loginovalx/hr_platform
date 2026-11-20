function applicationCohort(ctx, {vacancyId,from,to}) {
  const conditions=["kind='application'"], args=[];
  vacancyScope(ctx,"scope",conditions,args);
  if (vacancyId) { conditions.push("scope=?");args.push(vacancyId); }
  if (from) { conditions.push("sort>=?");args.push(periodStart(from)); }
  if (to) { conditions.push("sort<=?");args.push(periodEnd(to)); }
  return {where:conditions.join(" AND "),args};
}

function firstStageAction(applicationId,acceptedAt) {
  return `SELECT min(e.sort) FROM records e WHERE e.kind='stage_event' AND e.scope=${applicationId}
    AND e.sort>=${acceptedAt} AND json_extract(e.data,'$.action')<>'receive'`;
}

async function operationsAnalytics(ctx, cohort) {
  const rowsByChannel = await all(ctx,`WITH cohort AS MATERIALIZED (
    SELECT id,coalesce(json_extract(data,'$.sourceChannel'),'unknown') channel,
      json_extract(data,'$.stage.outcome') outcome,coalesce(json_extract(data,'$.acceptedAt'),sort) accepted_at
    FROM records WHERE ${cohort.where}
  ), activity AS (
    SELECT c.*,h.id handoff, json_extract(h.data,'$.response') answer,
      json_extract(h.data,'$.dueAt') due_at,
      (${firstStageAction("c.id","c.accepted_at")}) first_action
    FROM cohort c LEFT JOIN records h ON h.kind='handoff' AND h.id=c.id
  ), ranked AS (
    SELECT round((julianday(first_action)-julianday(accepted_at))*1440,2) minutes,
      row_number() OVER (ORDER BY first_action IS NULL,julianday(first_action)-julianday(accepted_at)) rank,
      count(first_action) OVER () samples FROM activity
  ), median AS (
    SELECT round(avg(minutes),1) minutes FROM ranked WHERE samples>0 AND rank IN ((samples+1)/2,(samples+2)/2)
  )
  SELECT channel,count(*) received,count(first_action) reviewed,
    sum(first_action IS NULL AND outcome IS NULL) without_action,
    sum(handoff IS NOT NULL AND answer IS NULL) waiting,
    sum(handoff IS NOT NULL AND answer IS NULL AND due_at<=?) overdue,
    sum(answer IS NOT NULL) answered,
    (SELECT minutes FROM median) median_minutes
  FROM activity GROUP BY channel ORDER BY received DESC,channel`, ...cohort.args,isoNow());
  return {
    withoutAction:rowsByChannel.reduce((n,row)=>n+row.without_action,0),
    firstAction:{
      samples:rowsByChannel.reduce((n,row)=>n+row.reviewed,0),
      medianMinutes:rowsByChannel[0]?.median_minutes ?? null
    },
    handoffs:rowsByChannel.reduce((r,row)=>({
      waiting:r.waiting+row.waiting, overdue:r.overdue+row.overdue, answered:r.answered+row.answered
    }),{waiting:0,overdue:0,answered:0}),
    channels:rowsByChannel.map(row=>({channel:row.channel,received:row.received,withoutAction:row.without_action}))
  };
}

async function analyticsBrief(ctx) {
  const operations=await operationsAnalytics(ctx,applicationCohort(ctx,periodFilter(ctx)));
  const facts={
    withoutAction:operations.withoutAction,
    handoffsWaiting:operations.handoffs.waiting,
    handoffsOverdue:operations.handoffs.overdue,
    medianMinutes:operations.firstAction.medianMinutes,
    measuredApplications:operations.firstAction.samples
  };
  const suggested=[];
  if(facts.handoffsOverdue) suggested.push("handoffs");
  if(facts.withoutAction) suggested.push("first_action");
  if(facts.handoffsWaiting && !suggested.includes("handoffs")) suggested.push("handoffs");
  if(facts.measuredApplications) suggested.push("timing");
  let priorities=suggested;
  let source="local";
  if(suggested.length>1 && ctx.env.GIGACHAT_AUTH_KEY?.trim()) {
    const raw=await cachedGigaCompletion(ctx.env,{...facts,allowed:suggested},"analytics");
    try {
      const decoded=typeof raw==="string" && raw.length<1000 ? JSON.parse(raw) : null;
      if(Array.isArray(decoded?.priorities)) {
        const selected=[...new Set(decoded.priorities.slice(0,8).filter(key=>suggested.includes(key)))];
        if(selected.length) {
          priorities=[...selected,...suggested.filter(key=>!selected.includes(key))];
          source="gigachat";
        }
      }
    } catch {
      // Computed priorities are used when the response is not valid JSON.
    }
  }
  return result({source,priorities:priorities.slice(0,2),facts});
}

const departureCategories = ["employer_initiated", "voluntary", "agreement", "other"];
const earlyDepartureDays = 90;
function departureSurveyMetrics(records) {
  const answered = records.filter(row => row.answers);
  const counts = Object.fromEntries(Object.keys(exitTopics).map(key => [key, 0]));
  const ratings = { manager: [], administration: [] };
  for (const row of answered) {
    const fields = new Map(JSON.parse(row.answers).map(({ questionId, value }) => [questionId, value]));
    const topics = new Set(Array.isArray(fields.get("topics")) ? fields.get("topics") : []);
    if (fields.get("reason") === "workload") topics.add("conditions");
    for (const topic of topics) if (Object.hasOwn(counts, topic)) counts[topic]++;
    for (const key of Object.keys(ratings)) {
      const value = fields.get(key);
      if (Number.isInteger(value) && value >= 1 && value <= 5) ratings[key].push(value);
    }
  }
  const averages = Object.fromEntries(Object.entries(ratings).map(([key, values]) =>
    [key, { count:values.length, value:values.length < 3 ? null : values.reduce((sum,n)=>sum+n,0)/values.length }]));
  return { answered: answered.length, topics: answered.length < 3 ? null : counts, ratings: averages };
}
async function departureAnalytics(ctx) {
  requireExit(ctx);
  const { from, to } = periodFilter(ctx);
  const department = field(ctx.url.searchParams.get("department"), "department", 160);
  const category = ctx.url.searchParams.get("category") || "";
  if (category && !departureCategories.includes(category)) invalid("category", "invalid_category", "Выберите основание увольнения.");
  const end = to || moscowDay(isoNow());
  const endingMonth = new Date(end + "T00:00:00Z");
  const defaultStart = new Date(Date.UTC(endingMonth.getUTCFullYear(), endingMonth.getUTCMonth()-5, 1)).toISOString().slice(0,10);
  const start = from || defaultStart;
  if (start > end) invalid("period", "invalid_period", "Проверьте даты начала и окончания.");
  const departments = await all(ctx, `SELECT DISTINCT json_extract(data,'$.department') department
    FROM records WHERE kind='version' AND json_extract(data,'$.department')<>'' ORDER BY department`);
  const dateSql = "json_extract(t.data,'$.effectiveAt')";
  const departmentSql = "json_extract(v.data,'$.department')";
  const categorySql = "json_extract(t.data,'$.reasonCategory')";
  const filters = [dateSql+" BETWEEN ? AND ?"];
  const args = [periodStart(start), periodEnd(end)];
  if (department) { filters.push(departmentSql+"=?"); args.push(department); }
  if (category) { filters.push(categorySql+"=?"); args.push(category); }
  const records = await all(ctx, `SELECT ${departmentSql} department, ${categorySql} category,
    strftime('%Y-%m',${dateSql},'+3 hours') month,
    julianday(date(${dateSql},'+3 hours'))-julianday(date(json_extract(e.data,'$.startedAt'),'+3 hours')) tenure,
    json_extract(r.data,'$.answers') answers
    FROM records t
    JOIN records e ON e.kind='employment' AND e.id=t.scope
    JOIN records a ON a.kind='application' AND a.id=json_extract(e.data,'$.applicationId')
    JOIN records v ON v.kind='version' AND v.id=json_extract(a.data,'$.versionId')
    LEFT JOIN records i ON i.kind='invitation' AND i.id=json_extract(t.data,'$.invitationId')
    LEFT JOIN records r ON r.kind='survey_response' AND r.id=json_extract(i.data,'$.responseId')
    WHERE t.kind='termination' AND ${filters.join(" AND ")}`, ...args);
  const months = new Map();
  const departmentsByName = new Map();
  const categories = Object.fromEntries(departureCategories.map(key => [key, 0]));
  let early = 0;
  const firstMonth = new Date(start.slice(0,7) + "-01T00:00:00Z");
  for (const month = new Date(firstMonth); month <= endingMonth; month.setUTCMonth(month.getUTCMonth()+1)) {
    const key = month.toISOString().slice(0,7);
    months.set(key, { month:key, total:0, early:0 });
  }
  for (const row of records) {
    if (!departmentsByName.has(row.department)) departmentsByName.set(row.department, []);
    departmentsByName.get(row.department).push(row);
    const point = months.get(row.month);
    if (point) point.total++;
    if (Object.hasOwn(categories,row.category)) categories[row.category]++;
    if (row.tenure != null && row.tenure >= 0 && row.tenure <= earlyDepartureDays) {
      early++;
      if (point) point.early++;
    }
  }
  const groups = [...departmentsByName].map(([name,entries]) => ({
    department:name, total:entries.length,
    early:entries.filter(row=>row.tenure != null && row.tenure >= 0 && row.tenure <= earlyDepartureDays).length,
    ...departureSurveyMetrics(entries)
  })).sort((a,b)=>b.early-a.early || b.total-a.total || a.department.localeCompare(b.department,"ru"));
  const signal = groups[0]?.early >= 3 ? groups[0] : null;
  const decision = signal && await prep(ctx, `SELECT json_extract(data,'$.text') text, sort recordedAt FROM records
    WHERE kind='departure_decision' AND scope=? ORDER BY sort DESC,id LIMIT 1`, signal.department).first();
  return result({ from:start, to:end, departments:departments.map(x=>x.department), groups,
    series:[...months.values()], total:records.length, early, categories, survey:departureSurveyMetrics(records),
    signal:signal && { department:signal.department, early:signal.early, decision:decision || null } });
}
async function saveDepartureDecision(ctx) {
  requireExit(ctx);
  const department = field(ctx.body.department,"department",160,true);
  const text = field(ctx.body.text,"text",1200,true);
  const exists = await prep(ctx, "SELECT 1 FROM records WHERE kind='version' AND json_extract(data,'$.department')=? LIMIT 1",department).first();
  if (!exists) missing();
  const decision = make({ text, actorId:ctx.actor.id }, department);
  return commit(ctx,[put(ctx,"departure_decision",decision)],result({ recordedAt:decision.sort },201));
}
