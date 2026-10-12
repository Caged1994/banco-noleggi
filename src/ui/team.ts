// Scheda «Personale»: dipendenti, candidati e box officina; striscia della squadra al banco.
import { S, ui } from '../core/state.js';
import { dshort } from '../core/calendar.js';
import { clamp, eur } from '../core/util.js';
import {
  BOX_COST, BOX_UP, BOX_UP_KEYS, LEVEL_MAX, PROBATION, ROLES, ROLE_KEYS, SEASONAL_MUL, TRAITS, XP_NEED, courseCost,
} from '../data/staffdata.js';
import {
  DAY_NAMES, PLAYER_TIME, absence, aptLabel, aptOf, canCourse, canHireAs, fireCost, inProbation, lvOf, maxStaff, staffTime, vacFree, vacStarts, workingOf, xpOf,
} from '../sim/staff.js';

const fem = (n) => n.split(' ')[0].endsWith('a');
const first = (n) => n.split(' ')[0];
const meter = (v, max, cls = '') => `<span class="tbar ${cls}" aria-hidden="true"><i style="width:${max > 0 ? clamp(v / max * 100, 0, 100) : 0}%"></i></span>`;
const roleOpts = (sel, withBlank = false) => (withBlank ? `<option value="">Scegli il ruolo…</option>` : '')
  + ROLE_KEYS.map((r) => `<option value="${r}" ${r === sel ? 'selected' : ''} ${r === 'meccanico' && !S.box.own ? 'disabled' : ''}>${ROLES[r].nome}${r === 'meccanico' && !S.box.own ? ' (serve il box)' : ''}</option>`).join('');

function statusChips(e) {
  const out = [];
  const ab = absence(e);
  if (ab === 'riposo') out.push(`<span class="chip c-mut">Oggi a riposo</span>`);
  if (ab === 'malattia') out.push(`<span class="chip c-bad">In malattia fino al ${dshort(e.sick.end - 1)}</span>`);
  else if (ab === 'ferie') { const v = e.vac.find((x) => x.start <= S.day && S.day < x.end); out.push(`<span class="chip c-mut">In ferie fino al ${dshort(v.end - 1)}</span>`); }
  else if (ab === 'corso') out.push(`<span class="chip c-acc">Al corso fino al ${dshort(e.course.end - 1)}</span>`);
  if (inProbation(e)) out.push(`<span class="chip c-warn">In prova fino al ${dshort(e.hired + PROBATION)}</span>`);
  if (e.raise) out.push(`<span class="chip c-warn">Chiede un aumento</span>`);
  if (e.unhappy) out.push(`<span class="chip c-bad">Scontent${fem(e.name) ? 'a' : 'o'}</span>`);
  if (e.role === 'meccanico' && !workingOf('meccanico').includes(e) && !ab) out.push(`<span class="chip c-bad">${S.box.own ? 'Nessun posto libero nel box' : 'Senza box non lavora'}</span>`);
  return out.join(' ');
}

function empCard(e) {
  const lv = lvOf(e), max = staffTime(e), need = lv < LEVEL_MAX ? XP_NEED[lv] : 0;
  const traits = e.traitsKnown
    ? e.traits.map((t) => `<b class="${TRAITS[t].good ? '' : 'neg'}">${t}</b> <small>${TRAITS[t].txt}</small>`).join(' · ')
    : `<small>si scopriranno a fine prova, il ${dshort(e.hired + PROBATION)}</small>`;
  const apts = ROLE_KEYS.filter((r) => e.aptKnown[r]).map((r) => `${ROLES[r].nome} <b>${aptLabel(aptOf(e, r))}</b>`);
  const aptTxt = (apts.length ? apts.join(' · ') : '') + (e.aptKnown[e.role] ? '' : `${apts.length ? ' · ' : ''}come ${ROLES[e.role].nome.toLowerCase()}: si saprà il ${dshort(Math.max(e.roleSince, e.hired) + PROBATION)}`);
  const fc = fireCost(e), armed = ui.armed === 'fire-' + e.id;
  const v = ui.vac[e.id] || {}, starts = vacStarts(), vs = +v.start || starts[0], vl = Math.min(+v.len || Math.min(5, e.vacLeft), e.vacLeft);
  const vacs = e.vac.filter((x) => x.end > S.day).map((x) => `<span class="chip c-mut">Ferie ${dshort(x.start)} – ${dshort(x.end - 1)}${x.start > S.day ? ` <button class="mini-x" data-a="vacdel" data-id="${e.id}" data-k="${x.start}" aria-label="Annulla ferie dal ${dshort(x.start)}">✕</button>` : ''}</span>`).join(' ');
  const acts = [
    e.raise ? `<button class="pri" data-a="raiseok" data-id="${e.id}">Concedi ${eur(e.raise.wage)}/sett.</button><button data-a="raiseno" data-id="${e.id}">Nega</button>` : '',
    !e.raise && e.unhappy ? `<button class="pri" data-a="happy" data-id="${e.id}">Concedi l'aumento</button>` : '',
    e.contract === 'stagionale' ? `<button data-a="fixed" data-id="${e.id}" ${e.offerDay && S.day - e.offerDay < 7 ? 'disabled title="Puoi riproporlo tra qualche giorno"' : ''}>Proponi il fisso · ${eur(Math.round(e.wage / SEASONAL_MUL / 10) * 10)}/sett.</button>` : '',
    lv < LEVEL_MAX ? `<button data-a="course" data-id="${e.id}" ${canCourse(e) ? '' : 'disabled'} title="${inProbation(e) ? 'Non durante la prova' : '2 giorni fuori sede: esperienza pari al 60% del livello successivo'}">Corso ${eur(courseCost(lv))} · 2 g</button>` : '',
    `<button class="danger ${armed ? 'armed' : ''}" data-a="fire" data-id="${e.id}">${armed ? `Conferma${fc ? ' ' + eur(fc) : ''}` : fc ? `Licenzia · ${eur(fc)}` : 'Licenzia · in prova, gratis'}</button>`,
  ].join('');
  return `<article class="emp">
    <div class="client-h"><b>${e.name}</b><span>${statusChips(e)}</span></div>
    <div class="emp-grid">
      <label class="lbl" for="erole-${e.id}">Ruolo</label><select id="erole-${e.id}" data-erole="${e.id}">${roleOpts(e.role)}</select>
      <span class="lbl">Livello</span><span><b class="num">${lv}</b>/${LEVEL_MAX} ${need ? `${meter(xpOf(e), need, 'good')} <small>${Math.floor(xpOf(e))}/${need} esperienza</small>` : '<small>massimo</small>'}</span>
      <span class="lbl">Tempo oggi</span><span>${max ? `<b class="num">${e.time}</b>/${max} ${meter(e.time, max)}` : `<small>assente</small>`}</span>
      <span class="lbl">Riposo</span><span>ogni ${DAY_NAMES[e.dayOff]}${absence(e) === 'riposo' ? ' · <b>oggi è a riposo</b>' : ''}</span>
      <span class="lbl">Contratto</span><span>${e.contract === 'fisso' ? 'Fisso' : `Stagionale fino al ${dshort(e.until - 1)}`} · <b class="num">${eur(e.wage)}</b>/sett.${e.raise ? ` → chiede <b class="num">${eur(e.raise.wage)}</b>` : ''}</span>
      <span class="lbl">Attitudine</span><span>${aptTxt}</span>
      <span class="lbl">Tratti</span><span>${traits}</span>
    </div>
    ${e.bio ? `<div class="bio">«${e.bio}»</div>` : ''}
    <small class="emp-role">${ROLES[e.role].desc}</small>
    ${e.contract === 'fisso' ? `<div class="vacrow"><span class="lbl">Ferie · ${e.vacLeft} giorni da dare</span>${vacs}${e.vacLeft ? `
      <select data-vk="start" data-id="${e.id}" aria-label="Inizio ferie di ${first(e.name)}">${starts.map((d) => `<option value="${d}" ${d === vs ? 'selected' : ''}>da lun ${dshort(d)}</option>`).join('')}</select>
      <select data-vk="len" data-id="${e.id}" aria-label="Giorni di ferie di ${first(e.name)}">${[...new Set([3, 5, 7, 10, e.vacLeft])].filter((n) => n <= e.vacLeft).sort((a, b) => a - b).map((n) => `<option value="${n}" ${n === vl ? 'selected' : ''}>${n} giorni</option>`).join('')}</select>
      <button data-a="vac" data-id="${e.id}" ${vacFree(e, vs, vl) ? '' : 'disabled title="Si sovrappone a un\'altra assenza"'}>Programma</button>` : ''}</div>` : ''}
    <div class="acts">${acts}</div>
  </article>`;
}

function candCard(c) {
  const h = ui.hire[c.id] || {};
  const cons = [['fisso', 'Fisso'], ['s1', 'Stagionale 1 mese'], ['s2', 'Stagionale 2 mesi'], ['s3', 'Stagionale 3 mesi']].filter(([k]) => canHireAs(c, k === 'fisso' ? 'fisso' : 'stagionale'));
  const con = cons.some(([k]) => k === h.con) ? h.con : cons[0][0];
  const role = c.trained ? c.role : h.role || '';
  const full = S.staff.length >= maxStaff(), noRole = !role, noBox = role === 'meccanico' && !S.box.own;
  const wants = { fisso: 'Solo fisso', stagionale: 'Solo stagionale', entrambi: 'Fisso o stagionale' }[c.wants];
  const wage = con === 'fisso' ? c.wage : Math.round(c.wage * SEASONAL_MUL / 10) * 10;
  return `<article class="emp cand">
    <div class="client-h"><b>${c.name}</b><span>${c.trained ? `<span class="chip c-acc">Addestrat${fem(c.name) ? 'a' : 'o'} · ${ROLES[c.role].nome} liv. ${c.level}</span>` : `<span class="chip c-mut">Non addestrat${fem(c.name) ? 'a' : 'o'}</span>`} <span class="chip c-mut">${wants}</span></span></div>
    <div class="bio">«${c.bio}»</div>
    <small class="emp-role">${c.trained ? 'Sai cosa sa fare; i tratti li scoprirai dopo la settimana di prova.' : 'Non sai ancora per cosa è portato: mettilo in un ruolo e dopo una settimana lo scoprirai.'} Disponibile fino al ${dshort(c.expires - 1)}.</small>
    <div class="req-act">
      ${c.trained ? '' : `<select data-hk="role" data-id="${c.id}" aria-label="Ruolo per ${first(c.name)}">${roleOpts(role, true)}</select>`}
      <select data-hk="con" data-id="${c.id}" aria-label="Contratto per ${first(c.name)}">${cons.map(([k, l]) => `<option value="${k}" ${k === con ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="pri" data-a="hire" data-id="${c.id}" ${full || noRole || noBox ? 'disabled' : ''} title="${full ? `Hai già ${maxStaff()} dipendenti` : noRole ? 'Scegli prima il ruolo' : noBox ? 'Il meccanico lavora solo nel box officina' : ''}">Assumi · ${eur(wage)}/sett.</button>
    </div>
  </article>`;
}

function boxCard() {
  const B = S.box;
  if (!B.own) return `<div class="row"><div class="l">Box officina<small>Un posto per il meccanico: tagliandi al 50%, cambio gomme al 40% e riparazioni dell'usura al 60%, in sede e senza fermare l'auto.</small></div><button data-a="buybox" ${S.cash < BOX_COST ? 'disabled' : ''}>Costruisci · ${eur(BOX_COST)}</button></div>`;
  const mech = workingOf('meccanico');
  return `<div class="row"><div class="l">Box officina <span class="chip c-ok">Attivo</span><small>${mech.length ? `Al lavoro oggi: ${mech.map((e) => first(e.name)).join(', ')}` : 'Nessun meccanico al lavoro oggi: assumine uno.'}</small></div></div>`
    + BOX_UP_KEYS.map((k) => `<div class="row"><div class="l">${BOX_UP[k].nome}${B[k] ? ' <span class="chip c-ok">Installato</span>' : ''}<small>${BOX_UP[k].desc}</small></div>${B[k] ? '' : `<button data-a="buyup" data-k="${k}" ${S.cash < BOX_UP[k].cost ? 'disabled' : ''}>${eur(BOX_UP[k].cost)}</button>`}</div>`).join('');
}

export function renderTeam() {
  const wages = S.staff.reduce((a, x) => a + x.wage, 0);
  document.getElementById('teamcount').textContent = `${S.staff.length}/${maxStaff()} · stipendi ${eur(wages)}/settimana`;
  document.getElementById('team').innerHTML = S.staff.length ? S.staff.map(empCard).join('')
    : `<div class="empty">Lavori da solo: ${PLAYER_TIME} di tempo al giorno per ispezioni e proposte. Assumi qualcuno per farti aiutare.</div>`;
  document.getElementById('cands').innerHTML = S.cands.length ? S.cands.map(candCard).join('')
    : `<div class="empty">Nessun candidato questa settimana. D'inverno se ne presentano pochi: ne arrivano di nuovi ogni lunedì.</div>`;
  document.getElementById('box').innerHTML = boxCard();
}

// Striscia al banco: il tuo tempo e quello di chi lavora oggi.
export function renderCrew() {
  const el = document.getElementById('crew');
  if (!S.staff.length) { el.innerHTML = ''; return; }
  const chip = (name, role, t, max, why) => `<span class="crewchip${max ? '' : ' off'}"><b>${name}</b><small>${role}</small>${max ? `<span class="num">${t}/${max}</span>${meter(t, max)}` : `<small>${why}</small>`}</span>`;
  el.innerHTML = chip('Tu', 'titolare', S.time, PLAYER_TIME, '')
    + S.staff.map((e) => { const off = e.role === 'meccanico' && !workingOf('meccanico').includes(e); return chip(first(e.name), ROLES[e.role].nome.toLowerCase(), e.time, off ? 0 : staffTime(e), absence(e) || (S.box.own ? 'box pieno' : 'senza box')); }).join('');
}
