import { S } from '../core/state.js';
import { value } from './fleet.js';
import { LOANS } from '../data/catalog.js';
import { log, money } from './ledger.js';
import { eur } from '../core/util.js';
export const debt=()=>S.loans.reduce((a,l)=>a+l.weekly*l.left,0);
export const loanWeekly=()=>S.loans.reduce((a,l)=>a+l.weekly,0);
export const fleetValue=()=>S.fleet.reduce((a,c)=>a+value(c),0);
export const debtCap=()=>Math.round((4000+fleetValue()*.5)/500)*500;
export const loanTotal=o=>Math.round(o.amt*(1+o.rate));
export const loanWeeklyOf=o=>Math.ceil(loanTotal(o)/o.weeks);
export const canBorrow=o=>debt()+loanWeeklyOf(o)*o.weeks<=debtCap()&&S.loans.length<3;
export function borrow(i){
  const o=LOANS[i];if(!o||!canBorrow(o))return;
  S.loans.push({id:S.nid++,amt:o.amt,weekly:loanWeeklyOf(o),left:o.weeks,weeks:o.weeks,rate:o.rate});
  money(o.amt,'loanin');log(`Prestito di ${eur(o.amt)} ottenuto: ${o.weeks} rate da ${eur(loanWeeklyOf(o))} ogni domenica.`,'in');
}
export const payoffCost=l=>Math.round(l.weekly*l.left*.92);
export function payoff(id){const l=S.loans.find(x=>x.id===id);if(!l||S.cash<payoffCost(l))return;money(-payoffCost(l),'loan');S.loans=S.loans.filter(x=>x!==l);log(`Prestito estinto in anticipo: −${eur(payoffCost(l))} (sconto 8% sulle rate rimaste).`,'out')}
export function payLoans(){
  if(!S.loans.length)return;
  const w=loanWeekly();money(-w,'loan');
  S.loans.forEach(l=>l.left--);const done=S.loans.filter(l=>l.left<=0);S.loans=S.loans.filter(l=>l.left>0);
  log(`Rate dei prestiti: −${eur(w)}${done.length?` · ${done.length} prestit${done.length>1?'i':'o'} saldat${done.length>1?'i':'o'}`:''}`,'out');
}
