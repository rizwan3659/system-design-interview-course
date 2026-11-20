COURSE.addDeep('s01',{title:'Deep dive: the interview, requirements and estimation, beginner to expert',lead:'Read this after class. It starts from zero and ends at the level a senior interviewer expects. Each section builds on the one before it.',blocks:[
{t:'text',level:'f',title:'Beginner · What a system design interview really is',html:`
<p>A system design interview is a conversation about building software that many people use at once. The interviewer says something vague, such as "Design WhatsApp", and watches how you turn it into a working plan. There is no single right answer. They grade <b>how you think</b>: do you ask the right questions, make sensible choices, and explain what each choice costs?</p>
<p>Think of it like an architect asked to "design a house". A good architect first asks: how many people live here, what is the budget, is it in a snowy place? Only then do they draw. You do the same with software.</p>
<p><b>The 5-step loop</b> (use it every time):</p>
<ol>
<li><b>Clarify (5–8 min).</b> Who are the users? What are the 2–3 must-have features? How many users? What must never go wrong?</li>
<li><b>Define interactions (~5 min).</b> Write the main actions as API calls, for example <code>POST /messages</code>.</li>
<li><b>Identify the data (5–7 min).</b> What do we store, and how is it read most often?</li>
<li><b>Draw a simple design (~10 min).</b> Client → server → database, plus only the parts the requirements need.</li>
<li><b>Challenge and improve (rest).</b> What breaks at 10x traffic? What if a machine dies? Fix the weakest part first.</li>
</ol>
<p><b>Two kinds of requirement.</b> <i>Functional</i> = what the system does ("users can send a message"). <i>Non-functional</i> = how well it does it ("delivered in under 1 second", "99.99% uptime", "data stays in India").</p>`},
{t:'text',level:'f',title:'Beginner · Estimation without fear',html:`
<p>Estimation means rough maths to learn the <b>size</b> of the problem. You do not need exact numbers; you need the right order of magnitude (10, 1,000 or 1,000,000?).</p>
<ul>
<li>A day has 86,400 seconds. Round it to <b>100,000 (10<sup>5</sup>)</b>.</li>
<li>So <b>1 million requests a day ≈ 12 per second</b>. 100 million a day ≈ 1,200 per second.</li>
<li>Peak traffic is usually <b>2–3x the average</b> (10x for flash sales or live events).</li>
<li>Storage = items per day × size of one item × days kept.</li>
</ul>
<p>Example: 10 M users each send 20 messages a day = 200 M messages a day ÷ 10<sup>5</sup> ≈ <b>2,000 messages/s</b>, peak ≈ 6,000/s. At 200 bytes each, that is 40 GB a day, about 15 TB a year.</p>`},
{t:'text',level:'i',title:'Intermediate · Numbers every engineer should know',html:`
<p>These numbers tell you which designs are even possible. Memorise the ratios, not the exact values.</p>`},
{t:'table',level:'i',head:['Operation','Rough time','What it means for design'],rows:[
['Read from CPU cache','~1 ns','Free'],
['Read from RAM','~100 ns','In-memory caches (Redis) are fast because of this'],
['Read 1 MB sequentially from RAM','~10 µs',''],
['Random read from SSD','~100 µs','About 1,000x slower than RAM'],
['Round trip inside one data centre','~0.5 ms','A service call costs this even if the work is free'],
['Disk seek (spinning disk)','~10 ms','Why databases avoid random disk reads'],
['Round trip across a continent / ocean','~70–150 ms','Why global apps use CDNs and regional servers'],
],note:'Sizes: KB = 10³, MB = 10⁶, GB = 10⁹, TB = 10¹², PB = 10¹⁵ bytes. A char ≈ 1 byte, a UUID = 16 bytes, a tweet with metadata ≈ 1 KB, a photo ≈ 200 KB–2 MB, a minute of HD video ≈ 50–100 MB.'},
{t:'text',level:'i',title:'Intermediate · A full estimate in six steps (Twitter-like)',html:`
<ol>
<li><b>Users:</b> 200 M daily active users.</li>
<li><b>Writes:</b> 2 tweets per user per day = 400 M/day ≈ <b>4,600/s</b>, peak ≈ 10,000/s.</li>
<li><b>Reads:</b> each user reads ~100 tweets/day → 20 B reads/day ≈ <b>230,000/s</b>. Read:write ≈ 50:1, so this is <b>read-heavy</b> → caching and precomputed timelines matter most.</li>
<li><b>Storage:</b> 400 M × 1 KB = 400 GB/day ≈ 150 TB/year for text. If 10% carry a 1 MB image: 40 TB/day → object storage + CDN, never the main database.</li>
<li><b>Bandwidth:</b> 230 K reads/s × 1 KB ≈ 230 MB/s of text out; media dominates and goes through a CDN.</li>
<li><b>Cache:</b> 80/20 rule: 20% of content gets 80% of reads. Cache 20% of a day's reads: 0.2 × 20 B × 1 KB ≈ 4 TB → a cluster of cache machines, not one.</li>
</ol>
<p>Finish every estimate with a <b>decision</b>: "So we need a cache cluster, object storage for media, and the timeline must be precomputed."</p>`},
{t:'text',level:'x',title:'Expert · What separates a senior answer',html:`
<ul>
<li><b>Find the never-happen rule.</b> Bank: money is never created or lost. Tickets: a seat is never sold twice. Chat: an acknowledged message is never lost. Ride-hailing: one driver is never given two riders. Hospital: a record is never shown to the wrong person. This one rule decides where you need strong consistency; everything else can relax.</li>
<li><b>Every requirement adds (or removes) a box.</b> "Search old messages" adds a search index. "Offline users receive messages" adds durable storage and push notifications. "99.99% uptime" adds replicas and a second zone. If no requirement asks for a box, do not draw it.</li>
<li><b>Small systems stay small.</b> 2,000 students checking grades twice a day is 0.05 requests/s. The right answer is one server, one PostgreSQL with backups. Proposing Kafka and microservices here is a red flag, not a strength.</li>
<li><b>Drive the interview.</b> Keep a visible plan, announce transitions ("I have the basic design; now I want to stress the write path"), and keep time: by minute 25 of 45 you should be deep-diving, not still drawing boxes.</li>
<li><b>State trade-offs as a pair.</b> "This gives us X, and it costs Y. Since the requirement is Z, X is worth it."</li>
<li><b>Know the concurrency trap.</b> "Two buyers, one seat" is solved by an atomic conditional write (<code>UPDATE … WHERE status='free'</code>) or a short hold with a timeout, never by "check, then write" in two steps.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions to answer out loud',items:[
{q:'The interviewer says "Design YouTube" and nothing else. What are your first three questions?',a:'(1) Which features are in scope: upload, watch, search, comments, recommendations? (2) Scale: daily viewers, uploads per day, average video length? (3) What matters most: playback start time, global reach, cost? Then confirm scope out loud before drawing.'},
{q:'Your estimate says 50 writes/s. The interviewer asks if you would shard. Answer?',a:'No. One relational database handles thousands of simple writes per second. I would add a replica for failover and backups. Sharding adds cross-shard queries, resharding and ID problems we do not need yet. I would revisit at 10–50x growth.'},
{q:'How do you plan for peak in a ticketing system?',a:'Average is meaningless: a popular show sells out in minutes. Plan for 50–100x average at sale opening: a virtual waiting room to admit users at a fixed rate, seat holds with expiry, and a conditional write for the hold so the database stays the single source of truth.'},
{q:'Why do interviewers care about estimation if numbers are rough?',a:'Because the number picks the architecture: 10 req/s and 100,000 req/s need completely different designs. A rough number turned into a decision ("so we need a cache") is what gets credit.'},
]}
]});
