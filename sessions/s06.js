COURSE.add({id:'s06',n:6,part:'A',track:'HLD',
title:'Consistency and distributed-system basics',
goal:'Reason about what users see when data lives on many machines, and keep multi-step operations correct.',
outcomes:['Explain CAP and PACELC with a real example','Pick strong or eventual consistency per feature','Use quorums (N, R, W) correctly','Choose between two-phase commit and a saga'],
modules:[
{title:'Warm-up: recall session 5',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Going from 4 to 5 servers with hash mod N moves about…',opts:['20% of keys','80% of keys'],a:1},
  {q:'Best shard key for chat messages?',opts:['message_id','conversation_id'],a:1},
  {q:'Stale read after your own update is caused by…',opts:['Replication lag','Indexing'],a:0}]}]},

{title:'CAP and PACELC',tab:'CAP',mins:20,out:'Explain CAP with an example',lead:'When the network between replicas breaks, a system must choose: keep answering (maybe with old data) or refuse until it is sure.',blocks:[
 {t:'cards',items:[
  {tag:'C',title:'Consistency',sub:'Every read sees the latest write',body:'<p>As if there were one copy of the data.</p>'},
  {tag:'A',title:'Availability',sub:'Every request gets an answer',body:'<p>Even if some replicas are unreachable.</p>'},
  {tag:'P',title:'Partition tolerance',sub:'Network splits happen',body:'<p>You cannot opt out of P in a distributed system, so the real choice during a partition is <b>C or A</b>.</p>'},
  {tag:'PACELC',title:'Else: latency vs consistency',sub:'The everyday trade-off',body:'<p>If Partition: choose A or C. <b>Else</b> (normal operation): choose lower Latency or stronger Consistency. Waiting for remote replicas makes every write slower.</p>'}]},
 {t:'mcq',title:'During a partition, which would you choose?',items:[
  {q:'Seat booking for a concert',opts:['Consistency (refuse if unsure)','Availability (answer anyway)'],a:0,why:'Double booking is the never-happen rule.'},
  {q:'Showing a social feed',opts:['Consistency','Availability'],a:1,why:'A slightly old feed is far better than an error page.'},
  {q:'Bank withdrawal at an ATM',opts:['Consistency','Availability (with limits)'],a:1,why:'Real ATMs often allow small offline withdrawals and reconcile later: a business decision. Either answer can be defended if you explain the risk.'},
  {q:'Shopping cart (add item)',opts:['Consistency','Availability'],a:1,why:'Amazon\'s Dynamo chose availability: merge carts later rather than lose a sale.'}]}]},

{title:'Consistency models',tab:'Models',mins:20,out:'Match a model to a feature',blocks:[
 {t:'table',title:'From strongest to weakest',head:['Model','Guarantee','Example use'],rows:[
  ['Linearizable (strong)','Reads always see the latest write, everywhere','Locks, leader election, inventory count'],
  ['Sequential / serializable','All see operations in one order','Bank ledger'],
  ['Read-your-writes','You always see your own updates','Profile edits'],
  ['Monotonic reads','You never see time go backwards','Scrolling a feed across replicas'],
  ['Causal','Replies appear after the message they answer','Comments, chat'],
  ['Eventual','All replicas agree… eventually','Like counts, view counts, DNS']]},
 {t:'reveal',items:[
  {q:'A user posts a comment and immediately sees it disappear on refresh. Which guarantee is missing?',a:'Read-your-writes. Route that user\'s reads to the leader (or a caught-up replica) for a while after writing.'},
  {q:'Alice sees Bob\'s reply before Bob\'s original question. Which guarantee is missing?',a:'Causal consistency. Attach the "happened-after" dependency to the reply and hold it until the question is visible.'}]}]},

{title:'Lab: quorums',tab:'Quorum lab',mins:20,out:'Choose N, R, W for a workload',lead:'Leaderless stores write to W of N replicas and read from R. If R + W > N, every read set overlaps the latest write set.',blocks:[
 {t:'lab',fn:'quorum'},
 {t:'teacher',items:['Try N=3, W=2, R=2 (the classic). Then W=1, R=1: fast but reads can be stale. Then W=3: every write fails if one replica is down.']}]},

{title:'Time, ordering and multi-step operations',tab:'Transactions across services',mins:25,out:'2PC vs saga',lead:'Clocks on different machines disagree, messages arrive late or twice, and one operation may touch several services. Three tools handle most of it.',blocks:[
 {t:'grid',title:'Three tools',items:[
  {title:'Do not trust wall clocks',body:'Machine clocks drift by milliseconds or more. For ordering, use a version number, a sequence from one leader, or logical clocks (Lamport / vector clocks).'},
  {title:'Idempotency everywhere',body:'Networks deliver messages twice. Give each operation an ID and ignore repeats. "Exactly once" in practice = at-least-once delivery + idempotent processing.'},
  {title:'Coordinate multi-step work',body:'Two-phase commit (2PC) locks all parties until everyone agrees. A saga runs local steps one by one and undoes completed steps with compensating actions if one fails.'}]},
 {t:'table',title:'2PC vs saga',head:['','Two-phase commit','Saga'],rows:[
  ['Consistency','Atomic: all or nothing','Eventually consistent; intermediate states are visible'],
  ['Availability','Blocks if the coordinator dies mid-way','Each step is local; keeps going'],
  ['Complexity','Needs support in every database','You write a compensating action per step'],
  ['Typical use','Inside one database cluster','Across microservices: order → payment → shipping']]},
 {t:'stepper',title:'Guided · Transfer money between two services',steps:[
  {title:'The problem',short:'Problem',secs:90,think:'Wallet A and Wallet B live in different services with separate databases. Transfer ₹500 from A to B. What can go wrong?',answer:'Debit succeeds, credit fails (money vanishes). Credit retried twice (money created). Crash between steps leaves an unknown state.'},
  {title:'Design the saga',short:'Saga',secs:180,think:'Write the steps and the compensating action for each.',answer:'<ol><li>Create transfer record <b>PENDING</b> with a transferId.</li><li>Debit A (idempotent on transferId). Compensation: refund A.</li><li>Credit B (idempotent on transferId). If it fails permanently → run refund A.</li><li>Mark transfer <b>COMPLETED</b> (or <b>FAILED</b> after compensation).</li></ol>'},
  {title:'Make it robust',short:'Robust',secs:150,think:'What if the orchestrator crashes after step 2?',answer:'The transfer record is the source of truth. On restart, a recovery job finds PENDING transfers older than N seconds and resumes from the last completed step. Idempotency keys make repeats harmless. Write the step and the outgoing message together (outbox pattern, session 7).'}]}]},

{title:'Review',tab:'Review',mins:25,out:'Exit quiz + homework',blocks:[
 {t:'flash',items:[['CAP in one sentence?','During a network partition you choose between consistency and availability.'],['PACELC adds…','Even without partitions, you trade latency against consistency.'],['R + W > N means…','Every read overlaps the latest write: reads see it.'],['Exactly-once in practice?','At-least-once delivery + idempotent handling.'],['Saga?','Local steps with compensating actions instead of a global lock.'],['Why not wall clocks for ordering?','Clocks drift; use sequence numbers or logical clocks.']]},
 {t:'mcq',title:'Exit quiz',items:[
  {q:'N=5. Which setting gives strong reads and tolerates 2 failed replicas for both reads and writes?',opts:['W=3, R=3','W=1, R=1','W=5, R=1'],a:0,why:'3+3>5, and 5−3 = 2 replicas can be down.'},
  {q:'Order → payment → inventory across three services. Best fit?',opts:['Two-phase commit','Saga with compensations'],a:1},
  {q:'Like counts across regions should be…',opts:['Linearizable','Eventually consistent'],a:1}]},
 {t:'drill',title:'Discussion drill',prefix:'Strong or eventual? ',button:'Draw a feature',items:[['Hotel room inventory','Strong for the final booking step; eventual for the "rooms left" badge on the search page.'],['YouTube view count','Eventual. Batch counts; nobody is harmed by a 30-second delay.'],['Password change','Strong: old password must stop working everywhere promptly.'],['Product reviews','Eventual; a new review can take seconds to appear.'],['Stock trading order book','Strong, single ordered sequence per symbol.'],['Online status dot','Eventual; it is a hint.']]},
 {t:'task',title:'Homework',items:['For an e-commerce checkout, mark each step (cart, price, stock, payment, email) as strong or eventual, with one sentence why.']}]}
],
labs:{
 quorum(el,api){
  el.innerHTML=`<div class="form"><label>N replicas: <b data-nv></b><input type="range" min="1" max="7" value="3" data-n></label><label>W (write acks): <b data-wv></b><input type="range" min="1" max="7" value="2" data-w></label><label>R (replicas read): <b data-rv></b><input type="range" min="1" max="7" value="2" data-r></label></div><div data-boxes style="display:flex;gap:8px;flex-wrap:wrap"></div><p class="muted small">Worst case shown: the write reaches the first W replicas; the read asks the last R.</p><div class="out"><div><b data-ov></b><span>read/write overlap</span></div><div><b data-wf></b><span>replicas that can fail, writes still succeed</span></div><div><b data-rf></b><span>replicas that can fail, reads still succeed</span></div></div><div class="verdict" data-v></div>`;
  const draw=()=>{const n=+api.$('[data-n]',el).value;['w','r'].forEach(k=>{const s=api.$('[data-'+k+']',el);s.max=n;if(+s.value>n)s.value=n});const w=+api.$('[data-w]',el).value,r=+api.$('[data-r]',el).value;
   api.$('[data-nv]',el).textContent=n;api.$('[data-wv]',el).textContent=w;api.$('[data-rv]',el).textContent=r;
   let bx='';for(let i=0;i<n;i++){const wr=i<w,rd=i>=n-r;bx+=`<div style="width:86px;padding:10px 6px;border-radius:8px;text-align:center;border:2px solid ${rd?'var(--accent)':'var(--line)'};background:${wr?'var(--good-soft)':'var(--card)'}"><div class="mono small">replica ${i+1}</div><div class="small">${wr?'v2 (new)':'v1 (old)'}</div><div class="small" style="color:var(--accent)">${rd?'read':'&nbsp;'}</div></div>`}
   api.$('[data-boxes]',el).innerHTML=bx;const ov=r+w-n;api.$('[data-ov]',el).textContent=ov>0?ov+' replica'+(ov>1?'s':''):'none';api.$('[data-wf]',el).textContent=n-w;api.$('[data-rf]',el).textContent=n-r;
   api.$('[data-v]',el).innerHTML=ov>0?`<b>R + W = ${r+w} > N = ${n}.</b> Every read includes at least one replica with v2, so reads see the latest write. ${w===n?'But W = N means one dead replica blocks all writes.':''}${r===n?' R = N means one dead replica blocks all reads.':''}`:`<b>R + W = ${r+w} ≤ N = ${n}.</b> A read can miss every new copy and return v1. Faster and more available, but reads may be stale: fine for view counts, wrong for balances.`};
  el.addEventListener('input',draw);draw()}
}});
