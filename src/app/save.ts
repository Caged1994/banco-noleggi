import { initMaint } from '../sim/maintenance.js';
import { newRival } from '../sim/rival.js';
import { SAVE, SVC } from '../data/catalog.js';
import { S, ui, setState } from '../core/state.js';
import { netWorth, newGame } from '../sim/game.js';
import { migrateStaff } from '../sim/staff.js';
import { loadTab } from '../ui/tabs.js';
import { genMarket } from '../sim/market.js';
import { render } from '../ui/render.js';
export function save(){try{localStorage.setItem(SAVE,JSON.stringify(S))}catch(e){}}
export function load(){try{const s=localStorage.getItem(SAVE);return s?JSON.parse(s):null}catch(e){return null}}

export function start(data){
  const ok=s=>s&&s.fleet&&s.sprices&&s.sprices.upgrade&&s.wk&&s.ins&&s.time!=null&&s.ins.every(i=>i.zones)&&s.staff&&s.desk&&s.loans&&s.fleet.every(c=>c.dmgs)&&s.fleet.every(c=>c.bookings);
  setState(ok(data&&data.S)?data.S:load());
  if(!ok(S))newGame();
  if(S.sprices.gps==null)S.sprices.gps=SVC.gps.std;
  if(S.gpsN==null)S.gpsN=2;
  if(!S.events)S.events=[];
  if(!S.clients)S.clients=[];
  if(!S.rival)S.rival=newRival();
  S.fleet.forEach(c=>{if(c.svcKm==null)initMaint(c,'used')});
  migrateStaff();
  if(!S.spare)S.spare={};
  if(!S.todayInc)S.todayInc=[];
  if(S.ms==null)S.ms=S.won?1:0;
  if(S.nwYear==null)S.nwYear=netWorth();
  S.ins.forEach(it=>{if(!it.dmgs){it.dmgs=it.dmg?[it.dmg]:[];delete it.dmg}});
  ui.tab=ui.tab||loadTab();
  if(S.market.some(m=>!m.dealer))genMarket();
  ui.dealer=ui.dealer||'gino';
  ui.zone=ui.zone||{};ui.dsel=ui.dsel||{};ui.hist=ui.hist||{};ui.dcat=ui.dcat||'berlina';ui.hire=ui.hire||{};ui.vac=ui.vac||{};
  render();
}
