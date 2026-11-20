COURSE.addDeep('s16',{title:'Deep dive: behavioural patterns, beginner to expert',lead:'Strategy, Observer, State, Command, Chain of Responsibility and Template Method, with code and the threading and design pitfalls interviewers ask about.',blocks:[
{t:'text',level:'f',title:'Beginner · Six patterns in one line each',html:`
<ul>
<li><b>Strategy</b> — swap the algorithm: sort by price, rating or distance.</li>
<li><b>Observer</b> — tell everyone who cares: stock falls below 10 → notify buyers, dashboard, reorder job.</li>
<li><b>State</b> — behaviour depends on the current state: a vending machine reacts differently to "insert coin" when idle vs dispensing.</li>
<li><b>Command</b> — an action as an object: so it can be queued, logged, undone, replayed.</li>
<li><b>Chain of Responsibility</b> — pass a request along a chain until someone handles it: expense approval manager → director → CFO.</li>
<li><b>Template Method</b> — fixed skeleton, custom steps: every export does fetch → clean → write; sources differ.</li>
</ul>`},
{t:'code',level:'i',title:'Strategy and Observer',lang:'python',code:`
# Strategy: pricing rules chosen per campaign
from typing import Protocol
class Pricing(Protocol):
    def price(self, base: float) -> float: ...
class Regular:
    def price(self, b): return b
class Festive:
    def price(self, b): return b * 0.8
class Checkout:
    def __init__(self, pricing: Pricing): self.pricing = pricing   # swap at runtime
    def total(self, items): return sum(self.pricing.price(i.price) for i in items)

# Observer: subject keeps a list of subscribers
class Stock:
    def __init__(self): self._subs, self._qty = [], 0
    def subscribe(self, fn): self._subs.append(fn)
    def set_qty(self, q):
        self._qty = q
        if q < 10:
            for fn in list(self._subs):
                fn(q)            # each observer reacts; the subject knows none of them
stock = Stock(); stock.subscribe(lambda q: print("reorder", q)); stock.set_qty(4)`},
{t:'code',level:'i',title:'State: the vending machine',lang:'python',code:`
class State:
    def insert(self, m, amt): raise ValueError("not allowed now")
    def select(self, m, item): raise ValueError("not allowed now")

class Idle(State):
    def insert(self, m, amt): m.balance += amt; m.state = HasMoney()

class HasMoney(State):
    def insert(self, m, amt): m.balance += amt
    def select(self, m, item):
        price = m.prices[item]
        if m.stock[item] == 0: raise ValueError("sold out")
        if m.balance < price: raise ValueError("insert more")
        m.state = Dispensing(); m.stock[item] -= 1
        change, m.balance = m.balance - price, 0
        m.state = Idle()
        return item, change

class Dispensing(State): pass       # rejects everything until done

class VendingMachine:
    def __init__(self, prices, stock):
        self.prices, self.stock, self.balance, self.state = prices, stock, 0, Idle()
    def insert(self, amt): return self.state.insert(self, amt)
    def select(self, item): return self.state.select(self, item)`},
{t:'code',level:'i',title:'Command, Chain of Responsibility, Template Method',lang:'python',code:`
# Command with undo
class InsertText:
    def __init__(self, doc, pos, text): self.doc, self.pos, self.text = doc, pos, text
    def do(self): self.doc.insert(self.pos, self.text)
    def undo(self): self.doc.delete(self.pos, len(self.text))
class Editor:
    def __init__(self): self.undo_stack, self.redo_stack = [], []
    def run(self, cmd): cmd.do(); self.undo_stack.append(cmd); self.redo_stack.clear()
    def undo(self):
        c = self.undo_stack.pop(); c.undo(); self.redo_stack.append(c)

# Chain of Responsibility: expense approval
class Approver:
    def __init__(self, name, limit, nxt=None): self.name, self.limit, self.nxt = name, limit, nxt
    def approve(self, amount):
        if amount <= self.limit: return self.name
        if self.nxt: return self.nxt.approve(amount)
        raise ValueError("nobody can approve")
chain = Approver("manager", 10_000, Approver("director", 100_000, Approver("cfo", float("inf"))))

# Template Method: fixed order, subclasses fill steps
class Export:
    def run(self):                       # the template: do not override
        return self.write(self.clean(self.fetch()))
    def clean(self, rows): return [r for r in rows if r]
class CsvSalesExport(Export):
    def fetch(self): return db.sales()
    def write(self, rows): return to_csv(rows)`},
{t:'text',level:'x',title:'Expert · Pitfalls and distinctions',html:`
<ul>
<li><b>State vs Strategy:</b> same structure (delegate to an object), different intent. Strategy is chosen by the client and rarely changes; State objects <i>change themselves</i> as events happen and encode allowed transitions. State replaces big <code>if state == ...</code> blocks repeated in every method.</li>
<li><b>Observer pitfalls:</b> memory leaks (subscribers never unsubscribed — use weak references or explicit unsubscribe); a slow or failing observer blocks the subject (call observers asynchronously or catch errors per observer); order of notification is not guaranteed; re-entrancy (an observer changes the subject during notification). Across services, Observer becomes pub/sub with a message broker.</li>
<li><b>Thread-safe pub/sub:</b> protect the subscriber list with a lock, copy it before notifying, and deliver via per-subscriber queues so one slow subscriber cannot block others.</li>
<li><b>Command</b> gives you queues (offline actions replayed later), audit logs, retries and macro recording. Undo needs each command to store enough to reverse itself (or a memento of prior state).</li>
<li><b>Chain of Responsibility</b> is how web middleware works (auth → rate limit → logging → handler). Make sure the chain always ends somewhere (a default handler).</li>
<li><b>Template Method vs Strategy:</b> Template uses inheritance (fixed skeleton in the parent); Strategy uses composition (inject the variable part). Prefer Strategy when steps vary independently or must change at runtime.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'An order moves Created → Paid → Shipped → Delivered, and cancel means something different in each. Pattern?',a:'State. Each state class implements cancel(): Created → just cancel; Paid → refund then cancel; Shipped → start a return; Delivered → not allowed (use return flow). Illegal transitions raise errors in one place.'},
{q:'Elevator behaves differently when moving, idle or under maintenance. Pattern?',a:'State, with the scheduling rule (which floor next) as a separate Strategy. Two axes of change → two patterns.'},
{q:'Queue user actions to replay when back online. Pattern and caveat?',a:'Command objects serialised to a local queue and replayed in order. Caveat: the server must handle them idempotently (each command carries a unique id) and handle conflicts if data changed meanwhile.'},
]}
]});
