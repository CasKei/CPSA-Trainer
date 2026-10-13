const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
  await page.goto(pathToFileURL(path.resolve(__dirname,'../CPSA_Trainer.html')).href);
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:844});
   for(const v of ['home','drill','flash','bank','exam']){
    await page.evaluate(v=>go(v),v);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow: ${v} ${width}px`);
   }
   if(width<700)assert(await page.locator('header').evaluate(e=>e.getBoundingClientRect().height)<=100,'Compact mobile header');
   assert(await page.locator('#nav button').evaluateAll(xs=>xs.filter(x=>x.getClientRects().length).every(x=>x.getBoundingClientRect().height>=44)),'Navigation tap targets');
   if(width<700)assert(await page.locator('#modeSwitcher').evaluate(x=>x.getBoundingClientRect().height>=44),'Mobile mode switch tap target');
  }
  await page.setViewportSize({width:390,height:844});
  await page.selectOption('#modeSwitcher','bank');await page.locator('h1').filter({hasText:'Question bank'}).waitFor();
  await page.evaluate(()=>{go('exam');startExam();});
  await page.locator('.opts button').first().focus();await page.keyboard.press('2');
  assert(await page.evaluate(()=>sess.items[0].ans===sess.items[0].opts[1]),'Number shortcut works with an answer focused');
  await page.keyboard.press('f');
  assert.equal(await page.evaluate(()=>sess.items[0].flag),true);
  assert.equal(await page.locator('.exam-map').getAttribute('open'),null,'Map starts collapsed');
  await page.locator('.exam-map summary').click();
  assert(await page.locator('.pn').evaluateAll(xs=>xs.every(x=>x.getBoundingClientRect().height>=44)),'Palette touch targets');
  await page.getByRole('button',{name:'Next unanswered',exact:true}).click();
  assert.equal(await page.evaluate(()=>sess.idx),1);
  await page.getByRole('button',{name:'Next flagged',exact:true}).click();
  assert.equal(await page.evaluate(()=>sess.idx),0);
  assert(await page.locator('.pn.cur').getAttribute('aria-label').then(x=>x.includes('flagged')),'Flags described without color');
  const before=await page.evaluate(()=>({id:sess.items[0].id,opts:sess.items[0].opts,ans:sess.items[0].ans,end:sess.end}));
  await page.evaluate(()=>go('home'));await page.reload();
  await page.getByRole('button',{name:'Resume session',exact:true}).click();
  const after=await page.evaluate(()=>({id:sess.items[0].id,opts:sess.items[0].opts,ans:sess.items[0].ans,end:sess.end}));
  assert.deepEqual(after,before,'Exam resume retains answers, options, ID, and original deadline');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  assert(await page.locator('.session-dock').evaluate(e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.top>=0;}),'Dock remains visible after scrolling');
  await page.locator('.session-dock').getByRole('button',{name:'Next',exact:true}).click();
  assert.equal(await page.evaluate(()=>scrollY),0,'New question returns to top');
  await page.evaluate(()=>{sess.end=Date.now()-1000;sess.start=sess.end-EXAM_SEC*1000;persistSession();go('home');});
  await page.reload();await page.getByRole('button',{name:'View timed result',exact:true}).click();
  assert.equal(await page.evaluate(()=>S.exams.length),1,'Expired resume scores once');
  await page.reload();assert.equal(await page.evaluate(()=>S.exams.length),1);
  assert.equal(await page.getByRole('button',{name:'Resume session',exact:true}).count(),0);

  await page.evaluate(()=>{go('drill');setLen(40);drillCat('ALL');});
  await page.locator('.opts button').first().focus();await page.keyboard.press('1');
  const answered=await page.evaluate(()=>({n:overall().n,id:sess.items[0].id,ans:sess.items[0].ans}));
  await page.reload();await page.getByRole('button',{name:'Resume session',exact:true}).click();
  assert.equal(await page.evaluate(()=>overall().n),answered.n,'Resume does not record an answer twice');
  assert.equal(await page.evaluate(()=>sess.items[0].done),true);
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>sess.idx),1,'Enter advances after feedback');
  await page.evaluate(()=>go('drill'));
  assert.equal(await page.locator('#lenSeg button.on').textContent(),'40','Session length retained across refresh');
  await page.locator('.trow').first().focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>sess.live),true,'Topic cards activate with keyboard');

  await page.evaluate(()=>{go('flash');flashStart('ALL');});
  await page.locator('.flash').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>sess.items[0].flip),true,'Accessible flashcard reveal');
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>sess.idx),1);
  await page.evaluate(()=>go('bank'));await page.locator('#bankSearch').fill('umask');
  const choices=await page.locator('#bankRows .opt').allTextContents();
  await page.evaluate(()=>renderBankRows());assert.deepEqual(await page.locator('#bankRows .opt').allTextContents(),choices,'Bank choices remain stable during rendering');
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  assert.equal(await page.locator('#bankSearch').inputValue(),'');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  assert.equal(await page.evaluate(()=>bankPage),1);
  assert(await page.locator('#bankRows').evaluate(e=>e.getBoundingClientRect().top<150),'Paging scrolls back to results');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.btn').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>go('home'));
  await page.screenshot({path:path.join(__dirname,'ui-home-mobile-dark.png'),fullPage:true});
  await page.emulateMedia({colorScheme:'light'});await page.evaluate(()=>{go('drill');drillCat('ALL');drillPick(0);});
  await page.screenshot({path:path.join(__dirname,'ui-drill-mobile.png'),fullPage:true});
  await page.evaluate(()=>{go('exam');startExam();});
  await page.screenshot({path:path.join(__dirname,'ui-exam-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>go('home'));
  await page.screenshot({path:path.join(__dirname,'ui-home-desktop.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  const result={date:'2026-10-14',viewports:[320,390,768,1024,1440],checks:['no page overflow across five views','compact mobile header','44px tap targets','focused-answer keyboard shortcuts','flag/unanswered jumps','collapsed question navigator','fixed session actions','top-of-question navigation','exam resume with original deadline','expired exam scored once','drill resume without double scoring','remembered session length','keyboard-accessible topic cards and flashcards','stable bank option order','clear search and paging focus','reduced motion','dark/light screenshots'],runtimeErrors:errors};
  fs.writeFileSync(path.join(__dirname,'ui-validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
