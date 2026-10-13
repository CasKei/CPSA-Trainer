"""Embed revised data and learning features into the single offline HTML artifact."""
from pathlib import Path
import json,re,hashlib
P=Path(__file__).resolve().parent
original=P/'CPSA_Trainer.original-2026-10-14.html'
target=P.parent/'CPSA_Trainer.html'
bank=json.loads((P/'bank.json').read_text(encoding='utf-8'))
review=json.loads((P/'review.json').read_text(encoding='utf-8'))
refs=json.loads((P/'references.json').read_text(encoding='utf-8'))
t=original.read_text(encoding='utf-8')
t=re.sub(r'const BANK = .*?;\n',lambda _: 'const BANK = '+json.dumps(bank,ensure_ascii=False,indent=2).replace('</','<\\/')+';\n',t,count=1)
syl=json.loads(re.search(r'const SYL = (.*?);\n',t).group(1));syl.pop('K')
syl['B']['skills']=syl['B']['skills'].replace('B1 IP protocols ·','B1 IP protocols · B2 Network architectures ·')
t=re.sub(r'const SYL = .*?;\n',lambda _:'const SYL = '+json.dumps(syl,ensure_ascii=False)+';\n',t,count=1)

def replace(old,new):
    global t
    if old not in t: raise ValueError('Expected source not found: '+old[:100])
    t=t.replace(old,new)

replace("const CATS=['A','B','C','D','E','F','G','H','I','J','K'];","const CATS=['A','B','C','D','E','F','G','H','I','J'];")
replace("const KEY='cpsa_trainer_v1';", "const KEY='cpsa_trainer_v1';\nconst BANK_VERSION='2026-10-14';\nconst REVISED_IDS="+json.dumps(review['rewritten_ids'])+";\nconst REFERENCES="+json.dumps(refs,ensure_ascii=False)+";\nconst BANK_INFO="+json.dumps(dict(original=review['original_count'],retired=len(review['retired']),revised=len(review['rewritten_ids']),added=len(review['new_ids'])))+";\nconst QUESTION_MAP=new Map(BANK.map(q=>[q.id,q]));")
start=t.index('let mem=null;');end=t.index("let sess=null",start)
t=t[:start]+r'''
let mem=null, storageOK=true;
function init(){return {v:2,bankVersion:BANK_VERSION,stats:{},flashStats:{},exams:[],archivedStats:{},settings:{challenge:false}};}
function validProgress(d){
  if(!d||typeof d!=='object'||!d.stats||typeof d.stats!=='object'||Array.isArray(d.stats))return false;
  if(d.exams!=null&&!Array.isArray(d.exams))return false;
  for(const [id,s] of Object.entries(d.stats)){
    if(!/^\d+$/.test(id)||!s||!['n','c','w','box','last'].every(k=>Number.isFinite(s[k])&&s[k]>=0))return false;
    if(!Number.isInteger(s.n)||!Number.isInteger(s.c)||!Number.isInteger(s.w)||s.c>s.n||s.w>s.n||s.c+s.w!==s.n||s.box>4)return false;
  }
  for(const e of d.exams||[])if(!e||!['score','total','dur','date'].every(k=>Number.isFinite(e[k])&&e[k]>=0)||e.total<1||e.score>e.total)return false;
  if(d.flashStats!=null&&(typeof d.flashStats!=='object'||Array.isArray(d.flashStats)))return false;
  for(const [id,s] of Object.entries(d.flashStats||{}))if(!/^\d+$/.test(id)||!s||!['n','c','last'].every(k=>Number.isFinite(s[k])&&s[k]>=0)||s.c>s.n)return false;
  return true;
}
function migrate(d){
  const oldVersion=d.bankVersion;
  d.settings={challenge:false,...(d.settings||{})};d.exams=d.exams||[];d.flashStats=d.flashStats||{};d.archivedStats=d.archivedStats||{};
  for(const id of Object.keys(d.stats)){
    if(!QUESTION_MAP.has(+id)||(oldVersion!==BANK_VERSION&&REVISED_IDS.includes(+id))){d.archivedStats[id]=d.stats[id];delete d.stats[id];}
  }
  for(const id of Object.keys(d.flashStats))if(!QUESTION_MAP.has(+id))delete d.flashStats[id];
  d.v=2;d.bankVersion=BANK_VERSION;return d;
}
function load(){
  try{
    const raw=localStorage.getItem(KEY);if(!raw)return init();
    const d=JSON.parse(raw);if(!validProgress(d))return init();
    if(d.bankVersion!==BANK_VERSION&&!localStorage.getItem(KEY+'_pre_revision_20261014')){
      try{localStorage.setItem(KEY+'_pre_revision_20261014',raw);}catch(x){storageOK=false;}
    }
    return migrate(d);
  }catch(e){storageOK=false;return mem||(mem=init());}
}
function save(){mem=S;try{localStorage.setItem(KEY,JSON.stringify(S));storageOK=true;}catch(e){storageOK=false;}}
let S=load();save();
''' +t[end:]
replace('const byId=id=>BANK[id];','const byId=id=>QUESTION_MAP.get(+id);')
replace("function inScope(){return BANK.filter(q=>S.settings.offsyl||q.c!=='K');}","function inScope(){return BANK.slice();}\nfunction practicePool(pool){return S.settings.challenge?pool.filter(q=>q.level==='challenge'):pool;}\nfunction filterControls(){return `<div class=\"card\" style=\"margin-bottom:14px\"><label><input type=\"checkbox\" ${S.settings.challenge?'checked':''} onchange=\"toggleChallenge(this.checked)\"> Applied questions and pitfalls only</label><div class=\"small muted\">Foundations build recall; applied questions test interpretation. This practice filter does not affect mock exams.</div></div>`;}\nfunction toggleChallenge(value){S.settings.challenge=!!value;save();({drill:drillHome,flash:flashHome,weak:weakHome}[view]||drillHome)();}")
replace("const NAV=[['home','Dashboard'],['exam','Exam Sim'],['drill','Topic Drill'],['weak','Weakness'],['flash','Flashcards'],['settings','Settings']];","const NAV=[['home','Dashboard'],['exam','Exam Sim'],['drill','Topic Drill'],['weak','Weakness'],['flash','Flashcards'],['bank','Question Bank'],['settings','Settings']];")
replace('flash:flashHome,settings:settingsView','flash:flashHome,bank:bankView,settings:settingsView')
replace("${mastered()} mastered","${mastered()} on a review streak")
replace("<div class=\"small muted\">readiness</div>","<div class=\"small muted\">practice index</div>")
replace("label='Exam ready'","label='Strong practice'")
replace('mirrors the real CPSA paper. Questions are balanced across syllabus areas; no feedback until you submit.','uses the published CPSA timing and pass threshold. This independent practice bank is not an official exam or a prediction of its topic weighting. No feedback until submission.')
replace('Questions are balanced across syllabus areas','Questions cover syllabus groups') if 'Questions are balanced across syllabus areas' in t else None
replace("h+=`<div class=\"row\" style=\"margin:20px 0\">", "h+=`<div class=\"banner\">Revised ${BANK_VERSION}: ${BANK_INFO.revised} rewritten + ${BANK_INFO.added} new scenarios. Repeated and unreliable items were retired. Progress on changed items is archived; unchanged IDs retain progress. <a href=\"#\" onclick=\"go('bank');return false\">Explore the bank</a></div><p class=\"small muted\">Practice scores describe this bank, not your probability of passing. Broad group coverage does not imply every syllabus skill is covered. Flashcard self-ratings are tracked separately.</p>`;\n  if(!storageOK)h+=`<div class=\"banner\">Browser storage is unavailable. Export your progress before closing.</div>`;\n  h+=`<div class=\"row\" style=\"margin:20px 0\">")

# Topic-balanced sampling is a deliberate practice design, not an asserted exam blueprint.
start=t.index('function buildExam(){');end=t.index('function startExam()',start)
t=t[:start]+r'''function buildExam(){
  const pool=inScope(),byc={};pool.forEach(q=>(byc[q.c]=byc[q.c]||[]).push(q));
  const N=Math.min(EXAM_N,pool.length),cats=shuffle(Object.keys(byc));
  const groups=cats.map(c=>shuffle(byc[c])),picks=[];
  while(picks.length<N&&groups.some(g=>g.length))for(const group of groups){if(picks.length<N&&group.length)picks.push(group.pop());}
  return shuffle(picks).map(q=>({id:q.id,opts:shuffle([q.a,...q.d]),ans:null,flag:false}));
}
''' +t[end:]
replace('pass=pct>=60','pass=correct/total>=PASS')
replace('if(it.ans!=null)record(it.id,ok);','record(it.id,ok);')
replace('function submitExam(auto){stopTimer();let correct=0;','function submitExam(auto){if(!sess||!sess.live)return;stopTimer();let correct=0;')
replace("h+=`<p class=\"small muted\" style=\"margin-top:14px\">Tip:","h+=`<p class=\"small muted\">Mock sampling deliberately spreads questions across A–J so small groups are not drowned out by the network bank. CREST does not specify these practice weights. Unanswered items count as incorrect.</p>`;\n  h+=`<p class=\"small muted\" style=\"margin-top:14px\">Tip:")

# A single feedback renderer serves drill, flashcard, exam review, and bank browsing.
helper=r'''
function explanation(q){
  let h=`<div class="expl"><div class="et">Why this answer</div>${esc(q.e)}</div>`;
  if(q.p)h+=`<div class="expl pitfall"><div class="et">Common pitfall</div>${esc(q.p)}</div>`;
  if(q.refs&&q.refs.length)h+=`<div class="small muted" style="margin-top:10px">${q.s?`Skill ${esc(q.s)} · `:''}Further reading: ${q.refs.filter(k=>REFERENCES[k]).map(k=>`<a href="${REFERENCES[k][1]}" target="_blank" rel="noopener noreferrer">${esc(REFERENCES[k][0])}</a>`).join(' · ')}</div>`;
  return h;
}
let bankQuery='',bankCat='ALL',bankLevel='ALL',bankPage=0;
function bankView(){
  let h=`<h1>Question bank</h1><p class="sub">Search ${BANK.length} questions. Think through your answer, then expand to compare the explanation and pitfall. This browser does not record a score.</p>`;
  h+=`<div class="card row"><label>Search <input id="bankSearch" type="search" placeholder="Topic, command, or misconception" oninput="bankQuery=this.value;bankPage=0;renderBankRows()"></label><label>Group <select onchange="bankCat=this.value;bankPage=0;renderBankRows()"><option value="ALL">All A–J</option>${CATS.map(c=>`<option value="${c}" ${bankCat===c?'selected':''}>${c} · ${esc(catName(c))}</option>`).join('')}</select></label><label>Practice <select onchange="bankLevel=this.value;bankPage=0;renderBankRows()"><option value="ALL">All</option><option value="foundation" ${bankLevel==='foundation'?'selected':''}>Foundations</option><option value="challenge" ${bankLevel==='challenge'?'selected':''}>Applied &amp; pitfalls</option></select></label></div><div id="bankRows" style="margin-top:16px"></div>`;
  $('#app').innerHTML=h;$('#bankSearch').value=bankQuery;renderBankRows();
}
function renderBankRows(){
  const query=bankQuery.toLowerCase().trim();
  const matches=BANK.filter(q=>(bankCat==='ALL'||q.c===bankCat)&&(bankLevel==='ALL'||q.level===bankLevel)&&(!query||[q.q,q.a,q.e,q.p,q.s,catName(q.c)].join(' ').toLowerCase().includes(query)));
  const size=20,pages=Math.max(1,Math.ceil(matches.length/size));bankPage=Math.min(bankPage,pages-1);
  let h=`<p class="small muted" aria-live="polite">${matches.length} matches · page ${bankPage+1}/${pages}</p>`;
  h+=matches.slice(bankPage*size,(bankPage+1)*size).map(q=>`<details class="qcard" style="margin-bottom:12px"><summary><span class="chip">${q.c} · #${q.id}</span> ${esc(q.q)}</summary><div class="opts" style="margin-top:14px">${shuffle([q.a,...q.d]).map(o=>`<div class="opt lock"><span>${esc(o)}</span></div>`).join('')}</div><div class="expl"><div class="et">Answer</div>${esc(q.a)}</div>${explanation(q)}</details>`).join('');
  if(!matches.length)h+='<div class="banner">No matching questions. Try a broader term or another group.</div>';
  h+=`<div class="row"><button class="btn gh" ${bankPage===0?'disabled':''} onclick="bankPage--;renderBankRows();">Previous</button><button class="btn gh" ${bankPage>=pages-1?'disabled':''} onclick="bankPage++;renderBankRows();">Next</button></div>`;
  $('#bankRows').innerHTML=h;
}
'''
replace('function reviewExam(){',helper+'\nfunction reviewExam(){')
replace('if(q.e)h+=`<div class="expl"><div class="et">Explanation</div>${esc(q.e)}</div>`;','h+=explanation(q);')
replace('if(q.e)h+=`<div class="expl" style="margin-top:14px;text-align:left"><div class="et">Why</div>${esc(q.e)}</div>`;','h+=explanation(q);')
replace('${q.e?`<div class="expl"><div class="et">Why</div>${esc(q.e)}</div>`:\'\'}','${explanation(q)}')

# Applied filtering only changes practice. Empty pools are handled explicitly.
replace("const pool=c==='ALL'?inScope():BANK.filter(q=>q.c===c);","const pool=practicePool(c==='ALL'?inScope():BANK.filter(q=>q.c===c));")
replace('const cs=catStats();const pool=inScope();','const cs=catStats();const pool=practicePool(inScope());')
replace('function makeSession(mode,pool,len,title){','function makeSession(mode,pool,len,title){\n  if(!pool.length){toast("No questions match this practice filter");return;}')
replace('h+=`<div class="row" style="margin-bottom:16px">Session length:', 'h+=filterControls();\n  h+=`<div class="row" style="margin-bottom:16px">Session length:')
replace('h+=`<div class="row" style="margin-bottom:16px">Length:', 'h+=filterControls();\n  h+=`<div class="row" style="margin-bottom:16px">Length:')
replace("if(o.n<10)h+=", "h+=filterControls();\n  if(o.n<10)h+=")
replace("n===20?'on':''", "n===LEN?'on':''")
replace('Tap the card to reveal the answer, then rate yourself — your rating feeds the adaptive engine.','Recall the answer before revealing it. Self-ratings are tracked separately from scored questions and do not raise your scored accuracy.')
replace('function flashRate(ok){record(sess.items[sess.idx].id,ok);if(ok)sess.right++;nextOrEnd();}',r'''function flashRate(ok){
  const it=sess.items[sess.idx];if(it.done)return;it.done=true;it.ans=ok?byId(it.id).a:null;
  const s=S.flashStats[it.id]||{n:0,c:0,last:0};s.n++;if(ok)s.c++;s.last=Date.now();S.flashStats[it.id]=s;save();
  if(ok)sess.right++;nextOrEnd();
}''')
replace('function weight(q){const s=S.stats[q.id];','function weight(q){const s=S.stats[q.id];') # keep scored adaptation stable
replace('else sessionDone();','else sessionDone();')
replace('function sessionDone(){sess.live=false;','function sessionDone(){sess.live=false;')
replace('if(wrong.length){h+=`<h2>Review the ones you missed</h2>`;', 'if(wrong.length){h+=`<div class="row" style="margin-top:16px"><button class="btn" onclick="retryMistakes()">Retry ${wrong.length} missed items</button></div><h2>Review the ones you missed</h2>`;')
replace('function repeatSession(){',"function retryMistakes(){const mode=sess.mode,pool=sess.items.filter(i=>i.done&&i.ans!==byId(i.id).a).map(i=>byId(i.id));makeSession(mode,pool,pool.length,'Missed items');}\nfunction repeatSession(){")
replace("document.addEventListener('keydown',e=>{", "document.addEventListener('keydown',e=>{\n  if(e.target&&e.target.matches&&e.target.matches(\"input,textarea,select,button,summary,a\"))return;")
replace("Leave current session? Progress on answered questions is saved.","Leave this session? Drill answers are saved; an unsubmitted exam will not be scored.")

# Settings explain provenance and preservation. Import validation rejects corrupt counters.
start=t.index('  h+=`<div class="card"><div class="row" style="justify-content:space-between"><div><b>Include off-syllabus questions')
end=t.index('  h+=`<div class="card" style="margin-top:14px"><b>Progress</b>',start)
t=t[:start]+r'''  h+=`<div class="card"><b>Bank revision · ${BANK_VERSION}</b><p>${BANK.length} active questions: ${BANK_INFO.revised} rewritten and ${BANK_INFO.added} new original scenarios. ${BANK_INFO.retired} former items were retired for repetition, weak construction, unsupported claims, or relevance.</p><p class="small muted">Independent study material, not CREST exam questions. Older protocols and algorithms are included where the syllabus requires historical understanding; their presence is not a recommendation to deploy them.</p><p class="small muted">References are further reading. Retained foundations were editorially screened; this is not a claim that every legacy item has been independently verified against a primary source.</p><a href="https://www.crest-approved.org/skills-certifications-careers/crest-practitioner-security-analyst/" target="_blank" rel="noopener noreferrer">CREST syllabus and published exam format</a></div>`;
  if(!storageOK)h+=`<div class="banner">Browser storage unavailable. Export progress to preserve this session.</div>`;
''' +t[end:]
replace('${S.exams.length} exams. Stored only in this browser.', '${S.exams.length} exams · ${Object.keys(S.archivedStats).length} archived old question records · ${Object.values(S.flashStats).reduce((n,s)=>n+s.n,0)} flashcard self-ratings. Stored only in this browser. Old mock results remain historical; rewritten items start fresh.')
replace("function toggleOff(){S.settings.offsyl=!S.settings.offsyl;save();settingsView();}\n",'')
start=t.index('function importP(e){');end=t.index('function resetP()',start)
t=t[:start]+r'''function importP(e){const f=e.target.files[0];if(!f)return;
  if(f.size>5*1024*1024){toast('Backup too large');return;}
  const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!validProgress(d)){toast('Invalid progress backup');return;}
    if(!confirm('Replace current progress with this backup? A copy of current progress will be retained in browser storage.'))return;
    try{localStorage.setItem(KEY+'_before_import',JSON.stringify(S));}catch(x){exportP();}
    S=migrate(d);save();toast('Progress imported');settingsView();
  }catch(x){toast('Invalid progress backup');}};r.readAsText(f);
}
''' +t[end:]
replace("a.href=URL.createObjectURL(b);a.download=", "const url=URL.createObjectURL(b);a.href=url;a.download=")
replace("+'.json';a.click();}","+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}")
replace('</style>',r'''
.qtext,.fq,summary{white-space:pre-wrap;overflow-wrap:anywhere}
summary{cursor:pointer;font-weight:650;line-height:1.6}
details[open] summary{margin-bottom:10px}
input[type=search],select{max-width:100%;background:var(--bg2);color:var(--tx);border:1px solid var(--line);border-radius:8px;padding:9px;font:inherit}
input[type=search]{width:300px}label{font-size:14px}
.pitfall{border-left:3px solid var(--warn)}
.opt:focus-visible,.btn:focus-visible,summary:focus-visible,nav button:focus-visible{outline:3px solid var(--ac);outline-offset:3px}
button:disabled{opacity:.45;cursor:default}
@media(max-width:600px){.hb{gap:8px}nav{margin-left:0}.qtext{font-size:18px}input[type=search]{width:100%}.card.row>label{width:100%}}
</style>''')
# Refuse to discard later manual edits when rebuilding from these sources.
state=P/'build-state.json'
allowed={hashlib.sha256(original.read_bytes()).hexdigest()}
if state.exists():allowed.add(json.loads(state.read_text(encoding='utf-8'))['output_sha256'])
if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() not in allowed:
    raise RuntimeError('Trainer changed since the last build; reconcile manual edits before rebuilding')
target.write_text(t.rstrip()+'\n',encoding='utf-8',newline='\n')
state.write_text(json.dumps({'output_sha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n',encoding='utf-8',newline='\n')
print('Built',target,'with',len(bank),'questions;',hashlib.sha256(target.read_bytes()).hexdigest())
