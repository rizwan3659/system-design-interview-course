/* PredictionQuestion, bottleneck and debugging scenarios, MetricsPanel and HintSystem. */
(function(){
'use strict';
const {esc,node}=SDC;

/* HintSystem: Hint 1 → Hint 2 → Show solution, one click at a time */
SDC.hints=(hints,solution,onSolution)=>{const w=node('div','hints');let shown=0;const list=node('div','col hint-list');list.style.gap='8px';
  const btn=node('button','btn small');btn.type='button';w.append(list,btn);
  const draw=()=>{btn.hidden=shown>hints.length;btn.textContent=shown<hints.length?`Hint ${shown+1} of ${hints.length}`:(solution?'Show solution':'');if(shown>=hints.length&&!solution)btn.hidden=true};
  btn.addEventListener('click',()=>{if(shown<hints.length){list.append(node('div','hint',`<span class="tag amber">Hint ${shown+1}</span> ${hints[shown]}`))}else{list.append(node('div','answer',`<b>Solution.</b> ${solution}`));if(onSolution)onSolution()}shown++;draw()});
  draw();return w};

/* MetricsPanel: [label, value, state] where state is ok | warn | bad (shown as text too) */
const MARK={ok:'✓ normal',warn:'▲ elevated',bad:'▲▲ critical'};
SDC.metricsHTML=ms=>`<div class="metrics">${ms.map(m=>`<div class="metric ${m[2]||''}"><span class="mk">${esc(m[0])}</span><b>${esc(m[1])}</b>${m[2]?`<span class="ms">${MARK[m[2]]}</span>`:''}</div>`).join('')}</div>`;

/* block: predict  {kind:'predict'|'bottleneck'|'debug', scenario, metrics, q, opts:[[label, ok, why]], hints, takeaway} */
SDC.block('predict',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'predict');let a=cx.get('a',null);
  const head=b.kind==='debug'?'<div class="alert-head"><span aria-hidden="true">🚨</span> Production alert</div>':b.kind==='bottleneck'?'<div class="alert-head neutral">Where is the bottleneck?</div>':'<div class="alert-head neutral">What happens next?</div>';
  const top=node('div',b.kind==='debug'?'scenario alert':'scenario',head+(b.scenario?`<div>${b.scenario}</div>`:'')+(b.metrics?SDC.metricsHTML(b.metrics):'')+`<p class="pq"><b>${b.q}</b></p>`);
  const opts=node('div','acts'),fb=node('div','col');fb.style.gap='10px';fb.setAttribute('aria-live','polite');
  p.append(top);if(b.hints&&b.hints.length)p.append(SDC.hints(b.hints,null));p.append(opts,fb);
  const draw=()=>{opts.innerHTML=b.opts.map((o,j)=>`<button class="btn" data-j="${j}" aria-pressed="${a===j}">${esc(o[0])}</button>`).join('');
    if(a==null){fb.innerHTML='<p class="muted small">Commit to an answer first. Every option is explained afterwards.</p>';return}
    const o=b.opts[a];fb.innerHTML=`<p><span class="tag ${o[1]?'green':'red'}">${o[1]?'Good first move':'Not the best first move'}</span> ${o[2]||''}</p>
      <details class="whynot" ${o[1]?'':'open'}><summary>Why or why not: every option</summary><ul class="clean">${b.opts.map(x=>`<li><b>${esc(x[0])}</b> <span class="muted">${x[1]?'(good)':'(not yet)'}</span> — ${x[2]||''}</li>`).join('')}</ul></details>
      ${b.takeaway?`<div class="think"><b>Takeaway.</b> ${b.takeaway}</div>`:''}<div><button class="btn small" data-retry>Try again</button></div>`};
  p.addEventListener('click',e=>{const x=e.target.closest('[data-j]');if(x&&opts.contains(x)){a=+x.dataset.j;cx.set('a',a);cx.done(b.opts[a][1]?1:0);draw()}
    if(e.target.closest('[data-retry]')){a=null;cx.set('a',null);draw()}});
  draw()},{phase:'predict',kind:'quiz'});

/* block: hints  {q, hints:[..], solution, write:true} — think, write, then ask for help */
SDC.block('hints',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'hints');p.insertAdjacentHTML('beforeend',`<div class="think">${b.q}</div>`);
  if(b.write){const id='h'+key.replace(/[^a-z0-9]/gi,'');const l=node('label','',`Your answer<textarea id="${id}" placeholder="Write your reasoning before using hints"></textarea>`);p.append(l);const t=l.querySelector('textarea');t.value=cx.get('txt','');t.addEventListener('input',()=>cx.set('txt',t.value))}
  p.append(SDC.hints(b.hints||[],b.solution,()=>cx.done(null)))},{phase:'design'});
})();
