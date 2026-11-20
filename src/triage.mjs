const triageStatuses = new Set(["review_first", "clarify", "check_source", "confirmed_gap", "manual_review", "processing", "closed"]);

function triageQuery(conditions) {
  return `WITH selected AS (
    SELECT * FROM records WHERE kind='application'${conditions.length ? " AND " + conditions.join(" AND ") : ""}
  ), evidence AS MATERIALIZED (
    SELECT a.*, assessment.id AS assessmentId, source.id AS resumeId,
      json_extract(source.data,'$.attachment') IS NOT NULL AS hasAttachment,
      coalesce(json_extract(source.data,'$.readable'),length(trim(coalesce(json_extract(source.data,'$.text'),'')))>0,0) AS hasText,
      coalesce(nullif(json_extract(a.data,'$.contact'),''), nullif(json_extract(person.data,'$.contact'),'')) IS NOT NULL AS hasContact,
      EXISTS (SELECT 1 FROM json_each(a.data,'$.answers') r WHERE length(trim(coalesce(json_extract(r.value,'$.value'),'')))>0) AS hasAnswers,
      (SELECT json_object(
        'required',count(*),
        'confirmed',coalesce(sum(overrideStatus='matched'),0),
        'confirmedGaps',coalesce(sum(overrideStatus='not_met'),0),
        'withEvidence',coalesce(sum(hasEvidence),0),
        'supported',coalesce(sum(CASE WHEN overrideStatus='matched' OR
          (overrideStatus IS NULL AND modelStatus='matched' AND hasEvidence) THEN 1 ELSE 0 END),0),
        'priorityEvidence',coalesce(sum(CASE WHEN overrideStatus IS NULL AND modelStatus IN ('matched','partial')
          AND hasEvidence THEN 1 ELSE 0 END),0)
      ) FROM (
        SELECT json_extract(c.value,'$.hrOverride.status') AS overrideStatus,
          json_extract(c.value,'$.status') AS modelStatus,
          coalesce(json_array_length(json_extract(c.value,'$.evidence')),0)>0 AS hasEvidence
        FROM json_each(assessment.data,'$.items') c WHERE json_extract(c.value,'$.required')=1
      )) AS progress
    FROM selected a
    LEFT JOIN records assessment ON assessment.kind='assessment' AND assessment.id=a.id
    LEFT JOIN records source ON source.kind='source' AND source.id=json_extract(a.data,'$.sourceId')
    LEFT JOIN records person ON person.kind='candidate' AND person.id=json_extract(a.data,'$.candidateId')
  ), reasons AS (
    SELECT *, json_extract(progress,'$.confirmed')*9+json_extract(progress,'$.priorityEvidence') AS priority,
      CASE
        WHEN json_extract(data,'$.stage.outcome') IS NOT NULL THEN 'finished'
        WHEN json_extract(progress,'$.confirmedGaps')>0 THEN 'hr_confirmed_gap'
        WHEN resumeId IS NULL THEN 'missing_source'
        WHEN NOT hasText AND hasAttachment THEN 'unreadable_attachment'
        WHEN NOT hasText AND NOT hasAnswers THEN 'missing_text'
        WHEN NOT hasContact AND json_extract(data,'$.sourceChannel')!='archive' THEN 'missing_contact'
        WHEN json_extract(data,'$.assessmentStatus')='pending' THEN 'analysis_pending'
        WHEN json_extract(data,'$.assessmentStatus')='failed' OR assessmentId IS NULL THEN 'analysis_unavailable'
        WHEN json_extract(progress,'$.required')=0 THEN 'no_required_criteria'
        WHEN json_extract(progress,'$.supported')=json_extract(progress,'$.required') THEN 'required_supported'
        ELSE 'required_need_evidence'
      END AS reason
    FROM evidence
  ), classified AS (
    SELECT *, CASE reason
      WHEN 'finished' THEN 'closed'
      WHEN 'hr_confirmed_gap' THEN 'confirmed_gap'
      WHEN 'analysis_pending' THEN 'processing'
      WHEN 'analysis_unavailable' THEN 'manual_review'
      WHEN 'no_required_criteria' THEN 'manual_review'
      WHEN 'required_supported' THEN 'review_first'
      WHEN 'required_need_evidence' THEN 'clarify'
      ELSE 'check_source'
    END AS triageStatus
    FROM reasons
  )`;
}

function queueItem(row) {
  const progress = JSON.parse(row.progress);
  return {
    ...applicationSummary(decodeRow(row)),
    reviewProgress: progress.required ? {
      required: progress.required, confirmed: progress.confirmed, withEvidence: progress.withEvidence
    } : null,
    triage: { status: row.triageStatus, reason: row.reason }
  };
}

async function applicationQueue(ctx, conditions, params, usePriority) {
  const selected = ctx.url.searchParams.get("triage") || "";
  if (selected && !triageStatuses.has(selected)) invalid("triage", "invalid_triage", "Выберите статус разбора.");
  const { limit, after } = pageOptions(ctx.url);
  const filters = selected ? ["triageStatus=?"] : [];
  const values = selected ? [selected] : [];
  if (after && usePriority) {
    filters.push(`((priority, sort) < (coalesce((SELECT priority FROM classified WHERE id=?),0), ?)
      OR (priority=coalesce((SELECT priority FROM classified WHERE id=?),0) AND sort=? AND id>?))`);
    values.push(after.id, after.sort, after.id, after.sort, after.id);
  } else if (after) {
    filters.push("(sort<? OR (sort=? AND id>?))");
    values.push(after.sort, after.sort, after.id);
  }
  const order = usePriority ? "priority DESC, sort DESC, id" : "sort DESC, id";
  const found = await all(ctx, `${triageQuery(conditions)}, totals AS (
    SELECT json_group_object(triageStatus, total) AS counts
    FROM (SELECT triageStatus,count(*) AS total FROM classified GROUP BY triageStatus)
  ), queuePage AS (
    SELECT * FROM classified${filters.length ? " WHERE " + filters.join(" AND ") : ""}
    ORDER BY ${order} LIMIT ?
  ) SELECT queuePage.*, totals.counts FROM totals LEFT JOIN queuePage ON 1=1 ORDER BY ${order}`, ...params, ...values, limit + 1);
  const pageRows = found[0]?.id ? found.slice(0, limit) : [];
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(queueItem),
    nextCursor: found.length > limit ? `${last.sort}~${last.id}` : null,
    triageTotals: { ...Object.fromEntries([...triageStatuses].map(status => [status, 0])), ...JSON.parse(found[0]?.counts || "{}") }
  };
}

async function getTriage(ctx, id) {
  const row = await prep(ctx, `${triageQuery(["id=?"])} SELECT triageStatus, reason FROM classified`, id).first();
  return row && { status: row.triageStatus, reason: row.reason };
}
