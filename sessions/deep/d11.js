COURSE.addDeep('s11',{title:'Deep dive: a news feed like Instagram, beginner to expert',lead:'Media upload, the follow graph, fan-out on write vs read, the celebrity problem, ranking and pagination.',blocks:[
{t:'text',level:'f',title:'Beginner · What a feed is',html:`
<p>Your feed is the list of recent posts from people you follow. Two features carry the system:</p>
<ul><li><b>Post:</b> upload a photo with a caption.</li><li><b>Read feed:</b> open the app and see posts from everyone you follow, newest (or most relevant) first, in under ~300 ms.</li></ul>
<p>The naive way: when you open the app, find everyone you follow, fetch each one's recent posts, merge and sort. Fine for 100 users; far too slow when you follow 500 people and millions open the app at once.</p>
<p>The key idea of the session: <b>do the work ahead of time</b>. When someone posts, put the post into each follower's ready-made feed list, so reading is a single fast lookup.</p>`},
{t:'text',level:'i',title:'Intermediate · Estimate and data',html:`
<ul>
<li>500 M daily users; 100 M photos posted/day ≈ 1,200/s; each user opens the feed ~10 times → 5 B feed reads/day ≈ 60 K/s, peak ~150 K/s. Read-heavy.</li>
<li>Photos: ~2 MB original + resized versions ≈ 3 MB × 100 M = 300 TB/day → object storage + CDN, never the database.</li>
</ul>
<p><b>Data:</b> <code>users</code>; <code>posts(post_id, author_id, media_keys, caption, created_at)</code> sharded by author or post id; <code>follows(follower_id, followee_id)</code> stored both ways (who I follow, who follows me), sharded by user; <code>feed:{user_id}</code> in Redis = a list of the latest ~500 post ids.</p>
<p><b>Posting media:</b> app asks for a pre-signed URL → uploads directly to object storage → post service writes metadata → an async pipeline makes thumbnails/resized versions → CDN serves them.</p>`},
{t:'table',level:'i',title:'Intermediate · Fan-out on write vs read',head:['','Fan-out on write (push)','Fan-out on read (pull)'],rows:[
['When a user posts','Insert the post id into every follower\'s feed list','Just store the post'],
['When a user reads','Read their own feed list: one lookup','Fetch recent posts from everyone they follow and merge'],
['Read latency','Very fast','Slow, grows with number of followees'],
['Write cost','followers × 1 write per post','1 write'],
['Problem case','A celebrity with 100 M followers → 100 M writes per post','Users who follow thousands of accounts'],
['Wasted work','Writes to inactive users\' feeds','None'],
]},
{t:'text',level:'x',title:'Expert · The hybrid design and its details',html:`
<ul>
<li><b>Hybrid:</b> push for normal accounts; for accounts above a follower threshold (say 100 K), do <b>not</b> fan out. At read time, merge the user's precomputed feed with recent posts from the few celebrities they follow (cached heavily, since everyone reads the same celebrity posts).</li>
<li><b>Fan-out workers:</b> post service publishes "post created" to a queue; workers page through the follower list in batches and append to feed lists. The poster gets an instant response; followers see the post within seconds. Skip inactive users (no login in 30 days) and rebuild their feed on next login.</li>
<li><b>Feed storage:</b> store only post ids (8 bytes) + maybe timestamps, capped at a few hundred per user. Hydrate ids into full posts with a batched multi-get from a post cache. Hundreds of millions of users × 500 ids × 8 B ≈ a few TB of Redis — a cluster, sized deliberately.</li>
<li><b>Ranking:</b> a candidate set (the ids) is scored by a model (relationship strength, recency, engagement predicted) and reordered; ranking is a separate stage so the storage design stays simple.</li>
<li><b>Pagination:</b> cursor-based (score/time + post id of the last item), so new posts at the top do not shift pages.</li>
<li><b>Deletes and unfollows:</b> lazily filter at read time (check post still exists, still following) rather than scrubbing millions of lists; clean up asynchronously.</li>
<li><b>Likes and comments counts:</b> sharded counters with write-back (see caching), displayed approximately.</li>
<li><b>Hot posts:</b> a viral post's metadata is read by millions → local caches + replicated cache keys.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions (interviewer push-backs)',items:[
{q:'"A celebrity posts and 100 M feeds must update. Your push design falls over." Respond.',a:'Agreed, which is why celebrities are excluded from push. Their posts are merged in at read time from a small, heavily cached "celebrity recent posts" list. Push handles the long tail where it is cheap.'},
{q:'"Why not compute every feed on read and skip the fan-out machinery?"',a:'At 150 K feed reads/s, each needing hundreds of lookups plus a merge, reads become the bottleneck and p99 grows with how many accounts you follow. Precomputation moves work to the write path, which is ~50x less frequent and asynchronous.'},
{q:'"A user follows someone new. When do they see their posts?"',a:'On follow, enqueue a small backfill job that inserts the followee\'s last N post ids into the follower\'s feed list. Until it runs, the read-time merge can include them.'},
{q:'"Your Redis feed cluster loses a node."',a:'Feeds on that node are rebuilt on demand from source data (follows + recent posts) — it is a cache, not the source of truth. Replicas per shard make it rare; rebuild cost is bounded because only recent posts are needed.'},
]}
]});
