const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const html=path.join(root,'CPSA_Trainer.html');
const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'bank.json'),'utf8'));
const source=fs.readFileSync(html,'utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1];
new (require('node:vm').Script)(script);
assert.equal(bank.length,new Set(bank.map(q=>q.id)).size);
assert.equal(bank.length,1034);
const categoryCounts=Object.fromEntries('ABCDEFGHIJ'.split('').map(c=>[c,bank.filter(q=>q.c===c).length]));
assert.deepEqual(categoryCounts,{A:100,B:134,C:100,D:100,E:100,F:100,G:100,H:100,I:100,J:100});
const refs=JSON.parse(fs.readFileSync(path.join(__dirname,'references.json'),'utf8'));
const stems=new Set();
for(const q of bank){
  const stem=q.q.toLowerCase().replace(/[^a-z0-9]/g,'');assert(!stems.has(stem),`Repeated stem #${q.id}`);stems.add(stem);
  assert((q.refs||[]).every(ref=>refs[ref]),`Missing reference #${q.id}`);
  if(q.origin){assert(q.p.trim());assert(q.refs.length);assert(/^[A-J]\d+/.test(q.s));}
  assert(q.e.trim(),`Missing explanation #${q.id}`);
  assert(!source.includes('\uFFFD'),'Replacement-character corruption');
  const opts=[q.a,...q.d].map(x=>x.trim().toLowerCase().replace(/[.!]$/,''));
  assert.equal(opts.length,new Set(opts).size,`Duplicate options #${q.id}`);
  assert(!/^(all|none) of (the|these)/i.test(q.a),`Meta-answer #${q.id}`);
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  const requests=[];
  page.on('request',r=>requests.push(r.url()));
  try{
    await page.goto(pathToFileURL(html).href);
    await page.locator('h1').filter({hasText:'Your CPSA dashboard'}).waitFor();
    assert.equal(await page.evaluate(()=>BANK.length),bank.length);
    assert(await page.evaluate(()=>BANK.every(q=>byId(q.id)===q)),'Sparse stable IDs resolve');

    // Migrate an actual old saved state on the same file origin.
    await page.evaluate(()=>{
      const old={v:1,stats:{0:{n:2,c:1,w:1,box:0,last:1},1:{n:3,c:3,w:0,box:3,last:1},62:{n:1,c:1,w:0,box:1,last:1}},exams:[{score:72,total:120,date:1,dur:6000}],settings:{offsyl:true}};
      localStorage.removeItem(KEY+'_pre_revision_20261014');localStorage.setItem(KEY,JSON.stringify(old));
    });
    await page.reload();
    const migrated=await page.evaluate(()=>({kept:S.stats[1],revised:S.stats[0],retired:S.stats[62],archive:Object.keys(S.archivedStats),backup:JSON.parse(localStorage.getItem(KEY+'_pre_revision_20261014')),history:S.exams.length}));
    assert.equal(migrated.kept.n,3);assert.equal(migrated.revised,undefined);assert.equal(migrated.retired,undefined);
    assert.deepEqual(migrated.archive.sort(),['0','62']);assert.equal(migrated.backup.stats[0].n,2);assert.equal(migrated.history,1);
    await page.reload();assert.equal(await page.evaluate(()=>S.stats[1].n),3,'Migration is idempotent');
    assert.equal(await page.evaluate(()=>validProgress({stats:{1:{n:1,c:10,w:0,box:0,last:1}},exams:[]})),false);
    assert.equal(await page.evaluate(()=>validProgress({stats:{},exams:'broken'})),false);

    // Verify distinct questions and balanced topic coverage over many mocks.
    const examCheck=await page.evaluate(()=>{
      for(let k=0;k<100;k++){
        const exam=buildExam();if(exam.length!==120||new Set(exam.map(i=>i.id)).size!==120)return false;
        const counts={};for(const it of exam){const q=byId(it.id);counts[q.c]=(counts[q.c]||0)+1;if(new Set(it.opts).size!==it.opts.length||it.opts.filter(o=>o===q.a).length!==1)return false;}
        if(CATS.some(c=>counts[c]!==12))return false;
      }return true;
    });assert(examCheck,'100 topic-balanced mocks contain unique questions and valid answer options');

    // Mixed learning sessions balance topics regardless of bank size or stats.
    const mixedCheck=await page.evaluate(()=>{
      const oldStats=S.stats,oldChallenge=S.settings.challenge;S.settings.challenge=false;
      S.stats={};for(const q of BANK)S.stats[q.id]={n:20,c:q.c==='B'?0:20,w:q.c==='B'?20:0,box:q.c==='B'?0:4,last:Date.now()};
      try{
        for(const n of [10,20,40])for(let sample=0;sample<100;sample++){
          const picks=pickWeighted(inScope(),n),counts={};if(new Set(picks.map(q=>q.id)).size!==n)return false;
          for(const q of picks)counts[q.c]=(counts[q.c]||0)+1;
          if(CATS.some(c=>counts[c]!==n/10))return false;
        }
        const limited=[...BANK.filter(q=>q.c==='A').slice(0,1),...BANK.filter(q=>q.c==='B').slice(0,20)];
        if(pickWeighted(limited,20).length!==20||pickWeighted(limited,100).length!==21)return false;
        for(const mode of ['drill','weak','flash']){
          makeSession(mode,inScope(),20,'Balance QA');const counts={};
          for(const it of sess.items){const c=byId(it.id).c;counts[c]=(counts[c]||0)+1;}
          if(CATS.some(c=>counts[c]!==2))return false;sess.live=false;clearSavedSession();
        }
        startWeak();const weakCounts={};for(const it of sess.items){const c=byId(it.id).c;weakCounts[c]=(weakCounts[c]||0)+1;}
        if(CATS.some(c=>weakCounts[c]!==LEN/10))return false;sess.live=false;clearSavedSession();
        S.settings.challenge=true;
        const filtered=pickWeighted(practicePool(inScope()),20);
        if(filtered.some(q=>q.level!=='challenge')||CATS.some(c=>filtered.filter(q=>q.c===c).length!==2))return false;
        const wrong=BANK.find(q=>q.c==='B');selectionMode='weak';const boosted=weight(wrong);selectionMode=null;
        if(!(boosted>weight(wrong)))return false;
        return true;
      }finally{S.stats=oldStats;S.settings.challenge=oldChallenge;selectionMode=null;save();go('home');}
    });assert(mixedCheck,'Mixed drills, weakness sessions, flashcards and applied filters balance topics');
    await page.evaluate(()=>{S.stats[0]={n:2,c:1,w:1,box:0,last:Date.now()};save();});
    await page.reload();assert.equal(await page.evaluate(()=>S.stats[0].n),2,'Additive expansion preserves current-version revised-question progress');

    // Visit all learning views and exercise search, filtering and feedback.
    await page.evaluate(()=>go('bank'));
    await page.locator('#bankSearch').fill('umask');
    assert((await page.locator('#bankRows details').count())>=1);
    await page.locator('#bankRows summary').first().click();
    assert((await page.locator('#bankRows .pitfall').count())>=1);
    await page.locator('#bankSearch').fill('zzzz-no-such-topic');assert.equal(await page.locator('#bankRows details').count(),0);
    await page.evaluate(()=>go('drill'));
    await page.locator('input[type=checkbox]').check();
    await page.evaluate(()=>drillCat('ALL'));
    assert(await page.evaluate(()=>sess.items.every(i=>byId(i.id).level==='challenge')));
    await page.evaluate(()=>{const it=sess.items[0];drillPick(it.opts.findIndex(o=>o!==byId(it.id).a));});
    await page.getByText('Common pitfall',{exact:true}).waitFor();
    assert((await page.locator('a[target=_blank]').count())>=1);
    await page.evaluate(()=>{while(sess.live){const it=sess.items[sess.idx];if(!it.done)drillPick(it.opts.indexOf(byId(it.id).a));nextOrEnd();}});
    await page.getByRole('button',{name:/Retry 1 missed/}).click();
    assert.equal(await page.evaluate(()=>sess.items.length),1);
    await page.evaluate(()=>{const it=sess.items[0];drillPick(it.opts.indexOf(byId(it.id).a));nextOrEnd();});
    await page.evaluate(()=>go('flash'));
    const flashBefore=await page.evaluate(()=>overall().n);
    await page.evaluate(()=>{flashStart('ALL');flashFlip();flashRate(true);});
    assert.equal(await page.evaluate(()=>overall().n),flashBefore,'Self-rating cannot inflate scored accuracy');
    assert((await page.evaluate(()=>Object.values(S.flashStats).reduce((n,s)=>n+s.n,0)))>=1);
    await page.evaluate(()=>go('weak'));await page.locator('h1').filter({hasText:'Weakness review'}).waitFor();
    await page.evaluate(()=>go('settings'));await page.locator('h1').filter({hasText:'Settings'}).waitFor();

    // UI exam submission scores unanswered items, boundary pass, and review.
    await page.evaluate(()=>{go('exam');startExam();sess.items.forEach((it,i)=>{if(i<71)it.ans=byId(it.id).a;});submitExam(false);});
    await page.getByText('BELOW PASS',{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>S.exams.at(-1).score),71);
    await page.evaluate(()=>reviewExam());assert.equal(await page.locator('#app .qcard').count(),120);
    await page.evaluate(()=>{go('exam');startExam();sess.items.forEach((it,i)=>{if(i<72)it.ans=byId(it.id).a;});submitExam(false);});
    await page.locator('h1').filter({hasText:'passed'}).waitFor();
    const saved=await page.evaluate(()=>S.exams.length);
    await page.evaluate(()=>submitExam(false));assert.equal(await page.evaluate(()=>S.exams.length),saved,'Double submit does not double-score');
    await page.evaluate(()=>{go('exam');startExam();sess.end=Date.now()-1000;});
    await page.waitForTimeout(1250);
    assert.equal(await page.evaluate(()=>sess.live),false,'Timer auto-submits');
    assert.equal(await page.evaluate(()=>S.exams.at(-1).auto),true);
    await page.evaluate(()=>go('home'));
    await page.screenshot({path:path.join(__dirname,'dashboard-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>go('bank'));
    await page.locator('#bankSearch').fill('cookie');await page.locator('#bankRows summary').first().click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
    await page.screenshot({path:path.join(__dirname,'bank-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[],'No browser runtime errors');
    assert(requests.every(url=>url.startsWith('file:')),'Trainer performs no external runtime requests');

    // Every question passes through the real drill renderer with explanation.
    await page.evaluate(()=>{for(const q of BANK){makeSession('drill',[q],1,'QA');const it=sess.items[0];drillPick(it.opts.indexOf(q.a));if(!document.querySelector('.expl'))throw Error('Missing feedback '+q.id);sess.live=false;}});
    assert.deepEqual(errors,[]);
    const result={date:'2026-10-14',questions:bank.length,categoryCounts,syntax:'passed',browser:'Microsoft Edge / Chromium, headless',checks:['bank invariants and reference coverage','100+ questions per topic','old progress migration and backup','additive expansion preserves current progress','idempotent migration','malformed import rejection','100 balanced mock samples','300 balanced mixed samples with skewed stats','mixed weakness and flashcard balance','applied filter balance','small-pool exhaustion','within-topic weakness weighting','search/filter','drill feedback','retry missed items','flash self-rating isolation','71/120 fail;72/120 pass','exam review','double-submit prevention','timer auto-submit','all question renderers','mobile overflow','no external runtime requests'],runtimeErrors:errors};
    fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
