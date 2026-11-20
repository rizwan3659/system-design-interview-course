COURSE.addDeep('s13',{title:'Deep dive: OOP, UML and the LLD interview, beginner to expert',lead:'From "what is a class" to modelling responsibilities, composition, UML relationships and how an LLD round is graded.',blocks:[
{t:'text',level:'f',title:'Beginner · Objects and classes',html:`
<p>A <b>class</b> is a blueprint; an <b>object</b> is one thing built from it. <code>Book</code> is a class; "Clean Code, copy #3" is an object. A class bundles <b>data</b> (fields: title, isbn) with <b>behaviour</b> (methods: borrow(), return_()).</p>
<p><b>HLD vs LLD:</b> high-level design draws services, databases and queues (boxes and arrows). Low-level design zooms into one service: which classes exist, what each is responsible for, how they talk, and the actual code.</p>
<p><b>The LLD loop:</b> (1) clarify requirements → (2) find entities (nouns) → (3) draw a class diagram → (4) apply patterns where change is expected → (5) code the core flow → (6) extend when the interviewer adds a requirement.</p>`},
{t:'text',level:'f',title:'Beginner · The four OOP pillars, with their purpose',html:`
<ul>
<li><b>Encapsulation — protect the rules.</b> Keep data private and change it only through methods that enforce rules. <code>account.withdraw(500)</code> checks the balance; <code>account.balance = -500</code> from anywhere breaks it.</li>
<li><b>Abstraction — hide the how.</b> Callers use <code>notifier.send(msg)</code> without knowing it is SMS or email.</li>
<li><b>Inheritance — share a true "is-a".</b> A <code>SavingsAccount</code> is an <code>Account</code>. Use only when the child can be used everywhere the parent is expected.</li>
<li><b>Polymorphism — one call, many behaviours.</b> <code>payment.pay(amount)</code> runs UPI, card or wallet logic depending on the object. It replaces long <code>if type == ...</code> chains.</li>
</ul>`},
{t:'code',level:'i',title:'Intermediate · Polymorphism instead of type checks',lang:'python',code:`
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    @abstractmethod
    def pay(self, amount: int) -> str: ...

class UPI(PaymentMethod):
    def __init__(self, vpa): self._vpa = vpa
    def pay(self, amount): return f"UPI {amount} to {self._vpa}"

class Card(PaymentMethod):
    def __init__(self, last4): self._last4 = last4
    def pay(self, amount): return f"Card ****{self._last4} charged {amount}"

def checkout(order_total: int, method: PaymentMethod):
    return method.pay(order_total)   # no if/elif on type; new methods need no edit here`},
{t:'text',level:'i',title:'Intermediate · Composition over inheritance',html:`
<p>Inheritance for every variation explodes: <code>ElectricAutomaticCar</code>, <code>PetrolManualCar</code>, <code>ElectricManualCar</code>… (engine types × gearbox types). Instead, a <code>Car</code> <b>has</b> an <code>Engine</code> and a <code>Gearbox</code>; plug in the parts. Behaviour can even change at runtime.</p>
<ul>
<li>Car and Engine → <b>has-a</b> (composition).</li>
<li>SavingsAccount and Account → <b>is-a</b> (inheritance is fine).</li>
<li>Order and PaymentMethod → <b>has-a</b>, chosen at runtime.</li>
<li>Square and Rectangle with independent width/height setters → <b>not</b> a safe is-a (setting width on a square breaks it; see Liskov in session 14).</li>
</ul>
<p>Also: <code>class Stack(list)</code> leaks every list method (<code>insert(0, x)</code>). Wrap a list inside instead.</p>`},
{t:'table',level:'i',title:'Intermediate · UML relationships cheat sheet',head:['Relationship','Arrow','Meaning','Example'],rows:[
['Inheritance','Solid line, hollow triangle','is-a','SavingsAccount → Account'],
['Realization','Dashed line, hollow triangle','implements an interface','EmailNotifier ⇢ Notifier'],
['Composition','Filled diamond on the owner','owns; part dies with whole','University ◆— Department'],
['Aggregation','Hollow diamond on the owner','has; part lives independently','Team ◇— Player'],
['Association','Plain line / arrow','knows about, long-term','Library — Member'],
['Dependency','Dashed arrow','uses briefly (parameter)','ReportGenerator ⇢ Printer'],
],note:'Visibility: + public, − private, # protected. Multiplicity: 1, 0..1, *, 1..*.'},
{t:'text',level:'x',title:'Expert · How an LLD round is graded',html:`
<ul>
<li><b>Responsibilities in the right place.</b> Ask "who owns this rule?" The <i>max 3 loans</i> rule belongs to the Member (or a LoanPolicy), not to a UI or a God-class <code>LibrarySystem</code>.</li>
<li><b>Cohesive classes, few dependencies.</b> Each class has one clear job; depend on interfaces, inject them.</li>
<li><b>Patterns only where change is expected.</b> Name the axis of change ("pricing rules will change → Strategy"), not patterns for their own sake.</li>
<li><b>Working core code</b> in 20–30 minutes: model, main flow, one or two edge cases, plus a tiny demo.</li>
<li><b>Extensibility test:</b> when the interviewer adds a requirement, show which class you add and which you do <i>not</i> touch.</li>
<li><b>Concurrency awareness:</b> point out shared mutable state and how you protect it.</li>
<li><b>Python specifics:</b> use <code>abc.ABC</code> for interfaces, <code>@dataclass</code> for value objects, <code>Enum</code> for states/types, type hints, and keep fields "private" with a leading underscore.</li>
</ul>`},
{t:'code',level:'x',title:'Expert · Library management core',lang:'python',code:`
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum

class CopyStatus(Enum): AVAILABLE = 1; LOANED = 2; LOST = 3

@dataclass
class BookCopy:
    copy_id: str
    isbn: str
    status: CopyStatus = CopyStatus.AVAILABLE

@dataclass
class Loan:
    copy: BookCopy
    member_id: str
    due: date

@dataclass
class Member:
    member_id: str
    max_loans: int = 3
    loans: list = field(default_factory=list)
    def can_borrow(self) -> bool:
        return len(self.loans) < self.max_loans          # the rule lives with its data

class Library:
    def __init__(self): self._copies: dict[str, BookCopy] = {}
    def add(self, c: BookCopy): self._copies[c.copy_id] = c
    def borrow(self, member: Member, copy_id: str, days=14) -> Loan:
        c = self._copies[copy_id]
        if c.status is not CopyStatus.AVAILABLE: raise ValueError("not available")
        if not member.can_borrow(): raise ValueError("loan limit reached")
        c.status = CopyStatus.LOANED
        loan = Loan(c, member.member_id, date.today() + timedelta(days=days))
        member.loans.append(loan)
        return loan`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Why separate Book and BookCopy?',a:'Book is the title (ISBN, author) shared by many physical copies; BookCopy is one item that can be loaned, lost or damaged. Reservations attach to Book ("any copy"), loans attach to a copy.'},
{q:'The interviewer adds "fines for late return". What changes?',a:'Add a FinePolicy interface (per-day, capped, waived for staff) used when a Loan is closed. Library.return_ asks the policy for an amount. Member/Book do not change. That is open/closed in practice.'},
{q:'Aggregation or composition: Order and OrderItems?',a:'Composition: order items have no meaning without their order and are deleted with it. Order and Customer is association/aggregation: the customer exists independently.'},
]}
]});
