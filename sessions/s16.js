COURSE.add({id:'s16',n:16,part:'C',track:'LLD',
title:'Design patterns II: behavioural',
goal:'Use Strategy, Observer, State, Command, Chain of Responsibility and Template Method to keep behaviour flexible and code readable.',
outcomes:['Swap algorithms with Strategy','Decouple events from reactions with Observer','Model lifecycles with State instead of flag soup','Queue, log and undo actions with Command'],
concept:'patterns',
tasks:[{t:'Complete the Pub/Sub LLD lab (Observer).',auto:'s16pubsub'},{t:'Complete the Task Scheduler LLD lab (Command + priority queue).',auto:'s16sched'},{t:'Rate yourself: can you choose between Strategy, State and Observer?',auto:'s16sum'}],
modules:[
{title:'Warm-up: recall session 15',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Coffee + milk + caramel priced by wrapping objects is…',opts:['Decorator','Builder'],a:0},
  {q:'Wrapping a vendor SDK to fit your interface is…',opts:['Adapter','Facade'],a:0},
  {q:'Choosing which subclass to create from input is…',opts:['Factory','Proxy'],a:0}]}]},

{title:'Strategy and Observer',tab:'Strategy + Observer',mins:30,out:'Two patterns coded',blocks:[
 {t:'code',title:'Strategy: swap the algorithm',code:`
from abc import ABC, abstractmethod

class FareStrategy(ABC):
    @abstractmethod
    def fare(self, km: float, minutes: float) -> float: ...

class NormalFare(FareStrategy):
    def fare(self, km, minutes): return 50 + 12 * km + 1 * minutes

class SurgeFare(FareStrategy):
    def __init__(self, multiplier: float): self.m = multiplier
    def fare(self, km, minutes): return NormalFare().fare(km, minutes) * self.m

class Trip:
    def __init__(self, km, minutes, pricing: FareStrategy):
        self.km, self.minutes, self.pricing = km, minutes, pricing

    def total(self):
        return round(self.pricing.fare(self.km, self.minutes), 2)

Trip(10, 25, NormalFare()).total()      # 195.0
Trip(10, 25, SurgeFare(1.5)).total()    # 292.5`,note:'Good: new pricing = new class; easy to test each. Cost: callers must pick the strategy (often via a factory).'},
 {t:'code',title:'Observer: tell everyone who cares',code:`
class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list] = {}

    def subscribe(self, event: str, handler):
        self._subscribers.setdefault(event, []).append(handler)

    def publish(self, event: str, payload):
        for handler in self._subscribers.get(event, []):
            handler(payload)

bus = EventBus()
bus.subscribe("order_placed", lambda o: print("email receipt for", o))
bus.subscribe("order_placed", lambda o: print("reserve stock for", o))
bus.subscribe("order_placed", lambda o: print("add loyalty points for", o))
bus.publish("order_placed", "order-42")`,note:'The order code does not know who listens. In HLD, the same idea becomes pub/sub across services (session 7). Cost: harder to trace "who reacts to what"; a slow handler blocks the rest unless handlers are async.'},
 {t:'mcq',items:[
  {q:'Sorting products by price, rating or distance, chosen by the user.',opts:['Strategy','Observer'],a:0},
  {q:'When stock drops below 10, notify the buyer team, the dashboard and the reorder job.',opts:['Strategy','Observer'],a:1}]},
 {t:'lldlab',id:'s16pubsub',title:'LLD lab · In-memory Pub/Sub',level:'i',concept:'patterns',intro:'Work through each stage. Write your own answer before revealing the solution.',stages:[{k:'Requirements',prompt:'Design an in-process publish/subscribe system.',hint:'Topics? Many subscribers? Unsubscribe? Ordering? Failures?',solution:'Publishers send messages to named topics; any number of subscribers per topic; subscribe/unsubscribe at any time; each subscriber receives messages in publish order; one failing subscriber must not stop the others.'},{k:'Identify objects',prompt:'List the classes (nouns) you need.',hint:'Who publishes, who listens, what connects them?',solution:'<b>Broker</b>, <b>Topic</b>, <b>Subscriber</b> (interface / callable), <b>Message</b>.'},{k:'Responsibilities',prompt:'For each class: what does it own, what does it do, who does it talk to?',hint:'Where does the subscriber list live?',solution:'Broker owns topics; Topic owns its subscriber list and delivers; Subscriber handles a message. This is the Observer pattern with the Topic as subject.'},{k:'Interface',prompt:'Write the public methods (names, inputs, outputs) before any implementation.',hint:'Minimal API.',solution:'<code>broker.subscribe(topic, fn) → token</code>, <code>broker.unsubscribe(token)</code>, <code>broker.publish(topic, msg) → delivered_count</code>.'},{k:'Implementation',prompt:'Implement the core in Python.',code:true,lang:'python',starter:`class Broker:
    def subscribe(self, topic, fn):
        ...
    def publish(self, topic, msg):
        ...
`,solution:`import itertools, threading
from collections import defaultdict

class Broker:
    def __init__(self):
        self._subs = defaultdict(dict)     # topic -> {token: fn}
        self._ids = itertools.count(1)
        self._lock = threading.Lock()
        self.errors = []

    def subscribe(self, topic, fn):
        with self._lock:
            token = (topic, next(self._ids))
            self._subs[topic][token] = fn
            return token

    def unsubscribe(self, token):
        with self._lock:
            self._subs[token[0]].pop(token, None)

    def publish(self, topic, msg):
        with self._lock:
            listeners = list(self._subs[topic].values())   # snapshot: safe if a handler unsubscribes
        delivered = 0
        for fn in listeners:
            try:
                fn(msg); delivered += 1
            except Exception as e:          # isolate failures
                self.errors.append((topic, e))
        return delivered`},{k:'Edge cases',prompt:'What inputs or situations could break it?',hint:'Think about empty, full, duplicate, concurrent and invalid inputs.',solution:'Publishing to a topic with no subscribers; a subscriber that unsubscribes (or subscribes) while handling a message; a slow subscriber blocking the publisher (use a queue per subscriber); a subscriber that raises; unsubscribing twice.'},{k:'Tests',prompt:'Write the test cases you would run (input → expected).',hint:'One happy path, one per edge case.',solution:'publish to empty topic → 0; two subscribers → both called once, in subscription order; unsubscribe → no longer called; raising subscriber → other subscriber still receives, error recorded; handler unsubscribing itself during publish → no crash.'}]}]},

{title:'State pattern and the vending machine',tab:'State',mins:30,out:'State diagram + code',lead:'When behaviour depends on a lifecycle stage, flags like <code>is_paid and not is_dispensing</code> multiply. Give each state a class that knows what each action means in that state.',blocks:[
 {t:'lab',fn:'vending',title:'Lab · Drive the vending machine',intro:'Press the buttons in any order. Only the current state decides what each action does.'},
 {t:'code',title:'The State pattern in code',code:`
from abc import ABC

class State(ABC):
    def insert_coin(self, m, amount): print("cannot insert now")
    def select(self, m, item): print("cannot select now")
    def dispense(self, m): print("cannot dispense now")
    def cancel(self, m): print("nothing to cancel")

class Idle(State):
    def insert_coin(self, m, amount):
        m.balance += amount
        m.state = HasMoney()

class HasMoney(State):
    def insert_coin(self, m, amount):
        m.balance += amount
    def select(self, m, item):
        price = m.prices[item]
        if m.stock[item] == 0:
            print("sold out")
        elif m.balance < price:
            print(f"insert {price - m.balance} more")
        else:
            m.balance -= price
            m.selected = item
            m.state = Dispensing()
            m.state.dispense(m)
    def cancel(self, m):
        print("refund", m.balance)
        m.balance = 0
        m.state = Idle()

class Dispensing(State):
    def dispense(self, m):
        m.stock[m.selected] -= 1
        print("here is your", m.selected, "change:", m.balance)
        m.balance, m.selected = 0, None
        m.state = Idle()

class VendingMachine:
    def __init__(self):
        self.state, self.balance, self.selected = Idle(), 0, None
        self.prices, self.stock = {"chips": 20, "cola": 40}, {"chips": 5, "cola": 0}

    def insert_coin(self, amount): self.state.insert_coin(self, amount)
    def select(self, item): self.state.select(self, item)
    def cancel(self): self.state.cancel(self)`},
 {t:'teacher',items:['Ask the class to add a MAINTENANCE state where every action says "out of service". With State, it is one new class; with flags, every method changes.']}]},

{title:'Command, Chain of Responsibility, Template Method',tab:'More patterns',mins:20,out:'Three patterns recognised',blocks:[
 {t:'cards',items:[
  {tag:'Command',title:'An action as an object',body:'<pre><code>class AddText:\n    def __init__(self, doc, text): self.doc, self.text = doc, text\n    def execute(self): self.doc.append(self.text)\n    def undo(self): self.doc.remove_last(len(self.text))\n\nhistory = []\ncmd = AddText(doc, "hello")\ncmd.execute(); history.append(cmd)\nhistory.pop().undo()        # undo</code></pre><p>Use for undo/redo, queues of jobs, macros, audit logs.</p>'},
  {tag:'Chain of responsibility',title:'Pass along until handled',body:'<pre><code>class Handler:\n    def __init__(self, nxt=None): self.nxt = nxt\n    def handle(self, req):\n        return self.nxt.handle(req) if self.nxt else req\n\nclass Auth(Handler):\n    def handle(self, req):\n        if not req.get("user"): raise PermissionError("login")\n        return super().handle(req)\n\nclass RateLimit(Handler):\n    def handle(self, req):\n        if too_many(req["user"]): raise RuntimeError("429")\n        return super().handle(req)\n\npipeline = Auth(RateLimit(Validate()))\npipeline.handle(request)</code></pre><p>Middleware pipelines, support-ticket escalation, ATM note dispensing (₹500 → ₹200 → ₹100).</p>'},
  {tag:'Template method',title:'Fixed skeleton, custom steps',body:'<pre><code>class DataExport(ABC):\n    def run(self):               # the fixed order\n        rows = self.fetch()\n        rows = self.clean(rows)\n        self.write(rows)\n\n    def clean(self, rows): return rows   # optional hook\n\n    @abstractmethod\n    def fetch(self): ...\n    @abstractmethod\n    def write(self, rows): ...</code></pre><p>Subclasses fill in steps; the order cannot be broken. Cost: inheritance-based, less flexible than Strategy.</p>'}]},
 {t:'lldlab',id:'s16sched',title:'LLD lab · Task scheduler',level:'x',concept:'patterns',intro:'Work through each stage. Write your own answer before revealing the solution.',stages:[{k:'Requirements',prompt:'Design a scheduler that runs tasks at a given time, optionally repeating.',hint:'One-off vs repeating? Priorities? Cancel? Many workers?',solution:'Schedule a task to run at time T or every N seconds; cancel by id; tasks due at the same time run by priority; a failing task does not stop the scheduler; workers run tasks concurrently.'},{k:'Identify objects',prompt:'List the classes (nouns) you need.',hint:'What is the "thing to run" and what orders them?',solution:'<b>Task</b> (Command: id, run_at, interval, priority, action), <b>Scheduler</b>, a <b>min-heap</b> ordered by (run_at, priority), <b>Clock</b> (injected for tests), <b>Worker</b> pool.'},{k:'Responsibilities',prompt:'For each class: what does it own, what does it do, who does it talk to?',hint:'Who owns time, who owns ordering?',solution:'Scheduler owns the heap and decides what is due using the Clock. Task encapsulates the action (Command pattern) so the scheduler never knows what it does. Repeating tasks are re-inserted with run_at + interval.'},{k:'Interface',prompt:'Write the public methods (names, inputs, outputs) before any implementation.',hint:'API.',solution:'<code>schedule(action, run_at, interval=None, priority=0) → id</code>, <code>cancel(id)</code>, <code>run_due()</code> (runs everything due now; called by a loop or tests).'},{k:'Implementation',prompt:'Implement the core in Python.',code:true,lang:'python',starter:`import heapq

class Scheduler:
    def __init__(self, clock):
        self.clock = clock
        self.heap = []
`,solution:`import heapq, itertools

class Scheduler:
    def __init__(self, clock):
        self.clock = clock                     # callable returning "now" (fake in tests)
        self.heap, self.cancelled = [], set()
        self.ids = itertools.count(1)
        self.failures = []

    def schedule(self, action, run_at, interval=None, priority=0):
        tid = next(self.ids)
        heapq.heappush(self.heap, (run_at, priority, tid, action, interval))
        return tid

    def cancel(self, tid):
        self.cancelled.add(tid)               # lazy delete: skipped when popped

    def run_due(self):
        now, ran = self.clock(), []
        while self.heap and self.heap[0][0] <= now:
            run_at, prio, tid, action, interval = heapq.heappop(self.heap)
            if tid in self.cancelled:
                continue
            try:
                action(); ran.append(tid)
            except Exception as e:
                self.failures.append((tid, e))
            if interval:                        # repeating: schedule the next run
                heapq.heappush(self.heap, (run_at + interval, prio, tid, action, interval))
        return ran`},{k:'Edge cases',prompt:'What inputs or situations could break it?',hint:'Think about empty, full, duplicate, concurrent and invalid inputs.',solution:'Two tasks due at the same instant (priority, then id as tie-break); cancelling a repeating task; a task that raises; a task that takes longer than its interval (skip or queue runs?); the scheduler was paused and many runs are overdue (catch up or skip); clock going backwards.'},{k:'Tests',prompt:'Write the test cases you would run (input → expected).',hint:'One happy path, one per edge case.',solution:'task at t=5 not run at t=4, run at t=5; same time priorities 1 and 0 → priority 0 first; repeating every 10 from t=0 → runs at 0, 10, 20; cancel → never runs; raising task → recorded in failures, next task still runs.'}]}]},

{title:'Pattern quiz',tab:'Quiz',mins:15,out:'8 scenarios matched',blocks:[
 {t:'mcq',cols:2,items:[
  {q:'Text editor with undo and redo.',opts:['Command','Observer','State'],a:0},
  {q:'An order moves Created → Paid → Shipped → Delivered, and cancel means different things in each.',opts:['State','Strategy'],a:0},
  {q:'Discount rules chosen per campaign.',opts:['Strategy','Chain of responsibility'],a:0},
  {q:'Expense approval: manager up to ₹10K, director up to ₹1L, CFO above.',opts:['Chain of responsibility','Template method'],a:0},
  {q:'Stock price changes must update 5 widgets.',opts:['Observer','Command'],a:0},
  {q:'All report exports follow fetch → clean → write, but sources differ.',opts:['Template method','Decorator'],a:0},
  {q:'Elevator behaves differently when moving, idle or under maintenance.',opts:['State','Facade'],a:0},
  {q:'Queue user actions to replay later when back online.',opts:['Command','Singleton'],a:0}]}]},

{title:'Review',tab:'Review',mins:15,out:'Flashcards + homework',blocks:[
 {t:'flash',items:[['Strategy?','Swap an algorithm behind an interface.'],['Observer?','Subscribers react to published events.'],['State?','One class per lifecycle state; the state handles each action.'],['Command?','An action as an object: queue, log, undo.'],['Chain of responsibility?','Pass a request along handlers until one handles it.'],['Template method?','Fixed algorithm skeleton; subclasses fill steps.'],['Strategy vs State?','Strategy is chosen by the client; State changes itself as events happen.']]},
 {t:'task',title:'Homework',items:['Model an online order lifecycle with the State pattern: Created, Paid, Shipped, Delivered, Cancelled. Write cancel() for each state.']},
 {t:'recall',title:'Active recall',items:[['Strategy vs State?','Strategy: the caller picks an interchangeable algorithm. State: the object changes behaviour as its internal state changes.'],['Observer solves…','Notifying many dependents of an event without the subject knowing who they are.'],['Command solves…','Wrapping a request as an object: queue it, schedule it, log it, undo it.'],['Chain of Responsibility solves…','Passing a request along handlers until one handles it (middleware, approvals).'],['Template Method solves…','Fixing the steps of an algorithm while letting subclasses fill in some steps.']]},
 {t:'summary',id:'s16sum',title:'Session summary',learned:['<b>Why behavioural patterns exist:</b> keep behaviour flexible without conditionals everywhere','<b>When to use Observer:</b> one event, many independent reactions','<b>When not to:</b> when a direct call is clearer and there is one listener','<b>Trade-offs:</b> indirection and harder tracing','<b>Interview questions:</b> vending machine (State), notifications (Observer), scheduler (Command)'],explain:'Explain when you would choose Strategy, State or Observer, with one example each.'}]}
],
labs:{
 vending(el,api){
  const m={state:'Idle',bal:0,stock:{chips:5,cola:0,juice:2},price:{chips:20,cola:40,juice:30},log:[]};
  const S={Idle:{coin:(a)=>{m.bal+=a;m.state='HasMoney';return `Coin ₹${a} accepted → HasMoney`},sel:()=>'Idle: insert money first',cancel:()=>'Idle: nothing to cancel'},
   HasMoney:{coin:(a)=>{m.bal+=a;return `Coin ₹${a} added (balance ₹${m.bal})`},sel:(it)=>{const p=m.price[it];if(!m.stock[it])return `${it} is sold out (state stays HasMoney)`;if(m.bal<p)return `${it} costs ₹${p}; insert ₹${p-m.bal} more`;m.bal-=p;m.stock[it]--;const ch=m.bal;m.bal=0;m.state='Idle';return `Dispensing → here is your ${it}, change ₹${ch} → Idle`},cancel:()=>{const r=m.bal;m.bal=0;m.state='Idle';return `Refund ₹${r} → Idle`}}};
  el.innerHTML=`<div class="grid2" style="align-items:start"><div class="col" style="gap:10px"><div class="row"><span class="small muted">State:</span><span class="tag" data-st></span><span class="small muted">Balance:</span><b class="mono" data-bal></b></div><div class="row"><button class="btn" data-a="coin" data-v="10">Insert ₹10</button><button class="btn" data-a="coin" data-v="20">Insert ₹20</button></div><div class="row"><button class="btn" data-a="sel" data-v="chips">Select chips ₹20</button><button class="btn" data-a="sel" data-v="juice">Select juice ₹30</button><button class="btn" data-a="sel" data-v="cola">Select cola ₹40</button></div><div class="row"><button class="btn danger" data-a="cancel">Cancel</button></div><p class="small muted" data-stock></p></div><div class="log" data-log aria-live="polite"></div></div><div class="svgbox"><svg viewBox="0 0 560 120" role="img" aria-label="Vending machine states"><defs><marker id="vmah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0 0L10 5L0 10z"/></marker></defs><g class="node" data-n="Idle"><rect x="20" y="40" width="130" height="44" rx="22"/><text x="85" y="67">Idle</text></g><g class="node" data-n="HasMoney"><rect x="215" y="40" width="130" height="44" rx="22"/><text x="280" y="67">HasMoney</text></g><g class="node" data-n="Dispensing"><rect x="410" y="40" width="130" height="44" rx="22"/><text x="475" y="67">Dispensing</text></g><path class="edge" d="M150 54H215" marker-end="url(#vmah)"/><text class="elabel" x="160" y="46">coin</text><path class="edge" d="M345 54H410" marker-end="url(#vmah)"/><text class="elabel" x="352" y="46">select ok</text><path class="edge" d="M475 84V104H85V84" marker-end="url(#vmah)"/><text class="elabel" x="250" y="100">dispensed</text><path class="edge" d="M280 40V20H85V40" marker-end="url(#vmah)"/><text class="elabel" x="160" y="16">cancel / refund</text></svg></div>`;
  const draw=()=>{api.$('[data-st]',el).textContent=m.state;api.$('[data-bal]',el).textContent='₹'+m.bal;api.$('[data-stock]',el).textContent='Stock: '+Object.entries(m.stock).map(([k,v])=>k+' '+v).join(' · ');
   api.$$('.node',el).forEach(n=>n.classList.toggle('okhit',n.dataset.n===m.state));api.$('[data-log]',el).innerHTML=m.log.length?m.log.slice(-10).map(l=>`<div>${l}</div>`).join(''):'<span class="muted">Actions appear here.</span>'};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const fn=S[m.state][b.dataset.a];const msg=fn(b.dataset.a==='coin'?+b.dataset.v:b.dataset.v);m.log.push(msg);draw()});draw()}
}});
