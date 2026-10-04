COURSE.add({id:'s14',n:14,part:'C',track:'LLD',
title:'SOLID principles',
goal:'Write classes that are easy to change: one reason to change, extend without editing, safe substitution, small interfaces, and dependencies on abstractions.',
outcomes:['Name each SOLID principle and its smell','Spot violations in real code','Refactor a messy class step by step','Explain the trade-off of over-applying SOLID'],
concept:'solid',
tasks:[{t:'Name the SOLID principle each code smell violates.',auto:'s14smell'},{t:'Refactor the payment class (use hints only if stuck).',auto:'s14ref'},{t:'Answer the LLD interview checkpoint.',auto:'s14cp'},{t:'Rate yourself: can you explain each SOLID principle with an example?',auto:'s14sum'}],
modules:[
{title:'Warm-up: recall session 13',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Filled diamond in UML means…',opts:['Composition','Inheritance'],a:0},
  {q:'Behaviour that must vary at runtime is best added by…',opts:['Inheritance','Composition'],a:1},
  {q:'Which class should own "max 3 loans"?',opts:['Library','Member'],a:1}]}]},

{title:'S and O: single responsibility, open/closed',tab:'S + O',mins:30,out:'Two refactors',blocks:[
 {t:'grid',cols:2,items:[
  {tag:'S',title:'Single responsibility',body:'A class should have one reason to change. Smell: the class name needs "and" (<code>OrderAndInvoiceAndEmailer</code>), or unrelated teams edit the same file.'},
  {tag:'O',title:'Open/closed',body:'Open for extension, closed for modification: add new behaviour by adding code, not by editing working code. Smell: a growing <code>if/elif</code> on a type.'}]},
 {t:'code',title:'Violates S: one class, three reasons to change',code:`
class Order:
    def total(self): ...                       # pricing rules change
    def save_to_db(self): ...                  # database schema changes
    def send_confirmation_email(self): ...     # email template changes`},
 {t:'code',title:'Fixed: one responsibility each',code:`
class Order:
    def total(self): ...

class OrderRepository:
    def save(self, order: Order): ...

class OrderNotifier:
    def send_confirmation(self, order: Order): ...`},
 {t:'code',title:'Violates O: every new discount edits this function',code:`
def discount(order, kind):
    if kind == "festival":
        return order.total * 0.10
    elif kind == "student":
        return order.total * 0.15
    elif kind == "first_order":
        return 100
    # ...and next month someone adds another elif`},
 {t:'code',title:'Fixed: add a class, edit nothing',code:`
from abc import ABC, abstractmethod

class Discount(ABC):
    @abstractmethod
    def amount(self, order) -> float: ...

class Festival(Discount):
    def amount(self, order): return order.total * 0.10

class Student(Discount):
    def amount(self, order): return order.total * 0.15

class FirstOrder(Discount):
    def amount(self, order): return 100

def apply(order, discount: Discount):
    return order.total - discount.amount(order)`},
 {t:'teacher',items:['Ask: "What is the cost of the fixed version?" More classes and indirection. For two stable cases, the if/else might be fine. SOLID is a tool for code that changes, not a rule for every line.']}]},

{title:'L and I: Liskov substitution, interface segregation',tab:'L + I',mins:25,out:'Spot L and I violations',blocks:[
 {t:'grid',cols:2,items:[
  {tag:'L',title:'Liskov substitution',body:'A subclass must work anywhere its parent is expected, without surprises. Smell: a subclass that throws "not supported" or silently changes the meaning of a method.'},
  {tag:'I',title:'Interface segregation',body:'Clients should not depend on methods they do not use. Prefer several small interfaces to one fat one. Smell: classes implementing methods with <code>pass</code> or <code>raise NotImplementedError</code>.'}]},
 {t:'code',title:'Violates L: the Square–Rectangle trap',code:`
class Rectangle:
    def set_width(self, w): self.w = w
    def set_height(self, h): self.h = h
    def area(self): return self.w * self.h

class Square(Rectangle):
    def set_width(self, w): self.w = self.h = w      # surprise!
    def set_height(self, h): self.w = self.h = h

def stretch(r: Rectangle):
    r.set_width(5); r.set_height(4)
    assert r.area() == 20        # fails for Square: area is 16`,note:'Fix: do not make Square a Rectangle. Both can implement a Shape interface with area().'},
 {t:'code',title:'Violates I, then fixed',code:`
# Too fat: a basic printer must pretend it can scan and fax
class Machine(ABC):
    def print(self, doc): ...
    def scan(self, doc): ...
    def fax(self, doc): ...

# Split by what clients actually need
class Printer(ABC):
    @abstractmethod
    def print(self, doc): ...

class Scanner(ABC):
    @abstractmethod
    def scan(self, doc): ...

class BasicPrinter(Printer):
    def print(self, doc): ...

class OfficeMachine(Printer, Scanner):
    def print(self, doc): ...
    def scan(self, doc): ...`},
 {t:'mcq',title:'L or I?',items:[
  {q:'<code>Penguin(Bird).fly()</code> raises an exception.',opts:['Liskov violation','Interface segregation violation'],a:0,why:'Code expecting any Bird to fly breaks. Fix: split FlyingBird, or do not put fly() on Bird.'},
  {q:'A <code>ReadOnlyRepository</code> must implement <code>delete()</code> because the interface has it.',opts:['Liskov','Interface segregation'],a:1},
  {q:'A subclass of Account makes <code>withdraw()</code> also charge a hidden fee the caller does not expect.',opts:['Liskov','Single responsibility'],a:0}]}]},

{title:'D: dependency inversion',tab:'D',mins:15,out:'Inject a dependency',blocks:[
 {t:'text',html:'<p><b>High-level code should depend on abstractions, not on concrete details.</b> Pass dependencies in (dependency injection) instead of creating them inside. This makes code testable and swappable.</p>'},
 {t:'code',title:'Before and after',code:`
# Before: checkout is welded to one provider and is hard to test
class Checkout:
    def __init__(self):
        self.gateway = RazorpayGateway()      # concrete, created inside

# After: depends on an abstraction, given from outside
class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: int, ref: str) -> bool: ...

class Checkout:
    def __init__(self, gateway: PaymentGateway):
        self.gateway = gateway

checkout = Checkout(RazorpayGateway())        # production
test_checkout = Checkout(FakeGateway())       # tests, no network`},
 {t:'predict',id:'s14smell',kind:'bottleneck',title:'Code smell · Which principle is violated?',level:'i',scenario:'<pre>class OrderService:\n    def checkout(self, order):\n        if order.payment == "card": ...      # 40 lines\n        elif order.payment == "upi": ...     # 35 lines\n        elif order.payment == "wallet": ...  # 30 lines\n        db = MySQLConnection("prod-host")\n        db.save(order)\n        send_email(order.user, "Thanks!")</pre>Adding PayPal means editing this method again.',q:'Which change helps most?',
  opts:[['Extract a PaymentMethod interface; inject a repository and a notifier',1,'Open/closed (new payment types without editing checkout), dependency inversion (depend on abstractions, not MySQLConnection) and single responsibility (checkout no longer sends email).'],['Split checkout into three private methods',0,'Shorter, but every new payment type still edits the class.'],['Make OrderService a singleton',0,'Unrelated: it does not reduce coupling.'],['Add comments',0,'Documents the problem without fixing it.']],takeaway:'An if/elif chain on a type is a hint for polymorphism; a "new" inside business logic is a hint for injection.'}]},

{title:'Refactoring exercise',tab:'Refactor',mins:25,out:'A refactored class',lead:'This class works, but every change hurts. Refactor it step by step.',blocks:[
 {t:'code',title:'The messy class',code:`
class ReportService:
    def generate(self, kind, data, send_to):
        if kind == "pdf":
            content = make_pdf(data)
        elif kind == "excel":
            content = make_excel(data)
        elif kind == "csv":
            content = ",".join(map(str, data))
        conn = psycopg2.connect("dbname=prod")          # hard-coded DB
        conn.cursor().execute("INSERT INTO reports ...", (content,))
        smtp = smtplib.SMTP("mail.company.com")         # hard-coded email
        smtp.sendmail("noreply@company.com", send_to, content)`},
 {t:'stepper',steps:[
  {title:'Find the smells',short:'Smells',secs:150,think:'Which principles are violated, and where?',answer:'<ul class="clean"><li><b>S</b>: formats, stores and emails in one method.</li><li><b>O</b>: a new format edits the if/elif.</li><li><b>D</b>: database and SMTP are created inside, so you cannot test without production.</li></ul>'},
  {title:'Refactor',short:'Refactor',secs:360,think:'Write the new classes.',code:`
from abc import ABC, abstractmethod

class Formatter(ABC):
    @abstractmethod
    def format(self, data) -> bytes: ...

class PdfFormatter(Formatter):
    def format(self, data): return make_pdf(data)

class CsvFormatter(Formatter):
    def format(self, data): return ",".join(map(str, data)).encode()

class ReportStore(ABC):
    @abstractmethod
    def save(self, content: bytes) -> None: ...

class Sender(ABC):
    @abstractmethod
    def send(self, to: str, content: bytes) -> None: ...

class ReportService:
    def __init__(self, formatters: dict[str, Formatter], store: ReportStore, sender: Sender):
        self.formatters, self.store, self.sender = formatters, store, sender

    def generate(self, kind: str, data, send_to: str):
        content = self.formatters[kind].format(data)
        self.store.save(content)
        self.sender.send(send_to, content)`,answer:'<p>New format = new Formatter class registered in the dict. Tests pass in-memory store and sender fakes.</p>'},
  {title:'Challenge',short:'Challenge',secs:120,think:'An interviewer says: "Isn\'t this over-engineered for 3 formats?"',answer:'<p class="say">"If formats rarely change and nobody tests this, the original is acceptable. I split it because the brief says new formats arrive often and we need tests without a mail server. I would not add more layers than that."</p>'}]},
 {t:'hints',id:'s14ref',title:'Think it through · Testability',q:'Your <code>ReportService</code> calls <code>datetime.now()</code>, writes directly to S3 and emails the CFO. Tests are slow and flaky. How would you restructure it?',write:true,hints:['What does the test need to control or fake?','Which principle says high-level code should depend on abstractions?'],solution:'Inject a Clock, a Storage interface and a Notifier into the constructor (dependency inversion). Production passes real implementations; tests pass fakes. Each class now has one reason to change (single responsibility), and tests run in milliseconds.'}]},

{title:'Review',tab:'Review',mins:15,out:'Quiz + homework',blocks:[
 {t:'drill',title:'Name the violated principle',prefix:'',button:'Draw a code smell',items:[['A UserService that also formats HTML emails.','S: split formatting into its own class.'],['Adding a shipping carrier means editing a 200-line switch.','O: one class per carrier behind an interface.'],['A ReadOnlyFile subclass whose write() raises.','L (and I): do not inherit write().'],['A Bird interface with fly(), swim(), run(); Sparrow implements swim() as pass.','I: split capabilities into small interfaces.'],['OrderService does "self.db = MySQLDatabase()" in __init__.','D: inject a repository abstraction.']]},
 {t:'flash',items:[['S?','One reason to change.'],['O?','Extend by adding code, not editing working code.'],['L?','Subclasses usable wherever the parent is.'],['I?','Small, focused interfaces.'],['D?','Depend on abstractions; inject dependencies.'],['Cost of SOLID?','More classes and indirection; apply where change is expected.']]},
 {t:'task',title:'Homework',items:['Take a project you wrote. Find one S and one O violation, and write the refactored version.']},
 {t:'checkpoint',id:'s14cp',title:'Interview checkpoint',prompt:'"Here is a 600-line UserManager class that handles signup, login, profile updates, password reset emails and audit logging. How would you improve it?"',steps:['Identify the separate reasons to change (responsibilities)','Split into focused classes (AuthService, ProfileService, PasswordResetService, AuditLogger)','Introduce interfaces for external dependencies (EmailSender, UserRepository)','Inject dependencies instead of constructing them','Keep behaviour the same: refactor in small steps with tests','Avoid over-engineering: only abstract what varies','Explain how each principle applies','Describe the test strategy'],model:'Group methods by actor and reason to change; extract services; depend on UserRepository/EmailSender interfaces injected via constructors; add characterisation tests before moving code.',followups:[['"Is this over-engineering?"','Only if the parts never change independently. Here email, auth and auditing clearly do.']]},
 {t:'recall',title:'Active recall',items:[['Single responsibility in one line?','A class should have one reason to change.'],['Open/closed?','Add behaviour by adding code (new classes), not by editing tested code.'],['Liskov substitution?','A subclass must work anywhere its parent is expected, without surprises.'],['Interface segregation?','Many small interfaces beat one fat one; clients should not depend on methods they do not use.'],['Dependency inversion?','High-level logic depends on abstractions; details (DB, email) implement them.']]},
 {t:'summary',id:'s14sum',title:'Session summary',learned:['<b>Why SOLID exists:</b> code that is cheap to change','<b>When to apply it:</b> where things actually vary or need testing','<b>When not to:</b> speculative abstractions for things that never change','<b>Trade-offs:</b> more classes vs less coupling','<b>Interview questions:</b> refactoring a god class, testability, polymorphism vs conditionals'],explain:'Give one example for each SOLID principle from code you have written.'}]}
]});
