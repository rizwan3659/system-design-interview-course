COURSE.add({id:'s13',n:13,part:'C',track:'LLD',
title:'OOP foundations, UML and the LLD interview',
goal:'Switch from boxes-and-arrows to classes-and-methods: model a problem with objects, draw it in UML, and write the core in Python.',
outcomes:['Explain how an LLD round differs from HLD','Use encapsulation, abstraction, inheritance and polymorphism with purpose','Prefer composition when "has-a" fits','Read and draw UML class diagrams with the right relationships'],
concept:'oop',
tasks:[{t:'Explain the difference between an HLD box and an LLD class.'},{t:'Turn the notification-service HLD into classes and interfaces.',auto:'s13map'},{t:'Draw a UML class diagram for the library problem.'},{t:'Answer the LLD interview checkpoint.',auto:'s13cp'},{t:'Rate yourself: can you go from HLD component to classes without notes?',auto:'s13sum'}],
modules:[
{title:'HLD vs LLD, and the LLD loop',tab:'LLD round',mins:10,out:'Know the LLD loop',lead:'HLD asks "which services and stores?". LLD asks "which classes, what do they own, how do they talk, and does the code survive the next requirement?"',blocks:[
 {t:'table',head:['','HLD round','LLD round'],rows:[['Output','Architecture diagram','Class diagram + working core code'],['Scale','Millions of users, many machines','One process; objects and methods'],['Graded on','Trade-offs, scaling, failures','Clean responsibilities, extensibility, patterns used for a reason, correctness'],['Typical prompts','Design YouTube, Uber','Design a parking lot, elevator, Splitwise, LRU cache']]},
 {t:'cards',title:'The LLD loop (use it from now on)',items:[
  {tag:'1 · 5 min',title:'Requirements',sub:'What must it do?',body:'<p>List use cases and constraints. Agree what is out of scope. <span class="say">"Can a vehicle take two spots? Do we need payments?"</span></p>'},
  {tag:'2 · 5 min',title:'Entities',sub:'Nouns → classes',body:'<p>Underline nouns in the requirements: they become candidate classes. Verbs become methods.</p>'},
  {tag:'3 · 10 min',title:'Class diagram',sub:'Who owns what',body:'<p>Draw classes, key fields and methods, and relationships (is-a, has-a, uses).</p>'},
  {tag:'4 · 5 min',title:'Patterns',sub:'Only where they help',body:'<p>Strategy for swappable rules, State for lifecycles, Factory for creation, Observer for notifications.</p>'},
  {tag:'5 · 15–20 min',title:'Code the core',sub:'Runnable, readable',body:'<p>Write the main classes and the 2–3 key methods. Names matter. Handle the edge cases you listed.</p>'},
  {tag:'6 · 5 min',title:'Extend',sub:'New requirement',body:'<p>The interviewer adds a feature. Good design means adding a class, not editing ten.</p>'}]},
 {t:'lldmap',id:'s13map',title:'HLD → LLD · From boxes to classes',level:'i',hld:{nodes:['client@0,1:Client apps','api@1,1:Notification API','queue@2,1:Queue','worker@3,1:Notification workers','provider@4,0:Email provider','provider2@4,1:SMS provider','provider3@4,2:Push provider'],edges:['client>api','api>queue','queue>worker','worker>provider','worker>provider2','worker>provider3']},
  focus:'Zoom into the <b>Notification workers</b> box. Which of these become classes or interfaces in your code? Select them, then check.',
  pool:[['NotificationService',1,'Entry point that validates a request, picks channels and enqueues work.'],['Notification',1,'A value object: recipient, template, payload, priority, idempotency key.'],['Channel (interface)',1,'<code>send(notification) → Result</code>; lets you add channels without editing callers (open/closed).'],['EmailChannel',1,'Implements Channel; formats email and calls an email Provider.'],['SMSChannel',1,'Implements Channel for SMS.'],['PushChannel',1,'Implements Channel for push.'],['Provider (interface)',1,'Wraps a vendor API (SES, Twilio, FCM) so channels can switch vendors: adapter pattern.'],['RetryPolicy',1,'Strategy deciding whether and when to retry (exponential backoff, max attempts).'],['KafkaBroker',0,'Infrastructure you run or rent, not a class you write. Your code depends on a small Queue interface instead.'],['LoadBalancer',0,'Infrastructure in front of the API, not part of the worker’s object model.'],['Database server',0,'Infrastructure. You would write a NotificationRepository class that talks to it.'],['TCP connection',0,'Handled by libraries.']],
  mapping:[['Notification API','NotificationService, Notification, PreferenceChecker'],['Queue','Queue interface (enqueue/dequeue), Message serializer'],['Notification workers','Worker, Channel + EmailChannel / SMSChannel / PushChannel, RetryPolicy, DeadLetterHandler'],['Providers','Provider interface + SesProvider / TwilioProvider / FcmProvider (adapters)'],['Delivery status','NotificationRepository, DeliveryStatus (enum)']]},
 {t:'uml',title:'UML · The notification worker',w:760,h:330,classes:[{id:'ns',name:'NotificationService',x:20,y:20,methods:['send(n: Notification)'],note:'Validates, applies preferences, enqueues.'},{id:'ch',name:'Channel',kind:'interface',x:300,y:20,methods:['send(n) → Result'],note:'One implementation per channel type.'},{id:'em',name:'EmailChannel',x:200,y:200,methods:['send(n) → Result'],note:'Builds the email and calls a Provider.'},{id:'sm',name:'SMSChannel',x:400,y:200,methods:['send(n) → Result'],note:'Builds the SMS and calls a Provider.'},{id:'rp',name:'RetryPolicy',x:560,y:20,methods:['next_delay(attempt) → s | None'],note:'Strategy: exponential backoff with a maximum.'}],rels:[{from:'em',to:'ch',type:'impl'},{from:'sm',to:'ch',type:'impl'},{from:'ns',to:'ch',type:'uses'},{from:'ns',to:'rp',type:'uses'}]}]},

{title:'The four OOP pillars, with purpose',tab:'OOP pillars',mins:25,out:'One code example per pillar',blocks:[
 {t:'cards',items:[
  {tag:'Encapsulation',title:'Protect the rules',sub:'Data + the rules that guard it',body:'<p>Keep state private and change it only through methods that enforce rules.</p><pre><code>class BankAccount:\n    def __init__(self):\n        self._balance = 0          # "private" by convention\n\n    def withdraw(self, amount):\n        if amount &lt;= 0 or amount &gt; self._balance:\n            raise ValueError("invalid amount")\n        self._balance -= amount</code></pre><p>Nobody can set a negative balance from outside.</p>'},
  {tag:'Abstraction',title:'Hide the how',sub:'Show what, not how',body:'<p>Callers use a simple interface; details stay inside.</p><pre><code>from abc import ABC, abstractmethod\n\nclass PaymentMethod(ABC):\n    @abstractmethod\n    def pay(self, amount: int) -&gt; bool: ...</code></pre><p>Checkout calls <code>pay()</code> without knowing if it is UPI, card or wallet.</p>'},
  {tag:'Inheritance',title:'Share a true "is-a"',sub:'Child is a kind of parent',body:'<pre><code>class Vehicle:\n    def __init__(self, plate): self.plate = plate\n\nclass Car(Vehicle): pass\nclass Bike(Vehicle): pass</code></pre><p>Use it only when the child can be used anywhere the parent is expected (more in session 14).</p>'},
  {tag:'Polymorphism',title:'One call, many behaviours',sub:'Same method, different classes',body:'<pre><code>class Upi(PaymentMethod):\n    def pay(self, amount): return upi_api.collect(amount)\n\nclass Card(PaymentMethod):\n    def pay(self, amount): return card_api.charge(amount)\n\nfor method in [Upi(), Card()]:\n    method.pay(500)        # each does its own thing</code></pre><p>No <code>if type == "upi"</code> chains.</p>'}]},
 {t:'reveal',cols:2,title:'Spot the pillar being broken',items:[
  {q:'<code>account.balance = -500</code> works from anywhere in the code.',a:'Encapsulation: state is public and unguarded. Make it private and expose <code>withdraw</code>/<code>deposit</code>.'},
  {q:'<code>if p.type == "upi": ... elif p.type == "card": ...</code> appears in 6 files.',a:'Polymorphism (and abstraction): give each payment type a class with <code>pay()</code>; adding a type then needs no edits elsewhere.'},
  {q:'<code>class Stack(list)</code>: callers can now call <code>insert(0, x)</code> on your stack.',a:'Inheritance misused: a stack is not a list. Wrap a list inside instead (composition).'}]}]},

{title:'Composition over inheritance',tab:'Composition',mins:20,out:'Choose is-a or has-a',lead:'Inheritance fixes behaviour at class-definition time. Composition plugs behaviour in as objects, so it can vary and combine.',blocks:[
 {t:'code',title:'Inheritance explosion',code:`
class Duck: ...
class FlyingDuck(Duck): ...
class QuackingDuck(Duck): ...
class FlyingQuackingDuck(Duck): ...
class RubberDuck(Duck): ...          # cannot fly, squeaks
# every new combination needs a new subclass`},
 {t:'code',title:'Composition: plug in behaviours',code:`
class FlyWithWings:
    def fly(self): return "flapping"

class NoFly:
    def fly(self): return "cannot fly"

class Duck:
    def __init__(self, name, fly_behaviour):
        self.name = name
        self.flyer = fly_behaviour          # has-a

    def fly(self):
        return f"{self.name}: {self.flyer.fly()}"

mallard = Duck("Mallard", FlyWithWings())
rubber = Duck("Rubber duck", NoFly())
rubber.flyer = FlyWithWings()               # behaviour can even change at runtime`,note:'This is the Strategy pattern, covered properly in session 16.'},
 {t:'mcq',title:'Is-a or has-a?',items:[
  {q:'Car and Engine',opts:['Car is-a Engine','Car has-a Engine'],a:1},
  {q:'SavingsAccount and Account',opts:['is-a','has-a'],a:0},
  {q:'Order and Payment method',opts:['Order is-a PaymentMethod','Order has-a / uses PaymentMethod'],a:1},
  {q:'Square and Rectangle (setters for width and height)',opts:['Square is-a Rectangle, safely','Risky: setting width breaks the square rule'],a:1,why:'The classic Liskov violation (session 14).'}]}]},

{title:'UML class diagrams',tab:'UML',mins:25,out:'Read and draw a class diagram',lead:'A class box has three parts: name, fields, methods. <code>+</code> public, <code>-</code> private. Lines show how classes relate.',blocks:[
 {t:'table',title:'Relationship cheat sheet',head:['Relationship','Meaning','Arrow','Example'],rows:[['Inheritance','is-a','Hollow triangle at parent','Car → Vehicle'],['Implementation','fulfils an interface','Dashed line, hollow triangle','Upi ⇢ PaymentMethod'],['Composition','owns; part dies with whole','Filled diamond at owner','House ◆— Room'],['Aggregation','has; part lives on','Hollow diamond at owner','Team ◇— Player'],['Association','knows about','Line / open arrow','Loan → Member'],['Dependency','uses temporarily','Dashed open arrow','Checkout ⇢ Receipt']]},
 {t:'uml',title:'Example: a library system (click a class)',classes:[
  {id:'lib',name:'Library',x:20,y:20,fields:['- books: dict[str, Book]','- members: dict[int, Member]'],methods:['+ add_book(book)','+ checkout(member_id, isbn): Loan','+ return_copy(copy_id)'],note:'The entry point. Owns the catalogue and the member list and coordinates checkouts. It should not contain fine calculations or copy-status rules.'},
  {id:'book',name:'Book',x:380,y:20,fields:['isbn: str','title: str','copies: list[BookCopy]'],methods:['available_copy(): BookCopy'],note:'A title in the catalogue. Knows its physical copies and can find a free one.'},
  {id:'copy',name:'BookCopy',x:400,y:210,fields:['copy_id: int','status: CopyStatus'],methods:['mark_lent()','mark_returned()'],note:'One physical item. Composition: a copy cannot exist without its Book. Guards its own status transitions.'},
  {id:'mem',name:'Member',x:20,y:230,fields:['member_id: int','name: str','loans: list[Loan]'],methods:['can_borrow(): bool'],note:'Knows its active loans and the borrowing limit rule.'},
  {id:'loan',name:'Loan',x:190,y:390,fields:['copy: BookCopy','member: Member','due: date'],methods:['is_overdue(today): bool'],note:'Links a member to a copy for a period. Association to both.'}],
  rels:[{from:'lib',to:'book',type:'agg',label:'1..*'},{from:'lib',to:'mem',type:'agg',label:'1..*'},{from:'book',to:'copy',type:'has',label:'1..*'},{from:'loan',to:'copy',type:'assoc'},{from:'loan',to:'mem',type:'assoc'}]},
 {t:'mcq',title:'Name the relationship',items:[
  {q:'University and Department: departments are closed when the university closes.',opts:['Aggregation','Composition','Inheritance'],a:1},
  {q:'Team and Player: players move to other teams.',opts:['Aggregation','Composition'],a:0},
  {q:'EmailNotifier and Notifier interface.',opts:['Implementation','Association'],a:0},
  {q:'ReportGenerator receives a Printer only inside print_report().',opts:['Composition','Dependency'],a:1}]}]},

{title:'Guided problem: library management LLD',tab:'Guided problem',mins:30,out:'Classes + checkout code',lead:'Prompt: <b>"Design the classes for a library: members borrow and return books; max 3 loans; 14-day loans; fines for late returns."</b>',blocks:[
 {t:'stepper',steps:[
  {title:'Requirements',short:'Reqs',secs:120,think:'List use cases and rules.',answer:'Use cases: add book/copies, register member, checkout, return, compute fine. Rules: max 3 active loans; 14 days; fine ₹5/day late; a copy is lent to one member at a time. Out of scope: reservations, payments UI.'},
  {title:'Entities and responsibilities',short:'Entities',secs:150,think:'Which class owns each rule?',answer:'<ul class="clean"><li>Member: "max 3 loans" (<code>can_borrow</code>).</li><li>BookCopy: "lent to one member at a time" (status).</li><li>Loan: due date and lateness.</li><li>FinePolicy: how much to charge (swappable).</li><li>Library: coordinates the steps.</li></ul>'},
  {title:'Code the core',short:'Code',secs:420,think:'Write <code>checkout</code> and <code>return_copy</code>.',code:`
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum

class CopyStatus(Enum):
    AVAILABLE = "available"
    LENT = "lent"

@dataclass
class BookCopy:
    copy_id: int
    isbn: str
    status: CopyStatus = CopyStatus.AVAILABLE

    def mark_lent(self):
        if self.status is not CopyStatus.AVAILABLE:
            raise ValueError(f"copy {self.copy_id} is not available")
        self.status = CopyStatus.LENT

    def mark_returned(self):
        self.status = CopyStatus.AVAILABLE

@dataclass
class Book:
    isbn: str
    title: str
    copies: list = field(default_factory=list)

    def available_copy(self):
        return next((c for c in self.copies if c.status is CopyStatus.AVAILABLE), None)

@dataclass
class Loan:
    copy: BookCopy
    member: "Member"
    due: date
    returned: date | None = None

    def days_late(self, today: date) -> int:
        return max(0, (today - self.due).days)

@dataclass
class Member:
    member_id: int
    name: str
    loans: list = field(default_factory=list)
    MAX_LOANS = 3

    def can_borrow(self) -> bool:
        return sum(1 for l in self.loans if l.returned is None) < self.MAX_LOANS

class FlatFine:
    def __init__(self, per_day=5): self.per_day = per_day
    def amount(self, loan, today): return loan.days_late(today) * self.per_day

class Library:
    LOAN_DAYS = 14

    def __init__(self, fine_policy=None):
        self.books, self.members, self.active = {}, {}, {}
        self.fine_policy = fine_policy or FlatFine()

    def checkout(self, member_id: int, isbn: str, today: date) -> Loan:
        member = self.members[member_id]
        if not member.can_borrow():
            raise ValueError("loan limit reached")
        copy = self.books[isbn].available_copy()
        if copy is None:
            raise ValueError("no copy available")
        copy.mark_lent()
        loan = Loan(copy, member, today + timedelta(days=self.LOAN_DAYS))
        member.loans.append(loan)
        self.active[copy.copy_id] = loan
        return loan

    def return_copy(self, copy_id: int, today: date) -> int:
        loan = self.active.pop(copy_id)
        loan.returned = today
        loan.copy.mark_returned()
        return self.fine_policy.amount(loan, today)`,answer:'<p>Each rule lives in one class. The fine rule is a separate object, so it can change without touching Library.</p>'},
  {title:'Extend',short:'Extend',secs:180,think:'New requirement: premium members borrow 10 books and pay no fines. What changes?',answer:'<p>Add <code>PremiumMember(Member)</code> with <code>MAX_LOANS = 10</code> and give the library a fine policy that checks membership, or pass a <code>NoFine</code> policy for premium loans. Library.checkout does not change: that is the sign of a good design.</p>'}]}]},

{title:'Review',tab:'Review',mins:10,out:'Flashcards + homework',blocks:[
 {t:'flash',items:[['Encapsulation?','Private state changed only through methods that enforce rules.'],['Polymorphism?','One method call, behaviour chosen by the object\'s class.'],['Composition vs aggregation?','Composition: part dies with the whole. Aggregation: part lives on.'],['When inheritance?','A true is-a, where the child works anywhere the parent does.'],['First LLD step?','Requirements and use cases, then nouns → classes.']]},
 {t:'task',title:'Homework',items:['Draw the class diagram for a movie ticket booking app (Movie, Show, Screen, Seat, Booking, Payment) with relationship types.']},
 {t:'checkpoint',id:'s13cp',concept:'oop',title:'Interview checkpoint',prompt:'"Design the classes for a library: members borrow and return books; there can be many copies of a book; members can reserve."',steps:['Clarify the use cases and rules (loan limits, fines, reservations)','List nouns → candidate classes; drop attributes and infrastructure','Assign responsibilities (who owns what)','Choose relationships (composition, association, inheritance) with reasons','Define the public methods for the main use cases','Pick patterns only where they solve a stated problem','Walk through borrow and return step by step','Name edge cases (no copy free, reservation queue, concurrent borrow)'],
  model:'Library (facade) · Book (isbn, title) has many BookCopy (id, status) · Member (id, loans) · Loan (copy, member, due) · Reservation queue per Book · FinePolicy (strategy). <code>library.borrow(member_id, isbn)</code> finds a free copy, checks limits, creates a Loan.',followups:[['"Two members borrow the last copy at the same time."','Copy status change must be atomic: a lock per copy or a conditional update in the repository.'],['"Different fine rules for students and staff."','FinePolicy interface with StudentFinePolicy / StaffFinePolicy (strategy).']]},
 {t:'recall',title:'Active recall',items:[['HLD vs LLD?','HLD: services, data stores and how they communicate. LLD: classes, interfaces, methods and relationships inside one component.'],['Why is Kafka not a class in your LLD?','It is infrastructure. Your code depends on a small Queue interface that an adapter implements.'],['Composition vs inheritance?','Composition: has-a, flexible, swap parts at runtime. Inheritance: is-a, tight coupling. Prefer composition.'],['What does an interface buy you?','Callers depend on behaviour, not implementations, so new implementations need no caller changes.'],['How do you find classes from requirements?','Nouns become candidates; keep those with behaviour and state, drop pure attributes.']]},
 {t:'summary',id:'s13sum',title:'Session summary',learned:['<b>Why LLD exists:</b> turn a box into maintainable code','<b>When to use inheritance:</b> true is-a with shared behaviour','<b>When not to:</b> sharing code between unrelated things: compose instead','<b>Trade-offs:</b> abstraction vs simplicity','<b>Interview questions:</b> classes, relationships, UML, walkthroughs'],explain:'Take one HLD box and name its classes, their responsibilities and relationships.'}]}
]});
