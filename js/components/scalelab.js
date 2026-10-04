/* Scaling lab: TrafficSlider + architecture controls + MetricsPanel + FailureSimulator on a deterministic model (SDC.M.scale).
   Teaches measure → identify the bottleneck → change one thing → measure again. */
(function(){
'use strict';
const {esc,node}=SDC;
const M=()=>SDC.M;

const WHY={
  api:['More API servers add CPU for request handling.','Needs a load balancer, servers must be stateless, and every server opens more database connections.'],
  lb:['A load balancer spreads requests over servers and stops sending to unhealthy ones.','The load balancer must itself be redundant; tempting sticky sessions hurt even spreading.'],
  cache:['Redis serves repeated reads from memory, so most reads never reach the database.','Stale data, invalidation on writes, stampedes when hot keys expire, and a cold cache after restarts.'],
  replicas:['Read replicas copy the primary and serve reads, and can be promoted if the primary dies.','Replication lag: a user may not see their own write; failover needs care; writes still go to one primary.'],
  queue:['A queue takes slow side work (analytics, emails, processing) out of the request path.','Results become eventual; retries cause duplicates (make handlers idempotent); poison messages need a dead-letter queue; watch queue age.'],
  workers:['Workers drain the queue; throughput = workers × rate per worker.','Too few and the backlog grows; scale on queue depth; handlers must be idempotent.'],
  shards:['Sharding splits data and writes across several primaries.','Routing by key, cross-shard queries and joins, rebalancing, and hot shards. Usually the last resort.'],
  cdn:['A CDN serves cacheable responses from edges near users, off your servers.','Only cacheable content benefits; purging/invalidation and cost; personalised responses cannot be cached.'],
  regions:['A second region puts servers near global users and survives a region outage.','Cross-region replication lag, write conflicts or a single write region, double the cost and operations.'],
  resilient:['Timeouts, retries with exponential backoff and jitter, and a circuit breaker.','Retries amplify load (retry storms) and need idempotency; fallbacks show degraded data.']};
const FAILS={db:'Kill primary DB',cache:'Kill Redis',api:'Kill an API server',slowdb:'Slow DB to 2 s',drop:'Drop 20% of requests',worker:'Stop workers',partition:'Network partition'};
const FAIL_TEACH={db:'Replication + automatic failover; serve hot reads from the cache meanwhile.',cache:'Size the database to survive a cold cache, warm gradually, single-flight per key.',api:'Run N+1 servers behind a load balancer with health checks.',slowdb:'Timeouts on every call, a circuit breaker, and fallbacks (cached or default data).',drop:'Retries with exponential backoff + jitter; idempotency so a retry cannot double-apply.',worker:'Alert on queue age, autoscale workers, dead-letter queue for poison messages.',partition:'Decide per feature: reject (consistent) or serve possibly stale data (available).'};
const DEF_ST={ti:0,api:1,lb:false,cache:false,replicas:0,shards:1,queue:false,workers:0,cdn:false,regions:1,resilient:false,fail:{}};
const step=n=>n<10?1:n<50?5:n<200?25:100;

SDC.block('scalelab',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'scalelab');const cfg=b.model||{};const steps=b.steps||[100,1000,10000,100000,1000000];
  const allow=b.allow||['api','lb','cache','replicas','queue','workers','shards','cdn','regions','resilient'],fails=b.fails||Object.keys(FAILS);
  let st=Object.assign({},DEF_ST,b.start||{},cx.get('st',{}));st.fail=Object.assign({},st.fail);let prev=null,msg=null,diag=cx.get('diag',{tries:0,ok:0}),asked=null,lastAnswered=null;
  p.insertAdjacentHTML('beforeend',`${b.system?`<div class="think">${b.system}</div>`:''}<div class="sl-top"><label class="sl-traffic">Traffic: <b data-tv></b><input type="range" min="0" max="${steps.length-1}" step="1" data-ti aria-describedby="${key}-tl"></label><div class="sl-ticks" id="${key}-tl" aria-hidden="true">${steps.map(s=>`<span>${M().num(s)}</span>`).join('')}</div></div>
    <div class="sl-grid"><div class="col" style="gap:10px;min-width:0"><div class="svgbox" data-dg></div><p class="sr-only" data-sr aria-live="polite"></p><div data-metrics></div></div>
    <div class="col sl-side" style="gap:12px"><div><h4>Change the architecture</h4><div class="sl-ctl" data-ctl></div></div><div><h4>Break something</h4><div class="fails" data-fails>${fails.map(f=>`<button class="btn danger small" data-fail="${f}" aria-pressed="false">${FAILS[f]}</button>`).join('')}<button class="btn small" data-clear>Clear failures</button></div></div></div></div>
    <div data-diag></div><div class="outcome" data-out aria-live="polite"></div>
    ${b.presets!==false?`<details class="whynot"><summary>Reference architectures (spoilers: try first)</summary><p class="small muted">One reasonable architecture per scale. Not the only correct answer.</p><div class="row" data-presets>${(b.presets||DEFAULT_PRESETS).map((x,i)=>`<button class="btn small" data-pre="${i}">${esc(x.l)}</button>`).join('')}</div></details>`:''}`);
  const $=s=>p.querySelector(s);const ti=$('[data-ti]');
  const ctlHTML=()=>{const c=[];
    const num=(k,label,min,max,dis)=>allow.includes(k)?`<div class="sl-num ${dis?'dis':''}"><span>${label}</span><span class="row" style="gap:4px"><button class="btn small" data-dec="${k}" aria-label="Fewer ${label}" ${st[k]<=min||dis?'disabled':''}>−</button><b class="mono" aria-live="polite">${st[k]}</b><button class="btn small" data-inc="${k}" aria-label="More ${label}" ${st[k]>=max||dis?'disabled':''}>+</button></span></div>`:'';
    const tog=(k,label)=>allow.includes(k)?`<button class="btn small" data-tog="${k}" aria-pressed="${!!st[k]}">${st[k]?'✓ ':'+ '}${label}</button>`:'';
    c.push(num('api','API servers',1,2000));c.push(`<div class="row" style="gap:6px">${tog('lb','Load balancer')}${tog('cache','Redis cache')}${tog('cdn','CDN')}${tog('queue','Queue')}</div>`);
    c.push(num('replicas','Read replicas',0,5));c.push(num('workers','Workers',0,2000,!st.queue));c.push(num('shards','DB shards',1,32));
    c.push(`<div class="row" style="gap:6px">${allow.includes('regions')?`<button class="btn small" data-tog="regions" aria-pressed="${st.regions>1}">${st.regions>1?'✓ ':'+ '}Second region</button>`:''}${tog('resilient','Timeouts + retries + circuit breaker')}</div>`);
    return c.join('')};
  const diagram=m=>{const n=['client@0,1:Clients|'+M().num(steps[st.ti])+' req/s'],e=[],states={},met={};
    const pc=u=>u>=0.9?'hot':u>=0.7?'warn':'';
    if(st.cdn){n.push('cdn@1,0');e.push('client>cdn')}
    if(st.regions>1){n.push('dns@0,0:Geo DNS|nearest region');e.push('client-dns')}
    const front=st.lb?'lb':'api';if(st.lb){n.push('lb@1,1');e.push('client>lb','lb>api')}else e.push('client>api');
    n.push(`api@2,1:${st.api>1?'API servers ×'+st.api:'API server'}|${st.lb||st.api===1?'stateless':'only 1 gets traffic'}`);met.api='CPU '+M().pct(m.apiU);states.api=st.fail.api&&st.api===1?'down':pc(m.apiU);
    if(st.cache){n.push('cache@3,0:'+(st.shards>1?'Redis cluster':'Redis')+'|cache');e.push('api>cache:1. read');met.cache=st.fail.cache?'down':'hit '+M().pct(m.hitRate);states.cache=st.fail.cache?'down':pc(m.redisU)}
    n.push(`db@3,1:${st.shards>1?'DB shards ×'+st.shards:'Primary DB'}|${st.fail.db&&st.replicas>0?'promoted replica':'writes'}`);e.push(st.cache?'api>db:2. on miss':'api>db');met.db=m.dbUp?'CPU '+M().pct(m.dbU):'down';states.db=!m.dbUp?'down':st.fail.slowdb?'hot':pc(Math.max(m.dbU,m.connU));
    if(st.replicas>0){n.push(`replica@4,1:Replicas ×${st.replicas}${st.shards>1?'/shard':''}|reads`);e.push('db~>replica:replicate');met.replica='CPU '+M().pct(m.repU);states.replica=st.fail.partition?'warn':pc(m.repU)}
    if(st.queue){n.push('queue@2,2:Queue|'+(m.qGrowth>0?'growing +'+M().num(m.qGrowth)+'/s':'stable'));e.push('api>queue:event');states.queue=m.qGrowth>0?'hot':'';
      n.push(`worker@3,2:Workers ×${st.workers}|${st.fail.worker?'stopped':M().num(m.workerCapTot)+' jobs/s'}`);e.push('queue>worker','worker>db');states.worker=st.fail.worker||st.workers===0?'down':''}
    if(st.regions>1){n.push('region2@4,2:Region B|full copy');e.push('db~>region2:async')}
    return {nodes:n,edges:e,states,met}};
  const metrics=m=>{const lv=u=>u>=0.9?'bad':u>=0.7?'warn':'ok';const rows=[['API CPU',M().pct(m.apiU),lv(m.apiU)]];
    if(st.cache)rows.push(['Redis CPU',st.fail.cache?'DOWN':M().pct(m.redisU),st.fail.cache?'bad':lv(m.redisU)],['Cache hit rate',M().pct(m.hitRate),m.hitRate<0.5?'warn':'ok']);
    rows.push(['DB CPU',m.dbUp?M().pct(m.dbU):'DOWN',m.dbUp?lv(m.dbU):'bad']);if(st.replicas>0)rows.push(['Replica CPU',M().pct(m.repU),lv(m.repU)]);
    rows.push(['DB connections',M().pct(Math.min(m.connU,1)),lv(m.connU)],['p50 latency',M().ms(m.p50),m.p50>150?'warn':'ok'],['p99 latency',M().ms(m.p99),m.p99>(cfg.slo||M().SCALE_DEFAULTS.slo).p99?'bad':'ok'],['Error rate',(m.err*100).toFixed(m.err<0.01?2:1)+'%',m.err>0.01?'bad':m.err>0.001?'warn':'ok']);
    if(st.queue)rows.push(['Queue depth',m.qGrowth>0?M().num(m.qDepth)+' (1 min)':'~0',m.qGrowth>0?'bad':'ok']);
    rows.push(['Relative cost',m.cost+' units','']);return SDC.metricsHTML(rows)};
  const tierPresent=t=>t==='redis'?st.cache:t==='replica'?st.replicas>0:t==='workers'?st.queue:true;
  const draw=()=>{const R=steps[st.ti];ti.value=st.ti;ti.setAttribute('aria-valuetext',M().num(R)+' requests per second');$('[data-tv]').textContent=M().num(R)+' req/s';
    const m=M().scale(cfg,Object.assign({},st,{rps:R}));const d=diagram(m);
    $('[data-dg]').innerHTML=SDC.diagram({nodes:d.nodes,edges:d.edges,cw:150,nw:128},{states:d.states,metrics:d.met,aria:'Current architecture'});
    $('[data-sr]').textContent=`Bottleneck: ${m.bottleneck.label} at ${M().pct(m.bottleneck.u)}. p99 ${M().ms(m.p99)}, errors ${(m.err*100).toFixed(1)}%.`;
    $('[data-metrics]').innerHTML=metrics(m);$('[data-ctl]').innerHTML=ctlHTML();
    p.querySelectorAll('[data-fail]').forEach(x=>{x.setAttribute('aria-pressed',String(!!st.fail[x.dataset.fail]))});
    // diagnosis-first prompt
    const dg=$('[data-diag]');const sig=st.ti+'|'+JSON.stringify(st.fail);
    if(!m.healthy&&lastAnswered!==sig&&!Object.values(st.fail).some(Boolean)){asked=m.bottleneck.id;const opts=m.tiers.filter(t=>tierPresent(t[0]));
      dg.innerHTML=`<div class="diag"><p><span class="tag red">SLO violated</span> p99 ${M().ms(m.p99)} · errors ${(m.err*100).toFixed(1)}%. <b>Diagnose before you change anything: which tier is the bottleneck?</b></p><div class="acts">${opts.map(t=>`<button class="btn small" data-dx="${t[0]}">${t[1]}</button>`).join('')}</div><p class="fb" data-dxfb></p></div>`}
    else if(m.healthy||Object.values(st.fail).some(Boolean)||lastAnswered!==sig)dg.innerHTML='';
    const out=$('[data-out]');let h='';
    if(msg)h+=`<div>${msg}</div>`;
    h+=m.healthy?`<p><span class="tag green">Healthy</span> Meets the SLO (p99 ≤ ${(cfg.slo||M().SCALE_DEFAULTS.slo).p99} ms, errors ≤ 1%) at ${M().num(R)} req/s.${b.goal&&R>=b.goal?' <b>Goal reached.</b>':b.goal?` Next: push traffic towards ${M().num(b.goal)} req/s.`:''}</p>`:`<p><span class="tag red">Unhealthy</span> Bottleneck: <b>${m.bottleneck.label}</b>${isFinite(m.bottleneck.u)?' at '+M().pct(m.bottleneck.u):''}.</p>`;
    if(m.notes.length)h+=`<ul class="clean small">${m.notes.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    out.innerHTML=h;out.className='outcome '+(m.healthy?'ok':m.err>0.05||!m.dbUp?'bad':'warn');
    if(b.goal&&R>=b.goal&&m.healthy&&!Object.values(st.fail).some(Boolean)&&!cx.isDone())cx.done(diag.tries?Math.max(0.5,diag.ok/diag.tries):0.8);
    prev=m;cx.set('st',st)};
  const change=(k,fn)=>{const before=prev;fn();const R=steps[st.ti];const after=M().scale(cfg,Object.assign({},st,{rps:R}));
    const w=WHY[k];const added=k==='api'||k==='replicas'||k==='workers'||k==='shards'?null:!!(k==='regions'?st.regions>1:st[k]);
    let diff='';if(before)diff=` p99 ${M().ms(before.p99)} → <b>${M().ms(after.p99)}</b>, errors ${(before.err*100).toFixed(1)}% → <b>${(after.err*100).toFixed(1)}%</b>, ${before.bottleneck.label} ${M().pct(before.bottleneck.u)}.`;
    const target=before&&!before.healthy?before.bottleneck.id:null;
    const fit={api:['api'],lb:['api'],cache:['db','replica','conn'],replicas:['db','replica','conn'],shards:['db','conn'],queue:['db','api'],workers:['workers'],cdn:['api','db','redis'],regions:[],resilient:['conn']}[k]||[];
    const verdict=target?(fit.includes(target)?`<span class="tag green">Targets the bottleneck</span>`:`<span class="tag amber">Bottleneck was ${before.bottleneck.label}</span> This change does not address it.`):'';
    const noDx=before&&!before.healthy&&lastAnswered!==st.ti+'|'+JSON.stringify(st.fail)?'<p class="small muted">Tip: you changed the design before naming the bottleneck. Measure → identify → change → measure again.</p>':'';
    msg=w?`<p>${verdict} <b>${added===false?'Removed':'Why this component?'}</b> ${w[0]}${diff}</p>${added!==false?`<p class="small"><b>New problems it introduces:</b> ${w[1]}</p>`:''}${noDx}`:'';draw()};
  p.addEventListener('input',e=>{if(e.target===ti){st.ti=+ti.value;msg=null;draw()}});
  p.addEventListener('click',e=>{const t=e.target.closest('[data-tog]'),inc=e.target.closest('[data-inc]'),dec=e.target.closest('[data-dec]'),f=e.target.closest('[data-fail]'),dx=e.target.closest('[data-dx]'),pre=e.target.closest('[data-pre]');
    if(t){const k=t.dataset.tog;change(k,()=>{if(k==='regions')st.regions=st.regions>1?1:2;else st[k]=!st[k];if(k==='queue'&&st.queue&&!st.workers)st.workers=2});p.querySelector(`[data-tog="${k}"]`)?.focus()}
    if(inc){const k=inc.dataset.inc;change(k,()=>{st[k]+=step(st[k])});p.querySelector(`[data-inc="${k}"]`)?.focus()}
    if(dec){const k=dec.dataset.dec;change(k,()=>{st[k]=Math.max(k==='api'||k==='shards'?1:0,st[k]-step(st[k]-1))});p.querySelector(`[data-dec="${k}"]`)?.focus()}
    if(f){const k=f.dataset.fail;st.fail[k]=!st.fail[k];const m=M().scale(cfg,Object.assign({},st,{rps:steps[st.ti]}));
      msg=st.fail[k]?`<p><span class="tag red">Failure injected</span> <b>${FAILS[k]}.</b> What happens to the system? Read the metrics, then: <b>mechanism that helps:</b> ${FAIL_TEACH[k]}</p>`:`<p>Recovered from: ${FAILS[k]}.</p>`;
      if(st.fail[k])SDC.act.record(key+'.f',{t:'failure',s:ses.id,c:'reliability',score:null,explored:true});draw()}
    if(e.target.closest('[data-clear]')){st.fail={};msg='<p>All failures cleared.</p>';draw()}
    if(dx){const ok=dx.dataset.dx===asked;diag.tries++;if(ok)diag.ok++;cx.set('diag',diag);const fb=p.querySelector('[data-dxfb]');
      const m=prev;const tier=m.tiers.find(x=>x[0]===dx.dataset.dx);
      fb.innerHTML=ok?`<span class="tag green">Correct</span> ${m.bottleneck.label} is at ${M().pct(m.bottleneck.u)}. ${HINT[asked]||''}`:`<span class="tag red">Not this one</span> ${tier[1]} is at ${M().pct(tier[2])}: adding capacity there will not help. Look for the highest utilisation.`;
      if(ok){lastAnswered=st.ti+'|'+JSON.stringify(st.fail);p.querySelectorAll('[data-dx]').forEach(x=>x.disabled=true)}}
    if(pre){const P=(b.presets||DEFAULT_PRESETS)[+pre.dataset.pre];st=Object.assign({},DEF_ST,P.st,{fail:{}});msg=`<p><b>Reference: ${esc(P.l)}.</b> ${P.why||''}</p>`;lastAnswered=null;draw()}});
  draw()},{phase:'experiment',kind:'lab'});

const HINT={api:'Options: more API servers behind a load balancer, or move side work off the request path with a queue.',db:'Options: if reads dominate, a cache or read replicas; if writes dominate, move side writes to a queue, then shard.',
  replica:'Add replicas, or a cache in front of them.',redis:'Shard or replicate the cache cluster.',conn:'Too many in-flight queries: speed up queries, add timeouts, pool connections, or spread reads to replicas.',workers:'Add workers until throughput ≥ arrival rate.'};
const DEFAULT_PRESETS=[
  {l:'Simple',st:{ti:0,api:1},why:'One server, one database. Right for 100 req/s.'},
  {l:'Scale to 10K req/s',st:{ti:2,api:7,lb:true,cache:true,replicas:1,queue:true,workers:3},why:'Stateless servers behind a load balancer, a cache for the hot reads, a replica for safety and extra reads, side work on a queue.'},
  {l:'Scale to 100K req/s',st:{ti:3,api:60,lb:true,cache:true,replicas:2,queue:true,workers:25,cdn:true,shards:4},why:'The CDN takes cacheable traffic, the cache takes most reads, four shards split writes, workers batch side work.'},
  {l:'Multi-region',st:{ti:3,api:60,lb:true,cache:true,replicas:2,queue:true,workers:25,cdn:true,shards:4,regions:2},why:'Same stack in two regions: lower latency for distant users and survival of a region outage, at roughly double the cost and with cross-region lag.'}];
SDC.SCALE_PRESETS=DEFAULT_PRESETS;
})();
