COURSE.addDeep('s08',{title:'Deep dive: reliability, load balancing, rate limiting and observability, beginner to expert',lead:'From "what does 99.9% mean" to error budgets, load-balancing algorithms, distributed rate limiters, circuit breakers and tracing.',blocks:[
{t:'text',level:'f',title:'Beginner · Availability and the nines',html:`
<p><b>Availability</b> = the share of time the system works. Every extra "nine" is 10x less downtime and much more effort.</p>`},
{t:'table',level:'f',head:['Availability','Downtime per year','Downtime per month'],rows:[
['99% (two nines)','3.65 days','7.3 hours'],['99.9%','8.8 hours','43.8 minutes'],['99.95%','4.4 hours','21.9 minutes'],['99.99%','52.6 minutes','4.4 minutes'],['99.999%','5.3 minutes','26 seconds'],
],note:'Parts in series multiply: three 99.9% services in a chain ≈ 99.7%. Parts in parallel (redundant copies) combine as 1 − (1 − a)ⁿ: two 99% copies ≈ 99.99%.'},
{t:'text',level:'f',title:'Beginner · SLI, SLO, SLA',html:`
<ul>
<li><b>SLI</b> (indicator) = what you measure: % of requests that succeed in under 300 ms.</li>
<li><b>SLO</b> (objective) = your internal target: 99.9% of requests per 30 days.</li>
<li><b>SLA</b> (agreement) = the promise to customers with penalties; set looser than the SLO.</li>
<li><b>Error budget</b> = 100% − SLO. 99.9% allows 0.1% failures (~43 min/month). While budget remains, ship features; when it is spent, focus on reliability.</li>
</ul>`},
{t:'table',level:'i',title:'Intermediate · Load-balancing algorithms',head:['Algorithm','How','When'],rows:[
['Round robin','Next server in turn','Identical servers, similar requests'],
['Weighted round robin','Bigger servers get more turns','Mixed machine sizes'],
['Least connections','Server with fewest open connections','Long or uneven requests, WebSockets'],
['Least response time / EWMA','Fastest recent responses','Mixed latency backends'],
['Power of two choices','Pick 2 random servers, use the less loaded','Large fleets; near-optimal and cheap'],
['Hash (IP / key / consistent hash)','Same client or key → same server','Sticky sessions, cache affinity'],
],note:'L4 balancers route by IP/port (fast, protocol-blind). L7 balancers read HTTP (route by path/header, TLS termination, retries). Health checks remove dead servers; keep servers stateless so any one can serve any request.'},
{t:'table',level:'i',title:'Intermediate · Rate-limiting algorithms',head:['Algorithm','Idea','Pros','Cons'],rows:[
['Token bucket','Bucket holds up to B tokens, refilled at R/s; each request spends one','Allows short bursts, smooth average, tiny state','Two parameters to tune'],
['Leaky bucket','Requests queue and leave at a fixed rate','Perfectly smooth output','Bursts wait or drop; adds latency'],
['Fixed window','Count per calendar minute','Simplest','2x burst at window edges (59 s and 61 s)'],
['Sliding window log','Store each request time, count last 60 s','Exact','Memory per request'],
['Sliding window counter','Weighted mix of current and previous window counts','Accurate enough, small state','Approximate'],
]},
{t:'text',level:'x',title:'Expert · Resilience patterns',html:`
<ul>
<li><b>Timeouts everywhere.</b> Never wait forever. Set timeouts from the caller's budget (deadline propagation: if the user request has 500 ms, a downstream call cannot take 2 s).</li>
<li><b>Retry carefully.</b> Only idempotent operations, only on retryable errors (timeouts, 503), with exponential backoff + jitter and a <b>retry budget</b> (e.g. retries ≤ 10% of requests). Retrying at every layer multiplies load: 3 layers × 3 retries = 27x → a <b>retry storm</b>.</li>
<li><b>Circuit breaker.</b> After many failures, stop calling the broken service for a while (open), return a fallback fast, then let a few test calls through (half-open). Protects your threads and gives the dependency room to recover.</li>
<li><b>Bulkheads.</b> Separate thread/connection pools per dependency, so a slow recommendations service cannot use up the threads that checkout needs.</li>
<li><b>Graceful degradation and load shedding.</b> Serve less, not nothing: hide recommendations, show cached prices, drop low-priority traffic first when overloaded.</li>
<li><b>Safe deploys.</b> Canary (1% → 10% → 100% with automatic rollback on SLO breach), feature flags, blue/green.</li>
<li><b>Redundancy:</b> multiple instances across availability zones; multi-region active-passive (simpler, failover takes minutes, some data lag) or active-active (fast failover, but conflicting writes must be handled).</li>
</ul>
<p><b>Observability</b> = three signals: <b>metrics</b> (numbers over time: RED = rate, errors, duration per service; USE = utilisation, saturation, errors per resource), <b>logs</b> (structured events with a request id), <b>traces</b> (one request's path across services with timings, via OpenTelemetry). Alert on symptoms users feel (SLO burn rate), not on every CPU spike.</p>`},
{t:'text',level:'x',title:'Expert · Distributed rate limiter design',html:`
<ol>
<li><b>Where:</b> at the API gateway, keyed by API key / user / IP, with per-endpoint rules.</li>
<li><b>State:</b> token buckets in Redis, keyed <code>rl:{key}</code>; update atomically with a Lua script (read tokens, refill by elapsed time, spend, write, set expiry) so concurrent gateways do not race.</li>
<li><b>Latency:</b> one Redis round trip (~0.5 ms). At extreme scale, keep local buckets per gateway and sync to Redis in batches (slightly over-allows, much cheaper).</li>
<li><b>Failure mode:</b> if Redis is down, fail <b>open</b> (allow) for normal APIs so an outage of the limiter is not an outage of the product; fail closed for abuse-sensitive endpoints such as login.</li>
<li><b>Response:</b> 429 with <code>Retry-After</code> and <code>X-RateLimit-Remaining</code> headers.</li>
</ol>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Checkout threads all hang waiting for a slow recommendations service. Fix?',a:'Tight timeout on the recommendations call, a bulkhead (its own small pool), a circuit breaker, and a fallback (no recommendations or cached ones). Checkout must not depend on a non-critical service.'},
{q:'Errors spike right after a deploy. First move?',a:'Roll back first, investigate second. Then check: error rate by version (canary vs baseline), config changes, schema/migration issues, dependency versions. Add automated canary analysis so this rolls back on its own next time.'},
{q:'All dashboards are green but orders arrive late. What is missing?',a:'A metric for the user outcome: queue age / consumer lag and end-to-end order latency. Services are "up" but a backlog grows. Add SLOs on freshness (e.g. 99% of orders visible within 30 s) and alert on burn rate.'},
{q:'Compute availability: LB (99.99%) → app (2 instances, 99.9% each) → DB (99.95%).',a:'App pair: 1 − 0.001² ≈ 99.9999%. Series: 0.9999 × 0.999999 × 0.9995 ≈ 99.94%. The single database is the weak link; add a standby with automatic failover.'},
]}
]});
