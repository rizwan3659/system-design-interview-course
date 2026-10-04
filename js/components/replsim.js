/* Replication lab: primary + 2 replicas. Write, read, inject lag, kill nodes, fail over, and see stale reads and lost writes. */
(function(){
'use strict';
const {esc,node}=SDC;
SDC.block('replsim',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'replsim');
  const fresh=()=>({nodes:{p:{up:true,v:1,role:'primary'},r1:{up:true,v:1,role:'replica'},r2:{up:true,v:1,role:'replica'}},hist:{1:5},next:2,lag:{r1:0,r2:0},pending:[],t:0,log:[],sync:false,hi:[],lost:[]});
  let s=fresh();const qa=cx.get('qa',{});const saw=new Set(cx.get('saw',[]));
  const Q=[['reads','Can reads continue?',['Yes, from replicas','No'],st=>st.anyReplicaUp?0:1,'Replicas still hold the data and can serve reads (possibly slightly stale).','With no replica up, nothing can serve reads.'],
    ['writes','Can writes continue right now?',['Yes','No, not until a replica is promoted'],st=>st.primaryUp?0:1,'Only the primary accepts writes. Until failover promotes a replica (seconds to a minute), writes fail.','A primary is up, so writes continue.'],
    ['stale','Could a user read stale data?',['Yes','No'],st=>st.lagging?0:1,'Async replicas lag behind the primary. A read from a lagging replica returns old data.','Right now every replica has caught up, so no. Introduce lag and ask again.'],
    ['promote','Which replica should become the new primary?',['Replica 1','Replica 2','Either'],st=>st.best,'Promote the most up-to-date replica to lose the fewest writes. Writes it never received are lost under async replication.','']];
  p.insertAdjacentHTML('beforeend',`<div class="grid2" style="align-items:start"><div class="col" style="gap:10px;min-width:0"><div class="svgbox" data-dg></div><div data-m></div></div>
    <div class="col" style="gap:10px"><div class="row"><button class="btn primary" data-a="write">Write x = next value</button><button class="btn" data-a="readr">Read from a replica</button><button class="btn" data-a="tick">Advance 1 s</button></div>
    <div class="row"><button class="btn danger" data-a="killp">Kill primary</button><button class="btn danger" data-a="killr">Kill replica 2</button><button class="btn danger" data-a="lag">Introduce replication lag (replica 1: 3 s)</button></div>
    <div class="row"><button class="btn" data-a="failover">Fail over: promote best replica</button><label class="check" style="font-size:.88rem"><input type="checkbox" data-sync> Synchronous replication</label><button class="btn small" data-a="reset">Reset</button></div>
    <div class="log" data-log aria-live="polite"></div></div></div><div data-q></div>`);
  const $=q=>p.querySelector(q);const nm={p:'Node P',r1:'Replica 1',r2:'Replica 2'};
  const L=(c,t)=>{s.log.unshift([c,`t=${s.t}s · ${t}`]);s.log=s.log.slice(0,8)};
  const prim=()=>Object.keys(s.nodes).find(k=>s.nodes[k].role==='primary'&&s.nodes[k].up);
  const reps=()=>Object.keys(s.nodes).filter(k=>s.nodes[k].role==='replica');
  const apply=()=>{s.pending=s.pending.filter(w=>{if(w.at<=s.t&&s.nodes[w.to].up){s.nodes[w.to].v=Math.max(s.nodes[w.to].v,w.v);return false}return s.nodes[w.to].up||true})};
  const status=()=>{const pk=prim(),rs=reps().filter(k=>s.nodes[k].up);const top=pk?s.nodes[pk].v:Math.max(...Object.values(s.nodes).map(n=>n.v));
    const lagging=rs.some(k=>s.nodes[k].v<(pk?s.nodes[pk].v:top));const r1=s.nodes.r1,r2=s.nodes.r2;
    const best=!r1.up&&r2.up?1:!r2.up&&r1.up?0:r1.v===r2.v?2:r1.v>r2.v?0:1;return {primaryUp:!!pk,anyReplicaUp:rs.length>0,lagging,best}};
  const act=a=>{const pk=prim();
    if(a==='write'){if(!pk){L('r-bad','Write FAILED: no primary. Writes are unavailable until failover.');s.hi=['app'];return}
      const v=s.next++;s.hist[v]=v*5;s.nodes[pk].v=v;s.hi=['app',pk];
      if(s.sync){const blocked=reps().some(k=>!s.nodes[k].up);if(blocked){s.nodes[pk].v=v-1;s.next--;delete s.hist[v];L('r-bad','Synchronous write BLOCKED: a replica is down and cannot acknowledge. Strong durability costs availability.');return}
        reps().forEach(k=>{s.nodes[k].v=v});L('r-good',`x = ${v*5} written to ${nm[pk]} and every replica before acknowledging (slower, nothing lost).`)}
      else{reps().forEach(k=>s.pending.push({to:k,v,at:s.t+(s.lag[k]||0)}));apply();L('a',`x = ${v*5} acknowledged by ${nm[pk]}. Replicas get it ${reps().some(k=>s.lag[k])?'after their lag':'almost at once'}.`)}}
    if(a==='readr'){const k=reps().find(k=>s.nodes[k].up&&s.lag[k])||reps().find(k=>s.nodes[k].up);if(!k){L('r-bad','No replica available.');return}const n=s.nodes[k];const latest=Math.max(...Object.values(s.nodes).map(n=>n.v));s.hi=['app',k];
      const stale=n.v<(pk?s.nodes[pk].v:latest);if(stale)saw.add('stale');L(stale?'r-bad':'r-good',`Read from ${nm[k]}: x = ${s.hist[n.v]}${stale?` (STALE: latest is ${s.hist[pk?s.nodes[pk].v:latest]})`:''}`)}
    if(a==='tick'){s.t++;apply();s.hi=[];L('','clock +1 s')}
    if(a==='lag'){s.lag.r1=3;L('b','Replica 1 now applies changes 3 s late (slow disk, big transaction, network).');saw.add('lag')}
    if(a==='killp'){if(!pk)return;s.nodes[pk].up=false;s.hi=[pk];saw.add('killp');L('r-bad',`${nm[pk]} (primary) crashed. Answer the questions below.`)}
    if(a==='killr'){s.nodes.r2.up=false;L('r-bad','Replica 2 crashed. Reads shift to replica 1.')}
    if(a==='failover'){if(pk){L('','A primary is healthy: no failover needed.');return}const c=reps().filter(k=>s.nodes[k].up).sort((x,y)=>s.nodes[y].v-s.nodes[x].v)[0];if(!c){L('r-bad','No live replica to promote.');return}
      const old=Object.keys(s.nodes).find(k=>s.nodes[k].role==='primary');const top=s.nodes[old].v;const lost=[];for(let v=s.nodes[c].v+1;v<=top;v++)lost.push(s.hist[v]);
      s.nodes[old].role='replica';s.nodes[c].role='primary';s.pending=s.pending.filter(w=>w.to!==c);saw.add('failover');s.hi=[c];
      L(lost.length?'r-bad':'r-good',`${nm[c]} promoted to primary.${lost.length?` Writes x = ${lost.join(', ')} never reached it: LOST (async replication).`:' No writes lost.'} Clients must now send writes to it.`)}
    if(a==='reset'){const sync=s.sync;s=fresh();s.sync=sync}};
  const draw=()=>{const st={},met={};Object.keys(s.nodes).forEach(k=>{const n=s.nodes[k];st[k]=!n.up?'down':n.role==='primary'&&k!=='p'?'new':'';met[k]=`x = ${s.hist[n.v]}${n.role==='replica'&&s.lag[k]?' · lag 3 s':''}`;});
    const pk=Object.keys(s.nodes).find(k=>s.nodes[k].role==='primary');const lbl=k=>`${nm[k]}|${s.nodes[k].role}`;
    const nodes=['app@0,1:App servers|writes + reads',`p@1,1:${lbl('p')}`,`r1@2,0:${lbl('r1')}`,`r2@2,2:${lbl('r2')}`];
    const edges=[`app>${pk}:writes`].concat(Object.keys(s.nodes).filter(k=>k!==pk).map(k=>`${pk}~>${k}:${s.sync?'sync':'async'}`));
    $('[data-dg]').innerHTML=SDC.diagram({nodes,edges,cw:170,ch:84},{states:st,metrics:met,hi:s.hi,aria:'Primary and two replicas'});
    const S=status();$('[data-m]').innerHTML=SDC.metricsHTML([['Writes',S.primaryUp?'available':'UNAVAILABLE',S.primaryUp?'ok':'bad'],['Reads',S.anyReplicaUp||S.primaryUp?'available':'UNAVAILABLE',S.anyReplicaUp||S.primaryUp?'ok':'bad'],['Replicas lagging',S.lagging?'yes':'no',S.lagging?'warn':'ok'],['Mode',s.sync?'synchronous':'asynchronous','']]);
    $('[data-log]').innerHTML=s.log.length?s.log.map(l=>`<div class="${l[0]}">${esc(l[1])}</div>`).join(''):'<span class="muted">Write a few values, introduce lag, read from a replica, then kill the primary.</span>';
    const show=!S.primaryUp||saw.has('stale');
    $('[data-q]').innerHTML=show?`<div class="panel nested"><h4>${S.primaryUp?'Think about it':'The primary is down. Answer before you fail over.'}</h4><div class="grid2">${Q.map(q=>{const a=qa[q[0]];const c=q[3](S);return `<div class="qcard ${a==null?'':a===c?'right':'wrong'}"><div>${q[1]}</div><div class="acts">${q[2].map((o,j)=>`<button class="btn small" data-q="${q[0]}" data-j="${j}" aria-pressed="${a===j}">${o}</button>`).join('')}</div>${a!=null?`<p class="fb"><span class="tag ${a===c?'green':'red'}">${a===c?'Correct':'Not in the current state'}</span> ${c===0||q[0]==='promote'?q[4]:q[5]||q[4]}</p>`:''}</div>`}).join('')}</div></div>`:''};
  p.addEventListener('click',e=>{const a=e.target.closest('[data-a]'),q=e.target.closest('[data-q]');if(a){act(a.dataset.a);cx.set('saw',[...saw]);if(['lag','stale','killp','failover'].every(x=>saw.has(x))&&!cx.isDone()){const S=status();const ok=Q.filter(x=>qa[x[0]]!=null).length;cx.done(ok?Q.filter(x=>qa[x[0]]===x[3](S)).length/Q.length:0.5)}draw()}
    if(q){qa[q.dataset.q]=+q.dataset.j;cx.set('qa',qa);draw()}});
  p.addEventListener('change',e=>{if(e.target.matches('[data-sync]')){s.sync=e.target.checked;L('',s.sync?'Synchronous: a write waits for every replica. No data loss, but slower and blocked if a replica is down.':'Asynchronous: the primary acknowledges at once. Fast, but replicas lag and failover can lose writes.');draw()}});
  draw()},{phase:'experiment',kind:'lab'});
})();
