/* Sharding lab: hash(user_id) % N vs consistent hashing on 20 named users. Predict, add a shard, count moved keys. */
(function(){
'use strict';
const {esc,node}=SDC;
const NAMES=['A','B','C','D','E','F','G','H'];
SDC.block('shardsim',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'shardsim');const U=Array.from({length:b.users||20},(_,i)=>'user_'+(i+1));const V=b.vnodes||40;
  let n=3,added=false,algo='mod',pred=cx.get('pred',null);const tried=new Set(cx.get('tried',[]));
  p.insertAdjacentHTML('beforeend',`<div class="row" role="group" aria-label="Partitioning function"><button class="btn" data-al="mod" aria-pressed="true">hash(user_id) % N</button><button class="btn" data-al="ring" aria-pressed="false">Consistent hashing (ring, ${V} virtual nodes per shard)</button></div>
    <div class="row"><label style="flex-direction:row;align-items:center;gap:8px">Shards now<select data-n>${[2,3,4,5,6].map(x=>`<option ${x===3?'selected':''}>${x}</option>`).join('')}</select></label><button class="btn primary" data-add>Add one shard</button><button class="btn" data-undo>Back to N</button></div>
    <div data-pred></div><div class="shard-wrap" data-grid></div><div class="outcome" data-out aria-live="polite"></div>`);
  const $=q=>p.querySelector(q);
  const assign=(a,k)=>a==='mod'?SDC.M.modAssign(U,k):SDC.M.ringAssign(U,k,V);
  const draw=()=>{p.querySelectorAll('[data-al]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.al===algo)));
    const before=assign(algo,n),after=assign(algo,n+1),cur=added?after:before,k=added?n+1:n;const mv=SDC.M.moved(before,after);
    const pr=$('[data-pred]');
    if(algo==='mod'&&!added&&pred==null)pr.innerHTML=`<div class="predict-q"><span class="evo-k">Predict first</span><p>Going from ${n} to ${n+1} shards with <code>% N</code>, about how many of the ${U.length} users will move to a different shard?</p><div class="acts">${[['About 1/'+(n+1)+' of them',0],['About half',1],['Most of them',2]].map(o=>`<button class="btn small" data-p="${o[1]}">${o[0]}</button>`).join('')}</div></div>`;
    else if(pred!=null&&algo==='mod'&&added)pr.innerHTML=`<p class="fb"><span class="tag ${pred===2?'green':'amber'}">${pred===2?'You predicted it':'Surprise'}</span> ${mv} of ${U.length} moved. With % N almost every key's remainder changes when N changes.</p>`;else pr.innerHTML='';
    $('[data-grid]').innerHTML=`<div class="shards">${Array.from({length:k},(_,s)=>`<div class="shard ${added&&s===n?'new':''}"><div class="shard-h">Shard ${NAMES[s]}${added&&s===n?' <span class="tag">new</span>':''}</div><div class="chips">${U.map((u,i)=>cur[i]===s?`<span class="chip ${added&&before[i]!==after[i]?'moved':''}" title="${added&&before[i]!==after[i]?'moved from shard '+NAMES[before[i]]:''}">${added&&before[i]!==after[i]?'↪ ':''}${u}</span>`:'').join('')}</div><div class="small muted">${cur.filter(x=>x===s).length} users</div></div>`).join('')}</div>${algo==='ring'?ringSVG(k):''}`;
    const o=$('[data-out]');if(!added){o.className='outcome';o.innerHTML=`Each user lives on exactly one shard. Press <b>Add one shard</b> and count how many move.`;return}
    const mvMod=SDC.M.moved(assign('mod',n),assign('mod',n+1)),mvRing=SDC.M.moved(assign('ring',n),assign('ring',n+1));
    o.className='outcome '+(algo==='mod'?'bad':'ok');
    o.innerHTML=`<b>${mv} of ${U.length} users moved</b> (marked ↪). Ideal minimum ≈ ${Math.round(U.length/(n+1))} (only the new shard's share). <br>${tried.has('mod')&&tried.has('ring')?`<b>Compare:</b> % N moved ${mvMod}, the ring moved ${mvRing}. Every moved user means copying data and a cache miss during rebalancing.`:`Now switch to the ${algo==='mod'?'consistent hashing':'% N'} version and add a shard again.`}<br><span class="small">Small samples are lumpy: with 20 users the ring may move a few more or fewer than the ideal. Over millions of keys it converges to ~1/(N+1).</span>`};
  const ringSVG=k=>{const pts=SDC.M.ring(k,Math.min(V,6)),cols=['var(--accent)','var(--good)','var(--warn)','var(--marker)','var(--lld)','var(--muted)','var(--ink)'];const P=a=>[150+105*Math.cos(a),150+105*Math.sin(a)];const ang=h=>h/4294967296*Math.PI*2-Math.PI/2;
    return `<div class="svgbox ring-box"><svg viewBox="0 0 300 300" role="img" aria-label="Hash ring with ${k} shards"><circle cx="150" cy="150" r="105" fill="none" stroke="var(--line)" stroke-width="8"/>${pts.map(x=>{const [cx2,cy2]=P(ang(x[0]));return `<rect x="${cx2-6}" y="${cy2-6}" width="12" height="12" rx="2" fill="${cols[x[1]]}"><title>Shard ${NAMES[x[1]]}</title></rect>`}).join('')}${U.map(u=>{const [cx2,cy2]=P(ang(SDC.M.fnv(u)));return `<circle cx="${cx2}" cy="${cy2}" r="3" fill="var(--ink)"><title>${u}</title></circle>`}).join('')}<text x="150" y="146" text-anchor="middle" font-size="12" fill="var(--ink)" font-weight="600">${k} shards</text><text x="150" y="163" text-anchor="middle" font-size="10" fill="var(--muted)">■ shard points (6 shown) · ● users</text></svg><p class="small muted">A user belongs to the first shard point clockwise. A new shard only takes keys from its neighbours.</p></div>`};
  p.addEventListener('click',e=>{const al=e.target.closest('[data-al]'),pp=e.target.closest('[data-p]');
    if(al){algo=al.dataset.al;added=false;draw()}
    if(pp){pred=+pp.dataset.p;cx.set('pred',pred);SDC.act.record(key+'.p',{t:'predict',s:ses.id,c:cx.c,score:pred===2?1:0});draw()}
    if(e.target.closest('[data-add]')){if(algo==='mod'&&pred==null){$('[data-pred] button')?.focus();return}added=true;tried.add(algo);cx.set('tried',[...tried]);if(tried.size===2)cx.done(pred===2?1:0.6);draw()}
    if(e.target.closest('[data-undo]')){added=false;draw()}});
  p.addEventListener('change',e=>{if(e.target.matches('[data-n]')){n=+e.target.value;added=false;draw()}});
  draw()},{phase:'experiment',kind:'lab'});
})();
