/* Run: node tests/models.test.js  (no dependencies) */
const assert=require('assert');
const M=require('../js/models.js');
let n=0;const t=(name,fn)=>{try{fn();n++;console.log('ok   '+name)}catch(e){console.error('FAIL '+name+'\n     '+e.message);process.exitCode=1}};

t('parseQty understands suffixes and units',()=>{
  assert.strictEqual(M.parseQty('2,315'),2315);assert.strictEqual(M.parseQty('2.3k'),2300);assert.strictEqual(M.parseQty('200M'),2e8);
  assert.strictEqual(M.parseQty('1.2 TB','bytes'),1.2e12);assert.strictEqual(M.parseQty('4GB/s','bytes'),4e9);assert.strictEqual(M.parseQty('2B'),2e9);
  assert.strictEqual(M.parseQty('500B','bytes'),500);assert.ok(isNaN(M.parseQty('abc')));assert.ok(isNaN(M.parseQty('')))});
t('close() accepts ±40%',()=>{assert.ok(M.close(2315,2315));assert.ok(M.close(2000,2315));assert.ok(M.close(3000,2315));assert.ok(!M.close(1000,2315));assert.ok(!M.close(NaN,5))});
t('capacity matches the worked example (10M DAU × 20)',()=>{const r=M.capacity({dau:10e6,rpu:20,ratio:100,obj:2000,peak:3});
  assert.strictEqual(r.reqDay,200e6);assert.strictEqual(Math.round(r.qps),2315);assert.strictEqual(Math.round(r.peak),6944);
  assert.ok(Math.abs(r.storageDay-200e6/101*2000)<1);assert.ok(Math.abs(r.storageYear-r.storageDay*365)<1)});

const URL={readFrac:0.99,hitRate:0.95,cdnFrac:0.3,jobsPerReq:1,jobDb:0.2,workerCap:5000,syncJobMs:15};
const base={api:1,lb:false,cache:false,replicas:0,shards:1,queue:false,workers:0,cdn:false,regions:1,resilient:false,fail:{}};
const S=(o,rps)=>M.scale(URL,Object.assign({},base,o,{rps}));
t('a single server is healthy at 100 req/s',()=>{assert.ok(S({},100).healthy)});
t('the database is the bottleneck at 10K without changes',()=>{const m=S({api:6,lb:true},10000);assert.ok(!m.healthy);assert.strictEqual(m.bottleneck.id,'db')});
t('API is the bottleneck when DB has headroom',()=>{const m=M.scale({readFrac:0.9,hitRate:0.9},Object.assign({},base,{cache:true,rps:5000}));assert.strictEqual(m.bottleneck.id,'api')});
t('a cache lowers DB CPU for read-heavy load',()=>{const a=M.scale({readFrac:0.95},Object.assign({},base,{api:3,lb:true,rps:4000})),b=M.scale({readFrac:0.95},Object.assign({},base,{api:3,lb:true,cache:true,rps:4000}));assert.ok(b.dbU<a.dbU/3)});
t('killing Redis pushes reads back to the DB',()=>{const o={api:3,lb:true,cache:true};const a=M.scale({},Object.assign({},base,o,{rps:4000})),b=M.scale({},Object.assign({},base,o,{rps:4000,fail:{cache:true}}));assert.ok(b.dbU>a.dbU*2.5)});
t('killing the only DB causes errors; a replica fails over',()=>{const a=S({api:2,lb:true,cache:true,fail:{db:true}},1000);assert.ok(a.err>0.04);assert.ok(!a.dbUp);
  const b=S({api:2,lb:true,cache:true,replicas:1,queue:true,workers:2,fail:{db:true}},1000);assert.ok(b.dbUp&&b.failover)});
t('killing the only API server is a total outage',()=>{assert.strictEqual(S({fail:{api:true}},100).err,1)});
t('slow DB hurts p99; circuit breaker caps it',()=>{const o={api:2,lb:true};const a=S(Object.assign({},o,{fail:{slowdb:true}}),500),b=S(Object.assign({},o,{resilient:true,fail:{slowdb:true}}),500);assert.ok(a.p99>2000);assert.ok(b.p99<a.p99)});
t('stopped workers grow the queue',()=>{const m=S({api:2,lb:true,queue:true,workers:2,fail:{worker:true}},500);assert.ok(m.qGrowth>0)});
t('dropped requests: retries reduce errors',()=>{const a=S({api:2,lb:true,fail:{drop:true}},200),b=S({api:2,lb:true,resilient:true,fail:{drop:true}},200);assert.ok(a.err>=0.19&&b.err<0.02)});
t('without a load balancer extra API servers are idle',()=>{assert.strictEqual(S({api:5},100).effApi,1)});

const SCALE_PRESETS=[[{api:1},100],[{api:7,lb:true,cache:true,replicas:1,queue:true,workers:3},10000],[{api:60,lb:true,cache:true,replicas:2,queue:true,workers:25,cdn:true,shards:4},100000],[{api:60,lb:true,cache:true,replicas:2,queue:true,workers:25,cdn:true,shards:4,regions:2},100000]];
t('every reference preset is healthy under the URL-shortener model',()=>{SCALE_PRESETS.forEach(([o,r])=>{const m=S(o,r);assert.ok(m.healthy,JSON.stringify(o)+' p99='+Math.round(m.p99)+' err='+m.err.toFixed(3)+' bn='+m.bottleneck.id+' '+m.bottleneck.u.toFixed(2))})});
const GEN={};
t('every reference preset is healthy under the default model',()=>{SCALE_PRESETS.forEach(([o,r])=>{const m=M.scale(GEN,Object.assign({},base,o,{rps:r}));assert.ok(m.healthy,JSON.stringify(o)+' bn='+m.bottleneck.id+' '+m.bottleneck.u.toFixed(2)+' err='+m.err.toFixed(3))})});

t('mod N moves most keys, the ring moves few',()=>{const keys=Array.from({length:2000},(_,i)=>'user_'+i);const mm=M.moved(M.modAssign(keys,3),M.modAssign(keys,4)),rm=M.moved(M.ringAssign(keys,3,100),M.ringAssign(keys,4,100));
  assert.ok(mm/keys.length>0.65,'mod '+mm);assert.ok(rm/keys.length<0.35,'ring '+rm)});
t('ring only moves keys to the new shard',()=>{const keys=Array.from({length:500},(_,i)=>'k'+i);const a=M.ringAssign(keys,4,50),b=M.ringAssign(keys,5,50);a.forEach((x,i)=>{if(x!==b[i])assert.strictEqual(b[i],4)})});

t('SRS: good grows the interval, bad resets to tomorrow',()=>{const now=Date.UTC(2026,0,10,12);let c=M.srsNext({},true,now);assert.strictEqual(c.box,1);c=M.srsNext(c,true,now);assert.strictEqual(c.box,2);assert.ok(c.due>now+2*864e5);
  const b=M.srsNext(c,false,now);assert.strictEqual(b.box,0);assert.ok(b.due<now+1.1*864e5);assert.ok(!M.isDue(b,now));assert.ok(M.isDue(b,now+2*864e5))});
t('mastery labels from scores',()=>{const m=M.mastery({a:{c:'caching',score:1},b:{c:'caching',score:1},c:{c:'queues',score:0},d:{c:'x',explored:true}},{k:{c:'queues',box:0,last:0}});
  assert.strictEqual(m.caching.label,'Strong');assert.strictEqual(m.queues.label,'Needs revision');assert.ok(!m.x)});

t('token bucket allows a burst of capacity then the refill rate',()=>{const arr=Array.from({length:30},()=>0);const r=M.limit('token',arr,{rate:5,cap:20});assert.strictEqual(r.filter(x=>x.ok).length,20)});
t('fixed window lets ~2× through at a boundary; sliding does not',()=>{const arr=M.arrivals('boundary',5,2);const f=M.limit('fixed',arr,{rate:5,win:1}),s=M.limit('sliding',arr,{rate:5,win:1});
  assert.ok(M.maxInWindow(f,1)>=9,'fixed '+M.maxInWindow(f,1));assert.ok(M.maxInWindow(s,1)<=5)});
t('steady traffic under the limit is fully accepted by all',()=>{const arr=M.arrivals('steady',4,10);['token','leaky','fixed','sliding'].forEach(a=>assert.strictEqual(M.limit(a,arr,{rate:5,cap:5,win:1}).filter(x=>!x.ok).length,0,a))});

t('queue grows when arrivals exceed throughput, drains otherwise',()=>{let s={t:0,depth:0,rejected:0,accepted:0,processed:0};const p={rps:20,workers:80,jobSecs:8,bounded:false,cap:2000};for(let i=0;i<10;i++)s=M.queueTick(s,p);assert.ok(s.depth>0);
  let q={t:0,depth:0,rejected:0,accepted:0,processed:0};const p2=Object.assign({},p,{workers:200});for(let i=0;i<10;i++)q=M.queueTick(q,p2);assert.strictEqual(q.depth,0)});
t('bounded queue applies backpressure',()=>{let s={t:0,depth:0,rejected:0,accepted:0,processed:0};const p={rps:100,workers:8,jobSecs:8,bounded:true,cap:200};for(let i=0;i<10;i++)s=M.queueTick(s,p);assert.ok(s.depth<=200&&s.rejected>0)});
t('geo read: eventual is stale before the delay, strong never is',()=>{assert.strictEqual(M.geoRead({mode:'eventual',delay:200,readAt:0}).value,5);assert.strictEqual(M.geoRead({mode:'eventual',delay:200,readAt:300}).value,10);
  assert.strictEqual(M.geoRead({mode:'strong',delay:200,readAt:0}).value,10);assert.strictEqual(M.geoRead({mode:'ryw',delay:200,readAt:0,sameUser:true}).value,10);assert.strictEqual(M.geoRead({mode:'ryw',delay:200,readAt:0,sameUser:false}).value,5)});
console.log(`\n${n} passed`+(process.exitCode?' — with failures':''));
