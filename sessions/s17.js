COURSE.add({id:'s17',n:17,part:'C',track:'LLD',
title:'LLD case study: parking lot',
goal:'Run the full LLD loop on the most common LLD prompt: requirements, classes, patterns, working code and extensions.',
outcomes:['Turn parking-lot requirements into classes with clear owners','Use Strategy for spot allocation and pricing, Factory for vehicles','Write park and leave correctly, including edge cases','Extend the design and discuss thread safety'],
modules:[
{title:'Warm-up: patterns recall',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Pricing rules that change by lot and season →',opts:['Strategy','Singleton'],a:0},
  {q:'Creating Car/Bike/Truck from a sensor reading →',opts:['Factory','Observer'],a:0},
  {q:'Display boards update when a spot frees up →',opts:['Observer','Builder'],a:0}]}]},

{title:'Clarify the requirements',tab:'Clarify',mins:15,out:'Agreed requirement list',lead:'Prompt: <b>"Design a parking lot."</b> The prompt is vague on purpose: ask before you draw.',blocks:[
 {t:'sort',title:'Ask it or skip it?',items:[
  {q:'"How many levels, and what spot sizes exist?"',a:0,why:'Decides Level and spot types.'},
  {q:'"Which vehicle types: bike, car, truck?"',a:0,why:'Decides which vehicle fits which spot.'},
  {q:'"Which database should I use?"',a:1,why:'LLD is about classes; storage is a detail behind a repository.'},
  {q:'"How is the fee calculated: hourly, flat, different per vehicle?"',a:0,why:'Decides the pricing strategy.'},
  {q:'"Can a bike use a car spot if bike spots are full?"',a:0,why:'A real rule that changes allocation logic.'},
  {q:'"Should the UI be React or Angular?"',a:1,why:'Not part of the object model.'}]},
 {t:'grid',cols:2,title:'Agreed scope',items:[
  {tag:'In',title:'Must support',body:'<ul class="clean"><li>Multiple levels; spots of size SMALL (bike), MEDIUM (car), LARGE (truck)</li><li>Park: assign the smallest free spot that fits; issue a ticket</li><li>Leave: free the spot; charge by time and size</li><li>Show free spots per level</li></ul>'},
  {tag:'Out / later',tc:'amber',title:'Not now',body:'<ul class="clean"><li>Reservations, EV charging, monthly passes (extension questions)</li><li>Payment provider details</li><li>Persistence (assume in memory; mention a repository)</li></ul>'}]}]},

{title:'Guided design',tab:'Guided design',mins:50,out:'UML + working code',blocks:[
 {t:'stepper',steps:[
  {title:'Entities',short:'Entities',secs:150,think:'Underline nouns and verbs in the scope. Which become classes and which methods?',answer:'<p><b>Classes:</b> ParkingLot, Level, ParkingSpot, Vehicle (Car, Bike, Truck), Ticket, SpotSize (enum). <b>Swappable rules:</b> AllocationStrategy, PricingStrategy.</p><p><b>Methods:</b> park(vehicle) → Ticket; leave(ticket_id, now) → fee; free_spots(size).</p>'},
  {title:'Class diagram',short:'UML',secs:300,think:'Draw it, then compare. Click each class to read its responsibility.',blocks:[{t:'uml',classes:[
    {id:'alloc',name:'AllocationStrategy',kind:'interface',x:20,y:20,methods:['find_spot(levels, v)'],note:'Decides which free spot a vehicle gets. Swappable: nearest first, fill lowest level, spread load.'},
    {id:'near',name:'SmallestFitFirst',x:20,y:160,methods:['find_spot(levels, v)'],note:'Picks the smallest spot size that fits, on the lowest level. Keeps big spots free for big vehicles.'},
    {id:'lot',name:'ParkingLot',x:290,y:20,fields:['- levels: list[Level]','- active: dict[str, Ticket]'],methods:['+ park(vehicle): Ticket','+ leave(ticket_id, now): int'],note:'Entry point (facade). Coordinates allocation, tickets and pricing. Holds no rules itself.'},
    {id:'price',name:'PricingStrategy',kind:'interface',x:560,y:20,methods:['fee(entry, exit, size): int'],note:'How much to charge. Swappable per lot, season or vehicle.'},
    {id:'hourly',name:'HourlyPricing',x:560,y:160,fields:['rates: dict[SpotSize, int]'],methods:['fee(entry, exit, size): int'],note:'Charges per started hour, rate by spot size.'},
    {id:'level',name:'Level',x:290,y:180,fields:['number: int','spots: list[ParkingSpot]'],methods:['free_spots(size): list'],note:'A floor. Owns its spots (composition).'},
    {id:'spot',name:'ParkingSpot',x:290,y:330,fields:['spot_id: str','size: SpotSize','vehicle: Vehicle | None'],methods:['fits(v): bool','assign(v)','release()'],note:'Guards its own rule: one vehicle at a time, and only if it fits.'},
    {id:'ticket',name:'Ticket',x:560,y:320,fields:['ticket_id: str','vehicle: Vehicle','spot: ParkingSpot','entry: datetime'],note:'Record of one parking session.'},
    {id:'veh',name:'Vehicle',kind:'abstract',x:560,y:500,fields:['plate: str','size: SpotSize'],note:'Abstract base. Subclasses only fix their size; created by a VehicleFactory from the entry sensor.'},
    {id:'car',name:'Car',x:460,y:650,note:'size = MEDIUM'},{id:'bike',name:'Bike',x:570,y:650,note:'size = SMALL'},{id:'truck',name:'Truck',x:680,y:650,note:'size = LARGE'}],
   rels:[{from:'lot',to:'alloc',type:'uses'},{from:'lot',to:'price',type:'uses'},{from:'near',to:'alloc',type:'impl'},{from:'hourly',to:'price',type:'impl'},{from:'lot',to:'level',type:'has',label:'1..*'},{from:'level',to:'spot',type:'has',label:'1..*'},{from:'ticket',to:'spot',type:'assoc'},{from:'ticket',to:'veh',type:'assoc'},{from:'spot',to:'veh',type:'assoc',label:'0..1'},{from:'car',to:'veh',type:'is'},{from:'bike',to:'veh',type:'is'},{from:'truck',to:'veh',type:'is'}]}]},
  {title:'Code the core',short:'Code',secs:600,think:'Write the classes and <code>park</code> / <code>leave</code>.',code:`
import math
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import IntEnum

class SpotSize(IntEnum):          # ordered: a vehicle fits any spot >= its size
    SMALL = 1
    MEDIUM = 2
    LARGE = 3

class Vehicle(ABC):
    size: SpotSize
    def __init__(self, plate: str): self.plate = plate

class Bike(Vehicle):  size = SpotSize.SMALL
class Car(Vehicle):   size = SpotSize.MEDIUM
class Truck(Vehicle): size = SpotSize.LARGE

class VehicleFactory:
    _types = {"bike": Bike, "car": Car, "truck": Truck}
    @classmethod
    def create(cls, kind: str, plate: str) -> Vehicle:
        return cls._types[kind](plate)

class ParkingSpot:
    def __init__(self, spot_id: str, size: SpotSize):
        self.spot_id, self.size, self.vehicle = spot_id, size, None

    def fits(self, v: Vehicle) -> bool:
        return self.vehicle is None and self.size >= v.size

    def assign(self, v: Vehicle):
        if not self.fits(v):
            raise ValueError(f"{self.spot_id} cannot take {v.plate}")
        self.vehicle = v

    def release(self):
        self.vehicle = None

class Level:
    def __init__(self, number: int, spots: list[ParkingSpot]):
        self.number, self.spots = number, spots

    def free_spots(self, size: SpotSize) -> list[ParkingSpot]:
        return [s for s in self.spots if s.vehicle is None and s.size == size]

class AllocationStrategy(ABC):
    @abstractmethod
    def find_spot(self, levels: list[Level], v: Vehicle) -> ParkingSpot | None: ...

class SmallestFitFirst(AllocationStrategy):
    def find_spot(self, levels, v):
        for size in sorted(SpotSize):
            if size < v.size:
                continue
            for level in levels:
                free = level.free_spots(size)
                if free:
                    return free[0]
        return None

class PricingStrategy(ABC):
    @abstractmethod
    def fee(self, entry: datetime, exit: datetime, size: SpotSize) -> int: ...

class HourlyPricing(PricingStrategy):
    def __init__(self, rates: dict[SpotSize, int]): self.rates = rates
    def fee(self, entry, exit, size):
        hours = max(1, math.ceil((exit - entry).total_seconds() / 3600))
        return hours * self.rates[size]

@dataclass
class Ticket:
    ticket_id: str
    vehicle: Vehicle
    spot: ParkingSpot
    entry: datetime

class ParkingLot:
    def __init__(self, levels, allocation: AllocationStrategy, pricing: PricingStrategy):
        self.levels, self.allocation, self.pricing = levels, allocation, pricing
        self.active: dict[str, Ticket] = {}

    def park(self, v: Vehicle, now: datetime) -> Ticket:
        spot = self.allocation.find_spot(self.levels, v)
        if spot is None:
            raise RuntimeError("lot full for this vehicle size")
        spot.assign(v)
        ticket = Ticket(uuid.uuid4().hex[:8], v, spot, now)
        self.active[ticket.ticket_id] = ticket
        return ticket

    def leave(self, ticket_id: str, now: datetime) -> int:
        ticket = self.active.pop(ticket_id)          # KeyError = invalid / used ticket
        ticket.spot.release()
        return self.pricing.fee(ticket.entry, now, ticket.spot.size)`,answer:'<p>Notice: the fee uses the <b>spot</b> size (a bike in a car spot pays the car rate) — a rule to confirm with the interviewer. Each rule lives in exactly one class.</p>'},
  {title:'Walk through a test',short:'Test',secs:180,think:'Write 4 lines that park a car and charge it after 2.5 hours.',code:`
from datetime import timedelta
levels = [Level(0, [ParkingSpot("0-S1", SpotSize.SMALL), ParkingSpot("0-M1", SpotSize.MEDIUM)])]
lot = ParkingLot(levels, SmallestFitFirst(), HourlyPricing({SpotSize.SMALL: 10, SpotSize.MEDIUM: 30, SpotSize.LARGE: 60}))
t = lot.park(VehicleFactory.create("car", "KA01AB1234"), now=datetime(2026, 1, 1, 9, 0))
print(lot.leave(t.ticket_id, now=datetime(2026, 1, 1, 11, 30)))     # 3 started hours x 30 = 90`}]}]},

{title:'Lab: run the parking lot',tab:'Lab',mins:20,out:'Edge cases found',lead:'Park vehicles, watch the allocation rule, then click an occupied spot to make it leave and see the fee.',blocks:[
 {t:'lab',fn:'parking'},
 {t:'teacher',items:['Fill all small spots, then park a bike: it takes a medium spot. Ask: is that what the business wants? It is a requirement question, not a coding question.','Park trucks until full and show the error. Ask how the entry gate should behave (display "FULL" for that size).']}]},

{title:'Extensions and concurrency',tab:'Extensions',mins:15,out:'Answers to 5 extensions',blocks:[
 {t:'reveal',cols:2,items:[
  {q:'"Add EV charging spots."',a:'Add an <code>ev_charger</code> flag or an <code>EVSpot</code> subclass; an allocation strategy that prefers EV spots for electric vehicles; pricing adds a per-kWh charge (Decorator around the pricing strategy).'},
  {q:'"Weekend pricing is flat ₹100."',a:'New <code>WeekendFlatPricing</code> strategy, chosen by a small <code>PricingSelector</code> based on the date. ParkingLot does not change.'},
  {q:'"Show free spots per level on display boards at each entrance."',a:'Observer: ParkingSpot (or Level) publishes "spot_changed"; DisplayBoard subscribes and updates its counts.'},
  {q:'"Two entry gates park cars at the same moment."',a:'Two threads can pick the same free spot. Guard <code>find_spot + assign</code> with a lock (per level, or per lot), or make <code>assign</code> an atomic compare-and-set and retry with the next spot on failure.'},
  {q:'"Lost ticket."',a:'Look up the active ticket by plate number (keep a plate → ticket index) and charge the maximum daily rate per policy.'}]},
 {t:'code',title:'Thread-safe park (one lock per lot, simplest correct version)',code:`
import threading

class ThreadSafeParkingLot(ParkingLot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._lock = threading.Lock()

    def park(self, v, now):
        with self._lock:                 # find + assign must be one atomic step
            return super().park(v, now)

    def leave(self, ticket_id, now):
        with self._lock:
            return super().leave(ticket_id, now)`,note:'Trade-off: one lock is simple but serialises all gates. Per-level locks allow more parallelism but need care to avoid deadlocks.'}]},

{title:'Score and review',tab:'Review',mins:10,out:'Rubric + homework',blocks:[
 {t:'rubric',title:'LLD rubric',rows:[['Requirements','Asked sizes, types, pricing, fallback rules'],['Entities','Right classes, one responsibility each'],['Relationships','Correct has-a / is-a / uses'],['Patterns','Strategy/Factory used for a reason'],['Code','Runs; handles full lot and invalid ticket'],['Extension','New feature = new class, not edits everywhere']]},
 {t:'task',title:'Homework',items:['Add monthly passes: pass holders park free on their assigned level. Write the classes you would add and the one place you would change.']}]}
],
labs:{
 parking(el,api){
  const sizes={S:'SMALL',M:'MEDIUM',L:'LARGE'},rank={S:1,M:2,L:3},need={bike:'S',car:'M',truck:'L'},rate={S:10,M:30,L:60};
  const lv=[0,1].map(n=>({n,spots:[...['S','S'],...['M','M','M','M'],...['L']].map((s,i)=>({id:`${n}-${s}${i+1}`,size:s,v:null}))}));
  let cnt=0;const log=[];
  el.innerHTML=`<div class="row"><button class="btn" data-p="bike">Park a bike</button><button class="btn" data-p="car">Park a car</button><button class="btn" data-p="truck">Park a truck</button><label style="flex-direction:row;align-items:center;gap:6px;margin-left:8px">Hours parked when leaving <input type="number" min="0.1" step="0.5" value="2.5" data-h style="width:80px"></label><button class="btn small" data-reset>Reset</button></div><div class="grid2" style="align-items:start"><div class="col" data-levels style="gap:10px"></div><div class="log" data-log aria-live="polite"></div></div><p class="muted small">Rule: smallest free spot that fits, lowest level first. Click an occupied spot to make that vehicle leave. Rates per started hour: small ₹10, medium ₹30, large ₹60.</p>`;
  const draw=()=>{api.$('[data-levels]',el).innerHTML=lv.map(l=>`<div class="optcard"><h4>Level ${l.n} · ${l.spots.filter(s=>!s.v).length} free</h4><div class="row">${l.spots.map(s=>`<button class="btn small" data-s="${s.id}" style="min-width:76px;${s.v?'background:var(--accent-soft);border-color:var(--accent)':''}" title="${sizes[s.size]}">${s.id}<br><span class="mono" style="font-size:.7rem">${s.v?s.v.kind+' '+s.v.plate:'free'}</span></button>`).join('')}</div></div>`).join('');
   api.$('[data-log]',el).innerHTML=log.length?log.slice(-12).map(x=>`<div class="${x[0]}">${x[1]}</div>`).join(''):'<span class="muted">Park something.</span>'};
  el.addEventListener('click',e=>{const p=e.target.closest('[data-p]'),s=e.target.closest('[data-s]');
   if(e.target.closest('[data-reset]')){lv.forEach(l=>l.spots.forEach(x=>x.v=null));log.length=0;draw();return}
   if(p){const k=p.dataset.p,n=need[k];let spot=null;for(const sz of ['S','M','L']){if(rank[sz]<rank[n])continue;for(const l of lv){spot=l.spots.find(x=>!x.v&&x.size===sz);if(spot)break}if(spot)break}
    cnt++;const plate='KA'+String(cnt).padStart(2,'0');
    if(!spot)log.push(['r-bad',`${k} ${plate}: RuntimeError("lot full for this vehicle size")`]);else{spot.v={kind:k,plate};log.push([spot.size===n?'a':'b',`${k} ${plate} → spot ${spot.id}${spot.size!==n?' (no '+sizes[n].toLowerCase()+' spot free, used '+sizes[spot.size].toLowerCase()+')':''}`])}draw()}
   if(s){let spot;lv.forEach(l=>l.spots.forEach(x=>{if(x.id===s.dataset.s)spot=x}));if(!spot||!spot.v)return;const h=Math.max(.1,+api.$('[data-h]',el).value||1),hrs=Math.max(1,Math.ceil(h)),fee=hrs*rate[spot.size];log.push(['r-good',`${spot.v.kind} ${spot.v.plate} leaves ${spot.id} after ${h} h → ${hrs} h × ₹${rate[spot.size]} = ₹${fee}`]);spot.v=null;draw()}});draw()}
}});
