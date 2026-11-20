import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openServer } from "../scripts/server.mjs";

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

test("guest application without a test, automatic profile, hiring and two independent surveys", async t=>{
  const {client,hr}=await fixture(t);
  const guest=client();
  const outsider=client();
  await outsider("/hr/applications",{expected:401});
  const vacancy=await publish(hr);
  await guest("/public/session");
  const publicV=await guest("/public/vacancies/analyst");
  const payload={vacancyId:vacancy.vacancyId,publishedVersionId:publicV.publishedVersionId,fullName:"Мария Соколова",contact:"first@example.com",resumeText:"Писала SQL-запросы для отчётности."};
  assert.deepEqual(publicV.questions,[]);
  assert.equal(publicV.testVersionId,null);
  await guest("/public/applications",post({...payload,resumeText:""},422));
  const combined=new FormData();
  for(const [k,v] of Object.entries(payload))combined.set(k,v);
  combined.set("resumeFile",new Blob(["SQL"]),"resume.txt");
  assert.equal((await guest("/public/applications",post(combined,422))).fields[0].code,"one_resume_source");
  const key=crypto.randomUUID();
  const a=await guest("/public/applications",post(payload,201,key));
  assert.equal((await guest("/public/applications",post(payload,201,key))).applicationId,a.applicationId);
  await guest("/public/applications",post({...payload,fullName:"Другое имя"},409,key));
  await outsider("/public/receipts/"+a.receiptNumber,{expected:403});
  const receipt=await guest("/public/receipts/"+a.receiptNumber);
  assert.equal(receipt.assessmentStatus,"ready");
  assert.equal(receipt.clarificationThreadId,null);
  const initial=await hr("/hr/applications/"+a.applicationId);
  assert.equal(initial.triage.status,"clarify");
  assert.equal(initial.testStatus,"not_required");
  assert.ok(initial.candidateId);
  assert.deepEqual((await hr("/hr/candidates/"+initial.candidateId)).applicationIds,[a.applicationId]);
  await guest("/public/clarifications/"+initial.clarificationThreadId,{expected:403});
  const invitation=await hr("/hr/clarifications/"+initial.clarificationThreadId+"/links",post({contactVerified:true},201));
  const token=new URL(invitation.link).pathname.split("/").at(-1);
  const access=await guest("/public/clarification-sessions",post({token},201));
  const thread=await guest("/public/clarifications/"+access.threadId);
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
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/draft",{method:"PUT",body:changed});
  assert.deepEqual((await guest("/public/vacancies/analyst")).questions,[]);
  await hr("/hr/vacancies/"+vacancy.vacancyId+"/publish",post({},201));
  assert.equal((await guest("/public/applications",post(payload,409))).code,"vacancy_version_changed");
  assert.deepEqual((await hr(appUrl)).answers,[]);

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
  await outsider(interviewUrl,{expected:410});
  await stage(hr,a.applicationId,"move_to_decision",3);
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
    ["interview_feedback",1,1,{clarity:5}],["exit_feedback",1,1,{clarity:4,communication:3}]
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
  assert.equal(a.testStatus,"not_required");
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
  await stage(hr,id,"reject",2);
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
  await guest("/public/applications",post({...application,contact:"candidate@example.com"},422));
  await guest("/public/applications",post(application,201));
  const fileOnly=new FormData();
  for(const [k,v] of Object.entries(application))if(k!=="resumeText")fileOnly.set(k,v);
  fileOnly.set("resumeFile",new Blob(["Учебное резюме"]),"resume.txt");
  const uploaded=await guest("/public/applications",post(fileOnly,201));
  assert.equal((await hr("/hr/applications/"+uploaded.applicationId)).resumeSource.text,"Учебное резюме");
});
