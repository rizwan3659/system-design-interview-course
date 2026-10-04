COURSE.add({id:'s05',n:5,part:'A',track:'HLD',
title:'Scaling data: replication, sharding and consistent hashing',
goal:'Grow beyond one database: copy data for reads and safety, split data for size and writes, and move as little as possible when you add machines.',
outcomes:['Compare leader-follower, multi-leader and leaderless replication','Choose a shard key and spot hot partitions','Explain why consistent hashing moves fewer keys','Shard a real dataset in an interview'],
modules:[
{title:'Warm-up: recall session 4',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'A hot key expires and the DB is flooded. This is a…',opts:['Cache stampede','Cache miss','Write-back'],a:0},
  {q:'On product update, the cache key should be…',opts:['Set to the new value','Deleted'],a:1},
  {q:'Uniform traffic, 10% cache. Hit rate is about…',opts:['10%','90%'],a:0}]}]},

{title:'Scale up or scale out; replication',tab:'Replication',mins:30,out:'Pick a replication model',lead:'Vertical scaling buys a bigger machine. Horizontal scaling adds machines. Replication copies the same data to several machines.',blocks:[
 {t:'grid',cols:2,title:'Vertical vs horizontal',items:[
  {tag:'Scale up',title:'Bigger machine',body:'No code changes; strong consistency stays easy. Has a ceiling, gets expensive, and is still one point of failure. Often the right first step.'},
  {tag:'Scale out',tc:'amber',title:'More machines',body:'Nearly unlimited; survives machine loss. Needs data to be copied or split, which brings consistency and routing problems.'}]},
 {t:'cards',title:'Three replication models',items:[
  {tag:'Most common',title:'Leader–follower',sub:'One writer, many readers',body:'<p>All writes go to the leader; followers copy its log and serve reads.</p><p><b>Good:</b> simple, no write conflicts. <b>Cost:</b> followers lag (stale reads); writes limited to one machine; failover needed if the leader dies.</p><p><b>Sync vs async:</b> synchronous followers never lose data but slow every write; async is fast but can lose the last few writes on failover.</p>'},
  {tag:'Multi-region',title:'Multi-leader',sub:'Writers in several places',body:'<p>Each region has a leader; leaders sync with each other.</p><p><b>Good:</b> local writes in every region. <b>Cost:</b> two regions can edit the same row: you need conflict rules (last-write-wins, merge, CRDTs).</p>'},
  {tag:'Dynamo-style',title:'Leaderless',sub:'Write to many, read from many',body:'<p>Clients write to W of N replicas and read from R. If R + W > N, a read overlaps the latest write.</p><p><b>Good:</b> no failover, high availability. <b>Cost:</b> conflict handling, repair processes. (Session 6 has a lab.)</p>'}]},
 {t:'reveal',items:[
  {q:'A user updates their profile, refreshes, and sees the old name. Why, and how do you fix it?',a:'They read from a lagging follower. Fix: <b>read-your-own-writes</b>: route a user\'s reads to the leader for a short time after they write, or read from a follower only if it has caught up to the user\'s last write position.'},
  {q:'The leader dies. What happens with async replication?',a:'A follower is promoted. Writes not yet copied are lost or must be reconciled. That is why payment systems often use synchronous replication to at least one follower.'}]}]},

{title:'Sharding (partitioning)',tab:'Sharding',mins:30,out:'Choose a shard key',lead:'Sharding splits data so each machine holds a part. You do it when data or writes outgrow one machine. The shard key decides everything.',blocks:[
 {t:'table',title:'Ways to split',head:['Strategy','How','Good','Risk'],rows:[
  ['Range','Users A–F on shard 1, G–M on shard 2…; or by date','Range queries are easy','Hot shards (new dates all on one shard)'],
  ['Hash','shard = hash(key) mod N','Even spread','Range queries hit every shard; changing N moves most keys'],
  ['Consistent hash','Keys and servers placed on a ring','Adding a server moves few keys','More complex; needs virtual nodes for balance'],
  ['Directory / lookup','A table says which shard holds which key','Full control, easy moves','The directory is a dependency to keep fast and available']]},
 {t:'mcq',title:'Pick the shard key',items:[
  {q:'Chat messages, always read by conversation.',opts:['message_id','conversation_id','sent_at date'],a:1,why:'All messages of a conversation live together; one shard answers the read.'},
  {q:'An orders table where most queries are "orders of user X".',opts:['user_id','order_date','country'],a:0,why:'Matches the main query. Date would put all of today\'s writes on one hot shard.'},
  {q:'Metrics time series, queried by sensor and time range.',opts:['timestamp only','sensor_id (+ time inside the shard)','random'],a:1,why:'Timestamp alone makes one shard take all current writes.'},
  {q:'A celebrity\'s posts get 1,000x more reads than others, sharded by user_id. Fix?',opts:['Reshard by date','Cache / replicate that user\'s data','Bigger single DB'],a:1,why:'Hot keys are solved with caching or replication, not by changing the key.'}]},
 {t:'grid',title:'Costs of sharding to say out loud',items:[
  {title:'Cross-shard queries',body:'"Top 10 products overall" must ask every shard and merge.'},
  {title:'Cross-shard transactions',body:'A transfer between users on two shards needs 2PC or a saga (session 6).'},
  {title:'Resharding',body:'Moving data while serving traffic is hard; plan with consistent hashing or many small logical shards.'},
  {title:'Unique IDs',body:'Auto-increment per shard collides; use globally unique IDs (Snowflake-style or UUIDs).'}]}]},

{title:'Lab: consistent hashing',tab:'Lab',mins:25,out:'Explain why few keys move',lead:'Add a server and compare how many of 10,000 keys must move with <code>hash mod N</code> versus a hash ring.',blocks:[
 {t:'lab',fn:'ring'},
 {t:'teacher',items:['Start with 4 servers and 1 virtual node each. Add a server: mod N moves ~80% of keys, the ring ~20% but load is uneven. Raise virtual nodes to 100: moves stay ~1/N and load evens out.','Interview phrasing: "With consistent hashing, adding the Nth server moves about 1/N of the keys."']}]},

{title:'Guided problem: shard a URL store',tab:'Guided problem',mins:25,out:'A sharding plan with numbers',blocks:[
 {t:'stepper',steps:[
  {title:'Do we need to shard?',short:'Need?',secs:120,think:'1.8 billion links, ~1 TB, 12 writes/s, 3,500 reads/s at peak. One database?',answer:'Writes are tiny. Reads are handled by a cache + replicas. Storage of 1 TB fits on one large machine today. <b>Answer:</b> not on day one; plan for it when data passes a few TB or for multi-region. Saying this scores well.'},
  {title:'Choose the key',short:'Key',secs:120,think:'If we shard later, what key?',answer:'shortCode: every lookup carries it, and hashing it spreads load evenly. No range queries are needed.'},
  {title:'Plan for growth',short:'Growth',secs:150,think:'How do we add shards later without moving everything?',answer:'Start with 256 logical shards mapped onto 4 machines. Growing = moving whole logical shards to new machines (copy, catch up, switch the mapping). Or use consistent hashing with virtual nodes.'},
  {title:'Challenge',short:'Challenge',secs:120,think:'Analytics wants "all links created by user X". Shard key is shortCode. What now?',answer:'That query would hit every shard. Keep a secondary table partitioned by userId (userId → list of codes), written alongside, or send events to an analytics store. Cost: two writes per create, possible brief mismatch.'}]},
 {t:'flash',title:'Review',items:[['Leader–follower downside?','Replication lag (stale reads) and one write leader.'],['Read-your-own-writes?','After a write, read that user\'s data from the leader or a caught-up replica.'],['Hash mod N problem?','Changing N remaps almost every key.'],['Virtual nodes?','Many ring positions per server to even out load.'],['Hot shard fix?','Cache or replicate hot keys; better key choice; split the hot range.'],['IDs across shards?','Globally unique IDs, e.g. timestamp + machine + sequence.']]},
 {t:'task',title:'Homework',items:['Pick shard keys for: Twitter tweets, Uber trips, a stock-trading order book. One line of reasoning each.']}]}
],
labs:{
 ring(el,api){
  const H=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>13;h=Math.imul(h,0x5bd1e995)>>>0;h^=h>>>15;return h>>>0};
  const cols=['var(--accent)','var(--good)','var(--warn)','var(--marker)','var(--lld)','var(--muted)','var(--ink)'];
  el.innerHTML=`<div class="form"><label>Servers now: <b data-nv></b><input type="range" min="2" max="6" value="4" data-n></label><label>Virtual nodes per server: <b data-vv></b><input type="range" min="1" max="200" value="1" data-v></label></div><div class="grid2" style="align-items:center"><div class="svgbox" style="max-width:340px"><svg viewBox="0 0 300 300" data-svg role="img" aria-label="Hash ring"></svg></div><div class="col"><div class="out"><div><b data-mod></b><span>keys moved, hash mod N → N+1</span></div><div><b data-rg></b><span>keys moved on the ring</span></div><div><b data-ideal></b><span>ideal (1/(N+1))</span></div><div><b data-bal></b><span>busiest server vs average (ring)</span></div></div></div></div><div class="verdict" data-out></div>`;
  const K=10000;const keys=[];for(let i=0;i<K;i++)keys.push(H('key-'+i));
  const ring=(n,v)=>{const pts=[];for(let s=0;s<n;s++)for(let j=0;j<v;j++)pts.push([H('server-'+s+'#'+j),s]);pts.sort((a,b)=>a[0]-b[0]);return pts};
  const owner=(pts,h)=>{let lo=0,hi=pts.length;while(lo<hi){const m=(lo+hi)>>1;if(pts[m][0]<h)lo=m+1;else hi=m}return pts[lo===pts.length?0:lo][1]};
  const draw=()=>{const n=+api.$('[data-n]',el).value,v=+api.$('[data-v]',el).value;api.$('[data-nv]',el).textContent=n+' → adding 1';api.$('[data-vv]',el).textContent=v;
   const A=ring(n,v),B=ring(n+1,v);let mm=0,rm=0;const load=new Array(n+1).fill(0);
   for(const h of keys){if(h%n!==h%(n+1))mm++;const a=owner(A,h),b=owner(B,h);if(a!==b)rm++;load[b]++}
   const avg=K/(n+1),mx=Math.max(...load);
   api.$('[data-mod]',el).textContent=(mm/K*100).toFixed(0)+'%';api.$('[data-rg]',el).textContent=(rm/K*100).toFixed(0)+'%';api.$('[data-ideal]',el).textContent=(100/(n+1)).toFixed(0)+'%';api.$('[data-bal]',el).textContent=(mx/avg).toFixed(2)+'x';
   const pts=B.length>300?B.filter((_,i)=>i%Math.ceil(B.length/300)===0):B;
   api.$('[data-svg]',el).innerHTML=`<circle cx="150" cy="150" r="110" fill="none" stroke="var(--line)" stroke-width="10"/>`+pts.map(p=>{const a=p[0]/4294967296*Math.PI*2-Math.PI/2;return `<circle cx="${(150+110*Math.cos(a)).toFixed(1)}" cy="${(150+110*Math.sin(a)).toFixed(1)}" r="${v>20?3:6}" fill="${cols[p[1]%cols.length]}"/>`}).join('')+`<text x="150" y="146" text-anchor="middle" font-size="13" fill="var(--ink)" font-weight="600">${n+1} servers</text><text x="150" y="164" text-anchor="middle" font-size="11" fill="var(--muted)">${v} point${v>1?'s':''} each</text>`;
   api.$('[data-out]',el).innerHTML=`With <code>hash mod N</code>, going from ${n} to ${n+1} servers moves <b>${(mm/K*100).toFixed(0)}%</b> of keys: almost a full reshuffle and a cache wipe. On the ring only <b>${(rm/K*100).toFixed(0)}%</b> move. ${v<20?'With few virtual nodes the busiest server holds '+(mx/avg).toFixed(1)+'x the average: raise virtual nodes to balance it.':'Many virtual nodes keep load close to even.'}`};
  el.addEventListener('input',draw);draw()}
}});
