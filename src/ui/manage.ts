import { canBorrow, debt, debtCap, fleetValue, goodBank, loanOffers, loanTotal, loanWeeklyOf, maxLoans, payoffCost } from '../sim/bank.js';
import { MILESTONES, RENT_TIERS, TAX_RATE } from '../data/goals.js';
import { msReached, taxEstimate, taxFree, yearProfit } from '../sim/progress.js';
import { nextRent, rentWeek } from '../sim/ledger.js';
import { netWorth } from '../sim/game.js';
import { dateOf } from '../core/calendar.js';
import { clamp, eur } from '../core/util.js';
import { S, ui } from '../core/state.js';
export function renderBank(){
  const cap=debtCap(),d=debt();
  document.getElementById('bank').innerHTML=`
    <div class="rline" style="font-size:14px"><span>Debito residuo</span><span>${eur(d)}</span><div class="hbar out"><i style="width:${cap?clamp(d/cap*100,0,100):0}%"></i></div></div>
    <small style="color:var(--muted);font-size:12px">Fido massimo ${eur(cap)}: 4.000 € più ${goodBank()?'tre quarti':'metà'} del valore della flotta (${eur(fleetValue())}).</small>
    ${S.loans.map(l=>`<div class="row"><div class="l">${l.tax?'Tasse rateizzate':'Prestito'} ${eur(l.amt)}<small>${eur(l.weekly)} a settimana · ${l.left} rate su ${l.weeks}</small></div><button data-a="payoff" data-id="${l.id}" class="${ui.armed==='pay-'+l.id?'armed':''}" ${S.cash<payoffCost(l)?'disabled':''}>${ui.armed==='pay-'+l.id?'Conferma ':l.tax?'Salda ':'Estingui '}${eur(payoffCost(l))}</button></div>`).join('')}
    <span class="lbl" style="margin-top:6px">Offerte</span>
    ${loanOffers().map((o,i)=>`<div class="row"><div class="l">${eur(o.amt)} in ${o.weeks} settimane<small>Rata ${eur(loanWeeklyOf(o))} · interessi ${Math.round(o.rate*100)}% (${eur(loanTotal(o)-o.amt)}) · totale ${eur(loanTotal(o))}</small></div><button data-a="borrow" data-k="${i}" ${canBorrow(o)?'':'disabled'} title="${canBorrow(o)?'':`Supera il fido o hai già ${maxLoans()} prestiti`}">Chiedi</button></div>`).join('')}`;
}

// Traguardi, affitto e tasse
export function renderGoals(){
  const nw=netWorth(),k=msReached(),nr=nextRent(),y=dateOf(S.day).y;
  const ms=MILESTONES.map((m,i)=>{
    const done=i<k,cur=i===k;
    return `<div class="row"><div class="l">${done?'✓ ':''}${m.nome} · ${eur(m.nw)}<small>${m.unlock}${m.soon?' (in arrivo)':''}${cur?` · mancano ${eur(Math.max(0,m.nw-nw))}`:''}</small></div><span class="chip ${done?'c-ok':cur?'c-acc':'c-mut'}">${done?'raggiunto':cur?Math.round(clamp(nw/m.nw*100,0,100))+'%':'da fare'}</span></div>`;
  }).join('');
  const tiers=RENT_TIERS.map((t,i)=>`${i?(RENT_TIERS[i-1].max+1)+(t.max===Infinity?'+':'–'+t.max):'1–'+t.max} auto ${eur(t.w)}`).join(' · ');
  const tax=taxFree(S.day)
    ?`Anno ${y}: esente (agevolazione per la nuova attività). Utile finora ${eur(yearProfit())}; dal 1° gennaio dell'anno ${y+1} si paga il ${Math.round(TAX_RATE*100)}% dell'utile.`
    :`Tasse stimate al 31 dicembre: <b class="num">${eur(taxEstimate())}</b> (${Math.round(TAX_RATE*100)}% dell'utile finora, ${eur(yearProfit())}). Se la cassa non basta, il resto si paga in rate senza interessi.`;
  document.getElementById('goals').innerHTML=`${ms}
    <span class="lbl" style="margin-top:10px">Affitto ufficio e parcheggio</span>
    <div class="row"><div class="l">${eur(rentWeek())} a settimana con ${S.fleet.length} auto<small>${tiers}${nr?` · con la ${nr.at}ª auto si passa a ${eur(nr.w)}`:''}</small></div></div>
    <span class="lbl" style="margin-top:10px">Tasse</span>
    <div class="row"><div class="l"><small style="font-size:13px;color:var(--ink)">${tax}</small></div></div>`;
}
