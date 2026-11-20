COURSE.addDeep('s03',{title:'Deep dive: storage, indexes and transactions, beginner to expert',lead:'From tables and rows to B-trees, isolation anomalies, LSM engines and choosing the right database family.',blocks:[
{t:'text',level:'f',title:'Beginner · How data is stored',html:`
<p>A <b>relational database</b> (PostgreSQL, MySQL) stores data in tables: rows are records, columns are fields. Each row has a <b>primary key</b> (a unique id). Tables link through <b>foreign keys</b>.</p>
<p>Three relationships:</p>
<ul>
<li><b>One-to-one:</b> a user has one profile.</li>
<li><b>One-to-many:</b> a user has many orders → put <code>user_id</code> on the orders table.</li>
<li><b>Many-to-many:</b> students and courses → a join table <code>enrolments(student_id, course_id)</code>.</li>
</ul>
<p><b>Normalise</b> = store each fact once (change a user's name in one place). <b>Denormalise</b> = keep copies to make reads faster (store author name on every post). Start normalised; denormalise the specific reads that are too slow, and accept that copies must be kept in sync.</p>`},
{t:'text',level:'f',title:'Beginner · Indexes in one picture',html:`
<p>Without an index, finding <code>email='a@x.com'</code> in 100 million rows means reading every row (a <b>full scan</b>). An index is like the index at the back of a book: a sorted structure pointing to the rows, so the database jumps straight there.</p>
<p>Cost: every insert/update must also update each index, and indexes use disk. So index the columns you <b>search, join or sort by</b>, not everything.</p>`},
{t:'text',level:'i',title:'Intermediate · B-trees, composite indexes and the leftmost prefix',html:`
<ul>
<li>Most indexes are <b>B-trees</b>: a short, wide sorted tree. 100 M rows need only ~3–4 levels, so a lookup is a few page reads: O(log n). They support equality, ranges (<code>&gt;</code>, <code>BETWEEN</code>) and <code>ORDER BY</code>.</li>
<li><b>Composite index</b> <code>(country, city)</code> is sorted by country, then city inside each country. It helps <code>WHERE country='IN' AND city='Pune'</code> and <code>WHERE country='IN' ORDER BY city</code>, but <b>not</b> <code>WHERE city='Pune'</code> alone (the leftmost-prefix rule), just as a phone book sorted by surname cannot find everyone named "Ravi".</li>
<li><b>Covering index:</b> if the index contains every column the query needs, the table is never read. Very fast.</li>
<li><b>Selectivity:</b> an index on a column with 2 values (is_active) rarely helps.</li>
<li>Use <code>EXPLAIN</code> to confirm the plan uses the index.</li>
</ul>`},
{t:'text',level:'i',title:'Intermediate · Transactions and ACID',html:`
<ul>
<li><b>Atomicity:</b> all steps happen or none (debit and credit together).</li>
<li><b>Consistency:</b> rules (constraints) always hold after a transaction.</li>
<li><b>Isolation:</b> concurrent transactions do not see each other's half-done work.</li>
<li><b>Durability:</b> once committed, it survives a crash (write-ahead log on disk).</li>
</ul>`},
{t:'table',level:'i',title:'What goes wrong with weak isolation',head:['Anomaly','Example','Prevented by'],rows:[
['Dirty read','You read a balance another transaction has not committed (and later rolls back)','Read committed'],
['Non-repeatable read','You read a row twice in one transaction and get different values','Repeatable read / snapshot'],
['Phantom','A range query returns new rows the second time','Serializable (or snapshot in some DBs)'],
['Lost update','Two people read count=5, both write 6; one increment is lost','Atomic UPDATE x = x+1, SELECT FOR UPDATE, or version check'],
['Write skew','Two doctors each check "another doctor is on call" and both go off call','Serializable, or lock the rows you checked'],
],note:'PostgreSQL defaults to Read Committed; MySQL InnoDB to Repeatable Read. Most databases use MVCC: readers see a snapshot and do not block writers.'},
{t:'code',level:'i',title:'Two buyers, one seat: the correct write',lang:'sql',code:`
-- Atomic check-and-set: the database decides the single winner.
UPDATE seats
   SET status = 'held', holder = :user, hold_until = now() + interval '10 minutes'
 WHERE id = :seat AND (status = 'free' OR hold_until < now());
-- 1 row updated  -> you hold it, go to payment
-- 0 rows updated -> "seat just taken"`},
{t:'table',level:'i',title:'Storage families',head:['Family','Examples','Best for','Weak at'],rows:[
['Relational','PostgreSQL, MySQL','Transactions, joins, money, inventory','Huge write scale without sharding'],
['Key-value','Redis, DynamoDB','Lookup by key: sessions, carts, caches','Queries by anything other than key'],
['Document','MongoDB','Flexible per-record shape (product catalogue)','Cross-document transactions and joins (limited)'],
['Wide-column','Cassandra, HBase, ScyllaDB','Massive writes, read by partition key + sort (chat, time series)','Ad-hoc queries; you design tables per query'],
['Search','Elasticsearch, OpenSearch','Full-text search, filters, relevance','Being the source of truth'],
['Object storage','S3, GCS','Large files: photos, videos, backups','Small frequent updates, queries'],
['Graph','Neo4j','Deep relationship queries (friends of friends)','Simple high-volume lookups'],
]},
{t:'text',level:'x',title:'Expert · Engines, trade-offs and patterns',html:`
<ul>
<li><b>B-tree vs LSM-tree.</b> B-trees update pages in place: great reads, moderate writes. LSM engines (Cassandra, RocksDB) append writes to memory, flush sorted files and merge them later (compaction): very fast writes, reads may check several files (helped by Bloom filters). Write-heavy append data → LSM; read-heavy with updates → B-tree.</li>
<li><b>Choose by access pattern, not fashion.</b> Write down the top 3 queries and the riskiest write. Money → relational with constraints. 50 K chat writes/s read by conversation → wide-column keyed by <code>conversation_id</code>, clustered by message time/sequence. Analytics events → append-only log + columnar warehouse.</li>
<li><b>Polyglot persistence.</b> Real systems combine stores: PostgreSQL as source of truth, Redis cache, Elasticsearch fed by change-data-capture (CDC), S3 for media. Every extra store is another thing to keep consistent, so say how it is fed (CDC/outbox) and how stale it may be.</li>
<li><b>Large files:</b> the server hands the client a <b>pre-signed URL</b>; the client uploads directly to object storage; the database stores only metadata and the object key. The app servers never carry the bytes.</li>
<li><b>Search architecture:</b> DB → CDC/queue → indexer → Elasticsearch (inverted index: word → list of documents). Search reads go to the index; clicking a result reads the DB.</li>
<li><b>Schema changes at scale:</b> add nullable column → backfill in batches → switch reads → drop old column (expand/contract). Never lock a big table in production.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Index on (a, b). Does WHERE b = 5 use it? What would you do?',a:'Generally no: the index is sorted by a first. Add an index on (b), or (b, a) if queries also filter by a. Some engines can do a "skip scan" when a has few distinct values, but do not rely on it in an interview.'},
{q:'SQL or NoSQL for Instagram comments?',a:'Access pattern: read by post_id newest first, billions of rows, rare edits, no cross-row transactions. A wide-column store partitioned by post_id with comment time as clustering key fits. A sharded relational DB keyed by post_id also works. Mention the hot-partition risk for viral posts.'},
{q:'Why does a social graph struggle in a relational DB, and does that mean you need a graph DB?',a:'Multi-hop queries (friends of friends) become self-joins that explode in size. But most products only need one hop (who do I follow), which is a simple indexed table or adjacency list in a KV store. Use a graph DB only if multi-hop queries are core.'},
{q:'Explain write skew with a booking example and fix it.',a:'Two transactions each check "room has fewer than 2 bookings for this slot" (sees 1), each insert one → 3 bookings. Snapshot isolation does not stop it because they wrote different rows. Fix: SERIALIZABLE isolation, lock the slot row (SELECT ... FOR UPDATE) or keep a counter row with a CHECK constraint.'},
]}
]});
