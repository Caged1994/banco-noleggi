// Clienti abituali: registro dei clienti già serviti, fedeltà e ritorni.
//
// Ogni cliente servito entra nel registro. La fedeltà va da −100 a +100 e decide il livello:
//   nuovo · abituale (2+ visite, fedeltà ≥ 30) · fedele (3+ visite, fedeltà ≥ 60) · perso (fedeltà ≤ −40)
// Un cliente perso non torna più e lascia una recensione negativa.
import { S } from '../core/state.js';
import { clamp, wpick } from '../core/util.js';
import { log, rep } from './ledger.js';

export const LOYAL_MIN = -100, LOYAL_MAX = 100, LOST_AT = -40;
export const TIERS = {
  nuovo: { nome: 'Nuovo', budget: 1, accept: 1, pre: 0.45 },
  abituale: { nome: 'Abituale', budget: 1.1, accept: 1.1, pre: 0.55 },
  fedele: { nome: 'Fedele', budget: 1.15, accept: 1.2, pre: 0.7 },
  perso: { nome: 'Perso', budget: 1, accept: 1, pre: 0 },
};
export const REGISTRY_MAX = 150;
export const RETURN_GAP = 7; // giorni minimi tra una visita e il ritorno

export function tierOf(cl): string {
  if (!cl) return 'nuovo';
  if (cl.lost) return 'perso';
  if (cl.visits >= 3 && cl.loyalty >= 60) return 'fedele';
  if (cl.visits >= 2 && cl.loyalty >= 30) return 'abituale';
  return 'nuovo';
}
export const clientById = (cid) => (cid ? S.clients.find((c) => c.id === cid) : null);
export const tierOfReq = (q) => TIERS[tierOf(clientById(q && q.cid))];

// Registra il cliente al primo noleggio; restituisce la sua scheda.
export function registerClient(q, cat) {
  let cl = clientById(q.cid);
  if (!cl) {
    cl = { id: S.nid++, name: q.name, type: q.type, cat, visits: 0, spent: 0, loyalty: 0, lost: false, last: S.day, first: S.day, log: [] };
    S.clients.push(cl);
    q.cid = cl.id;
    trimRegistry();
  }
  return cl;
}

// Varia la fedeltà di un cliente noto e annota il motivo.
export function loyal(cid, delta: number, why: string) {
  const cl = clientById(cid);
  if (!cl || cl.lost || !delta) return;
  const before = tierOf(cl);
  cl.loyalty = clamp(cl.loyalty + delta, LOYAL_MIN, LOYAL_MAX);
  cl.log.unshift({ d: S.day, delta, why });
  cl.log.length = Math.min(cl.log.length, 12);
  if (cl.loyalty <= LOST_AT) {
    cl.lost = true;
    rep(-2);
    S.wk.clLost = (S.wk.clLost || 0) + 1;
    log(`${cl.name} non tornerà più e lascia una recensione negativa (${why}). Reputazione −2`, 'bad');
    return;
  }
  const after = tierOf(cl);
  if (after !== before && (after === 'abituale' || after === 'fedele')) {
    log(`${cl.name} è diventato cliente ${TIERS[after].nome.toLowerCase()}.`, 'rep');
  }
}

// Visita completata: conta la visita e la spesa.
export function recordVisit(cl, spent: number, cat: string) {
  cl.visits++;
  cl.spent += spent;
  cl.last = S.day;
  cl.cat = cat;
}

// Il registro tiene al massimo REGISTRY_MAX clienti: si scartano i meno affezionati e più vecchi.
function trimRegistry() {
  if (S.clients.length <= REGISTRY_MAX) return;
  const keep = [...S.clients].sort((a, b) => (b.loyalty + b.visits * 10 + b.last / 30) - (a.loyalty + a.visits * 10 + a.last / 30));
  S.clients = keep.slice(0, REGISTRY_MAX);
}

// Clienti che possono tornare oggi: non persi, non già al banco o con un noleggio in corso.
function busyClientIds() {
  const ids = new Set();
  for (const q of S.reqs) if (q.cid) ids.add(q.cid);
  for (const c of S.fleet) for (const b of c.bookings) if (b.cid && b.end > S.day) ids.add(b.cid);
  for (const k of S.desk) if (k.b.cid) ids.add(k.b.cid);
  return ids;
}
export function returningCandidates() {
  const busy = busyClientIds();
  return S.clients.filter((c) => !c.lost && c.loyalty > -20 && S.day - c.last >= RETURN_GAP && !busy.has(c.id));
}
// Probabilità che un cliente del giorno sia un cliente già visto.
export function returnChance(n: number) {
  return clamp(0.04 + 0.025 * n, 0, 0.4);
}
// Sceglie chi torna, preferendo i più affezionati.
export function pickReturning(cands) {
  const w = Object.fromEntries(cands.map((c, i) => [i, Math.max(1, c.loyalty + 50) * (1 + c.visits * 0.3)]));
  return cands.at(+wpick(w));
}

export const RETURN_NOTES = {
  nuovo: ['È già stato da noi una volta, si ricorda di te', 'Torna dopo il primo noleggio'],
  abituale: ['«Il solito, grazie»', 'Cliente abituale, saluta tutti per nome', 'Torna come ogni volta che passa in città'],
  fedele: ['Cliente fedele: «Da voi mi trovo sempre bene»', 'Ha consigliato l\'agenzia a mezzo ufficio', 'Fedelissimo, chiede di te personalmente'],
};
