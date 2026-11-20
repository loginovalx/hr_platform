const archiveMonths = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const maxArchiveEvents = 20;
function archiveDate(value) {
  let numbers;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const numeric = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/.exec(value);
  const named = /^(\d{1,2})\s+([а-я]+)\s+(\d{4})(?:\s*(?:года|г\.?))?$/u.exec(lowered(value));
  if (iso) numbers = iso.slice(1);
  else if (numeric) numbers = [numeric[3].length===2 ? "20"+numeric[3] : numeric[3],numeric[2],numeric[1]];
  else if (named) numbers = [named[3],archiveMonths.indexOf(named[2])+1,named[1]];
  if (!numbers) return null;
  return day(numbers.map(x=>String(x).padStart(2,"0")).join("-"));
}

// Both formats are exported by the source system. Preserve the exact position/date
// span, because an archive event is a reference to the document, not a new intake.
function parseArchiveEvents(text) {
  text=text.replace(/\r\n?/g,"\n");
  const lines = [...text.matchAll(/[^\r\n]+/g)].map(match=>({
    value:match[0].trim(), start:match.index+match[0].length-match[0].trimStart().length
  })).filter(line=>line.value);
  const heading = lines.findIndex(({value})=>["история общения с кандидатом","история"].includes(lowered(value).replace(/:$/,"").trim()));
  if (heading < 0) return [];
  const events = new Map();
  const add = (position, dated, label) => {
    if (!position || position.value.length>limits.title || !/\p{L}/u.test(position.value) || !dated.date) return;
    const excerpt = text.slice(position.start,dated.line.start+dated.line.value.length);
    if (excerpt.length>500) return;
    const type = /^отклик/iu.test(label) ? "application"
      : /интервью|собеседован/iu.test(label) ? "interview" : /отказ|решение|принят/iu.test(label) ? "decision" : "other";
    const item = {position:position.value,date:dated.date,type,note:label,excerpt};
    events.set(JSON.stringify([lowered(item.position),item.date,lowered(label)]),item);
  };
  let label = null;
  let position;
  for (let i=heading+1;i<lines.length;i++) {
    const line=lines[i];
    const next=lines[i+1];
    if (/^откликнул(?:ся|ась)$/iu.test(line.value)) { label=line.value;position=null;continue; }
    if (line.value.startsWith("→")) {
      const arrow=/^→\s*([^,]+),\s*(.+)$/u.exec(line.value);
      if (arrow && arrow[1].length<=limits.notes) add(position,{line,date:archiveDate(arrow[2])},arrow[1].trim());
      continue;
    }
    position=next?.value.startsWith("→") ? line : null;
    if (label && next && !archiveDate(line.value)) add(line,{line:next,date:archiveDate(next.value)},label);
  }
  return [...events.values()];
}

async function archiveSource(ctx) {
  const b=ctx.body;
  if (!safePath(b.candidateId)) invalid("candidateId","required","Выберите профиль кандидата.");
  const person=await get(ctx,"candidate",b.candidateId);
  const imported=await prepareResume({...ctx,body:{resumeText:b.text,resumeFile:b.resumeFile}},true);
  const fileDigest=imported.attachment && await sha(imported.attachment.bytes);
  const sourceDigest=await sha(JSON.stringify([fileDigest,imported.text]));
  return {person,...imported,fileDigest,sourceDigest};
}

async function previewArchive(ctx) {
  const source=await archiveSource(ctx);
  const allEvents=parseArchiveEvents(source.text);
  const candidateTitle = source.attachment?.name.replace(/\.[^.]+$/u,"").slice(0,180) || null;
  return result({
    title:candidateTitle,events:allEvents.slice(0,maxArchiveEvents),sourceDigest:source.sourceDigest,
    truncated:source.extractStatus==="truncated" || allEvents.length>maxArchiveEvents,
    readable:Boolean(source.text)
  });
}
