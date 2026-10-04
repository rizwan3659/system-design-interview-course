COURSE.add({id:'s01',n:1,part:'A',track:'HLD',
title:'The design interview, requirements and estimation',
goal:'Learn the 5-step loop, ask the questions that shape a design, and estimate scale in under two minutes.',
outcomes:['Run the 5-step loop on any prompt','Separate functional and non-functional requirements','Turn user numbers into requests per second and storage','Explain why a small system should stay simple'],
modules:[
{title:'How the system design round works',tab:'The round',mins:15,out:'Know what is graded',lead:'The interviewer gives a vague problem and changes it while you work. They grade how you break it down and reason about trade-offs, not whether you name the "right" architecture.',blocks:[
 {t:'cards',title:'The 5-step loop',intro:'Click each step. You will use this loop in every design for the next 40 hours.',items:[
  {tag:'Step 1 · 5–8 min',title:'Clarify the problem',sub:'Who, what, how much, what must never break?',body:'<p>Find the users, 2–3 must-have actions, the scale, and the one quality that matters most. Write the agreed scope on the board before drawing.</p><p class="say">"Before I design, can I check who the users are and what success looks like?"</p><p><span class="tag red">Common mistake</span> Jumping straight to boxes, or asking 15 questions and never designing.</p>'},
  {tag:'Step 2 · ~5 min',title:'Define interactions',sub:'What can users and systems do?',body:'<p>Turn use cases into API calls with inputs and outputs. This is the contract; everything else serves it.</p><p class="say">"Let me write the main actions as API calls."</p><p><span class="tag red">Common mistake</span> Skipping it, so the design has no clear purpose.</p>'},
  {tag:'Step 3 · 5–7 min',title:'Identify the data',sub:'What is stored, how is it read?',body:'<p>List entities and key fields. Name the most frequent read and the riskiest write: those decide storage, keys and indexes.</p><p class="say">"The most common read is X, so the key is Y."</p><p><span class="tag red">Common mistake</span> Saying "a database" without saying what is in it.</p>'},
  {tag:'Step 4 · ~10 min',title:'Draw a simple design',sub:'Smallest set of parts that works',body:'<p>Client → service → storage, plus only what a requirement asks for. Trace one request end to end out loud.</p><p class="say">"This works for day one. Let me trace a request through it."</p><p><span class="tag red">Common mistake</span> Starting with every component you know.</p>'},
  {tag:'Step 5 · 10–15 min',title:'Challenge and improve',sub:'What breaks first, and what does the fix cost?',body:'<p>Ask: what if a part dies, traffic grows 100x, a rule changes, two users act at once? Fix the biggest risk first and name the cost.</p><p class="say">"If traffic grows 100x this breaks first, because… The fix costs…"</p><p><span class="tag red">Common mistake</span> Waiting for the interviewer to find the problems.</p>'}]},
 {t:'table',title:'What scores well vs. what does not',head:['Scores well','Scores poorly'],rows:[
  ['Asks who the users are before drawing','Draws 12 boxes in the first minute'],
  ['"A queue here, because emails can be sent later"','"We\'ll use Kafka" with no reason'],
  ['Starts with one server and one database','Starts with microservices and sharding'],
  ['Says what each choice costs','Presents choices as free'],
  ['Adapts when a requirement changes','Starts over, or argues with the change'],
  ['Thinks aloud and checks in','Works in silence']]},
 {t:'teacher',items:['Open with: "Design YouTube. Go." Wait 20 seconds. Ask who started drawing and who started asking. Use the answers to introduce step 1.','Stress the course motto: <b>start simple, make it correct, then make it scale</b>.','Start the class clock in the header now. The active module tab is underlined while its time runs.']}]},

{title:'Clarifying requirements',tab:'Requirements',mins:25,out:'Your 8-question card',lead:'Requirements come in two kinds. Functional ones say what the system does. Non-functional ones say how well it must do it, and they drive most design decisions.',blocks:[
 {t:'grid',cols:2,title:'Two kinds of requirement',items:[
  {tag:'Functional',title:'What the system does',body:'<ul class="clean"><li>Users can post a photo</li><li>Users can follow other users</li><li>Users see a feed of people they follow</li></ul><p class="muted">These become your API calls.</p>'},
  {tag:'Non-functional',tc:'amber',title:'How well it must do it',body:'<ul class="clean"><li><b>Scale:</b> 10 M daily users</li><li><b>Latency:</b> feed loads in under 500 ms</li><li><b>Availability:</b> 99.9% uptime</li><li><b>Consistency:</b> a new post can take a few seconds to appear</li><li><b>Durability:</b> photos are never lost</li></ul><p class="muted">These decide caching, replication and storage.</p>'}]},
 {t:'sort',title:'Exercise · Ask it or skip it?',intro:'Prompt: <b>"Design a chat app."</b> Would a strong candidate ask this in the first five minutes?',items:[
  {q:'"Is it one-to-one chat, group chat, or both?"',a:0,why:'Scopes the core features. Group chat changes fan-out and storage.'},
  {q:'"Should I use Kafka or RabbitMQ?"',a:1,why:'A tool before the problem is known. Choose tools later, for a stated reason.'},
  {q:'"How many daily users, and how many messages each?"',a:0,why:'Scale decides one server vs many.'},
  {q:'"Do messages need to be kept forever?"',a:0,why:'Data lifetime sets storage size and deletion jobs.'},
  {q:'"What colour should the send button be?"',a:1,why:'A UI detail that does not change the system.'},
  {q:'"Must messages arrive in order within a conversation?"',a:0,why:'An ordering requirement that shapes the whole message path.'},
  {q:'"Can I build it as microservices?"',a:1,why:'An architecture choice, not a requirement. Decide it later.'},
  {q:'"Do users need to see who is online?"',a:0,why:'Presence is expensive; ask whether it is in scope.'}]},
 {t:'table',title:'The clarifying-question bank',head:['Area','Questions','Why it changes the design'],rows:[
  ['Users','Who uses it? Public, internal, other services? Web, mobile?','API style, auth, traffic shape'],
  ['Core actions','What are the 2–3 must-haves? What is out of scope?','Keeps the design finishable'],
  ['Scale','Users per day? Actions per user? Reads vs writes?','One machine vs many; where to cache'],
  ['Quality','Fast, always up, or always correct: which matters most?','Consistency and redundancy'],
  ['Never-happen rule','What must never go wrong (double booking, lost money)?','Marks the part needing strong guarantees'],
  ['Data lifetime','Does data expire? History or audit needed?','Storage size, deletion jobs'],
  ['Constraints','Existing systems, team size, deadline, budget?','Rules out options early']]},
 {t:'reveal',title:'Practise · Write 5 questions in 2 minutes each',intro:'Do it on paper first, then reveal a sample.',items:[
  {q:'<b>Design a parking-lot system.</b>',a:'How many floors and spots? Vehicle types (bike, car, truck)? Pay on entry or exit, and how? Do we show free spots in real time? One lot or a chain of lots? What must never happen: two cars assigned the same spot.'},
  {q:'<b>Design library book reservations.</b>',a:'How many branches, books, members? Can a member reserve a book that is out? How long is a hold kept? Waiting list order: first come first served? Notifications by email or app? Never-happen rule: one copy lent to two people.'},
  {q:'<b>Design food-delivery tracking.</b>',a:'Who sees what: customer, restaurant, rider? How often does the rider location update? How many active orders at peak? Must the map be real time or is 10 s fine? Which cities? Never-happen rule: an order assigned to two riders.'}]},
 {t:'notes',title:'Your 8-question card',label:'Write the 8 questions you will ask on every prompt',placeholder:'1. Who are the users?\n2. ...',rows:8},
 {t:'teacher',items:['Run the sort exercise as a show of hands before clicking each card. The best discussion comes from "Kafka" and "microservices": they sound smart but decide the solution before the problem.','Ask: "Which single question changes the design the most?" Usually the never-happen rule or scale.','Cap clarifying at ~8 minutes in the interview. Then write the agreed scope on the board.']}]},

{title:'Back-of-envelope estimation',tab:'Estimation',mins:25,out:'Three estimates done aloud',lead:'Estimates answer one question: does this fit on one machine? You need rough numbers, not exact ones.',blocks:[
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
 {t:'lab',fn:'estimator',title:'Lab · Estimator',intro:'Change the numbers and read the verdict. Try 2,000 users: the verdict flips to "one server is enough".'},
 {t:'reveal',title:'Quick estimates (answer aloud, then reveal)',items:[
  {q:'10 M users each send 20 messages a day. Messages per second?',a:'200 M / 86,400 ≈ <b>2,300/s</b> average, about <b>7,000/s</b> at 3x peak. More than one database comfortably writes: plan to split data.'},
  {q:'A photo is 2 MB; 1 M uploads a day. Storage per year?',a:'2 TB a day × 365 ≈ <b>730 TB</b> a year. Files go to object storage; only metadata goes in the database.'},
  {q:'2,000 students check grades twice a day. Requests per second?',a:'4,000 / 86,400 ≈ <b>0.05/s</b>. Tiny. One server, one database. Saying so shows judgement.'},
  {q:'A video site serves 5 M views a day at 5 Mbit/s for 4 minutes each. Peak bandwidth?',a:'Average concurrent viewers ≈ 5 M × 240 s / 86,400 ≈ 14,000. × 5 Mbit/s ≈ 70 Gbit/s average, ~200 Gbit/s peak. That is why video goes through a CDN.'}]},
 {t:'teacher',items:['Do the first estimate on the board slowly: write the formula, round aggressively, state the result in words ("about two thousand a second").','Common mistake: spending 10 minutes on maths. Estimates should take 2 minutes and end with a decision.']}]},

{title:'Guided problem: a college attendance app',tab:'Guided problem',mins:30,out:'One full loop on a small system',lead:'Prompt: <b>"Design an app where teachers take attendance and students see their attendance."</b> A small system on purpose: the skill is not over-building it.',blocks:[
 {t:'stepper',steps:[
  {title:'Clarify',short:'Clarify',secs:180,think:'Ask 5 questions. What scale do you assume? What must never go wrong?',answer:'<ul class="clean"><li>Users: 200 teachers, 8,000 students, one college.</li><li>Must-haves: teacher marks a class present/absent; student sees percentage per subject; admin exports reports.</li><li>Scale: 300 classes a day × 40 students ≈ 12,000 marks a day; reads spike before exams.</li><li>Never-happen rule: a mark saved for the wrong student or lost after the teacher sees "saved".</li><li>Works on weak campus Wi-Fi.</li></ul>'},
  {title:'Interactions',short:'APIs',secs:150,think:'Write 4 API calls.',answer:'<ul class="clean"><li><code>GET /classes/today</code> (teacher) → list of sessions</li><li><code>PUT /sessions/{id}/attendance {studentId: present|absent, ...}</code> → saved count</li><li><code>GET /students/me/attendance</code> → per-subject percentages</li><li><code>GET /reports?course=&month=</code> (admin) → CSV</li></ul><p>Using <code>PUT</code> for the whole class makes a retry safe: sending it twice gives the same result.</p>'},
  {title:'Data',short:'Data',secs:180,think:'Which tables? What is the most frequent read?',answer:'<p><b>Student</b>(id, name, program) · <b>Course</b>(id, name) · <b>Session</b>(id, courseId, date, teacherId) · <b>Attendance</b>(sessionId, studentId, status) with primary key (sessionId, studentId).</p><p>Most frequent read: a student\'s percentage per course. 12,000 rows a day × 200 days ≈ 2.4 M rows a year: small. An index on (studentId) answers it fast.</p>'},
  {title:'Simple design',short:'Design',secs:240,think:'Draw it. How many servers? Which database?',answer:'<p>One web app + one relational database (with daily backups) is enough: peak is a few requests per second. Add a second app server only for availability during exams.</p><p>Weak Wi-Fi: the teacher app keeps marks locally and retries the <code>PUT</code> until it succeeds.</p><p class="say">"The scale is small, so I\'m deliberately keeping this to one service and one database."</p>'},
  {title:'Challenge',short:'Challenge',secs:240,think:'Answer: (a) 30 colleges join; (b) exam week, everyone checks at once; (c) two teachers edit the same session.',answer:'<ul class="clean"><li><b>30 colleges:</b> add collegeId to every table; still one database (~70 M rows/year is fine with indexes).</li><li><b>Exam week:</b> cache each student\'s percentages, recomputed when a session is saved.</li><li><b>Two editors:</b> last write wins is risky; store an updatedAt version and reject an edit based on an old version.</li></ul>'}]},
 {t:'teacher',items:['Many students will propose Kafka, Redis and microservices here. Ask them to justify each with a number from step 1. Most cannot: that is the lesson.']}]},

{title:'Your project story and review',tab:'Review',mins:25,out:'2-minute story + exit quiz',lead:'Interviewers often ask about something you built. Prepare the story once and reuse it in every round.',blocks:[
 {t:'lab',fn:'story',title:'Build your 2-minute project story',intro:'Fill it in for your strongest project. Small scale is fine; the reasons are what count.'},
 {t:'flash',title:'Flashcards',items:[['Functional vs non-functional?','Functional: what it does (post a photo). Non-functional: how well (latency, scale, availability, consistency, durability).'],['Why estimate?','To decide if one machine is enough and where the pressure is (reads, writes, storage, bandwidth).'],['1 M requests/day ≈ ?','About 12 per second on average.'],['What is the never-happen rule?','The one failure the business cannot accept, e.g. double booking. It marks where you need strong guarantees.'],['When to stop clarifying?','After ~8 minutes, or once users, core actions, scale and the never-happen rule are agreed.'],['First sentence before drawing?','"Let me start simple and then scale it."']]},
 {t:'mcq',title:'Exit quiz',items:[
  {q:'You estimate 0.5 requests per second. What do you propose?',opts:['A sharded cluster','One server and one database','A CDN and three regions'],a:1,why:'Match the design to the load. Over-building scores poorly.'},
  {q:'Which is a non-functional requirement?',opts:['Users can upload videos','Videos start playing within 2 seconds','Users can comment'],a:1,why:'It describes how well, not what.'},
  {q:'Peak traffic is usually planned as…',opts:['Equal to average','2–5x average','100x average'],a:1,why:'A common rule of thumb; check with the interviewer.'}]},
 {t:'task',title:'Homework',items:['Write clarifying questions and an estimate for "Design Instagram" (10 minutes).','Practise your project story out loud twice.']},
 {t:'teacher',items:['Ask 2 volunteers to tell their story. Ask one follow-up each: "What breaks first at 10x users?"']}]}
]});
