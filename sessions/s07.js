COURSE.add({id:'s07',n:7,part:'A',track:'HLD',
title:'Async processing: queues, streams and events',
goal:'Move slow or spiky work out of the request path, and make it reliable when messages are lost, delayed or duplicated.',
outcomes:['Decide what should be synchronous and what asynchronous','Compare a job queue, pub/sub and a log (Kafka-style)','Use retries, backoff, dead-letter queues and idempotent consumers','Design a notification system'],
modules:[
{title:'Warm-up: recall session 6',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'N=3, W=2, R=2. Reads see the latest write?',opts:['Yes','No'],a:0},
  {q:'Order → payment → shipping across services. Coordinate with…',opts:['A saga','A bigger database'],a:0},
  {q:'"Exactly once" in practice means…',opts:['The network never duplicates','At-least-once + idempotent processing'],a:1}]}]},

{title:'Sync vs async; queue, pub/sub, log',tab:'Messaging',mins:25,out:'Choose a messaging type',lead:'If the user does not need the result to continue, do the work later. A message broker sits between the producer and the workers.',blocks:[
 {t:'grid',cols:2,title:'What async buys you',items:[
  {tag:'Faster responses',title:'Return before the slow part',body:'Sign-up returns in 80 ms; the welcome email, thumbnail and analytics happen afterwards.'},
  {tag:'Absorb spikes',title:'The queue is a buffer',body:'10,000 orders in a minute queue up; workers drain them at their own pace instead of crashing.'},
  {tag:'Decoupling',title:'Producers do not know consumers',body:'Add a new consumer (fraud check) without changing the order service.'},
  {tag:'Cost',tc:'red',title:'What you pay',body:'Delay, harder debugging, duplicate and out-of-order messages, and one more system to run.'}]},
 {t:'table',title:'Three messaging shapes',head:['Shape','Delivery','After reading','Example'],rows:[
  ['Job / work queue','Each message to one worker','Deleted','Resize this image; send this email (SQS, RabbitMQ)'],
  ['Pub/sub','Each message to every subscriber','Gone after delivery','"Order placed" → email, analytics, inventory each get a copy'],
  ['Log / stream','Consumers read at their own offset','Kept for days; can replay','Kafka: clickstream, change events, rebuilding a search index']]},
 {t:'mcq',title:'Which shape?',items:[
  {q:'Transcode each uploaded video exactly by one of 50 workers.',opts:['Job queue','Pub/sub','Nothing: do it in the request'],a:0},
  {q:'"Payment succeeded" must reach the email, ledger and analytics services.',opts:['Job queue','Pub/sub or a log topic'],a:1},
  {q:'A new team wants to reprocess the last 7 days of click events.',opts:['Job queue','Log with retention (Kafka-style)'],a:1},
  {q:'Show the price after the user clicks "Buy".',opts:['Async','Sync: the user needs it now'],a:1}]}]},

{title:'Reliable delivery',tab:'Reliability',mins:20,out:'Retry policy for a consumer',blocks:[
 {t:'cards',items:[
  {tag:'At-most-once',title:'Fire and forget',body:'<p>Acknowledge before processing. Fast, but a crash loses the message. OK for metrics sampling.</p>'},
  {tag:'At-least-once',title:'Default choice',body:'<p>Acknowledge after processing. A crash causes a redelivery, so <b>consumers must be idempotent</b> (store processed message IDs, or use upserts).</p>'},
  {tag:'Retries + backoff',title:'Wait longer each time',body:'<p>Retry after 1 s, 2 s, 4 s, 8 s… with random jitter so thousands of clients do not retry in lockstep. Cap the attempts.</p>'},
  {tag:'Dead-letter queue',title:'Park poison messages',body:'<p>After N failures, move the message to a DLQ for inspection, so one bad message does not block the queue forever.</p>'},
  {tag:'Ordering',title:'Only where needed',body:'<p>Global order is slow. Order per key instead: Kafka keeps order within a partition, so partition by orderId.</p>'}]},
 {t:'code',title:'An idempotent consumer',code:`
def handle(message):
    if processed.exists(message.id):          # seen before: a redelivery
        return ack(message)
    with db.transaction():
        apply_business_change(message.body)  # e.g. add points to a wallet
        processed.insert(message.id)          # same transaction as the change
    ack(message)`,note:'Storing the message ID in the same transaction as the change is what makes it safe.'},
 {t:'grid',title:'Two patterns to name in interviews',items:[
  {title:'Transactional outbox',body:'The service writes the order <b>and</b> an "order placed" row in its own DB in one transaction; a relay publishes outbox rows to the broker. No more "saved but event lost".'},
  {title:'CQRS / event sourcing (light)',body:'Write side stores events; read side builds views (search index, dashboards) from them. Powerful for audit and replay; costs complexity and eventual consistency.'}]}]},

{title:'Lab: will the queue keep up?',tab:'Lab',mins:25,out:'Size workers for a load',lead:'A queue only helps if workers drain it faster than it fills on average. Simulate two minutes of traffic.',blocks:[
 {t:'lab',fn:'queue'},
 {t:'teacher',items:['Show Little\'s law informally: workers needed ≈ arrival rate × processing time. 200 msg/s × 0.05 s = 10 workers at full use; add headroom.','Turn on the burst: a backlog forms then drains. Ask: "Is a 40-second delay OK for emails? For OTP codes?"']}]},

{title:'Guided problem: a notification system',tab:'Guided problem',mins:30,out:'Notification design + failure answers',lead:'Prompt: <b>"Design a service that sends email, SMS and push notifications for other teams."</b>',blocks:[
 {t:'stepper',steps:[
  {title:'Clarify',short:'Clarify',secs:150,think:'Volumes? Priorities? User preferences?',answer:'<ul class="clean"><li>50 M notifications/day, bursts 10x during campaigns.</li><li>Channels: email, SMS, push. Priorities: OTP/security (seconds) vs marketing (minutes–hours).</li><li>Respect user opt-outs and quiet hours; no duplicates; track delivered/failed.</li></ul>'},
  {title:'API and data',short:'API',secs:150,think:'What does a calling team send?',answer:'<p><code>POST /v1/notifications {userId, template, params, channels?, priority, idempotencyKey}</code> → 202 Accepted + id.</p><p>Data: <b>Preference</b>(userId, channel, optedIn, quietHours), <b>Template</b>, <b>Notification</b>(id, userId, channel, status, attempts).</p>'},
  {title:'Design and break it',short:'Design',secs:300,think:'Draw it, then use the lab.',blocks:[{t:'arch',title:'Notification system lab',w:760,h:340,
   nodes:[{id:'api',x:20,y:130,w:120,label:'Notify API',sub:'validate, dedupe'},{id:'pref',x:20,y:240,w:120,label:'Preferences',sub:'opt-outs'},{id:'q',x:190,y:130,w:120,label:'Queues',sub:'per channel + priority',opt:'q'},{id:'we',x:370,y:40,w:130,label:'Email workers'},{id:'ws',x:370,y:130,w:130,label:'SMS workers'},{id:'wp',x:370,y:220,w:130,label:'Push workers'},{id:'pe',x:560,y:40,w:170,label:'Email provider',sub:'external'},{id:'ps',x:560,y:130,w:170,label:'SMS provider',sub:'external'},{id:'pp',x:560,y:220,w:170,label:'APNs / FCM',sub:'external'},{id:'dlq',x:370,y:292,w:130,h:40,label:'Dead letters',opt:'dlq'}],
   edges:[{d:'M140 158H190'},{d:'M80 186V240',dash:true,arrow:false,label:'check',lx:86,ly:218},{d:'M310 150H340V68H370',opt:'q'},{d:'M310 158H370',opt:'q'},{d:'M310 166H340V248H370',opt:'q'},{d:'M500 68H560'},{d:'M500 158H560'},{d:'M500 248H560'},{d:'M435 276V292',opt:'dlq'},{d:'M140 145H165V68H370',opt:'!q',label:'direct calls',lx:175,ly:60}],
   toggles:[{id:'q',label:'Queues between API and workers'},{id:'dlq',label:'Retries + dead-letter queue'}],
   fails:[
    {label:'Campaign burst: 10x traffic',run:o=>o.q?{lvl:'ok',oks:['q'],txt:'The queues absorb the burst. Marketing waits a few minutes; OTPs stay fast because they have their own high-priority queue.'}:{lvl:'bad',hits:['api','we'],txt:'Without queues, the API calls workers directly and times out under 10x load. Calling teams see errors and retry, making it worse.'}},
    {label:'SMS provider is down for 10 minutes',run:o=>o.q&&o.dlq?{lvl:'warn',hits:['ps'],oks:['dlq'],txt:'SMS workers retry with backoff; messages wait in the queue. After the limit they go to the dead-letter queue to replay later. Option: fail over to a second SMS provider for OTPs.'}:o.q?{lvl:'warn',hits:['ps','ws'],txt:'Messages pile up and workers keep retrying fast, hammering the provider. Add backoff and a dead-letter queue.'}:{lvl:'bad',hits:['ps','api'],txt:'Every request that includes SMS fails immediately; messages are lost.'}},
    {label:'A worker crashes after sending, before ack',run:o=>({lvl:'warn',hits:['we'],txt:'The message is redelivered and the user may get the email twice. Fix: store the notification id as "sent" before acking and check it first (idempotent consumer); providers often accept an idempotency key too.'})},
    {label:'User opted out of marketing',run:o=>({lvl:'ok',oks:['pref'],txt:'The API checks preferences before queueing (and workers re-check before sending, in case the user opted out while it was queued).'})}],
   start:'Start without queues (direct calls), then add queues and the dead-letter queue, and break things.'}]},
  {title:'Challenge',short:'Challenge',secs:180,think:'How do you stop one noisy team flooding everyone\'s notifications?',answer:'Per-caller rate limits at the API, separate queues per priority, and per-user limits ("max 3 marketing pushes a day"). Cost: some campaign messages are delayed or dropped by policy.'}]}]},

{title:'Review',tab:'Review',mins:10,out:'Flashcards + homework',blocks:[
 {t:'flash',items:[['Queue vs pub/sub?','Queue: one worker per message. Pub/sub: every subscriber gets a copy.'],['Why a log (Kafka)?','Retention and replay; ordered per partition; many independent consumers.'],['Dead-letter queue?','Where messages go after N failed attempts.'],['Outbox pattern?','Write the change and the event in one DB transaction; publish from the outbox.'],['Backoff with jitter?','Growing waits plus randomness so retries do not stampede.'],['Workers needed?','≈ arrival rate × processing time, plus headroom.']]},
 {t:'task',title:'Homework',items:['Design the async parts of a video upload pipeline: upload → transcode (4 resolutions) → thumbnail → notify followers.']}]}
],
labs:{
 queue(el,api){
  el.innerHTML=`<div class="form"><label>Messages arriving per second: <b data-av></b><input type="range" min="10" max="500" step="10" value="200" data-a></label><label>Workers: <b data-wv></b><input type="range" min="1" max="40" value="8" data-w></label><label>Time per message (ms): <b data-tv></b><input type="range" min="10" max="200" step="5" value="50" data-t></label><label class="check" style="flex-direction:row;align-items:center"><input type="checkbox" data-b checked> 20-second burst at 5x traffic</label></div><div class="svgbox"><svg viewBox="0 0 640 200" data-svg role="img" aria-label="Queue backlog over time"></svg></div><div class="out"><div><b data-cap></b><span>worker capacity (msg/s)</span></div><div><b data-max></b><span>largest backlog</span></div><div><b data-wait></b><span>worst wait in queue</span></div><div><b data-end></b><span>backlog after 2 minutes</span></div></div><div class="verdict" data-v></div>`;
  const draw=()=>{const a=+api.$('[data-a]',el).value,w=+api.$('[data-w]',el).value,t=+api.$('[data-t]',el).value,burst=api.$('[data-b]',el).checked;
   api.$('[data-av]',el).textContent=a;api.$('[data-wv]',el).textContent=w;api.$('[data-tv]',el).textContent=t;
   const cap=w*1000/t;let q=0;const pts=[];let mx=0;for(let s=0;s<120;s++){const inR=burst&&s>=30&&s<50?a*5:a;q=Math.max(0,q+inR-cap);pts.push(q);if(q>mx)mx=q}
   const top=Math.max(mx,10),X=i=>40+i*(580/119),Y=v=>180-v/top*160;
   api.$('[data-svg]',el).innerHTML=`<line x1="40" y1="180" x2="620" y2="180" stroke="var(--line)"/><line x1="40" y1="20" x2="40" y2="180" stroke="var(--line)"/>${burst?`<rect x="${X(30)}" y="20" width="${X(50)-X(30)}" height="160" fill="var(--warn-soft)"/><text x="${X(40)}" y="34" text-anchor="middle" font-size="11" fill="var(--warn)">burst</text>`:''}<path d="M${pts.map((v,i)=>X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('L')}" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="44" y="16" font-size="11" fill="var(--muted)">backlog: ${Math.round(top).toLocaleString()} msgs</text><text x="620" y="196" text-anchor="end" font-size="11" fill="var(--muted)">120 s</text><text x="40" y="196" font-size="11" fill="var(--muted)">0 s</text>`;
   api.$('[data-cap]',el).textContent=Math.round(cap).toLocaleString();api.$('[data-max]',el).textContent=Math.round(mx).toLocaleString();api.$('[data-wait]',el).textContent=(mx/cap).toFixed(1)+' s';api.$('[data-end]',el).textContent=Math.round(pts[119]).toLocaleString();
   api.$('[data-v]',el).innerHTML=cap<a?`<b>Workers are too slow.</b> They handle ${Math.round(cap)} msg/s but ${a} arrive: the backlog grows forever. You need at least ${Math.ceil(a*t/1000)} workers.`:pts[119]>0?'<b>Still draining.</b> Capacity is above the average, but the burst left a backlog. Add workers or accept the delay.':`<b>Keeps up.</b> ${mx>0?'The burst caused a temporary backlog that drained.':'No backlog.'} Utilisation ≈ ${Math.round(a/cap*100)}% outside the burst.`};
  el.addEventListener('input',draw);draw()}
}});
