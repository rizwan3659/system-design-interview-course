COURSE.addDeep('s10',{title:'Deep dive: a chat app like WhatsApp, beginner to expert',lead:'Persistent connections, delivery to online and offline users, ordering, receipts, groups, presence and media.',blocks:[
{t:'text',level:'f',title:'Beginner · How chat is different',html:`
<p>In most apps, the client asks and the server answers. In chat, the <b>server must push</b> a message to Bob the moment Alice sends it. So each phone keeps a long-lived connection open to the server, usually a <b>WebSocket</b>.</p>
<p>The basic flow:</p>
<ol>
<li>Alice's app sends the message over her WebSocket.</li>
<li>The server <b>saves</b> it, then tells Alice "sent" (one tick).</li>
<li>If Bob is online, the server pushes it over Bob's WebSocket. Bob's app replies "delivered" (two ticks). When he opens the chat, "read" (blue ticks).</li>
<li>If Bob is offline, the message waits in storage, and a push notification (APNs/FCM) wakes his phone. When he reconnects, his app downloads everything he missed.</li>
</ol>
<p><b>Never-happen rule:</b> once Alice sees one tick, the message is never lost.</p>`},
{t:'text',level:'i',title:'Intermediate · Estimate and components',html:`
<ul>
<li>500 M daily users × 40 messages = 20 B messages/day ≈ 230 K/s average, ~700 K/s peak.</li>
<li>~100 bytes per message → 2 TB/day of text. Media is far bigger and lives elsewhere.</li>
<li>Concurrent connections: maybe 200 M. One gateway server holds ~100 K–1 M idle connections → hundreds to a few thousand gateways.</li>
</ul>
<p><b>Components:</b></p>
<ul>
<li><b>Connection gateways</b>: hold WebSockets; stateless about chat logic.</li>
<li><b>Session registry</b> (Redis): <code>user_id → gateway_id</code>, updated on connect/disconnect.</li>
<li><b>Chat service</b>: validates, assigns order, stores, routes.</li>
<li><b>Message store</b>: wide-column (Cassandra/ScyllaDB/HBase) partitioned by <code>conversation_id</code>, clustered by sequence number. Write-heavy, read by conversation → a perfect fit.</li>
<li><b>Push notification service</b> for offline users; <b>media service</b> with object storage + CDN.</li>
</ul>`},
{t:'text',level:'i',title:'Intermediate · Sending one message, step by step',html:`
<ol>
<li>Alice's gateway forwards <code>{client_msg_id, conv_id, text}</code> to the chat service.</li>
<li>Chat service assigns the next <b>per-conversation sequence number</b>, writes the message (dedupe on client_msg_id so app retries do not double-send), and acks Alice → one tick.</li>
<li>Looks up members' gateways in the session registry; sends to Bob's gateway (via an internal pub/sub or direct RPC), which pushes to Bob.</li>
<li>Bob's app acks → server updates Bob's delivered pointer → Alice gets two ticks.</li>
<li>Bob offline → push notification; on reconnect Bob's app asks "give me messages in conv X after seq 1042".</li>
</ol>`},
{t:'text',level:'x',title:'Expert · Deep dives',html:`
<ul>
<li><b>Ordering:</b> only within a conversation, by server-assigned sequence (not client clocks). Clients buffer and fill gaps. Global ordering is neither needed nor affordable.</li>
<li><b>Receipts as pointers:</b> store per member per conversation <code>last_delivered_seq</code> and <code>last_read_seq</code> instead of a status row per message per recipient. A 256-member group would otherwise create 256 rows per message.</li>
<li><b>Groups:</b> small groups → fan-out on write to each member's gateway/inbox. Very large groups/channels → store once, members pull, and push only notifications.</li>
<li><b>Presence:</b> clients heartbeat every ~30 s; presence key in Redis with a TTL slightly longer; "last seen" written on disconnect. Do not broadcast presence to everyone: send it only to people who currently have that chat open, or fetch on demand. Presence is eventual and cheap by design.</li>
<li><b>Media:</b> client uploads to object storage via a pre-signed URL (encrypted), sends a message containing the media reference + thumbnail; recipients download from CDN.</li>
<li><b>Multi-device:</b> each device has its own delivery pointer; messages fan out per device.</li>
<li><b>End-to-end encryption</b> (Signal protocol): the server stores ciphertext only, so server-side search is impossible; search is done on the device.</li>
<li><b>Storage tiering:</b> recent messages hot (SSD), old ones moved to cheaper storage; WhatsApp-style systems delete from the server after delivery and keep history on devices.</li>
<li><b>Gateway failure:</b> clients reconnect (with jittered backoff to avoid a reconnect storm) to another gateway, re-register, and sync from their last seq. Nothing is lost because the message was stored before the first tick.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Why store before acknowledging to the sender?',a:'The one-tick promise is "never lost". If we acked before a durable write and the server crashed, the message would vanish while Alice believes it was sent. Write to a replicated store (quorum), then ack.'},
{q:'How do you route a message to a user connected to gateway #812?',a:'Look up user → gateway in the session registry, then send over an internal channel: direct RPC to that gateway, or publish to a per-gateway topic it subscribes to. If the lookup is stale (user moved), the gateway reports "not here" and we fall back to store + push.'},
{q:'How do you shard the message store, and what about a huge group?',a:'Partition key conversation_id (all messages of a chat together, read in order). A huge, very active group is a hot partition: split by (conversation_id, time bucket) so partitions stay bounded.'},
{q:'How does a phone that was offline for 3 days catch up efficiently?',a:'On reconnect it sends its last seq per conversation (or one global inbox cursor). The server returns conversations with newer messages, then pages of messages per conversation. Paginated, so a huge backlog does not arrive in one response.'},
]}
]});
