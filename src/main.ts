// Punto d'ingresso: collega gli eventi della pagina e avvia la partita.
import { S, ui } from './core/state.js';
import { renderIns } from './ui/banco.js';
import { renderReport } from './ui/report.js';
import { renderTabs, saveTab } from './ui/tabs.js';
import { nextDay } from './sim/day.js';
import { render, setPrice } from './ui/render.js';
import { newGame } from './sim/game.js';
import { clean, repair, sell } from './sim/fleet.js';
import { borrow, payoff } from './sim/bank.js';
import { fire, hire } from './sim/staff.js';
import { assign, decline } from './sim/desk.js';
import { propose } from './sim/services.js';
import { buyNew, buyStock, buyUsed } from './sim/market.js';
import { insCheck, insCheckInt, insClose, insGamble } from './sim/inspection.js';
import { overColleague, overSendAway, overSwap, probSendAway, probSolve } from './sim/pickups.js';
import { setPreview } from './ui/planning.js';
import { start } from './app/save.js';
document.addEventListener('click',e=>{
  const z=(e.target as any).closest&&(e.target as any).closest('[data-z]');
  if(z){const id=+z.dataset.ins;ui.zone[id]=z.dataset.z;renderIns();return}
  if((e.target as any).id==='modal'){ui.report=null;renderReport();return}
  const b=(e.target as any).closest('button');if(!b)return;
  if(b.dataset.tab&&b.classList.contains('tab')){ui.tab=b.dataset.tab;saveTab(ui.tab);renderTabs();window.scrollTo({top:0});return}
  const a=b.dataset.a,id=+b.dataset.id;
  if(b.id==='next'){ui.armed=null;nextDay();render();window.scrollTo({top:0,behavior:'smooth'});return}
  if(b.id==='reset'){if(ui.armed==='reset'){newGame()}else ui.armed='reset';render();return}
  if(a==='sell'){if(ui.armed==='sell-'+id){ui.armed=null;sell(id)}else ui.armed='sell-'+id;render();return}
  if(a==='payoff'){if(ui.armed==='pay-'+id){ui.armed=null;payoff(id)}else ui.armed='pay-'+id;render();return}
  if(a==='fire'){if(ui.armed==='fire-'+id){ui.armed=null;fire(id)}else ui.armed='fire-'+id;render();return}
  ui.armed=null;
  if(a==='assign')assign(id);
  else if(a==='propose')propose(id);
  else if(a==='decline')decline(id);
  else if(a==='clean')clean(id);
  else if(a==='repair')repair(id);
  else if(a==='buyused')buyUsed(id);
  else if(a==='buynew')buyNew(b.dataset.k);
  else if(a==='dealer'){ui.dealer=b.dataset.k;ui.mktMsg=null}
  else if(a==='mmsg')ui.mktMsg=null;
  else if(a==='buystock')buyStock(b.dataset.k);
  else if(a==='icheck'){if(ui.zone[id])insCheck(id,ui.zone[id],false)}
  else if(a==='iwash'){if(ui.zone[id])insCheck(id,ui.zone[id],true)}
  else if(a==='igamble'){if(ui.zone[id])insGamble(id,ui.zone[id])}
  else if(a==='iclose')insClose(id);
  else if(a==='imsg')ui.insMsg=null;
  else if(a==='iint')insCheckInt(id);
  else if(a==='dswap')overSwap(id);
  else if(a==='dcol')overColleague(id);
  else if(a==='dsend')overSendAway(id);
  else if(a==='psolve')probSolve(id);
  else if(a==='psend')probSendAway(id);
  else if(a==='hire')hire(id);
  else if(a==='borrow')borrow(+b.dataset.k);
  else if(a==='hist'){ui.hist[id]=!ui.hist[id]}
  else if(a==='ropen')ui.report=S.reports.length-1;
  else if(a==='ropenI')ui.report=+b.dataset.k;
  else if(a==='rclose')ui.report=null;
  else if(a==='rprev')ui.report=Math.max(0,ui.report-1);
  else if(a==='rnext')ui.report=Math.min(S.reports.length-1,ui.report+1);
  else if(a==='price')setPrice(b.dataset.k,null,+b.dataset.d);
  else return;
  render();
});
document.addEventListener('change',e=>{
  const t=(e.target as any);
  if(t.id==='dcat'){ui.dcat=t.value;render();return}
  if(t.tagName==='SELECT'&&t.dataset.desk){ui.dsel[+t.dataset.desk]=+t.value;render();return}
  if(t.tagName==='SELECT'&&t.dataset.req){const q=+t.dataset.req;ui.sel[q]=+t.value;render();setPreview(q);return}
  if(t.type==='checkbox'&&t.dataset.q){const q=+t.dataset.q,s=t.dataset.s;const l=ui.checks[q]||(ui.checks[q]=[]);
    if(t.checked){if(!l.includes(s))l.push(s)}else ui.checks[q]=l.filter(x=>x!==s);return}
  const k=t.dataset&&t.dataset.k;
  if(k&&t.tagName==='INPUT'){setPrice(k,+t.value,0);render()}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.report!=null){ui.report=null;renderReport()}});
document.addEventListener('pointerover',e=>{const r=(e.target as any).closest&&(e.target as any).closest('.req');if(r)setPreview(+r.dataset.req)});
document.addEventListener('focusin',e=>{const r=(e.target as any).closest&&(e.target as any).closest('.req');if(r)setPreview(+r.dataset.req)});
(window as any).claude?.hot?.snapshot?.(()=>({S}));
(window as any).claude?.hot?.ready?(window as any).claude.hot.ready(start):start((window as any).claude?.hot?.data??{});
