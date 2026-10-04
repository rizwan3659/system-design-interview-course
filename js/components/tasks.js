/* TaskChecklist: explicit tasks per session. A task with `auto:'blockId'` ticks itself when that block is completed. */
(function(){
'use strict';
const {esc,node,store}=SDC;

SDC.taskState=ses=>{const m=store.get('tasks:'+ses.id,{});const list=(ses.tasks||[]).map((t,i)=>{const auto=t.auto&&SDC.act.hasId(ses.id,t.auto);return {t:t.t||t,auto:t.auto,done:!!m[i]||!!auto,byAuto:!!auto}});
  return {list,done:list.filter(x=>x.done).length,total:list.length}};

SDC.renderTasks=(ses,container,compact)=>{if(!ses.tasks||!ses.tasks.length)return null;
  const pnl=node('div','panel tasks-panel');container.appendChild(pnl);
  const draw=()=>{const s=SDC.taskState(ses);pnl.innerHTML=`<div class="row spread"><h3>Session tasks</h3><span class="score">${s.done} / ${s.total} tasks completed</span></div><div class="meter" role="progressbar" aria-label="Session tasks" aria-valuemin="0" aria-valuemax="${s.total}" aria-valuenow="${s.done}"><i style="width:${s.total?s.done/s.total*100:0}%"></i></div>
    <div class="col" style="gap:6px">${s.list.map((x,i)=>`<label class="check task ${x.done?'is-done':''}"><input type="checkbox" data-i="${i}" ${x.done?'checked':''} ${x.byAuto?'disabled':''}><span>${x.t}${x.auto?` <span class="muted small">${x.byAuto?'· completed in the lab ✓':'· ticks itself when you finish the activity'}</span>`:''}</span></label>`).join('')}</div>`;
    SDC.emit('tasks',ses.id)};
  pnl.addEventListener('change',e=>{const i=e.target.dataset.i;if(i==null)return;const m=store.get('tasks:'+ses.id,{});m[i]=e.target.checked;store.set('tasks:'+ses.id,m);draw()});
  SDC.onView('activity',r=>{if(r.s===ses.id)draw()});
  draw();return pnl};
})();
