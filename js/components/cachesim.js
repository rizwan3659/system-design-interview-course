/* Cache lab: hit, miss, TTL, stale data, invalidation strategies, stampede and Redis failure on one hot key. */
(function(){
'use strict';
const {esc,node}=SDC;
const EXP=[['hit','See a cache hit'],['miss','See a cache miss'],['ttl','Let a key expire (TTL)'],['stale','Read stale data after a write'],['inval','Write with "update DB + delete key" and read fresh data'],['stampede','Trigger a stampede, then fix it with single-flight']];

SDC.block('cachesim',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'cachesim');const DBL=b.dbMs||400,CL=2;
  let s={t:0,db:100,cache:null,up:true,hits:0,misses:0,stale:0,lat:[],log:[],hi:[],strategy:'delete',ttl:60,sf:false};const seen=new Set(cx.get('seen',[]));
  p.insertAdjacentHTML('beforeend',`<div class="grid2" style="align-items:start"><div class="col" style="gap:10px;min-width:0"><div class="svgbox" data-dg></div><div data-m></div></div>
    <div class="col" style="gap:10px"><div class="form" style="grid-template-columns:1fr 1fr"><label>TTL<select data-ttl><option value="30">30 s</option><option value="60" selected>60 s</option><option value="300">5 min</option></select></label><label>On write<select data-str><option value="none">Update DB only</option><option value="delete" selected>Update DB + delete key</option><option value="through">Write-through (DB + cache)</option></select></label></div>
    <div class="row"><button class="btn primary" data-a="read">Read product</button><button class="btn" data-a="read10">Read ×10</button><button class="btn" data-a="tick">Advance clock 30 s</button></div>
    <div class="row"><button class="btn" data-a="write">Admin changes price</button><button class="btn danger" data-a="stampede">Hot key expires + 1,000 requests</button></div>
    <div class="row"><label class="check" style="font-size:.88rem"><input type="checkbox" data-sf> Single-flight (one request rebuilds, others wait)</label><button class="btn danger small" data-a="kill" aria-pressed="false">Kill Redis</button><button class="btn small" data-a="reset">Reset</button></div>
    <div class="log" data-log aria-live="polite"></div></div></div>
    <div class="exp"><span class="evo-k">Experiments to try</span><ul class="ticks-todo" data-exp></ul></div>`);
  const $=q=>p.querySelector(q);
  const L=(c,t)=>{s.log.unshift([c,`t=${s.t}s · ${t}`]);s.log=s.log.slice(0,8)};
  const mark=k=>{if(!seen.has(k)){seen.add(k);cx.set('seen',[...seen]);if(EXP.every(e=>seen.has(e[0])))cx.done(null)}};
  const read=()=>{if(!s.up){s.misses++;s.lat.push(DBL);s.hi=['client','api','db'];L('b',`Redis is down → DB ${DBL} ms. Every read now hits the database.`);return}
    if(s.cache&&s.cache.exp>s.t){s.hits++;s.lat.push(CL);s.hi=['client','api','cache'];const stale=s.cache.v!==s.db;if(stale){s.stale++;mark('stale')}mark('hit');
      L(stale?'r-bad':'r-good',`HIT ₹${s.cache.v} in ${CL} ms${stale?` · STALE: database says ₹${s.db}`:''}`)}
    else{const exp=!!s.cache;s.misses++;s.lat.push(DBL+CL);s.hi=['client','api','cache','db'];s.cache={v:s.db,exp:s.t+s.ttl};mark('miss');if(exp)mark('ttl');
      L('a',`${exp?'Expired → ':''}MISS → DB ₹${s.db} in ${DBL} ms → cached for ${s.ttl} s`)}};
  const act=a=>{
    if(a==='read'){read();if(s.pend&&s.cache&&s.cache.v===s.db){s.pend=false;mark('inval')}}
    if(a==='read10')for(let i=0;i<10;i++)read();
    if(a==='tick'){s.t+=30;s.hi=[];L('',`clock +30 s${s.cache?` · key expires at t=${s.cache.exp}s`:''}`)}
    if(a==='write'){s.db+=10;s.hi=['api','db'];
      if(s.strategy==='none')L('b',`DB price → ₹${s.db}. Cache untouched: readers see the old price until TTL.`);
      if(s.strategy==='delete'){s.cache=null;L('a',`DB price → ₹${s.db}, cache key deleted: next read reloads it.`);s.pend=true}
      if(s.strategy==='through'){if(s.up)s.cache={v:s.db,exp:s.t+s.ttl};L('a',`DB price → ₹${s.db} and cache set to ₹${s.db} (write-through). Slower writes; two writers can still race.`)}}
    if(a==='stampede'){s.cache=null;const q=s.sf?1:1000;s.hi=['client','api','cache','db'];L(s.sf?'r-good':'r-bad',s.sf?`1,000 misses → single-flight: 1 DB query, 999 wait ~${DBL} ms then read the new value.`:`1,000 misses at once → 1,000 identical DB queries. DB CPU spikes, latency climbs, maybe an outage.`);
      s.cache={v:s.db,exp:s.t+s.ttl};s.misses+=1000;s.lat.push(s.sf?DBL:DBL*6);if(s.sf&&s.sNo)mark('stampede');if(!s.sf)s.sNo=true;s.lastStampede=q}
    if(a==='kill'){s.up=!s.up;if(!s.up)s.cache=null;L(s.up?'a':'r-bad',s.up?'Redis back, but empty (cold cache): expect misses until it warms.':'Redis killed. Can the database absorb all reads?')}
    if(a==='reset'){s=Object.assign(s,{t:0,db:100,cache:null,up:true,hits:0,misses:0,stale:0,lat:[],log:[],hi:[],lastStampede:0})}
    draw()};
  const draw=()=>{const tot=s.hits+s.misses,avg=s.lat.length?s.lat.reduce((a,c)=>a+c,0)/s.lat.length:0;
    const states={};if(!s.up)states.cache='down';if(s.lastStampede===1000)states.db='hot';
    $('[data-dg]').innerHTML=SDC.diagram({nodes:['client@0,1','api@1,1:API|cache-aside',`cache@2,0:Redis|${!s.up?'down':s.cache?'₹'+s.cache.v+' · expires t='+s.cache.exp+'s':'empty'}`,`db@2,1:Database|price ₹${s.db}`],edges:['client>api','api>cache:1. GET','api>db:2. on miss'],cw:160},{hi:s.hi,states,aria:'Cache-aside: client, API, Redis, database'});
    $('[data-m]').innerHTML=SDC.metricsHTML([['Hit rate',tot?Math.round(s.hits/tot*100)+'%':'—',''],['Average latency',s.lat.length?SDC.M.ms(avg):'—',avg>200?'warn':''],['Stale reads',String(s.stale),s.stale?'warn':''],['Clock','t = '+s.t+' s','']].concat(s.lastStampede?[['DB queries in last stampede',s.lastStampede.toLocaleString(),s.lastStampede>1?'bad':'ok']]:[]));
    $('[data-log]').innerHTML=s.log.length?s.log.map(l=>`<div class="${l[0]}">${esc(l[1])}</div>`).join(''):'<span class="muted">Press "Read product". The first read is a miss.</span>';
    $('[data-exp]').innerHTML=EXP.map(e=>`<li class="${seen.has(e[0])?'done':''}"><span aria-hidden="true">${seen.has(e[0])?'✓':'○'}</span> ${e[1]}${seen.has(e[0])?' <span class="sr-only">(done)</span>':''}</li>`).join('');
    p.querySelector('[data-a=kill]').setAttribute('aria-pressed',String(!s.up));p.querySelector('[data-a=kill]').textContent=s.up?'Kill Redis':'Restart Redis'};
  p.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a)act(a.dataset.a)});
  p.addEventListener('change',e=>{if(e.target.matches('[data-ttl]')){s.ttl=+e.target.value;L('',`TTL set to ${s.ttl} s (applies to new entries)`);draw()}if(e.target.matches('[data-str]'))s.strategy=e.target.value;if(e.target.matches('[data-sf]'))s.sf=e.target.checked});
  draw()},{phase:'experiment',kind:'lab'});
})();
