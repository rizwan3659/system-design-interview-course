COURSE.add({id:'s02',n:2,part:'A',track:'HLD',
title:'Networking basics and API design',
goal:'Follow a request from the browser to the server and back, and design clean, safe APIs.',
outcomes:['Explain DNS, TCP/TLS, HTTP and load balancers in one request trace','Choose between REST, gRPC, GraphQL and WebSockets','Design pagination, idempotency, versioning and errors','Write the API for a real product in an interview'],
modules:[
{title:'Warm-up: recall session 1',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'What is the first step of the loop?',opts:['Draw the design','Clarify the problem','Pick a database'],a:1},
  {q:'1 M requests a day is roughly…',opts:['1 per second','12 per second','1,000 per second'],a:1},
  {q:'"Feed loads in under 500 ms" is…',opts:['Functional','Non-functional'],a:1}]},
 {t:'teacher',items:['Cold-call 3 students. Keep it fast: 3 minutes for the quiz, 2 minutes on any misses.']}]},

{title:'How a request travels',tab:'Request path',mins:25,out:'Draw the request path from memory',lead:'When a user opens <code>app.example.com/feed</code>, about six things happen before the server does any work. Knowing them lets you explain latency and failure points.',blocks:[
 {t:'cards',title:'Click through one request',items:[
  {tag:'1 · DNS',title:'Find the address',sub:'Name → IP',body:'<p>The browser asks a DNS resolver for the IP of <code>app.example.com</code>. Answers are cached for a TTL (e.g. 60 s–1 day).</p><p><b>Design use:</b> DNS can send users to the nearest region (geo DNS) or away from a failed one. Low TTL = faster failover, more lookups.</p>'},
  {tag:'2 · TCP + TLS',title:'Open a secure connection',sub:'Handshakes',body:'<p>TCP handshake (1 round trip) then TLS handshake (1 more with TLS 1.3). Cross-continent, each round trip is ~100+ ms.</p><p><b>Design use:</b> reuse connections (keep-alive, HTTP/2), and terminate TLS close to users (CDN edge).</p>'},
  {tag:'3 · Load balancer',title:'Pick a server',sub:'Spread traffic',body:'<p>The load balancer chooses a healthy app server (round robin, least connections, hashing).</p><p><b>Layer 4</b> balances TCP connections; <b>Layer 7</b> reads HTTP and can route by path (<code>/api</code> vs <code>/images</code>).</p>'},
  {tag:'4 · HTTP request',title:'Ask for something',sub:'Method, path, headers, body',body:'<p><code>GET /feed?cursor=abc</code> with headers such as <code>Authorization</code>, <code>Accept</code>.</p><p><b>Methods:</b> GET reads, POST creates, PUT replaces, PATCH updates part, DELETE removes. GET, PUT, DELETE should be idempotent.</p>'},
  {tag:'5 · App server',title:'Do the work',sub:'Auth, logic, data',body:'<p>Checks the token, runs business logic, reads cache/database, calls other services.</p><p><b>Design use:</b> keep it stateless (no user session in memory) so any server can serve any request.</p>'},
  {tag:'6 · Response',title:'Send it back',sub:'Status + body',body:'<p>A status code and usually JSON. Large static files (images, JS) come from a CDN instead.</p><p><b>Design use:</b> compress, cache with <code>Cache-Control</code>, paginate big lists.</p>'}]},
 {t:'table',title:'Status codes you should use correctly',head:['Code','Meaning','Example'],rows:[
  ['200 / 201 / 204','OK / Created / No content','Read / POST created / DELETE done'],
  ['301 / 302','Moved permanently / temporarily','URL shortener redirects'],
  ['400','Bad request','Missing field'],
  ['401 / 403','Not signed in / not allowed','Bad token / not your order'],
  ['404 / 409','Not found / conflict','Seat already taken'],
  ['429','Too many requests','Rate limited'],
  ['500 / 503','Server error / unavailable','Bug / overloaded']]},
 {t:'teacher',items:['Draw the six steps on the board as boxes. Ask: "Where would you put a cache? Where can it fail?" Every box is a failure point.']}]},

{title:'Choosing an API style',tab:'API styles',mins:20,out:'Pick a style per scenario',blocks:[
 {t:'table',title:'Four common styles',head:['Style','How it works','Good for','Cost'],rows:[
  ['REST (HTTP + JSON)','Resources and HTTP verbs','Public APIs, most web/mobile apps','Over/under-fetching; many round trips'],
  ['gRPC','Binary messages over HTTP/2 from a schema','Fast service-to-service calls','Harder to call from browsers; less human-readable'],
  ['GraphQL','Client asks for exactly the fields it needs','Many client types, nested data','Complex server, caching is harder, expensive queries'],
  ['WebSocket / SSE','Long-lived connection; server can push','Chat, live scores, collaborative editing','Stateful connections are harder to scale and balance']]},
 {t:'mcq',title:'Which style fits?',items:[
  {q:'A public API for third-party developers to read product prices.',opts:['REST','gRPC','WebSocket'],a:0,why:'Simple, cacheable, every language can call it.'},
  {q:'Payment service calls fraud-check service 20,000 times a second inside the data centre.',opts:['REST','gRPC','GraphQL'],a:1,why:'Compact binary messages and a strict schema between your own services.'},
  {q:'Live football scores to a phone.',opts:['Poll REST every minute','WebSocket / server-sent events','GraphQL'],a:1,why:'Frequent updates that must feel instant: the server pushes.'},
  {q:'A mobile home screen needs pieces of user, orders and offers in one call.',opts:['GraphQL (or a REST "backend for frontend")','gRPC','WebSocket'],a:0,why:'One request returning exactly the fields the screen needs.'}]}]},

{title:'Designing good APIs',tab:'Good APIs',mins:25,out:'Pagination and idempotency explained',lead:'Five details separate a careful API from a fragile one: resource naming, pagination, idempotency, versioning and errors.',blocks:[
 {t:'grid',title:'Five rules',items:[
  {title:'Name resources as nouns',body:'<code>GET /users/42/orders</code>, not <code>/getOrdersForUser</code>. Verbs come from HTTP methods.'},
  {title:'Paginate every list',body:'Never return "all orders". Return a page and a way to get the next one.'},
  {title:'Make retries safe',body:'Clients retry on timeouts. A POST with an <code>Idempotency-Key</code> header lets the server return the first result instead of creating a duplicate.'},
  {title:'Version from day one',body:'<code>/v1/orders</code> or a header. Add fields freely; never remove or rename without a new version.'},
  {title:'Return useful errors',body:'<code>409 {"error":"seat_taken","message":"Seat C7 was just booked"}</code> beats a bare 500.'},
  {title:'Limit and protect',body:'Rate limits per key (429 + <code>Retry-After</code>), auth on every call, input validation.'}]},
 {t:'lab',fn:'paging',title:'Lab · Offset vs cursor pagination',intro:'A feed shows 5 posts per page. While the user reads page 1, new posts arrive. Compare what page 2 shows.'},
 {t:'code',title:'Idempotency key in practice',lang:'python',code:`
def create_payment(request):
    key = request.headers["Idempotency-Key"]      # client generates once per payment
    saved = idempotency_store.get(key)
    if saved:                                       # a retry: return the first answer
        return saved
    result = charge_card(request.json["amount"])    # do the work once
    idempotency_store.put(key, result, ttl_hours=24)
    return result`,note:'Real systems also lock the key while the first request is in progress, so two simultaneous retries cannot both charge.'},
 {t:'teacher',items:['Run the paging lab with "3 new posts arrive". Ask why the user sees duplicates with offset. Then switch to cursor.','Ask: "Which HTTP methods are naturally idempotent?" (GET, PUT, DELETE). "How do we make POST safe?" (idempotency key).']}]},

{title:'Guided problem: API for a food-delivery app',tab:'Guided problem',mins:30,out:'A complete API list with reasons',lead:'Prompt: <b>"Design the API for a food-delivery app: customers order, restaurants accept, riders deliver."</b>',blocks:[
 {t:'stepper',steps:[
  {title:'Clarify',short:'Clarify',secs:150,think:'Who are the clients? Which actions are must-haves?',answer:'<p>Three clients: customer app, restaurant tablet, rider app. Must-haves: browse restaurants and menus, place and pay for an order, restaurant accepts/rejects, rider picks up and delivers, customer tracks status. Out of scope: reviews, promotions.</p>'},
  {title:'Resources',short:'Resources',secs:150,think:'List the nouns.',answer:'<p><b>Restaurant</b>, <b>MenuItem</b>, <b>Order</b> (with items and status), <b>Payment</b>, <b>Rider</b>, <b>Delivery</b> (rider + location updates).</p>'},
  {title:'Endpoints',short:'Endpoints',secs:240,think:'Write 8 endpoints with method, path and key fields.',answer:'<div class="tbl"><table><thead><tr><th>Call</th><th>Who</th></tr></thead><tbody><tr><td><code>GET /v1/restaurants?lat=&lng=&cursor=</code></td><td>Customer</td></tr><tr><td><code>GET /v1/restaurants/{id}/menu</code></td><td>Customer</td></tr><tr><td><code>POST /v1/orders</code> + Idempotency-Key</td><td>Customer</td></tr><tr><td><code>GET /v1/orders/{id}</code></td><td>All</td></tr><tr><td><code>POST /v1/orders/{id}/accept</code> · <code>/reject</code></td><td>Restaurant</td></tr><tr><td><code>POST /v1/deliveries/{id}/pickup</code> · <code>/complete</code></td><td>Rider</td></tr><tr><td><code>POST /v1/riders/me/location {lat,lng}</code></td><td>Rider, every ~5 s</td></tr><tr><td>WebSocket <code>/v1/orders/{id}/events</code></td><td>Customer tracking</td></tr></tbody></table></div>'},
  {title:'Safety details',short:'Safety',secs:180,think:'Where do retries, errors and auth matter most?',answer:'<ul class="clean"><li>Order creation uses an idempotency key: a double tap must not create two orders or two charges.</li><li>Status changes are checked against the current state: you cannot "pickup" a rejected order → <code>409</code>.</li><li>Restaurants only see their own orders → <code>403</code> otherwise.</li><li>Location updates are rate limited (one per 2 s per rider).</li></ul>'},
  {title:'Challenge',short:'Challenge',secs:180,think:'The customer app on 2G keeps timing out while tracking. What do you change?',answer:'<p>Switch tracking from polling every 2 s to a push channel (WebSocket or server-sent events) with small messages; fall back to polling every 15 s if the connection drops. Cost: the server holds many open connections.</p>'}]}]},

{title:'Review',tab:'Review',mins:10,out:'Flashcards + homework',blocks:[
 {t:'flash',items:[['Why keep app servers stateless?','Any server can serve any request, so you can add, remove or lose servers freely.'],['L4 vs L7 load balancer?','L4 balances TCP connections; L7 reads HTTP and can route by path, header or cookie.'],['Offset pagination problem?','Inserts/deletes shift rows, causing duplicates or skipped items; deep offsets are slow.'],['Idempotency key?','A client-chosen ID that lets the server return the first result for a retried request.'],['When WebSockets?','When the server must push frequent updates (chat, live scores).'],['409 means?','Conflict with current state, e.g. seat already taken.']]},
 {t:'task',title:'Homework',items:['Write the API for a cinema ticket app (8 endpoints) including idempotency and error codes.']}]}
],
labs:{
 paging(el,api){
  el.innerHTML=`<div class="row"><label style="flex-direction:row;align-items:center;gap:8px">New posts arriving <input type="number" min="0" max="5" value="3" data-new style="width:70px"></label><button class="btn" data-mode="offset" aria-pressed="true">Offset: ?offset=5&limit=5</button><button class="btn" data-mode="cursor" aria-pressed="false">Cursor: ?after=post 16</button></div><div class="grid2"><div class="optcard"><h4>Page 1 (read earlier)</h4><div data-p1></div></div><div class="optcard"><h4>Page 2 (requested now)</h4><div data-p2></div></div></div><div class="verdict" data-v></div>`;
  let mode='offset';
  const draw=()=>{const k=Math.max(0,Math.min(5,+api.$('[data-new]',el).value||0));const p1=[20,19,18,17,16];const now=[];for(let i=20+k;i>=1;i--)now.push(i);
   const p2=mode==='offset'?now.slice(5,10):now.filter(x=>x<16).slice(0,5);
   const row=(x,dup)=>`<div class="mono small" style="${dup?'color:var(--marker);font-weight:500':''}">post ${x}${dup?'  ← already seen':''}</div>`;
   api.$('[data-p1]',el).innerHTML=p1.map(x=>row(x,false)).join('');api.$('[data-p2]',el).innerHTML=p2.map(x=>row(x,p1.includes(x))).join('');
   const d=p2.filter(x=>p1.includes(x)).length;
   api.$('[data-v]',el).innerHTML=mode==='offset'?(d?`<b>${d} duplicate${d>1?'s':''}.</b> The ${k} new posts pushed old ones down, so "skip 5" now lands inside page 1. Deep offsets are also slow: the database still walks past every skipped row.`:'No new posts, so offset works here. Add some.'):`<b>No duplicates.</b> The cursor says "posts older than 16", which does not move when new posts arrive. Cost: you cannot jump to page 7 directly.`};
  el.addEventListener('input',draw);el.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;mode=b.dataset.mode;api.$$('[data-mode]',el).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw()});draw()}
}});
