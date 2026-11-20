import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openServer } from "../scripts/server.mjs";
import worker from "../dist/server/index.js";

async function fixture(t, seed = "0", options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "kadry-test-"));
  const server = await openServer({ port:0, seed, directory, adminPassword:"test-admin-password", hrPassword:"test-hr-password", ...options });
  t.after(async () => { await server.close(); await rm(directory,{recursive:true,force:true}); });
  const client = () => {
    const jar = new Map();
    return async (path, opts = {}) => {
      const { method = "GET", body, expected = 200, key = crypto.randomUUID() } = opts;
      const headers = {cookie:[...jar].map(([n,v])=>n+"="+v).join("; ")};
      if(method!=="GET")headers["Idempotency-Key"]=key;
      if(body&&!(body instanceof FormData))headers["Content-Type"]="application/json";
      const rep=await fetch(server.url+"/api/v1"+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
      for(const cookie of rep.headers.getSetCookie()){
        const [n,v]=cookie.split(";")[0].split("=");
        if(v)jar.set(n,v);else jar.delete(n);
      }
      const data=rep.headers.get("content-type")?.startsWith("application/json")?await rep.json():await rep.text();
      assert.equal(rep.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
      return data;
    };
  };
  const hr=client();
  await hr("/auth/login",{method:"POST",body:{user:"admin",password:"test-admin-password"}});
  return {server,client,hr};
}
const draft = {title:"Аналитик данных",department:"Департамент",description:"Проверять данные.",slug:"analyst",criteria:[
  {id:"req_sql",label:"Знание SQL",code:"sql",question:"Расскажите о SQL."},
  {id:"req_python",label:"Знание Python",code:"python",question:"Расскажите о Python."}
],testQuestions:[{id:"project",text:"Опишите проект",required:true},{id:"quality",text:"Как вы проверяли результат?",required:false}]};
const post = (body, expected = 200, key) => ({method:"POST",body,expected,key});
async function publish(hr, body = draft) {
  const v=await hr("/hr/vacancies",post(body,201));
  return hr("/hr/vacancies/"+v.vacancyId+"/publish",post({},201));
}
const stage = (hr,id,action,expectedVersion,expected=200,key) => hr("/hr/applications/"+id+"/transitions",post({action,expectedVersion},expected,key));
const today = () => new Date().toISOString().slice(0,10);

test("delivery retries are stable across batches and archive history stays out of the funnel", async t => {
  const {hr}=await fixture(t);
  const vacancy=await publish(hr);
  const items=Array.from({length:420},(_,index)=>({fullName:`Учебный ${index}`,resumeText:"Писал SQL.",deliveryId:`row-${index}`}));
  const submit=items=>hr("/hr/application-imports",post({vacancyId:vacancy.vacancyId,sourceChannel:"email",sourceAccount:"test-inbox",items},201));
  for(let offset=0;offset<items.length;offset+=20) assert.equal((await submit(items.slice(offset,offset+20))).accepted.length,20);
  const retry=await submit(items.slice(0,20).reverse());
  assert.equal(retry.accepted.length,0);
  assert.equal(retry.duplicates.length,20);
  const person=await hr("/hr/candidates",post({fullName:"Учебный Архивный"},201));
  const archive={candidateId:person.candidateId,sourceAccount:"demo-folder",deliveryId:"154",title:"Учебный документ № 154",
    text:"Поступление резюме. Разработка визуализаций.",education:"Экономика",events:[
    {position:"Аналитик",date:"2023-01-15",note:"Поступило резюме",type:"application",excerpt:"Поступление резюме"},
    {position:"Аналитик",date:"2023-02-10",note:"Итог рассмотрения",type:"decision",outcome:"rejected"},
    {position:"Консультант",date:"2024-03-12",note:"Рассмотрение",type:"interview"}
  ]};
  await hr("/hr/archive-documents",post(archive,201));
  await hr("/hr/archive-documents",post(archive,200));
  const history=await hr("/hr/candidates/"+person.candidateId);
  assert.equal(history.archiveDocuments.length,1);
  assert.equal(history.archiveDocuments[0].events.length,3);
  assert.equal(new Set(history.archiveDocuments[0].events.map(event=>event.position)).size,2);
  assert.equal(history.archiveDocuments[0].events[1].outcome,"rejected");
  assert.equal(history.archiveDocuments[0].events[0].excerpt,"Поступление резюме");
  assert.equal((await hr("/hr/candidates?"+new URLSearchParams({education:"ЭКОНОМИКА",skills:"визуализаций"}))).items[0].candidateId,person.candidateId);
  assert.equal((await hr("/hr/analytics")).totals.received,420);
  const form=new FormData();
  form.set("candidateId",person.candidateId);
  form.set("sourceAccount","demo-folder");
  form.set("title","Архивный файл с текстом");
  form.set("resumeFile",new File(["Исторический текст"],"history.txt"));
  const attached=await hr("/hr/archive-documents",post(form,201));
  assert.equal(await hr("/hr/archive-documents/"+attached.documentId),"Исторический текст");
  const duplicate=await hr("/hr/archive-documents",post(form,409));
  assert.equal(duplicate.code,"archive_match");
  form.set("confirmDuplicate","on");
  assert.equal((await hr("/hr/archive-documents",post(form,200))).documentId,attached.documentId);
});

test("archive preview reads the three dated entries and fills an already imported document once", async t => {
  const {hr}=await fixture(t);
  const person=await hr("/hr/candidates",post({fullName:"Учебный Кандидат Архивный"},201));
  const source=[
    "ФИО: Учебный Кандидат Архивный",
    "История общения с кандидатом", "Откликнулся",
    "Консультант отдела профессионального развития", "16 сентября 2026", "",
    "Начальник отдела внутреннего финансового контроля, аудита и закупок", "10 сентября 2026", "",
    "Начальник отдела внутреннего финансового контроля, аудита и закупок", "6 августа 2026",
    "Аналитик", "31 февраля 2026"
  ].join("\n");
  const form=()=>{
    const body=new FormData();
    body.set("candidateId",person.candidateId);
    body.set("title","Учебный № 154");
    body.set("sourceAccount","Учебная папка");
    body.set("deliveryId","154");
    body.set("resumeFile",new File([source],"История № 154.txt"));
    return body;
  };
  const empty=await hr("/hr/archive-documents",post(form(),201));
  const path="/hr/candidates/"+person.candidateId;
  const preview=await hr("/hr/archive-previews",post(form()));
  assert.deepEqual(preview.events.map(x=>x.date),["2026-09-16","2026-09-10","2026-08-06"]);
  assert.equal(new Set(preview.events.map(x=>x.position)).size,2);
  assert.ok(preview.events.every(x=>source.includes(x.excerpt) && x.type==="application"));
  assert.equal((await hr(path)).archiveDocuments[0].events.length,0);
  const reviewed=form();
  reviewed.set("events",JSON.stringify(preview.events));
  reviewed.set("sourceDigest",preview.sourceDigest);
  const stale=form();
  stale.set("resumeFile",new File([source+"\nИзменённый источник."],"История № 154.txt"));
  stale.set("sourceDigest",preview.sourceDigest);
  assert.equal((await hr("/hr/archive-documents",post(stale,409))).code,"archive_source_changed");
  await hr("/hr/archive-documents",post(reviewed,200));
  const repeated=await hr("/hr/archive-documents",post(reviewed,200));
  assert.equal(repeated.documentId,empty.documentId);
  const history=(await hr(path)).archiveDocuments;
  assert.equal(history.length,1);
  assert.equal(history[0].events.length,3);
  assert.equal((await hr("/hr/analytics")).totals.received,0);
  const arrows=await hr("/hr/archive-previews",post({candidateId:person.candidateId,text:
    "История:\r\nКонсультант\r\n→ Интервью, 05.03.24\r\n→ Отказ, 15.03.2024"}));
  assert.deepEqual(arrows.events.map(({date,type})=>[date,type]),[["2024-03-05","interview"],["2024-03-15","decision"]]);
});

test("operations analytics isolate archive records and GigaChat prioritizes only aggregate signals", async t => {
  let modelCalls=0;
  const {hr,server}=await fixture(t,"0",{departmentPassword:"department-pass",gigachat:{
    key:"analytics-test-giga",fetch:async (url,init)=>{
      if(url.endsWith("/oauth"))return Response.json({access_token:"model-test",expires_at:Math.floor(Date.now()/1000)+1800});
      modelCalls++;
      const request=JSON.parse(init.body);
      const metrics=JSON.parse(request.messages[1].content);
      assert.equal(metrics.withoutAction,1);
      assert.equal(metrics.handoffsWaiting,1);
      assert.doesNotMatch(init.body,/Секретное имя|candidate@example.test|Секретный текст/);
      return Response.json({choices:[{message:{content:'{"priorities":["handoffs","made_up","first_action","handoffs"]}'}}]});
    }
  }});
  const vacancy=await publish(hr);
  const add=()=>hr("/hr/applications",post({vacancyId:vacancy.vacancyId,sourceChannel:"email",fullName:"Секретное имя",
    contact:"candidate@example.test",resumeText:"Секретный текст и SQL"},201));
  const first=await add();
  await add();
  await stage(hr,first.applicationId,"start_review",0);
  const baseDate=new Date(Date.now()-3*86400000).toISOString();
  const reviewedAt=new Date(Date.parse(baseDate)+2*3600000).toISOString();
  await server.env.DB.prepare("UPDATE records SET data=json_set(data,'$.acceptedAt',?) WHERE kind='application' AND id=?")
    .bind(baseDate,first.applicationId).run();
  await server.env.DB.prepare("UPDATE records SET sort=? WHERE kind='stage_event' AND scope=? AND json_extract(data,'$.action')='start_review'")
    .bind(reviewedAt,first.applicationId).run();
  await hr("/hr/applications/"+first.applicationId+"/handoff",post({assigneeId:"department",dueAt:new Date(Date.now()+86400000).toISOString()},201));
  const person=await hr("/hr/candidates",post({fullName:"Учебный Архив"},201));
  await hr("/hr/archive-documents",post({candidateId:person.candidateId,title:"Историческая запись",sourceAccount:"Папка",text:"Историческая запись"},201));
  const snapshot=await hr("/hr/analytics?vacancyId="+vacancy.vacancyId);
  assert.equal(snapshot.totals.received,2);
  assert.equal(snapshot.operations.withoutAction,1);
  assert.equal(snapshot.operations.firstAction.samples,1);
  assert.equal(snapshot.operations.firstAction.medianMinutes,120);
  assert.equal(snapshot.operations.handoffs.waiting,1);
  assert.equal((await hr("/hr/applications?activity=without_action&vacancyId="+vacancy.vacancyId)).items.length,1);
  const noData=await hr("/hr/analytics?to=2000-01-02");
  assert.deepEqual(noData.operations.firstAction,{samples:0,medianMinutes:null});
  assert.equal(noData.operations.withoutAction,0);
  assert.equal(modelCalls,0);
  const summaryPath="/hr/analytics/brief?vacancyId="+vacancy.vacancyId;
  const result=await hr(summaryPath,post({}));
  assert.equal(result.source,"gigachat");
  assert.deepEqual(result.priorities,["handoffs","first_action"]);
  assert.deepEqual(await hr(summaryPath,post({})),result);
  assert.equal(modelCalls,1);
  await stage(hr,first.applicationId,"invite_interview",1);
  const local=await hr("/hr/analytics/brief?to=2000-01-02",post({}));
  assert.equal(local.source,"local");
  assert.deepEqual(local.priorities,[]);
  assert.equal(modelCalls,1);
});

test("search finds guests immediately and normalizes profile filters without merging names", async t => {
  const {hr,client}=await fixture(t);
  const vacancy=await publish(hr,{...draft,testQuestions:[]});
  const guest=client();
  const received=await guest("/public/applications",post({vacancyId:vacancy.vacancyId,publishedVersionId:vacancy.publishedVersionId,fullName:"Алёна Кедрова",contact:"new@example.test",resumeText:"Писала SQL."},201));
  const person=await hr("/hr/candidates",post({fullName:"Алёна Кедрова",education:"ВЫСШЕЕ ОБРАЗОВАНИЕ",experience:"ДЕЛОПРОИЗВОДСТВО"},201));
  const search=async q=>(await hr("/hr/candidates?"+new URLSearchParams(q))).items;
  const results=await search({q:"КЕДРОВА"});
  assert.deepEqual(results.map(row=>row.kind).sort(),["application","candidate"]);
  assert.equal((await search({skills:"делопроизводство",education:"высшее"}))[0].candidateId,person.candidateId);
  const path="/hr/applications/"+received.applicationId+"/candidate";
  for(let attempt=0;attempt<2;attempt++) await hr(path,{method:"PUT",body:{candidateId:person.candidateId}});
  assert.equal((await search({q:"Кедрова"})).length,1);
  assert.equal((await hr("/hr/candidates/"+person.candidateId)).applications.length,1);
});

test("a duration condition needs evidence and unrelated negation preserves the queue priority", async t => {
  const {hr,server}=await fixture(t);
  for(const [slug,label,resumeText,status,queue] of [
    ["duration","Не менее трёх лет работы с SQL","Пишу запросы на SQL всего один месяц","partial","clarify"],
    ["positive","SQL","Использовал SQL, когда дополнительные проверки не требовались","matched","review_first"]
  ]) {
    const vacancy=await publish(hr,{...draft,slug,testQuestions:[],criteria:[{id:"sql",label,code:"sql"}]});
    const app=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName:"Учебный Кандидат",contact:"user@example.test",resumeText},201));
    const {items:[item]}=await hr("/hr/applications/"+app.applicationId+"/assessment");
    assert.equal(item.status,status);
    assert.match(item.evidence[0].quote,/SQL/);
    assert.equal((await hr("/hr/applications?vacancyId="+vacancy.vacancyId+"&priority=on")).items[0].triage.status,queue);
    if (slug==="duration") {
      await server.env.DB.prepare("UPDATE records SET data=json_remove(json_set(data,'$.items[0].status','matched'),'$.scoringVersion') WHERE kind='assessment' AND id=?").bind(app.applicationId).run();
      assert.equal((await hr("/hr/applications?vacancyId="+vacancy.vacancyId+"&priority=on")).items[0].triage.status,"clarify");
    }
    await hr("/hr/applications/"+app.applicationId+"/transitions",post({action:"reject",expectedVersion:0,reason:"  "},422));
  }
});

test("mail intake extracts the attachment and deduplicates the Message-ID", async t => {
  const {hr}=await fixture(t);
  const vacancy=await publish(hr);
  const form=new FormData();
  form.set("vacancyId",vacancy.vacancyId);
  form.set("sourceAccount","demo-inbox");
  const eml=["From: Candidate <candidate@example.test>","Message-ID: <demo-1@example.test>","Subject: Application",
    'Content-Type: multipart/mixed; boundary="demo"',"","--demo","Content-Type: text/plain; charset=utf-8","","Please see my CV.","--demo",
    'Content-Disposition: attachment; filename="resume.txt"',"Content-Transfer-Encoding: base64","",Buffer.from("Писал запросы SQL.").toString("base64"),"--demo--"].join("\r\n");
  form.set("emailFile",new File([eml],"demo.eml"));
  const first=await hr("/hr/email-imports",post(form,201));
  const repeat=await hr("/hr/email-imports",post(form,200));
  assert.equal(first.applicationId,repeat.applicationId);
  const saved=await hr("/hr/applications/"+first.applicationId);
  assert.equal(saved.resumeSource.text,"Писал запросы SQL.");
  assert.equal(saved.sourceSubject,"Application");
});

test("hosted access requires an assignment and scopes HR records to assigned vacancies", async t => {
  const {hr,server}=await fixture(t);
  const first=await publish(hr);
  const second=await publish(hr,{...draft,slug:"restricted"});
  const privateApp=await hr("/hr/applications",post({vacancyId:second.vacancyId,fullName:"Частный Профиль",resumeText:"SQL"},201));
  const invoke=async(path,id,assignments={})=>worker.fetch(new Request(server.url+"/api/v1"+path,{headers:{"oai-authenticated-user-id":id}}),
    {...server.env,TRUST_PLATFORM:true,STAFF_ACCESS_JSON:JSON.stringify(assignments)},{waitUntil(){}});
  assert.equal((await invoke("/hr/applications","visitor")).status,401);
  const staff={expert:{role:"hr",vacancyIds:[first.vacancyId]}};
  assert.equal((await invoke("/hr/applications/"+privateApp.applicationId,"expert",staff)).status,403);
  assert.equal((await (await invoke("/hr/applications","expert",staff)).json()).items.length,0);
  assert.equal((await (await invoke("/hr/candidates?q="+encodeURIComponent("Частный"),"expert",staff)).json()).items.length,0);
  assert.equal((await (await invoke("/hr/analytics","expert",staff)).json()).totals.received,0);
  const visibleApp=await hr("/hr/applications",post({vacancyId:first.vacancyId,fullName:"Видимый Профиль",resumeText:"Переписывал запросы SQL."},201));
  const scopedPlan=await invoke("/hr/applications/"+visibleApp.applicationId+"/interview-plan","expert",staff);
  assert.equal(scopedPlan.status,200);
  assert.equal((await scopedPlan.json()).comparedVacancies,0);
});

test("existing demo data receives the consultant once and old Unicode profile facts remain searchable", async t => {
  const {hr,server}=await fixture(t,"1");
  const {DB}=server.env;
  await DB.prepare("DELETE FROM records WHERE id IN ('vacancy_4','hr-sector-consultant','app_demo_21','candidate_demo_21') OR scope IN ('vacancy_4','app_demo_21')").run();
  await DB.prepare("UPDATE records SET data=json_remove(json_set(data,'$.experience','ДЕЛОПРОИЗВОДСТВО'),'$.educationSearch','$.experienceSearch') WHERE kind='candidate' AND id='candidate_demo_1'").run();
  const old=await hr("/public/vacancies/data-analyst");
  const current=await hr("/public/vacancies/hr-sector-consultant");
  assert.match(current.description,/2\.2\.1/);
  assert.equal((await hr("/public/vacancies")).items.length,4);
  assert.equal((await hr("/public/vacancies/data-analyst")).publishedVersionId,old.publishedVersionId);
  const applications=await hr("/hr/applications?vacancyId="+current.vacancyId);
  assert.deepEqual(applications.items.map(item=>item.applicationId),["app_demo_21"]);
  assert.ok((await hr("/hr/candidates?skills="+encodeURIComponent("делопроизводство"))).items.some(x=>x.candidateId==="candidate_demo_1"));
});

test("consultant report distinguishes two educational paths from missing credentials", async t => {
  const {hr}=await fixture(t,"1");
  const vacancy=await hr("/public/vacancies/hr-sector-consultant");
  for (const [resumeText,path,refresher] of [
    ["Высшее образование: государственное и муниципальное управление. Повышение квалификации: документооборот.","profile_degree",true],
    ["Высшее образование по экономике. Профессиональная переподготовка по юриспруденции.","degree_and_retraining",false],
    ["Высшее образование по экономике. Повышение квалификации по юриспруденции.",null,true],
    ["Профессиональная переподготовка по юриспруденции.",null,false]
  ]) {
    const app=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName:"Учебный Кандидат",resumeText},201));
    const report=await hr("/hr/applications/"+app.applicationId+"/report");
    const criterion=report.criteria.find(item=>item.criterionId==="req_sector_education");
    assert.equal(criterion.educationPath,path);
    assert.equal(criterion.status,"partial");
    assert.equal(Boolean(report.facts.refresher.length),refresher);
    assert.ok(criterion.question);
  }
});

test("department feedback and related role reviews preserve the original application and interview history", async t => {
  const {hr,client}=await fixture(t,"0",{departmentPassword:"test-department"});
  const first=await publish(hr);
  const other=await publish(hr,{...draft,slug:"another-vacancy"});
  const app=await hr("/hr/applications",post({vacancyId:first.vacancyId,fullName:"Учебный Кандидат",contact:"candidate@example.test",resumeText:"Писал SQL."},201));
  const path="/hr/applications/"+app.applicationId;
  const original=await hr(path);
  await hr(path+"/related-reviews",post({vacancyId:other.vacancyId},201));
  assert.equal((await hr(path+"/related-reviews")).items[0].vacancyId,other.vacancyId);
  assert.equal((await hr(path)).criteriaVersionId,original.criteriaVersionId);
  await hr(path+"/handoff",post({assigneeId:"department",dueAt:new Date(Date.now()+86400000).toISOString()},201));
  const department=client();
  await department("/auth/login",post({user:"department",password:"test-department"}));
  await department(path,{expected:403});
  const handoffs=await department("/department/handoffs");
  assert.equal(handoffs.items.length,1);
  assert.equal(handoffs.items[0].shared.contact,undefined);
  await department("/department/handoffs/"+app.applicationId+"/response",post({outcome:"clarify",note:"Уточнить практический опыт."},201));
  assert.equal((await hr(path+"/handoff")).response.outcome,"clarify");
  await stage(hr,app.applicationId,"start_review",0);
  await hr(path+"/transitions",post({action:"invite_interview",format:"phone",expectedVersion:1}));
  await hr(path+"/transitions",post({action:"complete_interview",interviewResult:"clarify",expectedVersion:2}));
  await hr(path+"/transitions",post({action:"schedule_followup",format:"onsite",expectedVersion:3}));
  await hr(path+"/transitions",post({action:"complete_interview",interviewResult:"proceed",expectedVersion:4}));
  const interviews=(await hr(path+"/interviews")).items;
  assert.deepEqual(new Map(interviews.map(i=>[i.format,i.result])),new Map([["onsite","proceed"],["phone","clarify"]]));
});

test("voluntary departure collects a separate reason and keeps the hire counted", async t => {
  const {hr,client}=await fixture(t,"1");
  const app=await hr("/hr/applications/app_demo_8");
  const termination=await hr("/hr/employments/"+app.stage.employmentId+"/terminations",post({effectiveAt:today(),reasonCategory:"voluntary"},201));
  const invitationPath="/hr/survey-invitations/"+termination.surveyInvitationId;
  const invitation=await hr(invitationPath);
  assert.equal(invitation.type,"voluntary_exit");
  await hr(invitationPath+"/mark-sent",post({}));
  const publicPath=new URL(invitation.link).pathname.replace("/surveys/","/public/surveys/");
  const guest=client();
  assert.equal((await guest(publicPath)).questions[0].type,"choice");
  await guest(publicPath+"/responses",post({answers:[{questionId:"reason",value:"new_job"}]},201));
  assert.deepEqual((await hr("/hr/analytics")).surveys.find(x=>x.type==="voluntary_exit").reasons,[{category:"new_job",total:1}]);
  assert.equal((await hr("/hr/applications/app_demo_8")).outcome,"hired");
});

test("intake triage explains each queue, applies filters before pagination and never rejects", async t => {
  const {hr}=await fixture(t);
  const vacancy=await publish(hr,{...draft,testQuestions:[],criteria:[
    {id:"sql",label:"Работа с SQL",code:"sql"},
    {id:"python",label:"Работа с Python",code:"python"},
    {id:"optional",label:"Офисные инструменты",code:"office",required:false}
  ]});
  const add=async (fullName,resumeText,contact="candidate@example.test")=>{
    const app=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName,resumeText,contact,sourceChannel:"email"},201));
    await hr("/hr/applications/"+app.applicationId+"/assessment");
    return app.applicationId;
  };
  const ready=await add("Первый Соискатель","Писал SQL и автоматизировал отчёты в Python.");
  const clarify=await add("Второй Соискатель","Писал только SQL.");
  const source=await add("Третий Соискатель","Писал SQL и Python.","");
  const unreadable=await add("Соискатель Без Текста","https://example.test/cv");
  const gap=await add("Четвёртый Соискатель","Писал SQL и Python.");
  await hr("/hr/applications/"+gap+"/assessment/python",{method:"PATCH",body:{status:"not_met",reason:"Критерий сверил кадровик."}});
  const list="/hr/applications?vacancyId="+vacancy.vacancyId;
  const all=await hr(list);
  assert.deepEqual(Object.fromEntries(all.items.map(x=>[x.applicationId,x.triage.status])),{
    [ready]:"review_first",[clarify]:"clarify",[source]:"check_source",[unreadable]:"check_source",[gap]:"confirmed_gap"
  });
  assert.deepEqual(all.items.find(x=>x.applicationId===source).triage,{status:"check_source",reason:"missing_contact"});
  assert.equal(all.items.find(x=>x.applicationId===unreadable).triage.reason,"missing_text");
  assert.equal((await hr(list+"&triage=clarify&limit=1")).items[0].applicationId,clarify);
  assert.equal((await hr(list+"&triage=clarify&limit=1")).triageTotals.review_first,1);
  assert.equal(all.items.every(item=>item.outcome===null),true);
  assert.equal((await hr("/hr/applications/"+gap)).triage.reason,"hr_confirmed_gap");
  const empty=await hr(list+"&triage=closed");
  assert.deepEqual(empty.items,[]);
  assert.equal(empty.triageTotals.check_source,2);
  await hr(list+"&triage=unknown",{expected:422});
  await hr("/hr/applications/"+gap+"/transitions",post({action:"reject",expectedVersion:0,reason:"Подтверждённое расхождение."}));
  assert.equal((await hr("/hr/applications/"+gap)).triage.status,"closed");
  const archive=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName:"Архивный Соискатель",resumeText:"Писал SQL и Python.",sourceChannel:"archive"},201));
  assert.equal((await hr("/hr/applications/"+archive.applicationId)).triage.status,"review_first");
  const noRubric=await publish(hr,{...draft,slug:"no-rubric",criteria:[],testQuestions:[]});
  const unscored=await hr("/hr/applications",post({vacancyId:noRubric.vacancyId,fullName:"Новый Соискатель",resumeText:"Готовил рабочие отчёты.",contact:"candidate@example.test"},201));
  assert.deepEqual((await hr("/hr/applications/"+unscored.applicationId)).triage,{status:"manual_review",reason:"no_required_criteria"});
});

test("local evidence distinguishes a professional term from a substring or unrelated negation", async t => {
  const {hr}=await fixture(t);
  const vacancy=await publish(hr,{...draft,criteria:[
    {id:"sql",label:"SQL",code:"sql"},
    {id:"project_req",label:"Проектная работа",code:"project"},
    {id:"education",label:"Профильное юридическое образование",code:"education",keywords:["юриспруденция"]}
  ]});
  const a=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,sourceChannel:"email",fullName:"Учебный Кандидат",resumeText:"Не использовал Python, но писал SQL. Настроил проектор. Университет, бакалавр физики."},201));
  const items=(await hr("/hr/applications/"+a.applicationId+"/assessment")).items;
  assert.deepEqual(items.map(item=>[item.criterionId,item.status]),[
    ["sql","matched"],["project_req","needs_clarification"],["education","needs_clarification"]
  ]);
  assert.equal(items[0].evidence[0].quote,"писал SQL");
  const other=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName:"Другой Кандидат",resumeText:"Готов работать."},201));
  const ranked="/hr/applications?vacancyId="+vacancy.vacancyId+"&priority=on&limit=1";
  const first=await hr(ranked);
  assert.equal(first.items[0].applicationId,a.applicationId);
  assert.deepEqual(first.items[0].reviewProgress,{required:3,withEvidence:1,confirmed:0});
  const second=await hr(ranked+"&cursor="+encodeURIComponent(first.nextCursor));
  assert.equal(second.items[0].applicationId,other.applicationId);
});

test("interview draft is HR-only and sends only structured facts to YandexGPT", async t => {
  let calls = 0;
  const {hr,client} = await fixture(t, "0", { yandex: {
    folderId:"test-folder", apiKey:"test-key",
    fetch:async (url, init) => {
      calls++;
      assert.equal(url,"https://llm.api.cloud.yandex.net/foundationModels/v1/completion");
      assert.equal(init.headers.Authorization,"Api-Key test-key");
      const body=JSON.parse(init.body);
      assert.equal(body.modelUri,"gpt://test-folder/yandexgpt-lite");
      assert.doesNotMatch(init.body,/Секретная метка|sample@example.test|req_sql|Знание SQL/);
      assert.match(body.messages[1].text,/"requirementCode":"sql"/);
      if (calls === 2) return Response.json({}, {status:503});
      return Response.json({result:{alternatives:[{message:{text:JSON.stringify({questions:[
        {criterionKey:"c1",question:"Как вы проверяли корректность SQL-запросов?"},
        {criterionKey:"other",question:"Лишний результат"}
      ]})}}]}});
    }
  }});
  const vacancy=await publish(hr);
  const app=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,sourceChannel:"email",fullName:"Секретная метка",contact:"sample@example.test",resumeText:"SQL. Секретная метка."},201));
  const path="/hr/applications/"+app.applicationId;
  const original=await hr(path+"/assessment");
  await client()(path+"/interview-draft",post({},401));
  const key=crypto.randomUUID();
  const first=await hr(path+"/interview-draft",post({},200,key));
  assert.equal(first.source,"yandexgpt");
  assert.equal(first.questions[0].criterionId,"req_sql");
  assert.match(first.questions[0].question,/корректность/);
  assert.equal(first.questions[1].question,"Расскажите о Python.");
  assert.equal(first.questions.length,2);
  assert.deepEqual(await hr(path+"/interview-draft",post({},200,key)),first);
  assert.equal(calls,1);
  const fallback=await hr(path+"/interview-draft",post({}));
  assert.equal(fallback.source,"local");
  assert.deepEqual(await hr(path+"/assessment"),original);
  assert.equal(calls,2);
});

test("interview plan ranks gaps, recommends evidenced roles and only refines on demand", async t => {
  let completions=0;
  const {hr,client}=await fixture(t,"0",{yandex:{
    folderId:"plan-folder",apiKey:"plan-key",fetch:async (_url,init)=>{
      completions++;
      const body=JSON.parse(init.body);
      const facts=JSON.parse(body.messages[1].text);
      assert.equal(body.completionOptions.maxTokens,"240");
      assert.deepEqual(facts.map(x=>x.requirementCode),["python","communication"]);
      assert.doesNotMatch(init.body,/Метка|Excel|candidate@example.test|Кандидат/);
      return Response.json({result:{alternatives:[{message:{text:JSON.stringify({
        questions:[{criterionKey:facts[0].criterionKey,question:"Какую рабочую задачу вы автоматизировали на Python?"}]
      })}}]}});
    }
  }});
  const vacancy=await publish(hr,{...draft,criteria:[
    draft.criteria[0],
    {id:"nice",label:"Переговоры",code:"communication",required:false},
    draft.criteria[1]
  ],testQuestions:[]});
  const alternative=await publish(hr,{...draft,slug:"office",title:"Специалист по документам",criteria:[
    {id:"records",label:"Документооборот",code:"office"},
    {id:"projects",label:"Координация проекта",code:"project",question:"Как вы согласовывали сроки проекта?"}
  ],testQuestions:[]});
  const lowerRank=await publish(hr,{...draft,slug:"office-extended",title:"Координатор документов",criteria:[
    {id:"records",label:"Документооборот",code:"office"},
    {id:"projects",label:"Координация проекта",code:"project"},
    {id:"api",label:"Работа с REST API",code:"api"}
  ],testQuestions:[]});
  await publish(hr,{...draft,slug:"unrelated",title:"Работа с API",criteria:[{id:"api",label:"Работа с REST API",code:"api"}]});
  const application=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,sourceChannel:"email",
    fullName:"Кандидат Метка",contact:"candidate@example.test",resumeText:"Готовил отчёт на SQL. Вёл документооборот и таблицы Excel."},201));
  const path="/hr/applications/"+application.applicationId;
  await client()(path+"/interview-plan",{expected:401});
  const original=await hr(path+"/assessment");
  const plan=await hr(path+"/interview-plan");
  assert.deepEqual(plan.questions.map(q=>q.criterionId),["req_python","nice","req_sql"]);
  assert.equal(plan.questions[0].reason,"required_gap");
  assert.deepEqual(plan.alternatives.map(v=>v.vacancyId),[alternative.vacancyId,lowerRank.vacancyId]);
  assert.match(plan.alternatives[0].evidence[0].quote,/документооборот/);
  assert.equal(plan.alternatives[0].questions[0].criterionId,"projects");
  assert.equal(completions,0);
  const draftOptions={priorityOnly:true};
  const refined=await hr(path+"/interview-draft",post(draftOptions));
  assert.equal(refined.questions[0].criterionId,"req_python");
  assert.match(refined.questions[0].question,/автоматизировали/);
  assert.deepEqual(await hr(path+"/interview-draft",post(draftOptions)),refined);
  assert.equal(completions,1);
  assert.deepEqual(await hr(path+"/assessment"),original);
});

test("interview plan supplies opening questions without a rubric or professional evidence", async t => {
  const {hr}=await fixture(t);
  const vacancy=await publish(hr,{...draft,criteria:[],testQuestions:[]});
  const application=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName:"Учебный Кандидат",resumeText:"Готов к обсуждению."},201));
  const plan=await hr("/hr/applications/"+application.applicationId+"/interview-plan");
  assert.ok(plan.questions.length>=2);
  assert.ok(plan.questions.every(q=>q.reason==="opening"));
  assert.deepEqual(plan.alternatives,[]);
  assert.equal(plan.canRefine,false);
});

test("a public synthetic demo requires staff credentials and synthetic guest applications", async t => {
  const {client}=await fixture(t,"1",{syntheticOnly:true,origin:"https://kadry.example.test"});
  const guest=client();
  const session=await guest("/auth/session");
  assert.equal(session.demoAvailable,false);
  await guest("/auth/login",post({user:"demo"},401));
  assert.equal((await guest("/public/session")).syntheticOnly,true);
  const v=await guest("/public/vacancies/hr-sector-consultant");
  const form={vacancyId:v.vacancyId,publishedVersionId:v.publishedVersionId,fullName:"Учебный Соискатель",
    resumeText:"Высшее образование по юриспруденции.",demoAcknowledged:true};
  await guest("/public/applications",post({...form,contact:"candidate@example.org"},422));
  await guest("/public/applications",post({...form,contact:"candidate@example.test"},201));
});

test("file intake is idempotent by content for one vacancy and keeps distinct resumes with the same filename", async t => {
  const {hr}=await fixture(t);
  const first=await publish(hr);
  const other=await publish(hr,{...draft,slug:"second-file-intake"});
  const submit=(vacancyId,name,text,expected,filename="resume.txt")=>{
    const form=new FormData();
    form.set("vacancyId",vacancyId);
    form.set("fullName",name);
    form.set("fileIntake","on");
    form.set("resumeFile",new File([text],filename));
    return hr("/hr/applications",post(form,expected));
  };
  const app=await submit(first.vacancyId,"Учебный Иванов","Проверяю SQL.",201);
  const duplicate=await submit(first.vacancyId,"Учебный Иванов","Проверяю SQL.",200,"renamed.txt");
  assert.equal(duplicate.applicationId,app.applicationId);
  const independent=await submit(first.vacancyId,"Учебный Петров","Пишу на Python.",201);
  assert.notEqual(independent.applicationId,app.applicationId);
  assert.notEqual((await submit(other.vacancyId,"Учебный Иванов","Проверяю SQL.",201)).applicationId,app.applicationId);
});

test("HR saves interview answers as independent evidence and can share verified context with an assigned department", async t => {
  const {hr,client}=await fixture(t,"0",{departmentPassword:"department-pass"});
  const vacancy=await publish(hr,{...draft,testQuestions:[]});
  const guest=client();
  await guest("/public/session");
  const {receiptNumber,applicationId}=await guest("/public/applications",post({vacancyId:vacancy.vacancyId,publishedVersionId:vacancy.publishedVersionId,
    fullName:"Учебный Иванов",contact:"hr@example.test",resumeText:"Собираю отчёты на SQL."},201));
  const appPath="/hr/applications/"+applicationId;
  await stage(hr,applicationId,"start_review",0);
  const recorded=await hr(appPath+"/interview-notes",post({criterionId:"req_python",question:"Какая задача была на Python?",
    text:"Писал на Python скрипты для отчётов.",nextStep:"Сверить пример на очном интервью."},201));
  const assessment=await hr(appPath+"/assessment");
  assert.equal(assessment.items.find(x=>x.criterionId==="req_python").evidence[0].type,"interview");
  assert.equal((await hr(appPath+"/interview-plan")).notes[0].sourceId,recorded.sourceId);
  assert.match((await hr(appPath)).resumeSource.text,/SQL/);
  await hr(appPath+"/assessment/req_python",{method:"PATCH",body:{status:"matched",reason:"Кандидат описал и показал рабочий скрипт."}});
  const preview=await hr(appPath+"/handoff-preview");
  assert.equal(preview.criteria.find(x=>x.label==="Знание Python").reviewReason,"Кандидат описал и показал рабочий скрипт.");
  await hr(appPath+"/handoff",post({assigneeId:"department",dueAt:new Date(Date.now()+86400000).toISOString()},201));
  assert.equal((await hr("/hr/applications?handoff=waiting")).items[0].applicationId,applicationId);
  const department=client();
  await department("/auth/login",post({user:"department",password:"department-pass"}));
  assert.deepEqual((await department("/department/handoffs")).items[0].shared,preview);
  await department("/department/handoffs/"+applicationId+"/response",post({outcome:"clarify",note:"Просьба показать рабочий пример."},201));
  assert.equal((await hr("/hr/applications?handoff=answered")).items[0].handoffStatus,"answered");
  assert.equal((await hr("/hr/applications?handoff=waiting")).items.length,0);
  const receipt=await guest("/public/receipts/"+receiptNumber);
  assert.equal(receipt.stage,"review");
  assert.equal(receipt.outcome,null);
  assert.equal(receipt.contact,undefined);
  await hr(appPath+"/transitions",post({action:"reject",expectedVersion:1,reason:"Внутренняя причина",
    candidateMessage:"Можно потренироваться на примерах отчётности."}));
  const finalReceipt=await guest("/public/receipts/"+receiptNumber);
  assert.equal(finalReceipt.outcome,"rejected");
  assert.equal(finalReceipt.candidateMessage,"Можно потренироваться на примерах отчётности.");
  assert.equal(finalReceipt.reason,undefined);
  assert.equal((await guest("/public/clarifications/"+finalReceipt.clarificationThreadId)).closed,true);
});

test("an approved department request becomes one vacancy and the initiator sees publication", async t => {
  const {hr,client}=await fixture(t,"0",{departmentPassword:"department-pass"});
  const department=client();
  await department("/auth/login",post({user:"department",password:"department-pass"}));
  const request=await department("/department/requisitions",post({title:"Консультант",department:"Учебный департамент",
    description:"Нужен сотрудник для подготовки справок."},201));
  assert.equal(request.status,"draft");
  const edited=await department("/department/requisitions/"+request.id,{method:"PUT",body:{...request,title:"Консультант по подбору"}});
  assert.equal(edited.title,"Консультант по подбору");
  assert.equal((await hr("/hr/requisitions")).items.length,0);
  await department("/department/requisitions/"+request.id+"/submit",post({}));
  await department("/department/requisitions/"+request.id,{method:"PUT",body:{...request,title:"Поздняя правка"},expected:409});
  assert.equal((await hr("/hr/requisitions")).items[0].status,"submitted");
  const vacancy=await hr("/hr/vacancies",post({...draft,slug:"from-department",requisitionId:request.id},201));
  await hr("/hr/vacancies",post({...draft,slug:"second-from-department",requisitionId:request.id},409));
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/publish",post({},201));
  const delivered=(await department("/department/requisitions")).items[0];
  assert.equal(delivered.status,"published");
  assert.equal(delivered.vacancySlug,"from-department");
});

test("GigaChat uses one bounded completion for repeated requests and keeps applicant content local", async t => {
  const calls=[];
  const {hr}=await fixture(t,"0",{gigachat:{key:"test-giga",fetch:async (url,init)=>{
    calls.push(url);
    if (url.endsWith("/oauth")) {
      assert.equal(init.headers.Authorization,"Basic test-giga");
      assert.equal(init.body.get("scope"),"GIGACHAT_API_B2B");
      return Response.json({access_token:"test-token",expires_at:Date.now()+600000});
    }
    assert.equal(init.headers.Authorization,"Bearer test-token");
    assert.equal(JSON.parse(init.body).max_tokens,160);
    assert.doesNotMatch(init.body,/Частный текст|sample@example.test/);
    return Response.json({choices:[{message:{content:'{"questions":[{"criterionKey":"c1","question":"Как вы проверяли запросы?"}]}'}}]});
  }}});
  const vacancy=await publish(hr);
  const app=await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,sourceChannel:"email",fullName:"Частный текст",contact:"sample@example.test",resumeText:"SQL. Частный текст."},201));
  const path="/hr/applications/"+app.applicationId;
  await hr(path+"/assessment");
  const first=await hr(path+"/interview-draft",post({}));
  assert.equal(first.source,"gigachat");
  assert.deepEqual(await hr(path+"/interview-draft",post({})),first);
  assert.equal(calls.length,2);
});

test("guest application, versioned test, linked candidate, all hiring stages and two independent surveys", async t=>{
  const {client,hr}=await fixture(t);
  const guest=client();
  const outsider=client();
  await outsider("/hr/applications",{expected:401});
  const vacancy=await publish(hr);
  await guest("/public/session");
  const publicV=await guest("/public/vacancies/analyst");
  const payload={vacancyId:vacancy.vacancyId,publishedVersionId:publicV.publishedVersionId,testVersionId:publicV.testVersionId,fullName:"Мария Соколова",contact:"first@example.com",resumeText:"Писала SQL-запросы для отчётности."};
  await guest("/public/applications",post(payload,422));
  const key=crypto.randomUUID();
  payload.answers=[{questionId:"project",value:"Собрала отчёт"},{questionId:"quality",value:"Сверяла агрегаты"}];
  const a=await guest("/public/applications",post(payload,201,key));
  assert.equal((await guest("/public/applications",post(payload,201,key))).applicationId,a.applicationId);
  await guest("/public/applications",post({...payload,fullName:"Другое имя"},409,key));
  await outsider("/public/receipts/"+a.receiptNumber,{expected:403});
  const receipt=await guest("/public/receipts/"+a.receiptNumber);
  assert.equal(receipt.assessmentStatus,"ready");
  const thread=await guest("/public/clarifications/"+receipt.clarificationThreadId);
  assert.equal((await hr("/hr/applications/"+a.applicationId)).triage.status,"clarify");
  assert.equal(thread.questions.length,1);
  assert.match(thread.questions[0].text,/Python/);
  const answer=[{questionId:thread.questions[0].questionId,text:"В проекте использовала Python и Pandas."}];
  const qaKey=crypto.randomUUID();
  await guest("/public/clarifications/"+thread.threadId+"/answers",post({answers:answer},202,qaKey));
  await guest("/public/clarifications/"+thread.threadId+"/answers",post({answers:answer},202,qaKey));
  await guest("/public/clarifications/"+thread.threadId+"/answers",post({answers:answer},409));
  const appUrl="/hr/applications/"+a.applicationId;
  const score=await hr(appUrl+"/assessment");
  assert.equal(score.items[0].status,"matched");
  assert.match(score.items[0].evidence[0].quote,/SQL/);
  assert.equal(score.items[1].status,"matched");
  assert.equal(score.items[1].evidence[0].type,"clarification");
  assert.equal((await hr(appUrl)).triage.status,"review_first");
  const override=await hr(appUrl+"/assessment/req_python",{method:"PATCH",body:{status:"partial",reason:"Есть только учебный проект."}});
  assert.equal(override.items[1].status,"matched");
  assert.equal(override.items[1].hrOverride.status,"partial");
  assert.equal((await hr(appUrl)).triage.status,"clarify");

  const changed={...draft,testQuestions:[{id:"project",text:"Новая формулировка",required:true}]};
  const proposer=client();
  await proposer("/auth/login",post({user:"hr",password:"test-hr-password"}));
  const saved=await proposer("/hr/vacancies/"+vacancy.vacancyId+"/draft",{method:"PUT",body:changed});
  const draftNumber=saved.draftNumber;
  assert.equal((await guest("/public/vacancies/analyst")).questions[0].text,"Опишите проект");
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/publish",post({},409));
  await proposer("/hr/vacancies/"+vacancy.vacancyId+"/submit",post({draftNumber}));
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/approve",post({draftNumber:draftNumber-1},409));
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/approve",post({draftNumber}));
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/publish",post({draftNumber},201));
  assert.equal((await guest("/public/applications",post(payload,409))).code,"vacancy_version_changed");
  assert.equal((await hr(appUrl)).answers[0].question,"Опишите проект");

  const candidate=await hr("/hr/candidates",post({fullName:"Мария Соколова",contact:"first@example.com",education:"Филология",additionalEducation:"Юриспруденция"},201));
  await hr("/hr/candidates",post({fullName:"Мария Соколова",contact:"second@example.com",education:"Второй профиль"},201));
  assert.equal((await hr("/hr/candidates?q="+encodeURIComponent("Соколова"))).items.length,3);
  const retrained=await hr("/hr/candidates?additionalEducation="+encodeURIComponent("ЮРИСПРУДЕНЦИЯ"));
  assert.deepEqual(retrained.items.map(x=>x.candidateId),[candidate.candidateId]);
  assert.equal((await hr("/hr/candidates/"+candidate.candidateId)).additionalEducation,"Юриспруденция");
  await stage(hr,a.applicationId,"start_review",0);
  await stage(hr,a.applicationId,"invite_interview",0,409);
  const scheduledAt=new Date(Date.now()+86400000).toISOString();
  await hr(appUrl+"/transitions",post({action:"invite_interview",expectedVersion:1,scheduledAt}));
  await stage(hr,a.applicationId,"move_to_decision",2,409);
  const interviewId=(await hr(appUrl+"/stage")).interviewId;
  assert.equal((await hr("/hr/interviews/"+interviewId)).scheduledAt,scheduledAt);
  const firstEvent=await hr(appUrl+"/history?limit=1");
  assert.equal(firstEvent.items[0].action,"receive");
  assert.equal((await hr(appUrl+"/history?limit=1&cursor="+encodeURIComponent(firstEvent.nextCursor))).items[0].action,"start_review");
  await hr("/hr/interviews/"+interviewId+"/survey-invitations",post({},409));
  await stage(hr,a.applicationId,"complete_interview",2);
  const interview=await hr("/hr/interviews/"+interviewId+"/survey-invitations",post({},201));
  const same=await hr("/hr/interviews/"+interviewId+"/survey-invitations",post({},201));
  assert.equal(same.invitationId,interview.invitationId);
  await hr("/hr/survey-invitations/"+interview.invitationId+"/mark-sent",post({}));
  const interviewUrl=new URL(interview.link).pathname.replace("/surveys/","/public/surveys/");
  await outsider(interviewUrl);
  await outsider(interviewUrl+"/responses",post({answers:[{questionId:"clarity",value:5}]},201));
  await outsider(interviewUrl+"/responses",post({answers:[{questionId:"clarity",value:5}]},410));
  assert.deepEqual(await outsider(interviewUrl),{submitted:true});
  await stage(hr,a.applicationId,"move_to_decision",3);
  await stage(hr,a.applicationId,"hire",4,409);
  await hr(appUrl+"/candidate",{method:"PUT",body:{candidateId:candidate.candidateId}});
  assert.deepEqual((await hr("/hr/candidates/"+candidate.candidateId)).applicationIds,[a.applicationId]);
  const hire=await stage(hr,a.applicationId,"hire",4);
  const employmentUrl="/hr/employments/"+hire.employmentId;
  const regular=client();
  await regular("/auth/login",post({user:"hr",password:"test-hr-password"}));
  await regular(employmentUrl+"/terminations",post({effectiveAt:today(),reasonCategory:"employer_initiated"},403));
  const terminationKey=crypto.randomUUID();
  const termination=await hr(employmentUrl+"/terminations",post({effectiveAt:today(),reasonCategory:"employer_initiated"},201,terminationKey));
  assert.equal((await hr(employmentUrl+"/terminations",post({effectiveAt:today(),reasonCategory:"employer_initiated"},201,terminationKey))).surveyInvitationId,termination.surveyInvitationId);
  await hr(employmentUrl+"/terminations",post({effectiveAt:today(),reasonCategory:"employer_initiated"},409));
  const exit=await hr("/hr/survey-invitations/"+termination.surveyInvitationId);
  assert.equal(exit.type,"exit_feedback");
  await regular("/hr/survey-invitations/"+exit.invitationId,{expected:403});
  await hr("/hr/survey-invitations/"+exit.invitationId+"/mark-sent",post({}));
  const exitUrl=new URL(exit.link).pathname.replace("/surveys/","/public/surveys/");
  await outsider(exitUrl+"/responses",post({answers:[{questionId:"clarity",value:4},{questionId:"communication",value:3},{questionId:"comment",value:"Пояснить порядок оформления документов."}]},201));
  const stats=await hr("/hr/analytics");
  assert.deepEqual(stats.totals,{received:1,interview:1,hired:1,rejected:0});
  assert.deepEqual(stats.surveys.map(x=>[x.type,x.sent,x.answered,x.averages]),[
    ["interview_feedback",1,1,{clarity:5}],["exit_feedback",1,1,{clarity:4,communication:3}],["voluntary_exit",0,0,{}]
  ]);
  assert.equal((await hr(appUrl+"/stage")).outcome,"hired");
  assert.deepEqual(stats.departures,[{department:"Департамент",month:today().slice(0,7),category:"employer_initiated",total:1}]);
  assert.deepEqual((await hr("/hr/analytics?to=2020-01-01")).departures,[]);
  const separate=await hr("/hr/analytics?to=2020-01-01&separateSurveys=1");
  assert.equal(separate.totals.received,0);
  assert.equal(separate.surveys.find(x=>x.type==="exit_feedback").answered,1);
  assert.equal((await hr("/hr/survey-invitations?type=exit_feedback&status=answered")).items.length,1);
  assert.equal((await hr("/hr/survey-invitations?type=exit_feedback&status=sent")).items.length,0);
  const limited=await regular("/hr/analytics");
  assert.equal(limited.surveys.length,1);
  assert.equal(limited.departures,undefined);
});
test("archive validation and pagination, attachment limits, manual clarification, rejection stage", async t=>{
  const {client,hr}=await fixture(t);
  const vacancy=await publish(hr);
  const pack={vacancyId:vacancy.vacancyId,items:[
    {fullName:"Иван Волков",contact:"ivan@example.com",resumeText:"Писал отчёты.",sourceReceivedAt:"2025-01-14"},
    {fullName:"Пётр Волков",contact:"incorrect",resumeText:"Нет опыта"},
    {fullName:"Анна Смирнова",resumeText:"Python и SQL"}
  ]};
  const imported=await hr("/hr/application-imports",post(pack,201));
  assert.equal(imported.accepted.length,2);
  assert.equal(imported.errors[0].index,1);
  const id=imported.accepted[0].applicationId;
  const a=await hr("/hr/applications/"+id);
  assert.equal(a.testStatus,"not_completed");
  assert.ok(a.importedAt);
  assert.equal(a.sourceReceivedAt,"2025-01-14T00:00:00.000Z");
  const invite=await hr("/hr/clarifications/"+a.clarificationThreadId+"/links",post({contactVerified:true},201));
  const token=new URL(invite.link).pathname.split("/").at(-1);
  const visitor=client();
  await visitor("/public/session");
  const access=await visitor("/public/clarification-sessions",post({token},201));
  await visitor("/public/clarification-sessions",post({token},410));
  assert.equal((await visitor("/public/clarifications/"+access.threadId)).questions.length,2);
  await stage(hr,id,"start_review",0);
  await stage(hr,id,"invite_interview",1);
  await hr("/hr/applications/"+id+"/transitions",post({action:"reject",expectedVersion:2,reason:"Подтверждённое основание."}));
  const stats=await hr("/hr/analytics?vacancyId="+vacancy.vacancyId+"&from=2025-01-14&to=2025-01-14");
  assert.equal(stats.funnel.find(x=>x.stage==="interview").rejected,1);
  assert.equal(stats.totals.received,1);
  const listed=await hr("/hr/applications?limit=1");
  assert.ok(listed.nextCursor);
  assert.notEqual((await hr("/hr/applications?limit=1&cursor="+encodeURIComponent(listed.nextCursor))).items[0].applicationId,listed.items[0].applicationId);
  const common=()=>{const form=new FormData();form.set("vacancyId",vacancy.vacancyId);form.set("fullName","Файл Кандидата");return form;};
  const wrong=common();
  wrong.set("resumeFile",new Blob(["hello"]),"attachment.html");
  await hr("/hr/applications",post(wrong,422));
  const big=common();
  big.set("resumeFile",new Blob([new Uint8Array(5*1024*1024+1)]),"resume.txt");
  await hr("/hr/applications",post(big,413));
  const good=common();
  good.set("resumeFile",new Blob(["Опыт SQL в работе."]),"резюме.txt");
  const accepted=await hr("/hr/applications",post(good,201));
  const info=await hr("/hr/applications/"+accepted.applicationId);
  assert.equal(info.resumeSource.text,"Опыт SQL в работе.");
  assert.equal(await hr("/hr/resume-sources/"+info.resumeSource.sourceId+"?download=1"),"Опыт SQL в работе.");
  await visitor("/hr/resume-sources/"+info.resumeSource.sourceId,{expected:401});
  await hr("/hr/applications",post({vacancyId:vacancy.vacancyId,fullName:"Слишком длинный текст",resumeText:"x".repeat(20001)},422));
});
test("demo dashboard and guest intake use synthetic records", async t=>{
  const {hr,client}=await fixture(t,"1",{demo:true});
  const stats=await hr("/hr/analytics");
  assert.equal(stats.totals.received,21);
  assert.equal(stats.totals.hired,4);
  assert.ok(stats.series.some(x=>x.value>0));
  assert.equal((await hr("/hr/vacancies")).items.length,4);
  assert.match((await hr("/public/vacancies/hr-sector-consultant")).description,/Минимальный стаж не установлен/);
  const consultant=(await hr("/hr/applications?vacancyId=vacancy_4&priority=on")).items[0];
  const evidence=(await hr("/hr/applications/"+consultant.applicationId+"/assessment")).items[0];
  assert.equal(evidence.status,"partial");
  assert.match(evidence.reference,/2\.2\.1/);
  const matching=(await hr("/hr/candidates?skills="+encodeURIComponent("ЮРИСПРУДЕНЦИЯ справки"))).items;
  assert.equal(matching[0].candidateId,consultant.candidateId);
  assert.equal((await hr("/hr/survey-invitations?type=exit_feedback")).items.length,1);
  const guest=client();
  assert.equal((await guest("/public/session")).syntheticOnly,true);
  const vacancy=await guest("/public/vacancies/hr-sector-consultant");
  const application={vacancyId:vacancy.vacancyId,publishedVersionId:vacancy.publishedVersionId,fullName:"Учебный Соискатель",contact:"candidate@example.test",resumeText:"Учебный текст."};
  await guest("/public/applications",post(application,422));
  await guest("/public/applications",post({...application,demoAcknowledged:true,contact:"candidate@example.com"},422));
  await guest("/public/applications",post({...application,demoAcknowledged:true},201));
});
