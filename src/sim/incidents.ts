// Imprevisti durante il noleggio: eventi reali che spesso tengono ferma l'auto.
//
// Gravi (durante il noleggio, rarissimi): furto, incendio, incidente grave. L'auto è persa.
//   L'assicurazione della flotta rimborsa il valore dell'auto meno la franchigia; il cliente paga la
//   franchigia intera, a meno che non abbia l'assicurazione totale (allora resta a tuo carico).
// Al rientro (al massimo uno per noleggio):
//   vetro rotto (scasso)       → il cliente paga il vetro, salvo assicurazione totale; 2 giorni lavorativi
//   incidente                  → riparazione 3–5 giorni lavorativi; il cliente paga fino alla franchigia, salvo assicurazione
//   errato rifornimento        → 2 giorni lavorativi; mai coperto dall'assicurazione
//   altro guasto del cliente   → 2–3 giorni lavorativi; coperto dall'assicurazione, altrimenti fino alla franchigia
//   gomma bucata               → il cliente paga la gomma (mai coperta); senza una gomma di scorta uguale
//                                l'auto resta ferma fino al giorno lavorativo dopo
import { S } from '../core/state.js';
import { dshort, wdd, workEnd } from '../core/calendar.js';
import { R, RI, eur, pick } from '../core/util.js';
import { CATS, DMG_CAT, FRANCHIGIA } from '../data/catalog.js';
import { log, money, rep } from './ledger.js';
import { loyal } from './regulars.js';
import { cancelBooking, eligible, freeRange, value } from './fleet.js';
import { maintOk } from './maintenance.js';

// probabilità per giorno di noleggio
export const INC = {
  furto: { nome: 'Furto', p: 1 / 10000 },
  incendio: { nome: 'Incendio', p: 1 / 15000 },
  grave: { nome: 'Incidente grave', p: 1 / 8000 },
  vetro: { nome: 'Vetro rotto', p: 1 / 900 },
  incidente: { nome: 'Incidente', p: 1 / 1000 },
  rifornimento: { nome: 'Errato rifornimento', p: 1 / 2500 },
  guasto: { nome: 'Guasto causato dal cliente', p: 1 / 1700 },
  foratura: { nome: 'Gomma bucata', p: 1 / 150 },
};
export const GLASS_COST = { utilitaria: 220, berlina: 300, suv: 380, furgone: 340, lusso: 700 };
export const TIRE_PRICE = { utilitaria: 70, berlina: 100, suv: 140, furgone: 120, lusso: 220 };
export const TIRE_FIT = 25; // montaggio, pagato dal cliente insieme alla gomma
export const OTHER_FAULTS = ['frizione bruciata', 'coppa dell\'olio sfondata su uno sterrato', 'chiave persa e centralina da riprogrammare', 'sospensione piegata contro un marciapiede'];

const recordInc = (txt: string) => {
  S.wk.incs = S.wk.incs || [];
  S.wk.incs.push(txt);
  S.todayInc = S.todayInc || [];
  S.todayInc.push(txt);
};

// Prenotazione di un'auto che non è più disponibile: si sposta su un'altra auto libera, altrimenti si annulla.
export function rehome(c, b, why: string) {
  const alts = S.fleet.filter((x) => x !== c && eligible({ cat: b.cat }, x) && freeRange(x, b.start, b.end) && maintOk(x, b.start, b.end))
    .sort((x, y) => (x.cat === b.cat ? 0 : 1) - (y.cat === b.cat ? 0 : 1) || y.cond - x.cond);
  if (alts.length) {
    c.bookings = c.bookings.filter((x) => x !== b);
    alts[0].bookings.push(b);
    log(`Prenotazione di ${b.cust} spostata su ${alts[0].model} ${alts[0].plate} (${why}).`, 'info');
  } else cancelBooking(c, b, why);
}
function rehomeFrom(c, from: number, until: number, why: string) {
  for (const b of [...c.bookings]) if (b.st === 'reserved' && b.start < until && b.end > from) rehome(c, b, why);
}

// --- imprevisti gravi: durante il noleggio, l'auto è persa
export function rollTotalLoss(c, b, nd: number) {
  const r = Math.random();
  const kind = r < INC.furto.p ? 'furto' : r < INC.furto.p + INC.incendio.p ? 'incendio' : r < INC.furto.p + INC.incendio.p + INC.grave.p ? 'grave' : null;
  if (!kind) return false;
  totalLoss(c, b, kind, nd);
  return true;
}
export function totalLoss(c, b, kind: string, nd: number) {
  const F = FRANCHIGIA[c.cat], kasko = b.svc.includes('kasko');
  const refund = Math.max(0, b.end - nd) * (b.rate + b.svcRate);
  const val = Math.round(value(c)), payout = Math.max(0, val - F);
  if (refund) money(-refund, 'refund');
  money(payout, 'insur');
  if (!kasko) { money(F, 'damage'); loyal(b.cid, -20, 'franchigia addebitata'); rep(-1); }
  else loyal(b.cid, 5, 'coperto dall\'assicurazione totale');
  c.bookings = c.bookings.filter((x) => x !== b);
  S.fleet = S.fleet.filter((x) => x !== c);
  for (const x of [...c.bookings]) rehome(c, x, `${c.plate} non è più in flotta`);
  const what = kind === 'furto' ? `è stata rubata mentre era a noleggio a ${b.cust}`
    : kind === 'incendio' ? `è andata a fuoco mentre era a noleggio a ${b.cust} (nessun ferito)`
    : `è da rottamare dopo un incidente grave di ${b.cust} (il cliente sta bene)`;
  log(`${INC[kind].nome}! ${c.model} ${c.plate} ${what}. L'assicurazione della flotta rimborsa ${eur(payout)} (valore ${eur(val)} meno franchigia ${eur(F)}); ${kasko ? `${b.cust} aveva l'assicurazione totale: la franchigia resta a tuo carico` : `${b.cust} paga la franchigia di ${eur(F)}`}${refund ? `; giorni non goduti rimborsati −${eur(refund)}` : ''}.`, 'bad');
  recordInc(`${INC[kind].nome}: ${c.model} ${c.plate} persa${kasko ? ', franchigia a tuo carico' : `, franchigia ${eur(F)} pagata dal cliente`}`);
}

// --- imprevisti al rientro
const chanceOver = (p: number, days: number) => 1 - Math.pow(1 - p, days);
function shop(c, nd: number, days: number, what: string) {
  c.shopStart = nd;
  c.shopUntil = Math.max(c.shopUntil || 0, workEnd(nd, days));
  c.shopWhat = what;
  rehomeFrom(c, nd, c.shopUntil, `${c.plate} ferma: ${what.toLowerCase()}`);
}
export function spareKey(c) { return `${c.cat}:${c.tires}`; }
export const tireOne = (t: string) => (t === 'estive' ? 'estiva' : 'invernale');
export function rollReturnIncident(c, b, nd: number) {
  const order = ['incidente', 'rifornimento', 'guasto', 'vetro', 'foratura'];
  const kind = order.find((k) => Math.random() < chanceOver(INC[k].p, b.days));
  if (!kind) return null;
  const F = FRANCHIGIA[c.cat], kasko = b.svc.includes('kasko');
  // costo per te (officina), quanto paga il cliente, giorni lavorativi di fermo
  let cost = 0, charge = 0, days = 0, txt = '';
  if (kind === 'vetro') {
    cost = GLASS_COST[c.cat]; charge = kasko ? 0 : cost; days = 2;
    txt = `qualcuno ha spaccato un vetro di ${c.model} ${c.plate} per rubare dall'abitacolo di ${b.cust}`;
  } else if (kind === 'incidente') {
    cost = Math.round(R(700, 1800) * DMG_CAT[c.cat] / 10) * 10; charge = kasko ? 0 : Math.min(cost, F); days = RI(3, 5);
    c.cond = Math.max(5, c.cond - 10);
    txt = `${b.cust} ha avuto un incidente con ${c.model} ${c.plate}: serve la carrozzeria`;
  } else if (kind === 'rifornimento') {
    cost = Math.round(R(450, 800) * DMG_CAT[c.cat] / 10) * 10; charge = cost; days = 2;
    txt = `${b.cust} ha sbagliato carburante su ${c.model} ${c.plate}: serbatoio e iniettori da pulire`;
  } else if (kind === 'guasto') {
    cost = Math.round(R(400, 1100) * DMG_CAT[c.cat] / 10) * 10; charge = kasko ? 0 : Math.min(cost, F); days = RI(2, 3);
    txt = `${c.model} ${c.plate} torna da ${b.cust} con ${pick(OTHER_FAULTS)}`;
  } else {
    // gomma bucata: il cliente paga sempre gomma e montaggio
    cost = 0; charge = TIRE_PRICE[c.cat] + TIRE_FIT;
    const k = spareKey(c);
    S.spare = S.spare || {};
    if (S.spare[k] > 0) {
      S.spare[k]--;
      money(charge, 'damage');
      log(`${b.cust} riconsegna ${c.plate} con una gomma bucata: montata una gomma ${tireOne(c.tires)} di scorta, al cliente ${eur(charge)}.`, 'in');
      recordInc(`Gomma bucata su ${c.plate}: usata una gomma di scorta`);
      return kind;
    }
    money(-TIRE_PRICE[c.cat], 'maint');
    money(charge, 'damage');
    shop(c, nd, 1, 'Gomma bucata');
    log(`${b.cust} riconsegna ${c.plate} con una gomma bucata e non hai una gomma ${tireOne(c.tires)} di scorta per ${CATS[c.cat].nome.toLowerCase()}: gomma ordinata (−${eur(TIRE_PRICE[c.cat])}, al cliente ${eur(charge)}), auto pronta ${wdd(c.shopUntil)}.`, 'bad');
    recordInc(`Gomma bucata su ${c.plate}: ferma fino al ${dshort(c.shopUntil)}`);
    return kind;
  }
  money(-cost, 'repair');
  if (charge) { money(charge, 'damage'); loyal(b.cid, charge >= 500 ? -15 : -8, `${INC[kind].nome.toLowerCase()} addebitato`); }
  else if (kasko) loyal(b.cid, 5, 'coperto dall\'assicurazione totale');
  shop(c, nd, days, INC[kind].nome);
  const who = kind === 'rifornimento' ? `mai coperto dall'assicurazione: ${b.cust} paga ${eur(charge)}`
    : kasko ? `coperto dall'assicurazione totale di ${b.cust}` : `${b.cust} paga ${eur(charge)}${charge < cost ? ` (la franchigia)` : ''}`;
  log(`${INC[kind].nome}: ${txt}. Officina −${eur(cost)}, ${who}. Pronta ${wdd(c.shopUntil)}.`, 'bad');
  recordInc(`${INC[kind].nome} su ${c.plate}: −${eur(cost)}${charge ? `, +${eur(charge)} dal cliente` : ''}, ferma fino al ${dshort(c.shopUntil)}`);
  return kind;
}

// Gomme di scorta: una per categoria e tipo (estive / invernali).
export function buySpare(cat: string, type: string) {
  const p = TIRE_PRICE[cat];
  if (!CATS[cat] || S.cash < p) return;
  S.spare = S.spare || {};
  const k = `${cat}:${type}`;
  S.spare[k] = (S.spare[k] || 0) + 1;
  money(-p, 'buy');
  log(`Comprata una gomma ${tireOne(type)} di scorta per ${CATS[cat].nome.toLowerCase()}: −${eur(p)}.`, 'out');
}
