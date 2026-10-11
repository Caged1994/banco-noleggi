import { canBorrow, debt, debtCap, fleetValue, loanTotal, loanWeeklyOf, payoffCost } from '../sim/bank.js';
import { clamp, eur } from '../core/util.js';
import { S, ui } from '../core/state.js';
import { LOANS, ROLES, traitTxt } from '../data/catalog.js';
import { wages } from '../sim/ledger.js';
export function renderBank(){
  const cap=debtCap(),d=debt();
  document.getElementById('bank').innerHTML=`
    <div class="rline" style="font-size:14px"><span>Debito residuo</span><span>${eur(d)}</span><div class="hbar out"><i style="width:${cap?clamp(d/cap*100,0,100):0}%"></i></div></div>
    <small style="color:var(--muted);font-size:12px">Fido massimo ${eur(cap)}: 4.000 € più metà del valore della flotta (${eur(fleetValue())}).</small>
    ${S.loans.map(l=>`<div class="row"><div class="l">Prestito ${eur(l.amt)}<small>${eur(l.weekly)} a settimana · ${l.left} rate su ${l.weeks}</small></div><button data-a="payoff" data-id="${l.id}" class="${ui.armed==='pay-'+l.id?'armed':''}" ${S.cash<payoffCost(l)?'disabled':''}>${ui.armed==='pay-'+l.id?'Conferma ':'Estingui '}${eur(payoffCost(l))}</button></div>`).join('')}
    <span class="lbl" style="margin-top:6px">Offerte</span>
    ${LOANS.map((o,i)=>`<div class="row"><div class="l">${eur(o.amt)} in ${o.weeks} settimane<small>Rata ${eur(loanWeeklyOf(o))} · interessi ${Math.round(o.rate*100)}% (${eur(loanTotal(o)-o.amt)}) · totale ${eur(loanTotal(o))}</small></div><button data-a="borrow" data-k="${i}" ${canBorrow(o)?'':'disabled'} title="${canBorrow(o)?'':'Supera il fido o hai già 3 prestiti'}">Chiedi</button></div>`).join('')}`;
}
export function renderStaff(){
  const lvl=l=>'●'.repeat(l)+'○'.repeat(3-l);
  const row=(x,btn)=>`<div class="row"><div class="l">${x.name} <small>${ROLES[x.role].nome} · liv. <span aria-label="livello ${x.level}">${lvl(x.level)}</span> · ${ROLES[x.role].desc(x.level)}</small><small><b>${x.trait}</b>: ${traitTxt(x.role,x.trait)}</small></div>${btn}</div>`;
  document.getElementById('staff').innerHTML=
    `<span class="lbl">In servizio · stipendi ${eur(wages())}/settimana</span>`
    +(S.staff.length?S.staff.map(x=>row(x,`<button class="danger ${ui.armed==='fire-'+x.id?'armed':''}" data-a="fire" data-id="${x.id}">${ui.armed==='fire-'+x.id?'Conferma':'Licenzia'}</button>`)).join(''):`<div class="row"><div class="l"><small>Lavori da solo: 10 di tempo al giorno, nessun lavaggio notturno.</small></div></div>`)
    +`<span class="lbl" style="margin-top:8px">Candidati della settimana</span>`
    +(S.cands.length?S.cands.map(x=>row(x,`<button data-a="hire" data-id="${x.id}" ${S.staff.length>=6?'disabled':''}>Assumi · ${eur(x.wage)}/sett.</button>`)).join(''):`<div class="row"><div class="l"><small>Nuovi candidati lunedì.</small></div></div>`);
}
