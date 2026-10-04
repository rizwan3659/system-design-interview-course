COURSE.add({id:'s18',n:18,part:'C',track:'LLD',
title:'LLD case study: elevator system',
goal:'Design a multi-elevator controller: requests, scheduling algorithms, dispatching between cars, states and failure handling.',
outcomes:['Separate hall calls, car calls, dispatching and per-car scheduling','Compare FCFS, nearest-first, SCAN and LOOK with numbers','Write an elevator that serves stops in LOOK order','Model states (idle, moving, maintenance) and extend safely'],
concept:'lld',
tasks:[{t:'Complete the elevator LLD lab.',auto:'s18lab'},{t:'Explain why the elevator is modelled as a state machine.'},{t:'Answer the elevator interview checkpoint.',auto:'s18cp'},{t:'Rate yourself: can you compare scheduling algorithms without notes?',auto:'s18sum'}],
modules:[
{title:'Warm-up',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Behaviour changes with lifecycle (idle, moving, maintenance) →',opts:['State','Adapter'],a:0},
  {q:'Swappable rule for choosing which car answers a call →',opts:['Strategy','Builder'],a:0},
  {q:'Two threads assign the same spot. Fix?',opts:['Make find + assign atomic (lock or compare-and-set)','Add more spots'],a:0}]}]},

{title:'Clarify the requirements',tab:'Clarify',mins:15,out:'Agreed scope',lead:'Prompt: <b>"Design an elevator system for a building."</b>',blocks:[
 {t:'reveal',cols:2,title:'Questions to ask (answer first, then reveal)',items:[
  {q:'How many floors and elevators?',a:'Assume 16 floors (0–15), 4 elevators, capacity 10 people.'},
  {q:'What kinds of requests exist?',a:'<b>Hall calls</b> (outside: floor + up/down) and <b>car calls</b> (inside: destination floor).'},
  {q:'What should we optimise?',a:'Average wait time first, then travel time; avoid starving far floors.'},
  {q:'Special modes?',a:'Maintenance (car out of service), fire mode (all cars to ground floor), VIP/express are extensions.'}]},
 {t:'grid',cols:2,items:[
  {tag:'Two separate decisions',title:'Dispatching',body:'Which car answers a hall call? Done by the controller using a DispatchStrategy.'},
  {tag:'Two separate decisions',title:'Scheduling',body:'In what order does one car visit its stops? Done by the car (e.g. LOOK). Keeping these separate is the key insight.'}]}]},

{title:'Guided design',tab:'Guided design',mins:45,out:'UML + elevator code',blocks:[
 {t:'stepper',steps:[
  {title:'Entities',short:'Entities',secs:150,think:'List classes and who owns each decision.',answer:'<p><b>ElevatorController</b> (receives calls, dispatches) · <b>Elevator</b> (floor, direction, stops, moves one floor per tick) · <b>Request</b> (floor, direction) · <b>Direction</b> enum · <b>DispatchStrategy</b> (choose a car) · <b>ElevatorState</b> (Idle, Moving, Maintenance) · buttons/panels produce requests.</p>'},
  {title:'Class diagram',short:'UML',secs:240,think:'Draw it, then compare.',blocks:[{t:'uml',classes:[
    {id:'ctl',name:'ElevatorController',x:20,y:20,fields:['- elevators: list[Elevator]','- dispatch: DispatchStrategy'],methods:['+ hall_call(floor, dir)','+ car_call(eid, floor)','+ step()'],note:'Entry point for all button presses. Picks a car for hall calls (via the strategy) and advances time.'},
    {id:'disp',name:'DispatchStrategy',kind:'interface',x:320,y:20,methods:['choose(cars, floor, dir)'],note:'Which car should answer a hall call. Swappable: nearest suitable car, zoning, least busy.'},
    {id:'near',name:'NearestSuitable',x:320,y:150,methods:['choose(cars, floor, dir)'],note:'Prefers idle cars or cars already moving toward the floor in the same direction.'},
    {id:'req',name:'Request',x:590,y:20,fields:['floor: int','direction: Direction'],note:'A hall call: floor plus requested direction.'},
    {id:'el',name:'Elevator',x:20,y:220,fields:['id: int','floor: int','direction: Direction','up_stops: set[int]','down_stops: set[int]','state: ElevatorState'],methods:['+ add_stop(floor)','+ step()'],note:'Owns its own stop list and moves one floor per tick, serving stops in LOOK order.'},
    {id:'st',name:'ElevatorState',kind:'interface',x:320,y:280,methods:['step(elevator)','on_request(elevator, floor)'],note:'State pattern: what step() and new requests mean in each mode.'},
    {id:'idle',name:'Idle',x:250,y:440,methods:['step(e)'],note:'Waits; a new stop moves it to Moving.'},
    {id:'mov',name:'Moving',x:390,y:440,methods:['step(e)'],note:'Moves one floor; opens doors at stops; reverses or goes Idle when nothing is ahead.'},
    {id:'mnt',name:'Maintenance',x:530,y:440,methods:['step(e)'],note:'Ignores requests; dispatcher must skip this car.'}],
   rels:[{from:'ctl',to:'el',type:'has',label:'1..*'},{from:'ctl',to:'disp',type:'uses'},{from:'near',to:'disp',type:'impl'},{from:'disp',to:'req',type:'uses'},{from:'el',to:'st',type:'assoc'},{from:'idle',to:'st',type:'impl'},{from:'mov',to:'st',type:'impl'},{from:'mnt',to:'st',type:'impl'}]}]},
  {title:'Code the core',short:'Code',secs:540,think:'Write Elevator.step() with LOOK, and a dispatcher.',code:`
from abc import ABC, abstractmethod
from enum import Enum

class Direction(Enum):
    UP = 1
    DOWN = -1
    IDLE = 0

class Elevator:
    def __init__(self, eid: int, floors: int):
        self.eid, self.floors = eid, floors
        self.floor, self.direction = 0, Direction.IDLE
        self.up_stops: set[int] = set()      # stops above the car
        self.down_stops: set[int] = set()    # stops below the car
        self.in_maintenance = False

    def add_stop(self, floor: int):
        if not 0 <= floor < self.floors:
            raise ValueError("no such floor")
        if floor > self.floor:
            self.up_stops.add(floor)
        elif floor < self.floor:
            self.down_stops.add(floor)
        else:
            self.open_doors()

    def step(self):
        """Move one floor. LOOK: keep going while stops remain ahead, then reverse."""
        if self.direction is Direction.IDLE:
            if self.up_stops:
                self.direction = Direction.UP
            elif self.down_stops:
                self.direction = Direction.DOWN
            else:
                return
        self.floor += self.direction.value
        ahead = self.up_stops if self.direction is Direction.UP else self.down_stops
        if self.floor in ahead:
            ahead.discard(self.floor)
            self.open_doors()
        if not ahead:
            behind = self.down_stops if self.direction is Direction.UP else self.up_stops
            if behind:
                self.direction = Direction.DOWN if self.direction is Direction.UP else Direction.UP
            else:
                self.direction = Direction.IDLE

    def open_doors(self):
        print(f"car {self.eid}: doors open at floor {self.floor}")

class DispatchStrategy(ABC):
    @abstractmethod
    def choose(self, cars: list[Elevator], floor: int, direction: Direction) -> Elevator: ...

class NearestSuitable(DispatchStrategy):
    def choose(self, cars, floor, direction):
        def cost(car):
            if car.in_maintenance:
                return float("inf")
            distance = abs(car.floor - floor)
            on_the_way = (car.direction is direction is Direction.UP and car.floor <= floor) or \
                         (car.direction is direction is Direction.DOWN and car.floor >= floor)
            if car.direction is Direction.IDLE or on_the_way:
                return distance
            return distance + 2 * car.floors          # busy the other way: penalise
        best = min(cars, key=cost)
        if cost(best) == float("inf"):
            raise RuntimeError("no elevator in service")
        return best

class ElevatorController:
    def __init__(self, cars: int, floors: int, dispatch: DispatchStrategy):
        self.cars = [Elevator(i, floors) for i in range(cars)]
        self.dispatch = dispatch

    def hall_call(self, floor: int, direction: Direction) -> int:
        car = self.dispatch.choose(self.cars, floor, direction)
        car.add_stop(floor)
        return car.eid

    def car_call(self, eid: int, floor: int):
        self.cars[eid].add_stop(floor)

    def step(self):
        for car in self.cars:
            if not car.in_maintenance:
                car.step()`,answer:'<p>For brevity the code uses a Direction enum plus a maintenance flag; the UML shows how those become State classes when modes multiply (fire mode, VIP, inspection).</p>'},
  {title:'Challenge',short:'Challenge',secs:180,think:'Car 2 is put into maintenance while it has 3 pending stops. What should happen?',answer:'Its pending <b>hall</b> calls are re-dispatched to other cars through the controller; its <b>car</b> calls are dropped (passengers leave at the next floor). The car finishes moving to the nearest floor, opens doors, then enters Maintenance. This is exactly where a State class (MaintenanceRequested → Maintenance) keeps the logic tidy.'}]}]},

{title:'Lab: compare scheduling algorithms',tab:'Lab',mins:25,out:'Algorithm choice with numbers',lead:'One car, 16 floors. Edit the requests and starting floor, then compare total travel and the path each algorithm takes.',blocks:[
 {t:'lab',fn:'lift'},
 {t:'teacher',items:['Nearest-first (SSTF) often wins on distance but can starve far floors when new nearby requests keep arriving. LOOK is a fair, simple default.']}]},

{title:'Extensions',tab:'Extensions',mins:10,out:'Answers to 4 extensions',blocks:[
 {t:'reveal',cols:2,items:[
  {q:'"Fire alarm: all cars go to the ground floor and stop."',a:'Controller broadcasts an emergency event (Observer); each car switches to a FireMode state that clears stops, goes to floor 0, opens doors, ignores calls.'},
  {q:'"Weight limit: do not stop for hall calls when full."',a:'Car tracks load from a sensor; dispatcher\'s cost function treats full cars as unavailable for hall calls; car still serves car calls.'},
  {q:'"Floors 0–7 served by cars A, B; 8–15 by C, D at peak."',a:'A ZoningDispatch strategy. Switch strategies by time of day: no change to Elevator.'},
  {q:'"Show the car position on every floor display."',a:'Observer: each car publishes floor changes; displays subscribe.'}]},
 {t:'lldlab',id:'s18lab',title:'LLD lab · A single elevator car',level:'x',concept:'lld',intro:'Work through each stage. Write your own answer before revealing the solution.',stages:[{k:'Requirements',prompt:'Design one elevator car that serves requests.',hint:'Internal buttons vs hall calls? Direction rules? Doors?',solution:'Floor requests from inside and hall calls (up/down) from outside; the car keeps moving in its current direction while requests remain that way (SCAN/LOOK); doors open at requested floors; states: idle, moving up, moving down, doors open.'},{k:'Identify objects',prompt:'List the classes (nouns) you need.',hint:'What are the moving parts?',solution:'<b>Elevator</b> (current floor, direction, state), <b>Request</b> (floor, direction), <b>Direction</b>/<b>State</b> enums, <b>Scheduler</b> (strategy for multi-car dispatch), <b>Controller</b>.'},{k:'Responsibilities',prompt:'For each class: what does it own, what does it do, who does it talk to?',hint:'Who decides the next stop?',solution:'The Elevator keeps two sorted sets of stops (above and below) and moves one floor per step (LOOK). A Dispatcher (strategy) chooses which car gets a hall call when there are several cars.'},{k:'Interface',prompt:'Write the public methods (names, inputs, outputs) before any implementation.',hint:'API.',solution:'<code>request(floor)</code>, <code>step() → event</code> (advance one tick: move a floor or open doors), <code>state</code>, <code>floor</code>.'},{k:'Implementation',prompt:'Implement the core in Python.',code:true,lang:'python',starter:`class Elevator:
    def __init__(self, floors, start=0):
        ...
    def request(self, floor):
        ...
    def step(self):
        ...
`,solution:`class Elevator:
    def __init__(self, floors, start=0):
        self.floors, self.floor = floors, start
        self.up, self.down = set(), set()
        self.dir = 0                          # 1 up, -1 down, 0 idle
        self.log = []

    def request(self, floor):
        if not 0 <= floor < self.floors:
            raise ValueError("no such floor")
        if floor > self.floor: self.up.add(floor)
        elif floor < self.floor: self.down.add(floor)
        else: self.log.append(("open", floor))

    def step(self):
        if self.dir == 0:                     # idle: pick the nearer side
            if not self.up and not self.down:
                return None
            self.dir = 1 if self.up and (not self.down or min(self.up) - self.floor <= self.floor - max(self.down)) else -1
        self.floor += self.dir
        stops = self.up if self.dir == 1 else self.down
        if self.floor in stops:
            stops.discard(self.floor)
            self.log.append(("open", self.floor))
        if not stops:                          # LOOK: reverse only when nothing ahead
            self.dir = -1 if self.dir == 1 and self.down else 1 if self.dir == -1 and self.up else 0
        return self.floor`},{k:'Edge cases',prompt:'What inputs or situations could break it?',hint:'Think about empty, full, duplicate, concurrent and invalid inputs.',solution:'A request for the current floor; requests above and below while moving (do not reverse early); an invalid floor; door held open; overload sensor; emergency stop; power loss (return to ground floor).'},{k:'Tests',prompt:'Write the test cases you would run (input → expected).',hint:'One happy path, one per edge case.',solution:'start 0, request 5 and 2 → stops 2 then 5; at floor 5 moving up with requests 7 and 1 → 7 then 1; request current floor → doors open, no move; request floor 99 in 10-floor building → ValueError; no requests → step() returns None.'}]}]},

{title:'Score and review',tab:'Review',mins:15,out:'Rubric + homework',blocks:[
 {t:'flash',items:[['Dispatching vs scheduling?','Which car answers vs in what order one car visits its stops.'],['LOOK?','Serve stops in the current direction until none remain ahead, then reverse.'],['SCAN vs LOOK?','SCAN goes to the end of the building before reversing; LOOK turns at the last request.'],['Why can nearest-first starve?','Nearby requests keep winning; far floors wait indefinitely.'],['Maintenance mode?','Re-dispatch hall calls, finish current move, ignore new calls.']]},
 {t:'rubric',title:'LLD rubric',rows:[['Requirements','Hall vs car calls, goals, modes'],['Entities','Controller, Elevator, strategies, states'],['Patterns','Strategy for dispatch, State for modes'],['Code','LOOK step() correct; dispatcher skips maintenance'],['Extension','Fire mode/zoning added without rewrites']]},
 {t:'task',title:'Homework',items:['Write a FireMode state class and the controller method that activates it for all cars.']},
 {t:'checkpoint',id:'s18cp',title:'Interview checkpoint',prompt:'"Design an elevator system for a 40-floor building with 6 cars."',steps:['Clarify cars, floors, request types, peak patterns, failure modes','Classes: Building, Elevator, Request, Dispatcher, Door, Display','Model each car as a state machine','Single-car algorithm (LOOK) and why not FCFS','Dispatch strategy across cars (nearest suitable, zoning at peak)','Interfaces for request and step/tick','Concurrency: many hall calls at once','Failures: car out of service, overload, emergency'],model:'Each Elevator runs LOOK over its stop sets; a Dispatcher (strategy) assigns hall calls to the car with the lowest estimated arrival time considering direction; zoning in the morning peak. Out-of-service cars are excluded and their calls reassigned.',followups:[['"Morning rush: everyone goes up from the lobby."','Zone cars to floor ranges and return idle cars to the lobby.'],['"A car breaks down."','Mark it out of service; reassign its hall calls; inside calls are served by rescue procedures.']]},
 {t:'recall',title:'Active recall',items:[['Why model a car as a state machine?','Valid transitions are explicit (idle → moving → doors open), and invalid ones (move with doors open) are impossible.'],['LOOK vs FCFS?','LOOK keeps going one way while requests remain that way, cutting travel; FCFS zig-zags.'],['Where does the dispatch strategy live?','In a Dispatcher (strategy), separate from the car’s movement logic.'],['What happens on a request for the current floor?','Open the doors; no movement.'],['One failure to plan for?','Car out of service, overload, power loss, stuck door.']]},
 {t:'summary',id:'s18sum',title:'Session summary',learned:['<b>Why state machines:</b> explicit, testable transitions','<b>When to use LOOK:</b> single-car scheduling','<b>When to dispatch differently:</b> peak hours, zoning','<b>Trade-offs:</b> wait time vs travel vs energy','<b>Interview questions:</b> dispatch, states, failures, concurrency'],explain:'Explain how one car chooses its next stop and how a dispatcher picks a car.'}]}
],
labs:{
 lift(el,api){
  el.innerHTML=`<div class="form"><label>Requests (floors 0–15, in arrival order)<input type="text" value="7, 2, 12, 3, 9, 1, 14, 6" data-r></label><label>Car starts at floor<input type="number" min="0" max="15" value="5" data-s></label><label>Initial direction<select data-d><option value="1">Up</option><option value="-1">Down</option></select></label></div><div class="row" data-algs></div><div class="svgbox"><svg viewBox="0 0 640 260" data-svg role="img" aria-label="Elevator path by algorithm"></svg></div><div class="tbl"><table><thead><tr><th>Algorithm</th><th>Visit order</th><th>Floors travelled</th></tr></thead><tbody data-t></tbody></table></div><div class="verdict" data-v></div>`;
  const A={FCFS:'First come, first served',SSTF:'Nearest first',SCAN:'SCAN (to the end, then back)',LOOK:'LOOK (turn at last request)'};let sel='LOOK';
  api.$('[data-algs]',el).innerHTML=Object.keys(A).map(k=>`<button class="btn small" data-a="${k}" aria-pressed="${k===sel}">${A[k]}</button>`).join('');
  const plan=(alg,s,R,d)=>{R=[...new Set(R)];if(alg==='FCFS')return R;if(alg==='SSTF'){let cur=s;const left=[...R],o=[];while(left.length){left.sort((a,b)=>Math.abs(a-cur)-Math.abs(b-cur));cur=left.shift();o.push(cur)}return o}
   const up=R.filter(f=>f>=s).sort((a,b)=>a-b),dn=R.filter(f=>f<s).sort((a,b)=>b-a);
   if(alg==='LOOK')return d>0?[...up,...dn]:[...dn,...up.slice().sort((a,b)=>a-b)];
   if(d>0)return dn.length?[...up,...(up.at(-1)===15?[]:['end15']),...dn]:up;const upAsc=up.slice().sort((a,b)=>a-b);return upAsc.length?[...dn,...(dn.at(-1)===0?[]:['end0']),...upAsc]:dn};
  const dist=(s,o)=>{let c=s,t=0;for(const f of o){const v=f==='end15'?15:f==='end0'?0:f;t+=Math.abs(v-c);c=v}return t};
  const draw=()=>{const R=api.$('[data-r]',el).value.split(/[^0-9]+/).filter(Boolean).map(Number).filter(n=>n>=0&&n<=15),s=Math.min(15,Math.max(0,+api.$('[data-s]',el).value||0)),d=+api.$('[data-d]',el).value;
   const res={};Object.keys(A).forEach(k=>{const o=plan(k,s,R,d);res[k]={o,t:dist(s,o)}});const maxT=Math.max(...Object.values(res).map(r=>r.t),1);
   const X=t=>50+t/maxT*570,Y=f=>230-f*13.5;let svg='';for(let f=0;f<=15;f+=3)svg+=`<line x1="50" x2="620" y1="${Y(f)}" y2="${Y(f)}" stroke="var(--line)"/><text x="42" y="${Y(f)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${f}</text>`;
   svg+=`<text x="50" y="252" font-size="11" fill="var(--muted)">0 floors travelled</text><text x="620" y="252" text-anchor="end" font-size="11" fill="var(--muted)">${maxT}</text>`;
   Object.keys(A).forEach(k=>{let c=s,t=0;const pts=[[X(0),Y(s)]];const stops=[];res[k].o.forEach(f=>{const v=f==='end15'?15:f==='end0'?0:f;t+=Math.abs(v-c);c=v;pts.push([X(t),Y(v)]);if(typeof f==='number')stops.push([X(t),Y(v)])});
    const on=k===sel;svg+=`<path d="M${pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')}" fill="none" stroke="${on?'var(--accent)':'var(--muted)'}" stroke-width="${on?2.5:1}" opacity="${on?1:.35}"/>`;if(on)svg+=stops.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent)"/>`).join('')});
   api.$('[data-svg]',el).innerHTML=svg;const best=Object.keys(res).reduce((a,b)=>res[a].t<=res[b].t?a:b);
   api.$('[data-t]',el).innerHTML=Object.keys(A).map(k=>`<tr${k===sel?' style="background:var(--accent-soft)"':''}><td>${A[k]}</td><td class="mono">${s} → ${res[k].o.map(f=>f==='end15'?'(15)':f==='end0'?'(0)':f).join(' → ')}</td><td class="mono">${res[k].t}${k===best?' <span class="tag green">lowest</span>':''}</td></tr>`).join('');
   api.$('[data-v]',el).innerHTML=`FCFS travels ${res.FCFS.t} floors by zig-zagging; LOOK travels ${res.LOOK.t}. Nearest-first is ${res.SSTF.t} here, but with a steady stream of nearby calls it can make a far floor wait forever. LOOK is fair and close to optimal, which is why it is the common default.`};
  el.addEventListener('input',draw);el.addEventListener('change',draw);el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;sel=b.dataset.a;api.$$('[data-a]',el).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw()});draw()}
}});
