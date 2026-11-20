COURSE.addDeep('s18',{title:'Deep dive: elevator system LLD, beginner to expert',lead:'Requests, per-car scheduling (SCAN/LOOK), dispatching between cars, the state machine, special modes and failure handling.',blocks:[
{t:'text',level:'f',title:'Beginner · How elevators decide',html:`
<p>There are two kinds of request:</p>
<ul><li><b>Hall call:</b> someone on floor 7 presses "Up". The system must pick <i>which car</i> answers.</li>
<li><b>Car call:</b> someone inside car B presses "12". Only car B can serve it.</li></ul>
<p>So there are two decisions:</p>
<ol><li><b>Dispatching</b> — which car gets a hall call (the building-level controller).</li>
<li><b>Scheduling</b> — in what order one car visits its stops (the car-level logic).</li></ol>
<p>The simple, fair rule real elevators use: <b>keep going in the current direction while there are stops ahead, then reverse</b>. This is the LOOK algorithm, like a lift that does not turn around halfway.</p>`},
{t:'table',level:'i',title:'Intermediate · Scheduling algorithms for one car',head:['Algorithm','Rule','Problem'],rows:[
['FCFS','Serve requests in arrival order','Zig-zags across the building; long waits'],
['SSTF (nearest first)','Go to the closest stop','Far floors can starve'],
['SCAN','Sweep to the end in one direction, then back','Travels to the top/bottom even if no one is there'],
['LOOK','Sweep while there are stops ahead, then reverse','Good balance — default choice'],
]},
{t:'text',level:'i',title:'Intermediate · Dispatching between cars',html:`
<p>For a hall call at floor F going in direction D, score each car and pick the lowest cost:</p>
<ul>
<li>Car idle: cost = distance to F.</li>
<li>Car moving toward F in direction D (F is ahead and on its way): cost = distance (best case, it picks you up on the way).</li>
<li>Car moving away or in the opposite direction: cost = distance to its last stop + distance back to F.</li>
<li>Add penalties for load (nearly full), number of stops already assigned, and maintenance (infinite cost).</li>
</ul>
<p>Put this scoring behind a <b>DispatchStrategy</b> interface so peak-hour zoning or energy-saving modes are new strategies.</p>`},
{t:'code',level:'i',title:'Core classes in Python',lang:'python',code:`
from enum import Enum
import threading

class Dir(Enum): UP = 1; DOWN = -1; IDLE = 0
class Mode(Enum): NORMAL = 1; MAINTENANCE = 2; FIRE = 3

class Car:
    def __init__(self, cid, floors):
        self.id, self.floor, self.dir, self.mode = cid, 0, Dir.IDLE, Mode.NORMAL
        self.up, self.down = set(), set()            # pending stops by direction
        self.load, self.capacity = 0, 10
        self._lock = threading.Lock()

    def add_stop(self, f):
        with self._lock:
            (self.up if f > self.floor else self.down if f < self.floor else self.up).add(f)
            if self.dir is Dir.IDLE: self.dir = Dir.UP if f >= self.floor else Dir.DOWN

    def step(self):                                   # LOOK: one floor per tick
        with self._lock:
            ahead = self.up if self.dir is Dir.UP else self.down
            if not ahead:                             # nothing ahead: reverse or rest
                other = self.down if self.dir is Dir.UP else self.up
                self.dir = (Dir.DOWN if self.dir is Dir.UP else Dir.UP) if other else Dir.IDLE
                return
            self.floor += self.dir.value
            if self.floor in ahead:
                ahead.discard(self.floor)             # open doors here

class NearestCarStrategy:                             # DispatchStrategy
    def cost(self, car, floor, d):
        if car.mode is not Mode.NORMAL or car.load >= car.capacity: return float("inf")
        dist = abs(car.floor - floor)
        if car.dir is Dir.IDLE: return dist
        on_the_way = (car.dir is d) and ((floor - car.floor) * car.dir.value >= 0)
        return dist if on_the_way else dist + 2 * len(car.up | car.down) + 10

class Controller:
    def __init__(self, cars, strategy=NearestCarStrategy()):
        self.cars, self.strategy = cars, strategy
    def hall_call(self, floor, d: Dir):
        car = min(self.cars, key=lambda c: self.strategy.cost(c, floor, d))
        car.add_stop(floor); return car.id
    def car_call(self, car_id, floor):
        next(c for c in self.cars if c.id == car_id).add_stop(floor)
    def fire_alarm(self):
        for c in self.cars:
            with c._lock: c.up.clear(); c.down.clear(); c.mode = Mode.FIRE
            c.add_stop(0)                             # all cars to ground, then stop`},
{t:'text',level:'x',title:'Expert · Extensions, states and failures',html:`
<ul>
<li><b>State machine per car:</b> IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE, EMERGENCY. Use the State pattern so "door open requested" means different things when moving (ignored) vs stopped (open).</li>
<li><b>Fire alarm:</b> a mode change on the controller: clear queues, send all cars to the ground floor, open doors, ignore hall calls. Firefighter mode allows only car calls with a key.</li>
<li><b>Weight limit:</b> when load ≥ ~80% capacity, skip hall calls (still serve car calls so people can get out); dispatch cost becomes infinite.</li>
<li><b>Zoning at peak:</b> floors 0–7 served by A, B; 8–15 by C, D — a <code>ZonedDispatchStrategy</code>; swap strategies by time of day.</li>
<li><b>Displays on every floor:</b> Observer on car position/direction.</li>
<li><b>Concurrency:</b> hall calls arrive from many threads while cars step; protect each car's stop sets with its own lock; the controller reads car state under the lock (or uses snapshots) when scoring. Never hold two car locks at once, which avoids deadlock.</li>
<li><b>Failure handling:</b> a car stops responding (no heartbeat) → mark it MAINTENANCE, re-dispatch its pending hall calls to other cars; car calls of passengers inside need an emergency procedure.</li>
<li><b>Destination dispatch</b> (modern buildings): passengers enter their destination in the lobby, and the system groups people going to nearby floors into the same car — fewer stops, higher throughput.</li>
</ul>`},
{t:'reveal',level:'x',title:'Expert questions',items:[
{q:'Why separate dispatching from scheduling?',a:'They change for different reasons: dispatching is a building policy (zoning, energy, peak hours) while scheduling is car mechanics (LOOK). Separate strategies let either change without touching the other.'},
{q:'How do you avoid starvation for a far floor?',a:'LOOK guarantees every floor in the current direction is served in the sweep. In the dispatcher, add an age penalty: the longer a hall call waits, the lower the cost threshold to assign it, or force-assign after N seconds.'},
{q:'How would you test this?',a:'Make step() deterministic (one floor per tick), inject requests, run ticks, assert the visit order. Test: idle car, on-the-way pickup, reversal, full car skips hall calls, maintenance car never chosen, fire mode.'},
]}
]});
