COURSE.add({id:'s04',n:4,part:'A',track:'HLD',
title:'Caching and CDNs',
goal:'Make reads fast and cheap with caches, and handle the hard parts: invalidation, stampedes and hot keys.',
outcomes:['Place caches at the right layer','Choose cache-aside, write-through or write-back','Predict hit rate from capacity and traffic skew','Handle stale data, stampedes and hot keys'],
modules:[
{title:'Warm-up: recall session 3',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Index on (a, b). Does <code>WHERE b = 5</code> use it?',opts:['Yes','No'],a:1},
  {q:'Where do user videos go?',opts:['Relational table','Object storage + CDN'],a:1},
  {q:'Two buyers grab one seat. Simplest correct fix?',opts:['Read then write','Conditional update / row lock','Retry later'],a:1}]}]},

{title:'Why and where to cache',tab:'Where to cache',mins:20,out:'Name 5 cache layers',lead:'A cache keeps a copy of data closer to the reader. It trades memory and freshness for speed and lower load.',blocks:[
 {t:'cards',title:'Cache layers, from the user inward',items:[
  {tag:'Layer 1',title:'Browser / app',sub:'Cache-Control headers',body:'<p>Static files and some API responses cached on the device. Zero network cost. Control with <code>Cache-Control: max-age=…</code> and ETags.</p>'},
  {tag:'Layer 2',title:'CDN edge',sub:'Near the user',body:'<p>Servers in many cities hold images, video, JS and cacheable pages. Cuts latency from ~150 ms to ~20 ms and takes most bandwidth off your servers.</p><p><b>Push</b> CDN: you upload. <b>Pull</b> CDN: fetches from your origin on first miss.</p>'},
  {tag:'Layer 3',title:'Application memory',sub:'Per server',body:'<p>A small in-process cache (config, hot lookups). Fastest, but each server has its own copy, so they can disagree.</p>'},
  {tag:'Layer 4',title:'Distributed cache',sub:'Redis / Memcached',body:'<p>A shared cache cluster that all app servers use. The usual answer for "add a cache" in interviews. Sub-millisecond reads.</p>'},
  {tag:'Layer 5',title:'Database buffer',sub:'Inside the DB',body:'<p>The database keeps hot pages in memory itself. Free, but limited by the DB machine\'s RAM.</p>'}]},
 {t:'grid',cols:2,title:'When caching helps, and when it does not',items:[
  {tag:'Helps',tc:'green',title:'Read-heavy, skewed, tolerant',body:'Many more reads than writes; a small set of items gets most reads; readers accept data a few seconds old.'},
  {tag:'Hurts',tc:'red',title:'Write-heavy, uniform, strict',body:'Every item read once; data changes constantly; readers must always see the latest value (account balance at checkout).'}]}]},

{title:'Caching patterns',tab:'Patterns',mins:25,out:'Pick a pattern per scenario',blocks:[
 {t:'table',title:'Read and write patterns',head:['Pattern','How it works','Good','Cost'],rows:[
  ['Cache-aside (lazy)','App reads cache; on miss reads DB and fills cache','Simple; only caches what is read','First read is slow; stale until TTL or delete'],
  ['Read-through','Cache itself loads from DB on miss','App code is simpler','Cache must know the DB'],
  ['Write-through','Write cache and DB together','Cache always fresh','Slower writes; caches data never read'],
  ['Write-back (write-behind)','Write cache now, DB later in batches','Very fast writes','Data loss if the cache dies before flushing'],
  ['Write-around','Write DB only; cache fills on read','Avoids caching write-once data','Recent writes miss the cache']]},
 {t:'code',title:'Cache-aside in 10 lines',code:`
def get_product(pid):
    key = f"product:{pid}"
    cached = cache.get(key)
    if cached is not None:
        return cached                      # hit: ~0.5 ms
    product = db.query("SELECT * FROM products WHERE id = %s", pid)   # miss: ~5 ms
    cache.set(key, product, ttl=300)       # keep 5 minutes
    return product

def update_product(pid, fields):
    db.update("products", pid, fields)
    cache.delete(f"product:{pid}")         # delete, don't set: avoids racing writers`},
 {t:'mcq',title:'Which pattern?',items:[
  {q:'Product pages: read 1,000x more than edited; a minute of staleness is fine.',opts:['Cache-aside with TTL','Write-back','No cache'],a:0},
  {q:'Like counters updated 50 K times a second; losing a few likes on a crash is acceptable.',opts:['Write-through','Write-back (batch to DB)','Write-around'],a:1},
  {q:'Audit logs written once, almost never read.',opts:['Write-through','Write-around (do not cache)','Read-through'],a:1},
  {q:'Account balance shown at payment confirmation.',opts:['Cache with 5-minute TTL','Read from the database','CDN'],a:1,why:'Correctness beats speed here.'}]}]},

{title:'Lab: hit rate, capacity and skew',tab:'Lab',mins:25,out:'Explain hit rate with numbers',lead:'Hit rate depends on how much you cache and how skewed traffic is. Run the simulation and watch database load change.',blocks:[
 {t:'lab',fn:'lru'},
 {t:'teacher',items:['Set skew to "uniform" and show that even a large cache barely helps. Then set "very skewed": a 5% cache serves most reads.','Ask: "Why might LRU beat FIFO?" Popular items keep getting refreshed in LRU; FIFO evicts them on schedule.']}]},

{title:'The hard parts',tab:'Hard parts',mins:20,out:'Fixes for 4 cache problems',blocks:[
 {t:'grid',title:'Four problems and their fixes',items:[
  {tag:'Stale data',tc:'amber',title:'Cache disagrees with DB',body:'Use a TTL as a safety net; delete the key on write; for strict data, skip the cache. Order matters: update DB, then delete cache.'},
  {tag:'Stampede',tc:'red',title:'A hot key expires',body:'Thousands of requests miss at once and hit the DB. Fixes: one request rebuilds while others wait (lock / single flight), refresh early before expiry, add random jitter to TTLs.'},
  {tag:'Hot key',tc:'red',title:'One key gets huge traffic',body:'One cache node melts. Fixes: replicate the key to several nodes (key#1..key#5), or keep a tiny in-process copy for a few seconds.'},
  {tag:'Cold start',tc:'amber',title:'Cache restarts empty',body:'All traffic goes to the DB. Fixes: warm the most popular keys first, ramp traffic gradually, keep a replica so the DB can absorb it.'}]},
 {t:'reveal',title:'Interview questions',items:[
  {q:'Why delete the cache key on update instead of setting the new value?',a:'Two writers can race: A sets old value after B set the new one, leaving the cache wrong until TTL. Delete makes the next reader load the latest value from the DB.'},
  {q:'What eviction policy would you use and why?',a:'LRU for most workloads: recently used items are likely used again. LFU when popularity is stable over long periods. TTL for data that must expire.'},
  {q:'How big should the cache be?',a:'Size it to the hot set: e.g. 20% of items get 80% of reads. 1 M products × 2 KB × 20% ≈ 400 MB: one cache node.'}]}]},

{title:'Guided problem and review',tab:'Guided + review',mins:20,out:'Cache plan for a product page',blocks:[
 {t:'stepper',title:'Guided · Speed up an e-commerce product page',steps:[
  {title:'Find the load',short:'Load',secs:90,think:'5 M product views a day, 2 M products, page takes 800 ms. Where does time go?',answer:'Page HTML + images + price + stock + reviews. Images and JS are the heaviest; product details rarely change; price and stock change more often.'},
  {title:'Place caches',short:'Place',secs:150,think:'Assign each piece of the page to a cache layer and TTL.',answer:'<ul class="clean"><li>Images, JS, CSS → CDN, TTL 1 year with versioned file names.</li><li>Product details, reviews summary → Redis, cache-aside, TTL 10 min, delete on edit.</li><li>Price → Redis, TTL 60 s.</li><li>Stock → read live at checkout; show "in stock" from cache on the page.</li></ul>'},
  {title:'Challenge',short:'Challenge',secs:120,think:'A flash sale makes one product 100x hotter, and its price changes at 12:00 sharp.',answer:'Hot key: keep that product in each app server\'s memory for 2 s. Price change: delete the key at 12:00 and use single-flight so only one request reloads it. Checkout always re-reads price from the DB.'}]},
 {t:'flash',items:[['Cache-aside in one line?','Read cache → on miss read DB → put in cache.'],['Write-back risk?','Data loss if the cache fails before flushing to the DB.'],['Stampede fix?','Single-flight lock, early refresh, TTL jitter.'],['CDN pull vs push?','Pull fetches from origin on first miss; push uploads ahead of time.'],['When not to cache?','Write-heavy, uniform access, or must-be-latest data.']]},
 {t:'task',title:'Homework',items:['Write a cache plan for a news website on election night: what to cache where, with TTLs, and how you handle the hot headline.']}]}
],
labs:{
 lru(el,api){
  el.innerHTML=`<div class="form"><label>Cache size (items out of 1,000)<input type="range" min="10" max="500" step="10" value="100" data-c></label><label>Traffic skew<select data-s><option value="0">Uniform: every item equally popular</option><option value="0.8">Mild skew</option><option value="1.1" selected>Skewed (typical web)</option><option value="1.5">Very skewed (viral)</option></select></label><label>Eviction policy<select data-p><option value="lru">LRU: drop least recently used</option><option value="fifo">FIFO: drop oldest inserted</option></select></label></div><div class="out"><div><b data-cv></b><span>items cached</span></div><div><b data-h></b><span>hit rate</span></div><div><b data-db></b><span>DB reads/s at 2,000 req/s</span></div></div><div class="meter"><i data-m></i></div><div><p class="small muted">Last 60 requests (green = hit, red = miss)</p><div data-strip style="display:flex;flex-wrap:wrap;gap:2px;margin-top:6px"></div></div><div class="verdict" data-v></div>`;
  const run=()=>{const C=+api.$('[data-c]',el).value,s=+api.$('[data-s]',el).value,pol=api.$('[data-p]',el).value,N=1000,REQ=20000;
   const w=[];let tot=0;for(let i=1;i<=N;i++){const x=s?1/Math.pow(i,s):1;w.push(x);tot+=x}const cdf=[];let acc=0;for(const x of w){acc+=x/tot;cdf.push(acc)}
   let seed=42;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
   const pick=()=>{const r=rnd();let lo=0,hi=N-1;while(lo<hi){const m=(lo+hi)>>1;if(cdf[m]<r)lo=m+1;else hi=m}return lo};
   const cache=new Map();let hits=0;const strip=[];
   for(let i=0;i<REQ;i++){const k=pick();let hit=cache.has(k);if(hit){hits++;if(pol==='lru'){cache.delete(k);cache.set(k,1)}}else{cache.set(k,1);if(cache.size>C)cache.delete(cache.keys().next().value)}if(i>=REQ-60)strip.push(hit)}
   const hr=hits/REQ;api.$('[data-cv]',el).textContent=C+' ('+(C/10)+'%)';api.$('[data-h]',el).textContent=(hr*100).toFixed(1)+'%';api.$('[data-db]',el).textContent=Math.round(2000*(1-hr)).toLocaleString();api.$('[data-m]',el).style.width=(hr*100)+'%';
   api.$('[data-strip]',el).innerHTML=strip.map(h=>`<span style="width:12px;height:12px;border-radius:2px;background:${h?'var(--good)':'var(--marker)'}"></span>`).join('');
   api.$('[data-v]',el).innerHTML=s===0?'With uniform traffic the hit rate is roughly the cache size divided by the number of items. Caching barely helps.':`Caching ${C/10}% of items serves ${(hr*100).toFixed(0)}% of reads, because a few items get most of the traffic. The database now handles ${Math.round(2000*(1-hr)).toLocaleString()} reads/s instead of 2,000.`};
  el.addEventListener('input',run);el.addEventListener('change',run);run()}
}});
