// Manutenzione programmata: tagliando, gomme invernali/estive, revisione.
//
// - Tagliando ogni 15.000 km: se scaduto, cresce il rischio di guasto a ogni giorno di noleggio.
// - Gomme invernali obbligatorie dal 15 novembre al 15 aprile: con le estive l'auto non si noleggia
//   per giorni in quel periodo. Le invernali d'estate consumano l'auto del 30% in più.
// - Revisione ogni 2 anni (4 per le auto nuove): se scaduta l'auto non si noleggia.
// Tagliando, revisione e officina si possono fare nella stessa giornata: l'auto si ferma un solo giorno.
import { S } from '../core/state.js';
import { dateOf, dshort, isWorkday, wdd, workEnd } from '../core/calendar.js';
import { clamp, eur, RI } from '../core/util.js';
import { CATS } from '../data/catalog.js';
import { log, money } from './ledger.js';
import { freeNow, freeRange } from './fleet.js';

export const SERVICE_KM = 15000;
export const SERVICE_SOON_KM = 1500;
export const SERVICE_COST = { utilitaria: 180, berlina: 250, suv: 320, furgone: 300, lusso: 550 };
export const TIRE_COST = { utilitaria: 60, berlina: 80, suv: 110, furgone: 100, lusso: 160 };
export const REVISION_COST = 80;
export const REVISION_DAYS = 730, REVISION_NEW_DAYS = 1460, REVISION_SOON = 30;
export const WINTER_FROM = 319, WINTER_TO = 105; // 15 novembre – 15 aprile (giorni dell'anno)
export const WINTER_TIRE_WEAR = 1.3;

// --- stato dei controlli
export const kmToService = (c) => SERVICE_KM - (c.km - c.svcKm);
export const serviceOverdue = (c) => Math.max(0, -kmToService(c));
// rischio di guasto aggiuntivo per giorno di noleggio: +0,4% ogni 1.000 km di ritardo, fino al 6%
export const serviceRisk = (c) => clamp(serviceOverdue(c) / 1000 * 0.004, 0, 0.06);
export const revDaysLeft = (c) => c.revDue - S.day;
export const inWinter = (d) => { const doy = dateOf(d).doy; return doy >= WINTER_FROM || doy <= WINTER_TO; };
export function tiresOk(c, from, to) {
  if (c.tires === 'invernali') return true;
  for (let d = from; d < to; d++) if (inWinter(d)) return false;
  return true;
}
export const revisionOk = (c, to) => c.revDue >= to;
// l'auto può essere noleggiata nei giorni from..to-1?
export const maintOk = (c, from, to) => tiresOk(c, from, to) && revisionOk(c, to);
export const wrongSeasonTires = (c, d = S.day) => (c.tires === 'estive') === inWinter(d);

// Avvisi di manutenzione per la scheda dell'auto e il contatore della Flotta.
export function maintIssues(c) {
  const out = [];
  const k = kmToService(c);
  if (k < 0) out.push({ lvl: 'bad', txt: `Tagliando scaduto da ${(-k).toLocaleString('it-IT')} km` });
  else if (k <= SERVICE_SOON_KM) out.push({ lvl: 'warn', txt: `Tagliando tra ${k.toLocaleString('it-IT')} km` });
  const r = revDaysLeft(c);
  if (r < 0) out.push({ lvl: 'bad', txt: 'Revisione scaduta' });
  else if (r <= REVISION_SOON) out.push({ lvl: 'warn', txt: `Revisione entro il ${dshort(c.revDue)}` });
  if (c.tires === 'estive' && inWinter(S.day)) out.push({ lvl: 'bad', txt: 'Gomme estive: non noleggiabile fino al cambio' });
  else if (c.tires === 'estive' && inWinter(S.day + 14)) out.push({ lvl: 'warn', txt: 'Servono le invernali dal 15 novembre' });
  else if (c.tires === 'invernali' && !inWinter(S.day)) out.push({ lvl: 'warn', txt: 'Invernali d\'estate: usura +30%' });
  return out;
}

// --- lavori: si possono sommare nella stessa giornata
// l'auto è libera oggi, oppure è già entrata in officina oggi per un altro lavoro
export const canWork = (c) => (freeNow(c) && freeRange(c, S.day, workEnd(S.day, 1))) || (c.shopStart === S.day && c.shopUntil > S.day);
function enterShop(c, what) {
  if (c.shopStart === S.day && c.shopUntil > S.day) c.shopWhat = c.shopWhat.includes(what) ? c.shopWhat : `${c.shopWhat} + ${what}`;
  else { c.shopStart = S.day; c.shopWhat = what; }
  c.shopUntil = Math.max(c.shopUntil, workEnd(S.day, 1)); // nel weekend l'officina è chiusa: si lavora il lunedì
  c.dirty = false;
}
export const serviceCost = (c) => SERVICE_COST[c.cat];
export function doService(id) {
  const c = S.fleet.find((x) => x.id === id);
  if (!c || !canWork(c) || S.cash < serviceCost(c)) return;
  money(-serviceCost(c), 'maint');
  c.svcKm = c.km;
  enterShop(c, 'Tagliando');
  log(`Tagliando a ${c.model} ${c.plate}: −${eur(serviceCost(c))}, pronta ${wdd(c.shopUntil)}.`, 'out');
}
export function doRevision(id) {
  const c = S.fleet.find((x) => x.id === id);
  if (!c || !canWork(c) || S.cash < REVISION_COST) return;
  money(-REVISION_COST, 'maint');
  c.revDue = S.day + REVISION_DAYS;
  enterShop(c, 'Revisione');
  log(`Revisione di ${c.model} ${c.plate} superata: −${eur(REVISION_COST)}, prossima entro il ${dshort(c.revDue)}.`, 'out');
}
// Cambio gomme: in giornata, auto libera. Le estive non si montano se l'auto ha noleggi nel periodo invernale.
export const tireTarget = (c) => (c.tires === 'invernali' ? 'estive' : 'invernali');
// il gommista esterno è chiuso il sabato e la domenica
export function canChangeTires(c) {
  if (!isWorkday(S.day)) return false;
  if (!freeNow(c) && !(c.shopStart === S.day && c.shopUntil > S.day)) return false;
  if (tireTarget(c) === 'estive') return !c.bookings.some((b) => b.end > S.day && !tiresOk({ tires: 'estive' }, Math.max(b.start, S.day), b.end)) && !inWinter(S.day);
  return true;
}
export function changeTires(id, quiet = false) {
  const c = S.fleet.find((x) => x.id === id);
  if (!c || !canChangeTires(c) || S.cash < TIRE_COST[c.cat]) return false;
  money(-TIRE_COST[c.cat], 'maint');
  c.tires = tireTarget(c);
  if (!quiet) log(`Gomme ${c.tires} montate su ${c.model} ${c.plate}: −${eur(TIRE_COST[c.cat])}.`, 'out');
  return true;
}
// Porta tutte le auto libere alle gomme della stagione.
export function changeAllTires() {
  const want = inWinter(S.day) ? 'invernali' : 'estive';
  let n = 0, cost = 0;
  for (const c of S.fleet) if (c.tires !== want && canChangeTires(c) && S.cash >= TIRE_COST[c.cat]) { cost += TIRE_COST[c.cat]; if (changeTires(c.id, true)) n++; }
  if (n) log(`Gomme ${want} montate su ${n} aut${n > 1 ? 'o' : 'o'}: −${eur(cost)}.`, 'out');
}
export const tiresToChange = () => {
  const want = inWinter(S.day) ? 'invernali' : 'estive';
  return S.fleet.filter((c) => c.tires !== want && canChangeTires(c));
};

// Inizializza i dati di manutenzione di un'auto. kind: 'new' | 'used' | 'bad' (auto di Ciro)
export function initMaint(c, kind = 'used') {
  if (kind === 'new') { c.svcKm = c.km; c.revDue = S.day + REVISION_NEW_DAYS; }
  else if (kind === 'bad') { c.svcKm = c.km - RI(14000, 24000); c.revDue = S.day + RI(5, 60); }
  else { c.svcKm = c.km - RI(1000, 13000); c.revDue = S.day + RI(40, 700); }
  c.tires = inWinter(S.day) ? 'invernali' : 'estive';
  c.shopStart = c.shopStart ?? 0;
  return c;
}

// Promemoria giornalieri: cambio stagione delle gomme e revisioni in scadenza.
export function maintReminders() {
  const doy = dateOf(S.day).doy;
  if (doy === WINTER_FROM - 10) log('Dal 15 novembre obbligo di gomme invernali: le auto con le estive non potranno essere noleggiate.', 'hdr');
  if (doy === WINTER_TO + 1) log('Da oggi puoi montare le gomme estive: le invernali d\'estate consumano l\'auto il 30% in più.', 'hdr');
  for (const c of S.fleet) if (revDaysLeft(c) === REVISION_SOON) log(`Revisione di ${c.model} ${c.plate} in scadenza il ${dshort(c.revDue)}.`, 'rep');
}
