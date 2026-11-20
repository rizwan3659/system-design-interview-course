COURSE.addDeep('s14',{title:'Deep dive: SOLID principles, beginner to expert',lead:'Each principle as a plain rule, a code smell, a fix, and the judgement of when not to apply it.',blocks:[
{t:'text',level:'f',title:'Beginner · Why SOLID exists',html:`
<p>Code changes constantly. SOLID is five rules that make change cheap: when a requirement changes, you edit one small place instead of ten.</p>
<ul>
<li><b>S — Single responsibility:</b> a class should have one reason to change.</li>
<li><b>O — Open/closed:</b> open for extension, closed for modification. Add new behaviour by adding code, not editing working code.</li>
<li><b>L — Liskov substitution:</b> a subclass must work anywhere its parent is expected, without surprises.</li>
<li><b>I — Interface segregation:</b> many small interfaces beat one fat one; no class should implement methods it does not use.</li>
<li><b>D — Dependency inversion:</b> depend on abstractions, not concrete classes; pass dependencies in.</li>
</ul>`},
{t:'code',level:'i',title:'S and O · Before and after',lang:'python',code:`
# BEFORE: one class, three reasons to change (math, formatting, storage)
class Invoice:
    def total(self): ...
    def to_pdf(self): ...
    def save_to_db(self): ...

# AFTER: one responsibility each
class Invoice:            # business rules only
    def total(self): ...
class InvoicePdf:         # presentation
    def render(self, inv: Invoice): ...
class InvoiceRepository:  # persistence
    def save(self, inv: Invoice): ...

# O: new discount types are new classes; apply_discount never changes
class Discount:
    def apply(self, amount: float) -> float: return amount
class Percent(Discount):
    def __init__(self, p): self.p = p
    def apply(self, a): return a * (1 - self.p / 100)
class Flat(Discount):
    def __init__(self, v): self.v = v
    def apply(self, a): return max(0, a - self.v)

def apply_discount(amount, d: Discount): return d.apply(amount)`},
{t:'code',level:'i',title:'L and I · The traps',lang:'python',code:`
# L violation: Square changes Rectangle's contract
class Rectangle:
    def set_width(self, w): self.w = w
    def set_height(self, h): self.h = h
class Square(Rectangle):
    def set_width(self, w): self.w = self.h = w      # caller set width, height changed too!

# L violation: Penguin(Bird).fly() raises -> callers of Bird break.
# Fix: model the capability, not the taxonomy.
class Bird: ...
class FlyingBird(Bird):
    def fly(self): ...

# I fix: split the fat interface
class Reader:
    def get(self, id): ...
class Writer:
    def save(self, obj): ...
    def delete(self, id): ...
class ReadOnlyRepo(Reader): ...          # no forced delete()
class SqlRepo(Reader, Writer): ...`},
{t:'code',level:'i',title:'D · Inject the dependency',lang:'python',code:`
# BEFORE: service builds its own concrete client -> hard to test, hard to swap
class OrderService:
    def __init__(self):
        self.db = PostgresClient("prod-dsn")

# AFTER: depend on an abstraction, receive it from outside
class OrderRepo(ABC):
    @abstractmethod
    def save(self, order): ...

class OrderService:
    def __init__(self, repo: OrderRepo, notifier: "Notifier"):
        self._repo, self._notifier = repo, notifier
    def place(self, order):
        self._repo.save(order)
        self._notifier.send(order.user_id, "Order placed")

# tests: OrderService(InMemoryOrderRepo(), FakeNotifier())`},
{t:'text',level:'x',title:'Expert · Judgement, not dogma',html:`
<ul>
<li><b>Liskov is about behaviour contracts:</b> a subclass may not demand more (stronger preconditions) or promise less (weaker postconditions), and may not add surprising side effects (a hidden fee in <code>withdraw()</code>). Tests written for the parent should pass for every child.</li>
<li><b>SRP is about reasons to change, i.e. people/teams.</b> If finance changes tax rules and design changes the PDF layout, those belong in different classes.</li>
<li><b>OCP is applied where change is likely.</b> Don't add a Strategy for a rule that has never changed; refactor to it when the second variation appears ("rule of three").</li>
<li><b>DIP enables testing:</b> injected fakes replace databases and networks, so unit tests are fast. In Python, duck typing or <code>typing.Protocol</code> gives abstractions without inheritance.</li>
<li><b>Over-application smell:</b> ten one-method classes and interfaces with a single implementation, for a 50-line script. In interviews, say why each abstraction exists.</li>
<li><b>Code smells that point to a principle:</b> growing if/elif on a type → O (and polymorphism); classes named Manager/Helper/Util with many unrelated methods → S; <code>raise NotImplementedError</code> in a subclass → L or I; <code>new</code>/constructor calls to infrastructure inside business logic → D.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'A ReadOnlyRepository must implement delete() because the interface has it. Which principle, and what is the fix?',a:'Interface segregation (and it would lead to a Liskov violation if delete raised). Split into Reader and Writer interfaces; ReadOnlyRepository implements only Reader.'},
{q:'How does dependency inversion make a class testable? Give a concrete example.',a:'OrderService receives an OrderRepo and Notifier. In tests pass an in-memory repo and a fake notifier that records calls; assert on them. No database, no network, millisecond tests.'},
{q:'Is it ever fine to violate SRP?',a:'Yes, for small code that is unlikely to change, or when splitting would scatter one simple concept across files. SOLID is a tool to reduce the cost of change; apply it where change is real.'},
]}
]});
