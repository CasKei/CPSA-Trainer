/* Embedded by build_trainer.py: responsive controls and recoverable study sessions. */
const SESSION_KEY=KEY+'_active_session_v1';
const bankOptionCache=new Map();
function bankOptions(q){if(!bankOptionCache.has(q.id))bankOptionCache.set(q.id,shuffle([q.a,...q.d]));return bankOptionCache.get(q.id);}
function announce(message){document.getElementById('ui-status').textContent=message;}
function persistSession(){
  if(!sess||!sess.live)return;
  try{localStorage.setItem(SESSION_KEY,JSON.stringify({bankVersion:BANK_VERSION,session:sess}));}catch(e){storageOK=false;}
}
function clearSavedSession(){try{localStorage.removeItem(SESSION_KEY);}catch(e){storageOK=false;}}
function readSavedSession(){
  try{
    const raw=JSON.parse(localStorage.getItem(SESSION_KEY));if(!raw||raw.bankVersion!==BANK_VERSION)return null;
    const s=raw.session;if(!s||!s.live||!['exam','drill','weak','flash'].includes(s.mode)||!Array.isArray(s.items)||!s.items.length||s.items.length>120)return null;
    if(!Number.isInteger(s.idx)||s.idx<0||s.idx>=s.items.length||new Set(s.items.map(i=>i.id)).size!==s.items.length)return null;
    for(const it of s.items){
      const q=byId(it.id);if(!q||!Array.isArray(it.opts)||it.opts.length!==q.d.length+1)return null;
      if(new Set(it.opts).size!==it.opts.length||it.opts.some(o=>![q.a,...q.d].includes(o))||(it.ans!=null&&!it.opts.includes(it.ans)))return null;
      if(it.done!=null&&typeof it.done!=='boolean')return null;
    }
    if(s.mode==='exam'){
      if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<s.start||s.end-s.start>EXAM_SEC*1000)return null;
    }else{
      if(!Number.isInteger(s.right)||s.right<0||s.right>s.items.filter(i=>i.done).length||!Number.isInteger(s.len)||s.len<1)return null;
      if(typeof s.title!=='string'||s.title.length>120)return null;
    }
    return s;
  }catch(e){return null;}
}
function resumeSession(){
  const saved=readSavedSession();if(!saved){toast('No compatible saved session');dashboard();return;}
  stopTimer();sess=saved;view=sess.mode==='exam'?'exam':sess.mode==='flash'?'flash':sess.mode==='weak'?'weak':'drill';renderNav();
  if(sess.mode==='exam'){if(sess.end<=Date.now()){submitExam(true);return;}startTimer();examRun();}
  else if(sess.mode==='flash')flashRun();else drillRun();
  focusQuestion();announce('Saved session resumed.');
}
function discardSavedSession(){if(confirm('Discard the saved session? Completed drill answers remain in your progress.')){clearSavedSession();dashboard();}}
function focusQuestion(){
  window.scrollTo(0,0);const el=document.querySelector('.qtext,.flash');
  if(el){el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}
}
renderNav=function(){
  const labels={home:'Home',exam:'Mock exam',drill:'Topic drills',weak:'Weak areas',flash:'Flashcards',bank:'Question bank',settings:'Settings'};
  document.getElementById('nav').innerHTML=NAV.map(([key])=>`<button class="${view===key?'on':''}" ${view===key?'aria-current="page"':''} onclick="go('${key}')">${labels[key]}</button>`).join('');
  const switcher=document.getElementById('modeSwitcher');
  switcher.innerHTML=NAV.map(([key])=>`<option value="${key}">${labels[key]}</option>`).join('');switcher.value=view;
  document.querySelector('#nav .on')?.scrollIntoView({block:'nearest',inline:'nearest'});
};
const baseDashboard=dashboard;
dashboard=function(){
  document.body.classList.remove('has-session');baseDashboard();
  const update=[...document.querySelectorAll('#app .banner')].find(el=>el.textContent.startsWith('Revised '));
  if(update){
    const note=[...document.querySelectorAll('#app p')].find(el=>el.textContent.startsWith('Practice scores describe'));
    const details=document.createElement('details');details.className='revision-note';details.innerHTML='<summary>About this question bank and practice scores</summary>';
    update.before(details);details.append(update);if(note)details.append(note);
  }
  const saved=readSavedSession();
  if(saved){
    const title=saved.mode==='exam'?'mock exam':saved.mode==='flash'?'flashcards':'practice';
    const expired=saved.mode==='exam'&&saved.end<=Date.now();
    const banner=document.createElement('section');banner.className='card resume-card';
    banner.innerHTML=`<div><strong>${expired?'Your saved exam timer has ended':`Continue your ${title}`}</strong><div class="small muted">Question ${saved.idx+1} of ${saved.items.length}${saved.mode==='exam'?' · the countdown continues while you are away':''}</div></div><div class="row"><button class="btn" onclick="resumeSession()">${expired?'View timed result':'Resume session'}</button><button class="btn gh" onclick="discardSavedSession()">Discard</button></div>`;
    document.querySelector('#app h1').after(banner);
  }
};
go=function(v){
  if(sess?.live){persistSession();stopTimer();}
  sess=null;view=v;document.body.classList.remove('has-session');renderNav();window.scrollTo(0,0);
  ({home:dashboard,exam:examHome,drill:drillHome,weak:weakHome,flash:flashHome,bank:bankView,settings:settingsView}[v]||dashboard)();
  document.querySelector('#app h1')?.setAttribute('tabindex','-1');document.querySelector('#app h1')?.focus({preventScroll:true});
};
function approveNewSession(){
  if(!readSavedSession())return true;
  return confirm('Start a new session and replace the saved one? Completed drill answers remain saved.');
}
const baseStartExam=startExam;
startExam=function(){if(!approveNewSession())return;clearSavedSession();baseStartExam();focusQuestion();};
const baseMakeSession=makeSession;
let selectionMode=null;
const baseWeight=weight;
weight=function(q){const s=S.stats[q.id];return baseWeight(q)*(selectionMode==='weak'&&s?.n>0&&s.box===0?1.8:1);};
const pickWithinTopic=pickWeighted;
pickWeighted=function(pool,n){
  const groups=new Map();for(const q of pool){if(!groups.has(q.c))groups.set(q.c,[]);groups.get(q.c).push(q);}
  const topics=shuffle([...groups.keys()]),quotas=new Map(topics.map(c=>[c,0]));
  let remaining=Math.min(n,pool.length);
  while(remaining>0)for(const c of topics){if(remaining>0&&quotas.get(c)<groups.get(c).length){quotas.set(c,quotas.get(c)+1);remaining--;}}
  return shuffle(topics.flatMap(c=>pickWithinTopic(groups.get(c),quotas.get(c))));
};
startWeak=function(){makeSession('weak',practicePool(inScope()),LEN,'Weakness review');};
makeSession=function(mode,pool,len,title){
  if(!pool.length){toast('No questions match this practice filter');return;}
  if(!approveNewSession())return;clearSavedSession();selectionMode=mode;
  try{baseMakeSession(mode,pool,len,title);}finally{selectionMode=null;}
  focusQuestion();
};
const baseSetLen=setLen;
setLen=function(n){baseSetLen(n);S.settings.sessionLength=LEN;save();};
LEN=[10,20,40].includes(S.settings.sessionLength)?S.settings.sessionLength:20;
function decorateSession(){
  document.body.classList.add('has-session');
  const app=document.getElementById('app'),it=sess.items[sess.idx];
  for(const b of app.querySelectorAll('.qcard .qbar button'))b.parentElement.classList.add('inline-actions');
  for(const [i,b] of [...app.querySelectorAll('.opts button')].entries()){
    if(sess.mode==='exam')b.setAttribute('aria-pressed',String(it.ans===it.opts[i]));
    else if(it.done)b.setAttribute('aria-disabled','true');
  }
  if(sess.mode==='exam'){
    const palette=app.querySelector('.palette');
    if(palette){
      const flagged=sess.items.filter(i=>i.flag).length,unanswered=sess.items.filter(i=>i.ans==null).length;
      const details=document.createElement('details');details.className='exam-map';details.open=!!sess.mapOpen;
      details.innerHTML=`<summary>Question navigator · ${flagged} flagged · ${unanswered} unanswered</summary><div class="row map-tools"><button class="btn gh sm" onclick="jumpExam('unanswered')">Next unanswered</button><button class="btn gh sm" onclick="jumpExam('flagged')">Next flagged</button></div><p class="small muted">✓ answered · ★ flagged · outlined = current</p>`;
      palette.before(details);details.append(palette);
      for(const [n,b] of [...palette.children].entries()){
        const x=sess.items[n];b.textContent=`${n+1}${x.flag?' ★':x.ans!=null?' ✓':''}`;
        b.setAttribute('aria-label',`Question ${n+1}, ${x.ans==null?'unanswered':'answered'}${x.flag?', flagged':''}`);
        if(n===sess.idx)b.setAttribute('aria-current','true');
      }
      details.addEventListener('toggle',()=>{if(sess?.live&&sess.mode==='exam'){sess.mapOpen=details.open;persistSession();}});
    }
  }
  const flash=app.querySelector('.flash');
  if(flash){flash.tabIndex=0;flash.setAttribute('role',it.flip?'group':'button');flash.setAttribute('aria-label',it.flip?'Flashcard answer':'Reveal flashcard answer');flash.onclick=e=>{if(!e.target.closest('a,button'))flashFlip();};}
  const dock=document.createElement('div');dock.className='session-dock';dock.setAttribute('role','region');dock.setAttribute('aria-label','Study session controls');
  if(sess.mode==='exam')dock.innerHTML=`<button class="btn gh" ${sess.idx===0?'disabled':''} onclick="examNav(-1)">Previous</button><button class="btn gh" ${sess.idx===sess.items.length-1?'disabled':''} onclick="examNav(1)">Next</button><button class="btn" onclick="confirmSubmit()">Submit exam</button>`;
  else if(sess.mode==='flash')dock.innerHTML=it.flip?`<button class="btn gh" onclick="flashRate(false)">Didn't know</button><button class="btn" onclick="flashRate(true)">Knew it</button>`:`<span class="small muted">Recall before revealing</span><button class="btn" onclick="flashFlip()">Reveal answer</button>`;
  else dock.innerHTML=`<span class="small muted">${it.done?(it.ans===byId(it.id).a?'Correct · read the explanation':'Incorrect · review the explanation'):'Choose an answer'}</span><button class="btn" ${it.done?'':'disabled'} onclick="nextOrEnd()">${sess.idx===sess.items.length-1?'Finish':'Next question'}</button>`;
  app.append(dock);persistSession();
}
const baseExamRun=examRun,baseDrillRun=drillRun,baseFlashRun=flashRun;
examRun=function(){baseExamRun();decorateSession();};
drillRun=function(){baseDrillRun();decorateSession();};
flashRun=function(){baseFlashRun();decorateSession();};
const baseNextOrEnd=nextOrEnd;
nextOrEnd=function(){baseNextOrEnd();if(sess.live)focusQuestion();};
const baseExamNav=examNav,baseExamGo=examGo;
examNav=function(d){baseExamNav(d);focusQuestion();};
examGo=function(n){baseExamGo(n);focusQuestion();};
function jumpExam(kind){
  for(let step=1;step<=sess.items.length;step++){
    const index=(sess.idx+step)%sess.items.length,it=sess.items[index];
    if(kind==='flagged'?it.flag:it.ans==null){examGo(index);return;}
  }
  toast(kind==='flagged'?'No flagged questions':'All questions answered');
}
const baseDrillPick=drillPick;
drillPick=function(i){if(sess.items[sess.idx].done)return;baseDrillPick(i);const it=sess.items[sess.idx];announce(it.ans===byId(it.id).a?'Correct. Explanation available below.':'Incorrect. Correct answer and explanation available below.');};
const baseSessionDone=sessionDone,baseSubmitExam=submitExam;
sessionDone=function(){clearSavedSession();document.body.classList.remove('has-session');baseSessionDone();};
submitExam=function(auto){if(!sess?.live)return;clearSavedSession();document.body.classList.remove('has-session');baseSubmitExam(auto);};
const baseReset=resetP;
resetP=function(){const before=S;baseReset();if(S!==before)clearSavedSession();};
function bankPageStep(delta){bankPage+=delta;renderBankRows();document.getElementById('bankRows').scrollIntoView({block:'start'});document.querySelector('#bankRows summary')?.focus({preventScroll:true});}
function clearBankSearch(){bankQuery='';bankPage=0;document.getElementById('bankSearch').value='';renderBankRows();document.getElementById('bankSearch').focus();}
const baseBankView=bankView;
bankView=function(){baseBankView();const clear=document.createElement('button');clear.className='btn gh sm';clear.textContent='Clear search';clear.onclick=clearBankSearch;document.querySelector('#app .card.row').append(clear);};
document.addEventListener('keydown',e=>{
  const target=e.target;
  if(target.matches?.('input,textarea,select')||target.isContentEditable||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if((e.key==='Enter'||e.key===' ')&&target.matches?.('.trow[onclick],.card.click[onclick],.brand')){e.preventDefault();target.click();return;}
  if(!sess?.live)return;
  if(/^[1-9]$/.test(e.key)&&sess.mode!=='flash'){
    const i=Number(e.key)-1;if(i<sess.items[sess.idx].opts.length){e.preventDefault();sess.mode==='exam'?examPick(i):drillPick(i);}return;
  }
  if((e.key==='Enter'||e.key===' ')&&target.matches?.('button,summary,a'))return;
  if(sess.mode==='exam'){
    if(e.key==='ArrowRight'){e.preventDefault();examNav(1);}else if(e.key==='ArrowLeft'){e.preventDefault();examNav(-1);}else if(e.key.toLowerCase()==='f'){e.preventDefault();flagQ();}
  }else if(sess.mode==='flash'){
    if(e.key===' '||(e.key==='Enter'&&target.matches?.('.flash'))){e.preventDefault();flashFlip();}
    else if(sess.items[sess.idx].flip&&e.key==='ArrowRight'){e.preventDefault();flashRate(true);}else if(sess.items[sess.idx].flip&&e.key==='ArrowLeft'){e.preventDefault();flashRate(false);}
  }else if(sess.items[sess.idx].done&&(e.key==='Enter'||e.key===' ')){e.preventDefault();nextOrEnd();}
});
// Non-button topic cards are also reachable by keyboard, including after view changes.
const cardObserver=new MutationObserver(()=>{
  for(const el of document.querySelectorAll('.trow[onclick],.card.click[onclick],.brand')){el.tabIndex=0;el.setAttribute('role','button');}
});
cardObserver.observe(document.getElementById('app'),{childList:true,subtree:true});
document.querySelector('.brand').tabIndex=0;document.querySelector('.brand').setAttribute('role','button');
window.addEventListener('beforeunload',persistSession);
