/* Run: node tests/content.test.js
   Loads every session and case without a browser and checks: known block types, unique block ids,
   diagram edges that point at real nodes, and task auto-links that point at real blocks. */
const path=require('path');const R=p=>require(path.join(__dirname,'..',p));
global.window=global;
global.document={addEventListener(){},querySelector(){return null},querySelectorAll(){return[]}};
global.localStorage={_:{},getItem(k){return this._[k]??null},setItem(k,v){this._[k]=v},removeItem(k){delete this._[k]}};
global.matchMedia=()=>({matches:false});
R('js/core.js');SDC.M=R('js/models.js');R('js/diagram.js');
['predict','decide','interview','recall','tasks','capacity','latency','scalelab','cachesim','queuesim','shardsim','replsim','ratelimit','consistency','builder','lld'].forEach(f=>R('js/components/'+f+'.js'));
for(let i=1;i<=20;i++)R('sessions/s'+String(i).padStart(2,'0')+'.js');
R('cases/cases-a.js');R('cases/cases-b.js');R('js/pages.js');

const known=new Set(Object.keys(COURSE.blocks).concat(['text','table','grid','code','task','cards','sort','mcq','reveal','flash','drill','rubric','checklist','notes','timer','stepper','arch','uml','lab','teacher']));
const bad=[],ids={};let diagrams=0;
SDC.walk((b,key,ses)=>{
  if(!known.has(b.t))bad.push(`${key}: unknown block type ${b.t}`);
  if(b.id){const k=ses.id+':'+b.id;if(ids[k])bad.push('duplicate id '+k);ids[k]=1}
  if(b.t==='lab'&&!(ses.labs&&ses.labs[b.fn])&&!['estimator','seatRace','story'].includes(b.fn))bad.push(`${key}: lab ${b.fn} not found`);
  const specs=[];if(b.t==='diagram')specs.push(b);if(b.t==='evolve')specs.push(...b.stages);if(b.ref)specs.push(b.ref);if(b.hld)specs.push(b.hld);if(b.options)specs.push(...b.options);
  specs.filter(s=>s.nodes&&typeof s.nodes[0]==='string').forEach(s=>{try{const p=SDC.dgParse(s);const nid=new Set(p.nodes.map(n=>n.id));p.edges.forEach(e=>{if(!nid.has(e.a)||!nid.has(e.b))bad.push(`${key}: edge ${e.a}>${e.b} has no node`)});diagrams++}catch(err){bad.push(`${key}: ${err.message}`)}})});
[...COURSE.sessions,...COURSE.cases].forEach(s=>{
  if(!s.tasks||!s.tasks.length)bad.push(`${s.id}: no session tasks`);
  (s.tasks||[]).forEach(t=>{if(t.auto&&!ids[s.id+':'+t.auto])bad.push(`${s.id}: task auto-link ${t.auto} has no block`)});
  const types=new Set();SDC.walk((b,k,x)=>{if(x===s)types.add(b.t)});
  if(s.kind!=='case'&&!types.has('recall')&&s.n!==20)bad.push(`${s.id}: no active-recall block`);
  if(s.kind!=='case'&&!types.has('summary'))bad.push(`${s.id}: no session summary`)});
COURSE.sessions.forEach(s=>{const m=s.modules.filter(x=>!x.selfStudy).reduce((a,x)=>a+x.mins,0);if(m!==120)bad.push(`${s.id}: class modules add up to ${m} min, not 120`)});
console.log(`${COURSE.sessions.length} sessions, ${COURSE.cases.length} cases, ${diagrams} diagrams, ${SDC.items('lab').length} labs, ${SDC.items('interview').length} interview items`);
if(bad.length){console.error(bad.join('\n'));process.exitCode=1}else console.log('content ok');
