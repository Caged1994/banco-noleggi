// Lavoro dei dipendenti: ognuno ha il suo tempo e lavora da solo, il venditore su tuo incarico.
//
// Ogni mattina, prima dei ritiri:
// 1. il lavaggista lava le auto rientrate (prima quelle da consegnare oggi), esterni 2 tempo e interni 1;
// 2. l'addetto ai rientri fa il primo controllo: più zone secondo il livello, con la sua probabilità di vedere i danni;
// 3. il meccanico, se c'è il box, fa i lavori in sede: gomme, revisioni, tagliandi, danni, usura, controlli.
// Il venditore aspetta che tu gli affidi un cliente o un problema al ritiro.
import { S, ui } from '../core/state.js';
import { clamp, eur } from '../core/util.js';
import { ZONE_KEYS, REPAIR_SHARE } from '../data/catalog.js';
import { BOX_COST, BOX_UP } from '../data/staffdata.js';
import { log, money } from './ledger.js';
import { aptOf, hasTrait, lvOf, useTime, workingOf } from './staff.js';
import { insCheck, insCheckInt } from './inspection.js';
import { openDmgs, wearCost } from './fleet.js';
import { SERVICE_COST, TIRE_COST, inWinter, kmToService, revDaysLeft, tireTarget, tiresOk, REVISION_DAYS } from './maintenance.js';
import { optionsFor, assign } from './desk.js';
import { acceptChance, propose, svcBlock, svcPrice } from './services.js';
import { probSolve } from './pickups.js';
import { SVC_KEYS } from '../data/catalog.js';

export const WASH_PROD = 4, WASH_EXT_T = 2, WASH_INT_T = 1;
export const CHECK_ZONES = [2, 3, 4, 5, 6, 6]; // zone esterne controllate per livello; dal 4 anche gli interni
export const SELL_T = 1; // un cliente al venditore: 1 tempo, più 1 per ogni servizio proposto
export const MECH_T = { svc: 4, tires: 2, rev: 3, check: 1 };
export const CHECK_DAYS = 10; // un controllo del meccanico dimezza il rischio di guasto per 10 giorni

// l'auto è in sede: non è fuori a noleggio né in un'officina esterna (può avere un ritiro più tardi oggi)
export const atBase = (c) => !(c.shopUntil > S.day) && !c.bookings.some((b) => b.st !== 'reserved' && b.start <= S.day && S.day < b.end);
const pickupToday = (c) => c.bookings.some((b) => b.st === 'reserved' && b.start === S.day);
const byTime = (l) => [...l].sort((a, b) => b.time - a.time);

// --- lavaggista
function washOne(e, c) {
  const it = S.ins.find((x) => x.car === c.id);
  const intToo = it && it.int && it.int.st === 'none' && e.time >= WASH_EXT_T + WASH_INT_T;
  useTime(e, WASH_EXT_T + (intToo ? WASH_INT_T : 0));
  money(-WASH_PROD, 'wash');
  c.dirty = false;
  const first = e.name.split(' ')[0];
  if (it) {
    // ogni zona torna pulita; un lavaggio frettoloso può lasciarne qualcuna sporca
    const p = hasTrait(e, 'Pignolo') ? 1 : clamp(0.8 + 0.04 * lvOf(e) + (aptOf(e) - 1) * 0.4 - (hasTrait(e, 'Pasticcione') ? 0.15 : 0), 0.5, 1);
    let left = 0;
    for (const k of ZONE_KEYS) if (it.zones[k].dirty) { if (Math.random() < p) it.zones[k].dirty = false; else left++; }
    it.washedBy = first + (left ? ` (${left} zon${left > 1 ? 'e' : 'a'} ancora sporc${left > 1 ? 'he' : 'a'})` : '');
    if (intToo) { it.int.st = 'checked'; it.int.by = first; it.acted = true; }
  }
  return true;
}
function washRound() {
  const washers = workingOf('lavaggio');
  if (!washers.length) return;
  const prio = (c) => (pickupToday(c) ? 0 : S.ins.some((x) => x.car === c.id) ? 1 : 2);
  const dirty = S.fleet.filter((c) => c.dirty && atBase(c)).sort((a, b) => prio(a) - prio(b));
  let n = 0;
  for (const c of dirty) {
    const e = byTime(washers)[0];
    if (!e || e.time < WASH_EXT_T) break;
    if (washOne(e, c)) n++;
  }
  if (n) log(`${washers.map((e) => e.name.split(' ')[0]).join(' e ')} ha${washers.length > 1 ? 'nno' : ''} lavato ${n} aut${n > 1 ? 'o' : 'o'} stamattina (prodotti −${eur(n * WASH_PROD)}).`);
}

// --- addetto ai rientri: primo controllo
function checkRound() {
  const team = workingOf('rientri');
  if (!team.length) return;
  for (const it of S.ins) {
    const e = byTime(team)[0];
    if (!e || e.time < 1) break;
    const n = CHECK_ZONES[lvOf(e)];
    const todo = ZONE_KEYS.filter((k) => it.zones[k].st === 'none').sort((a, b) => +it.zones[a].dirty - +it.zones[b].dirty).slice(0, n);
    for (const k of todo) { if (e.time < 1) break; insCheck(it.id, k, false, e); }
    if (lvOf(e) >= 4 && it.int && it.int.st === 'none' && e.time >= 1) insCheckInt(it.id, e);
    it.checkedBy = e.name.split(' ')[0];
  }
}

// --- meccanico
export const mechTime = (e, base: number) => Math.max(1, Math.round(base * (1.2 - 0.08 * lvOf(e)) / clamp(aptOf(e), 0.7, 1.3)));
export const mechSvcCost = (c) => Math.round(SERVICE_COST[c.cat] * 0.5);
export const mechTireCost = (c) => Math.round(TIRE_COST[c.cat] * 0.4);
export const MECH_REV_COST = 45;
export const mechRepairCost = (c) => Math.round((wearCost(c) * 0.6 + (S.box.ponte ? openDmgs(c).reduce((a, d) => a + d.cost * REPAIR_SHARE * 0.6, 0) : 0)) / 10) * 10;
const repairBase = (c) => (c.cond < 100 ? Math.ceil((100 - c.cond) / 15) : 0) + (S.box.ponte ? openDmgs(c).reduce((a, d) => a + (d.sev === 'grave' ? 4 : 2), 0) : 0);
export function canMechTires(c) {
  if (!atBase(c)) return false;
  if (tireTarget(c) === 'estive') return !inWinter(S.day) && !c.bookings.some((b) => b.end > S.day && !tiresOk({ tires: 'estive' }, Math.max(b.start, S.day), b.end));
  return true;
}
// lavoro possibile in sede: restituisce chi lo fa, il tempo e il costo, oppure null
export function inHouse(kind: string, c) {
  const team = workingOf('meccanico');
  if (!team.length || !atBase(c)) return null;
  let base = 0, cost = 0;
  if (kind === 'svc') { base = MECH_T.svc; cost = mechSvcCost(c); }
  else if (kind === 'tires') { if (!canMechTires(c)) return null; base = MECH_T.tires; cost = mechTireCost(c); }
  else if (kind === 'rev') { if (!S.box.diag) return null; base = MECH_T.rev; cost = MECH_REV_COST; }
  else if (kind === 'repair') { base = repairBase(c); if (!base || (!S.box.ponte && c.cond >= 100)) return null; cost = mechRepairCost(c); }
  else if (kind === 'check') { if (!S.box.diag) return null; base = MECH_T.check; }
  const e = byTime(team).find((x) => x.time >= mechTime(x, base));
  return e ? { e, t: mechTime(e, base), cost } : null;
}
export function mechDo(kind: string, c, quiet = false) {
  const j = inHouse(kind, c);
  if (!j || S.cash < j.cost) return false;
  const { e, t, cost } = j, first = e.name.split(' ')[0];
  useTime(e, t);
  if (hasTrait(e, 'Pasticcione') && kind !== 'check' && Math.random() < 0.1) {
    log(`${first} sbaglia un lavoro su ${c.plate} e dovrà rifarlo: tempo perso.`, 'bad');
    return false;
  }
  if (cost) money(-cost, kind === 'repair' ? 'repair' : 'maint');
  let what = '';
  if (kind === 'svc') { c.svcKm = c.km; what = 'tagliando'; }
  else if (kind === 'tires') { c.tires = tireTarget(c); what = `gomme ${c.tires}`; }
  else if (kind === 'rev') { c.revDue = S.day + REVISION_DAYS; what = 'revisione'; }
  else if (kind === 'repair') {
    const nd = S.box.ponte ? openDmgs(c).length : 0;
    c.cond = Math.max(c.cond, hasTrait(e, 'Pignolo') ? 100 : 96);
    if (S.box.ponte) openDmgs(c).forEach((d) => (d.repaired = S.day));
    what = `riparazione${nd ? ` (${nd} dann${nd > 1 ? 'i' : 'o'})` : ''}`;
  } else if (kind === 'check') { c.chk = S.day; what = 'controllo'; }
  if (!quiet) log(`${first} ha fatto ${what} su ${c.model} ${c.plate} in sede${cost ? `: −${eur(cost)}` : ''}.`, 'out');
  return what;
}
function mechRound() {
  if (!workingOf('meccanico').length) return;
  const done = [];
  const pass = (kind, want) => {
    for (const c of S.fleet) {
      if (!want(c)) continue;
      const j = inHouse(kind, c);
      if (!j || S.cash - j.cost < 300) continue;
      const w = mechDo(kind, c, true);
      if (w) done.push(`${w} ${c.plate}`);
    }
  };
  pass('tires', (c) => c.tires !== (inWinter(S.day + 12) ? 'invernali' : 'estive'));
  pass('rev', (c) => revDaysLeft(c) <= 30);
  pass('svc', (c) => kmToService(c) <= 1000);
  pass('repair', (c) => openDmgs(c).length > 0 && S.box.ponte);
  pass('repair', (c) => c.cond < 75);
  pass('check', (c) => !(c.chk && S.day - c.chk < 7));
  if (done.length) {
    const checks = done.filter((d) => d.startsWith('controllo')).length, rest = done.filter((d) => !d.startsWith('controllo'));
    log(`Officina interna: ${[...rest, ...(checks ? [`${checks} controll${checks > 1 ? 'i' : 'o'}`] : [])].join(', ')}.`, 'out');
  }
}
export const breakdownMul = (c, d = S.day) => (c.chk && d - c.chk <= CHECK_DAYS ? 0.5 : 1);

// Giro della mattina, e lavoro immediato di chi viene assunto durante la giornata.
export function crewMorning() {
  washRound();
  checkRound();
  mechRound();
}
export function crewWork(e) {
  if (!e) return;
  if (e.role === 'lavaggio') washRound();
  else if (e.role === 'rientri') checkRound();
  else if (e.role === 'meccanico') mechRound();
}

// --- venditore
export const sellers = () => workingOf('vendite');
export const bestSeller = (min = SELL_T) => byTime(sellers()).find((e) => e.time >= min) || null;
export function sellMul(e, q?) {
  return 1 + 0.06 * lvOf(e) + (aptOf(e) - 1) * 0.5 + (hasTrait(e, 'Persuasivo') ? 0.12 : 0) + (hasTrait(e, 'Pasticcione') ? -0.1 : 0)
    + (q && q.type === 'turista' && hasTrait(e, 'Poliglotta') ? 0.2 : 0);
}
// Il venditore serve il cliente: sceglie l'auto (stessa categoria, pulita, la migliore) e propone fino a due servizi.
export function delegateReq(qid) {
  const q = S.reqs.find((r) => r.id === qid), e = bestSeller();
  if (!q || !e) return;
  const opts = optionsFor(q).sort((a, b) => (a.cat === q.cat ? 0 : 1) - (b.cat === q.cat ? 0 : 1) || +a.dirty - +b.dirty || b.cond - a.cond);
  const c = opts[0];
  if (!c) return;
  ui.sel[q.id] = c.id;
  useTime(e, SELL_T);
  const mul = sellMul(e, q);
  const offer = SVC_KEYS.filter((s) => !q.ask.includes(s) && !(s in q.tried) && !svcBlock(q, c, s))
    .map((s) => ({ s, p: acceptChance(q, c, s, svcPrice(q, c, s), mul) }))
    .filter((x) => x.p >= 0.3).sort((a, b) => b.p * svcPrice(q, c, b.s) - a.p * svcPrice(q, c, a.s));
  const picked = [];
  for (const x of offer) { if (picked.length >= 2 || e.time < 1) break; useTime(e, 1); picked.push(x.s); }
  if (picked.length) { ui.checks[q.id] = picked; propose(q.id, mul, e); }
  assign(q.id, e);
}
export function delegateProb(id) {
  const e = bestSeller();
  if (!e) return;
  useTime(e, SELL_T);
  probSolve(id, sellMul(e), e);
}

// --- box officina
export function buyBox() {
  if (S.box.own || S.cash < BOX_COST) return;
  money(-BOX_COST, 'buy');
  S.box.own = true;
  S.box.spent = (S.box.spent || 0) + BOX_COST;
  log(`Box officina pronto: −${eur(BOX_COST)}. Ora puoi far lavorare un meccanico in sede.`, 'out');
}
export function buyBoxUp(k: string) {
  const u = BOX_UP[k];
  if (!u || !S.box.own || S.box[k] || S.cash < u.cost) return;
  money(-u.cost, 'buy');
  S.box[k] = true;
  S.box.spent = (S.box.spent || 0) + u.cost;
  log(`Box officina: ${u.nome.toLowerCase()} installato, −${eur(u.cost)}.`, 'out');
}

// il box conta nel patrimonio per metà di quanto è costato
export const boxValue = () => Math.round(((S.box && S.box.spent) || 0) * 0.5);
