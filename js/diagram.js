/* Grid-layout architecture diagrams.
   Nodes:  'id@col,row'  or  'id@col,row:Label|sub'  or  {id,c,r,l,sub,kind,w,m}
           kind comes from the id without trailing digits/suffix: db2 → db, api_b → api.
   Edges:  'a>b'  'a>b:label'  'a~>b' (dashed)  'a<>b' (both ways)  'a-b' (no arrow)
   Opts:   {states:{id:'hot|warn|ok|down|new|dim'}, metrics:{id:'CPU 92%'}, hi:[ids on the request path], groups:[{c0,r0,c1,r1,l}]} */
(function(){
'use strict';
const {esc}=SDC;
const K={client:['Client','web / mobile'],users:['Users','global'],dns:['DNS','name → IP'],cdn:['CDN','edge cache'],lb:['Load balancer','spreads traffic'],
  gw:['API gateway','auth · rate limit'],proxy:['Reverse proxy','TLS · routing'],api:['API servers','stateless'],app:['App server',''],svc:['Service',''],
  cache:['Cache','Redis'],queue:['Queue','buffer'],kafka:['Kafka','event log'],worker:['Workers','async jobs'],db:['Primary DB','writes'],
  replica:['Read replica','reads'],shard:['Shard',''],obj:['Object storage','blobs'],search:['Search index','inverted index'],ws:['WebSocket servers','live connections'],
  disc:['Service registry','who is where'],mon:['Metrics · logs · traces',''],lock:['Lock service','leases'],provider:['Provider','email · SMS · push'],
  region:['Region',''],cb:['Circuit breaker',''],sub:['Subscriber',''],pub:['Publisher',''],topic:['Topic','fan-out'],dlq:['Dead-letter queue','failed jobs'],
  user:['User',''],node:['Node',''],note:['','']};
const SHAPE={db:'db',replica:'db',shard:'db',obj:'db',search:'db',queue:'queue',kafka:'queue',dlq:'queue',topic:'queue',client:'pill',users:'pill',user:'pill'};
const kindOf=id=>id.replace(/[_-].*$/,'').replace(/\d+$/,'');
let uid=0;

function parseNode(n){if(typeof n!=='string')return Object.assign({kind:kindOf(n.id)},n);
  const m=n.match(/^([\w-]+)@([\d.]+),([\d.]+)(?::(.*))?$/);if(!m)throw new Error('Bad node '+n);
  const o={id:m[1],c:+m[2],r:+m[3],kind:kindOf(m[1])};if(m[4]!=null){const p=m[4].split('|');o.l=p[0];if(p.length>1)o.sub=p[1]}return o}
function parseEdge(e){if(typeof e!=='string')return e;const m=e.match(/^([\w-]+)\s*(~>|<>|>|-)\s*([\w-]+)(?::(.*))?$/);if(!m)throw new Error('Bad edge '+e);
  return {a:m[1],b:m[3],dash:m[2]==='~>',both:m[2]==='<>',arrow:m[2]!=='-',l:m[4]||''}}

SDC.dgParse=spec=>({nodes:(spec.nodes||[]).map(parseNode),edges:(spec.edges||[]).map(parseEdge)});

SDC.diagram=(spec,opt)=>{opt=opt||{};const cw=spec.cw||170,ch=spec.ch||92,pad=14;const {nodes,edges}=SDC.dgParse(spec);
  const st=opt.states||{},mt=opt.metrics||{},hi=opt.hi||[];const id='dg'+(uid++);
  const N={};nodes.forEach(n=>{const k=K[n.kind]||[n.id,''];const w=n.w||(spec.nw||138),h=n.h||(mt[n.id]?66:54);
    N[n.id]=Object.assign({},n,{w,h,x:pad+n.c*cw+(cw-w)/2,y:pad+n.r*ch+(ch-h)/2,label:n.l!=null?n.l:k[0],sub:n.sub!=null?n.sub:k[1]})});
  const W=Math.ceil(pad*2+(Math.max(...nodes.map(n=>n.c))+1)*cw),H=Math.ceil(pad*2+(Math.max(...nodes.map(n=>n.r))+1)*ch);
  const cx=n=>n.x+n.w/2,cy=n=>n.y+n.h/2;
  const onPath=(a,b)=>{const i=hi.indexOf(a),j=hi.indexOf(b);return i>=0&&j>=0&&Math.abs(i-j)===1};
  const edgeSVG=e=>{const A=N[e.a],B=N[e.b];if(!A||!B)return '';let d,lx,ly;const dx=cx(B)-cx(A),dy=cy(B)-cy(A);
    if(Math.abs(dy)<6){const s=dx>0?1:-1;const x1=s>0?A.x+A.w:A.x,x2=s>0?B.x:B.x+B.w,y=cy(A);d=`M${x1} ${y}H${x2}`;lx=(x1+x2)/2;ly=y-6}
    else if(Math.abs(dx)<A.w/2+B.w/2-8&&Math.abs(dy)>ch*0.4){const s=dy>0?1:-1;const x=(Math.max(A.x,B.x)+Math.min(A.x+A.w,B.x+B.w))/2;const y1=s>0?A.y+A.h:A.y,y2=s>0?B.y:B.y+B.h;d=`M${x} ${y1}V${y2}`;lx=x+6;ly=(y1+y2)/2+4}
    else{const s=dx>0?1:-1;const x1=s>0?A.x+A.w:A.x,x2=s>0?B.x:B.x+B.w,y1=cy(A),y2=cy(B);const mx=(x1+x2)/2;d=`M${x1} ${y1}H${mx}V${y2}H${x2}`;lx=mx+5;ly=(y1+y2)/2+4}
    const cls='dge'+(e.dash?' dash':'')+(onPath(e.a,e.b)?' flow':'')+(st[e.a]==='dim'||st[e.b]==='dim'?' dim':'')+(st[e.a]==='down'||st[e.b]==='down'?' broken':'');
    return `<path class="${cls}" d="${d}" ${e.arrow?`marker-end="url(#${id}a)"`:''} ${e.both?`marker-start="url(#${id}a)"`:''}/>`+(e.l?`<text class="dgl" x="${lx}" y="${ly}">${esc(e.l)}</text>`:'')};
  const nodeSVG=n=>{const s=st[n.id]||'',sh=SHAPE[n.kind]||'box';const x=n.x,y=n.y,w=n.w,h=n.h;let body;
    if(sh==='db')body=`<path class="dgb" d="M${x} ${y+7}C${x} ${y-2} ${x+w} ${y-2} ${x+w} ${y+7}V${y+h-7}C${x+w} ${y+h+2} ${x} ${y+h+2} ${x} ${y+h-7}Z"/><path class="dgc" d="M${x} ${y+7}C${x} ${y+16} ${x+w} ${y+16} ${x+w} ${y+7}"/>`;
    else if(sh==='queue')body=`<rect class="dgb" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>${[0.72,0.8,0.88].map(f=>`<line class="dgc" x1="${x+w*f}" x2="${x+w*f}" y1="${y+6}" y2="${y+h-6}"/>`).join('')}`;
    else body=`<rect class="dgb" x="${x}" y="${y}" width="${w}" height="${h}" rx="${sh==='pill'?h/2:8}"/>`;
    const ty=n.sub||mt[n.id]?y+h/2-(mt[n.id]&&n.sub?10:3):y+h/2+4;
    const tag=s==='down'?'DOWN':s==='hot'?'HOT':s==='new'?'NEW':s==='warn'?'BUSY':'';
    return `<g class="dn ${s}${hi.includes(n.id)?' on':''}" data-n="${n.id}">${body}<text class="dnt" x="${x+w/2}" y="${ty}">${esc(n.label)}</text>${n.sub?`<text class="dns" x="${x+w/2}" y="${ty+15}">${esc(n.sub)}</text>`:''}${mt[n.id]?`<text class="dnm" x="${x+w/2}" y="${ty+(n.sub?30:16)}">${esc(mt[n.id])}</text>`:''}${tag?`<g class="dtag"><rect x="${x+w-38}" y="${y-9}" width="40" height="16" rx="8"/><text x="${x+w-18}" y="${y+3}">${tag}</text></g>`:''}</g>`};
  const groups=(spec.groups||[]).map(g=>`<g class="dgg"><rect x="${pad+g.c0*cw+4}" y="${pad+g.r0*ch+2}" width="${(g.c1-g.c0+1)*cw-8}" height="${(g.r1-g.r0+1)*ch-4}" rx="12"/><text x="${pad+g.c0*cw+14}" y="${pad+g.r0*ch+16}">${esc(g.l)}</text></g>`).join('');
  return `<svg class="dg" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W,Math.round(W*0.62))}px" role="img" aria-label="${esc(opt.aria||spec.aria||'Architecture diagram')}"><defs><marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dga" d="M0 0L10 5L0 10z"/></marker></defs>${groups}${edges.map(edgeSVG).join('')}${nodes.map(n=>nodeSVG(N[n.id])).join('')}</svg>`};

/* plain-text description of a diagram for screen readers */
SDC.dgText=spec=>{const {nodes,edges}=SDC.dgParse(spec);const L={};nodes.forEach(n=>L[n.id]=n.l!=null?n.l:(K[n.kind]||[n.id])[0]);
  return edges.map(e=>`${L[e.a]} ${e.both?'↔':'→'} ${L[e.b]}${e.l?' ('+e.l+')':''}`).join('; ')};

/* ---------- block: static diagram, optionally stepped (request lifecycle) ---------- */
SDC.block('diagram',(b,p,key,ses)=>{const steps=b.steps||[];let i=-1;
  const box=SDC.node('div','svgbox'),cap=SDC.node('div','think dg-cap');cap.setAttribute('aria-live','polite');
  const ctl=steps.length?SDC.node('div','row',`<button class="btn" data-a="prev">← Back</button><button class="btn primary" data-a="next">Start the trace →</button><button class="btn" data-a="all">Show whole path</button><span class="muted small mono" data-c></span>`):null;
  const sr=SDC.node('p','sr-only','Diagram: '+SDC.dgText(b));
  p.append(box,sr);if(ctl)p.append(ctl);p.append(cap);
  const draw=()=>{const s=steps[i]||{};box.innerHTML=SDC.diagram(b,{hi:i<0?[]:s.hi||[],states:Object.assign({},b.states,s.states),metrics:s.metrics,aria:b.title});
    cap.innerHTML=i<0?(b.caption||(steps.length?'Press "Start the trace" and follow one request.':'')):`<b>Step ${i+1} of ${steps.length}.</b> ${s.txt}`;cap.hidden=!cap.innerHTML;
    if(ctl){ctl.querySelector('[data-a=prev]').disabled=i<=0;ctl.querySelector('[data-a=next]').textContent=i<0?'Start the trace →':i>=steps.length-1?'Restart':'Next step →';ctl.querySelector('[data-c]').textContent=i>=0?`${i+1} / ${steps.length}`:''}};
  if(ctl)ctl.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(!a)return;const k=a.dataset.a;
    if(k==='next'){i=i>=steps.length-1?0:i+1;if(i===steps.length-1)SDC.ctx(b,key,ses,'diagram').done(null)}if(k==='prev')i=Math.max(0,i-1);
    if(k==='all'){const all=[];steps.forEach(s=>(s.hi||[]).forEach(x=>{if(!all.includes(x))all.push(x)}));box.innerHTML=SDC.diagram(b,{hi:all,aria:b.title});cap.innerHTML='The full request path is highlighted.';return}draw()});
  draw()},{phase:'visualize'});

/* ---------- block: progressive architecture (evolve) ----------
   stages:[{label, nodes, edges, problem, fails, fix, introduces, whyNot:[[q,a]], predict:{q,opts:[[label,ok,why]]}}] */
SDC.block('evolve',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'evolve');const S=b.stages;let cur=0;const seen=new Set(cx.get('seen',[0]));const pred=cx.get('pred',{});
  const bar=SDC.node('div','evo-bar');bar.setAttribute('role','group');bar.setAttribute('aria-label','Architecture stages');
  const box=SDC.node('div','svgbox'),sr=SDC.node('p','sr-only'),side=SDC.node('div','evo-why');side.setAttribute('aria-live','polite');
  const help=SDC.node('div','evo-help');help.setAttribute('aria-live','polite');
  p.append(help,bar,box,sr,side);
  const firstLocked=()=>S.findIndex((_,i)=>!seen.has(i));
  const prevIds=i=>i>0?new Set(SDC.dgParse(S[i-1]).nodes.map(n=>n.id)):new Set();
  const draw=()=>{const s=S[cur];
    const fl=firstLocked();
    help.innerHTML=fl<0?'<span>✓ All stages unlocked. Click any stage to compare how the design grew.</span>':`<span><span aria-hidden="true">🔒</span> Stages unlock one at a time, so you predict each change before you see it. <b>Answer the “What happens next?” question below the diagram</b> to unlock stage ${fl+1}.</span><button class="btn small" data-all>Skip predictions, unlock all</button>`;
    bar.innerHTML=S.map((x,i)=>`<button class="btn${i===cur?' primary':''}${seen.has(i)?'':' evo-locked'}" data-i="${i}" aria-pressed="${i===cur}" ${seen.has(i)?'':`title="Answer the prediction for stage ${i} to unlock"`}>${seen.has(i)?'':'<span aria-hidden="true">🔒 </span>'}${i+1}. ${esc(x.label)}${seen.has(i)?'':'<span class="sr-only"> (locked)</span>'}</button>`).join('<span class="evo-arrow" aria-hidden="true">→</span>');
    const pv=prevIds(cur),states={};SDC.dgParse(s).nodes.forEach(n=>{if(cur>0&&!pv.has(n.id))states[n.id]='new'});Object.assign(states,s.states||{});
    box.innerHTML=SDC.diagram(s,{states,aria:'Stage '+(cur+1)+': '+s.label});sr.textContent='Stage '+(cur+1)+' diagram: '+SDC.dgText(s);
    const nxt=S[cur+1];
    side.innerHTML=`<div class="evo-grid">${s.problem?`<div><span class="evo-k">What problem do we have?</span><p>${s.problem}</p></div>`:''}${s.fails?`<div><span class="evo-k">Why does the previous design fail?</span><p>${s.fails}</p></div>`:''}${s.fix?`<div><span class="evo-k">What did we add?</span><p>${s.fix}</p></div>`:''}${s.introduces?`<div class="evo-cost"><span class="evo-k">What new problems does it introduce?</span><p>${s.introduces}</p></div>`:''}</div>
      ${s.whyNot&&s.whyNot.length?`<details class="whynot"><summary>Why not something bigger yet?</summary>${s.whyNot.map(w=>`<p><b>${w[0]}</b> ${w[1]}</p>`).join('')}</details>`:''}
      ${nxt?nextHTML(nxt,cur+1):`<p class="muted small">Final stage. Compare where you started: every box was added because a measured problem forced it.</p>`}`};
  const nextHTML=(nx,i)=>{const pr=nx.predict;if(seen.has(i))return `<div class="row"><button class="btn primary" data-go="${i}">Go to stage ${i+1}: ${esc(nx.label)} →</button></div>`;
    if(!pr)return `<div class="row"><button class="btn primary" data-go="${i}">Reveal stage ${i+1}: ${esc(nx.label)} →</button></div>`;
    const a=pred[i];return `<div class="predict-q"><span class="evo-k">What happens next? Predict before you reveal</span><p>${pr.q}</p><div class="acts">${pr.opts.map((o,j)=>`<button class="btn small" data-pi="${i}" data-pj="${j}" aria-pressed="${a===j}">${esc(o[0])}</button>`).join('')}</div>${a!=null?`<p class="fb"><span class="tag ${pr.opts[a][1]?'green':'amber'}">${pr.opts[a][1]?'Good call':'Consider this'}</span> ${pr.opts[a][2]||''}</p><button class="btn primary" data-go="${i}">Reveal stage ${i+1} →</button>`:''}</div>`};
  p.addEventListener('click',e=>{const t=e.target.closest('[data-i]'),g=e.target.closest('[data-go]'),pj=e.target.closest('[data-pj]');
    if(t&&p.contains(t)&&bar.contains(t)){const i=+t.dataset.i;if(seen.has(i)){cur=i;draw()}else{const fl=firstLocked();cur=fl-1;draw();const q=side.querySelector('.predict-q,[data-go]');
      if(q){q.scrollIntoView({block:'center',behavior:SDC.reducedMotion()?'auto':'smooth'});q.classList.remove('flash-hi');void q.offsetWidth;q.classList.add('flash-hi');const f=q.querySelector('button');if(f)f.focus({preventScroll:true})}
      help.querySelector('span').innerHTML=i===fl?`<span aria-hidden="true">🔒</span> <b>Stage ${i+1} is next.</b> Answer the highlighted question below to unlock it.`:`<span aria-hidden="true">🔒</span> <b>Stages unlock in order.</b> Unlock stage ${fl+1} first by answering the highlighted question below the diagram.`}}
    if(e.target.closest('[data-all]')){S.forEach((_,i)=>seen.add(i));cx.set('seen',[...seen]);draw()}
    if(pj){const i=+pj.dataset.pi;pred[i]=+pj.dataset.pj;cx.set('pred',pred);const o=S[i].predict.opts[pred[i]];SDC.act.record(key+'.p'+i,{t:'predict',s:ses.id,c:cx.c,score:o[1]?1:0});draw()}
    if(g){cur=+g.dataset.go;seen.add(cur);cx.set('seen',[...seen]);if(seen.size===S.length)cx.done(null);draw();box.scrollIntoView({block:'nearest',behavior:SDC.reducedMotion()?'auto':'smooth'})}});
  draw()},{phase:'visualize',kind:'lab'});
})();
