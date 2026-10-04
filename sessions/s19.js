COURSE.add({id:'s19',n:19,part:'C',track:'LLD',
title:'Concurrency in LLD: LRU cache and rate limiter',
goal:'Write classes that stay correct when many threads use them, through two favourite interview problems.',
outcomes:['Explain race conditions, locks and deadlocks with an example','Build an O(1) LRU cache with a hash map and a doubly linked list','Design a pluggable, thread-safe rate limiter','Say what each lock protects and what it costs'],
concept:'concurrency',
tasks:[{t:'Complete the LRU cache LLD lab.',auto:'s19lru'},{t:'Complete the rate limiter LLD lab.',auto:'s19rl'},{t:'Compare limiter algorithms in the simulator.',auto:'s19sim'},{t:'Answer the concurrency interview checkpoint.',auto:'s19cp'},{t:'Rate yourself: can you write a thread-safe LRU cache from memory?',auto:'s19sum'}],
modules:[
{title:'Warm-up',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Token bucket allows…',opts:['Short bursts up to the bucket size','No bursts at all'],a:0},
  {q:'Cache eviction that drops the item unused for the longest time →',opts:['LRU','FIFO'],a:0},
  {q:'Two gates park in the same spot. The bug is a…',opts:['Race condition','Memory leak'],a:0}]}]},

{title:'Concurrency basics',tab:'Concurrency',mins:25,out:'Explain a race and a deadlock',lead:'A race condition happens when the result depends on the timing of threads. The classic one: <code>count += 1</code> is really read, add, write.',blocks:[
 {t:'lab',fn:'race',title:'Lab · Two threads, one counter'},
 {t:'grid',title:'Tools and traps',items:[
  {title:'Lock (mutex)',body:'Only one thread runs the guarded section. Keep it short; never call slow I/O while holding it.'},
  {title:'Read-write lock',body:'Many readers or one writer. Good for read-heavy shared data.'},
  {title:'Atomic operations',body:'Compare-and-set, atomic counters: no lock, retry on conflict.'},
  {title:'Deadlock',body:'Thread 1 holds A, waits for B; thread 2 holds B, waits for A. Fix: always take locks in the same global order, or use timeouts.'},
  {title:'Thread-safe queue',body:'<code>queue.Queue</code> for producer/consumer hand-off instead of sharing lists.'},
  {title:'Python note',body:'The GIL does not make <code>+=</code> atomic across threads; you still need locks for compound operations.'}]},
 {t:'code',title:'Deadlock and its fix',code:`
import threading
a, b = threading.Lock(), threading.Lock()

def transfer_bad(first, second):
    with first:
        with second:        # thread 1: a then b; thread 2: b then a -> deadlock
            ...

def transfer_good(x, y):
    first, second = sorted([x, y], key=id)    # same global order for every thread
    with first:
        with second:
            ...`}]},

{title:'LRU cache, step by step',tab:'LRU cache',mins:35,out:'Working O(1) LRU',lead:'Prompt: <b>"Design an LRU cache with get(key) and put(key, value) in O(1), capacity N."</b>',blocks:[
 {t:'lab',fn:'lru',title:'Lab · Watch the LRU order',intro:'Capacity 3. Put and get keys; the most recently used item is on the left, the next to be evicted on the right.'},
 {t:'stepper',steps:[
  {title:'Which data structures?',short:'Structures',secs:150,think:'O(1) lookup and O(1) "move to front" and "remove oldest". Which two structures together?',answer:'A <b>hash map</b> key → node for O(1) lookup, plus a <b>doubly linked list</b> ordered by recency for O(1) move and remove (each node knows its neighbours). Sentinel head/tail nodes remove edge cases.'},
  {title:'Code it',short:'Code',secs:480,think:'Write get and put.',code:`
import threading

class Node:
    __slots__ = ("key", "value", "prev", "next")
    def __init__(self, key=None, value=None):
        self.key, self.value, self.prev, self.next = key, value, None, None

class LRUCache:
    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.map: dict = {}
        self.head, self.tail = Node(), Node()        # sentinels: head.next = most recent
        self.head.next, self.tail.prev = self.tail, self.head
        self.lock = threading.Lock()

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node):
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        with self.lock:
            node = self.map.get(key)
            if node is None:
                return None
            self._unlink(node)
            self._push_front(node)
            return node.value

    def put(self, key, value):
        with self.lock:
            node = self.map.get(key)
            if node:
                node.value = value
                self._unlink(node)
                self._push_front(node)
                return
            if len(self.map) == self.capacity:
                lru = self.tail.prev                 # least recently used
                self._unlink(lru)
                del self.map[lru.key]
            node = Node(key, value)
            self.map[key] = node
            self._push_front(node)`,answer:'<p>The lock makes each get/put atomic. <b>Note:</b> in Python, <code>collections.OrderedDict</code> with <code>move_to_end</code> and <code>popitem(last=False)</code> gives a 10-line version; interviewers often ask for the linked-list one to see you understand it.</p>'},
  {title:'Challenge',short:'Challenge',secs:180,think:'The single lock becomes a bottleneck with 64 threads. Options?',answer:'<ul class="clean"><li><b>Shard</b> the cache into 16 LRU caches by hash(key), each with its own lock (approximate global LRU, much more parallelism).</li><li>Use a read-optimised policy that batches recency updates.</li><li>Add a TTL per entry for freshness.</li></ul>'}]},
 {t:'lldlab',id:'s19lru',title:'LLD lab · LRU cache',level:'x',concept:'concurrency',intro:'Work through each stage. Write your own answer before revealing the solution.',stages:[{k:'Requirements',prompt:'Design an in-memory cache with a fixed capacity that evicts the least recently used key.',hint:'Complexity target? Thread safety? TTL?',solution:'get(key) and put(key, value) in O(1); evict the least recently used entry when full; a get counts as a use; safe to call from many threads.'},{k:'Identify objects',prompt:'List the classes (nouns) you need.',hint:'Which data structures give O(1) lookup and O(1) reordering?',solution:'A <b>hash map</b> key → node and a <b>doubly linked list</b> ordered by recency (or Python’s OrderedDict, which is both).'},{k:'Responsibilities',prompt:'For each class: what does it own, what does it do, who does it talk to?',hint:'What moves where on get and put?',solution:'get: look up, move the node to the front (most recent). put: update or insert at the front; if over capacity, remove the tail (least recent) from both list and map.'},{k:'Interface',prompt:'Write the public methods (names, inputs, outputs) before any implementation.',hint:'API.',solution:'<code>LRUCache(capacity)</code>, <code>get(key) → value | None</code>, <code>put(key, value)</code>, <code>__len__</code>.'},{k:'Implementation',prompt:'Implement the core in Python.',code:true,lang:'python',starter:`from collections import OrderedDict
import threading

class LRUCache:
    def __init__(self, capacity):
        ...
`,solution:`from collections import OrderedDict
import threading

class LRUCache:
    def __init__(self, capacity):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.cap = capacity
        self.data = OrderedDict()             # oldest first, newest last
        self.lock = threading.Lock()

    def get(self, key):
        with self.lock:
            if key not in self.data:
                return None
            self.data.move_to_end(key)        # mark as most recently used
            return self.data[key]

    def put(self, key, value):
        with self.lock:
            if key in self.data:
                self.data.move_to_end(key)
            self.data[key] = value
            if len(self.data) > self.cap:
                self.data.popitem(last=False)  # evict least recently used

    def __len__(self):
        with self.lock:
            return len(self.data)`},{k:'Edge cases',prompt:'What inputs or situations could break it?',hint:'Think about empty, full, duplicate, concurrent and invalid inputs.',solution:'Capacity 0 or negative; updating an existing key must not evict; storing None as a value (ambiguous with a miss: use a sentinel); concurrent get/put on the same key; very hot keys causing lock contention (shard the cache by key hash).'},{k:'Tests',prompt:'Write the test cases you would run (input → expected).',hint:'One happy path, one per edge case.',solution:'cap 2: put a, put b, get a, put c → b evicted, a and c remain; put existing key → no eviction, value updated; get missing → None; cap 0 → ValueError; 8 threads × 10,000 random ops → len never exceeds capacity.'}]}]},

{title:'Rate limiter LLD',tab:'Rate limiter',mins:30,out:'Pluggable thread-safe limiter',lead:'Prompt: <b>"Design a rate limiter library: different algorithms, limits per client, safe across threads."</b> (Session 8 did the distributed HLD version; this is the in-process class design.)',blocks:[
 {t:'uml',classes:[
  {id:'rl',name:'RateLimiter',kind:'interface',x:20,y:20,methods:['allow(client_id): bool'],note:'What every algorithm offers. Callers depend only on this.'},
  {id:'tb',name:'TokenBucketLimiter',x:20,y:150,fields:['capacity: int','refill_per_sec: float','- buckets: dict','- lock: Lock'],methods:['allow(client_id): bool'],note:'Allows bursts up to capacity, then the refill rate.'},
  {id:'sw',name:'SlidingWindowLimiter',x:290,y:150,fields:['limit: int','window_sec: float','- logs: dict[str, deque]','- lock: Lock'],methods:['allow(client_id): bool'],note:'Exact count of requests in the last window. More memory per client.'},
  {id:'f',name:'LimiterFactory',x:330,y:20,methods:['create(config): RateLimiter'],note:'Builds the right limiter from config (algorithm name + parameters).'},
  {id:'mw',name:'RateLimitMiddleware',x:560,y:20,fields:['limiter: RateLimiter'],methods:['handle(request)'],note:'Calls allow() before the handler; returns 429 if denied. Dependency injection of the limiter.'}],
  rels:[{from:'tb',to:'rl',type:'impl'},{from:'sw',to:'rl',type:'impl'},{from:'f',to:'rl',type:'uses'},{from:'mw',to:'f',type:'uses'}]},
 {t:'code',title:'Two strategies behind one interface',code:`
import threading
import time
from abc import ABC, abstractmethod
from collections import deque

class RateLimiter(ABC):
    @abstractmethod
    def allow(self, client_id: str) -> bool: ...

class TokenBucketLimiter(RateLimiter):
    def __init__(self, capacity: int, refill_per_sec: float, clock=time.monotonic):
        self.capacity, self.rate, self.clock = capacity, refill_per_sec, clock
        self.buckets: dict[str, tuple[float, float]] = {}    # client -> (tokens, last_time)
        self.lock = threading.Lock()

    def allow(self, client_id):
        with self.lock:
            now = self.clock()
            tokens, last = self.buckets.get(client_id, (self.capacity, now))
            tokens = min(self.capacity, tokens + (now - last) * self.rate)
            allowed = tokens >= 1
            self.buckets[client_id] = (tokens - 1 if allowed else tokens, now)
            return allowed

class SlidingWindowLimiter(RateLimiter):
    def __init__(self, limit: int, window_sec: float, clock=time.monotonic):
        self.limit, self.window, self.clock = limit, window_sec, clock
        self.logs: dict[str, deque] = {}
        self.lock = threading.Lock()

    def allow(self, client_id):
        with self.lock:
            now = self.clock()
            log = self.logs.setdefault(client_id, deque())
            while log and log[0] <= now - self.window:
                log.popleft()
            if len(log) < self.limit:
                log.append(now)
                return True
            return False`,note:'Injecting the clock makes the classes testable without sleeping. One lock per limiter is simple; per-client locks (or striped locks) scale better.'},
 {t:'reveal',cols:2,items:[
  {q:'How do you stop the buckets dict growing forever?',a:'Evict idle clients: a periodic sweep removing entries not touched for 10 minutes, or store buckets in an LRU cache (the class you just wrote).'},
  {q:'How would you test TokenBucketLimiter?',a:'Inject a fake clock: call allow() capacity times (all True), once more (False), advance the clock by 1/rate, call again (True).'}]},
 {t:'lldlab',id:'s19rl',title:'LLD lab · Token-bucket rate limiter',level:'x',concept:'ratelimit',intro:'Work through each stage. Write your own answer before revealing the solution.',stages:[{k:'Requirements',prompt:'Design a per-client rate limiter class for one server.',hint:'Algorithm? Burst allowed? Per what key? Thread safety? Testing time?',solution:'allow(client_id) → bool; each client gets R requests per second with bursts up to B; thread-safe; time is injectable for tests; idle clients do not leak memory forever.'},{k:'Identify objects',prompt:'List the classes (nouns) you need.',hint:'What state does each client need?',solution:'<b>RateLimiter</b> (map client → bucket), <b>TokenBucket</b> (tokens, last_refill, rate, capacity), <b>Clock</b>.'},{k:'Responsibilities',prompt:'For each class: what does it own, what does it do, who does it talk to?',hint:'Where does refill happen?',solution:'Lazily inside allow(): add (now − last) × rate tokens, capped at capacity, then try to take one. No background timer is needed.'},{k:'Interface',prompt:'Write the public methods (names, inputs, outputs) before any implementation.',hint:'API.',solution:'<code>RateLimiter(rate, capacity, clock)</code>, <code>allow(client_id) → bool</code>.'},{k:'Implementation',prompt:'Implement the core in Python.',code:true,lang:'python',starter:`import threading, time

class RateLimiter:
    def __init__(self, rate, capacity, clock=time.monotonic):
        ...
    def allow(self, client_id):
        ...
`,solution:`import threading, time

class RateLimiter:
    def __init__(self, rate, capacity, clock=time.monotonic):
        self.rate, self.cap, self.clock = rate, capacity, clock
        self.buckets = {}                     # client -> [tokens, last]
        self.lock = threading.Lock()

    def allow(self, client_id):
        now = self.clock()
        with self.lock:                       # refill + take must be atomic
            tokens, last = self.buckets.get(client_id, (self.cap, now))
            tokens = min(self.cap, tokens + (now - last) * self.rate)
            ok = tokens >= 1
            if ok:
                tokens -= 1
            self.buckets[client_id] = (tokens, now)
            return ok`},{k:'Edge cases',prompt:'What inputs or situations could break it?',hint:'Think about empty, full, duplicate, concurrent and invalid inputs.',solution:'Burst at start (bucket starts full); clock going backwards (use monotonic time); many clients (evict idle buckets periodically); one global lock under heavy load (shard locks by client hash); distributed version needs Redis + an atomic script.'},{k:'Tests',prompt:'Write the test cases you would run (input → expected).',hint:'One happy path, one per edge case.',solution:'rate 1/s cap 3, fake clock fixed: 3 allows then False; advance 1 s → one more True; two clients are independent; 20 threads hammering one client for 0 s → exactly 3 True.'}]},
 {t:'ratelimit',id:'s19sim',concept:'ratelimit',title:'Simulator · How the algorithms behave',level:'i',intro:'Your class implements the token bucket. See how it compares with the other three on the same traffic.'}]},

{title:'Review',tab:'Review',mins:20,out:'Drill + homework',blocks:[
 {t:'drill',title:'Concurrency drill',prefix:'Is this safe? ',button:'Draw a snippet',items:[['if key not in cache: cache[key] = load(key)  (two threads)','No: both may load and write. Use a lock or a per-key "single flight".'],['balance -= amount after checking balance >= amount, without a lock','No: check-then-act race; two withdrawals can overdraw.'],['Each thread appends results to its own local list, merged at the end','Yes: no shared mutable state until the merge.'],['Thread 1 locks orders then users; thread 2 locks users then orders','Deadlock risk: use one global lock order.'],['queue.Queue shared between producer and consumer threads','Yes: Queue is thread-safe.']]},
 {t:'flash',items:[['Race condition?','Result depends on thread timing; e.g. lost updates on count += 1.'],['LRU in O(1)?','Hash map + doubly linked list with sentinels.'],['Deadlock fix?','Consistent lock ordering or timeouts.'],['Why inject a clock?','Deterministic tests without sleeping.'],['Scale a locked cache?','Shard it: N caches each with its own lock.']]},
 {t:'task',title:'Homework',items:['Implement an LFU cache (evict least frequently used; tie → least recent) in O(1) and write 3 tests.']},
 {t:'checkpoint',id:'s19cp',title:'Interview checkpoint',prompt:'"Implement a thread-safe LRU cache, then tell me how you would scale it to 64 cores without a single lock becoming the bottleneck."',steps:['State the O(1) requirement and the data structures','Write get/put with move-to-front and evict-tail','Protect the structure with a lock and explain why','Handle edge cases (update existing key, capacity checks)','Discuss lock contention under many threads','Shard the cache by key hash into N independent LRUs','Explain the cost: eviction becomes approximately LRU','Test with concurrent random operations'],model:'OrderedDict + lock (or hash map + doubly linked list). To scale: N shards, each its own LRU and lock; key → shard by hash. Global recency is approximate but contention drops ~N×.',followups:[['"Why not a read-write lock?"','get() also mutates recency order, so reads are writes here.'],['"Add TTL."','Store expiry with the value; treat expired as a miss and delete on access, plus periodic cleanup.']]},
 {t:'recall',title:'Active recall',items:[['Which structures make LRU O(1)?','A hash map for lookup plus a doubly linked list (or OrderedDict) for recency.'],['Why must get() take the lock?','It reorders the recency list: a write to shared state.'],['What is a race condition?','The result depends on the timing of threads, e.g. two read-modify-writes overlapping.'],['How does a token bucket refill without a timer?','Lazily: on each call add elapsed × rate tokens, capped at capacity.'],['How do you reduce lock contention?','Shard state by key, so threads mostly take different locks.']]},
 {t:'summary',id:'s19sum',title:'Session summary',learned:['<b>Why locks exist:</b> make read-modify-write sequences atomic','<b>When to shard locks:</b> many threads contend on one structure','<b>When not to lock:</b> immutable data, or per-thread state','<b>Trade-offs:</b> simplicity vs throughput; exact vs approximate LRU','<b>Interview questions:</b> LRU, rate limiter, races, testing concurrency'],explain:'Write a thread-safe LRU cache from memory and explain each line.'}]}
],
labs:{
 race(el,api){
  el.innerHTML=`<div class="row"><button class="btn" data-m="unsafe" aria-pressed="true">No lock</button><button class="btn" data-m="lock" aria-pressed="false">With a lock</button><button class="btn primary" data-go>Run: each thread adds 1 three times</button></div><div class="tbl"><table><thead><tr><th>Step</th><th>Thread A</th><th>Thread B</th><th>counter in memory</th></tr></thead><tbody data-t></tbody></table></div><div class="verdict" data-v>Expected result: 6.</div>`;
  let mode='unsafe';
  const run=()=>{const rows=[];let mem=0,ra=0,rb=0;
   if(mode==='unsafe'){for(let i=0;i<3;i++){ra=mem;rows.push([`read ${ra}`,'',mem]);rb=mem;rows.push(['',`read ${rb}`,mem]);mem=ra+1;rows.push([`write ${ra+1}`,'',mem]);mem=rb+1;rows.push(['',`write ${rb+1}`,mem])}}
   else{for(let i=0;i<3;i++){rows.push(['lock · read '+mem+' · write '+(mem+1)+' · unlock','',++mem]);rows.push(['','lock · read '+mem+' · write '+(mem+1)+' · unlock',++mem])}}
   api.$('[data-t]',el).innerHTML=rows.map((r,i)=>`<tr><td class="mono">${i+1}</td><td class="mono" style="color:var(--accent)">${r[0]}</td><td class="mono" style="color:var(--warn)">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('');
   api.$('[data-v]',el).innerHTML=mem===6?'<b>Result 6.</b> The lock makes read-add-write one indivisible step. Cost: threads wait for each other.':`<b>Result ${mem}, not 6.</b> Both threads read the same old value, so each write overwrites the other: lost updates. It only happens with unlucky timing, which is why these bugs are hard to reproduce.`};
  el.addEventListener('click',e=>{const m=e.target.closest('[data-m]');if(m){mode=m.dataset.m;api.$$('[data-m]',el).forEach(x=>x.setAttribute('aria-pressed',String(x===m)));api.$('[data-t]',el).innerHTML='';api.$('[data-v]',el).textContent='Expected result: 6.'}if(e.target.closest('[data-go]'))run()})},
 lru(el,api){
  const cap=3;let list=[];const log=[];
  el.innerHTML=`<div class="row"><label style="flex-direction:row;align-items:center;gap:6px">key <input type="text" value="1" data-k style="width:60px"></label><label style="flex-direction:row;align-items:center;gap:6px">value <input type="text" value="A" data-v style="width:70px"></label><button class="btn primary" data-put>put</button><button class="btn" data-get>get</button><button class="btn small" data-reset>Reset</button></div><div data-list style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-height:64px"></div><div class="log" data-log aria-live="polite" style="min-height:90px"></div>`;
  const draw=()=>{api.$('[data-list]',el).innerHTML='<span class="mono small muted">head (most recent) →</span>'+(list.length?list.map((n,i)=>`<div style="border:1px solid ${i===list.length-1&&list.length===cap?'var(--marker)':'var(--line)'};border-radius:8px;padding:8px 12px;background:var(--card);font-family:var(--f-mono);font-size:.85rem">${api.esc(n[0])} : ${api.esc(n[1])}</div>`).join('<span class="muted">⇄</span>'):'<span class="muted small">empty</span>')+'<span class="mono small muted">← tail (evict next)</span>';
   api.$('[data-log]',el).innerHTML=log.length?log.slice(-6).map(x=>`<div class="${x[0]}">${api.esc(x[1])}</div>`).join(''):'<span class="muted">Try: put 1, put 2, put 3, get 1, put 4.</span>'};
  el.addEventListener('click',e=>{const k=api.$('[data-k]',el).value.trim(),v=api.$('[data-v]',el).value.trim();
   if(e.target.closest('[data-reset]')){list=[];log.length=0;draw();return}
   if(e.target.closest('[data-put]')&&k){const i=list.findIndex(n=>n[0]===k);if(i>=0){list.splice(i,1);list.unshift([k,v]);log.push(['a',`put(${k}, ${v}): updated and moved to head`])}else{if(list.length===cap){const ev=list.pop();log.push(['r-bad',`capacity full: evicted ${ev[0]} (least recently used)`])}list.unshift([k,v]);log.push(['a',`put(${k}, ${v}): inserted at head`])}
    const n=+k;if(!isNaN(n))api.$('[data-k]',el).value=String(n+1);api.$('[data-v]',el).value=String.fromCharCode(65+((v.charCodeAt(0)-64)%26));draw()}
   if(e.target.closest('[data-get]')&&k){const i=list.findIndex(n=>n[0]===k);if(i<0)log.push(['b',`get(${k}) → None (miss)`]);else{const n=list.splice(i,1)[0];list.unshift(n);log.push(['r-good',`get(${k}) → ${n[1]} (hit, moved to head)`])}draw()}});draw()}
}});
