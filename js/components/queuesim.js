/* Queue + backpressure lab: synchronous vs asynchronous processing, workers, bounded queues. One tick = one simulated second. */
(function(){
'use strict';
const {esc,node}=SDC;
SDC.block('queuesim',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'queuesim');const J=b.jobSecs||8,THREADS=b.threads||200;
  let mode='sync',run=false,timer=null,s=null,hist=[];const flags=new Set(cx.get('flags',[]));
  const P={rps:+(b.rps||20),workers:+(b.workers||40),bounded:true,cap:b.cap||2000,burst:false,stopped:false,jobSecs:J};
  p.insertAdjacentHTML('beforeend',`<div class="row" role="group" aria-label="Processing mode"><button class="btn" data-mode="sync" aria-pressed="true">Synchronous: request waits ${J} s</button><button class="btn" data-mode="async" aria-pressed="false">Asynchronous: queue + workers</button></div>
    <div class="svgbox" data-dg></div>
    <div class="form"><label>Incoming uploads per second: <b data-rv></b><input type="range" min="1" max="100" data-k="rps"></label><label data-w>Workers (each takes ${J} s per job): <b data-wv></b><input type="range" min="1" max="800" data-k="workers"></label>
      <label class="check" data-w style="flex-direction:row;align-items:center"><input type="checkbox" data-c="bounded" checked> Bounded queue (max ${P.cap.toLocaleString()}, then reply 429)</label><label class="check" style="flex-direction:row;align-items:center"><input type="checkbox" data-c="burst"> Burst: 4× traffic from t=20 s to t=35 s</label><label class="check" data-w style="flex-direction:row;align-items:center"><input type="checkbox" data-c="stopped"> Stop all workers</label></div>
    <div class="row"><button class="btn primary" data-run>Run</button><button class="btn" data-step>Step 1 s</button><button class="btn" data-reset>Reset</button><span class="mono small muted" data-t></span></div>
    <div data-m></div><div class="svgbox"><svg viewBox="0 0 640 150" data-chart role="img" aria-label="Queue depth over time"></svg></div><div class="outcome" data-out aria-live="polite"></div>`);
  const $=q=>p.querySelector(q);
  const reset=()=>{s={t:0,depth:0,rejected:0,accepted:0,processed:0,lastIn:0,lastOut:0,thr:0};hist=[];stop();draw()};
  const stop=()=>{run=false;clearInterval(timer);$('[data-run]').textContent='Run'};
  const tick=()=>{if(mode==='async'){s=SDC.M.queueTick(s,P);hist.push(s.depth);if(hist.length>120)hist.shift();
      if(s.depth>0&&s.lastIn>s.thr)flags.add('grow');if(flags.has('grow')&&s.t>10&&s.depth<P.rps&&s.lastIn<=s.thr&&!P.stopped)flags.add('stable');if(P.bounded&&s.rejected>0)flags.add('bp')}
    else{s.t++;const r=SDC.M.syncTick({rps:P.rps*(P.burst&&s.t>=20&&s.t<35?4:1),jobSecs:J,threads:THREADS});s.lastSync=r;s.rejected+=r.rejected;s.accepted+=r.served;hist.push(r.concurrency);if(hist.length>120)hist.shift();flags.add('sync')}
    cx.set('flags',[...flags]);if(['sync','grow','stable'].every(f=>flags.has(f))&&!cx.isDone())cx.done(null);draw()};
  const draw=()=>{p.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));p.querySelectorAll('[data-w]').forEach(x=>x.hidden=mode==='sync');
    $('[data-rv]').textContent=P.rps;$('[data-wv]').textContent=P.workers+' → '+Math.round(P.workers/J*10)/10+' jobs/s';$('[data-k=rps]').value=P.rps;$('[data-k=workers]').value=P.workers;$('[data-t]').textContent='t = '+s.t+' s';
    const thr=P.stopped?0:P.workers/J;
    $('[data-dg]').innerHTML=mode==='sync'?SDC.diagram({nodes:['client@0,0:Client|waits '+J+' s','api@1,0:API|'+THREADS+' threads','svc@2,0:Image processing|'+J+' s per image','db@3,0:Database'],edges:['client>api','api>svc:blocking call','svc>db'],cw:160},{states:s.lastSync&&s.lastSync.util>1?{api:'hot'}:{},hi:['client','api','svc','db'],aria:'Synchronous design'})
      :SDC.diagram({nodes:['client@0,0:Client|202 in ~50 ms','api@1,0:API|enqueue + reply',`queue@2,0:Queue|${Math.round(s.depth).toLocaleString()} waiting`,`worker@3,0:Workers ×${P.workers}|${P.stopped?'stopped':thr.toFixed(1)+' jobs/s'}`,'obj@4,0:Storage|thumbnails'],edges:['client>api','api>queue:job','queue>worker:pull','worker>obj'],cw:150,nw:128},{states:Object.assign(s.depth>P.rps*5?{queue:'hot'}:{},P.stopped?{worker:'down'}:{}),aria:'Asynchronous design with a queue'});
    const syncR=s.lastSync;
    $('[data-m]').innerHTML=mode==='sync'?SDC.metricsHTML([['User waits',J+' s','bad'],['Requests in flight',syncR?Math.round(syncR.concurrency).toLocaleString():'0',syncR&&syncR.util>1?'bad':'ok'],['Thread pool',syncR?Math.min(100,Math.round(syncR.util*100))+'%':'0%',syncR&&syncR.util>1?'bad':syncR&&syncR.util>0.7?'warn':'ok'],['Rejected (timeouts)',Math.round(s.rejected).toLocaleString(),s.rejected?'bad':'ok']])
      :SDC.metricsHTML([['User waits','~50 ms','ok'],['Arrivals / s',String(Math.round(s.lastIn||P.rps)),''],['Throughput / s',thr.toFixed(1),thr<P.rps?'bad':'ok'],['Queue depth',Math.round(s.depth).toLocaleString(),s.depth>P.rps*5?'bad':s.depth>0?'warn':'ok'],['Wait for result',thr>0?SDC.M.ms((s.depth/thr+J)*1000):'∞',''],['Rejected (429)',Math.round(s.rejected).toLocaleString(),s.rejected?'warn':'ok']]);
    const top=Math.max(10,...hist),X=i=>40+i*(590/119),Y=v=>135-v/top*115;
    $('[data-chart]').innerHTML=`<line x1="40" y1="135" x2="630" y2="135" stroke="var(--line)"/><line x1="40" y1="15" x2="40" y2="135" stroke="var(--line)"/>${mode==='async'&&P.bounded?`<line x1="40" x2="630" y1="${Y(P.cap)}" y2="${Y(P.cap)}" stroke="var(--marker)" stroke-dasharray="4 4" opacity="${P.cap<=top?1:0}"/>`:''}${mode==='sync'?`<line x1="40" x2="630" y1="${Y(THREADS)}" y2="${Y(THREADS)}" stroke="var(--marker)" stroke-dasharray="4 4" opacity="${THREADS<=top?1:0}"/>`:''}${hist.length>1?`<path d="M${hist.map((v,i)=>X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('L')}" fill="none" stroke="var(--accent)" stroke-width="2"/>`:''}<text x="44" y="12" font-size="11" fill="var(--muted)">${mode==='async'?'queue depth':'requests in flight'} · max ${Math.round(top).toLocaleString()}${mode==='async'&&P.bounded?' · dashed = queue limit':mode==='sync'?' · dashed = thread limit':''}</text>`;
    const o=$('[data-out]');
    if(mode==='sync'){o.className='outcome '+(syncR&&syncR.util>1?'bad':'warn');o.innerHTML=`Every request holds an API thread for ${J} s. Concurrency = arrivals × ${J} s = <b>${P.rps*J}</b> threads needed vs ${THREADS} available. ${P.rps*J>THREADS?'Over the limit: requests queue in the server and time out. ':''}<b>Redesign it:</b> switch to asynchronous.`}
    else if(P.stopped){o.className='outcome bad';o.innerHTML='Workers stopped: the queue absorbs uploads, so users are not blocked, but no thumbnails are produced. Alert on <b>queue age</b>, not just depth.'}
    else if(thr<P.rps){o.className='outcome bad';o.innerHTML=`Arrivals (${P.rps}/s) exceed throughput (${thr.toFixed(1)}/s): the queue grows without limit. You need at least <b>${Math.ceil(P.rps*J)}</b> workers. ${P.bounded?'The bounded queue pushes back with 429s once full: that is <b>backpressure</b>, telling clients to slow down instead of letting latency grow forever.':'Unbounded, the backlog (and wait for results) grows forever.'}`}
    else{o.className='outcome ok';o.innerHTML=`Throughput (${thr.toFixed(1)}/s) ≥ arrivals (${P.rps}/s): the queue stays near empty${P.burst?' and drains after the burst':''}. Utilisation ≈ ${Math.round(P.rps/thr*100)}%. Users get a reply in ~50 ms; results arrive ~${J} s later.`}};
  p.addEventListener('input',e=>{const k=e.target.dataset.k;if(k){P[k]=+e.target.value;draw()}});
  p.addEventListener('change',e=>{const c=e.target.dataset.c;if(c){P[c]=e.target.checked;draw()}});
  p.addEventListener('click',e=>{const m=e.target.closest('[data-mode]');if(m){mode=m.dataset.mode;reset()}
    if(e.target.closest('[data-run]')){if(run)stop();else{run=true;e.target.closest('[data-run]').textContent='Pause';timer=SDC.every(tick,250)}}
    if(e.target.closest('[data-step]'))tick();if(e.target.closest('[data-reset]'))reset()});
  reset()},{phase:'experiment',kind:'lab'});
})();
