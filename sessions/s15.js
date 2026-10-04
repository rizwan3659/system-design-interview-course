COURSE.add({id:'s15',n:15,part:'C',track:'LLD',
title:'Design patterns I: creational and structural',
goal:'Recognise the problems that Factory, Builder, Singleton, Adapter, Decorator, Facade and Proxy solve, and write each in Python.',
outcomes:['Pick a pattern from the problem, not the other way round','Write Factory, Builder and Singleton','Write Adapter, Decorator, Facade and Proxy','Say the cost of each pattern'],
concept:'patterns',
tasks:[{t:'Match three problems to patterns before reading the explanations.',auto:'s15pat'},{t:'Complete the Logger LLD lab.',auto:'s15log'},{t:'Rate yourself: can you name the problem each pattern solves?',auto:'s15sum'}],
modules:[
{title:'Warm-up: recall SOLID',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'A growing if/elif on a type violates…',opts:['Open/closed','Liskov'],a:0},
  {q:'Creating a database client inside a service class violates…',opts:['Dependency inversion','Interface segregation'],a:0},
  {q:'Penguin.fly() raising an exception violates…',opts:['Liskov','Single responsibility'],a:0}]}]},

{title:'Choosing a pattern from the problem',tab:'Pattern picker',mins:15,out:'Problem → pattern map',lead:'Patterns are named solutions to recurring problems. In interviews, state the problem first: "Creation depends on input, so I\'ll use a factory."',blocks:[
 {t:'table',head:['If the problem is…','Consider','Family'],rows:[['Which class to create depends on input','Factory','Creational'],['An object has many optional parts','Builder','Creational'],['Exactly one shared instance is needed','Singleton (or just a module-level object)','Creational'],['An existing class has the wrong interface','Adapter','Structural'],['Add features to an object without subclassing each combination','Decorator','Structural'],['A complex subsystem needs one simple entry point','Facade','Structural'],['Control access to an object (lazy, cached, checked)','Proxy','Structural'],['Swap an algorithm at runtime','Strategy','Behavioural (session 16)'],['Notify many objects of a change','Observer','Behavioural (session 16)'],['Behaviour depends on a lifecycle state','State','Behavioural (session 16)']]},
 {t:'predict',id:'s15pat',title:'What pattern fits?',level:'i',scenario:'Your checkout must call three payment providers. Each has a different SDK: <code>stripe.charge(cents)</code>, <code>razorpay.create_payment(amount_rupees)</code>, <code>paypal.Payment(...).execute()</code>. You want checkout code to stay the same when a fourth provider arrives.',q:'Which pattern do you reach for first?',
  opts:[['Adapter: one PaymentGateway interface, one adapter per provider',1,'Each adapter translates your interface to a vendor SDK. Checkout depends only on PaymentGateway; a new provider is a new adapter.'],['Singleton',0,'Controls instance count; does nothing about mismatched interfaces.'],['Decorator',0,'Adds behaviour around the same interface; the interfaces here differ.'],['Observer',0,'For notifying many listeners of events.']],takeaway:'Name the problem first (mismatched interfaces), then the pattern (adapter). Often a factory picks which adapter to use.'}]},

{title:'Creational: Factory, Builder, Singleton',tab:'Creational',mins:30,out:'Three patterns coded',blocks:[
 {t:'cards',items:[
  {tag:'Factory',title:'Decide which class to create',sub:'Creation depends on input',body:'<pre><code>class NotifierFactory:\n    _registry = {"email": EmailNotifier, "sms": SmsNotifier, "push": PushNotifier}\n\n    @classmethod\n    def create(cls, channel: str) -&gt; Notifier:\n        try:\n            return cls._registry[channel]()\n        except KeyError:\n            raise ValueError(f"unknown channel {channel}")\n\nnotifier = NotifierFactory.create(user.preferred_channel)</code></pre><p><b>Good:</b> callers never name concrete classes; one place to add a channel. <b>Cost:</b> one more indirection.</p>'},
  {tag:'Builder',title:'Assemble step by step',sub:'Many optional parts',body:'<pre><code>class PizzaBuilder:\n    def __init__(self, size):\n        self._pizza = {"size": size, "toppings": [], "crust": "regular"}\n\n    def crust(self, kind):\n        self._pizza["crust"] = kind\n        return self\n\n    def topping(self, name):\n        self._pizza["toppings"].append(name)\n        return self\n\n    def build(self):\n        if self._pizza["size"] not in ("S", "M", "L"):\n            raise ValueError("bad size")\n        return Pizza(**self._pizza)\n\npizza = PizzaBuilder("L").crust("thin").topping("olive").topping("paneer").build()</code></pre><p><b>Good:</b> readable creation; validation in <code>build()</code>. <b>Cost:</b> extra class. In Python, keyword arguments with defaults often suffice.</p>'},
  {tag:'Singleton',title:'One shared instance',sub:'Use sparingly',body:'<pre><code>class Config:\n    _instance = None\n\n    def __new__(cls):\n        if cls._instance is None:\n            cls._instance = super().__new__(cls)\n            cls._instance.values = load_config()\n        return cls._instance\n\nassert Config() is Config()</code></pre><p><b>Good:</b> one config, one connection pool. <b>Cost:</b> hidden global state, hard to test, needs a lock if created from many threads. Often better: create one object at startup and inject it.</p>'}]},
 {t:'reveal',cols:2,items:[
  {q:'Why is Singleton called an "anti-pattern" by some?',a:'It is global state in disguise: any code can reach it, tests share it, and dependencies become invisible. Dependency injection of a single instance gives the same "one object" without those costs.'},
  {q:'Factory vs constructor: when is a plain constructor enough?',a:'When the caller already knows the exact class. Use a factory when the choice depends on data (config, user input, file type).'}]}]},

{title:'Structural: Adapter, Decorator, Facade, Proxy',tab:'Structural',mins:30,out:'Four patterns coded',blocks:[
 {t:'cards',items:[
  {tag:'Adapter',title:'Make an interface fit',body:'<pre><code>class PaymentGateway(ABC):\n    @abstractmethod\n    def charge(self, rupees: int, ref: str) -&gt; bool: ...\n\nclass LegacyBankSdk:               # cannot change this\n    def make_txn(self, paise, txn_id): ...\n\nclass LegacyBankAdapter(PaymentGateway):\n    def __init__(self, sdk: LegacyBankSdk):\n        self.sdk = sdk\n\n    def charge(self, rupees, ref):\n        return self.sdk.make_txn(paise=rupees * 100, txn_id=ref) == "OK"</code></pre><p>Your code keeps talking to <code>PaymentGateway</code>.</p>'},
  {tag:'Decorator',title:'Wrap to add behaviour',body:'<pre><code>class Coffee(ABC):\n    @abstractmethod\n    def cost(self) -&gt; int: ...\n\nclass Espresso(Coffee):\n    def cost(self): return 120\n\nclass AddOn(Coffee):\n    def __init__(self, inner: Coffee): self.inner = inner\n\nclass Milk(AddOn):\n    def cost(self): return self.inner.cost() + 30\n\nclass Caramel(AddOn):\n    def cost(self): return self.inner.cost() + 40\n\ndrink = Caramel(Milk(Espresso()))\ndrink.cost()       # 190</code></pre><p>Any combination without a subclass per combination. Also used for logging, retries, caching around a service.</p>'},
  {tag:'Facade',title:'One simple entry point',body:'<pre><code>class CheckoutFacade:\n    def __init__(self, cart, inventory, payments, shipping, email):\n        self.cart, self.inv, self.pay = cart, inventory, payments\n        self.ship, self.email = shipping, email\n\n    def place_order(self, user):\n        items = self.cart.items(user)\n        self.inv.reserve(items)\n        self.pay.charge(user, self.cart.total(user))\n        tracking = self.ship.schedule(user, items)\n        self.email.confirm(user, tracking)\n        return tracking</code></pre><p>Controllers call one method instead of five services.</p>'},
  {tag:'Proxy',title:'Stand in and control access',body:'<pre><code>class ImageStore(ABC):\n    @abstractmethod\n    def get(self, key) -&gt; bytes: ...\n\nclass CachingImageProxy(ImageStore):\n    def __init__(self, real: ImageStore):\n        self.real, self.cache = real, {}\n\n    def get(self, key):\n        if key not in self.cache:\n            self.cache[key] = self.real.get(key)   # slow network call once\n        return self.cache[key]</code></pre><p>Same interface as the real object; adds caching, lazy loading or permission checks.</p>'}]},
 {t:'reveal',cols:2,items:[
  {q:'Decorator vs Proxy: both wrap an object with the same interface. Difference?',a:'Intent. A decorator adds features and is often stacked by the caller. A proxy controls access to the real object (lazy load, cache, permission) and usually hides that it is there.'},
  {q:'Adapter vs Facade?',a:'Adapter converts one interface into another expected one. Facade gives a simpler interface over many classes.'}]},
 {t:'lldlab',id:'s15log',title:'LLD lab · Logger',level:'i',concept:'patterns',intro:'Work through each stage. Write your own answer before revealing the solution.',stages:[{k:'Requirements',prompt:'Design a logger used across an application. Ask what it must support.',hint:'Levels? Destinations? Format? Thread safety?',solution:'Levels (DEBUG < INFO < WARN < ERROR) with a minimum level; several destinations (console, file); a configurable format; safe to call from many threads; one shared configuration.'},{k:'Identify objects',prompt:'List the classes (nouns) you need.',hint:'Separate "what is logged" from "where it goes" and "how it looks".',solution:'<b>Logger</b>, <b>LogLevel</b> (enum), <b>LogRecord</b>, <b>Handler</b> (interface) with <b>ConsoleHandler</b>/<b>FileHandler</b>, <b>Formatter</b>.'},{k:'Responsibilities',prompt:'For each class: what does it own, what does it do, who does it talk to?',hint:'Who decides whether a message is logged? Who writes it?',solution:'Logger filters by level and fans out to handlers (observer-like). Handler writes one record to one destination. Formatter turns a record into text (strategy). A module-level instance or registry gives shared config without a fragile singleton class.'},{k:'Interface',prompt:'Write the public methods (names, inputs, outputs) before any implementation.',hint:'Keep the public surface tiny.',solution:'<code>Logger.log(level, msg)</code>, <code>debug/info/warn/error(msg)</code>, <code>add_handler(h)</code>, <code>set_level(level)</code>. <code>Handler.emit(record)</code>. <code>Formatter.format(record) → str</code>.'},{k:'Implementation',prompt:'Implement the core in Python.',code:true,lang:'python',starter:`from enum import IntEnum

class Level(IntEnum):
    DEBUG = 10; INFO = 20; WARN = 30; ERROR = 40

class Logger:
    def __init__(self, level=Level.INFO):
        ...
`,solution:`import threading, time
from enum import IntEnum

class Level(IntEnum):
    DEBUG = 10; INFO = 20; WARN = 30; ERROR = 40

class Formatter:
    def format(self, rec):
        return f"{time.strftime('%H:%M:%S', time.localtime(rec['ts']))} {rec['level'].name} {rec['msg']}"

class Handler:
    def __init__(self, formatter=None):
        self.formatter = formatter or Formatter()
    def emit(self, rec):
        raise NotImplementedError

class ConsoleHandler(Handler):
    def emit(self, rec):
        print(self.formatter.format(rec))

class ListHandler(Handler):          # handy for tests
    def __init__(self):
        super().__init__(); self.lines = []
    def emit(self, rec):
        self.lines.append(self.formatter.format(rec))

class Logger:
    def __init__(self, level=Level.INFO):
        self.level, self.handlers = level, []
        self._lock = threading.Lock()
    def add_handler(self, h): self.handlers.append(h)
    def set_level(self, level): self.level = level
    def log(self, level, msg):
        if level < self.level:
            return
        rec = {"ts": time.time(), "level": level, "msg": msg}
        with self._lock:                 # one record at a time across threads
            for h in self.handlers:
                h.emit(rec)
    def debug(self, m): self.log(Level.DEBUG, m)
    def info(self, m):  self.log(Level.INFO, m)
    def warn(self, m):  self.log(Level.WARN, m)
    def error(self, m): self.log(Level.ERROR, m)

log = Logger()                           # shared instance, replaceable in tests`},{k:'Edge cases',prompt:'What inputs or situations could break it?',hint:'Think about empty, full, duplicate, concurrent and invalid inputs.',solution:'Messages below the level must cost almost nothing; a slow handler (network) blocks callers: consider a queue + background thread; a failing handler must not crash the app; interleaved lines from many threads; log files growing forever (rotation).'},{k:'Tests',prompt:'Write the test cases you would run (input → expected).',hint:'One happy path, one per edge case.',solution:'level INFO: debug("x") → no output; error("y") → one line containing "ERROR y"; two handlers → both receive the record; 10 threads × 1,000 logs → 10,000 complete lines; a handler that raises → others still run (after you add try/except).'}]}]},

{title:'Pattern-matching quiz',tab:'Quiz',mins:20,out:'10 scenarios matched',blocks:[
 {t:'mcq',cols:2,items:[
  {q:'Your app must call a third-party SMS SDK whose method names differ from your Notifier interface.',opts:['Adapter','Builder','Singleton'],a:0},
  {q:'Building an HTTP request with optional headers, timeout, retries, body and auth.',opts:['Builder','Proxy','Facade'],a:0},
  {q:'Add logging and timing around any repository without changing it.',opts:['Decorator','Factory','Adapter'],a:0},
  {q:'Create a ParkingSpot subclass based on vehicle type read from a sensor.',opts:['Factory','Decorator'],a:0},
  {q:'Load a 200 MB video object only when play() is first called.',opts:['Proxy (virtual proxy)','Builder'],a:0},
  {q:'A mobile app needs one call for "book trip" that touches 6 services.',opts:['Facade','Adapter'],a:0},
  {q:'Exactly one logger shared across the process.',opts:['Singleton (or inject one instance)','Decorator'],a:0},
  {q:'Pizza with any combination of 12 toppings priced additively.',opts:['Decorator','Facade'],a:0}]}]},

{title:'Review',tab:'Review',mins:15,out:'Flashcards + homework',blocks:[
 {t:'flash',items:[['Factory solves…','Choosing which class to create from input.'],['Builder solves…','Readable creation with many optional parts and validation.'],['Singleton risk?','Hidden global state; hard to test.'],['Adapter?','Converts an interface to the one you expect.'],['Decorator?','Wraps to add behaviour; stackable.'],['Facade?','One simple entry over a subsystem.'],['Proxy?','Same interface; controls access (lazy, cache, auth).']]},
 {t:'task',title:'Homework',items:['Write a Notification system: Factory picks channel, Decorator adds retry and logging around any notifier, Adapter wraps a vendor SMS SDK.']},
 {t:'recall',title:'Active recall',items:[['Factory solves…','Creating objects without the caller knowing the concrete class.'],['Builder solves…','Constructing objects with many optional parts readably and validly.'],['Adapter solves…','Making an incompatible interface fit the one your code expects.'],['Decorator solves…','Adding behaviour (caching, logging, retries) around an object without changing it.'],['Why is Singleton often discouraged?','Hidden global state makes testing and concurrency harder; prefer a shared instance passed in.']]},
 {t:'summary',id:'s15sum',title:'Session summary',learned:['<b>Why patterns exist:</b> named solutions to recurring design problems','<b>When to use one:</b> when you can name the problem it solves here','<b>When not to:</b> to look clever; patterns add indirection','<b>Trade-offs:</b> flexibility vs more classes','<b>Interview questions:</b> pick a pattern for a scenario and justify it'],explain:'For Factory, Builder, Adapter, Decorator, Facade and Proxy, name the problem each solves.'}]}
]});
