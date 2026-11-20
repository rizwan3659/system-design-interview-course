COURSE.addDeep('s06',{title:'Deep dive: consistency and distributed systems, beginner to expert',lead:'From "why can two users see different data?" to CAP, PACELC, quorums, clocks, sagas and fencing tokens.',blocks:[
{t:'text',level:'f',title:'Beginner · Why distributed systems are hard',html:`
<p>When data lives on several machines, three things can go wrong that never happen on one computer:</p>
<ol>
<li><b>Messages are slow or lost.</b> A request may arrive late, twice, or never. You cannot tell a slow machine from a dead one.</li>
<li><b>Machines fail independently.</b> One copy is updated, another is not yet.</li>
<li><b>Clocks disagree.</b> Each machine's time can be off by milliseconds or more.</li>
</ol>
<p>So two users can see different answers at the same moment. <b>Consistency</b> is about what users are allowed to see. <b>Strong consistency</b>: everyone sees the latest write, as if there were one copy. <b>Eventual consistency</b>: copies may differ for a while but agree once updates stop.</p>`},
{t:'text',level:'i',title:'Intermediate · CAP and PACELC, stated correctly',html:`
<p><b>CAP:</b> when there is a network <b>P</b>artition (some machines cannot talk to others), a system must choose between <b>C</b>onsistency (refuse requests that might return stale data) and <b>A</b>vailability (answer anyway, maybe stale). Partitions will happen, so it is really "C or A during a partition", not "pick any two".</p>
<ul>
<li>Concert seats, bank withdrawals → choose <b>C</b>: better to say "try again" than double-sell.</li>
<li>Social feed, like counts, shopping cart add → choose <b>A</b>: stale for a few seconds is fine.</li>
</ul>
<p><b>PACELC</b> adds the normal case: <b>E</b>lse (no partition), choose between <b>L</b>atency and <b>C</b>onsistency. Waiting for replicas in other regions makes every write slower. This trade-off happens every day, partitions are rare.</p>`},
{t:'table',level:'i',title:'Consistency models, strongest to weakest',head:['Model','Guarantee','Example of violation it prevents'],rows:[
['Linearizable (strong)','Behaves like one copy; once a write is done, every later read sees it','Two people buy the last seat'],
['Sequential','Everyone sees operations in the same order (not necessarily real-time)',''],
['Causal','If B was caused by A, everyone sees A before B','Seeing a reply before the question'],
['Read-your-writes','You always see your own updates','Your comment disappears on refresh'],
['Monotonic reads','You never see time go backwards','A like count goes 10 → 12 → 11'],
['Eventual','Copies converge if writes stop','—'],
]},
{t:'text',level:'i',title:'Intermediate · Quorums',html:`
<p>With <b>N</b> replicas, a write waits for <b>W</b> acknowledgements, a read asks <b>R</b> replicas. If <b>R + W &gt; N</b>, every read set overlaps every write set, so at least one replica in the read has the latest value (pick the newest version).</p>
<ul>
<li>N=3, W=2, R=2: overlap → reads see the latest write; tolerates 1 failed replica.</li>
<li>N=5, W=3, R=3: tolerates 2 failures for both reads and writes.</li>
<li>W=1, R=1: fastest, eventual consistency only.</li>
<li>W=N: reads fast with R=1, but any one failure blocks writes.</li>
</ul>`},
{t:'text',level:'x',title:'Expert · Time, ordering and multi-step operations',html:`
<ul>
<li><b>Do not trust wall clocks for ordering.</b> NTP skew can be tens of ms; clocks jump. "Last write wins" by timestamp silently drops writes. Use sequence numbers from a single owner (per-conversation counter), <b>Lamport clocks</b> (counter, total order), <b>vector clocks</b> (detect concurrent writes), or hybrid logical clocks. Google Spanner uses TrueTime with bounded uncertainty and waits it out.</li>
<li><b>Idempotency everywhere.</b> Networks retry, so every handler must be safe to run twice: idempotency keys, upserts, "set status = PAID where status = PENDING".</li>
<li><b>"Exactly once" in practice</b> = at-least-once delivery + idempotent processing (deduplicate by message id).</li>
<li><b>Two-phase commit (2PC):</b> a coordinator asks all participants to prepare, then commit. Atomic, but blocking: if the coordinator dies after prepare, participants hold locks and wait. Fine inside one database cluster; poor across microservices.</li>
<li><b>Saga:</b> a sequence of local transactions, each with a <b>compensating</b> action (reserve stock → charge card → ship; if charging fails, release stock). <i>Orchestrated</i> (a central workflow, easier to follow; Temporal, Step Functions) or <i>choreographed</i> (services react to events; looser but harder to trace). Sagas give eventual consistency; intermediate states are visible, so design them ("payment pending").</li>
<li><b>Distributed locks:</b> a lock with a lease (expires if the holder dies). Danger: the holder pauses (GC), the lease expires, someone else takes the lock, the first one wakes and writes. Fix: <b>fencing token</b>, a number that increases with each lock grant; storage rejects writes with an older token.</li>
<li><b>Consensus</b> (Raft, Paxos): a majority agrees on a log of decisions. Used for leader election and metadata (etcd, ZooKeeper), not for every user request.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Transfer money between two services (wallet A in service 1, wallet B in service 2). Design it.',a:'Saga with a durable transfer record: create transfer (PENDING) → debit A with idempotency key = transfer id → credit B with same key → mark COMPLETED. If credit fails permanently, compensate by refunding A. Use a transactional outbox to publish each step\'s event. Ledger entries are append-only (double-entry) so you can always reconcile.'},
{q:'Alice sees Bob\'s reply before Bob\'s question. Which guarantee is missing and how do you fix it?',a:'Causal consistency. Fix: assign per-conversation sequence numbers from one owner and deliver in order (buffer gaps), or attach causal metadata (the id of the message being replied to) and hold the reply until its parent is present.'},
{q:'Like counts across regions: strong or eventual?',a:'Eventual. Use per-region counters (or a CRDT G-counter) merged asynchronously. Nobody is harmed by a count being off for seconds, and strong consistency would add cross-region latency to every like.'},
{q:'During a partition your shopping cart service must choose. What do you pick?',a:'Availability: accept adds on both sides and merge later (union of items; Amazon Dynamo\'s classic case). The cost: a deleted item can reappear, so checkout validates the final cart against inventory and prices.'},
]}
]});
