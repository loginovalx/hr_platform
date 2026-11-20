const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL}=require('node:url');
const {tmpdir}=require('node:os');
const {crc32,deflateRawSync}=require('node:zlib');
const pathname=path.resolve(__dirname,'..');
let images;
const candidates=['/hr/candidates','/hr/candidates/candidate_demo_21'];
const routes=['/hr','/hr/vacancies','/hr/vacancies?view=requests','/hr/vacancies/new','/hr/vacancies/vacancy_4','/hr/applications',...['assessment','interview','resume','test','clarification','history','report','workflow'].map(s=>'/hr/applications/app_demo_21?tab='+s),...candidates,'/hr/analytics','/hr/feedback','/hr/feedback?type=voluntary_exit','/hr/news','/vacancies','/vacancies/hr-sector-consultant','/vacancies/hr-sector-consultant?apply=1'];
const widths=[320,390,768,1024,1440];
const fail=[];
const notices=[];
let scenarios=0;
async function measure(page,id,width){
  const result=await page.evaluate(() => {
    const canvas=document.createElement('canvas').getContext('2d');
    const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
    const textClips=[]; const invalidSelects=[];
    const overlaps=[];
    for(const node of document.querySelectorAll('select')){
      if(!visible(node)||node.closest('details:not([open])'))continue;
      const display=node.parentElement.querySelector(".select-display > span");
      if(display) {
        if(display.textContent!==node.selectedOptions[0]?.textContent||display.scrollWidth>display.clientWidth+3)textClips.push([display.textContent,'select display mismatch']);
        continue;
      }
      const style=getComputedStyle(node);
      canvas.font=style.font;
      const label=node.selectedOptions[0]?.textContent?.trim();
      const maxWidth=node.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
      const required=canvas.measureText(label||'').width;
      if(label && required>maxWidth+5)invalidSelects.push([label,Math.round(required-maxWidth)]);
    }
    for(const e of document.querySelectorAll('h1,h2,h3,button,.pill,summary, .tabs a,.public-nav a')){
      if(!visible(e)||e.getBoundingClientRect().width<20)continue;
      if(e.scrollWidth-e.clientWidth>4&&e.clientWidth)textClips.push([e.textContent.trim().slice(0,90),e.scrollWidth-e.clientWidth]);
      const r=e.getBoundingClientRect();
      if(r.right>innerWidth+2||r.left<-2) overlaps.push([e.textContent.trim().slice(0,90),Math.round(r.right),Math.round(r.left)]);
    }
    return {overflow:document.documentElement.scrollWidth-innerWidth,heading:document.querySelector('h1')?.textContent,invalidSelects,textClips,overlaps};
  });
  scenarios++;
  if(result.overflow>1||result.textClips.length||result.overlaps.length||/Не удалось загрузить|Страница не найдена/.test(result.heading||''))fail.push({id,width,...result});
  if(result.invalidSelects.length)notices.push({id,width,selects:result.invalidSelects});
}
async function visit(page,url,route){
  await page.goto(url+route,{waitUntil:'domcontentloaded'});
  await page.locator('main h1').waitFor();
  await page.evaluate(()=>document.fonts.ready);
}

function syntheticDocx(text) {
  const name=Buffer.from("word/document.xml");
  const paragraphs=text.split("\n").map(line=>`<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join("");
  const xml=Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`);
  const compressed=deflateRawSync(xml);
  const checksum=crc32(xml);
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20,4);
  local.writeUInt16LE(8,8);
  local.writeUInt32LE(checksum,14);
  local.writeUInt32LE(compressed.length,18);
  local.writeUInt32LE(xml.length,22);
  local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(20,6);
  central.writeUInt16LE(8,10);
  central.writeUInt32LE(checksum,16);
  central.writeUInt32LE(compressed.length,20);
  central.writeUInt32LE(xml.length,24);
  central.writeUInt16LE(name.length,28);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1,8);
  end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length+name.length,12);
  end.writeUInt32LE(local.length+name.length+compressed.length,16);
  return Buffer.concat([local,name,compressed,central,name,end]);
}

async function run(){
  images=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(tmpdir(),'kadry-ui-report-'));
  await fs.mkdir(images,{recursive:true});
  const directory=await fs.mkdtemp(path.join(tmpdir(),'kadry-audit-db-'));
  const {openServer}=await import(pathToFileURL(pathname+'/scripts/server.mjs').href);
  const server=await openServer({port:0,directory,seed:'1',demo:true});
  const newsTitle='Опрос о спросе на профессиональные навыки работы с искусственным интеллектом';
  let newPublication=false;
  server.env.NEWS_FETCH=async url=>new Response(`<rss><channel>${url.includes('hse.ru')?
    `<item><title>${newsTitle}</title><link>https://www.hse.ru/news/test</link><pubDate>${new Date().toUTCString()}</pubDate></item>`+
    (newPublication ? `<item><title>Новые данные о рынке труда</title><link>https://www.hse.ru/news/test-2</link><pubDate>${new Date().toUTCString()}</pubDate></item>` : '') : ''
  }</channel></rss>`);
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  try{
    const page=await browser.newPage();
    const errors=new Set();
    page.on('pageerror',err=>errors.add(err.message));
    await visit(page,server.url,'/hr');
    await page.getByRole('button',{name:'Открыть демо-кабинет'}).click();
    await page.getByRole('heading',{name:'Кабинет подбора'}).waitFor();
    await page.setViewportSize({width:1440,height:900});
    const overviewWidget=page.locator('.overview-lead [data-news-widget]');
    await overviewWidget.getByRole('link',{name:newsTitle,exact:true}).waitFor({timeout:3000});
    const widgetBox=await overviewWidget.boundingBox();
    const heroBox=await page.locator('.hero').boundingBox();
    assert.ok(widgetBox.x>=heroBox.x+heroBox.width && Math.abs(widgetBox.y-heroBox.y)<2);
    assert.ok(widgetBox.width*widgetBox.height/(1440*900)>=0.08 && widgetBox.width*widgetBox.height/(1440*900)<=0.17);
    const mascotSlot=overviewWidget.locator('.news-widget-mascot');
    const mascotBox=await mascotSlot.boundingBox();
    const storiesBox=await overviewWidget.locator('[data-news-widget-items]').boundingBox();
    assert.ok(mascotBox.width>=70 && mascotBox.x>=storiesBox.x+storiesBox.width);
    assert.equal(await mascotSlot.evaluate(node=>node.childElementCount),0);
    await page.setViewportSize({width:390,height:900});
    assert.equal(await page.getByRole('navigation',{name:'Кабинет HR'}).isVisible(),false);
    const mobileMenu=page.getByRole('button',{name:'Открыть меню'});
    await mobileMenu.click();
    assert.equal(await mobileMenu.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    assert.equal(await mobileMenu.getAttribute('aria-expanded'),'false');
    await visit(page,server.url,'/hr/feedback');
    await page.locator('[data-news-bell]').click();
    await page.locator('[data-news-widget][popover]').getByRole('link',{name:newsTitle,exact:true}).waitFor();
    await measure(page,'news-widget-mobile',390);
    for (const width of widths){
      await page.setViewportSize({width,height:900});
      for(const route of routes){
        await visit(page,server.url,route);
        if(route==='/hr')await overviewWidget.getByRole('link',{name:newsTitle,exact:true}).waitFor();
        if(route==='/hr/news')await page.getByRole('link',{name:newsTitle,exact:true}).waitFor();
        await measure(page,route,width);
        if([390,1440].includes(width)&&['/hr','/hr/applications','/hr/applications/app_demo_21?tab=interview','/hr/analytics','/hr/feedback','/hr/news','/hr/candidates','/vacancies','/hr/vacancies/vacancy_4'].includes(route))
          await page.screenshot({path:images+'/'+width+'-'+route.replace(/[^a-z0-9]+/gi,'_')+'.png'});
      }
      await visit(page,server.url,'/hr/applications?vacancyId=vacancy_4&priority=on');
      await measure(page,'applications-filtered',width);
      for(const [name,title] of [['Выгрузка JSON','Импорт поступивших откликов'],['Письмо EML','Загрузить письмо'],['Пакет DOCX или TXT','Пакет резюме'],['Добавить отклик','Добавить отклик']]){
        if(name!=="Добавить отклик")await page.getByRole('button',{name:'Импортировать',exact:true}).click();
        const button=page.getByRole('button',{name,exact:true});
        if(!(await button.count()))continue;
        await button.click();
        await page.locator('dialog[open]').getByRole('heading',{name:title,exact:true}).waitFor();
        await measure(page,title,width);
        await page.keyboard.press('Escape');
      }
    }
    const department=await browser.newPage({viewport:{width:390,height:900}});
    await visit(department,server.url,'/department');
    await department.getByRole('button',{name:'Демо подразделения'}).click();
    await department.getByRole('heading',{name:'Кабинет подразделения',exact:true}).waitFor();
    await measure(department,'/department',390);
    await department.getByRole('link',{name:'Заявки на подбор'}).click();
    await department.getByRole('button',{name:'Создать заявку'}).waitFor();
    await measure(department,'/department?tab=requests',390);
    await department.getByRole('button',{name:'Создать заявку'}).click();
    let dialog=department.locator('dialog[open]');
    await dialog.getByLabel('Должность').fill('Инженер по тестированию');
    await dialog.getByLabel('Подразделение').fill('Учебная команда');
    await dialog.getByLabel('Задачи и ожидаемый результат').fill('Составлять чек-листы регрессионного тестирования.');
    await dialog.getByRole('button',{name:'Сохранить черновик'}).click();
    await department.getByRole('button',{name:'Подтвердить и передать'}).click();
    await department.getByText('У кадровика',{exact:true}).waitFor();
    await visit(page,server.url,'/hr/vacancies?view=requests');
    await page.getByRole('link',{name:'Подготовить вакансию'}).click();
    await page.getByRole('heading',{name:'Новая вакансия'}).waitFor();
    assert.equal(await page.getByLabel('Название вакансии').inputValue(),'Инженер по тестированию');
    await page.getByRole('button',{name:'Опубликовать',exact:true}).click();
    await page.getByRole('heading',{name:'Инженер по тестированию'}).waitFor();
    await department.reload();
    await department.getByRole('link',{name:'Открыть вакансию'}).waitFor();

    await visit(page,server.url,'/hr/applications?vacancyId=vacancy_4');
    await page.getByRole('button',{name:'Импортировать',exact:true}).click();
    await page.getByRole('button',{name:'Пакет DOCX или TXT'}).click();
    dialog=page.locator('dialog[open]');
    const inputs=[
      {name:'Аудитова_Кира.txt',mimeType:'text/plain',buffer:Buffer.from('Высшее образование по экономике. Проводила первичные интервью.')},
      {name:'Аудитов_Игорь.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:syntheticDocx('Высшее образование по юриспруденции. Готовил проекты муниципальных правовых актов.')}
    ];
    await dialog.getByLabel('Файлы резюме').setInputFiles(inputs);
    await dialog.getByRole('button',{name:'Добавить в очередь'}).click();
    await dialog.getByText('В очереди 2 из 2 откликов.').waitFor();
    await dialog.getByRole('link',{name:'Открыть отклик'}).last().click();
    await page.getByRole('heading',{name:'Аудитов Игорь'}).waitFor();
    await page.getByRole('link',{name:'Резюме',exact:true}).click();
    await page.locator('.resume').filter({hasText:/Готовил проекты муниципальных правовых актов/}).waitFor();
    await visit(page,server.url,'/hr/applications?q='+encodeURIComponent('Аудитова'));
    await page.getByRole('link',{name:'Аудитова Кира',exact:true}).click();
    await page.getByRole('heading',{name:'Аудитова Кира'}).waitFor();
    await page.getByRole('navigation',{name:'Материалы отклика'}).getByRole('link',{name:'Вопросы для интервью'}).click();
    await page.getByRole('button',{name:'Записать ответ'}).first().click();
    dialog=page.locator('dialog[open]');
    await dialog.getByLabel('Ответ',{exact:true}).fill('Профессиональная переподготовка по юриспруденции.');
    await dialog.getByLabel('Следующий шаг').fill('Сверить диплом.');
    await dialog.getByRole('button',{name:'Записать ответ'}).click();
    await page.getByRole('heading',{name:'Ответы со звонков и встреч'}).waitFor();
    await page.getByRole('link',{name:'Взаимодействие',exact:true}).click();
    await page.getByRole('button',{name:'Передать карточку'}).click();
    dialog=page.locator('dialog[open]');
    await dialog.getByRole('heading',{name:'Что увидит подразделение'}).waitFor();
    const dueDate=new Date(Date.now()+3*86400000).toISOString().slice(0,16);
    await dialog.getByLabel('Ответить до').fill(dueDate);
    await dialog.getByRole('button',{name:'Передать',exact:true}).click();
    await page.getByText('Ожидает ответа подразделения.',{exact:true}).waitFor();
    await visit(department,server.url,'/department');
    await department.getByLabel('Результат').selectOption('clarify');
    await department.getByLabel('Обоснование').fill('Сверить данные диплома на очной встрече.');
    await department.getByRole('button',{name:'Ответить',exact:true}).click();
    await department.getByText('Сверить данные диплома на очной встрече.',{exact:true}).waitFor();
    await visit(page,server.url,'/hr/applications?handoff=answered');
    await page.getByText('Есть ответ подразделения',{exact:true}).waitFor();
    await page.getByRole('link',{name:'Аудитова Кира',exact:true}).click();
    await page.getByRole('link',{name:'Взаимодействие',exact:true}).click();
    await page.getByText('Сверить данные диплома на очной встрече.',{exact:true}).waitFor();

    await visit(page,server.url,'/hr/candidates/candidate_demo_21');
    await page.locator('table').getByRole('link',{name:'Ольга Ланская',exact:true}).click();
    await page.getByRole('link',{name:'Назад к кандидату',exact:true}).click();
    await page.waitForURL('**/hr/candidates/candidate_demo_21');
    await page.getByRole('heading',{name:'Профиль кандидата'}).waitFor();
    const readTotals=async ()=>(await (await page.request.get(server.url+'/api/v1/hr/analytics')).json()).totals.received;
    const countBeforeArchive=await readTotals();
    const archive={
      name:'Учебная история № 154.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer:syntheticDocx([
        'История общения с кандидатом','Откликнулась',
        'Консультант учебного отдела','16 сентября 2026',
        'Начальник учебного отдела','10 сентября 2026',
        'Начальник учебного отдела','6 августа 2026'
      ].join('\n'))
    };
    for(let attempt=0;attempt<2;attempt++){
      await page.getByRole('button',{name:'Добавить документ'}).click();
      dialog=page.locator('dialog[open]');
      await dialog.getByLabel('Папка или реестр').fill('Учебная папка');
      await dialog.getByLabel('Исходный документ').setInputFiles(archive);
      await dialog.getByText(/Найдено событий: 3/).waitFor();
      assert.equal(await dialog.locator('[data-archive-event]').count(),3);
      assert.equal(await dialog.getByLabel('Фрагмент документа').first().inputValue(),'Консультант учебного отдела\n16 сентября 2026');
      await dialog.getByRole('button',{name:'Сохранить документ'}).click();
      await page.locator('dialog[open]').waitFor({state:'hidden'});
      await page.getByText('Учебная история № 154 · Учебная папка',{exact:true}).waitFor();
    }
    const archiveCard=page.getByText('Учебная история № 154 · Учебная папка',{exact:true});
    await archiveCard.click();
    assert.equal(await page.locator('.archive-doc-body .history li').count(),3);
    assert.equal(await archiveCard.count(),1);
    assert.equal(await readTotals(),countBeforeArchive);
    await visit(page,server.url,'/hr/analytics');
    await page.getByRole('heading',{name:'Рабочая нагрузка'}).waitFor();
    await page.getByRole('button',{name:'Показать приоритеты'}).click();
    await page.getByText('Приоритеты по данным',{exact:true}).waitFor();
    await page.getByRole('link',{name:'Открыть очередь без действий'}).click();
    await page.waitForURL('**/hr/applications?activity=without_action');
    await page.getByText('Без действий по этапу',{exact:true}).waitFor();
    await visit(page,server.url,'/hr/applications/app_demo_21?tab=report');
    await page.emulateMedia({media:'print'});
    assert.ok(await page.locator('#print-report').isVisible());
    assert.equal(await page.locator('.rail').isVisible(),false);
    await page.pdf({path:images+'/report-print.pdf',format:'A4'});
    await page.emulateMedia({media:'screen'});

    const guest=await browser.newPage({viewport:{width:390,height:900}});
    await visit(guest,server.url,'/vacancies/hr-sector-consultant?apply=1');
    await guest.getByRole('radio',{name:'Написать текст'}).check();
    await guest.getByLabel('Фамилия и имя').fill('Учебная Гостьева');
    await guest.getByLabel('Email для связи').fill('guest@example.test');
    await guest.getByLabel('Текст резюме').fill('Высшее образование по экономике. Проводила первичные интервью.');
    await guest.getByRole('button',{name:'Отправить отклик'}).click();
    await guest.getByRole('heading',{name:'Статус отклика'}).waitFor();
    await measure(guest,'guest-receipt',390);
    await visit(page,server.url,'/hr/applications?q='+encodeURIComponent('Гостьева'));
    await page.getByRole('link',{name:'Учебная Гостьева'}).click();
    await page.getByRole('button',{name:'Начать рассмотрение'}).click();
    dialog=page.locator('dialog[open]');
    await dialog.getByRole('button',{name:'Начать рассмотрение'}).click();
    await page.getByRole('button',{name:'Пригласить на интервью'}).waitFor();
    await guest.reload();
    await guest.getByText('На рассмотрении',{exact:true}).waitFor();

    const post=async (route,data)=>{
      const response=await page.request.post(server.url+'/api/v1'+route,{
        data,headers:{'Idempotency-Key':crypto.randomUUID()}
      });
      assert.equal(response.status(),201,route);
      return response.json();
    };
    const longTitle='Муниципальная вакансия по сопровождению проектов и оценке кандидатов '.repeat(3).trim().slice(0,150);
    const longName='Длиннофамильная Учебная '.repeat(8).trim().slice(0,160);
    const stressVacancy=await post('/hr/vacancies',{title:longTitle,department:'Межведомственная учебная комиссия по муниципальному подбору',
      description:'Проверка отображения длинных названий.',slug:'layout-stress',criteria:[]});
    await post('/hr/vacancies/'+stressVacancy.vacancyId+'/publish',{});
    const stressApp=await post('/hr/applications',{vacancyId:stressVacancy.vacancyId,fullName:longName,resumeText:'Готовил документы.'});
    for(const width of [320,390,1024]){
      await page.setViewportSize({width,height:900});
      for(const route of ['/hr/applications?vacancyId='+stressVacancy.vacancyId,'/hr/applications/'+stressApp.applicationId+'?tab=interview']){
        await visit(page,server.url,route);
        await measure(page,'long-name-and-vacancy',width);
      }
    }
    await page.clock.install();
    await visit(page,server.url,'/hr/feedback');
    const bell=page.locator('[data-news-bell]');
    await bell.locator('[data-news-count]').waitFor();
    assert.equal(await bell.locator('[data-news-count]').textContent(),'4');
    const popup=page.locator('[data-news-widget][popover]');
    await bell.click();
    await popup.getByRole('link',{name:newsTitle,exact:true}).waitFor();
    await page.keyboard.press('Escape');
    await popup.waitFor({state:'hidden'});
    assert.equal(await bell.evaluate(node=>node===document.activeElement),true);
    await bell.click();
    await popup.getByRole('link',{name:'Вся лента',exact:true}).click();
    await page.getByRole('heading',{name:'HR-новости',exact:true}).waitFor();
    await page.getByLabel('Тема',{exact:true}).selectOption('skills');
    assert.equal(await page.locator('[data-news-content] tbody tr').count(),2);
    await page.getByLabel('Только непрочитанные').check();
    await page.getByRole('button',{name:'Отметить прочитанным: '+newsTitle}).click();
    await page.getByRole('link',{name:newsTitle,exact:true}).waitFor({state:'hidden'});
    assert.equal(await bell.locator('[data-news-count]').textContent(),'3');
    await page.getByText('Каталог источников',{exact:true}).click();
    await page.getByRole('link',{name:'hh.ru — статистика рынка труда',exact:true}).waitFor();
    await measure(page,'news-catalog-open',1024);
    await page.getByRole('button',{name:'Отметить все прочитанными'}).click();
    await bell.locator('[data-news-count]').waitFor({state:'hidden'});
    await Promise.all([
      page.waitForResponse(response=>response.url().endsWith('/api/v1/hr/news')),
      visit(page,server.url,'/hr/feedback')
    ]);
    newPublication=true;
    await server.env.DB.prepare("UPDATE records SET sort='' WHERE kind='system' AND id='news-refresh'").bind().first();
    await page.clock.fastForward(121000);
    await page.getByText('В HR-новостях появились новые публикации.',{exact:true}).waitFor();
    assert.equal(await bell.locator('[data-news-count]').textContent(),'1');
    await bell.click();
    await popup.getByRole('link',{name:'Новые данные о рынке труда',exact:true}).waitFor();
    await popup.getByRole('link',{name:'Вся лента',exact:true}).click();
    await page.getByRole('link',{name:'Новые данные о рынке труда',exact:true}).waitFor();
    console.log(JSON.stringify({scenarios,fail,notices,errors:[...errors],workflows:9,images},null,2));
    if(errors.size||fail.length)process.exitCode=1;
  } finally {
    await browser.close();
    await server.close();
    const resolved=path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep+'kadry-audit-db-'));
    await fs.rm(resolved,{recursive:true,force:true});
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
