import { S, ui } from '../core/state.js';
import { freeNow, visiblyDamaged } from '../sim/fleet.js';
import { activeEvents, evCatsTxt, evMul, evTypesTxt, seasonOf } from '../sim/seasons.js';
import { clamp, eur } from '../core/util.js';
import { dlong, dshort } from '../core/calendar.js';
export const TABS=[['banco','Banco'],['flotta','Flotta'],['planning','Planning'],['acquisti','Acquisti'],['gestione','Gestione'],['registro','Registro']];
export function loadTab(){try{const t=localStorage.getItem('banco-noleggi-tab');return TABS.some(x=>x[0]===t)?t:'banco'}catch(e){return 'banco'}}
export function saveTab(t){try{localStorage.setItem('banco-noleggi-tab',t)}catch(e){}}
export function renderTabs(){
  const todo=S.reqs.length+S.ins.length+S.desk.length;
  const fleetWarn=S.fleet.filter(c=>freeNow(c)&&(c.dirty||visiblyDamaged(c)||c.cond<50)).length;
  const upcoming=S.events.filter(e=>e.end>S.day).length;
  const badge={banco:todo?[todo,'']:null,flotta:fleetWarn?[fleetWarn,'warn']:null,registro:upcoming?[upcoming,'warn']:null};
  document.getElementById('tabs').innerHTML=TABS.map(([k,l])=>`<button class="tab" role="tab" id="tab-${k}" data-tab="${k}" aria-selected="${ui.tab===k}">${l}${badge[k]?`<span class="badge ${badge[k][1]}">${badge[k][0]}</span>`:''}</button>`).join('');
  document.querySelectorAll<HTMLElement>('.tabp').forEach(el=>el.hidden=el.dataset.tab!==ui.tab);
}
export function renderSeason(){
  const M=evMul(S.day),se=seasonOf(S.day),lvl=clamp(Math.round(M.dem*3),1,7);
  const live=activeEvents(S.day),next=S.events.filter(e=>e.start>S.day).sort((a,b)=>a.start-b.start).slice(0,3);
  const lbl=M.dem<.85?'domanda bassa':M.dem<1.15?'domanda normale':M.dem<1.6?'domanda alta':'domanda altissima';
  document.getElementById('season').innerHTML=`<span class="sn">${se.nome}</span>
    <span title="${se.desc}"><span class="meter" aria-hidden="true">${[...Array(7)].map((_,i)=>`<i class="${i<lvl?'on':''}"></i>`).join('')}</span> ${lbl}</span>
    ${live.map(e=>`<span class="evchip live" title="${e.desc}"><b>${e.nome}</b><small>in corso fino al ${dshort(e.end-1)}</small></span>`).join('')}
    ${next.map(e=>`<span class="evchip" title="${e.desc}"><b>${e.nome}</b><small>dal ${dshort(e.start)} · tra ${e.start-S.day} g</small></span>`).join('')}`;
  document.getElementById('today').textContent=dlong(S.day)+' · '+se.desc;
}
export function renderEvList(){
  const up=S.events.filter(e=>e.end>S.day).sort((a,b)=>a.start-b.start),past=S.events.filter(e=>e.end<=S.day).sort((a,b)=>b.start-a.start).slice(0,4);
  const row=e=>`<div class="evrow"><span class="when">${dshort(e.start)}${e.end-e.start>1?' – '+dshort(e.end-1):''}</span><span><b>${e.nome}</b>${e.start<=S.day&&S.day<e.end?' <span class="chip c-warn">In corso</span>':''}<small>${e.desc} Domanda ×${String(Math.round(e.dem*100)/100).replace('.',',')}${evTypesTxt(e)?' · più '+evTypesTxt(e):''}${evCatsTxt(e)?' · richiesti: '+evCatsTxt(e):''}</small></span></div>`;
  document.getElementById('evlist').innerHTML=(up.length?up.map(row).join(''):'<div class="empty">Nessun evento annunciato. Gli eventi vengono annunciati da 2 a 10 giorni prima.</div>')
    +(past.length?`<span class="lbl" style="margin-top:8px;display:block">Passati</span>${past.map(row).join('')}`:'');
  document.getElementById('replist').innerHTML=S.reports.length?S.reports.map((r,i)=>`<div class="row"><div class="l">Settimana ${r.no}<small>${dshort(r.from)} – ${dshort(r.to)}</small></div><span class="num" style="font-weight:600;color:${r.net<0?'var(--bad)':'var(--good)'}">${r.net>=0?'+':''}${eur(r.net)}</span><button data-a="ropenI" data-k="${i}">Apri</button></div>`).reverse().join(''):'<div class="empty">Il primo report arriva domenica sera.</div>';
}
