COURSE.add({id:'s09',n:9,part:'B',track:'HLD',
title:'Case study: URL shortener, then a timed Pastebin mock',
goal:'Run the full loop on a classic read-heavy system, then repeat it alone under interview timing.',
outcomes:['Design a link shortener from scope to failure drills','Defend a short-code generation strategy','Add parts only when a requirement asks for them','Complete a 30-minute mock with changing requirements'],
modules:[
{title:'Warm-up: the building blocks so far',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Reads are 100x writes and a few items are very popular. First part to add?',opts:['Sharding','A cache','A queue'],a:1},
  {q:'A single database with no copy is…',opts:['A single point of failure','Eventually consistent'],a:0},
  {q:'Analytics events should be written…',opts:['Synchronously in the redirect path','Asynchronously via a queue'],a:1}]},
 {t:'teacher',items:['Tell the class: sessions 9–12 are full interviews. From now on, every design starts with the 5-step loop.']}]},

{title:'Guided design: a link shortener',tab:'Guided design',mins:50,out:'One-page design',lead:'Prompt: <b>"Design a service that turns long URLs into short links."</b> Start each step\'s timer, answer on paper, then reveal.',blocks:[
 {t:'stepper',steps:[
  {title:'Clarify',short:'Clarify',secs:180,think:'Write 5 questions and the answers you would assume.',answer:'<ul class="clean"><li>Users: public + API clients.</li><li>Must-haves: create a short link; redirect. Nice: custom alias, expiry, click counts.</li><li>Scale: 1 M new links/day; 100 M redirects/day (100:1).</li><li>Quality: redirects fast and almost always up; never redirect to the wrong URL.</li><li>Lifetime: 5 years unless expiry set.</li></ul><p class="say">"So the core is a read-heavy key lookup that must be fast and highly available."</p>'},
  {title:'Interactions',short:'APIs',secs:120,think:'API calls and the redirect status code.',answer:'<p><code>POST /links {longUrl, alias?, expiresAt?}</code> → <code>{shortCode, shortUrl}</code> · <code>GET /{code}</code> → 301/302 or 404 · <code>DELETE /links/{code}</code>.</p><p>301 is cached by browsers (cheaper, but you lose click counts and cannot change targets); 302 keeps every click visible.</p>'},
  {title:'Data',short:'Data',secs:180,think:'What is stored? How big? How is the code generated?',answer:'<p><b>Link</b>(shortCode PK, longUrl, ownerId, createdAt, expiresAt). 1.8 B rows × 500 B ≈ 1 TB over 5 years. 7 chars of base 62 = 3.5 trillion codes.</p>',blocks:[{t:'mcq',title:'Decision: how do you generate the code?',items:[
    {q:'You need no collisions, short codes, and no coordination bottleneck.',opts:['Hash the URL, take 7 chars','Global counter → base 62','Counter ranges handed to each server (e.g. 1,000 at a time)'],a:2,why:'Ranges remove the per-request hot spot of a single counter and never collide. Hashing needs collision checks; one global counter is a single point of failure. Any option is acceptable if you name its cost.'},
    {q:'Codes must not be guessable (private documents).',opts:['Sequential counter','Random codes from a pre-generated pool'],a:1,why:'Sequential codes let anyone walk through all links.'}]}]},
  {title:'Design and break it',short:'Design lab',secs:300,think:'Draw the smallest design first. Then add parts and break things.',blocks:[{t:'arch',title:'Link shortener lab',w:740,h:350,
   nodes:[{id:'client',x:22,y:150,w:110,label:'Client',sub:'browser / API'},{id:'lb',x:160,y:150,w:122,label:'Load balancer',sub:'health checks'},{id:'app',x:310,y:150,w:132,label:'App servers ×N',sub:'stateless'},{id:'cache',x:520,y:40,w:200,label:'Cache',sub:'hot codes in memory',opt:'cache'},{id:'db',x:520,y:150,w:200,label:'Database (primary)',sub:'source of truth',swap:{when:'shards',label:'Database shards',sub:'split by shortCode'}},{id:'replica',x:520,y:250,w:200,label:'Read replica',sub:'a few ms behind',opt:'replica'},{id:'queue',x:310,y:272,w:132,h:52,label:'Queue',sub:'click events',opt:'queue'},{id:'worker',x:132,y:272,w:132,h:52,label:'Analytics worker',sub:'counts in batches',opt:'queue'}],
   edges:[{d:'M132 178H160'},{d:'M282 178H310'},{d:'M442 166H480V68H520',opt:'cache',label:'1. check',lx:486,ly:110},{d:'M442 178H520',label:'2. on miss',lx:452,ly:172},{d:'M442 192H470V278H520',opt:'replica'},{d:'M670 206V250',dash:true,opt:'replica',label:'copies',lx:678,ly:234},{d:'M376 206V272',opt:'queue',label:'click event',lx:384,ly:244},{d:'M310 298H264',opt:'queue'}],
   toggles:[{id:'cache',label:'Cache'},{id:'replica',label:'Read replica'},{id:'queue',label:'Queue + analytics'},{id:'shards',label:'Shard the database'}],
   fails:[
    {label:'Database primary dies',run:o=>{let r;if(o.replica)r={lvl:'warn',hits:['db'],oks:['replica'],txt:'Redirects keep working: '+(o.cache?'hot links from the cache, the rest ':'all links ')+'from the replica. Creates fail until the replica is promoted (seconds to a minute).'};else if(o.cache)r={lvl:'warn',hits:['db'],oks:['cache'],txt:'Popular links still redirect from the cache. Uncached links and all creates fail. Add a replica with failover.'};else r={lvl:'bad',hits:['db'],txt:'Everything fails: a single database with no copy is a single point of failure.'};if(o.shards)r.txt+=' With shards, only links on the failed shard are affected.';return r}},
    {label:'Cache restarts empty',run:o=>!o.cache?{lvl:'ok',txt:'No cache to lose, but every redirect already hits the database. Add the cache first.'}:(o.replica||o.shards)?{lvl:'warn',hits:['cache','db'],txt:'Hit rate drops to zero; ~3,500 reads/s at peak hit storage. The '+(o.replica?'replica':'shards')+' share the load while the cache warms.'}:{lvl:'bad',hits:['cache','db'],txt:'All ~3,500 reads/s land on one database at once: a stampede. Warm gradually, add a replica, single-flight per key.'}},
    {label:'One link goes viral',run:o=>o.cache?{lvl:'ok',oks:['cache'],txt:'The hot code is served from memory; the database barely notices.'}:{lvl:'bad',hits:['db'],txt:'One row read thousands of times a second.'+(o.shards?' Sharding does not help: one key lives on one shard.':'')+' Add a cache.'}},
    {label:'An app server crashes',run:o=>({lvl:'ok',hits:['app'],txt:'The load balancer removes it; servers are stateless so nothing is lost; the client retries.'})},
    {label:'New requirement: count clicks',run:o=>o.queue?{lvl:'ok',oks:['queue','worker'],txt:'Each redirect drops an event on the queue and returns at once. Counts lag a few seconds.'}:{lvl:'warn',hits:['db'],txt:'Without a queue, every redirect also writes a row: DB writes jump from ~12/s to ~1,160/s average. Add the queue.'}}],
   start:'Start with nothing added: client → load balancer → app servers → one database. Break something, then add the part that fixes it.'}]},
  {title:'Challenge and improve',short:'Challenge',secs:240,think:'Answer each in under a minute.',blocks:[{t:'reveal',cols:2,items:[
    {q:'"Traffic grows 10x."',a:'Add stateless app servers; the cache absorbs reads; shard by shortCode when data or writes outgrow one database.'},
    {q:'"Links must be editable."',a:'Use 302 (browsers cache 301 forever); update DB then delete the cache key. Brief staleness window.'},
    {q:'"Someone floods us with fake links."',a:'Rate-limit creates per key/IP; API keys for bulk; URL block list.'},
    {q:'"Users in Asia say redirects are slow."',a:'Regional cache + read replica near them; writes stay in the home region. Cost: a new link may 404 there for a moment.'}]}]}]},
 {t:'teacher',items:['In the lab, start with no parts and click "Database primary dies". Ask the room what to add. Every part must be justified by a failure or a requirement.']}]},

{title:'Deep dives interviewers ask about',tab:'Deep dives',mins:15,out:'Answers to 4 deep dives',blocks:[
 {t:'reveal',cols:2,items:[
  {q:'How do expired links get cleaned up?',a:'Check expiresAt on read (return 404 if past) so correctness never depends on cleanup; a background job deletes expired rows in batches at night. Optionally reuse freed codes later.'},
  {q:'How do custom aliases work with generated codes?',a:'Same table, same key space. Insert with a uniqueness constraint; on conflict return 409 "alias taken". Reserve words (admin, api, login).'},
  {q:'How would you count unique visitors per link?',a:'Click events to a log → stream processor → approximate counting (HyperLogLog) per link per day. Exact counts per visitor would need too much memory.'},
  {q:'Same long URL submitted twice: same code or new code?',a:'Product choice. Same code saves space (lookup by URL hash index); new codes allow per-user analytics. Ask the interviewer.'}]}]},

{title:'Solo mock: design Pastebin (30 minutes)',tab:'Solo mock',mins:30,out:'A timed design + change log',lead:'Prompt: <b>"Design a service where users paste text and share it by link."</b> Work alone or in pairs. Do not open the cards early.',blocks:[
 {t:'timer',total:1800,phases:[[0,300,'Clarify: users, sizes, scale, privacy'],[300,540,'APIs'],[540,840,'Data: where the text lives'],[840,1260,'Simple design + trace'],[1260,1500,'Change card A'],[1500,1680,'Change card B'],[1680,1800,'Summary: build first, top risk']],
  cards:[{at:1260,label:'Change card A · minute 21',title:'"Pastes can be up to 10 MB, and 20% of them are private."',body:'Think: text out of the database into object storage; signed URLs or an auth check for private pastes; unguessable keys.'},{at:1500,label:'Change card B · minute 25',title:'"A paste on the front page of a news site gets 50,000 views a minute."',body:'Think: CDN caching for public pastes; cache headers; do not count views synchronously.'}]},
 {t:'reveal',title:'Model hints (after the timer)',items:[
  {q:'Where should the paste text live?',a:'Metadata (key, owner, size, visibility, expiry) in a database; the text itself in object storage keyed by paste id. Small pastes could stay inline, but object storage scales simply.'},
  {q:'How are private pastes protected?',a:'Random 10+ character keys, an auth check in the app, and short-lived signed URLs to object storage. Never serve private pastes from a public CDN cache.'},
  {q:'The viral paste?',a:'Public paste → CDN with a long TTL; the origin sees one request per edge. View counts via async events.'}]}]},

{title:'Score and review',tab:'Review',mins:15,out:'Self-score + homework',blocks:[
 {t:'rubric',title:'Score your Pastebin mock',rows:[['Clarify','Asked about users, sizes, scale, privacy, the never-happen rule'],['Interactions','Clear APIs with inputs and outputs'],['Data','Separated metadata from blobs; named the main read'],['Simple design','Started minimal; traced a request'],['Challenge','Found weak spots; each fix had a cost'],['Changing requirements','Adapted without restarting'],['Communication','Thought aloud, plain reasons']]},
 {t:'flash',items:[['301 vs 302?','301 cached by browsers (fast, no analytics); 302 every click reaches you.'],['Code generation options?','Hash + collision check; counter (ranges) + base 62; pre-generated random pool.'],['Why cache before sharding?','A few hot keys get most reads; sharding does not fix a hot key.'],['Big blobs go…','To object storage; DB keeps metadata.']]},
 {t:'task',title:'Homework',items:['Redo the link shortener from memory in 20 minutes on paper, then compare with this session.']}]}
]});
