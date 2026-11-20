COURSE.addDeep('s19',{title:'Deep dive: concurrency, LRU cache and rate limiter, beginner to expert',lead:'Race conditions, locks and deadlocks explained from zero, then two interview classics written to be correct under many threads.',blocks:[
{t:'text',level:'f',title:'Beginner · What goes wrong with threads',html:`
<p>A <b>thread</b> is one line of execution. Servers run many threads (or async tasks) at once so they can serve many users. Trouble starts when two threads change the <b>same data</b>.</p>
<p><code>count += 1</code> looks like one step but is three: read count, add 1, write back. If two threads both read 5, both write 6, one increment is <b>lost</b>. This is a <b>race condition</b>: the result depends on timing.</p>
<p>The usual cause is <b>check-then-act</b>: "if the spot is free, take it". Between the check and the act, another thread can take it.</p>
<p>The fix: make the read-modify-write <b>atomic</b>, usually with a <b>lock</b> (mutex): only one thread at a time may enter the protected section.</p>`},
{t:'table',level:'i',title:'Intermediate · Tools and traps',head:['Tool / trap','What it is','Use / avoid'],rows:[
['Lock (mutex)','One thread at a time in a critical section','Keep sections short; never call slow I/O while holding it'],
['Re-entrant lock (RLock)','Same thread may acquire again','When a locked method calls another locked method'],
['Read-write lock','Many readers or one writer','Read-heavy data (config, caches)'],
['Atomic operations','Hardware-level single-step updates (CAS, atomic counters)','Counters, flags; no Python built-in for user code — use a lock or itertools.count tricks carefully'],
['Condition / Event','Wait until something is true','Producer-consumer'],
['Thread-safe queue','queue.Queue handles locking for you','Hand work between threads instead of sharing state'],
['Deadlock','Thread 1 holds A waits for B; thread 2 holds B waits for A','Always acquire locks in one global order; use timeouts'],
['Python GIL','Only one thread runs Python bytecode at a time','Does NOT make += safe; it limits CPU parallelism (use processes for CPU work)'],
]},
{t:'code',level:'i',title:'Deadlock and its fix',lang:'python',code:`
# Deadlock: transfer(a, b) and transfer(b, a) at the same time
def transfer_bad(src, dst, amt):
    with src.lock:
        with dst.lock:                 # thread 1 holds a waits b; thread 2 holds b waits a
            src.bal -= amt; dst.bal += amt

# Fix: lock in a global order (by id), whoever is source or destination
def transfer(src, dst, amt):
    first, second = sorted((src, dst), key=lambda acc: acc.id)
    with first.lock, second.lock:
        if src.bal < amt: raise ValueError("insufficient funds")
        src.bal -= amt; dst.bal += amt`},
{t:'text',level:'i',title:'Intermediate · LRU cache: the idea',html:`
<p>An LRU (least recently used) cache of capacity N: <code>get(key)</code> and <code>put(key, value)</code> in <b>O(1)</b>; when full, evict the item unused for the longest time.</p>
<p>Data structures: a <b>hash map</b> key → node (O(1) lookup) + a <b>doubly linked list</b> ordered by recency (O(1) move-to-front and remove-from-tail). Use dummy head/tail nodes so there are no edge cases for empty lists. In Python, <code>OrderedDict</code> with <code>move_to_end</code> and <code>popitem(last=False)</code> gives the same thing; interviewers often ask you to write the list yourself.</p>`},
{t:'code',level:'x',title:'Thread-safe LRU cache (hash map + doubly linked list)',lang:'python',code:`
import threading

class _Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=None, val=None): self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    def __init__(self, capacity: int):
        if capacity <= 0: raise ValueError("capacity must be positive")
        self.cap, self.map = capacity, {}
        self.head, self.tail = _Node(), _Node()        # dummies: head.next = most recent
        self.head.next, self.tail.prev = self.tail, self.head
        self._lock = threading.Lock()                   # get() also mutates order -> must lock

    def _remove(self, n):  n.prev.next, n.next.prev = n.next, n.prev
    def _add_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n; self.head.next = n

    def get(self, key):
        with self._lock:
            n = self.map.get(key)
            if n is None: return None
            self._remove(n); self._add_front(n)
            return n.val

    def put(self, key, val):
        with self._lock:
            n = self.map.get(key)
            if n:
                n.val = val; self._remove(n); self._add_front(n); return
            if len(self.map) == self.cap:
                lru = self.tail.prev; self._remove(lru); del self.map[lru.key]
            n = _Node(key, val); self.map[key] = n; self._add_front(n)`},
{t:'code',level:'x',title:'Rate limiter LLD: two strategies behind one interface',lang:'python',code:`
import threading, time
from abc import ABC, abstractmethod
from collections import deque

class RateLimiter(ABC):
    @abstractmethod
    def allow(self, key: str) -> bool: ...

class TokenBucketLimiter(RateLimiter):
    def __init__(self, capacity: int, refill_per_sec: float, clock=time.monotonic):
        self.cap, self.rate, self.clock = capacity, refill_per_sec, clock
        self.buckets: dict[str, list] = {}               # key -> [tokens, last_ts]
        self._lock = threading.Lock()
    def allow(self, key):
        now = self.clock()
        with self._lock:
            tokens, last = self.buckets.get(key, [self.cap, now])
            tokens = min(self.cap, tokens + (now - last) * self.rate)   # lazy refill
            ok = tokens >= 1
            self.buckets[key] = [tokens - 1 if ok else tokens, now]
            return ok

class SlidingWindowLogLimiter(RateLimiter):
    def __init__(self, limit: int, window_s: float, clock=time.monotonic):
        self.limit, self.win, self.clock = limit, window_s, clock
        self.logs: dict[str, deque] = {}
        self._lock = threading.Lock()
    def allow(self, key):
        now = self.clock()
        with self._lock:
            q = self.logs.setdefault(key, deque())
            while q and q[0] <= now - self.win: q.popleft()
            if len(q) < self.limit:
                q.append(now); return True
            return False`},
{t:'text',level:'x',title:'Expert · What interviewers push on',html:`
<ul>
<li><b>Lock granularity:</b> one global lock is correct but serialises all keys. Use <b>lock striping</b> (N locks, pick by <code>hash(key) % N</code>) or a lock per key (created under a global lock) for throughput.</li>
<li><b>Unbounded memory:</b> the buckets dict grows with every new key (every IP). Evict idle keys: store buckets in an LRU of fixed size, or sweep keys whose bucket is full and idle (a full bucket is the same as a missing one).</li>
<li><b>Testing:</b> inject a fake clock so tests control time: allow capacity bursts, then reject, advance clock 1 s, expect <code>rate</code> more. Concurrency test: 50 threads × 100 calls must allow exactly the expected count.</li>
<li><b>Distributed version:</b> state moves to Redis with an atomic Lua script (session 8). The class interface stays the same: a <code>RedisTokenBucketLimiter(RateLimiter)</code> — Dependency Inversion pays off.</li>
<li><b>LRU extras:</b> TTL per entry (store expiry, check on get), size-based capacity (sum of value sizes), and a read-heavy variant that samples recency (approximate LRU, as Redis does) to avoid locking on every read.</li>
<li><b>asyncio:</b> in async code use <code>asyncio.Lock</code>, and never hold a lock across an <code>await</code> of slow I/O.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Why must get() take the lock in an LRU cache, even though it only "reads"?',a:'It moves the node to the front, changing the linked list. Two concurrent gets can corrupt the pointers. In an LRU, every operation is a write to the recency order.'},
{q:'Two gates park in the same spot. Name the bug and two fixes.',a:'A check-then-act race condition. Fix with a lock around find-and-take, or an atomic conditional update (compare-and-set) on the spot, e.g. a database UPDATE ... WHERE vehicle IS NULL.'},
{q:'Token bucket vs sliding window: when each?',a:'Token bucket: allows controlled bursts, O(1) memory per key, the common API default. Sliding window log: exact limits (no burst beyond the limit in any window), but memory grows with the limit; use the sliding-window counter for an approximate, cheap version.'},
]}
]});
