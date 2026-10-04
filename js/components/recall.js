/* RecallCard (active recall feeding spaced repetition) and SessionSummary (self-assessment). */
(function(){
'use strict';
const {esc,node}=SDC;

SDC.recallCardHTML=(k,q,a,state)=>{const c=SDC.srs.get(k);return `<div class="rcard" data-k="${esc(k)}"><div class="rq">${q}</div><button class="btn small" data-show>Reveal answer</button><div class="ra" hidden><div class="answer">${a}</div><div class="row"><span class="small muted">Did you get it before revealing?</span><button class="btn small" data-g="1" aria-pressed="${!!(c&&c.last===1)}">✓ Got it</button><button class="btn small" data-g="0" aria-pressed="${!!(c&&c.last===0)}">↻ Need revision</button></div></div>${c?`<span class="rstat small muted">${c.last?'Next review':'Review again'} ${dueText(c.due)}</span>`:''}</div>`};
const dueText=d=>{const days=Math.round((d-Date.now())/864e5);return days<=0?'today':days===1?'tomorrow':'in '+days+' days'};
SDC.dueText=dueText;

/* wires reveal + grading for every .rcard inside root; info(k) returns {q,a,c,s} for storage */
SDC.wireRecall=(root,info,after)=>root.addEventListener('click',e=>{const card=e.target.closest('.rcard');if(!card)return;
  if(e.target.closest('[data-show]')){card.querySelector('.ra').hidden=false;e.target.closest('[data-show]').hidden=true;card.querySelector('[data-g]').focus()}
  const g=e.target.closest('[data-g]');if(g){const k=card.dataset.k;SDC.srs.grade(k,g.dataset.g==='1',info(k));card.querySelectorAll('[data-g]').forEach(x=>x.setAttribute('aria-pressed',String(x===g)));
    let st=card.querySelector('.rstat');if(!st){st=node('span','rstat small muted');card.append(st)}const c=SDC.srs.get(k);st.textContent=(c.last?'Next review ':'Review again ')+dueText(c.due);if(after)after()}});

/* block: recall  {items:[[q, a, concept?]]} — ~5 short questions at the end of a session */
SDC.block('recall',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'recall');const k=it=>'r:'+ses.id+':'+SDC.hash(it[0]);
  const g=node('div','grid2');g.innerHTML=b.items.map(it=>SDC.recallCardHTML(k(it),it[0],it[1])).join('');
  const st=node('p','small muted');p.append(st,g);
  const upd=()=>{const n=b.items.filter(it=>SDC.srs.get(k(it))).length,good=b.items.filter(it=>{const c=SDC.srs.get(k(it));return c&&c.last===1}).length;st.textContent=`${n} / ${b.items.length} answered · ${good} recalled without help. Cards you mark "Need revision" come back on the Revision page tomorrow.`;
    if(n===b.items.length)cx.done(good/n,{keepFirst:false})};
  SDC.wireRecall(g,kk=>{const it=b.items.find(x=>k(x)===kk);return {q:it[0],a:it[1],c:it[2]||cx.c,s:ses.id}},upd);upd()},{phase:'check',kind:'recall'});

/* block: summary  {learned:[..], explain:'Can you explain … without notes?'} */
SDC.block('summary',(b,p,key,ses)=>{const cx=SDC.ctx(b,key,ses,'summary');const k='sum:'+ses.id+':'+SDC.hash(b.explain||ses.title);
  p.insertAdjacentHTML('beforeend',`<div class="learned"><span class="evo-k">Today you learned</span><ul class="ticks">${b.learned.map(x=>`<li>${x}</li>`).join('')}</ul></div>`);
  const box=node('div','selfcheck');p.append(box);
  const draw=()=>{const c=SDC.srs.get(k);box.innerHTML=`<p><b>Can you explain this without notes?</b> ${b.explain||''}</p><div class="row"><button class="btn" data-y aria-pressed="${!!(c&&c.last===1)}">✓ Yes</button><button class="btn" data-n aria-pressed="${!!(c&&c.last===0)}">↻ Need revision</button>${c?`<span class="small muted">${c.last?'Saved. A quick check comes back '+dueText(c.due)+'.':'Added to your revision list for '+dueText(c.due)+'.'}</span>`:''}</div>`};
  box.addEventListener('click',e=>{const y=e.target.closest('[data-y]'),n=e.target.closest('[data-n]');if(!y&&!n)return;
    SDC.srs.grade(k,!!y,{q:b.explain||('Explain: '+ses.title),a:'<ul class="clean">'+b.learned.map(x=>`<li>${x}</li>`).join('')+'</ul>',c:cx.c,s:ses.id,kind:'summary'});cx.done(y?1:0.3,{keepFirst:false});draw()});
  draw()},{phase:'check',kind:'recall'});
})();
