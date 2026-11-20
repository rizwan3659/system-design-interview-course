COURSE.addDeep('s12',{title:'Deep dive: ride-hailing like Uber, beginner to expert',lead:'Location ingestion, geo indexing, safe matching, the trip state machine, payments and regional scaling.',blocks:[
{t:'text',level:'f',title:'Beginner · The main pieces',html:`
<p>Riders ask for a ride; nearby drivers get the offer; one accepts; both watch each other on a map; the trip ends and payment happens.</p>
<ul>
<li><b>Driver location updates:</b> every driver's phone sends its GPS position every ~4 seconds.</li>
<li><b>Nearby search:</b> "which available drivers are within 2 km of this rider?"</li>
<li><b>Matching:</b> offer the ride to a driver and make sure one driver never gets two riders at once.</li>
<li><b>Trip lifecycle:</b> requested → driver assigned → driver arriving → in progress → completed (or cancelled).</li>
<li><b>Payment</b> after the trip.</li>
</ul>
<p>The core trick: you cannot check the distance to every driver in the world for every request. You divide the map into <b>cells</b> and only look at drivers in the rider's cell and the cells around it.</p>`},
{t:'text',level:'i',title:'Intermediate · Estimate and the location pipeline',html:`
<ul><li>1 M active drivers / 4 s = <b>250 K location writes/s</b>. Each is tiny (~100 bytes).</li>
<li>A position is useful for only a few seconds, so it does not belong in a durable relational table.</li></ul>
<p><b>Pipeline:</b> driver app → (WebSocket/UDP-friendly gateway) → location service, which updates an <b>in-memory geo index</b> (Redis GEO or a custom in-memory grid, sharded by region/cell) with <code>driver_id → (cell, lat, lng, status, updated_at)</code>. It also writes to a stream (Kafka) so trip tracking, ETA models and analytics can consume positions without slowing the hot path. Drivers with no update for ~30 s are treated as offline.</p>`},
{t:'table',level:'i',title:'Intermediate · Three ways to index location',head:['Method','Idea','Pros','Cons'],rows:[
['Geohash','Encode lat/lng as a string; nearby points share prefixes (6 chars ≈ 1.2 × 0.6 km)','Simple, works in any KV store or Redis','Cells are rectangles that distort near poles; edge cases need neighbour cells'],
['Quadtree','Split a region into 4 until each cell holds ≤ N drivers','Adapts to density (more, smaller cells in cities)','In-memory tree must be rebuilt/rebalanced as drivers move'],
['S2 / H3 cells','Hierarchical cells on a sphere (S2 squares, H3 hexagons)','Uniform, hexagon neighbours all equidistant (H3), multi-resolution','More complex libraries'],
],note:'Uber built H3. Always search the rider\'s cell and its neighbours: a driver 50 m away may be just across a cell boundary. If none are found, widen to the next ring of cells.'},
{t:'text',level:'x',title:'Expert · Matching, consistency and scale',html:`
<ul>
<li><b>Matching flow:</b> find K nearest available drivers → rank by ETA (road distance, not straight line) → offer to the best one with a ~10–15 s timeout → on decline/timeout, offer to the next. Some systems batch requests over a second or two and solve a global assignment to reduce total wait.</li>
<li><b>Never two riders per driver:</b> driver state lives in one owner (the dispatch shard for that region). Assignment is an atomic compare-and-set: <code>status: available → offered(trip_id)</code> only if still available. Offer timeouts reset it. Same rule for the rider: one active request at a time.</li>
<li><b>Trip state machine:</b> explicit states with allowed transitions, stored durably (relational DB with transactions per trip). Every transition is idempotent (client retries are safe) and emits an event (notifications, billing, analytics).</li>
<li><b>Sharding by geography:</b> a city/region is a natural shard: matching needs only local drivers. Hot cities get more, smaller shards (by cell). Cross-shard edge cases (rider near a border) query neighbouring shards.</li>
<li><b>Live tracking:</b> the rider subscribes (WebSocket) to their driver's position for the trip only; the gateway pushes updates from the location stream.</li>
<li><b>Payments:</b> after completion, an async, idempotent payment job (trip id as idempotency key) charges via the provider; failures retry; a ledger records every money movement. The rider\'s app is not blocked waiting.</li>
<li><b>Surge pricing:</b> per cell, compare demand (requests) to supply (available drivers) over a short window; computed by a stream job; price shown to the rider is locked with the request.</li>
<li><b>Failure drill:</b> location service node dies → its region\'s drivers reappear within seconds because they keep sending updates (soft state rebuilds itself). Dispatch shard dies → standby takes over from replicated state; in-flight offers time out and retry.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Why not store driver locations in PostgreSQL with a spatial index?',a:'250 K updates/s of data that is stale in 4 seconds. A durable B-tree/GiST index with WAL and vacuum is the wrong tool. Use an in-memory, sharded geo index (soft state that rebuilds from the next updates) and archive the stream separately if history is needed.'},
{q:'Why search neighbouring cells too?',a:'The nearest driver can be just across a cell edge while drivers inside the rider\'s cell are farther. Searching the 8 neighbours (or the H3 ring) covers that.'},
{q:'How do you stop two dispatchers assigning the same driver?',a:'One owner per driver (region shard) and an atomic conditional update on the driver\'s status. If two requests race, only one CAS succeeds; the other picks the next driver.'},
{q:'No drivers found nearby. What happens?',a:'Expand the search radius ring by ring up to a limit, then tell the rider no cars are available (or queue the request for a short time and show surge). Never block forever.'},
]}
]});
