COURSE.addDeep('s05',{title:'Deep dive: replication, sharding and consistent hashing, beginner to expert',lead:'From "one database is not enough" to failover, split brain, shard keys, hot partitions and resharding.',blocks:[
{t:'text',level:'f',title:'Beginner · Two ways to grow',html:`
<p><b>Scale up (vertical):</b> buy a bigger machine. Simple, no code changes, but there is a ceiling and one machine is still one point of failure.</p>
<p><b>Scale out (horizontal):</b> add more machines. No real ceiling, but now data lives in several places and they must cooperate.</p>
<p>For data there are two tools:</p>
<ul>
<li><b>Replication = copies.</b> The same data on several machines. Helps with <b>reading</b> (spread reads over copies) and <b>safety</b> (if one dies, another has the data).</li>
<li><b>Sharding (partitioning) = splitting.</b> Different data on different machines: users A–M on one, N–Z on another. Helps with <b>size</b> and <b>writes</b>.</li>
</ul>
<p>Usually you use both: each shard is itself replicated.</p>`},
{t:'text',level:'i',title:'Intermediate · Replication models',html:`
<ul>
<li><b>Leader–follower (primary–replica).</b> All writes go to the leader; it streams changes to followers; reads can go to followers. The most common setup (PostgreSQL, MySQL).
<ul><li><i>Synchronous:</i> leader waits for a follower to confirm → no data loss on failover, slower writes.</li>
<li><i>Asynchronous:</i> leader does not wait → fast, but followers lag, and the last few writes can be lost if the leader dies.</li>
<li><i>Semi-sync:</i> wait for one follower, others async. Common compromise.</li></ul></li>
<li><b>Multi-leader.</b> Each region has a leader that accepts writes and syncs with the others. Good for multi-region writes and offline apps, but two leaders can change the same row → conflicts (resolved by last-write-wins, merge rules, or CRDTs).</li>
<li><b>Leaderless</b> (Dynamo, Cassandra). Clients write to several replicas and read from several; quorums decide (see session 6).</li>
</ul>
<p><b>Replication lag problem:</b> a user updates their name, refreshes, and the read goes to a lagging follower → old name. Fix (<b>read-your-writes</b>): read the user's own data from the leader for a short time after they write, or remember the write's log position and only read from a replica that has caught up.</p>`},
{t:'text',level:'i',title:'Intermediate · Sharding strategies and shard keys',html:`
<ul>
<li><b>Range sharding:</b> by key ranges (dates, A–M). Good for range scans; risk of hot ranges (all of today's writes hit one shard).</li>
<li><b>Hash sharding:</b> <code>shard = hash(key) mod N</code>. Spreads load evenly; range queries must hit every shard.</li>
<li><b>Directory / lookup:</b> a table maps key → shard. Flexible (move one tenant), but the directory must be fast and highly available.</li>
<li><b>Geo sharding:</b> by region, for latency and data-residency laws.</li>
</ul>
<p><b>Good shard key</b> = the thing most queries filter by, with many distinct values and even load. Chat → <code>conversation_id</code>. Orders "of user X" → <code>user_id</code>. Sensor time series → <code>(sensor_id, time bucket)</code> so one sensor's history does not grow one partition forever.</p>`},
{t:'text',level:'i',title:'Intermediate · Why consistent hashing',html:`
<p>With <code>hash mod N</code>, going from 4 to 5 servers changes the answer for about <b>80%</b> of keys (only keys where <code>h mod 4 == h mod 5</code> stay). That means moving most of your data or emptying most of the cache.</p>
<p><b>Consistent hashing</b> places servers and keys on a ring (0 … 2<sup>32</sup>). A key belongs to the next server clockwise. Adding a server only takes keys from its neighbour: about <b>1/N</b> of keys move. <b>Virtual nodes</b> (each server appears at 100–200 points on the ring) even out the load and let a bigger machine take more points.</p>
<p>Used by Cassandra, DynamoDB, Memcached clients, load balancers with sticky routing. Alternatives: fixed number of logical partitions (e.g. 1,024) mapped to machines; move whole partitions when adding machines (Kafka, Elasticsearch, Redis Cluster's 16,384 slots).</p>`},
{t:'text',level:'x',title:'Expert · Failover, split brain and the true cost of sharding',html:`
<ul>
<li><b>Failover steps:</b> detect (missed heartbeats, with a timeout long enough to avoid false alarms) → elect the most up-to-date follower (via a consensus system like etcd/ZooKeeper, or Raft inside the DB) → redirect clients → fence the old leader.</li>
<li><b>Split brain:</b> the old leader was only slow, comes back, and still accepts writes → two leaders, diverging data. Prevent with a majority quorum for leadership, leases, and <b>fencing tokens</b> (a rising epoch number that storage checks; writes with an old epoch are rejected).</li>
<li><b>Async failover loses data:</b> say how much (the replication lag, e.g. "up to 1 s of writes") and whether that is acceptable. For payments use synchronous or semi-sync replication.</li>
<li><b>Costs of sharding:</b> cross-shard queries (scatter-gather, slow at the tail); cross-shard transactions (need sagas or 2PC); resharding (double writes, backfill, cutover); global unique IDs (use Snowflake-style 64-bit IDs: time + machine + sequence, or UUIDv7); global secondary indexes (separately sharded, eventually consistent); operational load (backups, schema changes ×N).</li>
<li><b>Hot partitions:</b> a celebrity's posts sharded by user_id overload one shard. Fixes: cache heavily, add a random suffix to spread the hot key's writes (and merge on read), or treat celebrities specially.</li>
<li><b>When is sharding premature?</b> A well-indexed PostgreSQL on a large machine handles several TB and thousands to tens of thousands of writes per second. First: indexes, query fixes, caching, read replicas, archiving old data, a bigger machine. Shard when writes or data size truly exceed one machine, and plan the key early so the move is possible.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'The leader dies with async replication. What exactly happens to the users?',a:'Writes acknowledged but not yet replicated are lost. A follower is promoted; for a few seconds writes fail or queue. Clients reconnect via a service name / proxy. If the old leader returns it must rejoin as a follower and discard its unreplicated writes. Mitigate with semi-sync for critical data.'},
{q:'How would you reshard a live database from 8 to 16 shards?',a:'Prefer many logical partitions mapped to physical nodes so you only move partitions. Otherwise: create new shards, start double-writing, backfill historical data with a copy job, verify with checksums, switch reads gradually, stop the old writes, clean up. Throttle the copy so production latency is safe.'},
{q:'Pick a shard key for an orders table where most queries are "orders of user X" but merchants need their orders too.',a:'Shard by user_id for the main path. Merchant queries go to a secondary store keyed by merchant_id, filled asynchronously (CDC/event) — eventually consistent, which is fine for a merchant dashboard.'},
{q:'Why use virtual nodes?',a:'With few real nodes on the ring, arc sizes are uneven, so some nodes get much more data. Many virtual points per node average this out, spread a failed node\'s load across many others instead of one neighbour, and allow weighting by capacity.'},
]}
]});
