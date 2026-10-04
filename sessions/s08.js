COURSE.add({id:'s08',n:8,part:'A',track:'HLD',
title:'Reliability, load balancing, rate limiting and observability',
goal:'Keep a system up when parts fail, protect it from overload, and know when something is wrong.',
outcomes:['Turn an availability target into downtime and redundancy','Choose load-balancing and rate-limiting algorithms','Apply timeouts, retries, circuit breakers and bulkheads','Design a distributed rate limiter'],
modules:[
{title:'Warm-up: recall session 7',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Each message must reach email, analytics and ledger services. Use…',opts:['A job queue','Pub/sub'],a:1},
  {q:'A message fails 5 times. It should go to…',opts:['The dead-letter queue','/dev/null'],a:0},
  {q:'200 msg/s, 50 ms each. Minimum workers?',opts:['4','10','200'],a:1}]}]},

{title:'Availability: SLOs and redundancy',tab:'Availability',mins:25,out:'Availability of a design, computed',lead:'Availability is the share of time the system works. Each extra nine is about 10x harder.',blocks:[
 {t:'table',title:'The nines',head:['Availability','Downtime per year','Downtime per month'],rows:[['99%','3.65 days','7.3 hours'],['99.9%','8.8 hours','43.8 minutes'],['99.95%','4.4 hours','21.9 minutes'],['99.99%','52.6 minutes','4.4 minutes'],['99.999%','5.3 minutes','26 seconds']]},
 {t:'grid',title:'SLI, SLO, SLA',items:[
  {title:'SLI: what you measure',body:'e.g. share of requests answered successfully in under 300 ms.'},
  {title:'SLO: your target',body:'e.g. 99.9% of requests meet the SLI over 30 days. The gap (0.1%) is your error budget.'},
  {title:'SLA: the promise to customers',body:'A contract, usually looser than the SLO, with refunds if broken.'}]},
 {t:'lab',fn:'avail',title:'Lab · Availability calculator',intro:'Parts in a chain multiply their availability. Copies in parallel fail only if all fail at once.'}]},

{title:'Load balancing and rate limiting',tab:'LB + rate limits',mins:25,out:'Pick algorithms with reasons',blocks:[
 {t:'table',title:'Load-balancing algorithms',head:['Algorithm','How','Good for'],rows:[
  ['Round robin','Next server in turn','Equal servers, short requests'],
  ['Least connections','Server with fewest open connections','Long or uneven requests (WebSockets, uploads)'],
  ['Weighted','Bigger servers get more','Mixed machine sizes, canary releases'],
  ['Hash (IP / user / key)','Same key → same server','Sticky sessions, local caches; use consistent hashing']]},
 {t:'grid',title:'Rate-limiting algorithms',items:[
  {title:'Token bucket',body:'Tokens refill at rate r up to capacity b; each request spends one. Allows short bursts up to b. Most common.'},
  {title:'Leaky bucket',body:'Requests queue and leave at a fixed rate. Smooth output; bursts wait or drop.'},
  {title:'Fixed window',body:'Count per minute. Simple, but 2x bursts at window edges.'},
  {title:'Sliding window log / counter',body:'Counts over the last 60 s exactly or approximately. Fair, more memory or maths.'}]},
 {t:'lab',fn:'bucket',title:'Lab · Token bucket',intro:'A client sends a burst. See which requests pass.'}]},

{title:'Resilience patterns and observability',tab:'Resilience',mins:20,out:'Name the right pattern per failure',blocks:[
 {t:'cards',items:[
  {tag:'Timeouts',title:'Never wait forever',body:'<p>Every network call gets a timeout shorter than the caller\'s own deadline. Without one, slow dependencies use up all threads.</p>'},
  {tag:'Retries',title:'Retry carefully',body:'<p>Only idempotent calls, with backoff and jitter, and a retry budget (e.g. at most 10% extra traffic). Retrying at every layer multiplies load.</p>'},
  {tag:'Circuit breaker',title:'Stop calling a broken service',body:'<p>After many failures the breaker opens and calls fail fast for 30 s; then a few test calls decide whether to close it. Protects both sides.</p>'},
  {tag:'Bulkhead',title:'Separate pools',body:'<p>Give each dependency its own thread or connection pool, so a slow recommendations service cannot starve checkout.</p>'},
  {tag:'Degrade',title:'Serve less, not nothing',body:'<p>Show the page without recommendations; serve cached prices; turn off non-essential features under load (load shedding).</p>'},
  {tag:'Observe',title:'Metrics, logs, traces',body:'<p>Metrics (rates, errors, latency percentiles) for alerts; logs for detail; distributed traces to follow one request across services. Alert on symptoms users feel, not CPU.</p>'}]},
 {t:'mcq',items:[
  {q:'The recommendations service is slow and checkout threads all hang waiting for it.',opts:['Bulkhead + timeout','Bigger database'],a:0},
  {q:'The payment provider is returning errors for every call.',opts:['Retry immediately 10 times','Circuit breaker, show "try again later"'],a:1},
  {q:'You want to see which of 12 services made a request slow.',opts:['Distributed tracing','More CPU alerts'],a:0},
  {q:'Rolling out a risky change safely.',opts:['Canary to 1% then ramp','Deploy everywhere at once'],a:0}]}]},

{title:'Guided problem: a distributed rate limiter',tab:'Guided problem',mins:30,out:'Rate limiter design',lead:'Prompt: <b>"Design a rate limiter for a public API: 100 requests per minute per API key, across 50 API servers."</b>',blocks:[
 {t:'stepper',steps:[
  {title:'Clarify',short:'Clarify',secs:120,think:'Where does it run? How strict? What happens over the limit?',answer:'Runs before the API logic (gateway or middleware). Limits per API key, some per IP. Slight over-counting is OK; under-counting a little at the edges is OK. Over limit: 429 with Retry-After. Must add < 2 ms latency and not become a single point of failure.'},
  {title:'Algorithm',short:'Algorithm',secs:150,think:'Which algorithm, and why?',answer:'Token bucket per key: allows small bursts, one counter + timestamp per key, cheap to compute. (Sliding-window counter is a fine alternative.)'},
  {title:'Where is the state?',short:'State',secs:180,think:'50 servers. Each counting alone means a key can get 50x the limit. Options?',answer:'<ul class="clean"><li><b>Shared Redis</b>: one atomic script per request (read tokens, refill, decrement). Accurate; adds ~1 ms; Redis must be highly available (replicas, cluster sharded by key).</li><li><b>Local + sync</b>: each server keeps local buckets and syncs to Redis every 100 ms. Faster, slightly inaccurate.</li><li><b>Sticky routing</b>: hash the key to one server. Simple, but uneven load.</li></ul>'},
  {title:'Failures',short:'Failures',secs:150,think:'Redis is down. Fail open or fail closed?',answer:'Usually <b>fail open</b> (allow traffic, use local approximate limits) so a limiter outage does not take the API down. Fail closed only for abuse-sensitive endpoints like login or SMS sending.'},
  {title:'Challenge',short:'Challenge',secs:150,think:'Enterprise customers want 10,000/min and different limits per endpoint.',answer:'Store rules in a config table (key, endpoint, rate, burst) cached in each server and refreshed every minute; bucket key = apiKey + endpoint. Big customers might get a dedicated limit pool.'}]}]},

{title:'Review',tab:'Review',mins:10,out:'Flashcards + homework',blocks:[
 {t:'flash',items:[['99.9% per month?','About 43 minutes of downtime.'],['Two 99.9% parts in series?','≈ 99.8%.'],['Two 99% copies in parallel?','99.99%.'],['Token bucket allows…','Bursts up to the bucket size, then the refill rate.'],['Circuit breaker states?','Closed → open (fail fast) → half-open (test) → closed.'],['Fail open or closed?','Open for most rate limiters; closed for abuse-sensitive actions.']]},
 {t:'task',title:'Homework',items:['Write the SLOs (2) and alerts (3) for a food-delivery checkout API.']}]}
],
labs:{
 avail(el,api){
  const parts=[['Load balancer',99.99,2],['App servers',99.5,3],['Cache',99.9,1],['Database',99.95,2]];
  el.innerHTML=`<div class="tbl"><table><thead><tr><th>Part (in series)</th><th>Availability of one copy (%)</th><th>Copies in parallel</th><th>Part availability</th></tr></thead><tbody>${parts.map((p,i)=>`<tr><td>${p[0]}</td><td><input type="number" step="0.01" min="90" max="99.999" value="${p[1]}" data-a="${i}" style="max-width:110px"></td><td><input type="number" min="1" max="5" value="${p[2]}" data-c="${i}" style="max-width:80px"></td><td class="mono" data-pa="${i}"></td></tr>`).join('')}</tbody></table></div><div class="out"><div><b data-tot></b><span>whole system</span></div><div><b data-down></b><span>downtime per year</span></div><div><b data-mon></b><span>downtime per month</span></div></div><div class="verdict" data-v></div>`;
  const draw=()=>{let tot=1;let worst=null,wv=2;parts.forEach((p,i)=>{const a=Math.min(99.9999,+api.$(`[data-a="${i}"]`,el).value||0)/100,c=Math.max(1,+api.$(`[data-c="${i}"]`,el).value||1);const pa=1-Math.pow(1-a,c);tot*=pa;if(pa<wv){wv=pa;worst=p[0]}api.$(`[data-pa="${i}"]`,el).textContent=(pa*100).toFixed(4)+'%'});
   const down=(1-tot)*365*24;api.$('[data-tot]',el).textContent=(tot*100).toFixed(3)+'%';api.$('[data-down]',el).textContent=down>=24?(down/24).toFixed(1)+' days':down>=1?down.toFixed(1)+' h':(down*60).toFixed(0)+' min';api.$('[data-mon]',el).textContent=((1-tot)*30*24*60).toFixed(0)+' min';
   api.$('[data-v]',el).innerHTML=`The weakest part is <b>${worst}</b>. A chain is never more available than its weakest link: adding copies there helps most. Note this assumes copies fail independently; a shared power supply or a bad deploy breaks that assumption.`};
  el.addEventListener('input',draw);draw()},
 bucket(el,api){
  el.innerHTML=`<div class="form"><label>Bucket size (burst): <b data-bv></b><input type="range" min="1" max="20" value="5" data-b></label><label>Refill (tokens/s): <b data-rv></b><input type="range" min="1" max="10" value="2" data-r></label><label>Pattern<select data-p><option value="burst">15 requests at once, then 1/s</option><option value="steady">4 requests every second</option><option value="spiky">Bursts of 8 every 3 s</option></select></label></div><div data-row style="display:flex;flex-wrap:wrap;gap:3px"></div><div class="out"><div><b data-ok></b><span>allowed</span></div><div><b data-no></b><span>rejected (429)</span></div></div><div class="verdict" data-v></div>`;
  const draw=()=>{const B=+api.$('[data-b]',el).value,r=+api.$('[data-r]',el).value,p=api.$('[data-p]',el).value;api.$('[data-bv]',el).textContent=B;api.$('[data-rv]',el).textContent=r;
   const times=[];if(p==='burst'){for(let i=0;i<15;i++)times.push(0);for(let s=1;s<=10;s++)times.push(s)}else if(p==='steady'){for(let s=0;s<10;s++)for(let k=0;k<4;k++)times.push(s+k*.25)}else{for(let s=0;s<10;s+=3)for(let k=0;k<8;k++)times.push(s)}
   let tok=B,last=0,ok=0,no=0;const cells=times.map(t=>{tok=Math.min(B,tok+(t-last)*r);last=t;if(tok>=1){tok-=1;ok++;return [t,1]}no++;return [t,0]});
   api.$('[data-row]',el).innerHTML=cells.map(c=>`<span title="t=${c[0]}s" style="width:20px;height:28px;border-radius:3px;background:${c[1]?'var(--good)':'var(--marker)'};display:grid;place-items:center;color:#fff;font-size:9px;font-family:var(--f-mono)">${Math.floor(c[0])}</span>`).join('');
   api.$('[data-ok]',el).textContent=ok;api.$('[data-no]',el).textContent=no;api.$('[data-v]',el).innerHTML=`Each square is one request (number = second it arrived; green allowed, red 429). The first ${B} of a burst pass using saved tokens; after that only ${r} per second get through.`};
  el.addEventListener('input',draw);el.addEventListener('change',draw);draw()}
}});
