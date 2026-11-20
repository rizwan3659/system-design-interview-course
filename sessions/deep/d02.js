COURSE.addDeep('s02',{title:'Deep dive: networking and API design, beginner to expert',lead:'From "what happens when I type a URL" to idempotency keys, cursors and protocol choices that senior engineers defend.',blocks:[
{t:'text',level:'f',title:'Beginner · What happens when you open a website',html:`
<p>Your phone (the <b>client</b>) wants something from a computer far away (the <b>server</b>). The trip has six steps:</p>
<ol>
<li><b>DNS:</b> the name <code>shop.com</code> is turned into an IP address, like looking up a phone number in a contact list. The answer is cached so the next lookup is instant.</li>
<li><b>Connect:</b> a TCP connection is opened (a 3-way handshake), then TLS sets up encryption (the padlock in the browser).</li>
<li><b>Load balancer:</b> the request reaches a load balancer that picks one of many servers.</li>
<li><b>HTTP request:</b> the client asks, for example <code>GET /products/42</code>.</li>
<li><b>Work:</b> the server checks who you are, reads the database or cache, builds the answer.</li>
<li><b>Response:</b> a status code (200 OK, 404 Not Found…) plus data, usually JSON.</li>
</ol>
<p>An <b>API</b> is the menu of requests the server accepts. Designing an API means deciding that menu: names, inputs, outputs and errors.</p>`},
{t:'table',level:'f',title:'Status codes you must use correctly',head:['Code','Meaning','Use it when'],rows:[
['200 OK','Success','A read or update worked'],['201 Created','New resource made','After POST that creates something; return its id'],['204 No Content','Success, nothing to return','DELETE worked'],
['301 / 302','Moved permanently / temporarily','Redirects (URL shortener)'],['400 Bad Request','Client sent invalid input','Missing field, wrong format'],['401 Unauthorized','Not logged in','No or bad token'],
['403 Forbidden','Logged in but not allowed','Reading someone else\'s order'],['404 Not Found','Does not exist',''],['409 Conflict','Clashes with current state','Seat already taken, version mismatch'],
['429 Too Many Requests','Rate limited','Include Retry-After'],['500','Server bug',''],['503','Overloaded or down','Client may retry later'],
]},
{t:'text',level:'i',title:'Intermediate · The four API styles and when each fits',html:`
<ul>
<li><b>REST over HTTP + JSON.</b> Resources as nouns (<code>/users/7/orders</code>), HTTP verbs as actions. Easy to read, cacheable, works everywhere. Default for public APIs.</li>
<li><b>gRPC.</b> Binary (Protocol Buffers) over HTTP/2, with a strict schema and generated client code. Smaller and faster; great for service-to-service calls inside a data centre (e.g. 20,000 calls/s to fraud-check). Harder to call from a browser.</li>
<li><b>GraphQL.</b> Client asks for exactly the fields it wants in one request. Good when a mobile screen needs pieces of many objects. Costs: caching is harder, one query can be very expensive, so you need query cost limits.</li>
<li><b>Push connections: WebSocket / Server-Sent Events.</b> Server sends data the moment it happens. WebSocket is two-way (chat, games); SSE is one-way server→client (live scores, notifications). Long polling is the fallback.</li>
</ul>
<p><b>Polling or push?</b> If data changes rarely (weather every 30 min) → simple polling. If data changes often and must arrive fast (chat, stock ticker) → push. Order history → plain request when the user opens the page.</p>`},
{t:'text',level:'i',title:'Intermediate · Five rules for good APIs',html:`
<ol>
<li><b>Nouns, not verbs.</b> <code>POST /orders</code>, not <code>/createOrder</code>.</li>
<li><b>Paginate every list.</b> Offset (<code>?page=5</code>) is simple but slow on deep pages and shows duplicates when new rows arrive. <b>Cursor</b> (<code>?after=opaque_token</code>, which encodes the last seen id/time) is stable and fast: the database does <code>WHERE id &lt; :last ORDER BY id DESC LIMIT 20</code> using an index.</li>
<li><b>Make retries safe.</b> GET, PUT, DELETE are idempotent by definition. POST is not, so accept an <code>Idempotency-Key</code> header.</li>
<li><b>Version from day one.</b> <code>/v1/…</code> or a header; never break existing clients.</li>
<li><b>Useful errors + limits.</b> Machine-readable error codes, human message, and rate limits with 429 + Retry-After. Authenticate with tokens (OAuth 2 / JWT), authorise every resource access.</li>
</ol>`},
{t:'code',level:'i',title:'Idempotency key: how the server makes POST safe to retry',lang:'python',code:`
def create_payment(req):
    key = req.headers["Idempotency-Key"]          # client generates a UUID per logical payment
    row = db.insert_if_absent("idem", key=key, status="in_progress")
    if not row.inserted:                            # we have seen this key before
        if row.status == "done":
            return row.saved_response               # same answer as the first time, no second charge
        return 409, "still processing, retry later"
    resp = charge_card(req.body)                    # the real side effect, done once
    db.update("idem", key, status="done", saved_response=resp)  # keep ~24 h
    return resp`,note:'The unique constraint on the key is what makes two concurrent retries safe: only one insert wins.'},
{t:'text',level:'x',title:'Expert · What interviewers probe',html:`
<ul>
<li><b>Reverse proxy vs API gateway.</b> A reverse proxy (Nginx, Envoy) terminates TLS, balances load, caches and compresses. An API gateway adds API concerns: authentication, rate limits per key, request routing to many services, versioning, metrics. In practice the gateway is a reverse proxy with API features.</li>
<li><b>HTTP versions.</b> HTTP/1.1 = one request at a time per connection (head-of-line blocking) → browsers open ~6 connections. HTTP/2 = many streams on one TCP connection. HTTP/3 = runs on QUIC over UDP, so one lost packet does not stall all streams, and connection setup is faster (great on mobile networks).</li>
<li><b>Connection reuse.</b> TCP + TLS handshakes cost 1–3 round trips. Keep-alive and connection pools inside services are essential at scale; a new TLS connection per call can double latency.</li>
<li><b>Optimistic concurrency.</b> Return an <code>ETag</code> (version); clients send <code>If-Match</code> on update; server returns 412 if someone else changed it. Prevents lost updates without locks.</li>
<li><b>Backward compatibility.</b> Only add optional fields; never rename or change meaning. Clients must ignore unknown fields. Deprecate with a sunset date and usage metrics.</li>
<li><b>Security basics.</b> Never trust client IDs in the body (use the token's user). Check object-level authorisation on every request (the #1 API vulnerability is reading <code>/orders/124</code> that is not yours). Validate sizes to stop abuse.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'A user clicks "Pay", the network drops, the app retries. How do you guarantee one charge?',a:'Client creates an idempotency key once per payment attempt and reuses it on retries. Server stores key → result with a unique constraint; a duplicate returns the saved result. The payment provider call also carries the key, so even a retry from our server to the provider is safe.'},
{q:'Design the API for a food-delivery app (the core calls).',a:'GET /restaurants?lat=&lng=&cursor= ; GET /restaurants/{id}/menu ; POST /orders (Idempotency-Key; body: restaurant_id, items, address_id) → 201 {order_id, status} ; GET /orders/{id} ; live tracking via SSE/WebSocket /orders/{id}/events ; POST /orders/{id}/cancel. Driver app: POST /drivers/me/location every few seconds.'},
{q:'Why can offset pagination show the same item twice?',a:'Page 1 shows items 1–20. A new item is inserted at the top, shifting everything down by one. Page 2 (offset 20) now starts with the old item 20 again. A cursor ("items older than id X") is not affected by inserts.'},
{q:'When would you choose GraphQL over REST, and what would worry you?',a:'Many client types needing different shapes of the same data, and screens that would otherwise make 5+ REST calls. Worries: expensive nested queries (need depth/cost limits), N+1 database calls (need batching/dataloader), and HTTP caching no longer works for free.'},
]}
]});
