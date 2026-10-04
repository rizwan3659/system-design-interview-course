/* Pure, deterministic models behind the labs. No DOM access: unit-tested with Node (tests/models.test.js).
   Every number here is an educational approximation, not a benchmark. */
(function(root){
'use strict';
const M={};

/* ---------- formatting & parsing ---------- */
M.num=v=>{if(!isFinite(v))return '∞';const a=Math.abs(v);
  return a>=1e12?(v/1e12).toFixed(a>=1e13?0:1)+' T':a>=1e9?(v/1e9).toFixed(a>=1e10?0:1)+' B':a>=1e6?(v/1e6).toFixed(a>=1e7?0:1)+' M':a>=1e4?Math.round(v/1e3)+' K':a>=100?Math.round(v).toLocaleString('en-US'):a>=1?(+v.toFixed(1)).toString():(+v.toFixed(2)).toString()};
M.bytes=v=>{const u=['B','KB','MB','GB','TB','PB','EB'];let i=0;while(Math.abs(v)>=1000&&i<u.length-1){v/=1000;i++}return (Math.abs(v)>=100?Math.round(v):+v.toFixed(1))+' '+u[i]};
M.ms=v=>!isFinite(v)?'timeout':v>=1000?(v/1000).toFixed(v>=10000?0:1)+' s':Math.round(v)+' ms';
M.pct=v=>!isFinite(v)?'∞':Math.round(v*100)+'%';

/* Parses "2315", "2,315", "2.3k", "200M", "1.2 TB", "4 GB/s", "80gb". kind 'bytes' treats a bare B as bytes, otherwise billions. */
M.parseQty=(str,kind)=>{if(str==null)return NaN;let s=String(str).trim().replace(/,/g,'').replace(/\/\s*(s|sec|second|day|yr|year)$/i,'').replace(/\s+/g,'');if(!s)return NaN;
  const m=s.match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)([a-z]*)$/i);if(!m)return NaN;let v=parseFloat(m[1]);const u=m[2].toLowerCase();
  const P={'':1,k:1e3,m:1e6,g:1e9,t:1e12,p:1e15};
  if(!u)return v;
  if(u.endsWith('b')&&u.length===2&&P[u[0]]!=null)return v*P[u[0]];          // KB MB GB TB PB
  if(u==='b')return kind==='bytes'?v:v*1e9;                                   // bytes or billions
  if(u==='bn')return v*1e9;
  if(u==='mn'||u==='mil')return v*1e6;
  if(P[u]!=null)return v*P[u];
  return NaN};
M.close=(v,ans,tol)=>{tol=tol||0.4;if(!(v>0)||!(ans>0))return v===ans;const r=v/ans;return r>=1-tol&&r<=1/(1-tol)};

/* ---------- capacity estimation ---------- */
M.capacity=sc=>{const reqDay=sc.dau*sc.rpu,qps=reqDay/86400,peak=qps*sc.peak,writesDay=reqDay/(sc.ratio+1),readsDay=reqDay-writesDay;
  const storageDay=writesDay*sc.obj;
  return {reqDay,qps,peak,writesDay,readsDay,writeQps:writesDay/86400,readQps:readsDay/86400,storageDay,storageYear:storageDay*365,
    bandwidth:readsDay/86400*sc.obj,cache:0.2*readsDay*sc.obj}};

/* ---------- scale model ----------
   cfg: workload constants for a system; st: architecture + traffic + failures. Returns metrics. */
M.SCALE_DEFAULTS={readFrac:0.95,hitRate:0.9,cdnFrac:0,apiCap:2000,dbReadCap:5000,dbWriteCap:2500,replicaCap:5000,redisCap:100000,
  workerCap:400,jobsPerReq:0,jobDb:1,syncJobMs:120,globalFrac:0.5,dbConnPerNode:500,slo:{p99:400,err:0.01}};
const lat=(base,u)=>u>=1?Infinity:base/(1-Math.min(u,0.95));
M.scale=(cfg0,st)=>{const cfg=Object.assign({},M.SCALE_DEFAULTS,cfg0||{});const f=st.fail||{};const notes=[];
  const R=st.rps;
  const edge=st.cdn?R*cfg.cdnFrac:0,Ro=R-edge;
  // API tier
  let apiN=st.api-(f.api?1:0);const effApi=st.lb?apiN:Math.min(apiN,1);
  if(!st.lb&&st.api>1)notes.push('Without a load balancer only one API server receives traffic.');
  const retryAmp=f.drop&&st.resilient?1.25:1;
  const apiLoad=Ro*retryAmp*(1+(st.queue?0:cfg.jobsPerReq*0.5));     // synchronous side work costs API CPU
  const apiU=effApi>0?apiLoad/(effApi*cfg.apiCap):Infinity;
  // cache
  const reads=Ro*cfg.readFrac,writes=Ro-reads;
  const cacheUp=st.cache&&!f.cache;const hits=cacheUp?reads*cfg.hitRate:0;
  const redisU=st.cache?(cacheUp?reads/(cfg.redisCap*(st.regions||1)*Math.max(1,st.shards||1)):0):0;
  if(st.cache&&f.cache)notes.push('Redis is down: every read falls through to the database.');
  // database
  const S=Math.max(1,st.shards||1);let reps=st.replicas||0;let dbUp=true,failover=false;
  if(f.db){if(reps>0){reps-=1;failover=true;notes.push('Primary died: a replica was promoted. Writes failed for ~30 s during failover; writes not yet replicated may be lost.')}else{dbUp=false;notes.push('Primary died with no replica: every database read and write fails.')}}
  const jobs=Ro*cfg.jobsPerReq;
  const workerCapTot=st.queue&&!f.worker?(st.workers||0)*cfg.workerCap:0;
  const jobWrites=st.queue?Math.min(jobs,workerCapTot)*cfg.jobDb*0.05:jobs*cfg.jobDb;   // workers batch ~20 events per write
  const dbReads=reads-hits,dbWrites=writes+jobWrites;
  const readCapPrimary=cfg.dbReadCap,readCapRep=reps*cfg.replicaCap;
  const shareP=readCapRep>0?readCapPrimary*0.5/(readCapPrimary*0.5+readCapRep):1;  // primary keeps half its read capacity for writes
  const pReads=dbReads*shareP,rReads=dbReads-pReads;
  const dbU=dbUp?(pReads/cfg.dbReadCap+dbWrites/cfg.dbWriteCap)/S:Infinity;
  const repU=reps>0?rReads/(readCapRep*S):0;
  // latency per tier
  const slow=f.slowdb?2000:0;
  const apiL=lat(15,apiU),redisL=lat(1,redisU),dbL=dbUp?lat(8,Math.max(dbU,repU))+slow:Infinity,dbWL=dbUp?lat(10,dbU)+slow:Infinity;
  // connections: in-flight DB queries vs connection limit
  const inflight=(dbReads+dbWrites)*((isFinite(dbL)?dbL:80+slow)/1000);   // a saturated DB queues requests at ~its max latency
  const connCap=cfg.dbConnPerNode*S*(1+reps);
  let connU=dbUp?inflight/connCap:0;
  // timeouts + circuit breaker: fail fast instead of piling up
  const cb=!!st.resilient;
  const hitShare=reads>0?hits/reads:0;
  const syncJobL=st.queue?0:cfg.syncJobMs*cfg.jobsPerReq;
  const globalL=(st.regions||1)>1?20:120*cfg.globalFrac;
  let effDbL=dbL,effDbWL=dbWL;
  if(cb){effDbL=Math.min(dbL,300);effDbWL=Math.min(dbWL,300);connU=Math.min(connU,0.6)}
  const p50=apiL+(reads/Math.max(Ro,1))*(hitShare*redisL+(1-hitShare)*effDbL)+(writes/Math.max(Ro,1))*effDbWL+syncJobL+globalL*0.6;
  const maxU=Math.max(apiU,dbU,repU,redisU);
  const missPath=(hitShare<0.99?effDbL:redisL);
  let p99=(apiL*2+missPath*2*(1+Math.min(maxU,1)**2)+syncJobL*2+globalL*1.4);
  // errors
  const shed=u=>u>1?1-1/u:0;
  let ok=1;
  ok*=1-shed(apiU);
  const dbTraffic=(dbReads+writes)/Math.max(Ro,1);
  if(!dbUp)ok*=1-dbTraffic;else{ok*=1-shed(dbU)*dbTraffic;ok*=1-shed(repU)*(rReads/Math.max(Ro,1));ok*=1-shed(connU)*dbTraffic}
  if(f.slowdb&&cb){const failFast=(dbReads+writes)/Math.max(Ro,1);ok*=1-failFast*0.3;notes.push('Timeouts + circuit breaker fail slow queries fast and serve cached or default data instead of waiting 2 s.')}
  if(f.slowdb&&!cb)notes.push('Every DB call now waits ~2 s: connections pile up and requests time out. Add timeouts and a circuit breaker.');
  if(f.drop){ok*=cb?1-0.2**3:0.8;notes.push(cb?'Retries with exponential backoff recover most dropped requests, at the cost of ~25% extra traffic.':'20% of requests are dropped and nobody retries: users see errors.')}
  if(effApi===0)ok=0;
  if(f.partition){notes.push(reps>0||(st.regions||1)>1?'Network partition: replicas cannot receive updates, so reads from them return stale data.':'Network partition between app and DB: requests to the database time out.');if(reps===0&&(st.regions||1)<2)ok*=1-dbTraffic}
  const err=Math.min(1,Math.max(0,1-ok));
  if(err>0.5)p99=Math.max(p99,cb?600:5000);
  if(!isFinite(p99))p99=cb?600:30000;
  // queue
  let qGrowth=0,qDepth=0;
  if(st.queue){qGrowth=jobs-workerCapTot;qDepth=Math.max(0,qGrowth*60);if(f.worker)notes.push('Workers stopped: jobs pile up in the queue. Users are not blocked, but results are delayed. Alert on queue age and add a dead-letter queue for poison messages.')}
  const tiers=[['api','API servers',apiU],['redis','Redis',redisU],['db','Primary DB',dbU],['replica','Read replicas',repU],['conn','DB connections',connU]];
  if(st.queue)tiers.push(['workers','Workers',workerCapTot>0?jobs/workerCapTot:(jobs>0?Infinity:0)]);
  const bn=tiers.filter(t=>isFinite(t[2])||t[2]===Infinity).sort((a,b)=>b[2]-a[2])[0];
  const healthy=p99<=cfg.slo.p99&&err<=cfg.slo.err&&!(st.queue&&qGrowth>0);
  const cost=Math.round(st.api*1+(st.lb?1:0)+(st.cache?2:0)+S*(4+reps*3)+(st.queue?1:0)+(st.workers||0)*0.5+(st.cdn?2+R/2e5:0))*((st.regions||1)>1?1.8:1);
  const cap=(st.api*cfg.apiCap);const idle=apiU<0.25&&dbU<0.25&&st.api>4;
  if(idle)notes.push('Over-provisioned: most capacity is idle. Interviewers notice when you scale past the need.');
  return {apiU,redisU,dbU,repU,connU,hitRate:hitShare,p50,p99,err,qGrowth,qDepth,jobs,workerCapTot,bottleneck:{id:bn[0],label:bn[1],u:bn[2]},tiers,healthy,cost,notes,failover,dbUp,edge,cap,effApi}};

/* ---------- sharding ---------- */
M.fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>13;h=Math.imul(h,0x5bd1e995)>>>0;h^=h>>>15;return h>>>0};
M.modAssign=(keys,n)=>keys.map(k=>M.fnv(k)%n);
M.ring=(n,v)=>{const pts=[];for(let s=0;s<n;s++)for(let j=0;j<v;j++)pts.push([M.fnv('shard-'+s+'#'+j),s]);return pts.sort((a,b)=>a[0]-b[0])};
M.ringOwner=(pts,h)=>{let lo=0,hi=pts.length;while(lo<hi){const m=(lo+hi)>>1;if(pts[m][0]<h)lo=m+1;else hi=m}return pts[lo===pts.length?0:lo][1]};
M.ringAssign=(keys,n,v)=>{const pts=M.ring(n,v||1);return keys.map(k=>M.ringOwner(pts,M.fnv(k)))};
M.moved=(a,b)=>a.reduce((c,x,i)=>c+(x!==b[i]?1:0),0);

/* ---------- spaced repetition (Leitner boxes) ---------- */
M.SRS_DAYS=[1,1,3,7,16,35];
M.srsNext=(card,good,now)=>{const box=good?Math.min((card.box||0)+1,M.SRS_DAYS.length-1):0;
  const days=good?M.SRS_DAYS[box]:1;return Object.assign({},card,{box,due:now+days*864e5-36e5,last:good?1:0,n:(card.n||0)+1,seen:now})};
M.isDue=(card,now)=>{const end=new Date(now);end.setHours(23,59,59,999);return card.due<=end.getTime()};

/* ---------- mastery ---------- */
M.mastery=(acts,cards)=>{const c={};const add=(k,v)=>{(c[k]=c[k]||[]).push(v)};
  Object.values(acts||{}).forEach(a=>{if(!a.c||a.explored)return;const s=a.first!=null?a.first:a.score;add(a.c,s==null?0.7:s)});
  Object.values(cards||{}).forEach(x=>{if(!x.c)return;add(x.c,x.last===0?0.15:Math.min(1,0.45+0.15*(x.box||0)))});
  const out={};Object.keys(c).forEach(k=>{const v=c[k],s=v.reduce((a,b)=>a+b,0)/v.length;out[k]={score:s,n:v.length,label:s>=0.75?'Strong':s>=0.5?'Medium':'Needs revision'}});return out};

/* ---------- rate limiters ----------
   arrivals: sorted times in seconds. Returns [{t, ok, delay}] for one algorithm. */
M.limit=(alg,arr,p)=>{const out=[];const rate=p.rate,cap=p.cap,win=p.win||1;
  if(alg==='token'){let tok=cap,last=0;arr.forEach(t=>{tok=Math.min(cap,tok+(t-last)*rate);last=t;if(tok>=1-1e-9){tok-=1;out.push({t,ok:true,tok})}else out.push({t,ok:false,tok})})}
  else if(alg==='leaky'){let q=0,last=0;arr.forEach(t=>{q=Math.max(0,q-(t-last)*rate);last=t;if(q+1<=cap+1e-9){q+=1;out.push({t,ok:true,delay:(q-1)/rate})}else out.push({t,ok:false})})}
  else if(alg==='fixed'){const lim=Math.round(rate*win);const cnt={};arr.forEach(t=>{const w=Math.floor(t/win+1e-9);cnt[w]=cnt[w]||0;if(cnt[w]<lim){cnt[w]++;out.push({t,ok:true})}else out.push({t,ok:false})})}
  else if(alg==='sliding'){const lim=Math.round(rate*win);const log=[];arr.forEach(t=>{while(log.length&&log[0]<=t-win+1e-9)log.shift();if(log.length<lim){log.push(t);out.push({t,ok:true})}else out.push({t,ok:false})})}
  return out};
M.maxInWindow=(res,win)=>{const t=res.filter(r=>r.ok).map(r=>r.t);let best=0,j=0;for(let i=0;i<t.length;i++){while(t[i]-t[j]>=win-1e-9)j++;best=Math.max(best,i-j+1)}return best};
M.arrivals=(pattern,rate,secs)=>{const a=[];secs=secs||10;
  if(pattern==='steady'){for(let i=0;i<rate*secs;i++)a.push(+(i/rate).toFixed(4))}
  else if(pattern==='burst'){for(let i=0;i<Math.round(rate*1.5);i++)a.push(0.5);for(let s=2;s<secs;s+=1/Math.max(1,rate/4))a.push(+s.toFixed(4))}
  else if(pattern==='boundary'){for(let w=0;w<secs;w+=2){for(let i=0;i<rate;i++)a.push(+(w+0.8+i*0.19/rate).toFixed(4));for(let i=0;i<rate;i++)a.push(+(w+1.0+i*0.19/rate).toFixed(4))}}
  return a.sort((x,y)=>x-y)};

/* ---------- queue / backpressure (one tick = one simulated second) ---------- */
M.queueTick=(s,p)=>{const arrive=p.rps*(p.burst&&s.t>=20&&s.t<35?4:1);const thr=p.stopped?0:p.workers/p.jobSecs;
  let depth=s.depth+arrive,rejected=s.rejected,accepted=s.accepted;
  let over=0;if(p.bounded&&depth>p.cap){over=depth-p.cap;depth=p.cap;rejected+=over}
  accepted+=arrive-over;const done=Math.min(depth,thr);depth-=done;
  return {t:s.t+1,depth,rejected,accepted,processed:s.processed+done,lastIn:arrive,lastOut:done,thr}};
M.syncTick=(p)=>{const need=p.rps*p.jobSecs,threads=p.threads;const served=Math.min(p.rps,threads/p.jobSecs);return {concurrency:need,served,rejected:p.rps-served,util:need/threads}};

/* ---------- geo-replicated read ---------- */
M.geoRead=({mode,delay,readAt,sameUser})=>{
  if(mode==='strong')return {value:10,writeLatency:2*delay+5,readLatency:5,why:'The write was acknowledged only after Singapore stored it, so every later read sees 10.'};
  if(mode==='ryw'&&sameUser)return {value:10,writeLatency:5,readLatency:readAt>=delay?5:2*delay,why:readAt>=delay?'Replication already arrived, so the local read sees 10.':'The writer\'s read is routed to Delhi (or waits for its version), paying a cross-region round trip, so it sees 10.'};
  const fresh=readAt>=delay;
  return {value:fresh?10:5,writeLatency:5,readLatency:5,why:fresh?'The read happened after replication arrived.':'The read reached Singapore before the update did: a stale read.'}};

if(typeof module!=='undefined'&&module.exports)module.exports=M;
if(root.SDC)root.SDC.M=M;
})(typeof window!=='undefined'?window:globalThis);
