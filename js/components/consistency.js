/* Consistency lab: write X=10 in Delhi, read from Singapore with replication delay. Eventual vs strong vs read-your-writes. */
(function(){
'use strict';
const {esc,node}=SDC;
const MODES=[['eventual','Eventual (async replication)'],['strong','Strong (write waits for both regions)'],['ryw','Read-your-writes']];
SDC.block('consistency',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'consistency');const P={mode:'eventual',delay:200,readAt:0,same:false};let written=false,pred=cx.get('pred',null);const tried=new Set(cx.get('tried',[]));
  p.insertAdjacentHTML('beforeend',`<div class="row" role="group" aria-label="Consistency model">${MODES.map(m=>`<button class="btn" data-mode="${m[0]}" aria-pressed="${m[0]==='eventual'}">${m[1]}</button>`).join('')}</div>
    <div class="form"><label>Replication delay Delhi → Singapore: <b data-dv></b><input type="range" min="0" max="1000" step="50" data-k="delay"></label><label>Read from Singapore at: <b data-rv></b> after the write<input type="range" min="0" max="1000" step="50" data-k="readAt"></label><label class="check" data-same style="flex-direction:row;align-items:center"><input type="checkbox" data-c="same"> The reader is the same user who wrote</label></div>
    <div class="row"><button class="btn primary" data-write>Write X = 10 in Delhi, then read in Singapore</button><button class="btn" data-reset>Reset (X = 5 everywhere)</button></div>
    <div data-pred></div><div class="svgbox"><svg viewBox="0 0 640 170" data-tl role="img" aria-label="Timeline of the write and the read"></svg></div><div class="outcome" data-out aria-live="polite"></div>`);
  const $=q=>p.querySelector(q);
  const draw=()=>{p.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===P.mode)));$('[data-same]').hidden=P.mode!=='ryw';
    $('[data-dv]').textContent=P.delay+' ms';$('[data-rv]').textContent=P.readAt===0?'immediately':P.readAt+' ms';$('[data-k=delay]').value=P.delay;$('[data-k=readAt]').value=P.readAt;
    const r=SDC.M.geoRead({mode:P.mode,delay:P.delay,readAt:P.readAt,sameUser:P.same});
    const pr=$('[data-pred]');
    pr.innerHTML=pred==null?`<div class="predict-q"><span class="evo-k">Predict first</span><p>X = 5 everywhere. A user writes <b>X = 10</b> in Delhi. With ${P.delay} ms replication delay, someone reads X in Singapore immediately. What value can be returned?</p><div class="acts">${[['5',0],['10',1],['Either, depending on timing',2]].map(o=>`<button class="btn small" data-p="${o[1]}">${o[0]}</button>`).join('')}</div></div>`:
      `<p class="fb"><span class="tag ${pred===2?'green':'amber'}">${pred===2?'Exactly':'Think again'}</span> Under eventual consistency the answer depends on timing: before replication arrives Singapore returns 5, afterwards 10. Only the model you choose makes it predictable.</p>`;
    const X=t=>70+t/1200*550,ws=0,arrive=P.mode==='strong'?P.delay:P.delay,ack=P.mode==='strong'?2*P.delay:0;
    const readT=P.mode==='strong'?Math.max(P.readAt,ack):P.readAt;
    $('[data-tl]').innerHTML=written?`<text x="10" y="50" font-size="12" fill="var(--ink)" font-weight="600">Delhi</text><text x="10" y="125" font-size="12" fill="var(--ink)" font-weight="600">Singapore</text>
      <line x1="70" x2="630" y1="45" y2="45" stroke="var(--line)" stroke-width="2"/><line x1="70" x2="630" y1="120" y2="120" stroke="var(--line)" stroke-width="2"/>
      <circle cx="${X(ws)}" cy="45" r="7" fill="var(--accent)"/><text x="${X(ws)}" y="28" font-size="11" text-anchor="middle" fill="var(--accent)">write X=10</text>
      <line x1="${X(ws)}" y1="45" x2="${X(arrive)}" y2="120" stroke="var(--accent)" stroke-dasharray="5 4" stroke-width="1.6"/><circle cx="${X(arrive)}" cy="120" r="5" fill="var(--accent)"/><text x="${X(arrive)}" y="150" font-size="11" text-anchor="middle" fill="var(--accent)">X=10 arrives (${P.delay} ms)</text>
      ${P.mode==='strong'?`<line x1="${X(arrive)}" y1="120" x2="${X(ack)}" y2="45" stroke="var(--good)" stroke-dasharray="3 3"/><text x="${X(ack)}" y="28" font-size="11" text-anchor="middle" fill="var(--good)">ack to user (${ack} ms)</text>`:''}
      <rect x="${X(readT)-4}" y="104" width="8" height="32" fill="${r.value===10?'var(--good)':'var(--marker)'}"/><text x="${X(readT)+8}" y="${readT<arrive?110:100}" font-size="12" font-weight="600" fill="${r.value===10?'var(--good)':'var(--marker)'}">read → ${r.value}</text>
      <text x="630" y="165" font-size="10" text-anchor="end" fill="var(--muted)" font-family="var(--f-mono)">time →</text>`:`<text x="320" y="90" text-anchor="middle" font-size="13" fill="var(--muted)">Press "Write X = 10" to run the timeline.</text>`;
    const o=$('[data-out]');if(!written){o.className='outcome';o.innerHTML='Choose a model, set the delay, then write.';return}
    o.className='outcome '+(r.value===10?'ok':'bad');
    o.innerHTML=`<p><b>Singapore returned ${r.value}.</b> ${r.why}</p><p class="small">Write latency seen by the user: <b>${r.writeLatency} ms</b> · read latency: <b>${r.readLatency} ms</b>. ${P.mode==='eventual'?'Fast everywhere, but readers may see old data during the replication window (<b>replication lag</b>).':P.mode==='strong'?'Always correct, but every write pays a cross-region round trip, and writes fail if Singapore is unreachable (CAP: consistency over availability).':'The writer always sees their own change; other users may still see the old value briefly. A common, cheap middle ground.'}</p>`};
  p.addEventListener('input',e=>{const k=e.target.dataset.k;if(k){P[k]=+e.target.value;draw()}});
  p.addEventListener('change',e=>{if(e.target.dataset.c){P.same=e.target.checked;draw()}});
  p.addEventListener('click',e=>{const m=e.target.closest('[data-mode]'),pp=e.target.closest('[data-p]');if(m){P.mode=m.dataset.mode;draw()}
    if(pp){pred=+pp.dataset.p;cx.set('pred',pred);SDC.act.record(key+'.p',{t:'predict',s:ses.id,c:cx.c,score:pred===2?1:0});draw()}
    if(e.target.closest('[data-write]')){if(pred==null){$('[data-pred] button')?.focus();return}written=true;tried.add(P.mode);cx.set('tried',[...tried]);if(tried.size===3&&!cx.isDone())cx.done(pred===2?1:0.6);draw()}
    if(e.target.closest('[data-reset]')){written=false;draw()}});
  draw()},{phase:'experiment',kind:'lab'});
})();
