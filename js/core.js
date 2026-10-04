/* Core namespace shared by the engine, components and pages.
   Loaded first. Everything lives on window.SDC; sessions still register through window.COURSE. */
(function(){
'use strict';
window.COURSE={sessions:[],cases:[],blocks:{},labs:{},add(s){this.sessions.push(s)},addCase(c){this.cases.push(c)}};
const SDC=window.SDC=window.SDC||{};

/* ---------- small helpers ---------- */
SDC.$=(s,r)=>(r||document).querySelector(s);
SDC.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
SDC.esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
SDC.node=(tag,cls,html)=>{const d=document.createElement(tag);if(cls)d.className=cls;if(html!=null)d.innerHTML=html;return d};
SDC.store={
  get(k,d){try{const v=localStorage.getItem('sdc:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('sdc:'+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem('sdc:'+k)}catch(e){}},
  keys(){try{return Object.keys(localStorage).filter(k=>k.startsWith('sdc:')).map(k=>k.slice(4))}catch(e){return[]}}};
SDC.reducedMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};

/* ---------- view-scoped timers and listeners (cleared on every route change) ---------- */
let live=[],tos=[],viewL=[];
SDC.every=(fn,ms)=>{const id=setInterval(fn,ms);live.push(id);return id};
SDC.later=(fn,ms)=>{const id=setTimeout(fn,ms);tos.push(id);return id};
SDC.killAll=()=>{live.forEach(clearInterval);tos.forEach(clearTimeout);live=[];tos=[];viewL=[]};

/* ---------- events ---------- */
const L={};
SDC.on=(e,fn)=>{(L[e]=L[e]||[]).push(fn)};
SDC.onView=(e,fn)=>viewL.push([e,fn]);
SDC.emit=(e,d)=>{(L[e]||[]).forEach(f=>{try{f(d)}catch(err){console.error(err)}});viewL.filter(x=>x[0]===e).forEach(x=>{try{x[1](d)}catch(err){console.error(err)}})};

/* ---------- block registry ----------
   meta.phase: learn | visualize | predict | design | experiment | debug | interview | check
   meta.kind:  lab | quiz | interview | recall (what it counts as on the progress dashboard) */
SDC.meta={};
SDC.block=(name,fn,meta)=>{COURSE.blocks[name]=fn;SDC.meta[name]=Object.assign({phase:'learn'},meta||{})};

SDC.PHASES=[['learn','Learn'],['visualize','Visualize'],['predict','Predict'],['design','Design'],['experiment','Experiment'],['debug','Debug'],['interview','Interview'],['check','Check']];
const BASE_PHASE={text:'learn',table:'learn',grid:'learn',cards:'learn',code:'learn',uml:'visualize',mcq:'predict',sort:'predict',stepper:'design',notes:'design',lab:'experiment',drill:'debug',timer:'interview',rubric:'interview',reveal:'check',flash:'check',checklist:'check',task:'check'};
SDC.phaseOf=b=>b.phase||(b.t==='arch'?(b.fails&&b.fails.length?'experiment':'visualize'):b.t==='predict'&&b.kind&&b.kind!=='predict'?'debug':(SDC.meta[b.t]&&SDC.meta[b.t].phase)||BASE_PHASE[b.t]||'learn');
SDC.kindOf=b=>{if(b.t==='lab')return'lab';if(b.t==='arch')return b.fails&&b.fails.length?'lab':null;if(b.t==='timer')return'interview';if(b.t==='predict'&&b.kind==='debug')return'interview';return SDC.meta[b.t]?SDC.meta[b.t].kind||null:null};

/* ---------- challenge levels (text label + shape, never colour alone) ---------- */
SDC.LEVELS={f:['🟢','Foundation'],i:['🟡','Intermediate'],x:['🔴','Interview']};
const DEF_LEVEL={capacity:'f',latency:'f',evolve:'f',diagram:'f',cachesim:'i',queuesim:'i',shardsim:'i',replsim:'i',ratelimit:'i',consistency:'i',scalelab:'i',lldmap:'i',decide:'i',compare:'f',predict:'i',builder:'x',checkpoint:'x',lldlab:'x',timer:'x',lab:'f',arch:'i'};
SDC.levelOf=b=>b.level||((SDC.kindOf(b)||b.t==='predict'||b.t==='decide'||b.t==='compare')?DEF_LEVEL[b.t]||null:null);
SDC.levelHTML=l=>SDC.LEVELS[l]?`<span class="lvl lvl-${l}"><span aria-hidden="true">${SDC.LEVELS[l][0]}</span> ${SDC.LEVELS[l][1]}</span>`:'';

/* ---------- concepts (for mastery) ---------- */
SDC.CONCEPTS={
  interview:'Interview method',estimation:'Estimation',networking:'Networking & APIs',storage:'Databases',caching:'Caching',
  replication:'Replication',sharding:'Sharding',consistency:'Consistency',queues:'Queues & async',reliability:'Reliability & failures',
  ratelimit:'Rate limiting',realtime:'Real-time systems',feeds:'Feeds & fan-out',geo:'Geo & location',
  oop:'OOP & UML',solid:'SOLID',patterns:'Design patterns',lld:'LLD case studies',concurrency:'Concurrency'};

/* ---------- activity log: one record per completed interactive block ---------- */
SDC.act={
  all(){return SDC.store.get('act',{})},
  get(k){return this.all()[k]},
  record(k,r){const a=this.all();const prev=a[k];
    // keep the first score (honest mastery) but remember the latest attempt
    a[k]=Object.assign({},prev||{},r,{at:Date.now(),first:r.keepFirst===false?r.score:prev&&prev.first!=null?prev.first:(r.score!=null?r.score:null)});delete a[k].keepFirst;
    SDC.store.set('act',a);SDC.emit('activity',Object.assign({key:k},a[k]))},
  forSession(sid){const a=this.all();return Object.keys(a).filter(k=>a[k].s===sid).map(k=>Object.assign({key:k},a[k]))},
  hasId(sid,id){const a=this.all();return Object.keys(a).some(k=>a[k].s===sid&&a[k].id===id&&(!a[k].explored||a[k].t==='lab'||a[k].t==='arch'))}};

/* context handed to every component renderer */
SDC.ctx=(b,key,ses,type)=>({
  key,s:ses.id,c:b.concept||ses.concept||'interview',
  get:(k,d)=>SDC.store.get(key+':'+k,d),set:(k,v)=>SDC.store.set(key+':'+k,v),
  done(score,extra){SDC.act.record(key,Object.assign({t:type||b.t,s:ses.id,c:b.concept||ses.concept||'interview',id:b.id||null,score:score==null?null:score,explored:false},extra||{}))},
  isDone(){const r=SDC.act.get(key);return !!(r&&!r.explored)}});

/* ---------- spaced repetition ---------- */
SDC.srs={
  all(){return SDC.store.get('srs',{})},
  get(k){return this.all()[k]},
  grade(k,good,info){const all=this.all();all[k]=SDC.M.srsNext(Object.assign({},info||{},all[k]||{}),good,Date.now());SDC.store.set('srs',all);SDC.emit('srs',k)},
  due(){const all=this.all(),now=Date.now();return Object.keys(all).filter(k=>SDC.M.isDue(all[k],now)).map(k=>Object.assign({key:k},all[k]))}};

SDC.hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(36)};
})();
