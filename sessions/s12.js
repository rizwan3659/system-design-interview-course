COURSE.add({id:'s12',n:12,part:'B',track:'HLD',
title:'Case study: ride-hailing like Uber',
goal:'Design a location-heavy, real-time system: millions of moving drivers, fast nearby search, safe matching and a trip lifecycle.',
outcomes:['Index locations with geohashes or quadtrees','Handle a firehose of location updates in memory','Match riders to drivers without double assignment','Model the trip as a state machine and handle failures'],
modules:[
{title:'Warm-up',tab:'Warm-up',mins:10,out:'Recall quiz',blocks:[
 {t:'mcq',items:[
  {q:'Stopping two buyers taking one seat is solved by…',opts:['A conditional update / lock','A bigger cache'],a:0},
  {q:'High-volume data that is only needed for a few seconds belongs…',opts:['In memory with TTL','In the main SQL database forever'],a:0},
  {q:'Payments after a trip should be…',opts:['Synchronous in the request','Asynchronous with retries and idempotency'],a:1}]}]},

{title:'Clarify and estimate',tab:'Clarify',mins:15,out:'Scope + numbers',lead:'Prompt: <b>"Design the backend for a ride-hailing app."</b>',blocks:[
 {t:'stepper',steps:[
  {title:'Scope',secs:150,think:'Must-haves and never-happen rules.',answer:'<p><b>In:</b> rider requests a ride; nearby drivers are offered it; one accepts; both see live location; trip completes; rider pays. <b>Out:</b> pooling, scheduling ahead, surge pricing details.</p><p><b>Never-happen:</b> one driver assigned two trips at once; a rider charged twice.</p>'},
  {title:'Estimate',secs:150,think:'5 M active drivers at peak sending location every 4 s. 1 M trip requests per hour at peak.',answer:'<ul class="clean"><li>Location updates: 5 M / 4 s = <b>1.25 M writes/s</b>. Too many for a disk database; keep current location in memory, keep history asynchronously.</li><li>Trip requests: ~280/s: modest.</li><li>Each request searches nearby drivers: fast spatial lookup required.</li></ul>'}]}]},

{title:'Geo indexing',tab:'Geo index',mins:25,out:'Explain geohash search',lead:'"Find drivers within 2 km" cannot scan 5 M drivers. Split the map into cells with IDs, and search only the rider\'s cell and its neighbours.',blocks:[
 {t:'grid',title:'Three ways to index location',items:[
  {title:'Geohash',body:'Encodes lat/lng as a string; longer prefix = smaller cell (6 chars ≈ 1.2 km × 0.6 km). Nearby points share prefixes. Easy to shard and store in key-value stores (Redis GEO uses a similar idea).'},
  {title:'Quadtree',body:'Recursively splits a cell into four until each has ≤ N drivers. Dense cities get small cells, deserts big ones. Usually kept in memory.'},
  {title:'S2 / H3 cells',body:'Sphere-aware cell systems (Google S2, Uber H3 hexagons). Equal-ish cell areas; hexagons have uniform neighbours.'}]},
 {t:'lab',fn:'geo',title:'Lab · Search the rider\'s cell and its neighbours',intro:'Click anywhere on the map to place the rider. Change the cell size and see how many drivers you check.'},
 {t:'reveal',items:[
  {q:'Why search the neighbouring cells too?',a:'A driver 50 m away can sit just across a cell border. Checking the 8 neighbours covers that.'},
  {q:'What if no drivers are found nearby?',a:'Widen the search: shorter geohash prefix (bigger cells) or a second ring of neighbours, up to a limit.'},
  {q:'How do you shard the location index?',a:'By city/region (most trips are local), then by cell within a city. Avoid sharding by driverId: nearby search would hit every shard.'}]}]},

{title:'Guided design',tab:'Guided design',mins:40,out:'Architecture + trip state machine',blocks:[
 {t:'stepper',steps:[
  {title:'APIs',secs:150,think:'Rider and driver APIs.',answer:'<p>Rider: <code>POST /trips {pickup, dropoff}</code> (idempotency key) · <code>GET /trips/{id}</code> · WebSocket for driver location and status.</p><p>Driver: <code>POST /drivers/me/location</code> every 4 s (or over a socket) · <code>POST /offers/{id}/accept</code> · <code>POST /trips/{id}/start</code> · <code>/complete</code>.</p>'},
  {title:'Trip state machine',short:'States',secs:180,think:'List the trip states and transitions.',blocks:[{t:'cards',items:[
    {tag:'1',title:'REQUESTED',body:'<p>Rider asked. Matching looks for drivers. → MATCHED, or → CANCELLED (no driver / rider cancels).</p>'},
    {tag:'2',title:'MATCHED',body:'<p>A driver accepted. Driver drives to pickup. → STARTED, or → CANCELLED (fee rules apply).</p>'},
    {tag:'3',title:'STARTED',body:'<p>Rider on board. Location history recorded for fare and safety. → COMPLETED.</p>'},
    {tag:'4',title:'COMPLETED',body:'<p>Fare computed; payment requested asynchronously. → PAID (or PAYMENT_FAILED → retry / collect later).</p>'}]}],answer:'Every transition is a conditional update: <code>UPDATE trips SET state=\'MATCHED\', driver=? WHERE id=? AND state=\'REQUESTED\'</code>. An illegal transition (e.g. complete a cancelled trip) returns 409.'},
  {title:'Matching without double assignment',short:'Matching',secs:180,think:'Offer the trip to the 3 nearest drivers. Two accept at once. What happens?',answer:'Accept = conditional update on the trip (only if still REQUESTED) <b>and</b> on the driver (only if status = AVAILABLE). First one wins; the second gets "trip taken". Alternatively offer to one driver at a time with a 10 s timeout: simpler, slower.'},
  {title:'Design and break it',short:'Design lab',secs:300,think:'Add parts and break things.',blocks:[{t:'arch',title:'Ride-hailing lab',w:760,h:340,
   nodes:[{id:'rider',x:20,y:60,w:110,label:'Rider app'},{id:'driver',x:20,y:230,w:110,label:'Driver app',sub:'GPS every 4 s'},{id:'gw',x:170,y:145,w:120,label:'API / sockets'},{id:'loc',x:340,y:230,w:150,label:'Location service',sub:'1.25 M updates/s'},{id:'geo',x:560,y:230,w:180,label:'In-memory geo index',sub:'sharded by city',opt:'geo'},{id:'match',x:340,y:140,w:150,label:'Matching service'},{id:'trip',x:340,y:40,w:150,label:'Trip service',sub:'state machine'},{id:'tdb',x:560,y:40,w:180,label:'Trips DB',sub:'source of truth'},{id:'pay',x:560,y:140,w:180,label:'Payment workers',sub:'queue + retries',opt:'q'}],
   edges:[{d:'M130 88H150V160H170'},{d:'M130 258H150V190H170'},{d:'M290 160H315V68H340'},{d:'M290 175H340'},{d:'M290 190H315V258H340'},{d:'M490 258H560',opt:'geo',label:'update',lx:500,ly:252},{d:'M490 168H520V244H560',opt:'geo',label:'nearby?',lx:514,ly:222,anchor:'end'},{d:'M490 68H560'},{d:'M490 80H520V150H560',opt:'q'},{d:'M415 286V322H752V68H740',opt:'!geo',dash:true,label:'every ping written to the DB',lx:430,ly:316}],
   toggles:[{id:'geo',label:'In-memory geo index'},{id:'q',label:'Async payments queue'}],
   fails:[
    {label:'Peak: 1.25 M location updates/s',run:o=>o.geo?{lvl:'ok',oks:['geo','loc'],txt:'Updates overwrite one in-memory entry per driver (with TTL); history is batched to cheap storage asynchronously.'}:{lvl:'bad',hits:['tdb'],txt:'Writing every GPS ping to the trips database: 1.25 M writes/s melts it. Keep current location in memory instead.'}},
    {label:'Two drivers accept the same trip',run:o=>({lvl:'ok',oks:['trip'],txt:'Both send accept; the conditional update lets only the first succeed (state REQUESTED → MATCHED). The second driver sees "trip taken" and goes back to available.'})},
    {label:'Payment provider is down',run:o=>o.q?{lvl:'warn',hits:['pay'],txt:'Trip completes normally; payment jobs retry with backoff using the trip id as idempotency key. The rider is charged once, later.'}:{lvl:'bad',hits:['trip'],txt:'Trip completion waits on payment and fails; drivers cannot end trips. Make payment async.'}},
    {label:'A geo-index node (one city) dies',run:o=>o.geo?{lvl:'warn',hits:['geo'],txt:'Matching in that city pauses until a replica takes over. The index rebuilds within seconds because every driver re-sends location every 4 s: the data is self-healing.'}:{lvl:'ok',txt:'No geo index yet.'}},
    {label:'New Year\'s Eve: 10x requests',run:o=>({lvl:'warn',hits:['match'],txt:'Scale stateless matching horizontally per city; queue requests; surge pricing reduces demand. Busy cities can be split into more shards ahead of time.'})}],
   start:'Start without the in-memory index (locations go to the database). Then add it and the payments queue.'}]}]}]},

{title:'Review and failure drill',tab:'Review',mins:30,out:'Drill + rubric + homework',blocks:[
 {t:'drill',prefix:'What happens if… ',button:'Draw a failure',items:[['the driver\'s phone loses GPS for 2 minutes?','Location entry expires (TTL); driver drops out of search; trip continues; ETA shows "updating".'],['the rider cancels exactly when the driver accepts?','Both are conditional updates on the trip state; whichever commits first wins; the other gets 409 and a clear message.'],['the matching service crashes mid-offer?','Offers have a timeout; trip remains REQUESTED; another matcher instance picks it up (requests are in a durable queue).'],['a driver app sends the same "complete" twice?','State already COMPLETED → second call returns the same result (idempotent).']]},
 {t:'flash',items:[['Why in-memory location?','1 M+ updates/s of short-lived data.'],['Geohash search?','Rider\'s cell + 8 neighbours, then distance filter.'],['Shard geo data by…','City / region, then cell.'],['No double assignment?','Conditional update on trip state and driver status.'],['Payments?','Async, idempotent by trip id.']]},
 {t:'rubric',title:'Score yourself',rows:[['Clarify','Scope, scale, never-happen rules'],['Data','Hot location data vs durable trips'],['Design','Geo index, matching, state machine'],['Challenge','Races, provider outage, peak'],['Communication','Clear request trace']]},
 {t:'task',title:'Homework',items:['Design "share my live location with a friend for 1 hour" on top of this system.']}]}
],
labs:{
 geo(el,api){
  const N=32;let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
  const drivers=[];for(let i=0;i<260;i++){const c=rnd()<.65;drivers.push(c?[0.5+(rnd()-.5)*.45,0.5+(rnd()-.5)*.45]:[rnd(),rnd()])}
  let rider=[0.52,0.47];
  el.innerHTML=`<div class="row"><span class="small muted">Cell size:</span><button class="btn small" data-g="4">Large (4×4)</button><button class="btn small" data-g="8" aria-pressed="true">Medium (8×8)</button><button class="btn small" data-g="16">Small (16×16)</button></div><div class="grid2" style="align-items:center"><div class="svgbox" style="max-width:380px;cursor:crosshair"><svg viewBox="0 0 320 320" data-svg role="img" aria-label="City map with drivers and geo cells"></svg></div><div class="col"><div class="out"><div><b data-chk></b><span>drivers checked</span></div><div><b data-tot>260</b><span>drivers in city</span></div><div><b data-near></b><span>within search radius</span></div></div><div class="verdict" data-v></div></div></div>`;
  let G=8;const draw=()=>{const cw=320/G,rc=Math.min(G-1,Math.floor(rider[0]*G)),rr=Math.min(G-1,Math.floor(rider[1]*G));let svg='';
   for(let i=0;i<=G;i++)svg+=`<line x1="${i*cw}" y1="0" x2="${i*cw}" y2="320" stroke="var(--line)"/><line x1="0" y1="${i*cw}" x2="320" y2="${i*cw}" stroke="var(--line)"/>`;
   svg+=`<rect x="${(rc-1)*cw}" y="${(rr-1)*cw}" width="${cw*3}" height="${cw*3}" fill="var(--accent-soft)" stroke="var(--accent)"/><rect x="${rc*cw}" y="${rr*cw}" width="${cw}" height="${cw}" fill="var(--accent-soft)"/>`;
   let chk=0,near=0;const R=0.09;drivers.forEach(d=>{const c=Math.floor(d[0]*G),r=Math.floor(d[1]*G);const inb=Math.abs(c-rc)<=1&&Math.abs(r-rr)<=1;if(inb)chk++;const dist=Math.hypot(d[0]-rider[0],d[1]-rider[1]);const isNear=inb&&dist<=R;if(isNear)near++;
    svg+=`<circle cx="${(d[0]*320).toFixed(1)}" cy="${(d[1]*320).toFixed(1)}" r="3" fill="${isNear?'var(--good)':inb?'var(--warn)':'var(--muted)'}" opacity="${inb?1:.45}"/>`});
   svg+=`<circle cx="${rider[0]*320}" cy="${rider[1]*320}" r="${R*320}" fill="none" stroke="var(--good)" stroke-dasharray="4 3"/><circle cx="${rider[0]*320}" cy="${rider[1]*320}" r="6" fill="var(--marker)"/>`;
   api.$('[data-svg]',el).innerHTML=svg;api.$('[data-chk]',el).textContent=chk;api.$('[data-near]',el).textContent=near;
   api.$('[data-v]',el).innerHTML=`Red = rider. Blue = rider's cell + 8 neighbours. Amber drivers are checked; green ones are inside the dashed radius. ${G===4?'Big cells: you check many drivers for few matches.':G===16?(cw*3/320<R*2?'Small cells: the 3×3 block is narrower than the search circle, so you may miss nearby drivers. Search a second ring.':'Small cells: very few drivers checked.'):'A good balance: few drivers checked, circle covered.'}`};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b){G=+b.dataset.g;api.$$('[data-g]',el).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();return}
   const svg=e.target.closest('svg');if(svg){const r=svg.getBoundingClientRect();rider=[Math.min(.999,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(.999,Math.max(0,(e.clientY-r.top)/r.height))];draw()}});draw()}
}});
