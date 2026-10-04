/* HLD → LLD bridge (which boxes become classes?) and staged LLD coding labs. */
(function(){
'use strict';
const {esc,node}=SDC;

/* block: lldmap {hld:{nodes,edges}, focus, pool:[[name, isClass, note]], mapping:[[hld component, classes]]} */
SDC.block('lldmap',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'lldmap');let pick=new Set(cx.get('pick',[])),checked=cx.get('checked',false);
  p.insertAdjacentHTML('beforeend',`<div class="svgbox">${SDC.diagram(b.hld,{aria:'High-level design'})}</div><div class="think">${b.focus}</div><div class="acts" data-pool></div><div class="row"><button class="btn primary" data-check>Check my classes</button><button class="btn small" data-redo>Try again</button></div><div data-res aria-live="polite"></div>`);
  const $=q=>p.querySelector(q);
  const draw=()=>{$('[data-pool]').innerHTML=b.pool.map((x,i)=>{const on=pick.has(i);let mk='';if(checked){mk=x[1]===on?' ✓':' ✕'}return `<button class="btn small chipbtn ${checked?(x[1]===on?'right':'wrong'):''}" data-i="${i}" aria-pressed="${on}" ${checked?'disabled':''}>${on?'■ ':'□ '}${esc(x[0])}${mk}</button>`}).join('');
    $('[data-res]').innerHTML=checked?`<div class="answer"><ul class="clean small">${b.pool.map((x,i)=>`<li><b>${esc(x[0])}</b> — ${x[1]?'a class or interface in your code':'not a class you write'}${pick.has(i)!==!!x[1]?' <span class="tag red">'+(x[1]?'missed':'not a class')+'</span>':''}: ${x[2]}</li>`).join('')}</ul></div>${b.mapping?`<h4>How the boxes become code</h4>${SDC.tableHTML(['HLD component','LLD abstractions'],b.mapping)}`:''}`:''};
  p.addEventListener('click',e=>{const c=e.target.closest('[data-i]');if(c&&!checked){const i=+c.dataset.i;pick.has(i)?pick.delete(i):pick.add(i);cx.set('pick',[...pick]);draw()}
    if(e.target.closest('[data-check]')){checked=true;cx.set('checked',true);const ok=b.pool.filter((x,i)=>!!x[1]===pick.has(i)).length;cx.done(ok/b.pool.length);draw()}
    if(e.target.closest('[data-redo]')){checked=false;pick=new Set();cx.set('checked',false);cx.set('pick',[]);draw()}});
  draw()},{phase:'design',kind:'lab'});

/* block: lldlab {stages:[{k, prompt, hint, solution, code, lang, starter}]} — requirements → objects → … → tests */
SDC.block('lldlab',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'lldlab');let i=0;const txt=cx.get('txt',{}),sol=new Set(cx.get('sol',[]));
  const nav=node('div','stepper-nav'),body=node('div','col');nav.setAttribute('aria-label','LLD stages');body.style.gap='10px';p.append(nav,body);
  const draw=()=>{nav.innerHTML=b.stages.map((s,j)=>`<button data-s="${j}" ${j===i?'aria-current="step"':''} class="${(txt[j]||'').trim()||sol.has(j)?'done':''}">${j+1}. ${esc(s.k)}</button>`).join('');
    const s=b.stages[i];const id='ll'+key.replace(/[^a-z0-9]/gi,'')+i;
    body.innerHTML=`<div class="think"><b>${esc(s.k)}.</b> ${s.prompt}</div><label for="${id}">${s.code?'Your code (editable · Tab indents · Esc then Tab leaves the editor)':'Your answer'}</label><textarea id="${id}" class="${s.code?'code-ta':''}" rows="${s.code?14:5}" spellcheck="${!s.code}" placeholder="${esc(s.code?'':'Write before you peek')}"></textarea>
      <div class="row">${s.hint?'<button class="btn small" data-hint>Hint</button>':''}<button class="btn small" data-sol>${sol.has(i)?'Hide':'Show'} solution</button>${i<b.stages.length-1?'<button class="btn primary small" data-next>Next stage →</button>':''}</div>
      <div class="hint" data-h hidden><span class="tag amber">Hint</span> ${s.hint||''}</div><div class="answer" data-so ${sol.has(i)?'':'hidden'}>${s.code?SDC.codeHTML(s.solution,s.lang||'python'):s.solution}</div>`;
    const ta=body.querySelector('textarea');ta.value=txt[i]!=null?txt[i]:(s.starter||'');
    ta.addEventListener('input',()=>{txt[i]=ta.value;cx.set('txt',txt);nav.querySelector(`[data-s="${i}"]`).classList.toggle('done',!!ta.value.trim())});
    let out=false;if(s.code)ta.addEventListener('keydown',e=>{if(e.key==='Escape'){out=true;return}if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!out){e.preventDefault();const a=ta.selectionStart;ta.setRangeText('    ',a,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input'))}else if(e.key!=='Tab')out=false})};
  p.addEventListener('click',e=>{const s=e.target.closest('[data-s]');if(s&&nav.contains(s)){i=+s.dataset.s;draw()}
    if(e.target.closest('[data-hint]'))body.querySelector('[data-h]').hidden=false;
    if(e.target.closest('[data-sol]')){sol.has(i)?sol.delete(i):sol.add(i);cx.set('sol',[...sol]);const all=b.stages.every((_,j)=>(txt[j]||'').trim()||sol.has(j));if(all&&!cx.isDone())cx.done(null);draw()}
    if(e.target.closest('[data-next]')){i++;draw()}});
  draw()},{phase:'design',kind:'lab'});
})();
