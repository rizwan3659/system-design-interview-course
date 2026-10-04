/* Course-wide pages: Labs, Case studies, Interview practice, Revision and Progress, plus the course walker and stats. */
(function(){
'use strict';
const {$,$$,esc,node,store}=SDC;
const TYPE={scalelab:'Scaling lab',cachesim:'Cache lab',queuesim:'Queue lab',shardsim:'Sharding lab',replsim:'Replication lab',ratelimit:'Rate-limiter lab',consistency:'Consistency lab',
  capacity:'Capacity estimation',latency:'Latency intuition',evolve:'Progressive architecture',lldmap:'HLD → LLD',lldlab:'LLD coding lab',lab:'Simulator',arch:'Architecture lab',
  builder:'Design it yourself',checkpoint:'Interview checkpoint',timer:'Timed mock',predict:'Debugging scenario'};
const strip=h=>String(h||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const clip=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;

/* visit every block (including blocks nested in steppers) with the same keys the engine uses */
SDC.walk=cb=>[...COURSE.sessions,...COURSE.cases].forEach(ses=>ses.modules.forEach((m,mi)=>{
  const w=(bl,kp)=>bl.forEach((b,i)=>{const key=kp+'.'+i;cb(b,key,ses,mi);if(b.t==='stepper')b.steps.forEach((s,si)=>s.blocks&&w(s.blocks,key+'.'+si))});w(m.blocks,ses.id+'.m'+mi)}));
SDC.items=kind=>{const out=[];SDC.walk((b,key,ses,mi)=>{if(SDC.kindOf(b)===kind)out.push({b,key,ses,mi})});return out};
const link=x=>`#${x.ses.id}-m${x.mi+1}~${x.key.replace(/\./g,'_')}`;
const titleOf=x=>strip(x.b.title)||TYPE[x.b.t]||x.b.t;
const sesName=s=>s.kind==='case'?'Case study · '+s.title:`Session ${s.n} · ${s.title}`;

SDC.stats=()=>{const act=SDC.act.all();const labs=SDC.items('lab'),iv=SDC.items('interview');const done=new Set(store.get('done',[]));
  const d=l=>l.filter(x=>act[x.key]).length;let tDone=0,tTot=0;[...COURSE.sessions,...COURSE.cases].forEach(s=>{const t=SDC.taskState(s);tDone+=t.done;tTot+=t.total});
  const S=COURSE.sessions;const sess=S.filter(s=>done.has(s.id)).length;
  const r={sessions:{done:sess,total:S.length},labs:{done:d(labs),total:labs.length},interview:{done:d(iv),total:iv.length},tasks:{done:tDone,total:tTot},due:SDC.srs.due().length,
    caseSessions:S.filter(s=>s.part==='B'||/case study/i.test(s.title)).length};
  const f=x=>x.total?x.done/x.total:0;r.overall=0.35*f(r.sessions)+0.3*f(r.labs)+0.15*f(r.interview)+0.2*f(r.tasks);return r};

SDC.pages={};
const head=(eye,title,lead)=>`<div class="mod-head"><span class="eyebrow">${eye}</span><h2>${title}</h2>${lead?`<p class="lead">${lead}</p>`:''}</div>`;
const status=key=>{const a=SDC.act.get(key);return !a?['todo','○ To do']:a.explored?['done','✓ Explored']:['done','✓ Done']};

/* ---------- Labs ---------- */
SDC.pages.labs=app=>{let lvl=store.get('f:lvl','all'),st=store.get('f:st','all');const L=SDC.items('lab');
  app.innerHTML=`<div class="mod">${head('Learning lab','Labs','Every simulator and experiment in the course. Labs take 5–15 minutes. Filter by challenge level or status.')}
    <div class="filters" role="group" aria-label="Filter labs"><span class="small muted">Level</span>${[['all','All'],['f','🟢 Foundation'],['i','🟡 Intermediate'],['x','🔴 Interview']].map(x=>`<button class="btn small" data-lvl="${x[0]}">${x[1]}</button>`).join('')}<span class="small muted">Status</span>${[['all','All'],['todo','To do'],['done','Done']].map(x=>`<button class="btn small" data-st="${x[0]}">${x[1]}</button>`).join('')}</div><div data-list></div></div>`;
  const draw=()=>{$$('[data-lvl]',app).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lvl===lvl)));$$('[data-st]',app).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.st===st)));
    const groups=new Map();let n=0;L.forEach(x=>{const l=SDC.levelOf(x.b)||'f';if(lvl!=='all'&&l!==lvl)return;const s=status(x.key)[0];if(st!=='all'&&s!==st)return;n++;if(!groups.has(x.ses))groups.set(x.ses,[]);groups.get(x.ses).push(x)});
    $('[data-list]',app).innerHTML=n?[...groups].map(([ses,xs])=>`<section class="part"><div class="part-head"><h3>${esc(sesName(ses))}</h3></div><div class="sgrid">${xs.map(x=>{const s=status(x.key);return `<a class="scard ${s[0]==='done'?'done':''}" href="${link(x)}"><span class="num"><span>${TYPE[x.b.t]||'Lab'}</span><b>${s[1]}</b></span><h4>${esc(titleOf(x))}</h4><span>${SDC.levelHTML(SDC.levelOf(x.b)||'f')}</span></a>`}).join('')}</div></section>`).join(''):'<p class="muted">No labs match these filters.</p>';
    $('.mod-head .lead',app).textContent=`${L.filter(x=>SDC.act.get(x.key)).length} of ${L.length} labs completed. Labs take 5–15 minutes. Filter by challenge level or status.`};
  app.firstElementChild.addEventListener('click',e=>{const a=e.target.closest('[data-lvl]'),b=e.target.closest('[data-st]');if(a){lvl=a.dataset.lvl;store.set('f:lvl',lvl);draw()}if(b){st=b.dataset.st;store.set('f:st',st);draw()}});draw()};

/* ---------- Case studies ---------- */
SDC.pages.cases=app=>{const done=new Set(store.get('done',[]));const S=COURSE.sessions.filter(s=>s.part==='B'||/case study/i.test(s.title));
  const card=(s,sub)=>`<a class="scard ${done.has(s.id)?'done':''}" href="#${s.id}"><span class="num"><span>${sub}</span>${done.has(s.id)?'<b>Done ✓</b>':''}</span><h4>${esc(s.title)}</h4><p>${s.goal}</p></a>`;
  app.innerHTML=`<div class="mod">${head('Design practice','Case studies','Each case runs the same loop: requirements → estimation → API → data model → basic architecture → interactive scaling → bottlenecks → failures → trade-offs → follow-ups → your own design.')}
    <section class="part"><div class="part-head"><h3>Interactive case studies</h3><span class="mono">${COURSE.cases.length} systems · self-paced</span></div><div class="sgrid">${COURSE.cases.map(c=>card(c,`${c.modules.length} steps · ${c.level?SDC.LEVELS[c.level][1]:'Interview'}`)).join('')}</div></section>
    <section class="part"><div class="part-head"><h3>Case-study sessions in the course</h3><span class="mono">guided, 2 hours each</span></div><div class="sgrid">${S.map(s=>card(s,`Session ${s.n} · ${s.track}`)).join('')}</div></section></div>`};

/* ---------- Interview practice ---------- */
SDC.pages.interview=app=>{const all=[];SDC.walk((b,key,ses,mi)=>{if(['checkpoint','builder','timer'].includes(b.t)||(b.t==='predict'&&b.kind==='debug'))all.push({b,key,ses,mi})});
  const sec=(title,xs,txt)=>xs.length?`<section class="part"><div class="part-head"><h3>${title}</h3><span class="mono">${xs.filter(x=>SDC.act.get(x.key)).length} / ${xs.length} done</span></div><div class="sgrid">${xs.map(x=>{const s=status(x.key);return `<a class="scard ${s[0]==='done'?'done':''}" href="${link(x)}"><span class="num"><span>${esc(clip(sesName(x.ses),40))}</span><b>${s[1]}</b></span><h4>${esc(clip(txt(x),110))}</h4></a>`}).join('')}</div></section>`:'';
  const cps=all.filter(x=>x.b.t==='checkpoint');
  app.innerHTML=`<div class="mod">${head('Interview practice','Interview practice','Answer in your own words before you see any reference. Then tick what your answer covered.')}
    <div class="panel"><h3>Random interviewer question</h3><p class="intro">Draw a prompt, answer out loud for two minutes, then open the checkpoint to compare.</p><div class="drill" data-q>Press "Ask me".</div><div class="row"><button class="btn primary" data-ask>Ask me</button><a class="btn" data-go hidden>Open this checkpoint →</a></div></div>
    ${sec('Interview checkpoints',cps,x=>strip(x.b.prompt))}${sec('Design it yourself',all.filter(x=>x.b.t==='builder'),x=>titleOf(x))}${sec('Debugging scenarios',all.filter(x=>x.b.t==='predict'),x=>strip(x.b.title)||strip(x.b.q))}${sec('Timed mocks',all.filter(x=>x.b.t==='timer'),x=>strip(x.b.title)||'Timed mock interview')}</div>`;
  $('[data-ask]',app).addEventListener('click',()=>{if(!cps.length)return;const x=cps[Math.floor(Math.random()*cps.length)];$('[data-q]',app).textContent=strip(x.b.prompt);const g=$('[data-go]',app);g.href=link(x);g.hidden=false})};

/* ---------- Revision ---------- */
SDC.pages.revision=app=>{let ahead=false;
  const draw=()=>{const all=SDC.srs.all(),now=Date.now();const keys=Object.keys(all);const due=keys.filter(k=>SDC.M.isDue(all[k],now));const week=keys.filter(k=>!SDC.M.isDue(all[k],now)&&all[k].due<now+7*864e5);
    const show=ahead?due.concat(week):due;const byC={};show.forEach(k=>{const c=all[k].c||'interview';byC[c]=(byC[c]||0)+1});
    app.innerHTML=`<div class="mod">${head('Spaced repetition','Revision',`Cards come back after 1, 3, 7, 16 and 35 days when you recall them, and tomorrow when you do not. ${keys.length} cards in your deck.`)}
      <div class="out"><div><b>${due.length}</b><span>due today</span></div><div><b>${week.length}</b><span>due in the next 7 days</span></div><div><b>${keys.filter(k=>all[k].box>=3).length}</b><span>well learned (7+ day interval)</span></div></div>
      ${show.length?`<div class="panel"><h3>${ahead?'Due today and this week':'Due for revision today'}</h3><div class="row">${Object.keys(byC).map(c=>`<span class="tag">${esc(SDC.CONCEPTS[c]||c)} · ${byC[c]}</span>`).join('')}</div><div class="grid2" data-cards>${show.map(k=>SDC.recallCardHTML(k,all[k].q,all[k].a)).join('')}</div></div>`
        :`<div class="panel"><h3>Nothing due today</h3><p class="intro">${keys.length?'Well done. Come back tomorrow, or practise ahead.':'Cards join your deck when you answer active-recall questions or rate yourself in a session summary. Start with Session 4 (caching).'}</p>${week.length?'<div><button class="btn" data-ahead>Practise this week\'s cards now</button></div>':''}</div>`}</div>`;
    const c=$('[data-cards]',app);if(c)SDC.wireRecall(c,k=>all[k],()=>{const n=SDC.srs.due().length,b=$('#dueBadge');b.textContent=n;b.hidden=!n});
    const a=$('[data-ahead]',app);if(a)a.addEventListener('click',()=>{ahead=true;draw()})};
  draw()};

/* ---------- Progress dashboard ---------- */
SDC.pages.progress=app=>{const st=SDC.stats(),ma=SDC.M.mastery(SDC.act.all(),SDC.srs.all());const pct=Math.round(st.overall*100);const bar='█'.repeat(Math.round(pct/10))+'░'.repeat(10-Math.round(pct/10));
  const mk={Strong:['green','●●●'],Medium:['amber','●●○'],'Needs revision':['red','●○○']};
  const rows=COURSE.sessions.map(s=>{const t=SDC.taskState(s);const labs=SDC.items('lab').filter(x=>x.ses===s);const ld=labs.filter(x=>SDC.act.get(x.key)).length;const sum=Object.entries(SDC.srs.all()).find(([k,v])=>k.startsWith('sum:'+s.id+':'));
    return [`<a href="#${s.id}">${s.n}. ${esc(s.title)}</a>`,t.total?`${t.done} / ${t.total}`:'—',labs.length?`${ld} / ${labs.length}`:'—',sum?(sum[1].last?'✓ Can explain':'↻ Needs revision'):'—',new Set(store.get('done',[])).has(s.id)?'✓':'']});
  app.innerHTML=`<div class="mod">${head('Your progress','Progress','Based on what you completed and how you scored in this browser. Nothing leaves your device.')}
    <div class="panel"><h3>Course progress</h3><p class="mono bigbar" aria-hidden="true">${bar} ${pct}%</p><div class="meter" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      <div class="out"><div><b>${st.sessions.done} / ${st.sessions.total}</b><span>sessions</span></div><div><b>${st.labs.done} / ${st.labs.total}</b><span>labs</span></div><div><b>${st.interview.done} / ${st.interview.total}</b><span>interview problems</span></div><div><b>${st.tasks.done} / ${st.tasks.total}</b><span>session tasks</span></div><div><b>${st.due}</b><span><a href="#revision">revision due</a></span></div></div></div>
    <div class="panel"><h3>Concept mastery</h3><p class="intro">From quiz and prediction accuracy (first attempt), lab results, interview self-checks and recall cards.</p><div class="mastery">${Object.keys(SDC.CONCEPTS).map(c=>{const m=ma[c];return `<div class="mrow"><span>${SDC.CONCEPTS[c]}</span><span class="bar-track" aria-hidden="true"><i style="width:${m?Math.round(m.score*100):0}%"></i></span>${m?`<span class="tag ${mk[m.label][0]}"><span aria-hidden="true">${mk[m.label][1]}</span> ${m.label}</span>`:'<span class="muted small">Not started</span>'}</div>`}).join('')}</div></div>
    <div class="panel"><h3>By session</h3>${SDC.tableHTML(['Session','Tasks','Labs','Self-assessment','Done'],rows)}</div>
    <div class="panel"><h3>Your data</h3><p class="intro">Move progress to another browser, or start over.</p><div class="row"><button class="btn" data-exp>Export progress (JSON)</button><label class="btn" style="flex-direction:row">Import progress<input type="file" accept="application/json" data-imp hidden></label><button class="btn danger" data-reset>Reset all progress</button></div><p class="small muted" data-msg aria-live="polite"></p></div></div>`;
  $('[data-exp]',app).addEventListener('click',()=>{const o={};store.keys().forEach(k=>o[k]=store.get(k));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:'application/json'}));a.download='system-design-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
  $('[data-imp]',app).addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{const o=JSON.parse(t);Object.keys(o).forEach(k=>store.set(k,o[k]));$('[data-msg]',app).textContent='Imported. Reloading…';setTimeout(()=>location.reload(),600)}).catch(()=>{$('[data-msg]',app).textContent='That file could not be read.'})});
  $('[data-reset]',app).addEventListener('click',()=>{if(!confirm('Delete all progress, answers, notes and revision cards saved in this browser?'))return;store.keys().forEach(k=>{if(k!=='big')store.del(k)});location.hash='#progress';location.reload()})};
})();
