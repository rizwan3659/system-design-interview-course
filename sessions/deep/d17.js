COURSE.addDeep('s17',{title:'Deep dive: parking lot LLD, beginner to expert',lead:'The most common LLD prompt solved end to end: scope, classes, patterns, complete Python, concurrency and every extension interviewers add.',blocks:[
{t:'text',level:'f',title:'Beginner · Understand the problem first',html:`
<p>A parking lot has <b>levels</b>; each level has <b>spots</b> of different sizes (bike, car/compact, large). Vehicles arrive at an <b>entry gate</b>, get a <b>ticket</b> and a spot; at the <b>exit</b> they pay a <b>fee</b> based on time and vehicle type, and the spot becomes free.</p>
<p><b>Agreed scope (say it out loud):</b> multiple levels; spot sizes small/medium/large; vehicles bike/car/truck; a vehicle may use a bigger spot if its own size is full; hourly fee per vehicle type; tickets; multiple gates. <b>Not now:</b> reservations, UI, choice of database, payments provider details.</p>
<p><b>Entities (nouns):</b> ParkingLot, Level, Spot, Vehicle, Ticket, Gate, FeePolicy. <b>Main flows:</b> <code>park(vehicle) → ticket</code>, <code>leave(ticket) → fee</code>.</p>`},
{t:'text',level:'i',title:'Intermediate · Design decisions and patterns',html:`
<ul>
<li><b>Enum</b> for <code>VehicleType</code> and <code>SpotSize</code>; a map of which spot sizes each vehicle may use, in order of preference.</li>
<li><b>Factory</b> to create vehicles from a sensor reading.</li>
<li><b>Strategy</b> for spot allocation (nearest to entrance, lowest level first) and for fees (hourly, flat weekend, EV surcharge).</li>
<li><b>Observer</b> for display boards: spots freed/taken update the free-count per level.</li>
<li>The <b>ParkingLot</b> coordinates; <b>Level</b> owns its spots and free lists; <b>Ticket</b> records vehicle, spot, entry time.</li>
<li>Keep free spots in per-size sets/queues so allocation is O(1), not a scan of every spot.</li>
</ul>`},
{t:'code',level:'i',title:'Complete core in Python',lang:'python',code:`
import threading, uuid, math
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class VehicleType(Enum): BIKE = 1; CAR = 2; TRUCK = 3
class SpotSize(Enum): SMALL = 1; MEDIUM = 2; LARGE = 3

FITS = {VehicleType.BIKE: [SpotSize.SMALL, SpotSize.MEDIUM, SpotSize.LARGE],
        VehicleType.CAR: [SpotSize.MEDIUM, SpotSize.LARGE],
        VehicleType.TRUCK: [SpotSize.LARGE]}

@dataclass(frozen=True)
class Vehicle:
    plate: str
    type: VehicleType

@dataclass
class Spot:
    id: str
    level: int
    size: SpotSize
    vehicle: Vehicle | None = None

@dataclass
class Ticket:
    id: str
    vehicle: Vehicle
    spot: Spot
    entry: datetime

class Level:
    def __init__(self, n, spots):
        self.n = n
        self.free = {s: [] for s in SpotSize}
        for sp in spots: self.free[sp.size].append(sp)
    def take(self, size):
        return self.free[size].pop() if self.free[size] else None
    def release(self, spot): self.free[spot.size].append(spot)

class FeePolicy:                                     # Strategy
    RATE = {VehicleType.BIKE: 10, VehicleType.CAR: 40, VehicleType.TRUCK: 80}
    def fee(self, t: Ticket, now: datetime) -> int:
        hours = max(1, math.ceil((now - t.entry).total_seconds() / 3600))
        return hours * self.RATE[t.vehicle.type]

class ParkingLot:
    def __init__(self, levels, fee_policy=FeePolicy()):
        self.levels, self.fee_policy = levels, fee_policy
        self.active: dict[str, Ticket] = {}
        self.observers = []                           # display boards
        self._lock = threading.Lock()                 # one lock: simplest correct version

    def park(self, v: Vehicle) -> Ticket:
        with self._lock:
            for size in FITS[v.type]:                 # prefer the smallest fitting size
                for lvl in self.levels:               # then the lowest level
                    spot = lvl.take(size)
                    if spot:
                        spot.vehicle = v
                        t = Ticket(uuid.uuid4().hex[:8], v, spot, datetime.now())
                        self.active[t.id] = t
                        self._notify(spot.level)
                        return t
            raise RuntimeError("lot full for " + v.type.name)

    def leave(self, ticket_id: str, now=None) -> int:
        with self._lock:
            t = self.active.pop(ticket_id)            # KeyError = unknown/used ticket
            t.spot.vehicle = None
            self.levels[t.spot.level].release(t.spot)
            self._notify(t.spot.level)
        return self.fee_policy.fee(t, now or datetime.now())

    def _notify(self, level):
        for o in self.observers: o(level, {s.name: len(self.levels[level].free[s]) for s in SpotSize})

lot = ParkingLot([Level(0, [Spot("0-S1", 0, SpotSize.SMALL), Spot("0-M1", 0, SpotSize.MEDIUM)]),
                  Level(1, [Spot("1-L1", 1, SpotSize.LARGE)])])
lot.observers.append(lambda lvl, free: print("board", lvl, free))
t = lot.park(Vehicle("KA01", VehicleType.CAR)); print(lot.leave(t.id))`},
{t:'text',level:'x',title:'Expert · Extensions and concurrency',html:`
<ul>
<li><b>Two gates park at the same moment:</b> without a lock both can take the same free spot (a race on <code>pop</code> and the check-then-act). One lot-wide lock is simplest and correct; for higher throughput use a lock per level (or per spot-size list), always acquired in the same order to avoid deadlock. In a real system with a database, an atomic conditional update on the spot row does the same job.</li>
<li><b>EV charging spots:</b> add <code>SpotFeature.EV</code> (or an EVSpot type) and an allocation rule that gives EV spots only to EVs that ask for charging; add an <code>EVFeePolicy</code> decorator that adds charging cost. Existing classes stay closed.</li>
<li><b>Weekend flat ₹100:</b> a <code>WeekendFlatFee</code> strategy chosen by a <code>FeePolicySelector</code> based on the entry date. No change to ParkingLot.</li>
<li><b>Display boards per entrance:</b> Observer; the lot publishes level free-counts; boards subscribe. In a distributed system this becomes an event stream.</li>
<li><b>Lost ticket:</b> look up the active ticket by plate (keep an index plate → ticket), charge a lost-ticket fee or max daily rate, require verification.</li>
<li><b>Reservations:</b> a spot gains a RESERVED status with an expiry; allocation skips it unless the arriving vehicle matches.</li>
<li><b>Testing:</b> inject a clock (pass <code>now</code>) so fee tests are deterministic; test full-lot, wrong ticket, bike-in-car-spot fallback, concurrent parks (threads), and fee boundaries (exactly 60 min).</li>
</ul>`},
{t:'table',level:'x',title:'LLD rubric: what earns full marks',head:['Area','Strong answer'],rows:[
['Requirements','Scope agreed and written; out-of-scope named'],
['Model','Lot/Level/Spot/Vehicle/Ticket with clear ownership; enums for types'],
['Patterns','Strategy for fees/allocation, Factory for vehicles, Observer for boards — each justified'],
['Code','Runs; park/leave flows; errors for full lot and bad ticket; O(1) allocation'],
['Concurrency','Race identified and fixed; lock scope explained'],
['Extensions','EV/weekend/lost ticket added by new classes, not edits'],
]}
]});
