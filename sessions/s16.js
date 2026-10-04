COURSE.add({id:'s16',n:16,part:'C',track:'LLD',
title:'Design patterns II: behavioural',
goal:'Use Strategy, Observer, State, Command, Chain of Responsibility and Template Method to keep behaviour flexible and code readable.',
outcomes:['Swap algorithms with Strategy','Decouple events from reactions with Observer','Model lifecycles with State instead of flag soup','Queue, log and undo actions with Command'],
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
  {q:'When stock drops below 10, notify the buyer team, the dashboard and the reorder job.',opts:['Strategy','Observer'],a:1}]}]},

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
  {tag:'Template method',title:'Fixed skeleton, custom steps',body:'<pre><code>class DataExport(ABC):\n    def run(self):               # the fixed order\n        rows = self.fetch()\n        rows = self.clean(rows)\n        self.write(rows)\n\n    def clean(self, rows): return rows   # optional hook\n\n    @abstractmethod\n    def fetch(self): ...\n    @abstractmethod\n    def write(self, rows): ...</code></pre><p>Subclasses fill in steps; the order cannot be broken. Cost: inheritance-based, less flexible than Strategy.</p>'}]}]},

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
 {t:'task',title:'Homework',items:['Model an online order lifecycle with the State pattern: Created, Paid, Shipped, Delivered, Cancelled. Write cancel() for each state.']}]}
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
