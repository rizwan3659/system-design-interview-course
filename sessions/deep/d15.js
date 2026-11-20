COURSE.addDeep('s15',{title:'Deep dive: creational and structural patterns, beginner to expert',lead:'Factory, Builder, Singleton, Adapter, Decorator, Facade and Proxy: the problem each solves, Python code, and how to tell look-alikes apart.',blocks:[
{t:'text',level:'f',title:'Beginner · What a design pattern is',html:`
<p>A design pattern is a named, proven solution to a problem that keeps coming up. Knowing the names lets you say in one word what would take a paragraph: "pricing is a Strategy", "the SMS SDK sits behind an Adapter".</p>
<p><b>Creational</b> patterns decide <i>how objects are created</i>. <b>Structural</b> patterns decide <i>how objects are wrapped and combined</i>. <b>Behavioural</b> patterns (session 16) decide <i>how objects share work</i>.</p>
<p>Always start from the problem, never from the pattern: "What will change here, and how do I keep that change in one place?"</p>`},
{t:'table',level:'f',title:'Problem → pattern',head:['If the problem is…','Use'],rows:[
['Which class to create depends on input (vehicle type from a sensor)','Factory'],
['An object has many optional parts (HTTP request with headers, retries, auth…)','Builder'],
['Exactly one shared instance (config, logger)','Singleton (or a module-level object)'],
['A third-party API does not match your interface','Adapter'],
['Add behaviour (logging, caching, toppings) around an object without changing it','Decorator'],
['Callers need one simple entry point to a complex subsystem','Facade'],
['Control access to an object: lazy loading, permissions, remote calls, caching','Proxy'],
]},
{t:'code',level:'i',title:'Creational · Factory and Builder',lang:'python',code:`
# Factory: one place decides which class to build
class Vehicle: ...
class Bike(Vehicle): ...
class Car(Vehicle): ...
class Truck(Vehicle): ...

class VehicleFactory:
    _types = {"bike": Bike, "car": Car, "truck": Truck}
    @classmethod
    def create(cls, kind: str) -> Vehicle:
        try: return cls._types[kind]()
        except KeyError: raise ValueError(f"unknown vehicle {kind}")

# Builder: readable construction with many optional parts, validated once
class Request:
    def __init__(self, url, method, headers, timeout, retries, body):
        self.url, self.method, self.headers = url, method, headers
        self.timeout, self.retries, self.body = timeout, retries, body

class RequestBuilder:
    def __init__(self, url): self._u, self._m, self._h, self._t, self._r, self._b = url, "GET", {}, 5, 0, None
    def post(self, body): self._m, self._b = "POST", body; return self
    def header(self, k, v): self._h[k] = v; return self
    def timeout(self, s): self._t = s; return self
    def retries(self, n): self._r = n; return self
    def build(self):
        if self._m == "POST" and self._b is None: raise ValueError("POST needs a body")
        return Request(self._u, self._m, dict(self._h), self._t, self._r, self._b)

req = RequestBuilder("https://api.x/pay").post({"amt": 5}).header("Auth", "t").retries(3).build()`},
{t:'code',level:'i',title:'Structural · Adapter, Decorator, Facade, Proxy',lang:'python',code:`
# Adapter: make a vendor SDK fit our Notifier interface
class Notifier:
    def send(self, to: str, msg: str): ...
class AcmeSmsAdapter(Notifier):
    def __init__(self, sdk): self._sdk = sdk
    def send(self, to, msg): self._sdk.dispatch_text(phone=to, content=msg)

# Decorator: same interface, adds behaviour, stackable
class Repo:
    def get(self, id): ...
class TimedRepo(Repo):
    def __init__(self, inner: Repo): self._inner = inner
    def get(self, id):
        t = time.perf_counter(); r = self._inner.get(id)
        log.info("get %s took %.1f ms", id, (time.perf_counter() - t) * 1000); return r
repo = TimedRepo(CachedRepo(SqlRepo()))      # wrap in layers

# Facade: one call over many services
class TripBooking:
    def __init__(self, flights, hotels, payments, email): ...
    def book_trip(self, user, plan):
        f = self.flights.reserve(plan.flight); h = self.hotels.reserve(plan.hotel)
        self.payments.charge(user, f.price + h.price); self.email.confirm(user, f, h)

# Proxy: same interface, controls access (here: lazy loading)
class Video:
    def play(self): ...
class LazyVideo(Video):
    def __init__(self, path): self._path, self._real = path, None
    def play(self):
        if self._real is None: self._real = RealVideo(self._path)   # load 200 MB only now
        return self._real.play()`},
{t:'text',level:'x',title:'Expert · Telling look-alikes apart, and when not to use a pattern',html:`
<ul>
<li><b>Decorator vs Proxy:</b> both wrap with the same interface. Decorator <i>adds behaviour</i> and is meant to be stacked by the client (logging + caching + retry). Proxy <i>controls access</i> to the real object (lazy creation, permission checks, remote stub) and usually manages its lifecycle.</li>
<li><b>Adapter vs Facade:</b> Adapter makes <i>one</i> existing interface look like <i>another expected</i> interface. Facade defines a <i>new, simpler</i> interface over <i>many</i> classes.</li>
<li><b>Factory vs constructor:</b> a plain constructor is enough when the caller already knows the exact class. Use a factory when the choice depends on data/config, or creation needs setup (pooling, caching instances).</li>
<li><b>Why Singleton is called an anti-pattern:</b> it is global state in disguise: hidden dependencies, hard to replace in tests, and tricky with threads. Prefer creating one instance at startup and injecting it. In Python, a module-level object is already a singleton. If you must, make creation thread-safe.</li>
<li><b>Python idioms:</b> functions are objects, so a Strategy can be a function and a Decorator can be a function decorator (<code>@functools.wraps</code>) for cross-cutting concerns. Use classes when the wrapper has state or must satisfy an interface.</li>
<li><b>Pizza with 12 toppings:</b> Decorator (each topping wraps and adds cost) avoids 2<sup>12</sup> subclasses — but a simple list of toppings summed by the Pizza is often even simpler. Mention both; pick the simpler one unless toppings have behaviour.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'A mobile app needs one call for "book trip" touching 6 services. Pattern?',a:'Facade (in a backend-for-frontend / API gateway): one simple entry point that orchestrates the services. If steps can fail midway, the facade drives a saga with compensations.'},
{q:'Thread-safe Singleton in Python?',a:'Prefer a module-level instance (imports are thread-safe). Otherwise use double-checked locking: check _instance, acquire a class lock, check again, create. Better still: create once in main() and inject it.'},
{q:'Add logging and timing around any repository without changing it. Which pattern and why not inheritance?',a:'Decorator. Inheritance would need TimedSqlRepo, TimedMongoRepo, LoggedTimedSqlRepo… A decorator wraps any Repo and stacks with others.'},
]}
]});
