COURSE.add({id:'s03',n:3,part:'A',track:'HLD',
title:'Storage: data modelling, indexes and transactions',
goal:'Model data, make reads fast with indexes, protect writes with transactions, and choose between SQL and NoSQL.',
outcomes:['Turn requirements into tables and keys','Explain how an index turns a scan into a lookup','Use transactions and isolation to stop races','Pick a storage type for a workload and defend it'],
modules:[
{title:'Warm-up: recall session 2',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Which pagination survives new inserts without duplicates?',opts:['Offset','Cursor'],a:1},
  {q:'How do you make POST /payments safe to retry?',opts:['Use PUT instead','Idempotency key','Longer timeout'],a:1},
  {q:'Best style for service-to-service calls at high volume?',opts:['gRPC','GraphQL','WebSocket'],a:0}]}]},

{title:'Data modelling',tab:'Modelling',mins:30,out:'A library data model',lead:'Start from the nouns in the requirements, then decide the keys and the relationships. The most frequent query decides the shape.',blocks:[
 {t:'grid',title:'The three relationships',items:[
  {title:'One-to-one',body:'User ↔ Profile. Often the same table, or a separate table sharing the key.'},
  {title:'One-to-many',body:'Author → Books. The "many" side holds a foreign key (<code>book.author_id</code>).'},
  {title:'Many-to-many',body:'Students ↔ Courses. A join table <code>enrollment(student_id, course_id)</code>.'}]},
 {t:'grid',cols:2,title:'Normalise or denormalise?',items:[
  {tag:'Normalised',title:'Each fact stored once',body:'Updates are simple and consistent. Reads may need joins. Default for transactional data (orders, payments).'},
  {tag:'Denormalised',tc:'amber',title:'Copies for fast reads',body:'Store <code>author_name</code> inside each post so the feed needs no join. Reads are fast; updates must change every copy. Common in read-heavy and NoSQL systems.'}]},
 {t:'stepper',title:'Exercise · Model a library',steps:[
  {title:'Nouns',secs:90,think:'Requirements: members borrow copies of books; a book can have many copies; members can reserve a book; we keep loan history. List the entities.',answer:'Member, Book (title, ISBN), Copy (a physical item of a Book), Loan, Reservation.'},
  {title:'Keys and relations',short:'Relations',secs:150,think:'Write the tables with primary and foreign keys.',answer:'<pre>member(id PK, name, email UNIQUE)\nbook(isbn PK, title, author)\ncopy(id PK, isbn FK→book, branch, status)\nloan(id PK, copy_id FK, member_id FK, out_at, due_at, returned_at)\nreservation(id PK, isbn FK, member_id FK, created_at, status)</pre><p>Reservations point at the <b>book</b>, not a copy: any copy can satisfy them.</p>'},
  {title:'Hot queries',short:'Queries',secs:120,think:'Name the two most frequent queries and the index each needs.',answer:'<ul class="clean"><li>"My current loans": <code>loan WHERE member_id=? AND returned_at IS NULL</code> → index on (member_id, returned_at).</li><li>"Is any copy free?": <code>copy WHERE isbn=? AND status=\'available\'</code> → index on (isbn, status).</li></ul>'}]}]},

{title:'Indexes: from scan to lookup',tab:'Indexes',mins:30,out:'Explain an index with numbers',lead:'Without an index the database reads every row. A B-tree index keeps keys sorted in a shallow tree, so a lookup touches a handful of pages.',blocks:[
 {t:'lab',fn:'index',title:'Lab · Full scan vs B-tree lookup'},
 {t:'table',title:'Index facts that come up in interviews',head:['Fact','Why it matters'],rows:[
  ['Indexes speed reads but slow writes','Every insert also updates each index'],
  ['Composite index (a, b) helps queries on a, or a+b','But not queries on b alone: the leftmost-prefix rule'],
  ['Range queries work on B-trees','<code>created_at BETWEEN …</code>; hash indexes only do equality'],
  ['A covering index holds all needed columns','The query never touches the table'],
  ['Low-selectivity columns (gender) index poorly','Most rows match, so a scan is similar']]},
 {t:'mcq',title:'Leftmost prefix',intro:'Index on <code>(country, city, created_at)</code>. Can the index be used?',items:[
  {q:'<code>WHERE country=\'IN\' AND city=\'Pune\'</code>',opts:['Yes','No'],a:0,why:'Uses the first two columns in order.'},
  {q:'<code>WHERE city=\'Pune\'</code>',opts:['Yes','No'],a:1,why:'Skips the first column, so the sorted order does not help.'},
  {q:'<code>WHERE country=\'IN\' ORDER BY city</code>',opts:['Yes','No'],a:0,why:'Rows for IN are already sorted by city inside the index.'}]}]},

{title:'Transactions and isolation',tab:'Transactions',mins:25,out:'Explain a race and its fix',lead:'A transaction groups writes so they all happen or none do. Isolation decides what concurrent transactions can see of each other.',blocks:[
 {t:'cards',title:'ACID',items:[
  {tag:'A',title:'Atomicity',body:'All or nothing. Debit and credit both happen, or neither.'},
  {tag:'C',title:'Consistency',body:'Rules (constraints, foreign keys) hold before and after.'},
  {tag:'I',title:'Isolation',body:'Concurrent transactions do not see each other\'s half-done work (to a chosen level).'},
  {tag:'D',title:'Durability',body:'Once committed, it survives a crash (written to the log on disk).'}]},
 {t:'table',title:'What can go wrong without enough isolation',head:['Anomaly','What happens','Prevented by'],rows:[
  ['Dirty read','You read another transaction\'s uncommitted change','Read committed'],
  ['Non-repeatable read','Same row read twice gives different values','Repeatable read / snapshot'],
  ['Lost update','Two read-modify-writes; one overwrites the other','Row locks, <code>SELECT … FOR UPDATE</code>, atomic updates, version checks'],
  ['Write skew / double booking','Two transactions each check a rule, both write','Serializable, or a unique constraint / conditional update']]},
 {t:'lab',fn:'seatRace',title:'Lab · Two buyers, one seat',intro:'Run the naive version, find the bug, then run the conditional update.'},
 {t:'teacher',items:['After the lab, show the three common fixes: conditional update (<code>WHERE status=\'available\'</code>), row lock (<code>FOR UPDATE</code>), unique constraint on (event, seat) in a bookings table.']}]},

{title:'SQL or NoSQL? Choosing storage',tab:'Choosing storage',mins:25,out:'Storage choice per workload',blocks:[
 {t:'grid',title:'Storage families',items:[
  {tag:'Relational',title:'PostgreSQL, MySQL',body:'Tables, joins, transactions. Default for business data with relations.'},
  {tag:'Key-value',title:'Redis, DynamoDB',body:'Get/put by key, very fast. Sessions, carts, counters, caches.'},
  {tag:'Document',title:'MongoDB',body:'JSON documents with varying shape. Product catalogues, profiles.'},
  {tag:'Wide-column',title:'Cassandra, HBase',body:'Huge write volumes, query by partition key. Messages, time series, logs.'},
  {tag:'Search',title:'Elasticsearch',body:'Full-text search and filters. Kept in sync from the main database.'},
  {tag:'Object storage',title:'S3-style blobs',body:'Images, video, backups. Cheap, huge, accessed by key via URL/CDN.'}]},
 {t:'mcq',title:'Pick the storage',items:[
  {q:'Bank accounts and transfers',opts:['Relational','Wide-column','Object storage'],a:0,why:'Transactions and constraints matter most.'},
  {q:'Chat messages: 50 K writes/s, read by conversation',opts:['Relational, one server','Wide-column partitioned by conversation','Search engine'],a:1,why:'High write volume, simple access by partition key.'},
  {q:'User-uploaded videos',opts:['Relational BLOB column','Object storage + metadata in a DB','Key-value cache'],a:1,why:'Large files belong in object storage behind a CDN.'},
  {q:'"Search products by any word in the description"',opts:['LIKE \'%word%\' in SQL','Search index','Key-value'],a:1,why:'Inverted indexes make full-text search fast.'},
  {q:'Shopping cart for a logged-in user',opts:['Key-value','Graph database','Object storage'],a:0,why:'One key (user) → small value, read and written often.'}]},
 {t:'flash',title:'Review flashcards',items:[['Why not index every column?','Each index slows writes and uses space.'],['Lost update fix?','Atomic update, row lock, or version check (optimistic locking).'],['When denormalise?','Read-heavy paths where joins are too slow; accept harder updates.'],['Where do images go?','Object storage + CDN; the DB stores the URL.'],['Wide-column store is good for…','Very high write volume read by a partition key.'],['Composite index rule?','Leftmost prefix: (a,b) helps a and a+b, not b alone.']]},
 {t:'task',title:'Homework',items:['Model the data for a cinema booking system: tables, keys, two hot queries and their indexes.']}]}
],
labs:{
 index(el,api){
  el.innerHTML=`<label>Rows in table: <b data-n></b><input type="range" min="3" max="9" step="1" value="6" data-r></label><div class="out"><div><b data-scan></b><span>rows read by a full scan (worst case)</span></div><div><b data-depth></b><span>B-tree levels (≈ 200 keys per page)</span></div><div><b data-look></b><span>pages read with the index</span></div><div><b data-x></b><span>times less work</span></div></div><div class="verdict" data-v></div>`;
  const draw=()=>{const p=+api.$('[data-r]',el).value,n=Math.pow(10,p);const depth=Math.max(1,Math.ceil(Math.log(n)/Math.log(200)));
   api.$('[data-n]',el).textContent=n.toLocaleString();api.$('[data-scan]',el).textContent=n.toLocaleString();api.$('[data-depth]',el).textContent=depth;api.$('[data-look]',el).textContent=depth+1;api.$('[data-x]',el).textContent=Math.round(n/(depth+1)).toLocaleString()+'x';
   api.$('[data-v]',el).innerHTML=`Growing the table 1,000x adds only about one level to the tree. That is why <code>WHERE email = ?</code> stays fast at a billion rows, as long as <code>email</code> is indexed.`};
  el.addEventListener('input',draw);draw()}
}});
