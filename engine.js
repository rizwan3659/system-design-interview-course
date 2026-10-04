(function(){
'use strict';
const {$,$$,store,esc,node}=SDC;
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const fmtH=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h+':'+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')};
const hm=min=>Math.floor(min/60)+':'+String(min%60).padStart(2,'0');
const S=COURSE.sessions.slice().sort((a,b)=>a.n-b.n);
const PARTS=[
  {k:'A',name:'HLD foundations',desc:'The building blocks every high-level design is made from: APIs, storage, caching, sharding, consistency, async work and reliability.'},
  {k:'B',name:'HLD case studies',desc:'Full interview-style designs, from clarifying questions to failure drills.'},
  {k:'C',name:'Low-level design',desc:'Object-oriented design, SOLID, design patterns, UML and working Python code for classic LLD problems.'},
  {k:'D',name:'Capstone',desc:'Full mock interviews, one HLD and one LLD, scored with the rubric.'}];
const sid=n=>'s'+String(n).padStart(2,'0');

/* ---------- live timers (cleared on every route change) ---------- */
const every=SDC.every,killAll=SDC.killAll;

/* ---------- global delegated handlers ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-reveal]');
  if(b){const a=b.nextElementSibling;if(!a)return;if(!b.dataset.label)b.dataset.label=b.textContent;a.hidden=!a.hidden;b.textContent=a.hidden?b.dataset.label:b.dataset.label.replace(/^(Reveal|Show)/,'Hide');return}
  const c=e.target.closest('[data-copy]');
  if(c){const pre=c.closest('.codebox').querySelector('pre');const t=pre.textContent;const ok=()=>{c.textContent='Copied';setTimeout(()=>c.textContent='Copy',1400)};
    const sel=()=>{const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);c.textContent='Selected · Ctrl+C'};
    try{navigator.clipboard.writeText(t).then(ok,sel)}catch(err){sel()}}
});

/* ---------- helpers ---------- */
const tableHTML=(head,rows)=>`<div class="tbl"><table>${head?`<thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead>`:''}<tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const codeHTML=(c,l)=>`<div class="codebox"><div class="codebar"><span>${esc(l||'python')}</span><button class="btn small" data-copy>Copy</button></div><pre><code>${esc(String(c).replace(/^\n/,'').replace(/\s+$/,''))}</code></pre></div>`;

/* ---------- block renderers ---------- */
const R={};
R.text=(b,p)=>p.insertAdjacentHTML('beforeend',`<div class="prose">${b.html}</div>`);
R.table=(b,p)=>p.insertAdjacentHTML('beforeend',tableHTML(b.head,b.rows)+(b.note?`<p class="muted small">${b.note}</p>`:''));
R.grid=(b,p)=>p.insertAdjacentHTML('beforeend',`<div class="${b.cols===2?'grid2':'grid3'}">${b.items.map(i=>`<div class="optcard">${i.tag?`<span><span class="tag ${i.tc||''}">${i.tag}</span></span>`:''}<h4>${i.title}</h4><div class="small">${i.body}</div></div>`).join('')}</div>`);
R.code=(b,p)=>p.insertAdjacentHTML('beforeend',codeHTML(b.code,b.lang)+(b.note?`<p class="muted small">${b.note}</p>`:''));
R.task=(b,p)=>p.insertAdjacentHTML('beforeend',`<ul class="clean">${b.items.map(i=>`<li>${i}</li>`).join('')}</ul>`);

R.cards=(b,p)=>{let sel=0;const row=node('div','loop'),det=node('div','think');p.append(row,det);
  const draw=()=>{row.innerHTML=b.items.map((s,i)=>`<button aria-pressed="${i===sel}" data-i="${i}"><span class="loop-num">${s.tag||('Step '+(i+1))}</span><b>${s.title}</b>${s.sub?`<span>${s.sub}</span>`:''}</button>`).join('');det.innerHTML=b.items[sel].body};
  row.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;sel=+x.dataset.i;draw()});draw()};

function quiz(b,p,key,optsOf,okWord,ses){let ans=store.get(key,{});const top=node('div','row','<span class="score"></span><button class="btn small">Reset</button>'),g=node('div',b.cols===3?'grid3':'grid2');p.append(top,g);
  const draw=()=>{let r=0,d=0;g.innerHTML=b.items.map((x,i)=>{const a=ans[i],O=optsOf(x);let c='',fb='';if(a!==undefined){d++;const ok=a===x.a;if(ok)r++;c=ok?'right':'wrong';fb=`<p class="fb"><span class="tag ${ok?'green':'red'}">${ok?okWord:'Not quite'}</span> <b>${O[x.a]}.</b> ${x.why||''}</p>`}
    return `<div class="qcard ${c}"><div>${x.q}</div><div class="acts">${O.map((l,j)=>`<button class="btn small" data-i="${i}" data-j="${j}" aria-pressed="${a===j}">${l}</button>`).join('')}</div>${fb}</div>`}).join('');
    top.firstChild.textContent=`${r} / ${d} correct`+(d===b.items.length?' · all answered':` · ${b.items.length-d} left`)};
  g.addEventListener('click',e=>{const x=e.target.closest('[data-j]');if(!x)return;ans[x.dataset.i]=+x.dataset.j;store.set(key,ans);
    if(ses)SDC.act.record(key+'.'+x.dataset.i,{t:'quiz',s:ses.id,c:b.concept||ses.concept||'interview',score:ans[x.dataset.i]===b.items[x.dataset.i].a?1:0});draw()});
  top.lastChild.addEventListener('click',()=>{ans={};store.set(key,ans);draw()});draw()}
R.sort=(b,p,key,ses)=>quiz(b,p,key,()=>b.labels||['Ask it','Skip it'],'Correct',ses);
R.mcq=(b,p,key,ses)=>quiz(b,p,key,x=>x.opts,'Correct',ses);

R.reveal=(b,p)=>p.insertAdjacentHTML('beforeend',`<div class="${b.cols===2?'grid2':'grid3'}">${b.items.map(i=>`<div class="optcard"><div>${i.q}</div><button class="btn small" data-reveal>Reveal</button><div class="answer" hidden>${i.a}${i.code?codeHTML(i.code,i.lang):''}</div></div>`).join('')}</div>`);

R.flash=(b,p)=>{const g=node('div','grid3',b.items.map((c,i)=>`<button class="flash" aria-pressed="false"><span class="q">${c[0]}</span><span class="a" hidden>${c[1]}</span><span class="hint">Click to flip</span></button>`).join(''));p.appendChild(g);
  g.addEventListener('click',e=>{const x=e.target.closest('.flash');if(!x)return;const on=x.getAttribute('aria-pressed')!=='true';x.setAttribute('aria-pressed',String(on));x.querySelector('.a').hidden=!on;x.querySelector('.hint').textContent=on?'Click to hide':'Click to flip'})};

R.drill=(b,p)=>{const d=node('div','drill','Press "Draw".');const row=node('div','row',`<button class="btn primary">${b.button||'Draw a scenario'}</button><button class="btn" data-reveal>Show a model answer</button><div class="answer" hidden>Draw first.</div>`);p.append(d,row);let di=-1;
  row.firstChild.addEventListener('click',()=>{let x;do{x=Math.floor(Math.random()*b.items.length)}while(x===di&&b.items.length>1);di=x;d.textContent=(b.prefix||'')+b.items[x][0];row.lastChild.innerHTML=b.items[x][1]})};

R.rubric=(b,p,key)=>{const rv=store.get(key,{});const box=node('div'),tot=node('div','row');p.append(box,tot);const max=b.rows.length*3;
  const draw=()=>{box.innerHTML=b.rows.map((r,i)=>`<div class="rub-row"><div><b>${r[0]}</b><small>3 = ${r[1]}</small></div><div class="row">${[1,2,3].map(s=>`<button class="btn small" data-r="${i}" data-s="${s}" aria-pressed="${rv[i]===s}">${s}</button>`).join('')}</div></div>`).join('');
    const vals=Object.values(rv),t=vals.reduce((a,c)=>a+c,0);
    tot.innerHTML=`<span class="total">${t} / ${max}</span><span class="muted">${vals.length<b.rows.length?`Score each row (${vals.length} of ${b.rows.length}).`:t>=max*.85?'Ready. Keep doing one mock a day.':t>=max*.62?'Close. Repeat the practice problem with a new prompt.':'Redo the guided problem slowly, then try again.'}</span>`};
  box.addEventListener('click',e=>{const x=e.target.closest('[data-r]');if(!x)return;rv[x.dataset.r]=+x.dataset.s;store.set(key,rv);draw()});draw()};

R.checklist=(b,p,key)=>{const cv=store.get(key,{});const id=key.replace(/[^a-z0-9]/gi,'');p.insertAdjacentHTML('beforeend',`<div class="col" style="gap:8px">${b.items.map((c,i)=>`<label class="check" for="${id}c${i}"><input type="checkbox" id="${id}c${i}" data-i="${i}" ${cv[i]?'checked':''}><span>${c}</span></label>`).join('')}</div>`);
  p.addEventListener('change',e=>{if(e.target.dataset.i==null)return;cv[e.target.dataset.i]=e.target.checked;store.set(key,cv)})};

R.notes=(b,p,key)=>{const id=key.replace(/[^a-z0-9]/gi,'')+'n';p.insertAdjacentHTML('beforeend',`<label for="${id}">${b.label||'Your notes'}<textarea id="${id}" placeholder="${esc(b.placeholder||'')}" style="min-height:${b.rows?b.rows*22:110}px"></textarea></label><span class="muted small">Saved in this browser only.</span>`);
  const t=$('#'+id,p);t.value=store.get(key,'');t.addEventListener('input',()=>store.set(key,t.value))};

R.timer=(b,p)=>{const T=b.total||1800;let s=0,run=false,id=null;const unl=b.cards.map(()=>false);
  const w=node('div','grid2',`<div class="panel nested"><div class="row spread"><span class="bigtimer"></span><div class="row"><button class="btn primary" data-a="go">Start</button><button class="btn" data-a="skip">+1 min</button><button class="btn" data-a="reset">Reset</button></div></div><div class="phases"></div></div><div class="col">${b.cards.map((c,i)=>`<div class="card-change" data-c="${i}"><div class="row spread"><span class="tag red">${c.label}</span><button class="btn small" data-u="${i}">Unlock now</button></div><p class="locked muted">Locked. Keep designing.</p><div class="body col" style="gap:6px" hidden><h4>${c.title}</h4><p class="muted">${c.body}</p></div></div>`).join('')}</div>`);
  p.appendChild(w);const go=$('[data-a=go]',w);
  const draw=()=>{$('.bigtimer',w).textContent=fmt(T-s);$('.phases',w).innerHTML=b.phases.map(x=>`<div class="phase ${s>=x[0]&&s<x[1]?'now':s>=x[1]?'past':''}"><span class="mono">${fmt(x[0])}–${fmt(x[1])}</span><span>${x[2]}</span></div>`).join('');
    b.cards.forEach((c,i)=>{if(s>=c.at)unl[i]=true;const el=$(`[data-c="${i}"]`,w);el.classList.toggle('open',unl[i]);$('.locked',el).hidden=unl[i];$('.body',el).hidden=!unl[i];$('[data-u]',el).hidden=unl[i]})};
  w.addEventListener('click',e=>{const a=e.target.closest('[data-a]'),u=e.target.closest('[data-u]');
    if(u){unl[+u.dataset.u]=true;draw();return}if(!a)return;
    if(a.dataset.a==='go'){if(s>=T)return;run=!run;go.textContent=run?'Pause':'Resume';if(run)id=every(()=>{s++;if(s>=T){s=T;run=false;clearInterval(id);go.textContent='Done'}draw()},1000);else clearInterval(id)}
    if(a.dataset.a==='skip'){s=Math.min(T-1,s+60);draw()}
    if(a.dataset.a==='reset'){run=false;clearInterval(id);s=0;unl.fill(false);go.textContent='Start';draw()}});draw()};

R.stepper=(b,p,key,ses)=>{let gi=0;const done=new Set();
  const nav=node('nav','stepper-nav'),bar=node('div','thinkbar','<span>Think time</span><span class="mono tt"></span><button class="btn small primary">Start</button><button class="btn small">Reset</button><span class="muted small msg"></span>'),body=node('div'),foot=node('div','row spread','<button class="btn">← Previous step</button><button class="btn primary">Next step →</button>');
  nav.setAttribute('aria-label','Steps');p.append(nav,bar,body,foot);
  const panes=b.steps.map((s,i)=>{const d=node('div','gstep',`<h3>Step ${i+1} · ${s.title}</h3>${s.think?`<div class="think">${s.think}</div>`:''}${s.body?`<div class="prose">${s.body}</div>`:''}${(s.answer||s.code)?`<button class="btn" data-reveal>Reveal model answer</button><div class="answer" hidden>${s.answer||''}${s.code?codeHTML(s.code,s.lang):''}</div>`:''}`);
    if(s.blocks){const c=node('div','col');d.appendChild(c);renderBlocks(s.blocks,c,key+'.'+i,ses,true)}body.appendChild(d);return d});
  let left=0,run=false,id=null;const tt=$('.tt',bar),go=bar.children[2],rs=bar.children[3],msg=$('.msg',bar);
  const setT=()=>{clearInterval(id);run=false;left=b.steps[gi].secs||120;go.textContent='Start';bar.classList.remove('over');msg.textContent='Answer before you reveal.';tt.textContent=fmt(left)};
  const draw=()=>{panes.forEach((d,i)=>d.hidden=i!==gi);nav.innerHTML=b.steps.map((s,i)=>`<button data-i="${i}" ${i===gi?'aria-current="step"':''} class="${done.has(i)&&i!==gi?'done':''}">${i+1}. ${s.short||s.title}</button>`).join('');foot.children[0].disabled=gi===0;foot.children[1].textContent=gi===b.steps.length-1?'Finish':'Next step →';setT()};
  nav.addEventListener('click',e=>{const x=e.target.closest('button');if(x){gi=+x.dataset.i;draw()}});
  foot.children[0].addEventListener('click',()=>{if(gi>0){gi--;draw()}});
  foot.children[1].addEventListener('click',()=>{done.add(gi);if(gi<b.steps.length-1){gi++;draw()}else{draw();msg.textContent='All steps done. Write your summary.'}});
  go.addEventListener('click',()=>{run=!run;go.textContent=run?'Pause':'Resume';if(run){id=every(()=>{left--;tt.textContent=(left<0?'+':'')+fmt(Math.abs(left));if(left<=0){bar.classList.add('over');msg.textContent='Time. Reveal and compare.'}},1000)}else clearInterval(id)});
  rs.addEventListener('click',setT);draw()};

/* architecture lab: nodes/edges with optional parts (data-o) that toggle, and failure scenarios */
R.arch=(b,p,key)=>{const on={};(b.toggles||[]).forEach(t=>on[t.id]=!!t.on);const mk='ah'+key.replace(/[^a-z0-9]/gi,'');
  const nSVG=n=>{const h=n.h||56,ly=n.sub?n.y+h/2-3:n.y+h/2+4;return `<g class="node" data-n="${n.id}" data-o="${n.opt||''}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${h}" rx="8"/><text class="nl" x="${n.x+n.w/2}" y="${ly}">${n.label}</text>${n.sub!=null?`<text class="sub" x="${n.x+n.w/2}" y="${ly+16}">${n.sub}</text>`:''}</g>`};
  const eSVG=e=>`<path class="edge${e.dash?' dash':''}" data-o="${e.opt||''}" d="${e.d}" ${e.arrow===false?'':`marker-end="url(#${mk})"`}/>`+(e.label?`<text class="elabel" data-o="${e.opt||''}" x="${e.lx}" y="${e.ly}" ${e.anchor?`text-anchor="${e.anchor}"`:''}>${e.label}</text>`:'');
  const svg=`<svg viewBox="0 0 ${b.w} ${b.h}" style="min-width:${Math.round(b.w*.82)}px" role="img" aria-label="${esc(b.aria||b.title||'Architecture')}"><defs><marker id="${mk}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0 0L10 5L0 10z"/></marker></defs>${b.edges.map(eSVG).join('')}${b.nodes.map(nSVG).join('')}</svg>`;
  const hasSide=(b.toggles&&b.toggles.length)||(b.fails&&b.fails.length);
  const lab=node('div',hasSide?'lab':'',`<div class="svgbox">${svg}</div>${hasSide?`<div class="col" style="gap:14px">${b.toggles&&b.toggles.length?`<div><h4 style="margin-bottom:6px">${b.toggleTitle||'Add a part'}</h4><div class="toggles">${b.toggles.map(t=>`<button class="btn" data-t="${t.id}" aria-pressed="false">${t.label}</button>`).join('')}</div></div>`:''}${b.fails&&b.fails.length?`<div><h4 style="margin-bottom:6px">${b.failTitle||'Break something'}</h4><div class="fails">${b.fails.map((f,i)=>`<button class="btn danger" data-f="${i}">${f.label}</button>`).join('')}</div></div>`:''}</div>`:''}`);
  const out=node('div','outcome',b.start||'Add parts, then break something and read what happens.');out.setAttribute('aria-live','polite');p.append(lab);if(hasSide)p.append(out);
  const draw=()=>{$$('[data-o]',lab).forEach(x=>{const o=x.dataset.o;if(!o){x.classList.remove('off');return}const neg=o[0]==='!',k=neg?o.slice(1):o;x.classList.toggle('off',neg?!!on[k]:!on[k])});
    b.nodes.forEach(n=>{if(!n.swap)return;const g=$(`[data-n="${n.id}"]`,lab),use=on[n.swap.when];$('.nl',g).textContent=use?n.swap.label:n.label;const sb=$('.sub',g);if(sb)sb.textContent=use?(n.swap.sub||''):(n.sub||'')});
    $$('[data-t]',lab).forEach(x=>x.setAttribute('aria-pressed',String(!!on[x.dataset.t])));$$('.node',lab).forEach(x=>x.classList.remove('hit','okhit'))};
  lab.addEventListener('click',e=>{const t=e.target.closest('[data-t]'),f=e.target.closest('[data-f]');
    if(t){on[t.dataset.t]=!on[t.dataset.t];draw();out.className='outcome';const names=(b.toggles||[]).filter(x=>on[x.id]).map(x=>x.label);out.textContent='Parts added: '+(names.join(', ')||'none')+'. '+(b.fails&&b.fails.length?'Now break something.':'')}
    if(f){const r=b.fails[+f.dataset.f].run(on);draw();(r.hits||[]).forEach(id=>{const g=$(`[data-n="${id}"]`,lab);if(g)g.classList.add('hit')});(r.oks||[]).forEach(id=>{const g=$(`[data-n="${id}"]`,lab);if(g)g.classList.add('okhit')});
      out.className='outcome '+r.lvl;out.innerHTML=`<span class="tag ${r.lvl==='bad'?'red':r.lvl==='warn'?'amber':'green'}">${r.lvl==='bad'?'Outage':r.lvl==='warn'?'Degraded':'Handled'}</span> ${r.txt}`}});
  draw()};

/* UML class diagram: auto-sized classes, relationship markers, click a class to read its responsibility */
R.uml=(b,p,key)=>{const id=key.replace(/[^a-z0-9]/gi,'');const C={};
  b.classes.forEach(c=>{const f=c.fields||[],m=c.methods||[];const longest=Math.max(c.name.length*8.6,...f.map(s=>s.length*6.95),...m.map(s=>s.length*6.95),60);const w=c.w||Math.ceil(longest+22);const hh=c.kind?42:30;const fb=f.length?f.length*16+10:8,mb=m.length?m.length*16+10:8;C[c.id]=Object.assign({},c,{w,h:hh+fb+mb,hh,fb})});
  const clip=(c,tx,ty)=>{const cx=c.x+c.w/2,cy=c.y+c.h/2,dx=tx-cx,dy=ty-cy;if(!dx&&!dy)return[cx,cy];const t=Math.min(dx?(c.w/2)/Math.abs(dx):Infinity,dy?(c.h/2)/Math.abs(dy):Infinity);return[cx+dx*t,cy+dy*t]};
  const ctr=c=>[c.x+c.w/2,c.y+c.h/2];
  const rel=r=>{let A=C[r.from],B=C[r.to];if(!A||!B)return'';const owner=r.type==='has'||r.type==='agg';if(owner){const t=A;A=B;B=t}
    const a=clip(A,...ctr(B)),z=clip(B,...ctr(A));const mk={is:'tri',impl:'tri',has:'dia',agg:'diah',uses:'open',assoc:'open'}[r.type]||'open';
    const dash=r.type==='impl'||r.type==='uses';const mx=(a[0]+z[0])/2,my=(a[1]+z[1])/2;
    return `<path class="rel${dash?' dash':''}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${z[0].toFixed(1)} ${z[1].toFixed(1)}" marker-end="url(#${id}${mk})"/>`+(r.label?`<text class="rlabel" x="${mx+6}" y="${my-6}">${r.label}</text>`:'')};
  const cls=c=>{c=C[c.id];const x=c.x,y=c.y;let s=`<g class="cls" data-c="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}"><rect class="box" x="${x}" y="${y}" width="${c.w}" height="${c.h}" rx="6"/>`;
    if(c.kind)s+=`<text class="stereo" x="${x+c.w/2}" y="${y+16}">«${c.kind}»</text>`;
    s+=`<text class="cname" x="${x+c.w/2}" y="${y+(c.kind?33:20)}">${esc(c.name)}</text><line class="div" x1="${x}" x2="${x+c.w}" y1="${y+c.hh}" y2="${y+c.hh}"/>`;
    (c.fields||[]).forEach((f,i)=>s+=`<text class="mem" x="${x+10}" y="${y+c.hh+18+i*16}">${esc(f)}</text>`);
    s+=`<line class="div" x1="${x}" x2="${x+c.w}" y1="${y+c.hh+c.fb}" y2="${y+c.hh+c.fb}"/>`;
    (c.methods||[]).forEach((m,i)=>s+=`<text class="mem" x="${x+10}" y="${y+c.hh+c.fb+18+i*16}">${esc(m)}</text>`);return s+'</g>'};
  const W=b.w||Math.max(...Object.values(C).map(c=>c.x+c.w))+20,H=b.h||Math.max(...Object.values(C).map(c=>c.y+c.h))+20;
  const defs=`<defs><marker id="${id}tri" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-hollow" d="M0 0L12 6L0 12z"/></marker><marker id="${id}dia" viewBox="0 0 16 10" refX="16" refY="5" markerWidth="16" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-fill" d="M0 5L8 0L16 5L8 10z"/></marker><marker id="${id}diah" viewBox="0 0 16 10" refX="16" refY="5" markerWidth="16" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-hollow" d="M0 5L8 0L16 5L8 10z"/></marker><marker id="${id}open" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-open" d="M0 0L10 5L0 10"/></marker></defs>`;
  const box=node('div','svgbox',`<svg class="uml" viewBox="0 0 ${W} ${H}" style="min-width:${Math.round(W*.8)}px" role="img" aria-label="${esc(b.title||'Class diagram')}">${defs}${(b.rels||[]).map(rel).join('')}${b.classes.map(cls).join('')}</svg>`);
  const det=node('div','think',b.hint||'Click a class to see what it is responsible for.');
  const leg=node('div','legend','<span>▷ hollow triangle: inherits / implements (dashed)</span><span>◆ filled diamond: owns (composition)</span><span>◇ hollow diamond: has (aggregation)</span><span>→ uses / knows about (dashed = depends on)</span>');
  p.append(box,leg,det);
  const pick=g=>{$$('g.cls',box).forEach(x=>x.classList.toggle('sel',x===g));const c=C[g.dataset.c];det.innerHTML=`<b>${esc(c.name)}</b>${c.kind?` <span class="tag lld">${c.kind}</span>`:''}<div>${c.note||'No note.'}</div>`};
  box.addEventListener('click',e=>{const g=e.target.closest('g.cls');if(g)pick(g)});box.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('g.cls')){e.preventDefault();pick(e.target.closest('g.cls'))}})};

R.lab=(b,p,key,ses)=>{const fn=(ses.labs&&ses.labs[b.fn])||SHARED[b.fn];const c=node('div','col');p.appendChild(c);if(!fn){c.textContent='Lab not found: '+b.fn;return}
  fn(c,{get:(k,d)=>store.get(key+':'+k,d),set:(k,v)=>store.set(key+':'+k,v),every,esc,fmt,$,$$,node,codeHTML,tableHTML,arg:b.arg})};

function renderBlocks(blocks,container,kp,ses,nested){blocks.forEach((b,i)=>{const key=kp+'.'+i;
  if(b.t==='teacher'){container.appendChild(node('details','teacher',`<summary>${b.title||'Teacher notes'}</summary><ul class="clean">${b.items.map(x=>`<li>${x}</li>`).join('')}</ul>`));return}
  const lvl=SDC.levelOf(b),lv=lvl?`<div class="blk-meta">${SDC.levelHTML(lvl)}</div>`:'';
  const pnl=node('div','panel'+(nested?' nested':''),lv+(b.title?`<h3>${b.title}</h3>`:'')+(b.intro?`<p class="intro">${b.intro}</p>`:''));container.appendChild(pnl);
  pnl.id='blk-'+key.replace(/\./g,'_');pnl.dataset.phase=SDC.phaseOf(b);if(lvl)pnl.dataset.level=lvl;
  if(SDC.kindOf(b)==='lab'&&(b.t==='lab'||b.t==='arch')){const mark=()=>{if(!SDC.act.get(key))SDC.act.record(key,{t:b.t,s:ses.id,c:b.concept||ses.concept||'interview',id:b.id||null,score:null,explored:true})};
    pnl.addEventListener('input',mark,{once:true});pnl.addEventListener('click',e=>{if(e.target.closest('button,select,input'))mark()})}
  if(R[b.t])R[b.t](b,pnl,key,ses);else pnl.insertAdjacentHTML('beforeend','<p>Unknown block: '+esc(b.t)+'</p>')})}
SDC.renderBlocks=renderBlocks;SDC.tableHTML=tableHTML;SDC.codeHTML=codeHTML;

/* ---------- shared labs ---------- */
const SHARED={};
SHARED.estimator=(el,api)=>{const d=Object.assign({users:500000,writes:2,ratio:100,bytes:500,years:5,peak:3},api.arg||{});
  const F=[['users','Daily active users',1],['writes','Writes per user per day',.1],['ratio','Reads per write',1],['bytes','Bytes per stored item',1],['years','Years kept',.5],['peak','Peak / average',.5]];
  el.innerHTML=`<div class="form">${F.map(f=>`<label>${f[1]}<input type="number" data-k="${f[0]}" value="${d[f[0]]}" min="0" step="${f[2]}"></label>`).join('')}</div><div class="out"></div><div class="verdict"></div><p class="muted small">Rules of thumb: 1 day ≈ 86,400 s; one app server ≈ a few thousand simple requests/s; one relational database ≈ a few thousand simple writes/s. Approximate on purpose.</p>`;
  const n=v=>v>=1e12?(v/1e12).toFixed(1)+' T':v>=1e9?(v/1e9).toFixed(1)+' B':v>=1e6?(v/1e6).toFixed(1)+' M':v>=1e4?Math.round(v/1e3)+' K':v>=100?Math.round(v).toLocaleString():v>=1?v.toFixed(1):v.toFixed(2);
  const by=b=>{const u=['B','KB','MB','GB','TB','PB'];let i=0;while(b>=1000&&i<5){b/=1000;i++}return (b>=100?Math.round(b):b.toFixed(1))+' '+u[i]};
  const calc=()=>{const g=k=>Math.max(0,parseFloat(api.$(`[data-k=${k}]`,el).value)||0);const U=g('users'),W=g('writes'),Rr=g('ratio'),B=g('bytes'),Y=g('years'),P=Math.max(1,g('peak'));
    const wd=U*W,w=wd/86400,r=w*Rr,peak=(w+r)*P,st=wd*365*Y*B;
    api.$('.out',el).innerHTML=`<div><b>${n(wd)}</b><span>writes per day</span></div><div><b>${n(w)}/s</b><span>writes, average</span></div><div><b>${n(r)}/s</b><span>reads, average</span></div><div><b>${n(peak)}/s</b><span>all requests at peak</span></div><div><b>${by(st)}</b><span>stored after ${Y} years</span></div>`;
    let v1=peak<500?'One app server and one database are enough to start. Say so: it shows judgement.':peak<5000?'A few stateless app servers behind a load balancer; one database helped by a cache or read replica.':'Many app servers, a cache is required, and plan to shard or replicate the data.';
    let v2=st<1e11?'Storage fits on one database.':st<5e12?'One large database works; plan archiving or expiry.':'Too big for one database: shard it, or move large files to object storage.';
    if(w*P>3000)v2+=' Peak writes are high for a single database: another reason to split.';api.$('.verdict',el).innerHTML='<b>Verdict.</b> '+v1+' '+v2};
  el.addEventListener('input',calc);calc()};

SHARED.seatRace=(el,api)=>{let mode='naive',racing=false;const sold=[2,3,9,10,11];
  el.innerHTML=`<div class="row"><button class="btn" data-m="naive" aria-pressed="true">Read, then write</button><button class="btn" data-m="cond" aria-pressed="false">Conditional update</button><button class="btn primary" data-go>Run the race</button></div><div class="grid2" style="align-items:start"><div class="col" style="gap:8px"><div class="seats"></div><p class="muted small">Green = free · Amber = held · Grey = sold · Outlined = C7, wanted by both buyers.</p></div><div class="log" aria-live="polite"><span class="muted">Press "Run the race".</span></div></div>`;
  const seats=st=>{api.$('.seats',el).innerHTML=Array.from({length:12},(_,i)=>{const id=i+1;let c=sold.includes(id)?'sold':'';if(id===7){c='target'+(st?' '+st:'')}return `<div class="seat ${c}">C${id}</div>`}).join('')};
  const S={naive:[['a','A: SELECT status FROM seats WHERE id = C7   → available',''],['b','B: SELECT status FROM seats WHERE id = C7   → available',''],['a',"A: UPDATE seats SET status = 'sold', owner = 'A' WHERE id = C7",'held'],['b',"B: UPDATE seats SET status = 'sold', owner = 'B' WHERE id = C7",'double'],['r-bad','Both A and B were told "you got C7" and both paid. Double booking: the check and the write were separate steps.','double']],
    cond:[['a',"A: UPDATE seats SET status = 'held', holder = 'A' WHERE id = C7 AND status = 'available'   → 1 row",'held'],['b',"B: UPDATE seats SET status = 'held', holder = 'B' WHERE id = C7 AND status = 'available'   → 0 rows",'held'],['a','A: goes to payment with C7 held for 10 minutes','held'],['b','B: sees "Seat just taken, pick another"','held'],['r-good','Exactly one buyer holds C7. Check and write are one atomic step, so the database picks the winner. Cost: B must choose again.','won']]};
  el.addEventListener('click',e=>{const m=e.target.closest('[data-m]');if(m&&!racing){mode=m.dataset.m;api.$$('[data-m]',el).forEach(x=>x.setAttribute('aria-pressed',String(x===m)));seats();api.$('.log',el).innerHTML='<span class="muted">Press "Run the race".</span>'}
    if(e.target.closest('[data-go]')&&!racing){racing=true;seats();const log=api.$('.log',el);log.innerHTML='';S[mode].forEach((l,i)=>setTimeout(()=>{const d=document.createElement('div');d.className=l[0];d.textContent=l[1];log.appendChild(d);if(l[2])seats(l[2]);if(i===S[mode].length-1)racing=false},650*i+150))}});seats()};

SHARED.story=(el,api)=>{const F=[['what','What it did, in one sentence','A to-do web app for my study group'],['users','Users and scale','about 30 classmates, a few requests a minute'],['parts','The parts','a React page, a Flask server and one SQLite database'],['dec','One key decision','reload the whole task list after every change'],['alt','An alternative','send only the change and update the page locally'],['better','What the alternative improves','fewer requests and a faster screen'],['worse','What it makes worse','the page and server can disagree after a failed request'],['brk','What breaks first at 100x users','the full-list reload, so I would add pagination and an index on userId'],['now','What you would change today','keep SQL and add pagination, because the data is small and relational']];
  const v=api.get('v',{});
  el.innerHTML=`<div class="grid2" style="align-items:start"><div class="col" style="gap:10px">${F.map(f=>`<label>${f[1]}<input type="text" data-k="${f[0]}" placeholder="${api.esc(f[2])}" value="${api.esc(v[f[0]]||'')}"></label>`).join('')}</div><div class="col"><div class="story"></div><div class="row"><span class="bigtimer" style="font-size:2rem">2:00</span><button class="btn primary" data-talk>Start talking</button><button class="btn" data-tr>Reset</button></div><p class="muted small">Say it twice. On the second run, cut anything that is not a decision or a reason.</p></div></div>`;
  const g=k=>{const i=api.$(`[data-k=${k}]`,el);return (i.value||i.placeholder).trim().replace(/[.\s]+$/,'')};
  const draw=()=>{api.$('.story',el).textContent=`I built ${g('what')}, used by ${g('users')}. It had ${g('parts')}.\n\nThe key decision was to ${g('dec')}. I could have chosen to ${g('alt')} instead. That would have given ${g('better')}, but ${g('worse')}.\n\nAt 100 times the users, ${g('brk')}.\n\nIf I built it today, I would ${g('now')}.`};
  el.addEventListener('input',e=>{if(e.target.dataset.k){v[e.target.dataset.k]=e.target.value;api.set('v',v);draw()}});draw();
  let t=120,run=false,id=null;const big=api.$('.bigtimer',el),gb=api.$('[data-talk]',el);const dt=()=>{big.textContent=(t<0?'+':'')+api.fmt(Math.abs(t));big.style.color=t<0?'var(--marker)':''};
  gb.addEventListener('click',()=>{run=!run;gb.textContent=run?'Pause':'Resume';if(run)id=api.every(()=>{t--;dt()},1000);else clearInterval(id)});
  api.$('[data-tr]',el).addEventListener('click',()=>{run=false;clearInterval(id);t=120;gb.textContent='Start talking';dt()})};

/* ---------- class clock (per session) ---------- */
let clk={sid:null,s:0,run:false,id:null,blocks:[]};
function clockFor(ses){if(clk.sid===ses.id)return;clearInterval(clk.id);let acc=0;clk={sid:ses.id,s:store.get('clock:'+ses.id,0),run:false,id:null,blocks:ses.modules.filter(m=>!m.selfStudy).map((m,i)=>{const b=[acc*60,(acc+m.mins)*60,m.title,i];acc+=m.mins;return b})};
  $('#clockBar').innerHTML=clk.blocks.map(b=>`<span style="flex:${b[1]-b[0]}"><i></i></span>`).join('');$('#clockGo').textContent=clk.s>0?'Resume':'Start class';drawClock()}
function drawClock(){if(!clk.sid)return;const T=clk.blocks.length?clk.blocks[clk.blocks.length-1][1]:7200,s=clk.s;$('#clockTime').textContent=fmtH(s);
  const bi=clk.blocks.findIndex(b=>s>=b[0]&&s<b[1]);const started=s>0||clk.run;
  $('#clockNow').textContent=s>=T?'Time is up · well done':!started?'Not started · '+fmtH(T)+' planned':'Now: '+clk.blocks[bi][2]+' · '+fmt(clk.blocks[bi][1]-s)+' left';
  $$('#clockBar i').forEach((el,i)=>{const b=clk.blocks[i];el.style.width=Math.min(100,Math.max(0,(s-b[0])/(b[1]-b[0])*100))+'%'});
  $$('#modTabs .tab').forEach(t=>t.classList.toggle('live',started&&bi>=0&&+t.dataset.m===bi));$$('.agenda-row').forEach(r=>r.classList.toggle('now',started&&+r.dataset.b===bi))}
$('#clockGo').addEventListener('click',()=>{clk.run=!clk.run;$('#clockGo').textContent=clk.run?'Pause':'Resume';const T=clk.blocks[clk.blocks.length-1][1];
  if(clk.run){clk.id=setInterval(()=>{clk.s++;store.set('clock:'+clk.sid,clk.s);drawClock();if(clk.s>=T){clk.run=false;clearInterval(clk.id);$('#clockGo').textContent='Done'}},1000)}else clearInterval(clk.id);drawClock()});
$('#clockReset').addEventListener('click',()=>{clk.run=false;clearInterval(clk.id);clk.s=0;store.set('clock:'+clk.sid,0);$('#clockGo').textContent='Start class';drawClock()});

/* projector text */
const big=$('#bigText');const setBig=v=>{document.documentElement.classList.toggle('big',v);big.setAttribute('aria-pressed',String(v));store.set('big',v)};
big.addEventListener('click',()=>setBig(big.getAttribute('aria-pressed')!=='true'));setBig(store.get('big',false));

/* ---------- component blocks and labs registered by js/components/*.js ---------- */
Object.keys(COURSE.blocks).forEach(k=>{if(!R[k])R[k]=COURSE.blocks[k]});Object.assign(SHARED,COURSE.labs);

/* ---------- views ---------- */
const doneSet=()=>new Set(store.get('done',[]));
const hoursOf=s=>`Hours ${s.n*2-1}–${s.n*2}`;
const trackTag=s=>s.track==='LLD'?'<span class="tag lld">LLD</span>':s.track==='Both'?'<span class="tag green">HLD + LLD</span>':'<span class="tag">HLD</span>';
const CASES=COURSE.cases;SDC.sessions=S;
const findSes=id=>S.find(s=>s.id===id)||CASES.find(c=>c.id===id);
let cur=null;

function setNav(k){$$('#siteNav a').forEach(a=>a.setAttribute('aria-current',a.dataset.nav===k?'page':'false'));const n=SDC.srs.due().length,b=$('#dueBadge');b.textContent=n;b.hidden=!n}
function leaveSession(){cur=null;if(clk.sid){clearInterval(clk.id);clk={sid:null,s:0,run:false,id:null,blocks:[]}}
  $('#clock').hidden=true;$('#homeBtn').hidden=true;$('#clockBar').innerHTML='';$('#modTabs').innerHTML='';$('#phaseBar').hidden=true;$('#phaseBar').innerHTML='';$('#brandEye').textContent='40 hours · HLD + LLD · interview prep'}
const hdr=()=>document.documentElement.style.setProperty('--hdr',($('.top').offsetHeight+12)+'px');
window.addEventListener('resize',hdr);

function hub(){const app=$('#app');const done=doneSet();const next=S.find(s=>!done.has(s.id))||S[0];
  setNav('home');const st=SDC.stats();
  const cnt=t=>S.filter(s=>s.track===t).length;
  app.innerHTML=`<div class="mod">
   <section class="hero"><div class="col" style="gap:10px"><span class="eyebrow">Course map · 20 sessions × 2 hours</span><h2>From a vague prompt to a defended design, in 40 hours</h2><p class="lead muted" style="font-size:1.06rem;max-width:62ch">A system design learning lab. In every session you predict what breaks, run the experiment, debug it, answer as if an interviewer is listening, and check what stuck. Teacher notes sit at the end of each module.</p>
     <div class="row"><a class="btn primary" href="#${next.id}">${done.size?'Continue':'Start'}: Session ${next.n}</a><span class="muted small">${done.size} of ${S.length} sessions complete</span></div></div>
     <div class="col" style="gap:12px"><div class="stats"><div><b>${cnt('HLD')*2}h</b><span>High-level design</span></div><div><b>${cnt('LLD')*2}h</b><span>Low-level design</span></div><div><b>${cnt('Both')*2}h</b><span>Capstone mocks</span></div></div><div class="meter" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(st.overall*100)}"><i style="width:${st.overall*100}%"></i></div><span class="small muted">Course progress ${Math.round(st.overall*100)}%</span></div></section>
   <nav class="hubcards" aria-label="Learning lab">
     <a class="hubcard" href="#labs"><span class="eyebrow">Experiment</span><b>Labs</b><span>${st.labs.done} / ${st.labs.total} completed</span></a>
     <a class="hubcard" href="#cases"><span class="eyebrow">Design</span><b>Case studies</b><span>${CASES.length+st.caseSessions} interactive systems</span></a>
     <a class="hubcard" href="#interview"><span class="eyebrow">Interview</span><b>Interview practice</b><span>${st.interview.done} / ${st.interview.total} problems</span></a>
     <a class="hubcard ${st.due?'due':''}" href="#revision"><span class="eyebrow">Revise</span><b>Revision</b><span>${st.due?st.due+' due today':'Nothing due'}</span></a>
     <a class="hubcard" href="#progress"><span class="eyebrow">Track</span><b>Progress</b><span>Concept mastery</span></a></nav>
   <div class="panel"><h3>The learning loop in every session</h3><ol class="loopline">${SDC.PHASES.map(p=>`<li>${p[1]}</li>`).join('')}</ol><p class="muted small">Every architecture change answers four questions: <b>What problem do we have? Why does the current design fail? What component could solve it? What new problems does that component introduce?</b> The strip under the module tabs shows which steps each module contains; click one to jump to it.</p>
   ${tableHTML(['Part of the session','What happens','Typical time'],[['Plan + warm-up','Session goals, tasks, a recall quiz from last time','10–15 min'],['Concept + diagrams','Short teaching, progressive diagrams, prediction questions','25–30 min'],['Labs','Simulators: change traffic, add components, break things, measure','15–25 min'],['Design + interview','Guided problem, interview checkpoint, design-it-yourself','20–30 min'],['Review','Active recall, session summary, exit quiz','5–10 min']])}<p class="muted small">Use the class clock in the header during a session. Progress, answers and notes are saved in this browser only.</p></div>
   ${PARTS.map(P=>{const list=S.filter(s=>s.part===P.k);if(!list.length)return'';return `<section class="part"><div class="part-head"><h3>Part ${P.k} · ${P.name}</h3><span class="mono">${hoursOf(list[0]).replace(/–\d+$/,'')}–${list[list.length-1].n*2} · ${list.length} sessions</span></div><p class="muted small" style="max-width:70ch">${P.desc}</p><div class="sgrid">${list.map(s=>{const ts=SDC.taskState(s);return `<a class="scard ${done.has(s.id)?'done':''}" href="#${s.id}"><span class="num"><span>Session ${String(s.n).padStart(2,'0')} · ${hoursOf(s)}</span>${done.has(s.id)?'<b>Done ✓</b>':trackTag(s)}</span><h4>${s.title}</h4><p>${s.goal}</p>${ts.total?`<span class="small muted">Tasks ${ts.done} / ${ts.total}</span><span class="meter thin" aria-hidden="true"><i style="width:${ts.done/ts.total*100}%"></i></span>`:''}</a>`}).join('')}</div></section>`}).join('')}
  </div>`;hdr()}

function phaseBar(ses,m){const pb=$('#phaseBar');const present=new Set();
  const walk=bl=>bl.forEach(b=>{if(b.t==='teacher')return;present.add(SDC.phaseOf(b));if(b.t==='stepper')b.steps.forEach(x=>x.blocks&&walk(x.blocks))});walk(m.blocks);
  const ts=SDC.taskState(ses);
  pb.innerHTML=`<ol class="phases-nav" aria-label="Learning loop steps in this module">${SDC.PHASES.map(([k,l])=>present.has(k)?`<li><button type="button" data-ph="${k}">${l}</button></li>`:`<li><span class="ph-off" title="Not in this module">${l}</span></li>`).join('<li class="ph-sep" aria-hidden="true">→</li>')}</ol>${ts.total?`<a class="taskchip" href="#${ses.id}-m1~tasks" data-taskchip>Tasks ${ts.done} / ${ts.total}</a>`:''}`;pb.hidden=false}
$('#phaseBar').addEventListener('click',e=>{const b=e.target.closest('[data-ph]');if(!b)return;const el=$(`#app [data-phase="${b.dataset.ph}"]`);if(el){el.scrollIntoView({block:'start',behavior:SDC.reducedMotion()?'auto':'smooth'});el.classList.remove('flash-hi');void el.offsetWidth;el.classList.add('flash-hi');const f=el.querySelector('button,input,select,textarea,summary');if(f)f.focus({preventScroll:true})}});
SDC.on('tasks',sid=>{const c=$('[data-taskchip]');if(c&&cur&&cur.id===sid){const ts=SDC.taskState(cur);c.textContent=`Tasks ${ts.done} / ${ts.total}`}});

function sessionView(ses,mi){const app=$('#app');const isCase=ses.kind==='case';mi=Math.max(0,Math.min(ses.modules.length-1,mi||0));cur=ses;
  setNav(isCase?'cases':'home');
  if(isCase){if(clk.sid){clearInterval(clk.id);clk={sid:null,s:0,run:false,id:null,blocks:[]}}$('#clock').hidden=true;$('#clockBar').innerHTML=''}else{$('#clock').hidden=false;clockFor(ses)}
  const hb=$('#homeBtn');hb.hidden=false;hb.href=isCase?'#cases':'#home';hb.textContent=isCase?'All case studies':'All sessions';
  $('#brandEye').textContent=isCase?`Case study · ${ses.title}`:`Session ${String(ses.n).padStart(2,'0')} · ${hoursOf(ses)} · Part ${ses.part}`;
  let acc=0;const starts=ses.modules.map(m=>{const s=acc;if(!m.selfStudy)acc+=m.mins;return s});
  $('#modTabs').innerHTML=ses.modules.map((m,i)=>`<button class="tab" role="tab" data-m="${i}" aria-selected="${i===mi}"><small>${m.selfStudy?'extra':isCase?'step '+(i+1):hm(starts[i])}</small>${m.tab||m.title}</button>`).join('');
  const m=ses.modules[mi];const mod=node('section','mod');phaseBar(ses,m);
  mod.innerHTML=`<div class="mod-head"><div class="crumb"><span class="eyebrow">${isCase?`Step ${mi+1} of ${ses.modules.length} · about ${m.mins} min`:`Module ${mi+1} of ${ses.modules.length} · ${m.selfStudy?`Self-study after class · about ${m.mins} min`:`${hm(starts[mi])} – ${hm(starts[mi]+m.mins)} · ${m.mins} min`}`}</span>${isCase?'<span class="tag green">Case study</span>':trackTag(ses)}</div><h2>${m.title}</h2>${m.lead?`<p class="lead">${m.lead}</p>`:''}</div>`;
  if(mi===0){const ag=node('div','grid2');ag.innerHTML=`<div class="panel"><h3>${isCase?'':'Session '+ses.n+': '}${ses.title}</h3><p class="intro">${ses.goal}</p><h4>By the end, ${isCase?'you':'students'} can</h4><ul class="clean">${ses.outcomes.map(o=>`<li>${o}</li>`).join('')}</ul></div><div class="panel"><h3>${isCase?'Case study plan':'Session plan'}</h3><div>${ses.modules.map((x,i)=>`<div class="agenda-row" data-b="${i}"><span class="t">${isCase?'~'+x.mins+' min':x.selfStudy?'Self-study':`${hm(starts[i])} – ${hm(starts[i]+x.mins)}`}</span><div><h4>${x.title}</h4>${x.out?`<p class="muted small"><b>Output:</b> ${x.out}</p>`:''}</div></div>`).join('')}</div></div>`;mod.appendChild(ag);
    const tp=SDC.renderTasks(ses,mod);if(tp)tp.id='blk-tasks'}
  renderBlocks(m.blocks,mod,ses.id+'.m'+mi,ses,false);
  const last=mi===ses.modules.length-1,list=isCase?CASES:S,idx=list.indexOf(ses),nx=list[idx+1],pv=list[idx-1],done=doneSet();
  if(last&&mi>0&&ses.tasks)SDC.renderTasks(ses,mod);
  const lbl=x=>isCase?x.title:`Session ${x.n}`;
  const doneTxt=d=>d?(isCase?'Case study complete ✓':'Session complete ✓'):(isCase?'Mark case study complete':'Mark session complete');
  const foot=node('div','navfoot');
  foot.innerHTML=`<div class="row">${mi>0?`<a class="btn" href="#${ses.id}-m${mi}">← ${ses.modules[mi-1].tab||ses.modules[mi-1].title}</a>`:pv?`<a class="btn" href="#${pv.id}">← ${lbl(pv)}</a>`:''}</div><div class="row">${last?`<button class="btn" data-done aria-pressed="${done.has(ses.id)}">${doneTxt(done.has(ses.id))}</button>${nx?`<a class="btn primary" href="#${nx.id}">${lbl(nx)}${isCase?'':': '+nx.title} →</a>`:`<a class="btn primary" href="#${isCase?'cases':'home'}">Back to ${isCase?'case studies':'course map'}</a>`}`:`<a class="btn primary" href="#${ses.id}-m${mi+2}">${ses.modules[mi+1].tab||ses.modules[mi+1].title} →</a>`}</div>`;
  mod.appendChild(foot);app.innerHTML='';app.appendChild(mod);
  const db=$('[data-done]',foot);if(db)db.addEventListener('click',()=>{const d=doneSet();d.has(ses.id)?d.delete(ses.id):d.add(ses.id);store.set('done',[...d]);db.setAttribute('aria-pressed',String(d.has(ses.id)));db.textContent=doneTxt(d.has(ses.id))});
  if(!isCase)drawClock();hdr()}

$('#modTabs').addEventListener('click',e=>{const t=e.target.closest('.tab');if(!t||!cur)return;location.hash='#'+cur.id+'-m'+(+t.dataset.m+1)});

function route(){killAll();const h=decodeURIComponent((location.hash||'').slice(1));const m=h.match(/^(s\d\d|case-[a-z]+)(?:-m(\d+))?(?:~([\w-]+))?$/);
  if(m){const ses=findSes(m[1]);if(ses){sessionView(ses,m[2]?(+m[2]-1):0);store.set('last',h);window.scrollTo(0,0);
    if(m[3])SDC.later(()=>{const el=document.getElementById('blk-'+m[3]);if(el){el.scrollIntoView({block:'start'});el.classList.add('flash-hi')}},50);return}}
  leaveSession();
  if(SDC.pages&&SDC.pages[h]){SDC.pages[h]($('#app'));setNav(h);hdr();window.scrollTo(0,0);return}
  hub();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);route();
})();
