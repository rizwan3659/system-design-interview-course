/* Decision labs (choose, then justify) and architecture comparisons. */
(function(){
'use strict';
const {esc,node}=SDC;

/* block: decide
   items:[{q, opts:['SQL','NoSQL'], a:[indexes that are defensible], reasons:[[text, drives?]], explain, whyNot}]
   Step 1 choose an option, step 2 tick the reasons that drove it, step 3 compare. */
SDC.block('decide',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'decide');const st=cx.get('st',{});let i=0;
  const nav=node('div','stepper-nav'),body=node('div','col');body.style.gap='12px';body.setAttribute('aria-live','polite');p.append(nav,body);
  const score=()=>{const d=Object.keys(st).filter(k=>st[k].checked);return d.length?d.reduce((s,k)=>s+st[k].score,0)/d.length:null};
  const draw=()=>{nav.innerHTML=b.items.map((x,j)=>`<button data-n="${j}" ${j===i?'aria-current="step"':''} class="${st[j]&&st[j].checked?'done':''}">${j+1}. ${esc(x.short||x.q.replace(/<[^>]+>/g,'').slice(0,28))}</button>`).join('');
    const it=b.items[i],s=st[i]||{c:null,r:[]};const good=Array.isArray(it.a)?it.a:[it.a];
    let h=`<div class="think"><b>Scenario ${i+1} of ${b.items.length}.</b> ${it.q}</div><div><span class="evo-k">Step 1 · ${esc(b.ask||'Your choice')}</span><div class="acts">${it.opts.map((o,j)=>`<button class="btn" data-c="${j}" aria-pressed="${s.c===j}">${esc(o)}</button>`).join('')}</div></div>`;
    if(s.c!=null){h+=`<div><span class="evo-k">Step 2 · Why? Tick every reason that drove your choice</span><div class="col" style="gap:6px">${it.reasons.map((r,j)=>`<label class="check"><input type="checkbox" data-r="${j}" ${s.r.includes(j)?'checked':''} ${s.checked?'disabled':''}><span>${r[0]}${s.checked?` <span class="tag ${r[1]?'green':'red'}">${r[1]?'key reason':'not decisive here'}</span>`:''}</span></label>`).join('')}</div></div>`;
      h+=s.checked?`<div class="answer"><p><span class="tag ${good.includes(s.c)?'green':'amber'}">${good.includes(s.c)?'Defensible choice':'Harder to defend'}</span> ${it.explain}</p>${it.whyNot?`<p><b>Why not the alternative?</b> ${it.whyNot}</p>`:''}</div><div class="row">${i<b.items.length-1?`<button class="btn primary" data-next>Next scenario →</button>`:'<span class="muted small">All scenarios done.</span>'}<button class="btn small" data-redo>Redo this one</button></div>`:`<div><button class="btn primary" data-check ${s.r.length?'':'disabled'}>Check my reasoning</button></div>`}
    body.innerHTML=h};
  p.addEventListener('click',e=>{const n=e.target.closest('[data-n]'),c=e.target.closest('[data-c]');const s=st[i]=st[i]||{c:null,r:[]};
    if(n&&nav.contains(n)){i=+n.dataset.n;draw();return}
    if(c&&!s.checked){s.c=+c.dataset.c;cx.set('st',st);draw()}
    if(e.target.closest('[data-check]')){const it=b.items[i],good=Array.isArray(it.a)?it.a:[it.a];const keyR=it.reasons.map((r,j)=>r[1]?j:-1).filter(j=>j>=0);
      const hit=s.r.filter(j=>keyR.includes(j)).length,wrong=s.r.length-hit;s.checked=true;s.score=Math.max(0,(good.includes(s.c)?0.5:0)+0.5*(hit-wrong*0.5)/Math.max(1,keyR.length));cx.set('st',st);
      if(b.items.every((_,j)=>st[j]&&st[j].checked))cx.done(score());draw()}
    if(e.target.closest('[data-next]')){i++;draw()}
    if(e.target.closest('[data-redo]')){st[i]={c:null,r:[]};cx.set('st',st);draw()}});
  p.addEventListener('change',e=>{const r=e.target.closest('[data-r]');if(!r)return;const s=st[i];const j=+r.dataset.r;s.r=r.checked?[...s.r,j]:s.r.filter(x=>x!==j);cx.set('st',st);draw()});
  draw()},{phase:'predict',kind:'quiz'});

/* block: compare  {options:[{name, nodes, edges}], items:[{q, a, why}]} — same scenarios, different architectures */
SDC.block('compare',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'compare');const ans=cx.get('ans',{});
  p.insertAdjacentHTML('beforeend',`<div class="grid2">${b.options.map((o,i)=>`<div class="optcard"><h4>Option ${String.fromCharCode(65+i)} · ${esc(o.name)}</h4><div class="svgbox">${SDC.diagram(o,{aria:o.name})}</div>${o.note?`<p class="small muted">${o.note}</p>`:''}</div>`).join('')}</div>`);
  const g=node('div','grid2');p.append(g);
  const draw=()=>{g.innerHTML=b.items.map((x,i)=>{const a=ans[i];const ok=a===x.a;return `<div class="qcard ${a==null?'':ok?'right':'wrong'}"><div>For <b>${x.q}</b>, which would you choose?</div><div class="acts">${b.options.map((o,j)=>`<button class="btn small" data-i="${i}" data-j="${j}" aria-pressed="${a===j}">Option ${String.fromCharCode(65+j)}</button>`).join('')}</div>${a!=null?`<p class="fb"><span class="tag ${ok?'green':'red'}">${ok?'Agreed':'Reconsider'}</span> ${x.why}</p>`:''}</div>`}).join('')};
  g.addEventListener('click',e=>{const x=e.target.closest('[data-j]');if(!x)return;ans[x.dataset.i]=+x.dataset.j;cx.set('ans',ans);
    if(Object.keys(ans).length===b.items.length)cx.done(b.items.filter((it,i)=>ans[i]===it.a).length/b.items.length);draw()});
  draw()},{phase:'predict',kind:'quiz'});
})();
