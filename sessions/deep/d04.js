COURSE.addDeep('s04',{title:'Deep dive: caching and CDNs, beginner to expert',lead:'From "keep a copy close by" to invalidation races, stampedes, hot keys and tail latency.',blocks:[
{t:'text',level:'f',title:'Beginner · What a cache is',html:`
<p>A cache keeps a <b>copy</b> of data somewhere faster than the original. Reading from memory takes ~0.1 ms; a database query may take 5–50 ms. If the same data is asked for again and again, answering from the copy makes the app faster and protects the database.</p>
<p>Everyday example: you keep the phone numbers you call most on your home screen instead of searching contacts each time.</p>
<p><b>Hit</b> = the data was in the cache. <b>Miss</b> = it was not, so we go to the database and (usually) store it for next time. <b>Hit rate</b> = hits ÷ all reads. 95% hit rate means the database sees only 5% of reads.</p>
<p><b>TTL</b> (time to live) = how long a copy is kept before it expires. <b>Eviction</b> = what to throw out when the cache is full; usually <b>LRU</b> (least recently used).</p>`},
{t:'text',level:'f',title:'Beginner · Where caches live',html:`
<ol>
<li><b>Browser / app:</b> images, scripts, API responses with <code>Cache-Control</code> headers.</li>
<li><b>CDN edge:</b> servers in many cities hold copies of static files (images, video, JS) close to users. A user in Chennai gets the image from Chennai, not from Virginia.</li>
<li><b>Application memory:</b> a small in-process map; fastest, but each server has its own copy.</li>
<li><b>Distributed cache:</b> Redis or Memcached cluster shared by all servers.</li>
<li><b>Database buffer pool:</b> the database's own memory cache of disk pages.</li>
</ol>
<p>Caching helps when data is <b>read much more than written</b>, some items are <b>much more popular</b> than others, and slightly <b>stale data is acceptable</b>.</p>`},
{t:'table',level:'i',title:'Intermediate · Caching patterns',head:['Pattern','How it works','Good for','Risk'],rows:[
['Cache-aside (lazy loading)','App reads cache; on miss reads DB and fills cache. On write: update DB, then delete the cache key','Default for most read-heavy data','First read after expiry is slow; brief staleness'],
['Read-through','Cache library itself loads from DB on miss','Same as cache-aside, cleaner code','Same'],
['Write-through','Write goes to cache and DB together','Data read right after write','Slower writes; caches data never read'],
['Write-back (write-behind)','Write to cache, flush to DB later in batches','Very high write rates (like counters)','Data loss if cache dies before flush'],
['Write-around','Write only to DB; cache fills on read','Data written once, rarely read (logs)','First read is a miss'],
]},
{t:'code',level:'i',title:'Cache-aside in a few lines',lang:'python',code:`
def get_product(pid):
    data = redis.get(f"product:{pid}")
    if data is not None:
        return data                                  # hit
    data = db.query("SELECT ... WHERE id=%s", pid)   # miss
    redis.set(f"product:{pid}", data, ex=300 + random.randint(0, 60))  # TTL with jitter
    return data

def update_product(pid, fields):
    db.update(pid, fields)          # 1. source of truth first
    redis.delete(f"product:{pid}")  # 2. delete, do not set: next read refills fresh data`},
{t:'text',level:'i',title:'Intermediate · Sizing a cache',html:`
<p>Use the working set, not the whole dataset. If 1 M products are viewed per day, 20% of them get 80% of views, and each is 5 KB: 200 K × 5 KB = 1 GB, so a single Redis node fits. Add room for overhead (~1.5–2x) and replication.</p>
<p><b>Skew matters:</b> with very uneven popularity, a cache holding 10% of items may hit 80–90%. With <b>uniform</b> access, a 10% cache gives only about a 10% hit rate: caching barely helps.</p>`},
{t:'text',level:'x',title:'Expert · The four hard problems and their fixes',html:`
<ol>
<li><b>Cache disagrees with the database.</b> Why delete instead of set on update? Two writers can set the cache in the opposite order of their DB commits, leaving the old value forever. Deleting is idempotent and the next read loads the committed value. A remaining race (a slow reader refills an old value just after the delete) is closed by short TTLs, a delayed second delete, or invalidating from the database's change stream (CDC) instead of from app code. For data that must be exact (balance at payment) <b>read the database</b>.</li>
<li><b>Stampede (thundering herd).</b> A hot key expires and 10,000 requests all miss and hit the DB together. Fixes: one loader per key (request coalescing / a short lock, others wait or get stale data); <b>stale-while-revalidate</b> (serve the old value while one worker refreshes); <b>probabilistic early refresh</b>; and TTL jitter so many keys do not expire at the same second.</li>
<li><b>Hot key.</b> One key (a celebrity's profile, a flash-sale item) overloads a single cache node. Fixes: small local in-process cache in front of Redis (a 1–5 s TTL removes most traffic); replicate the key as <code>item:42#1..#N</code> and read a random copy; read replicas for the cache.</li>
<li><b>Cold start.</b> After a restart or deploy, an empty cache sends all traffic to the DB. Fixes: warm the cache with the top keys before taking traffic, shift traffic gradually, and use replicas so one node failing does not empty everything.</li>
</ol>
<p><b>Tail latency:</b> average latency can look great while p99 is bad because the 1–5% of misses are 50x slower. Report p50/p95/p99, and size the DB for the miss traffic at peak, including a full cache failure (or shed load if that is impossible).</p>
<p><b>CDN details:</b> cache keys include the URL (and selected headers); version static files by content hash (<code>app.3f9a.js</code>) so you can cache them for a year and never purge. For dynamic but shared pages, short edge TTLs (a few seconds) still absorb huge spikes. Private, per-user data is <code>Cache-Control: private</code>.</p>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Like counters are updated 50 K times a second. How do you cache them?',a:'Write-back: INCR in Redis (atomic, sharded by post id), and a background job flushes totals to the DB every few seconds. Losing a few likes on a crash is acceptable. Shown counts can be slightly stale. For the "did I like this" flag store per-user rows durably.'},
{q:'Fast on average, slow at p99. Where do you look?',a:'Cache misses and evictions (hit rate by key), hot keys on one node, large values, GC pauses, the DB queries behind misses, and retries. Compare latency of hits vs misses; often the fix is better TTLs/coalescing, or caching the expensive part.'},
{q:'Should you cache inventory count at checkout?',a:'Show a cached "in stock" on the product page (fine if slightly stale), but the checkout must reserve stock with an atomic conditional write in the database. Cache for display, database for decisions.'},
{q:'Which eviction policy and why?',a:'LRU by default: recent use predicts near-future use. LFU (or Redis allkeys-lfu) when a stable set of popular items should survive bursts of one-off scans. TTL-only when freshness matters more than memory.'},
]}
]});
