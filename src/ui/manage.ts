import { canBorrow, debt, debtCap, fleetValue, loanTotal, loanWeeklyOf, payoffCost } from '../sim/bank.js';
import { clamp, eur } from '../core/util.js';
import { S, ui } from '../core/state.js';
import { LOANS } from '../data/catalog.js';
export function renderBank(){
  const cap=debtCap(),d=debt();
  document.getElementById('bank').innerHTML=`
    <div class="rline" style="font-size:14px"><span>Debito residuo</span><span>${eur(d)}</span><div class="hbar out"><i style="width:${cap?clamp(d/cap*100,0,100):0}%"></i></div></div>
    <small style="color:var(--muted);font-size:12px">Fido massimo ${eur(cap)}: 4.000 € più metà del valore della flotta (${eur(fleetValue())}).</small>
    ${S.loans.map(l=>`<div class="row"><div class="l">Prestito ${eur(l.amt)}<small>${eur(l.weekly)} a settimana · ${l.left} rate su ${l.weeks}</small></div><button data-a="payoff" data-id="${l.id}" class="${ui.armed==='pay-'+l.id?'armed':''}" ${S.cash<payoffCost(l)?'disabled':''}>${ui.armed==='pay-'+l.id?'Conferma ':'Estingui '}${eur(payoffCost(l))}</button></div>`).join('')}
    <span class="lbl" style="margin-top:6px">Offerte</span>
    ${LOANS.map((o,i)=>`<div class="row"><div class="l">${eur(o.amt)} in ${o.weeks} settimane<small>Rata ${eur(loanWeeklyOf(o))} · interessi ${Math.round(o.rate*100)}% (${eur(loanTotal(o)-o.amt)}) · totale ${eur(loanTotal(o))}</small></div><button data-a="borrow" data-k="${i}" ${canBorrow(o)?'':'disabled'} title="${canBorrow(o)?'':'Supera il fido o hai già 3 prestiti'}">Chiedi</button></div>`).join('')}`;
}
