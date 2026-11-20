COURSE.addDeep('s20',{title:'Deep dive: putting it all together, beginner to expert',lead:'Model outlines for every capstone prompt, the whole course on one page, and how to keep improving after the course.',blocks:[
{t:'text',level:'f',title:'Beginner · The two loops, memorised',html:`
<p><b>HLD (40–45 min):</b> Clarify (users, features, scale, never-happen rule) → Interactions (API) → Data (entities, top read, riskiest write) → Simple design (trace one request) → Challenge (bottlenecks, failures, scale) and improve.</p>
<p><b>LLD (35–45 min):</b> Requirements and scope → Entities → Class diagram → Patterns where change is expected → Code the core flow → Extend on request.</p>
<p>If you get stuck in an interview, say which step of the loop you are on and what you need to decide next. That alone shows structure.</p>`},
{t:'table',level:'i',title:'Intermediate · The whole course in one table',head:['When you see…','Reach for…','And say the cost'],rows:[
['Read-heavy, skewed popularity','Cache (cache-aside), CDN for static/media','Staleness, invalidation, stampedes'],
['Large files','Object storage + pre-signed upload + CDN','Two-step upload flow, lifecycle rules'],
['Slow or spiky work','Queue + workers, idempotent consumers, DLQ','Eventual results, duplicates, lag monitoring'],
['One DB too small/slow for writes','Shard by the main query key; consistent hashing','Cross-shard queries/transactions, resharding'],
['Read scaling / failover','Leader–follower replicas','Replication lag, read-your-writes, failover data loss'],
['Never double-sell / never lose money','Atomic conditional writes, transactions, idempotency keys, sagas','Lower availability during partitions, latency'],
['Real-time push','WebSocket/SSE gateways + session registry','Connection management, reconnect storms'],
['Location / nearby','Geohash / quadtree / H3 cells, in-memory index','Cell edges, hot cities'],
['Overload and abuse','Rate limiting (token bucket), load shedding','False rejects, limiter availability'],
['Failing dependencies','Timeouts, retries with backoff + budget, circuit breaker, bulkheads','Complexity, fallbacks to design'],
['Code that will change','Strategy / State / Observer / Factory / Decorator','More classes; justify each'],
['Shared mutable state','Locks (ordered), atomic CAS, thread-safe queues','Contention, deadlock risk'],
]},
{t:'text',level:'x',title:'Expert · HLD model outlines for the capstone prompts',html:`
<p><b>YouTube.</b> Upload: pre-signed upload to object storage → "uploaded" event → transcoding pipeline (split into chunks, parallel workers, multiple resolutions, HLS/DASH segments) → CDN. Watch: metadata service + CDN-served segments with adaptive bitrate. Views/likes via counters with write-back; search via an index fed by CDC; recommendations offline. Key numbers: uploads hours/min, egress dominates cost → CDN and popular-content caching at the edge.</p>
<p><b>Google Docs.</b> Real-time collaborative editing: clients send operations over WebSocket to a document session server (one owner per document); conflicts resolved by Operational Transformation (server orders ops) or CRDTs. Ops appended to a log, periodic snapshots; presence/cursors are ephemeral. Permissions per doc; offline edits merged on reconnect. Hot documents: one session server per doc, sharded by doc id.</p>
<p><b>Food delivery.</b> Restaurant search (geo + filters via search index), menu cache, order service with a state machine (placed → accepted → preparing → picked up → delivered), idempotent payment, a dispatch service matching riders (like Uber), live tracking over WebSocket, notifications via queues. Peak at meal times → autoscaling + queue buffering.</p>`},
{t:'text',level:'x',title:'Expert · LLD model outlines for the capstone prompts',html:`
<p><b>Splitwise.</b> User, Group, Expense(paid_by, amount, splits), Split strategies (Equal, Exact, Percent — Strategy pattern, validated to sum correctly), BalanceSheet as a map user → user → amount. "Simplify debts": compute each person's net balance, then greedily match the largest creditor with the largest debtor. Use integer paise, never floats, for money.</p>
<p><b>Movie ticket booking (BookMyShow).</b> Movie, Theatre, Screen, Show, Seat, ShowSeat(status), Booking, Payment. The core is concurrency: seat hold with expiry using an atomic conditional update (or a lock per show), then payment, then confirm; expired holds are released by a sweeper. Pricing by seat category = Strategy; notifications = Observer.</p>
<p><b>Snakes and ladders.</b> Board(size, jumps: dict start → end for both snakes and ladders), Dice (Strategy: normal, loaded for tests, multiple dice), Player(position), Game(turn queue, winner rule). Keep rules in the Game, randomness injectable for deterministic tests; extensions: exact roll to finish, extra turn on 6, three 6s forfeits.</p>`},
{t:'table',level:'x',title:'Interview-day checklist',head:['Before','During','After'],rows:[
['Re-read the two loops and your project story','Restate the problem and agree scope first','Note what you were asked that you could not answer'],
['Revise numbers: 10⁵ s/day, latency table, sizes','Think out loud; announce each transition','Write a 5-line summary of the design you gave'],
['Do one timed mock in each format','Give trade-offs as pairs (gain / cost)','Turn every gap into a flashcard for spaced revision'],
['Prepare a clean drawing tool / paper','Watch the clock: deep-dive by minute ~25','Pick one habit to fix before the next mock'],
]},
{t:'text',level:'x',title:'Expert · How to keep growing after the course',html:`
<ul>
<li>Read real architecture write-ups (engineering blogs of large companies) and redraw each one with the 5-step loop: what requirement forced each box?</li>
<li>Read <i>Designing Data-Intensive Applications</i> (Kleppmann) for the deep theory behind sessions 3–7.</li>
<li>Build small versions: a URL shortener with Redis cache, a chat server with WebSockets, a token-bucket limiter — then load-test them and watch what breaks first.</li>
<li>Do one mock interview a week, alternating HLD and LLD, and score yourself with the rubrics in this course.</li>
</ul>`}
]});
