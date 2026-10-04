/* Rate-limiter lab: token bucket, leaky bucket, fixed window and sliding window on the same traffic. */
(function(){
'use strict';
const {esc,node}=SDC;
const ALGS=[['token','Token bucket','Tokens refill at a steady rate up to the bucket size; each request spends one. Allows bursts up to the bucket size.'],
  ['leaky','Leaky bucket','Requests join a fixed-size queue drained at a steady rate. Smooth output; bursts wait (added delay) or overflow.'],
  ['fixed','Fixed window','Count requests per clock window (e.g. per second). Simple, but up to 2× the limit can pass across a window boundary.'],
  ['sliding','Sliding window log','Count requests in the last W seconds from a log of timestamps. Accurate, more memory per client.']];
SDC.block('ratelimit',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'ratelimit');const P={rate:b.rate||10,limit:b.limit||5,cap:b.cap||20,pattern:'steady'};const seen=new Set(cx.get('seen',[]));let play=null,cursor=10;
  p.insertAdjacentHTML('beforeend',`<div class="form"><label>Incoming request rate: <b data-v="rate"></b>/s<input type="range" min="1" max="30" data-k="rate"></label><label>Limit (refill / leak rate): <b data-v="limit"></b>/s<input type="range" min="1" max="20" data-k="limit"></label><label>Bucket capacity: <b data-v="cap"></b><input type="range" min="1" max="40" data-k="cap"></label>
    <label>Traffic pattern<select data-pat><option value="steady">Steady</option><option value="burst">One big burst, then trickle</option><option value="boundary">Bursts at window boundaries</option></select></label></div>
    <div class="row"><button class="btn primary" data-play>Play token bucket</button><span class="small muted">Accepted ■ · Rejected ✕ · Delayed (leaky) ◧ · each row is 0–10 s</span></div>
    <div class="rl-gauge" data-gauge aria-live="polite"></div><div class="rl-rows" data-rows></div><div class="outcome" data-out></div>`);
  const $=q=>p.querySelector(q);
  const draw=()=>{['rate','limit','cap'].forEach(k=>{$(`[data-v=${k}]`).textContent=P[k];$(`[data-k=${k}]`).value=P[k]});
    const arr=SDC.M.arrivals(P.pattern,P.rate,10);const res={};const params={rate:P.limit,cap:P.cap,win:1};
    ALGS.forEach(a=>res[a[0]]=SDC.M.limit(a[0],arr,a[0]==='fixed'||a[0]==='sliding'?{rate:P.limit,win:1}:params));
    const X=t=>t/10*100;
    $('[data-rows]').innerHTML=ALGS.map(a=>{const r=res[a[0]],ok=r.filter(x=>x.ok).length,mx=SDC.M.maxInWindow(r,1);
      return `<div class="rl-row"><div class="rl-h"><b>${a[1]}</b><span class="small muted">${ok} accepted · ${r.length-ok} rejected · max ${mx} in any 1 s${mx>P.limit*1.5&&a[0]!=='token'?' <span class="tag red">'+(mx/P.limit).toFixed(1)+'× the limit</span>':''}</span></div><div class="rl-track" role="img" aria-label="${a[1]}: ${ok} accepted, ${r.length-ok} rejected">${[1,2,3,4,5,6,7,8,9].map(s=>`<i class="rl-tick" style="left:${X(s)}%"></i>`).join('')}${r.filter(x=>x.t<=cursor).map((x,i)=>`<span class="rl-dot ${x.ok?(x.delay>0.05?'delay':'ok'):'no'}" style="left:${X(x.t)}%;top:${(i%4)*7+3}px" title="t=${x.t.toFixed(2)}s ${x.ok?'accepted':'rejected'}"></span>`).join('')}</div><p class="small muted">${a[2]}</p></div>`}).join('');
    const tb=res.token.filter(x=>x.t<=cursor);const last=tb[tb.length-1];const tok=last?Math.max(0,Math.min(P.cap,last.tok+(cursor-last.t)*P.limit)):P.cap;
    $('[data-gauge]').innerHTML=`<span class="small">Token bucket at t = ${cursor.toFixed(1)} s:</span> <span class="tokens">${Array.from({length:P.cap},(_,i)=>`<i class="${i<Math.floor(tok)?'on':''}"></i>`).join('')}</span> <b class="mono">${Math.floor(tok)} / ${P.cap}</b>`;
    const o=$('[data-out]');const fx=SDC.M.maxInWindow(res.fixed,1);
    o.className='outcome';o.innerHTML=P.pattern==='boundary'?`<b>Window-boundary problem:</b> fixed window let ${fx} requests through in one second (limit ${P.limit}) because a burst at the end of one window and another at the start of the next are counted separately. The sliding window prevents it.`:
      P.pattern==='burst'?`<b>Bursts:</b> the token bucket accepts up to ${P.cap} at once (saved tokens), then ${P.limit}/s. The leaky bucket queues the burst and releases it smoothly, adding delay. Choose based on whether clients may legitimately burst.`:
      P.rate<=P.limit?'Traffic is under the limit: every algorithm accepts everything. Raise the rate above the limit.':`Traffic (${P.rate}/s) exceeds the limit (${P.limit}/s): all algorithms reject about ${Math.round((1-P.limit/P.rate)*100)}% once any burst allowance is used up.`;
    seen.add(P.pattern);cx.set('seen',[...seen]);if(seen.has('boundary')&&seen.has('burst')&&seen.has('played')&&!cx.isDone())cx.done(null)};
  p.addEventListener('input',e=>{const k=e.target.dataset.k;if(k){P[k]=+e.target.value;cursor=10;draw()}});
  p.addEventListener('change',e=>{if(e.target.matches('[data-pat]')){P.pattern=e.target.value;cursor=10;draw()}});
  $('[data-play]').addEventListener('click',()=>{clearInterval(play);cursor=0;seen.add('played');play=SDC.every(()=>{cursor=Math.min(10,cursor+0.25);draw();if(cursor>=10)clearInterval(play)},SDC.reducedMotion()?400:120)});
  draw()},{phase:'experiment',kind:'lab'});
})();
