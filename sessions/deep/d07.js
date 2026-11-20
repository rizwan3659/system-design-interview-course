COURSE.addDeep('s07',{title:'Deep dive: queues, streams and events, beginner to expert',lead:'From "do the slow work later" to delivery guarantees, idempotent consumers, the outbox pattern, Kafka partitions and backpressure.',blocks:[
{t:'text',level:'f',title:'Beginner · Synchronous vs asynchronous',html:`
<p><b>Synchronous:</b> the user waits until all work is finished. Uploading a video and waiting 5 minutes for it to be converted would be terrible.</p>
<p><b>Asynchronous:</b> the server saves the job, replies "received" in milliseconds, and workers do the slow part later. Like a restaurant: the waiter takes your order to the kitchen and leaves; cooks work through the order tickets.</p>
<p>A <b>message queue</b> is that pile of order tickets. <b>Producers</b> put messages in; <b>consumers</b> (workers) take them out and process them.</p>
<p>What you gain: fast responses, a <b>buffer</b> for traffic spikes (the queue grows, workers catch up), and services that do not need to know about each other. What you pay: more parts to run, results are not immediate, and messages can be delayed, duplicated or out of order.</p>`},
{t:'table',level:'i',title:'Intermediate · Three messaging shapes',head:['Shape','How it works','Example','Tools'],rows:[
['Work queue','Each message goes to exactly one of many workers','Transcode each video once across 50 workers','SQS, RabbitMQ, Celery'],
['Pub/sub','Each message goes to every subscriber','"Payment succeeded" → email, ledger, analytics','SNS, Google Pub/Sub, RabbitMQ fanout'],
['Log / stream','Messages are kept in an ordered, replayable log; each consumer group tracks its own position (offset)','Reprocess the last 7 days of click events; event sourcing','Kafka, Kinesis, Pulsar, Redis Streams'],
]},
{t:'text',level:'i',title:'Intermediate · Delivery guarantees',html:`
<ul>
<li><b>At-most-once:</b> send and forget. Fast; messages may be lost. OK for metrics samples.</li>
<li><b>At-least-once:</b> the consumer acknowledges after processing; if it crashes before the ack, the message is redelivered. No loss, but <b>duplicates</b>. This is the default you should design for.</li>
<li><b>Exactly-once:</b> in practice "effectively once" = at-least-once + idempotent processing (Kafka transactions give it within Kafka only).</li>
</ul>
<p><b>Retries with exponential backoff + jitter:</b> wait 1 s, 2 s, 4 s… plus randomness so all failed messages do not retry at the same instant.</p>
<p><b>Dead-letter queue (DLQ):</b> after N failures, park the "poison" message in a separate queue for a human or a fix, so it does not block everything behind it. Alert on DLQ size.</p>`},
{t:'code',level:'i',title:'An idempotent consumer',lang:'python',code:`
def handle(msg):
    with db.transaction():
        # unique constraint on message_id makes a duplicate insert fail
        if not db.insert_if_absent("processed_messages", message_id=msg.id):
            return ack(msg)                     # already done: skip side effects
        apply_business_change(msg)              # same transaction as the dedupe record
    ack(msg)                                    # ack only after commit`},
{t:'text',level:'x',title:'Expert · Patterns and production details',html:`
<ul>
<li><b>Transactional outbox.</b> Problem: you update the DB and then publish an event; a crash between them loses the event (or publishes for a rolled-back change). Fix: write the event into an <code>outbox</code> table <i>in the same transaction</i> as the business change; a relay (poller or CDC like Debezium) publishes it and marks it sent. At-least-once, so consumers stay idempotent.</li>
<li><b>Ordering.</b> Kafka guarantees order only <b>within a partition</b>. Use a key (order_id, user_id) so all events for one entity land in one partition. More partitions = more parallelism but order only per key. One slow message blocks its partition (head-of-line blocking), so keep handlers fast and retry later via a retry topic.</li>
<li><b>Consumer groups.</b> Each partition is read by one consumer in a group, so max parallelism = number of partitions. Plan partitions for future peak.</li>
<li><b>Sizing workers (Little's law):</b> workers needed = arrival rate × processing time. 200 msg/s × 50 ms = 10 busy workers minimum; run ~15–20 for headroom and spikes.</li>
<li><b>Backpressure.</b> If producers are faster than consumers forever, the queue grows without limit. Watch <b>consumer lag</b> (oldest message age), autoscale consumers, bound queue size, and when full: reject with 429/503, slow producers, or drop low-priority work. A queue absorbs spikes; it does not fix lasting overload.</li>
<li><b>CQRS / event sourcing (light).</b> CQRS: separate write model from read models built from events (e.g. a search index, a feed). Event sourcing: store the events themselves as the source of truth and derive state by replay. Powerful for audit and rebuilding views; costs: schema evolution of events, replay time, eventual consistency.</li>
<li><b>Choosing a tool:</b> SQS/RabbitMQ for task queues with per-message ack and delays; Kafka for high-throughput ordered logs, replay, many independent consumers and stream processing.</li>
</ul>`},
{t:'text',level:'x',title:'Expert · Worked design: a notification system',html:`
<ol>
<li>Services publish "notify" events (user, template, data, priority, idempotency key) to a topic.</li>
<li>A notification service checks user preferences, quiet hours and rate limits per user, renders the template, then enqueues per-channel jobs: push, SMS, email.</li>
<li>Channel workers call providers (APNs/FCM, SMS gateway, email provider) with retries + backoff, per-provider rate limits, and failover to a second provider.</li>
<li>Separate queues per priority so a marketing blast never delays OTP codes.</li>
<li>Store delivery status for tracking; DLQ for permanent failures; deduplicate by idempotency key so a retry does not send two SMS.</li>
</ol>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'A consumer crashes after charging a card but before acking. What happens and how do you make it safe?',a:'The message is redelivered and processed again. Make the charge idempotent: pass the message/order id as the provider idempotency key, and record "charged" in the same transaction as the dedupe record.'},
{q:'A new team wants to reprocess 7 days of click events. Which shape?',a:'A log (Kafka/Kinesis) with 7+ days retention. The new team starts a new consumer group at the offset from 7 days ago, without affecting existing consumers. A work queue would have already deleted the messages.'},
{q:'Show the price after the user clicks Buy: async?',a:'No. The user needs the answer now and it is fast: keep it synchronous. Async is for slow, spiky or fan-out work whose result the user does not need in the same request.'},
{q:'Queue lag keeps growing every evening. Diagnose.',a:'Arrival rate exceeds processing rate at peak. Check per-message processing time (a slow dependency?), number of consumers vs partitions, poison messages being retried, and hot partitions. Fix: scale consumers (and partitions), batch work, speed up the slow call, or shed/delay low-priority messages.'},
]}
]});
