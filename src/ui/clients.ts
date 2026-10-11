// Scheda «Clienti»: registro dei clienti con livello, fedeltà e ultimi episodi.
import { S } from '../core/state.js';
import { dshort } from '../core/calendar.js';
import { eur } from '../core/util.js';
import { CATS, TYPES } from '../data/catalog.js';
import { TIERS, tierOf, clientById } from '../sim/regulars.js';

const TIER_CHIP = { fedele: 'c-ok', abituale: 'c-acc', nuovo: 'c-mut', perso: 'c-bad' };

// Chip del livello per la scheda del cliente al banco (vuoto per i clienti mai visti).
export function tierChip(q) {
  const cl = clientById(q.cid);
  if (!cl) return '';
  const t = tierOf(cl);
  const last = cl.log[0];
  const title = `${cl.visits} ${cl.visits === 1 ? 'visita' : 'visite'} · speso ${eur(cl.spent)} · fedeltà ${cl.loyalty}${last ? ` · ultimo episodio: ${last.why}` : ''}`;
  return `<span class="chip ${TIER_CHIP[t]}" title="${title}">${t === 'nuovo' ? 'Già visto' : TIERS[t].nome} · ${cl.visits} ${cl.visits === 1 ? 'visita' : 'visite'}</span> `;
}

function loyaltyBar(v) {
  // barra centrata: a sinistra il negativo, a destra il positivo
  const w = Math.abs(v) / 2;
  return `<span class="lbar" aria-label="fedeltà ${v}"><i class="${v < 0 ? 'neg' : 'pos'}" style="width:${w}%;${v < 0 ? `right:50%` : `left:50%`}"></i></span>`;
}

function row(cl) {
  const t = tierOf(cl);
  const recent = cl.log.slice(0, 3).map((e) => `<li><span class="num">${e.delta > 0 ? '+' : ''}${e.delta}</span> ${e.why} <small>${dshort(e.d)}</small></li>`).join('');
  return `<article class="client">
    <div class="client-h"><b>${cl.name}</b><span class="chip ${TIER_CHIP[t]}">${TIERS[t].nome}</span></div>
    <div class="car-line">${TYPES[cl.type].label} · preferisce ${CATS[cl.cat].nome} · ${cl.visits} ${cl.visits === 1 ? 'visita' : 'visite'} · speso <span class="num">${eur(cl.spent)}</span> · ultima visita ${dshort(cl.last)}</div>
    <div class="client-loy"><span class="lbl">Fedeltà</span>${loyaltyBar(cl.loyalty)}<span class="num">${cl.loyalty > 0 ? '+' : ''}${cl.loyalty}</span></div>
    ${recent ? `<ul class="client-log">${recent}</ul>` : ''}
  </article>`;
}

export function renderClients() {
  const box = document.getElementById('clients');
  const groups = { fedele: [], abituale: [], nuovo: [], perso: [] };
  for (const cl of S.clients) groups[tierOf(cl)].push(cl);
  groups.fedele.sort((a, b) => b.loyalty - a.loyalty);
  groups.abituale.sort((a, b) => b.loyalty - a.loyalty);
  groups.nuovo.sort((a, b) => b.last - a.last);
  groups.perso.sort((a, b) => b.last - a.last);
  const PLUR = { fedele: 'Fedeli', abituale: 'Abituali', nuovo: 'Nuovi', perso: 'Persi' };
  const counts = `<div class="client-sum">${['fedele', 'abituale', 'nuovo', 'perso'].map((t) => `<span class="chip ${TIER_CHIP[t]}">${PLUR[t]}: ${groups[t].length}</span>`).join('')}</div>`;
  const section = (t, title, limit) => groups[t].length
    ? `<div class="panel-h"><h3>${title}</h3><span class="lbl">${groups[t].length}${groups[t].length > limit ? ` · i ${limit} più recenti` : ''}</span></div><div class="fleetgrid">${groups[t].slice(0, limit).map(row).join('')}</div>`
    : '';
  box.innerHTML = S.clients.length
    ? counts
      + section('fedele', 'Fedeli', 50)
      + section('abituale', 'Abituali', 50)
      + section('nuovo', 'Nuovi', 20)
      + section('perso', 'Persi', 20)
    : '<div class="empty">Nessun cliente ancora. Ogni cliente che servi entra qui: trattalo bene e tornerà.</div>';
}
