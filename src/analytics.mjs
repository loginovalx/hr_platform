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
