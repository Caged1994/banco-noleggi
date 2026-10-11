// Concorrenza: AutoSprint, catena low cost davanti alla stazione (versione «morbida»).
//
// - Ha un listino per categoria che segue le stagioni e qualche promozione in bassa stagione.
// - Una parte dei clienti confronta i prezzi e va da lei se il tuo listino è più caro;
//   se sei più economico, qualche suo cliente viene da te.
// - Ogni lunedì reagisce con calma ai tuoi prezzi, senza mai scendere sotto l'85% del suo prezzo base.
// - Ogni tanto è al completo o ha un guaio: per qualche giorno i suoi clienti arrivano da te.
import { S } from '../core/state.js';
import { dateOf, dshort } from '../core/calendar.js';
import { clamp, eur, pick, RI } from '../core/util.js';
import { CATS, CAT_KEYS } from '../data/catalog.js';
import { log } from './ledger.js';
import { evMul } from './seasons.js';

export const RIVAL_NAME = 'AutoSprint';
export const RIVAL_SLOGAN = '«Parti prima, paghi meno.»';
export const RIVAL_BASE = 0.95; // prezzi base: 95% della media di mercato
export const RIVAL_ADJ_MIN = 0.85, RIVAL_ADJ_MAX = 1.05; // low cost: non sale mai molto
// prezzi del rivale nel corso dell'anno: alza in estate, scende in inverno
export const RIVAL_MONTH = [0.95, 0.95, 0.98, 1, 1.03, 1.08, 1.15, 1.18, 1.05, 0.98, 0.96, 1.02];
// quanto pesa il prezzo per ogni tipo di cliente: clienti persi per ogni +10% rispetto al rivale
export const PRICE_SENS = { business: 0.1, turista: 0.2, famiglia: 0.2, locale: 0.25 };

export function newRival() {
  const adj = {};
  for (const k of CAT_KEYS) adj[k] = 1;
  return { adj, promo: null, full: null, trouble: null };
}

const active = (x, d) => x && x.start <= d && d < x.end;

// Prezzo del rivale per una categoria in un giorno.
export function rivalPrice(cat: string, d = S.day): number {
  const R = S.rival;
  let p = CATS[cat].base * RIVAL_BASE * RIVAL_MONTH[dateOf(d).m] * R.adj[cat];
  if (active(R.promo, d) && (R.promo.cat === 'all' || R.promo.cat === cat)) p *= 1 - R.promo.disc;
  return Math.round(p);
}
export const priceRatio = (cat: string) => S.prices[cat] / rivalPrice(cat);
export const rivalBusy = (d = S.day) => active(S.rival.full, d) || active(S.rival.trouble, d);

// Probabilità che un cliente vada dal rivale invece che da te.
export function divertChance(type: string, cat: string, tier: string): number {
  if (tier === 'fedele' || rivalBusy()) return 0;
  const over = priceRatio(cat) - 1;
  if (over <= 0) return 0;
  const repMul = 1.25 - S.rep / 200; // reputazione 0: ×1,25 · 100: ×0,75
  const tierMul = tier === 'abituale' ? 0.5 : 1;
  return clamp(over * 10 * PRICE_SENS[type] * repMul * tierMul, 0, 0.85);
}
// Probabilità che un cliente del rivale venga da te perché sei più economico.
export function winChance(cat: string): number {
  return clamp((0.95 - priceRatio(cat)) * 0.8, 0, 0.25);
}

// Ogni lunedì: reazione ai tuoi prezzi e, in bassa stagione, qualche promozione.
export function rivalWeekly() {
  const R = S.rival;
  const moves = [];
  for (const k of CAT_KEYS) {
    const target = CATS[k].base * RIVAL_BASE * RIVAL_MONTH[dateOf(S.day).m];
    const ratio = S.prices[k] / target;
    const before = R.adj[k];
    if (ratio < R.adj[k] * 0.85) R.adj[k] = Math.max(RIVAL_ADJ_MIN, R.adj[k] - 0.05);
    else if (ratio > R.adj[k] * 1.15) R.adj[k] = Math.min(RIVAL_ADJ_MAX, R.adj[k] + 0.04);
    else R.adj[k] += clamp(1 - R.adj[k], -0.03, 0.03);
    R.adj[k] = Math.round(R.adj[k] * 100) / 100;
    if (Math.abs(R.adj[k] - before) >= 0.04) moves.push(`${CATS[k].nome.toLowerCase()} ${R.adj[k] < before ? 'giù' : 'su'} a ${eur(rivalPrice(k))}`);
  }
  if (moves.length) log(`${RIVAL_NAME} aggiorna i prezzi: ${moves.join(', ')}.`, 'hdr');

  const m = dateOf(S.day).m, low = [0, 1, 2, 9, 10].includes(m);
  if (low && !active(R.promo, S.day + 1) && Math.random() < 0.35) {
    const cat = Math.random() < 0.25 ? 'all' : pick(['utilitaria', 'berlina', 'suv', 'furgone']);
    const disc = RI(15, 25) / 100, start = S.day + RI(1, 3), len = RI(7, 10);
    R.promo = { cat, disc, start, end: start + len };
    log(`${RIVAL_NAME} lancia una promozione dal ${dshort(start)} al ${dshort(start + len - 1)}: ${cat === 'all' ? 'tutte le auto' : CATS[cat].nome} a −${Math.round(disc * 100)}%.`, 'hdr');
  }
}

// Ogni giorno: al completo nei giorni di grande domanda, ogni tanto un guaio.
export function rivalDaily() {
  const R = S.rival, d = S.day;
  if (!active(R.full, d) && !active(R.trouble, d)) {
    const dem = evMul(d).dem;
    if (dem >= 1.5 && Math.random() < 0.08) {
      R.full = { start: d, end: d + RI(1, 3) };
      log(`${RIVAL_NAME} è al completo fino al ${dshort(R.full.end - 1)}: i suoi clienti cercano da te.`, 'hdr');
    } else if (Math.random() < 0.02) {
      const kind = pick([
        'una recensione negativa diventata virale',
        'mezza flotta ferma per un richiamo del costruttore',
        'il sistema di prenotazione in tilt',
      ]);
      R.trouble = { start: d, end: d + RI(3, 5), kind };
      log(`Guai da ${RIVAL_NAME}: ${kind}. Fino al ${dshort(R.trouble.end - 1)} arrivano più clienti da te.`, 'hdr');
    }
  }
}

// Stato del rivale da mostrare: promozione, al completo, guaio.
export function rivalStatus(d = S.day) {
  const R = S.rival, out = [];
  if (active(R.promo, d)) out.push({ live: true, nome: `${RIVAL_NAME}: promo −${Math.round(R.promo.disc * 100)}%`, txt: `${R.promo.cat === 'all' ? 'tutte le auto' : CATS[R.promo.cat].nome} fino al ${dshort(R.promo.end - 1)}` });
  else if (R.promo && R.promo.start > d) out.push({ live: false, nome: `${RIVAL_NAME}: promo in arrivo`, txt: `dal ${dshort(R.promo.start)}` });
  if (active(R.full, d)) out.push({ live: true, good: true, nome: `${RIVAL_NAME} al completo`, txt: `fino al ${dshort(R.full.end - 1)}` });
  if (active(R.trouble, d)) out.push({ live: true, good: true, nome: `Guai da ${RIVAL_NAME}`, txt: `fino al ${dshort(R.trouble.end - 1)}` });
  return out;
}
