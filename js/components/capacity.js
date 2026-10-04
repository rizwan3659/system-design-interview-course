/* CapacityCalculator: the student calculates first, then checks each answer and sees the working. */
(function(){
'use strict';
const {esc,node}=SDC;
const M=()=>SDC.M;
const SCEN=[
  {name:'Photo-sharing app',dau:10e6,rpu:20,ratio:100,obj:2000,peak:3},
  {name:'URL shortener',dau:20e6,rpu:5,ratio:100,obj:500,peak:3},
  {name:'Chat app',dau:50e6,rpu:40,ratio:2,obj:300,peak:2.5},
  {name:'News feed',dau:100e6,rpu:30,ratio:50,obj:1000,peak:3},
  {name:'Ride-hailing locations',dau:2e6,rpu:2000,ratio:1,obj:100,peak:2},
  {name:'Online code judge',dau:500e3,rpu:30,ratio:10,obj:5000,peak:5}];
const FIELDS={
  reqDay:{l:'Requests / day',k:'count',f:(s,r)=>`${M().num(s.dau)} DAU × ${s.rpu} requests = <b>${M().num(r.reqDay)} requests/day</b>`},
  qps:{l:'Average QPS',k:'count',f:(s,r)=>`${M().num(r.reqDay)} ÷ 86,400 s ≈ <b>${M().num(r.qps)} QPS</b> <span class="muted">(shortcut: 1 M/day ≈ 12/s)</span>`},
  peak:{l:'Peak QPS',k:'count',f:(s,r)=>`${M().num(r.qps)} × ${s.peak} (peak factor) ≈ <b>${M().num(r.peak)} QPS</b>`},
  writesDay:{l:'Writes / day',k:'count',f:(s,r)=>`${M().num(r.reqDay)} × 1/(${s.ratio}+1) ≈ <b>${M().num(r.writesDay)} writes/day</b> <span class="muted">(read:write = ${s.ratio}:1)</span>`},
  storageDay:{l:'New storage / day',k:'bytes',f:(s,r)=>`${M().num(r.writesDay)} writes × ${M().bytes(s.obj)} ≈ <b>${M().bytes(r.storageDay)}/day</b>`},
  storageYear:{l:'Storage / year',k:'bytes',f:(s,r)=>`${M().bytes(r.storageDay)} × 365 ≈ <b>${M().bytes(r.storageYear)}/year</b> <span class="muted">(before replication: ×3 for copies)</span>`},
  bandwidth:{l:'Read bandwidth (avg, per s)',k:'bytes',f:(s,r)=>`${M().num(r.readQps)} reads/s × ${M().bytes(s.obj)} ≈ <b>${M().bytes(r.bandwidth)}/s</b>`},
  cache:{l:'Cache size (80/20 rule)',k:'bytes',f:(s,r)=>`20% × ${M().num(r.readsDay)} reads/day × ${M().bytes(s.obj)} ≈ <b>${M().bytes(r.cache)}</b> <span class="muted">(cache the hot 20% of a day's reads)</span>`}};

/* block: capacity  {scenarios?:[…], ask?:[field keys], tol?} */
SDC.block('capacity',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'capacity');const list=b.scenarios||SCEN;const ask=b.ask||['reqDay','qps','peak','storageDay','storageYear','bandwidth','cache'];
  let si=cx.get('si',0)%list.length,vals=cx.get('vals',{}),checked=false,shown=false;
  const wrap=node('div','col');wrap.style.gap='14px';p.append(wrap);
  const draw=()=>{const s=list[si],r=M().capacity(s);
    wrap.innerHTML=`<div class="scenario"><div class="row spread"><b>Scenario: ${esc(s.name)}</b>${list.length>1?`<button class="btn small" data-new>New scenario (${si+1}/${list.length})</button>`:''}</div>
      <div class="givens"><span>DAU <b>${M().num(s.dau)}</b></span><span>Requests / user / day <b>${s.rpu}</b></span><span>Read : write <b>${s.ratio}:1</b></span><span>Average object <b>${M().bytes(s.obj)}</b></span><span>Peak factor <b>${s.peak}×</b></span></div></div>
      <p class="small muted">Work it out on paper first. Type answers like <code>200M</code>, <code>2,315</code>, <code>7k</code>, <code>400 GB</code>. Anything within ±40% counts: estimation is about the order of magnitude.</p>
      <div class="capgrid">${ask.map(f=>{const F=FIELDS[f],v=vals[si+':'+f]||'';const got=M().parseQty(v,F.k),ok=checked&&M().close(got,r[f]);return `<label class="capf ${checked?(ok?'ok':'bad'):''}">${F.l}<input type="text" inputmode="decimal" data-f="${f}" value="${esc(v)}" placeholder="${F.k==='bytes'?'e.g. 40 GB':'e.g. 2.3k'}" autocomplete="off">${checked?`<span class="capr">${ok?'✓ close enough':v?'✕ expected ≈ '+(F.k==='bytes'?M().bytes(r[f]):M().num(r[f])):'— not answered'}</span>`:''}</label>`}).join('')}</div>
      <div class="row"><button class="btn primary" data-check>Check answers</button><button class="btn" data-work>${shown?'Hide':'Show'} formulas and working</button></div>
      <div class="answer" ${shown?'':'hidden'}><ol class="work">${ask.map(f=>`<li><span class="muted">${FIELDS[f].l}:</span> ${FIELDS[f].f(s,r)}</li>`).join('')}</ol><p><b>So what?</b> ${verdict(s,r)}</p></div>`};
  const verdict=(s,r)=>[r.peak<2000?'Peak traffic fits on a couple of app servers.':r.peak<50000?`~${Math.ceil(r.peak/2000)} app servers at peak behind a load balancer.`:`~${Math.ceil(r.peak/2000)} app servers at peak: many servers, autoscaling and probably multiple regions.`,
    r.writesDay/86400*s.peak>1500?'Peak writes exceed what one relational primary comfortably handles: plan partitioning.':'Writes fit on one primary database.',
    r.storageYear>5e12?'Storage outgrows one machine within a year: shard or use object storage for blobs.':'Storage fits on one database for now.',
    r.cache<200e9?'The hot set fits in a small Redis cluster.':'The hot set needs a sizeable distributed cache.'].join(' ');
  wrap.addEventListener('input',e=>{const f=e.target.dataset.f;if(!f)return;vals[si+':'+f]=e.target.value;cx.set('vals',vals);if(checked){checked=false;const lab=e.target.closest('.capf');lab.className='capf';const cr=lab.querySelector('.capr');if(cr)cr.remove()}});
  wrap.addEventListener('click',e=>{if(e.target.closest('[data-check]')){checked=true;const s=list[si],r=M().capacity(s);const n=ask.filter(f=>M().close(M().parseQty(vals[si+':'+f],FIELDS[f].k),r[f])).length;cx.done(n/ask.length);draw();wrap.querySelector('.capgrid').focus?.()}
    if(e.target.closest('[data-work]')){shown=!shown;if(shown&&!cx.isDone())cx.done(0);draw()}
    if(e.target.closest('[data-new]')){si=(si+1)%list.length;cx.set('si',si);checked=false;shown=false;draw()}});
  draw()},{phase:'experiment',kind:'lab'});
})();
