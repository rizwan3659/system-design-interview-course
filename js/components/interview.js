/* InterviewCheckpoint: answer in your own words first, then compare with a structured approach and self-check. */
(function(){
'use strict';
const {esc,node}=SDC;
const DEFAULT_STEPS=['Clarify requirements (functional, non-functional, never-happen rule)','Estimate scale (QPS, storage, read/write ratio)','Define the API','Define the data model and the hot read','Draw the simplest working architecture','Find the bottleneck with numbers','Scale the component that is actually failing','Discuss failures and trade-offs'];
const MIN=60;

/* block: checkpoint  {prompt, steps?, model, followups:[[q,a]], min} */
SDC.block('checkpoint',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'checkpoint');const steps=b.steps||DEFAULT_STEPS;const min=b.min||MIN;
  const id='cp'+key.replace(/[^a-z0-9]/gi,'');let txt=cx.get('txt',''),open=cx.get('open',false),paper=cx.get('paper',false);const tick=cx.get('tick',{});
  p.insertAdjacentHTML('beforeend',`<div class="interviewer"><span class="who">Interviewer</span><p>${b.prompt}</p></div>`);
  const l=node('label','',`Your answer (talk it through as if out loud; ${min}+ characters)<textarea id="${id}" rows="6" placeholder="I would start by…"></textarea>`);
  const row=node('div','row',`<button class="btn primary" data-open>Reveal a structured approach</button><label class="check" style="font-size:.85rem"><input type="checkbox" data-paper ${paper?'checked':''}> I answered on paper / out loud</label><span class="muted small" data-cnt></span>`);
  const ref=node('div','col');ref.style.gap='12px';p.append(l,row,ref);
  const t=l.querySelector('textarea');t.value=txt;
  const canOpen=()=>txt.trim().length>=min||paper;
  const draw=()=>{const ob=row.querySelector('[data-open]');ob.disabled=!canOpen()&&!open;ob.hidden=open;row.querySelector('[data-cnt]').textContent=open?'':canOpen()?'Ready to compare.':`${Math.max(0,min-txt.trim().length)} more characters before you can compare`;
    if(!open){ref.innerHTML='';return}
    const n=steps.filter((_,i)=>tick[i]).length;
    ref.innerHTML=`<div class="answer"><b>A structured approach</b><ol class="cp-steps">${steps.map((s,i)=>`<li><label class="check"><input type="checkbox" data-t="${i}" ${tick[i]?'checked':''}><span>${s}</span></label></li>`).join('')}</ol><p class="small muted">Tick each step your answer covered. ${n} / ${steps.length} covered.</p></div>${b.model?`<div class="think"><b>Model answer outline.</b> ${b.model}</div>`:''}${b.followups&&b.followups.length?`<div><h4>Likely follow-ups</h4><div class="grid2">${b.followups.map(f=>`<div class="optcard"><div>${f[0]}</div><button class="btn small" data-reveal>Reveal</button><div class="answer" hidden>${f[1]}</div></div>`).join('')}</div></div>`:''}`};
  t.addEventListener('input',()=>{txt=t.value;cx.set('txt',txt);draw()});
  p.addEventListener('change',e=>{if(e.target.matches('[data-paper]')){paper=e.target.checked;cx.set('paper',paper);draw()}
    const k=e.target.closest('[data-t]');if(k){tick[k.dataset.t]=k.checked;cx.set('tick',tick);cx.done(steps.filter((_,i)=>tick[i]).length/steps.length,{keepFirst:false});draw()}});
  row.querySelector('[data-open]').addEventListener('click',()=>{if(!canOpen())return;open=true;cx.set('open',true);cx.done(null,{keepFirst:false});draw()});
  draw()},{phase:'interview',kind:'interview'});
})();
