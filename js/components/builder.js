/* Design-it-yourself: click-to-add architecture builder with per-component justification, then compare with a reference. */
(function(){
'use strict';
const {esc,node}=SDC;
const TIER={client:0,users:0,dns:1,cdn:1,lb:1,gw:1,proxy:1,api:2,svc:2,ws:2,app:2,cache:3,queue:3,kafka:3,search:3,topic:3,lock:3,disc:3,db:4,replica:4,shard:4,obj:4,worker:4,provider:4,dlq:4,mon:4};
const LABEL={client:'Client',users:'Users',dns:'DNS',cdn:'CDN',lb:'Load balancer',gw:'API gateway',api:'API servers',svc:'Service',ws:'WebSocket servers',cache:'Redis cache',queue:'Queue',kafka:'Kafka',search:'Search index',db:'PostgreSQL',replica:'Read replica',shard:'DB shards',obj:'Object storage',worker:'Workers',provider:'External provider',lock:'Lock service',disc:'Service registry',dlq:'Dead-letter queue',mon:'Monitoring',topic:'Pub/sub topic'};
const parse=x=>{const [k,l]=x.split(':');return {k,l:l||LABEL[k]||k}};
const autoEdges=ks=>{const h=k=>ks.includes(k),e=[];const front=h('gw')?'gw':h('lb')?'lb':null;const tiers=['api','ws','svc'].filter(h);
  if(h('cdn'))e.push('client>cdn');if(h('dns'))e.push('client-dns');
  tiers.forEach(t=>e.push(front?`${front}>${t}`:`client>${t}`));if(front)e.push(`client>${front}`);if(h('lb')&&h('gw'))e.push('lb>gw');
  const app=tiers[0];if(app){['cache','search','queue','kafka','topic','lock','disc'].filter(h).forEach(k=>e.push(`${app}>${k}`));['db','shard','obj'].filter(h).forEach(k=>e.push(`${app}>${k}`))}
  const q=h('kafka')?'kafka':h('queue')?'queue':h('topic')?'topic':null;if(q&&h('worker')){e.push(`${q}>worker`);['db','obj','provider'].filter(h).forEach(k=>e.push(`worker>${k}`));if(h('dlq'))e.push('worker~>dlq')}
  if(h('db')&&h('replica'))e.push('db~>replica');if(h('cdn')&&h('obj'))e.push('cdn~>obj:origin');if(h('ws')&&h('api')&&tiers.length>1)e.push('ws-api');
  return [...new Set(e.filter(x=>{const m=x.match(/^(\w+)\W+(\w+)/);return m&&h(m[1].replace(/\d+$/,''))&&h(m[2])}))]};
SDC.layout=ks=>{const rows={};return ks.map(k=>{const t=TIER[k]!=null?TIER[k]:2;rows[t]=(rows[t]||0);const r=rows[t]++;return `${k}@${t},${r}:${LABEL[k]||k}`})};

/* block: builder {reqs:[..], palette:[kinds or 'kind:Label'], ref:{nodes,edges,need:{k:why},optional:{k:why},whyNot:{k:why},tradeoffs:html}} */
SDC.block('builder',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'builder');const pal=b.palette.map(parse);let sel=cx.get('sel',['client']);const why=cx.get('why',{});let cmp=false;
  p.insertAdjacentHTML('beforeend',`<div class="grid2" style="align-items:start"><div class="think"><b>Requirements</b><ul class="clean">${b.reqs.map(r=>`<li>${r}</li>`).join('')}</ul></div>
    <div><span class="evo-k">Available components (click to add or remove)</span><div class="acts palette">${pal.map(c=>`<button class="btn small" data-k="${c.k}" aria-pressed="false">${esc(c.l)}</button>`).join('')}</div><p class="small muted">Add only what a requirement or a number forces. For each component, write the problem it solves.</p></div></div>
    <div class="svgbox" data-dg></div><div class="whys" data-whys></div><div class="row"><button class="btn primary" data-cmp>Compare with a reference architecture</button><button class="btn small" data-clear>Start again</button></div><div data-ref></div>`);
  const $=q=>p.querySelector(q);const lbl=k=>(pal.find(c=>c.k===k)||{l:LABEL[k]||k}).l;
  const draw=()=>{p.querySelectorAll('[data-k]').forEach(x=>{const on=sel.includes(x.dataset.k);x.setAttribute('aria-pressed',String(on));x.textContent=(on?'✓ ':'+ ')+lbl(x.dataset.k)});
    const nodes=sel.map(k=>{const t=TIER[k]!=null?TIER[k]:2;return {k,t}});const rows={};const ns=nodes.map(n=>{const r=rows[n.t]=(rows[n.t]==null?0:rows[n.t]+1);return {id:n.k,c:n.t,r,l:lbl(n.k),sub:''}});
    $('[data-dg]').innerHTML=sel.length>1?SDC.diagram({nodes:ns,edges:autoEdges(sel),cw:160,nw:132},{aria:'Your architecture'}):'<p class="muted small" style="padding:14px">Your diagram appears here as you add components. Connections are drawn automatically from typical request paths.</p>';
    $('[data-whys]').innerHTML=sel.filter(k=>k!=='client'&&k!=='users').map(k=>`<label class="why-row"><span>${esc(lbl(k))}: what problem does it solve?</span><input type="text" data-why="${k}" value="${esc(why[k]||'')}" placeholder="e.g. ${esc(HINTS[k]||'name the requirement or number that forces it')}"></label>`).join('');
    if(cmp)compare()};
  const compare=()=>{const R=b.ref;const need=Object.keys(R.need),opt=Object.keys(R.optional||{});
    const both=need.filter(k=>sel.includes(k)),miss=need.filter(k=>!sel.includes(k)),extra=sel.filter(k=>!need.includes(k)&&!opt.includes(k)&&k!=='client'&&k!=='users'),optHave=opt.filter(k=>sel.includes(k));
    const sc=Math.max(0,both.length/need.length-0.1*extra.length);
    $('[data-ref]').innerHTML=`<div class="panel nested"><div class="row spread"><h4>A reference architecture</h4><span class="tag">${both.length} / ${need.length} core components matched</span></div><p class="small muted">One reasonable design for these requirements, not the only correct answer. Differences are worth discussing, not failures.</p>
      <div class="svgbox">${SDC.diagram(R,{aria:'Reference architecture'})}</div>
      <div class="grid2">${both.length?`<div class="optcard"><h4>✓ In both</h4><ul class="clean small">${both.map(k=>`<li><b>${esc(lbl(k))}</b>: ${R.need[k]}</li>`).join('')}</ul></div>`:''}
      ${miss.length?`<div class="optcard"><h4>○ In the reference, not yours</h4><ul class="clean small">${miss.map(k=>`<li><b>${esc(lbl(k))}</b>: ${R.need[k]}</li>`).join('')}</ul></div>`:''}
      ${extra.length?`<div class="optcard"><h4>＋ You added</h4><ul class="clean small">${extra.map(k=>`<li><b>${esc(lbl(k))}</b>: ${(R.whyNot||{})[k]||'Not required by these requirements yet. Which number or requirement forces it? If none, leave it out and mention it as a future step.'}</li>`).join('')}</ul></div>`:''}
      ${opt.length?`<div class="optcard"><h4>◇ Optional / alternatives</h4><ul class="clean small">${opt.map(k=>`<li><b>${esc(lbl(k))}</b>${optHave.includes(k)?' (you added it)':''}: ${R.optional[k]}</li>`).join('')}</ul></div>`:''}</div>
      ${R.tradeoffs?`<div class="think"><b>Trade-offs to discuss.</b> ${R.tradeoffs}</div>`:''}</div>`;
    if(!cx.isDone()||cx.get('sc',null)!==sc){cx.set('sc',sc);cx.done(sc)}};
  p.addEventListener('click',e=>{const k=e.target.closest('[data-k]');if(k){const id=k.dataset.k;sel=sel.includes(id)?sel.filter(x=>x!==id):[...sel,id];cx.set('sel',sel);draw();p.querySelector(`[data-k="${id}"]`).focus()}
    if(e.target.closest('[data-cmp]')){cmp=true;draw();$('[data-ref]').scrollIntoView({block:'nearest',behavior:SDC.reducedMotion()?'auto':'smooth'})}
    if(e.target.closest('[data-clear]')){sel=['client'];cmp=false;$('[data-ref]').innerHTML='';cx.set('sel',sel);draw()}});
  p.addEventListener('input',e=>{const w=e.target.dataset.why;if(w){why[w]=e.target.value;cx.set('why',why)}});
  draw()},{phase:'design',kind:'interview'});
const HINTS={lb:'spread traffic over several API servers',cache:'80% of reads hit 5% of keys',cdn:'serve video bytes near global users',queue:'transcoding takes minutes, users should not wait',worker:'process jobs from the queue',obj:'store large files cheaply',replica:'read-heavy + survive primary failure',shard:'writes exceed one primary',kafka:'many consumers need the same event stream',search:'full-text search',ws:'server must push messages instantly',db:'source of truth for metadata',gw:'auth + rate limiting at one entry point'};
})();
