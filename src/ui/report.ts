import { S, ui } from '../core/state.js';
import { eur } from '../core/util.js';
import { hbar } from './common.js';
import { CATS, CAT_KEYS, SVC, SVC_KEYS } from '../data/catalog.js';
import { wdd } from '../core/calendar.js';
import { INC_LBL, OUT_LBL } from '../sim/report.js';
export function renderReport(){
  const m=document.getElementById('modal');
  if(ui.report==null||!S.reports[ui.report]){m.hidden=true;return}
  const r=S.reports[ui.report],i=ui.report;
  const incMax=Math.max(1,...Object.values<any>(r.inc)),outMax=Math.max(1,...Object.values<any>(r.out));
  const lines=(obj,lbl,max,cls)=>Object.keys(lbl).filter(k=>obj[k]).map(k=>`<div class="rline"><span>${lbl[k]}</span><span>${eur(obj[k])}</span>${hbar(obj[k],max,cls)}</div>`).join('')||'<div class="rline"><small>Nessuna voce</small></div>';
  const catMax=Math.max(1,...Object.values<any>(r.cat).map(x=>x.inc));
  const cats=CAT_KEYS.filter(k=>r.cat[k]).map(k=>`<div class="rline"><span>${CATS[k].nome} <small>· ${r.cat[k].n} noleggi</small></span><span>${eur(r.cat[k].inc)}</span>${hbar(r.cat[k].inc,catMax)}</div>`).join('')||'<div class="rline"><small>Nessun noleggio</small></div>';
  const svcMax=Math.max(1,...Object.values<any>(r.svc).map(x=>x.inc));
  const svcs=SVC_KEYS.filter(s=>r.svc[s]).map(s=>{const x=r.svc[s];return `<div class="rline"><span>${SVC[s].nome} <small>· ${x.req?x.req+' richiesti, ':''}${x.acc}/${x.prop} proposte accettate</small></span><span>${eur(x.inc)}</span>${hbar(x.inc,svcMax,'good')}</div>`}).join('')||'<div class="rline"><small>Nessun servizio venduto o proposto</small></div>';
  const carMax=Math.max(1,...r.cars.map(c=>c.inc));
  const cars=r.cars.map(c=>`<div class="rline"><span>${c.plate} <small>· ${c.model}</small></span><span>${eur(c.inc)}</span>${hbar(c.inc,carMax)}</div>`).join('');
  const lostTot=Object.values<any>(r.lost).reduce((a,b)=>a+b,0);
  const lost=CAT_KEYS.filter(k=>r.lost[k]).map(k=>`<div class="rline"><span>${CATS[k].nome}</span><span>${r.lost[k]}</span></div>`).join('');
  const svcShare=r.inc.rent||r.inc.svc?Math.round((r.inc.svc||0)/((r.inc.rent||0)+(r.inc.svc||0))*100):0;
  document.getElementById('sheet').innerHTML=`
    <div class="sheet-h">
      <div><span class="lbl">Report settimanale · ${wdd(r.from)} – ${wdd(r.to)}</span><h2>Settimana ${r.no}</h2></div>
      <div style="text-align:right"><span class="lbl">Risultato netto</span><div class="net ${r.net<0?'neg':'pos'}">${r.net>=0?'+':''}${eur(r.net)}</div><small style="color:var(--muted)">Cassa a fine settimana ${eur(r.cash)}</small></div>
    </div>
    <ul class="tips">${r.tips.map(t=>`<li>${t}</li>`).join('')}</ul>
    <div class="rgrid">
      <section class="rsec"><h3>Entrate · ${eur(r.totIn)}</h3>${lines(r.inc,INC_LBL,incMax,'good')}</section>
      <section class="rsec"><h3>Uscite · ${eur(r.totOut)}</h3>${lines(r.out,OUT_LBL,outMax,'out')}</section>
      <section class="rsec"><h3>Noleggi per categoria</h3>${cats}</section>
      <section class="rsec"><h3>Servizi · ${svcShare}% degli incassi</h3>${svcs}</section>
      <section class="rsec"><h3>Incasso per auto</h3>${cars}</section>
      <section class="rsec"><h3>Clienti e qualità</h3>
        <div class="rline"><span>Reputazione</span><span>${Math.round(r.rep0)} → ${Math.round(r.rep1)}</span></div>
        <div class="rline"><span>Clienti persi per mancanza di auto</span><span>${lostTot}</span></div>${lost?`<div style="padding-left:12px;display:grid;gap:4px">${lost}</div>`:''}
        <div class="rline"><span>Clienti serviti male o ignorati</span><span>${r.ignored}</span></div>
        <div class="rline"><span>Prenotazioni non presentate</span><span>${r.noshow||0}</span></div>
        <div class="rline"><span>Problemi al ritiro risolti / andati via</span><span>${r.probSolved||0} / ${r.probLeft||0}</span></div>
        <div class="rline"><span>Clienti andati da AutoSprint / arrivati da lei</span><span>${Object.values<any>(r.rivLost||{}).reduce((a,b)=>a+b,0)} / ${r.rivWon||0}</span></div>
        <div class="rline"><span>Clienti tornati / persi</span><span>${r.clBack||0} / ${r.clLost||0}</span></div>
        <div class="rline"><span>Overbooking risolti / rimandati a casa</span><span>${r.overOk||0} / ${r.overBad||0}</span></div>
        <div class="rline"><span>Ispezioni fatte</span><span>${r.dmg.inspected}</span></div>
        <div class="rline"><span>Danni trovati</span><span>${r.dmg.found}${r.dmg.value?' · '+eur(r.dmg.value):''}</span></div>
        ${r.dmg.intv||r.dmg.intl?`<div class="rline"><span>Interni addebitati / persi</span><span>${eur(r.dmg.intv||0)} / ${eur(r.dmg.intl||0)}</span></div>`:''}
        <div class="rline"><span>Danni sfuggiti</span><span>${r.dmg.missed}${r.dmg.lost?' · persi '+eur(r.dmg.lost):''}</span></div>
        ${r.loanin||r.debt?`<div class="rline"><span>Prestiti ricevuti / debito residuo</span><span>${eur(r.loanin||0)} / ${eur(r.debt||0)}</span></div>`:''}
        <div class="rline"><span>Addebiti contestati</span><span>${r.dmg.falso}</span></div>
      </section>
    </div>
    <div class="sheet-f">
      <div class="req-act"><button data-a="rprev" ${i<=0?'disabled':''}>‹ Precedente</button><button data-a="rnext" ${i>=S.reports.length-1?'disabled':''}>Successiva ›</button></div>
      <button class="pri" data-a="rclose">Continua</button>
    </div>`;
  m.hidden=false;
}
