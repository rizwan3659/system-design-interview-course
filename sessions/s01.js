COURSE.add({id:'s01',n:1,part:'A',track:'HLD',
title:'The design interview, requirements and estimation',
goal:'Learn the 5-step loop, ask the questions that shape a design, and estimate scale in under two minutes.',
outcomes:['Run the 5-step loop and pace it across a 45-minute interview','Separate functional and non-functional requirements and find the never-happen rule','Show how each requirement adds (or removes) a box from the design','Estimate requests per second, storage, bandwidth and cache size','Explain why a small system should stay simple'],
modules:[
{title:'How the system design round works',tab:'The round',mins:10,out:'Know what is graded and how to pace it',lead:'The interviewer gives a vague problem and changes it while you work. They grade how you break it down and reason about trade-offs, not whether you name the "right" architecture.',blocks:[
 {t:'cards',title:'The 5-step loop',intro:'Click each step. You will use this loop in every design for the next 40 hours.',items:[
  {tag:'Step 1 · 5–8 min',title:'Clarify the problem',sub:'Who, what, how much, what must never break?',body:'<p>Find the users, 2–3 must-have actions, the scale, and the one quality that matters most. Write the agreed scope on the board before drawing.</p><p class="say">"Before I design, can I check who the users are and what success looks like?"</p><p><span class="tag red">Common mistake</span> Jumping straight to boxes, or asking 15 questions and never designing.</p>'},
  {tag:'Step 2 · ~5 min',title:'Define interactions',sub:'What can users and systems do?',body:'<p>Turn use cases into API calls with inputs and outputs. This is the contract; everything else serves it.</p><p class="say">"Let me write the main actions as API calls."</p><p><span class="tag red">Common mistake</span> Skipping it, so the design has no clear purpose.</p>'},
  {tag:'Step 3 · 5–7 min',title:'Identify the data',sub:'What is stored, how is it read?',body:'<p>List entities and key fields. Name the most frequent read and the riskiest write: those decide storage, keys and indexes.</p><p class="say">"The most common read is X, so the key is Y."</p><p><span class="tag red">Common mistake</span> Saying "a database" without saying what is in it.</p>'},
  {tag:'Step 4 · ~10 min',title:'Draw a simple design',sub:'Smallest set of parts that works',body:'<p>Client → service → storage, plus only what a requirement asks for. Trace one request end to end out loud.</p><p class="say">"This works for day one. Let me trace a request through it."</p><p><span class="tag red">Common mistake</span> Starting with every component you know.</p>'},
  {tag:'Step 5 · 10–15 min',title:'Challenge and improve',sub:'What breaks first, and what does the fix cost?',body:'<p>Ask: what if a part dies, traffic grows 100x, a rule changes, two users act at once? Fix the biggest risk first and name the cost.</p><p class="say">"If traffic grows 100x this breaks first, because… The fix costs…"</p><p><span class="tag red">Common mistake</span> Waiting for the interviewer to find the problems.</p>'}]},
 {t:'lab',fn:'timeline',title:'Diagram · Pacing a 45-minute interview',intro:'Click a phase to see what to do and what to say. Drag the clock to any minute and check where you should be.'},
 {t:'table',title:'What scores well vs. what does not',head:['Scores well','Scores poorly'],rows:[
  ['Asks who the users are before drawing','Draws 12 boxes in the first minute'],
  ['"A queue here, because emails can be sent later"','"We\'ll use Kafka" with no reason'],
  ['Starts with one server and one database','Starts with microservices and sharding'],
  ['Says what each choice costs','Presents choices as free'],
  ['Adapts when a requirement changes','Starts over, or argues with the change'],
  ['Thinks aloud and checks in','Works in silence']]},
 {t:'teacher',items:['Open with: "Design YouTube. Go." Wait 20 seconds. Ask who started drawing and who started asking.','Use the timeline: at minute 20, a candidate still asking questions is in trouble, and so is one already discussing sharding.','Start the class clock in the header now.']}]},

{title:'Clarifying requirements',tab:'Requirements',mins:25,out:'Your 8-question card',lead:'Requirements come in two kinds. Functional ones say what the system does. Non-functional ones say how well it must do it, and they drive most design decisions.',blocks:[
 {t:'grid',cols:2,title:'Two kinds of requirement',items:[
  {tag:'Functional',title:'What the system does',body:'<ul class="clean"><li>Users can post a photo</li><li>Users can follow other users</li><li>Users see a feed of people they follow</li></ul><p class="muted">These become your API calls.</p>'},
  {tag:'Non-functional',tc:'amber',title:'How well it must do it',body:'<ul class="clean"><li><b>Scale:</b> 10 M daily users</li><li><b>Latency:</b> feed loads in under 500 ms</li><li><b>Availability:</b> 99.9% uptime</li><li><b>Consistency:</b> a new post can take a few seconds to appear</li><li><b>Durability:</b> photos are never lost</li></ul><p class="muted">These decide caching, replication and storage.</p>'}]},
 {t:'sort',title:'Exercise 1 · Functional or non-functional?',labels:['Functional','Non-functional'],items:[
  {q:'"Users can follow other users."',a:0,why:'An action the system offers: becomes an API.'},
  {q:'"The feed loads in under 300 ms."',a:1,why:'A latency target: pushes you toward caching and precomputing.'},
  {q:'"Riders see the driver moving on a map."',a:0,why:'A feature. Its hidden non-functional part: updates every few seconds.'},
  {q:'"99.95% uptime."',a:1,why:'Availability: needs redundancy for every part.'},
  {q:'"A message is never lost once the sender sees one tick."',a:1,why:'Durability: the write must be stored safely before acknowledging.'},
  {q:'"Users can search their old messages."',a:0,why:'A feature: implies a search index.'},
  {q:'"Support 50 M daily users."',a:1,why:'Scale: decides one machine vs many.'},
  {q:'"Customer data must stay in India."',a:1,why:'A constraint (data residency): decides regions and replication.'}]},
 {t:'arch',title:'Diagram · Every requirement adds a box',intro:'Start with one app server and one database. Switch on a requirement and watch which part it adds. Then test the design.',w:760,h:340,toggleTitle:'Switch on a requirement',failTitle:'Test the design',
   nodes:[{id:'client',x:20,y:150,w:110,label:'Users',sub:'web / app'},{id:'cdn',x:20,y:270,w:110,h:52,label:'CDN',sub:'photos, video',opt:'media'},{id:'lb',x:160,y:150,w:120,label:'Load balancer',sub:'spreads traffic',opt:'scale'},{id:'app',x:310,y:150,w:140,label:'App server',sub:'one machine',swap:{when:'scale',label:'App servers ×N',sub:'stateless'}},{id:'cache',x:520,y:40,w:200,label:'Cache',sub:'hot data in memory',opt:'read'},{id:'db',x:520,y:150,w:200,label:'Database',sub:'source of truth'},{id:'replica',x:520,y:260,w:200,label:'Replica + backups',sub:'copy on another machine',opt:'durable'},{id:'queue',x:310,y:270,w:140,h:52,label:'Queue',sub:'jobs for later',opt:'async'},{id:'worker',x:160,y:270,w:120,h:52,label:'Email worker',opt:'async'}],
   edges:[{d:'M130 178H160',opt:'scale'},{d:'M280 178H310',opt:'scale'},{d:'M130 170H145V120H295V160H310',opt:'!scale',label:'direct',lx:190,ly:112},{d:'M450 178H520'},{d:'M450 166H485V68H520',opt:'read'},{d:'M620 206V260',dash:true,opt:'durable'},{d:'M380 206V270',opt:'async'},{d:'M310 296H280',opt:'async'},{d:'M75 206V270',dash:true,opt:'media'}],
   toggles:[{id:'scale',label:'"10 M daily users"'},{id:'read',label:'"Reads are 100× writes"'},{id:'durable',label:'"Never lose data"'},{id:'async',label:'"Send a welcome email"'},{id:'media',label:'"Users upload photos and videos"'}],
   fails:[
    {label:'Traffic grows 5×',run:o=>o.scale?{lvl:'ok',oks:['lb','app'],txt:'Add more stateless app servers behind the load balancer.'+(o.read?' The cache absorbs most of the extra reads.':' Without a cache, the database takes all the extra reads: watch it.')}:{lvl:'bad',hits:['app'],txt:'One machine is maxed out and there is no way to add a second without a load balancer. Requirement that fixes it: "10 M daily users".'}},
    {label:'The database machine dies',run:o=>o.durable?{lvl:'warn',hits:['db'],oks:['replica'],txt:'The replica is promoted; writes pause for seconds to minutes; backups mean nothing is lost. Cost: a second machine, and replication lag.'}:{lvl:'bad',hits:['db'],txt:'Everything is down, and data since the last copy is gone. Requirement that fixes it: "Never lose data".'}},
    {label:'The email provider takes 10 seconds',run:o=>o.async?{lvl:'ok',oks:['queue','worker'],txt:'Sign-up returns at once; the worker sends the email when the provider answers, with retries. Cost: the email can arrive a little later.'}:{lvl:'bad',hits:['app'],txt:'Every sign-up waits 10 seconds for the email to send, and fails if the provider is down. Requirement that fixes it: move the email to a queue.'}},
    {label:'A video goes viral',run:o=>o.media?{lvl:'ok',oks:['cdn'],txt:'CDN edges near the viewers serve the video; your servers see a tiny fraction of the traffic.'}:{lvl:'bad',hits:['app','db'],txt:'Every view streams through your app servers: huge bandwidth bills and slow playback far away. Requirement that fixes it: a CDN for media.'}}],
   start:'Day one: users talk directly to one app server with one database. Switch on requirements one by one.'},
 {t:'sort',title:'Exercise 2 · Ask it or skip it?',intro:'Prompt: <b>"Design a chat app."</b> Would a strong candidate ask this in the first five minutes?',items:[
  {q:'"Is it one-to-one chat, group chat, or both?"',a:0,why:'Scopes the core features. Group chat changes fan-out and storage.'},
  {q:'"Should I use Kafka or RabbitMQ?"',a:1,why:'A tool before the problem is known. Choose tools later, for a stated reason.'},
  {q:'"How many daily users, and how many messages each?"',a:0,why:'Scale decides one server vs many.'},
  {q:'"Do messages need to be kept forever?"',a:0,why:'Data lifetime sets storage size and deletion jobs.'},
  {q:'"What colour should the send button be?"',a:1,why:'A UI detail that does not change the system.'},
  {q:'"Must messages arrive in order within a conversation?"',a:0,why:'An ordering requirement that shapes the whole message path.'},
  {q:'"Can I build it as microservices?"',a:1,why:'An architecture choice, not a requirement. Decide it later.'},
  {q:'"Do users need to see who is online?"',a:0,why:'Presence is expensive; ask whether it is in scope.'}]},
 {t:'reveal',title:'Exercise 3 · Name the never-happen rule',intro:'Every system has one failure the business cannot accept. Say it for each product, then reveal.',items:[
  {q:'<b>Bank transfers</b>',a:'Money is created or lost: a debit without its credit, or a transfer applied twice.'},
  {q:'<b>Concert tickets</b>',a:'Two people get the same seat.'},
  {q:'<b>Chat app</b>',a:'A message the sender saw as "sent" is lost, or messages show out of order.'},
  {q:'<b>URL shortener</b>',a:'A short link redirects to the wrong URL.'},
  {q:'<b>Ride-hailing</b>',a:'One driver is assigned to two trips at once, or a rider is charged twice.'},
  {q:'<b>Hospital records</b>',a:'A doctor sees the wrong patient\'s record, or an allergy update is lost.'}]},
 {t:'table',title:'The clarifying-question bank',head:['Area','Questions','Why it changes the design'],rows:[
  ['Users','Who uses it? Public, internal, other services? Web, mobile?','API style, auth, traffic shape'],
  ['Core actions','What are the 2–3 must-haves? What is out of scope?','Keeps the design finishable'],
  ['Scale','Users per day? Actions per user? Reads vs writes?','One machine vs many; where to cache'],
  ['Quality','Fast, always up, or always correct: which matters most?','Consistency and redundancy'],
  ['Never-happen rule','What must never go wrong (double booking, lost money)?','Marks the part needing strong guarantees'],
  ['Data lifetime','Does data expire? History or audit needed?','Storage size, deletion jobs'],
  ['Constraints','Existing systems, team size, deadline, budget, regions?','Rules out options early']]},
 {t:'reveal',title:'Exercise 4 · Write 5 questions in 2 minutes each',intro:'Do it on paper first, then reveal a sample. The last three are harder.',items:[
  {q:'<b>Design a parking-lot system.</b>',a:'How many floors and spots? Vehicle types? Pay on entry or exit, and how? Show free spots in real time? One lot or a chain? Never-happen: two cars assigned the same spot.'},
  {q:'<b>Design library book reservations.</b>',a:'How many branches, books, members? Reserve a book that is out? How long is a hold kept? Waiting-list order? Notifications by email or app? Never-happen: one copy lent to two people.'},
  {q:'<b>Design food-delivery tracking.</b>',a:'Who sees what: customer, restaurant, rider? How often does rider location update? Active orders at peak? Real-time map or 10 s delay OK? Which cities? Never-happen: an order assigned to two riders.'},
  {q:'<b>Design YouTube.</b> (harder)',a:'Upload or watch, or both? How many uploads and views a day? Average video size and length? Global users? Live streaming in scope? Start-up time target? Never-happen: an uploaded video is lost after the upload succeeds.'},
  {q:'<b>Design Google Docs.</b> (harder)',a:'How many people edit one document at once? How fast must others see an edit? Offline editing? Full version history? Comments and permissions? Never-happen: two people\'s edits overwrite each other and text is lost.'},
  {q:'<b>Design a payment system.</b> (harder)',a:'Which methods (card, UPI, wallet)? Payments per second at peak? Who are the users: shoppers, merchants, both? Refunds? Which regulations? Never-happen: a customer is charged twice or a merchant is paid twice.'}]},
 {t:'notes',title:'Your 8-question card',label:'Write the 8 questions you will ask on every prompt',placeholder:'1. Who are the users?\n2. ...',rows:8},
 {t:'teacher',items:['Run the sort exercises as a show of hands. The best discussion comes from "Kafka" and "microservices": they sound smart but decide the solution before the problem.','In the requirements diagram, switch requirements on in a random order and ask the class to predict which box appears before you click.','Cap clarifying at ~8 minutes in a real interview. Then write the agreed scope on the board.']}]},

{title:'Back-of-envelope estimation',tab:'Estimation',mins:30,out:'Estimates done aloud, in under 2 minutes each',lead:'Estimates answer one question: does this fit on one machine, and if not, where is the pressure (reads, writes, storage or bandwidth)? You need rough numbers, not exact ones.',blocks:[
 {t:'table',title:'Numbers to remember',head:['Quantity','Approximate value','Use it for'],rows:[
  ['Seconds in a day','86,400 ≈ 10<sup>5</sup>','Per-day → per-second'],
  ['1 M requests a day','≈ 12 per second','Quick conversions'],
  ['Peak vs average','2–5x','Plan for peak'],
  ['Memory read','~100 ns','Why caches are fast'],
  ['SSD random read','~0.1 ms','Database reads'],
  ['Network in one data centre','~0.5 ms round trip','Service-to-service calls'],
  ['Cross-continent round trip','~100–150 ms','Why CDNs and regions exist'],
  ['One app server','~1,000–10,000 simple req/s','How many servers you need'],
  ['One relational database','~1,000–10,000 simple writes/s','When to shard']],note:'All values are rough rules of thumb. Real numbers depend on hardware and workload; say "roughly" in the interview.'},
 {t:'table',title:'Sizes and powers of ten',head:['Unit','Bytes','Example'],rows:[
  ['1 KB','10<sup>3</sup> (2<sup>10</sup> ≈ 1,000)','A short text post with metadata'],
  ['1 MB','10<sup>6</sup>','A compressed photo'],
  ['1 GB','10<sup>9</sup>','A 30-minute HD video; RAM of a small cache node is 10s of GB'],
  ['1 TB','10<sup>12</sup>','One large disk; fits on one database machine'],
  ['1 PB','10<sup>15</sup>','Object storage territory (S3-style)'],
  ['Field sizes','—','char 1 B · int 4–8 B · timestamp 8 B · UUID 16 B · URL ~100 B']]},
 {t:'stepper',title:'Worked example · Estimate Twitter in 6 steps',steps:[
  {title:'State assumptions',short:'Assume',secs:90,think:'Write the assumptions you would say out loud. Keep the numbers round.',answer:'<ul class="clean"><li>200 M daily users</li><li>Each posts 2 tweets a day and reads 100</li><li>A tweet is ~300 bytes of text + metadata</li><li>10% of tweets have one image, ~500 KB</li></ul><p class="say">"I\'ll use round numbers; tell me if they\'re far off."</p>'},
  {title:'Write traffic',short:'Writes',secs:90,think:'Tweets per second, average and peak?',answer:'200 M × 2 = 400 M tweets a day ÷ 86,400 ≈ <b>4,600 writes/s</b>. Peak ≈ 3x ≈ <b>14,000/s</b>. Already more than one database comfortably handles at peak: plan to partition.'},
  {title:'Read traffic',short:'Reads',secs:90,think:'Tweet reads per second? What is the read:write ratio?',answer:'200 M × 100 = 20 B reads a day ÷ 86,400 ≈ <b>230,000 reads/s</b>. Ratio ≈ 50:1: <b>read-heavy</b>, so caching and precomputed feeds matter most.'},
  {title:'Storage',short:'Storage',secs:120,think:'Storage per day and per year, text and images separately.',answer:'<ul class="clean"><li>Text: 400 M × 300 B = <b>120 GB/day</b> ≈ 44 TB/year: a sharded database.</li><li>Images: 40 M × 500 KB = <b>20 TB/day</b> ≈ 7 PB/year: object storage, never the database.</li></ul>'},
  {title:'Bandwidth',short:'Bandwidth',secs:120,think:'Outgoing bandwidth for images?',answer:'10% of 230,000 reads/s show an image: 23,000 × 500 KB ≈ <b>11.5 GB/s</b> (~90 Gbit/s). Far too much for app servers: images must come from a <b>CDN</b>.'},
  {title:'Cache memory',short:'Cache',secs:120,think:'How much memory to cache today\'s popular tweets (80/20 rule)?',answer:'Assume 20% of today\'s tweets get 80% of reads: 20% × 400 M × 300 B ≈ <b>24 GB</b>. That fits in a handful of cache nodes. Conclusion: cache the hot text in memory, serve images from a CDN, partition tweet storage.'}]},
 {t:'lab',fn:'estimator',title:'Lab · Estimator',intro:'Change the numbers and read the verdict. Try 2,000 users: the verdict flips to "one server is enough".'},
 {t:'lab',fn:'estdrill',title:'Lab · Estimation drill',intro:'A random scenario each time. Type your estimate: anything within 2x of the answer counts, because the goal is the order of magnitude.'},
 {t:'reveal',title:'Quick estimates (answer aloud, then reveal)',items:[
  {q:'10 M users each send 20 messages a day. Messages per second?',a:'200 M / 86,400 ≈ <b>2,300/s</b> average, about <b>7,000/s</b> at 3x peak. More than one database comfortably writes: plan to split data.'},
  {q:'A photo is 2 MB; 1 M uploads a day. Storage per year?',a:'2 TB a day × 365 ≈ <b>730 TB</b> a year. Files go to object storage; only metadata goes in the database.'},
  {q:'2,000 students check grades twice a day. Requests per second?',a:'4,000 / 86,400 ≈ <b>0.05/s</b>. Tiny. One server, one database. Saying so shows judgement.'},
  {q:'A video site serves 5 M views a day at 5 Mbit/s for 4 minutes each. Peak bandwidth?',a:'Concurrent viewers ≈ 5 M × 240 s / 86,400 ≈ 14,000 × 5 Mbit/s ≈ 70 Gbit/s average, ~200 Gbit/s peak. That is why video goes through a CDN.'},
  {q:'A ride app has 1 M active drivers sending GPS every 4 s. Writes per second?',a:'1 M / 4 = <b>250,000 writes/s</b>. Too many for a disk database: keep current locations in memory, store history in batches.'},
  {q:'Store 1 billion user profiles of 1 KB each. Total size?',a:'10<sup>9</sup> × 10<sup>3</sup> B = <b>1 TB</b>. Fits on one large machine, but replicate it, and shard once writes or growth demand it.'}]},
 {t:'teacher',items:['Do the Twitter stepper on the board: write each formula, round aggressively, and finish each step with a decision ("so we need a CDN").','Common mistake: spending 10 minutes on maths. Each estimate should take about 2 minutes and end with a design decision.']}]},

{title:'Guided problem: a college attendance app',tab:'Guided problem',mins:30,out:'One full loop on a small system',lead:'Prompt: <b>"Design an app where teachers take attendance and students see their attendance."</b> A small system on purpose: the skill is not over-building it.',blocks:[
 {t:'stepper',steps:[
  {title:'Clarify',short:'Clarify',secs:180,think:'Ask 5 questions. What scale do you assume? What must never go wrong?',answer:'<ul class="clean"><li>Users: 200 teachers, 8,000 students, one college.</li><li>Must-haves: teacher marks a class present/absent; student sees percentage per subject; admin exports reports.</li><li>Scale: 300 classes a day × 40 students ≈ 12,000 marks a day; reads spike before exams.</li><li>Never-happen rule: a mark saved for the wrong student, or lost after the teacher sees "saved".</li><li>Works on weak campus Wi-Fi.</li></ul>'},
  {title:'Interactions',short:'APIs',secs:150,think:'Write 4 API calls.',answer:'<ul class="clean"><li><code>GET /classes/today</code> (teacher) → list of sessions</li><li><code>PUT /sessions/{id}/attendance {studentId: present|absent, ...}</code> → saved count</li><li><code>GET /students/me/attendance</code> → per-subject percentages</li><li><code>GET /reports?course=&month=</code> (admin) → CSV</li></ul><p>Using <code>PUT</code> for the whole class makes a retry safe: sending it twice gives the same result.</p>'},
  {title:'Data',short:'Data',secs:180,think:'Which tables? What is the most frequent read?',answer:'<p><b>Student</b>(id, name, program) · <b>Course</b>(id, name) · <b>Session</b>(id, courseId, date, teacherId) · <b>Attendance</b>(sessionId, studentId, status) with primary key (sessionId, studentId).</p><p>Most frequent read: a student\'s percentage per course. 12,000 rows a day × 200 days ≈ 2.4 M rows a year: small. An index on (studentId) answers it fast.</p>'},
  {title:'Simple design',short:'Design',secs:240,think:'Draw it. How many servers? Which database?',answer:'<p>One web app + one relational database (with daily backups) is enough: peak is a few requests per second.</p><p class="say">"The scale is small, so I\'m deliberately keeping this to one service and one database."</p>'},
  {title:'Challenge it in the lab',short:'Challenge',secs:300,think:'Break the design, then add only the part that fixes each failure.',blocks:[{t:'arch',title:'Attendance app lab',w:760,h:300,
   nodes:[{id:'teacher',x:20,y:60,w:170,label:'Teacher app',sub:'marks a class',swap:{when:'offline',label:'Teacher app',sub:'saves offline, retries'}},{id:'student',x:20,y:200,w:170,label:'Student app',sub:'checks %'},{id:'app',x:330,y:130,w:170,label:'Web app',sub:'one server',swap:{when:'ha',label:'Web app ×2',sub:'behind a load balancer'}},{id:'cache',x:570,y:30,w:170,label:'Cache',sub:'% per student',opt:'cache'},{id:'db',x:570,y:130,w:170,label:'Database',sub:'+ daily backup',swap:{when:'multi',label:'Database',sub:'collegeId on every row'}}],
   edges:[{d:'M190 88H260V150H330'},{d:'M190 228H260V172H330'},{d:'M500 158H570'},{d:'M500 146H535V58H570',opt:'cache'}],
   toggles:[{id:'ha',label:'Second web server'},{id:'offline',label:'Offline save on the teacher app'},{id:'cache',label:'Cache attendance percentages'},{id:'multi',label:'collegeId on every table'}],
   fails:[
    {label:'The server crashes during exam week',run:o=>o.ha?{lvl:'ok',oks:['app'],txt:'The load balancer sends traffic to the second server. Nothing is lost: the data lives in the database, not on the server.'}:{lvl:'bad',hits:['app'],txt:'Nobody can mark or check attendance until the server is fixed. Fix: a second web server behind a load balancer. Cost: double the server bill.'}},
    {label:'Campus Wi-Fi drops while marking',run:o=>o.offline?{lvl:'ok',oks:['teacher'],txt:'Marks stay on the phone and the app retries the PUT. Because PUT replaces the whole class, a retry cannot double-count.'}:{lvl:'bad',hits:['teacher'],txt:'The request fails and the teacher has to mark 40 students again. Fix: save on the phone and retry.'}},
    {label:'8,000 students check results at 9:00',run:o=>o.cache?{lvl:'ok',oks:['cache'],txt:'Percentages come from the cache, recomputed only when a class is saved. The database stays quiet.'}:{lvl:'warn',hits:['db'],txt:'The database recalculates the same percentages 8,000 times. At a few hundred requests a second it survives, just slowly. A cache is optional here: say so, that is good judgement.'}},
    {label:'29 more colleges join',run:o=>o.multi?{lvl:'ok',oks:['db'],txt:'Every row has a collegeId and every query filters by it. Still one database: about 70 M rows a year is fine with indexes.'}:{lvl:'warn',hits:['db'],txt:'Students from different colleges mix in the same tables. Add collegeId to every table and index it.'}},
    {label:'Two teachers edit the same class',run:o=>({lvl:'warn',hits:['db'],txt:'Last write wins, silently. Store an updatedAt version and reject an edit based on an old version, so the second teacher sees "someone changed this, reload".'})}],
   start:'Start with one web server and one database. Break something, then add only the part that fixes it.'}]}]},
 {t:'teacher',items:['Many students will propose Kafka, Redis and microservices here. Ask them to justify each with a number from step 1. Most cannot: that is the lesson.','In the lab, the cache is genuinely optional at this scale. Students who say so deserve credit.']}]},

{title:'Your project story and review',tab:'Review',mins:25,out:'2-minute story + exit quiz',lead:'Interviewers often ask about something you built. Prepare the story once and reuse it in every round.',blocks:[
 {t:'lab',fn:'story',title:'Build your 2-minute project story',intro:'Fill it in for your strongest project. Small scale is fine; the reasons are what count.'},
 {t:'flash',items:[['Functional vs non-functional?','Functional: what it does (post a photo). Non-functional: how well (latency, scale, availability, consistency, durability).'],['Why estimate?','To decide if one machine is enough and where the pressure is (reads, writes, storage, bandwidth).'],['1 M requests/day ≈ ?','About 12 per second on average.'],['What is the never-happen rule?','The one failure the business cannot accept, e.g. double booking. It marks where you need strong guarantees.'],['When to stop clarifying?','After ~8 minutes, or once users, core actions, scale and the never-happen rule are agreed.'],['First sentence before drawing?','"Let me start simple and then scale it."'],['Images in an estimate?','Separate them from text: object storage + CDN, never the database.'],['80/20 cache sizing?','Cache the ~20% of items that get ~80% of reads.']]},
 {t:'mcq',title:'Exit quiz',items:[
  {q:'You estimate 0.5 requests per second. What do you propose?',opts:['A sharded cluster','One server and one database','A CDN and three regions'],a:1,why:'Match the design to the load. Over-building scores poorly.'},
  {q:'Which is a non-functional requirement?',opts:['Users can upload videos','Videos start playing within 2 seconds','Users can comment'],a:1,why:'It describes how well, not what.'},
  {q:'Peak traffic is usually planned as…',opts:['Equal to average','2–5x average','100x average'],a:1,why:'A common rule of thumb; check with the interviewer.'},
  {q:'20 TB of new images a day should be stored in…',opts:['The main SQL database','Object storage behind a CDN'],a:1},
  {q:'At minute 25 of a 45-minute interview you should be…',opts:['Still clarifying','Drawing or tracing the simple design','Discussing sharding strategies'],a:1,why:'Leave 10–15 minutes for challenges.'},
  {q:'"Messages are never lost once acknowledged" is mainly about…',opts:['Latency','Durability','Scale'],a:1}]},
 {t:'task',title:'Homework',items:['Write clarifying questions and an estimate for "Design Instagram" (10 minutes).','Practise your project story out loud twice.','Do the self-study module: a 30-minute timed mock with change cards.']},
 {t:'teacher',items:['Ask 2 volunteers to tell their story. Ask one follow-up each: "What breaks first at 10x users?"','Point students to the Extra practice module for homework.']}]},

{title:'Extra practice: timed mock interview',tab:'Extra practice',mins:60,selfStudy:true,lead:'Do this after class, alone or with a friend as the interviewer. Prompt: <b>"Design a system where people buy tickets for concerts."</b> Set the 30-minute timer, talk out loud, and do not open the change cards until their minute.',blocks:[
 {t:'timer',total:1800,phases:[[0,300,'Clarify: users, scale, never-happen rule'],[300,600,'List the API calls'],[600,900,'Entities, main read, riskiest write'],[900,1320,'Simple design + trace a purchase'],[1320,1560,'Handle change card A'],[1560,1680,'Handle change card B'],[1680,1800,'Summarise: build first, top risk']],
  cards:[{at:1320,label:'Change card A · minute 22',title:'"A famous artist goes on sale Friday at 10:00. 2 million people will try to buy 50,000 seats in the first minute."',body:'Think about: a waiting room in front of checkout; holding a seat while the buyer pays; serving the seat map from a cache; protecting the database from 2 million writes at once.'},{at:1560,label:'Change card B · minute 26',title:'"Payment goes through an outside provider that sometimes takes 30 seconds or times out."',body:'Think about: the seat\'s state while payment is pending; what happens if payment succeeds but your server crashes before saving; retrying without charging twice.'}]},
 {t:'lab',fn:'seatRace',title:'Concurrency lab · Two buyers, one seat',intro:'The never-happen rule for tickets: two people must not get the same seat. Run the naive version, find the bug, then run the conditional update.'},
 {t:'reveal',title:'Model hints (open only after the timer)',cols:2,items:[
  {q:'Entities?',a:'Event · Seat (eventId, seatId, status: available / held / sold, heldUntil, holderId) · Order (orderId, userId, seats, status, paymentId, idempotencyKey).'},
  {q:'Riskiest write?',a:'available → held. One conditional update (<code>... WHERE status = \'available\'</code>) or a row lock in a transaction.'},
  {q:'How long should a hold last?',a:'About 10 minutes. Longer is kinder to the buyer but locks seats away from everyone else.'},
  {q:'Change card A?',a:'A virtual waiting room lets in a few thousand buyers at a time; the seat map comes from a cache; only holds touch the database. Cost: users wait in a queue.'},
  {q:'Change card B?',a:'Save the order as <i>pending</i> before calling the provider; confirm on its reply or callback; a background job reconciles stuck orders. Reuse the same idempotency key on every retry so the provider charges once.'},
  {q:'Which parts can be eventually consistent?',a:'The seat map (a few seconds stale is fine). The purchase itself cannot: always check the database.'}]},
 {t:'table',title:'Interviewer script (for pair practice)',head:['Minute','Interviewer says','Listen for'],rows:[
  ['0','"Design a system to buy concert tickets."','Do they ask before drawing?'],
  ['8','If no scale question yet: "How many users do you expect?"','Do they adjust their plan to the number?'],
  ['15','"Walk me through what happens when I click Buy."','A clear end-to-end trace through each part'],
  ['22','Read change card A.','Adapting the design, not restarting'],
  ['26','Read change card B.','Pending state, retries, no double charge'],
  ['28','"What would you build first, and what worries you most?"','Priorities and an honest weak spot']]},
 {t:'drill',title:'Failure drill',intro:'For each failure, say: what the user sees, how you detect it, how the system recovers.',prefix:'What happens if… ',button:'Draw a failure',items:[
  ['one app server crashes mid-request?','User: one failed request or a retry. Detect: load-balancer health check, error-rate alert. Recover: traffic shifts to other servers; stateless, so no data lost.'],
  ['the database is unreachable for 2 minutes?','User: seat map still loads from cache; buying fails with a clear "try again". Detect: connection errors, alert. Recover: fail over to the replica; holds resume.'],
  ['the cache restarts empty during the big sale?','User: slower pages. Detect: hit-rate drop, database load spike. Recover: warm popular events first; let one request per key fill the cache.'],
  ['a payment callback arrives twice?','User: nothing, if handled. Detect: same idempotency key seen twice. Recover: the second callback is ignored because the order is already confirmed.'],
  ['the hold-expiry job stops running?','User: seats look taken but nobody buys them. Detect: count of expired-but-held seats rising; job heartbeat alert. Recover: restart the job; it releases all seats past heldUntil.'],
  ['a bad deploy doubles seat prices?','User: wrong prices. Detect: business metric alert (average order value jumps). Recover: roll back; refund affected orders.']]},
 {t:'rubric',title:'Score your mock',rows:[['Clarify','Asked about users, scale, the never-happen rule; wrote scope'],['Interactions','Listed main calls with inputs and outputs'],['Data','Named entities, main read, riskiest write'],['Simple design','Started minimal; traced a request end to end'],['Challenge & improve','Found own weak spots; every fix had a cost'],['Changing requirements','Adapted the design and explained the change'],['Communication','Thought aloud, checked in, plain reasons']]},
 {t:'checklist',title:'Before your next mock',items:['My 8-question card is ready','I can pace the 5 steps across 45 minutes','I can estimate requests per second and storage in under 2 minutes','I can explain the seat race and the conditional update','I will say "let me start simple" before drawing','I name a technology only after naming the problem it solves']}]}
],
labs:{
 timeline(el,api){
  const P=[[0,7,'Clarify','var(--accent)','Ask about users, must-haves, scale, the quality that matters most, and the never-happen rule. Write the scope on the board.','"Before I design, who are the users and what must never go wrong?"','Still asking questions at minute 12.'],
   [7,12,'Interactions','var(--good)','Write 3–6 API calls with inputs and outputs.','"Let me write the main actions as API calls."','Skipping APIs and drawing boxes with no purpose.'],
   [12,18,'Data','var(--warn)','Entities, key fields, the most frequent read, the riskiest write, a rough size.','"The hot read is code → URL, so the code is the key."','"We\'ll store it in a database" with nothing more.'],
   [18,28,'Simple design','var(--lld)','Smallest working design, then trace one request end to end.','"This works on day one. Let me trace a request."','Drawing 12 boxes, or never tracing a request.'],
   [28,42,'Challenge','var(--marker)','Break your own design: failures, 10x traffic, new requirements, races. Each fix with its cost.','"If the database dies, everything fails. Fix: a replica. Cost: failover delay."','Waiting for the interviewer, or fixes with no cost.'],
   [42,45,'Wrap up','var(--muted)','Summarise: what you would build first, the top risk, what you would do with more time.','"I\'d ship the simple version first; my biggest worry is…"','Running out of time mid-sentence.']];
  el.innerHTML=`<div class="svgbox"><svg viewBox="0 0 760 120" data-svg role="img" aria-label="45-minute interview timeline"></svg></div><label>Interview clock: minute <b class="mono" data-mv>20</b><input type="range" min="0" max="45" value="20" data-m></label><div class="think" data-d></div>`;
  let sel=3;
  const draw=()=>{const m=+api.$('[data-m]',el).value;api.$('[data-mv]',el).textContent=m;const X=t=>20+t/45*720;const cur=P.findIndex(p=>m>=p[0]&&m<p[1]);const now=cur<0?P.length-1:cur;
   let s='';P.forEach((p,i)=>{s+=`<g data-i="${i}" style="cursor:pointer"><rect x="${X(p[0])+1}" y="30" width="${X(p[1])-X(p[0])-2}" height="44" rx="6" fill="${p[3]}" opacity="${i===sel?1:i===now?.75:.35}"/><text x="${(X(p[0])+X(p[1]))/2}" y="57" text-anchor="middle" font-size="${p[1]-p[0]<5?10:12.5}" font-weight="600" fill="${i===sel||i===now?'#fff':'var(--ink)'}">${p[2]}</text></g>`;s+=`<text x="${X(p[0])}" y="92" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="var(--f-mono)">${p[0]}</text>`});
   s+=`<text x="${X(45)}" y="92" text-anchor="end" font-size="11" fill="var(--muted)" font-family="var(--f-mono)">45 min</text><line x1="${X(m)}" x2="${X(m)}" y1="18" y2="82" stroke="var(--ink)" stroke-width="2.5"/><text x="${X(m)}" y="13" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="var(--f-mono)">now</text>`;
   api.$('[data-svg]',el).innerHTML=s;const p=P[sel];
   api.$('[data-d]',el).innerHTML=`<p><b>${p[2]}</b> · minutes ${p[0]}–${p[1]} <span class="muted">(${p[1]-p[0]} min)</span></p><p>${p[4]}</p><p class="say">${p[5]}</p><p><span class="tag red">Red flag</span> ${p[6]}</p><p class="small"><span class="tag">At minute ${m}</span> you should be in <b>${P[now][2]}</b>.</p>`};
  el.addEventListener('click',e=>{const g=e.target.closest('[data-i]');if(g){sel=+g.dataset.i;draw()}});
  el.addEventListener('input',()=>{const m=+api.$('[data-m]',el).value;const c=P.findIndex(p=>m>=p[0]&&m<p[1]);sel=c<0?P.length-1:c;draw()});draw()},

 estdrill(el,api){
  const kinds=[
   {make:r=>{const u=r([1,2,5,10,20,50,100,200,500]),a=r([1,2,5,10,20,50]);return {q:`${u} M daily users each do ${a} action${a>1?'s':''} a day. <b>Requests per second, on average?</b>`,ans:u*1e6*a/86400,unit:'/s',work:`${u} M × ${a} = ${(u*a).toLocaleString()} M a day ÷ 86,400 s ≈ ${Math.round(u*1e6*a/86400).toLocaleString()} per second.`}}},
   {make:r=>{const n=r([1,2,5,10,50,100]),s=r([['1 KB',1e3],['10 KB',1e4],['100 KB',1e5],['500 KB',5e5],['2 MB',2e6]]);return {q:`${n} M new items a day, ${s[0]} each. <b>Storage per year, in TB?</b>`,ans:n*1e6*s[1]*365/1e12,unit:' TB',work:`${n} M × ${s[0]} × 365 ≈ ${(n*1e6*s[1]*365/1e12).toLocaleString(undefined,{maximumFractionDigits:1})} TB a year.`}}},
   {make:r=>{const q=r([100,500,1000,2000,10000]),s=r([['50 KB',5e4],['200 KB',2e5],['1 MB',1e6]]);return {q:`${q.toLocaleString()} image views per second, ${s[0]} each. <b>Outgoing bandwidth, in GB/s?</b>`,ans:q*s[1]/1e9,unit:' GB/s',work:`${q.toLocaleString()} × ${s[0]} = ${(q*s[1]/1e9).toLocaleString(undefined,{maximumFractionDigits:2})} GB/s. Anything near 1 GB/s or more belongs on a CDN.`}}},
   {make:r=>{const n=r([10,50,100,500]),s=r([['1 KB',1e3],['5 KB',5e3]]);return {q:`${n} M items, ${s[0]} each; 20% of them are hot. <b>Cache memory for the hot set, in GB?</b>`,ans:n*1e6*0.2*s[1]/1e9,unit:' GB',work:`20% × ${n} M × ${s[0]} = ${(n*1e6*0.2*s[1]/1e9).toLocaleString(undefined,{maximumFractionDigits:1})} GB.`}}}];
  let cur=null,streak=0,best=api.get('best',0);
  el.innerHTML=`<div class="think" data-q></div><div class="row"><label style="flex-direction:row;align-items:center;gap:8px">Your estimate <input type="number" step="any" data-a style="width:160px" aria-label="Your estimate"></label><span class="mono" data-u></span><button class="btn primary" data-c>Check</button><button class="btn" data-n>New scenario</button><span class="muted small">Streak: <b data-s>0</b> · best <b data-b>${best}</b></span></div><div class="verdict" data-r hidden></div>`;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const next=()=>{cur=pick(kinds).make(pick);api.$('[data-q]',el).innerHTML=cur.q;api.$('[data-u]',el).textContent=cur.unit;api.$('[data-a]',el).value='';api.$('[data-r]',el).hidden=true};
  const check=()=>{const v=parseFloat(api.$('[data-a]',el).value);if(!(v>0))return;const ratio=v/cur.ans,ok=ratio>=0.5&&ratio<=2;streak=ok?streak+1:0;if(streak>best){best=streak;api.set('best',best)}
   api.$('[data-s]',el).textContent=streak;api.$('[data-b]',el).textContent=best;const r=api.$('[data-r]',el);r.hidden=false;
   r.innerHTML=`${ok?'<span class="tag green">Within 2x</span>':'<span class="tag red">'+(ratio>1?'Too high':'Too low')+` by about ${Math.round(ratio>1?ratio:1/ratio)}x</span>`} ${cur.work}`};
  el.addEventListener('click',e=>{if(e.target.closest('[data-c]'))check();if(e.target.closest('[data-n]'))next()});
  api.$('[data-a]',el).addEventListener('keydown',e=>{if(e.key==='Enter')check()});next()}
}});
