/* Latency intuition: order operations from fastest to slowest (drag/drop or ↑↓ buttons), then reveal. */
(function(){
'use strict';
const {esc,node}=SDC;
const ITEMS=[
  ['ram','Read a value from RAM',1e2,'~100 ns','Why in-process caches are almost free.'],
  ['ssd','Random read from a local SSD',1e5,'~0.1 ms','Why indexed reads from disk are still fast.'],
  ['redis','Redis GET over the network (same data centre)',5e5,'~0.5 ms','A network hop dominates: Redis is fast because it avoids disk, not because the network is free.'],
  ['db','Indexed query on a same-region database',3e6,'~1–5 ms','Includes a network hop, parsing and possibly disk.'],
  ['hdd','Seek on a spinning hard disk',8e6,'~5–10 ms','Why random access to old disks hurt and logs are append-only.'],
  ['xreg','Request to another region (e.g. Mumbai → Frankfurt)',1.2e8,'~100–150 ms','Speed of light. Why CDNs, regional replicas and fewer round trips matter.']];
const seeded=n=>{const a=Array.from({length:n},(_,i)=>i);let s=7;for(let i=n-1;i>0;i--){s=(s*48271)%2147483647;const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};

/* block: latency  {items?:[[id,label,ns,approx,why]]} */
SDC.block('latency',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'latency');const IT=b.items||ITEMS;let order=cx.get('order',null)||seeded(IT.length);let checked=false;let drag=null;
  const ul=node('ol','lat-list');ul.setAttribute('aria-label','Operations, fastest first');const row=node('div','row','<button class="btn primary" data-check>Check my order</button><button class="btn" data-reset>Shuffle again</button>');const res=node('div','col');res.setAttribute('aria-live','polite');
  p.append(node('p','small muted','Put the fastest at the top. Drag the rows, or use the ↑ ↓ buttons (keyboard friendly).'),ul,row,res);
  const correct=IT.map((_,i)=>i).sort((a,c)=>IT[a][2]-IT[c][2]);
  const draw=()=>{ul.innerHTML=order.map((ix,pos)=>{const it=IT[ix],ok=checked&&correct[pos]===ix;return `<li draggable="true" data-pos="${pos}" class="${checked?(ok?'ok':'bad'):''}"><span class="lat-h" aria-hidden="true">⋮⋮</span><span class="lat-l">${esc(it[1])}</span>${checked?`<span class="lat-m">${ok?'✓':'✕'}</span>`:''}<span class="lat-b"><button class="btn small" data-up="${pos}" aria-label="Move ${esc(it[1])} up" ${pos===0?'disabled':''}>↑</button><button class="btn small" data-dn="${pos}" aria-label="Move ${esc(it[1])} down" ${pos===order.length-1?'disabled':''}>↓</button></span></li>`}).join('')};
  const move=(a,c)=>{const x=order.splice(a,1)[0];order.splice(c,0,x);checked=false;res.innerHTML='';cx.set('order',order);draw()};
  ul.addEventListener('click',e=>{const u=e.target.closest('[data-up]'),d=e.target.closest('[data-dn]');if(u){move(+u.dataset.up,+u.dataset.up-1);ul.querySelector(`[data-up="${+u.dataset.up-1}"]`)?.focus()}if(d){move(+d.dataset.dn,+d.dataset.dn+1);ul.querySelector(`[data-dn="${+d.dataset.dn+1}"]`)?.focus()}});
  ul.addEventListener('dragstart',e=>{const li=e.target.closest('li');if(!li)return;drag=+li.dataset.pos;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(drag))}catch(_){}});
  ul.addEventListener('dragover',e=>{e.preventDefault()});
  ul.addEventListener('drop',e=>{e.preventDefault();const li=e.target.closest('li');if(li==null||drag==null)return;move(drag,+li.dataset.pos);drag=null});
  row.addEventListener('click',e=>{if(e.target.closest('[data-check]')){checked=true;const n=order.filter((ix,pos)=>correct[pos]===ix).length;cx.done(n/IT.length);draw();
      const max=Math.log10(IT[correct[correct.length-1]][2]);
      res.innerHTML=`<p><b>${n} / ${IT.length}</b> in the right place.</p><div class="answer"><b>Approximate order (varies with hardware, distance and load)</b>${correct.map(ix=>{const it=IT[ix];return `<div class="lat-bar"><span>${esc(it[1])}</span><span class="bar-track"><i style="width:${Math.max(3,Math.log10(it[2])/max*100)}%"></i></span><b class="mono">${it[3]}</b><span class="small muted">${it[4]}</span></div>`}).join('')}<p class="small">Bars use a <b>log scale</b>: each step to the right is ~10× slower. A cross-region call costs about a million RAM reads. <b>Design rule:</b> avoid round trips on the hot path, keep hot data in memory, and keep users close to their data.</p></div>`}
    if(e.target.closest('[data-reset]')){order=[...order].sort(()=>Math.random()-.5);checked=false;res.innerHTML='';cx.set('order',order);draw()}});
  draw()},{phase:'predict',kind:'lab'});
})();
