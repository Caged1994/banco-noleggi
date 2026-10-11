import { S, ui } from '../core/state.js';
import { CATS, OFFICE_W, SVC } from '../data/catalog.js';
import { eur } from '../core/util.js';
import { log, rep } from './ledger.js';
import { debt } from './bank.js';
/* ---------- report settimanale ---------- */
export const INC_LBL={rent:'Noleggi',svc:'Servizi',damage:'Danni addebitati',interior:'Pulizie e interni',extra:'Pieni, multe e ritardi',sell:'Vendita auto'};
export const OUT_LBL={fixed:'Affitto e assicurazioni',staff:'Stipendi',loan:'Rate prestiti',repair:'Officina e soccorso',wash:'Lavaggi',refund:'Rimborsi',colleague:'Auto da colleghi',buy:'Acquisti'};
export function buildReport(endDay){
  const w=S.wk,sum=o=>Object.values<any>(o).reduce((a,b)=>a+b,0);
  const cars=S.fleet.map(c=>({plate:c.plate,model:c.model,cat:c.cat,inc:w.car[c.id]||0})).sort((a,b)=>b.inc-a.inc);
  const tips=[];
  const lostTop=Object.entries<any>(w.lost).sort((a,b)=>b[1]-a[1])[0];
  if(lostTop&&lostTop[1]>=3)tips.push(`Hai perso ${lostTop[1]} clienti che cercavano ${CATS[lostTop[0]].nome}: valuta un'altra auto di questa categoria.`);
  const idle=cars[cars.length-1];
  if(cars.length>2&&idle&&idle.inc<OFFICE_W/7*3)tips.push(`${idle.plate} (${idle.model}) ha incassato solo ${eur(idle.inc)}: valuta di abbassare il listino ${CATS[idle.cat].nome} o di venderla.`);
  for(const s of ['seat','driver','upgrade','gps']){const x=w.svc[s];if(x&&x.prop>=4&&x.acc/x.prop<.25)tips.push(`${SVC[s].nome} accettato ${x.acc} volte su ${x.prop}: prova un prezzo più basso o proponilo ai clienti giusti.`)}
  const k=w.svc.kasko;if(k&&k.prop>=4&&k.acc/k.prop<.3)tips.push(`L'assicurazione totale è stata accettata ${k.acc} volte su ${k.prop}: i turisti e le famiglie la prendono più volentieri.`);
  if(w.dmgLost>=500)tips.push(`Hai perso ${eur(w.dmgLost)} di danni non trovati: un addetto ai rientri riduce la penalità dei danni vecchi e dello sporco.`);
  else if(w.dmgMissed)tips.push(`${w.dmgMissed} dann${w.dmgMissed>1?'i':'o'} sfuggit${w.dmgMissed>1?'i':'o'} all'ispezione: pulisci le zone sporche prima di controllarle.`);
  if(w.clLost)tips.push(`${w.clLost} client${w.clLost>1?'i':'e'} non torner${w.clLost>1?'anno':'à'} più: addebiti contestati, overbooking e auto sporche sono le cause più comuni.`);
  if(w.overBad)tips.push(`${w.overBad} client${w.overBad>1?'i':'e'} in overbooking rimandat${w.overBad>1?'i':'o'} a casa: tieni un'auto di riserva o usa i colleghi.`);
  if(w.ignored>=3)tips.push(`${w.ignored} clienti avevano un'auto disponibile ma non sono stati serviti.`);
  if(!tips.length)tips.push('Settimana pulita, nessun problema evidente. Valuta di espandere la flotta.');
  const rep={no:w.no,from:w.start,to:endDay,inc:w.inc,out:w.out,net:sum(w.inc)-(w.inc.loanin||0)-sum(w.out),totIn:sum(w.inc)-(w.inc.loanin||0),totOut:sum(w.out),
    cat:w.cat,svc:w.svc,cars,lost:w.lost,ignored:w.ignored,noshow:w.noshow,probSolved:w.probSolved,probLeft:w.probLeft,overOk:w.overOk,overBad:w.overBad,clBack:w.clBack,clLost:w.clLost,rep0:w.rep0,rep1:S.rep,
    dmg:{found:w.dmgFound,missed:w.dmgMissed,falso:w.dmgFalse,inspected:w.inspected,value:w.dmgValue,lost:w.dmgLost,intv:w.intValue,intl:w.intLost},loanin:w.inc.loanin||0,debt:debt(),tips,cash:S.cash};
  S.reports.push(rep);if(S.reports.length>12)S.reports.shift();
  ui.report=S.reports.length-1;
  log(`Report della settimana ${w.no} pronto: risultato ${rep.net>=0?'+':''}${eur(rep.net)}`,'hdr');
}
