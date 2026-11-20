COURSE.addDeep('s09',{title:'Deep dive: URL shortener and Pastebin, beginner to expert',lead:'The complete design walked end to end, then the deep dives that separate a good answer from a great one.',blocks:[
{t:'text',level:'f',title:'Beginner · What we are building',html:`
<p>A URL shortener turns <code>https://example.com/very/long/path?with=params</code> into <code>sho.rt/aB3x9Kq</code>. When someone opens the short link, the service redirects them to the long one.</p>
<p>Two actions:</p>
<ul><li><code>POST /links {long_url, custom_alias?, expires_at?}</code> → <code>{short_code}</code></li>
<li><code>GET /{code}</code> → HTTP redirect to the long URL</li></ul>
<p>One table: <code>code (primary key) → long_url, owner, created_at, expires_at</code>. The simplest working design: client → app server → database. Everything else is added only when scale or a requirement asks.</p>
<p><b>Never-happen rule:</b> a code must never point to the wrong URL (two links must never get the same code).</p>`},
{t:'text',level:'i',title:'Intermediate · Estimate, then decide',html:`
<ul>
<li>100 M new links/month ≈ 40 writes/s (peak ~100).</li>
<li>Reads 100:1 → 4,000 redirects/s average, peaks of 10–40 K/s for viral links.</li>
<li>5 years × 100 M × 12 = 6 B links × ~500 bytes ≈ 3 TB. Fits a sharded KV store comfortably, or a large relational DB.</li>
<li>Code length: base62 (a–z, A–Z, 0–9). 62<sup>6</sup> ≈ 57 B, 62<sup>7</sup> ≈ 3.5 T. <b>7 characters</b> is plenty.</li>
</ul>
<p><b>Decisions:</b> read-heavy and skewed → cache in front of the store (Redis; a few popular links take most traffic) and optionally the CDN for redirects. Simple key lookups at billions of rows → a key-value store (DynamoDB/Cassandra) or sharded PostgreSQL keyed by code.</p>`},
{t:'table',level:'i',title:'Intermediate · Three ways to generate codes',head:['Method','How','Pros','Cons'],rows:[
['Counter + base62','A global counter (ID service hands out ranges of 1,000 to each app server); encode the number in base62','No collisions, short codes','Codes are guessable/sequential; ID service must be highly available (ranges make it rarely called)'],
['Hash the URL','MD5/SHA of long URL, take 7 chars','Same URL → same code (dedupe for free)','Collisions must be checked and resolved; custom aliases complicate it'],
['Random + check','Random 7 chars, insert with unique constraint, retry on conflict','Unguessable, simple','Rare retries; extra write check as space fills'],
]},
{t:'text',level:'i',title:'Intermediate · The read path',html:`
<ol>
<li><code>GET /aB3x9Kq</code> hits the load balancer → stateless app server.</li>
<li>Check Redis: hit → redirect. Miss → read the store, put it in Redis with a TTL, redirect.</li>
<li>Return <b>301</b> (permanent: browsers cache it, less load, but you lose click counts and cannot change the target) or <b>302/307</b> (temporary: every click reaches you, so analytics work). Most commercial shorteners use 302.</li>
<li>Publish a click event to a queue asynchronously; analytics never slows the redirect.</li>
</ol>`},
{t:'text',level:'x',title:'Expert · Deep dives',html:`
<ul>
<li><b>Expiry:</b> check <code>expires_at</code> on read (lazy) and return 404/410; a background job deletes expired rows in batches; set cache TTL ≤ remaining lifetime. Or use the store's native TTL (DynamoDB/Cassandra).</li>
<li><b>Custom aliases:</b> same keyspace as generated codes, insert with a unique constraint (first wins). Reserve words (admin, api). To avoid clashing with the counter, generated codes can use a different length or prefix.</li>
<li><b>Same long URL twice:</b> a product decision. Per-user dedupe via an index on <code>(owner, hash(long_url))</code>; otherwise give a new code (each link has its own analytics and expiry).</li>
<li><b>Unique visitors per link:</b> exact sets per link are huge; use <b>HyperLogLog</b> (≈12 KB per counter, ~1% error) in Redis, or batch-compute in the analytics warehouse.</li>
<li><b>Abuse:</b> scan targets against malware/phishing lists, rate-limit link creation per user/IP, allow takedown.</li>
<li><b>Scaling to 1 M redirects/s:</b> CDN/edge caching of redirects for popular links, local in-process caches on app servers, replicated cache, store partitioned by code. The write path stays tiny.</li>
<li><b>Multi-region:</b> reads served from regional replicas; writes go to one region or use region-prefixed ID ranges so no coordination is needed.</li>
</ul>`},
{t:'text',level:'x',title:'Expert · Pastebin, the twist',html:`
<p>Same shape, but the value is large text (up to a few MB). Store the <b>paste body in object storage</b> (S3) under a random key, and metadata (id, owner, visibility, expiry, size, object key) in the database. Small pastes can stay inline for speed.</p>
<ul>
<li><b>Private pastes:</b> unguessable long ids (16+ random chars) for "unlisted", plus auth checks for truly private ones; never list them publicly; serve via short-lived signed URLs.</li>
<li><b>Viral paste:</b> serve through the CDN with cache headers; the origin sees a trickle.</li>
<li><b>Size limits and compression</b> (text compresses 3–10x); <b>expiry</b> via object-storage lifecycle rules.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Why not just use an auto-increment id from one database for codes?',a:'It works at small scale, but it makes codes sequential (anyone can enumerate links) and ties every write to one database. Range-allocating IDs from a small ID service, then shuffling/encoding, scales and hides order.'},
{q:'The interviewer asks for 301 vs 302. What do you say?',a:'302 if we need click analytics or the ability to edit/disable links; 301 if we want minimal load and links never change. I would pick 302 and absorb load with caching.'},
{q:'How do you avoid a hot key when one link goes viral?',a:'Multi-layer caching: CDN edge, in-process cache with a short TTL on each app server, and Redis. Very few requests reach the store; Redis load is spread by local caches.'},
{q:'What is your data model in a KV store?',a:'Key: code. Value: long_url, owner_id, created_at, expires_at. Secondary table for "my links": partition by owner_id, sort by created_at → code. Click stats live in the analytics system, not on the link row.'},
]}
]});
