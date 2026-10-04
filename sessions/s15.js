COURSE.add({id:'s15',n:15,part:'C',track:'LLD',
title:'Design patterns I: creational and structural',
goal:'Recognise the problems that Factory, Builder, Singleton, Adapter, Decorator, Facade and Proxy solve, and write each in Python.',
outcomes:['Pick a pattern from the problem, not the other way round','Write Factory, Builder and Singleton','Write Adapter, Decorator, Facade and Proxy','Say the cost of each pattern'],
modules:[
{title:'Warm-up: recall SOLID',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'A growing if/elif on a type violates…',opts:['Open/closed','Liskov'],a:0},
  {q:'Creating a database client inside a service class violates…',opts:['Dependency inversion','Interface segregation'],a:0},
  {q:'Penguin.fly() raising an exception violates…',opts:['Liskov','Single responsibility'],a:0}]}]},

{title:'Choosing a pattern from the problem',tab:'Pattern picker',mins:15,out:'Problem → pattern map',lead:'Patterns are named solutions to recurring problems. In interviews, state the problem first: "Creation depends on input, so I\'ll use a factory."',blocks:[
 {t:'table',head:['If the problem is…','Consider','Family'],rows:[['Which class to create depends on input','Factory','Creational'],['An object has many optional parts','Builder','Creational'],['Exactly one shared instance is needed','Singleton (or just a module-level object)','Creational'],['An existing class has the wrong interface','Adapter','Structural'],['Add features to an object without subclassing each combination','Decorator','Structural'],['A complex subsystem needs one simple entry point','Facade','Structural'],['Control access to an object (lazy, cached, checked)','Proxy','Structural'],['Swap an algorithm at runtime','Strategy','Behavioural (session 16)'],['Notify many objects of a change','Observer','Behavioural (session 16)'],['Behaviour depends on a lifecycle state','State','Behavioural (session 16)']]}]},

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
  {q:'Adapter vs Facade?',a:'Adapter converts one interface into another expected one. Facade gives a simpler interface over many classes.'}]}]},

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
 {t:'task',title:'Homework',items:['Write a Notification system: Factory picks channel, Decorator adds retry and logging around any notifier, Adapter wraps a vendor SMS SDK.']}]}
]});
