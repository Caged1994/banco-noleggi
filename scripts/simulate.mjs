// Simulazione automatica: un "giocatore bot" gioca una o più partite senza interfaccia.
// Serve a controllare che le regole non si rompano e a vedere l'equilibrio economico.
//
// Uso: node scripts/simulate.mjs [giorni=365] [partite=3]
// Richiede prima `node scripts/build.mjs` (usa i moduli compilati in build/js).
// Esce con errore se trova un'incoerenza (auto prenotata due volte, cassa non numerica, ecc.).

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = join(root, 'build', 'js');
if (!existsSync(join(js, 'main.js'))) {
  console.error('Esegui prima: node scripts/build.mjs');
  process.exit(1);
}

// Pagina finta: la simulazione non disegna nulla.
const el = () => ({ innerHTML: '', textContent: '', hidden: true, disabled: false, value: '', classList: { toggle() {} } });
globalThis.document = { getElementById: el, querySelectorAll: () => [], addEventListener() {} };
globalThis.window = { scrollTo() {} };
globalThis.localStorage = { getItem: () => null, setItem() {} };

const mod = (p) => import(pathToFileURL(join(js, p)).href);
const st = await mod('core/state.js');
const { newGame } = await mod('sim/game.js');
const { nextDay } = await mod('sim/day.js');
const { optionsFor, assign } = await mod('sim/desk.js');
const { propose } = await mod('sim/services.js');
const { insCheck, insCheckInt, insClose } = await mod('sim/inspection.js');
const { swapOptions, overSwap, overColleague, probOptions, probSolve, probSendAway } = await mod('sim/pickups.js');
const { clean, repair, repairCost, freeNow, visiblyDamaged } = await mod('sim/fleet.js');
const { buyUsed } = await mod('sim/market.js');
const { debt, fleetValue } = await mod('sim/bank.js');
const { netWorth } = await mod('sim/game.js');
const { dateOf, MSHORT } = await mod('core/calendar.js');

const days = Number(process.argv[2] ?? 365);
const games = Number(process.argv[3] ?? 3);

function check(S) {
  if (!Number.isFinite(S.cash)) throw new Error(`cassa non valida il giorno ${S.day}: ${S.cash}`);
  for (const c of S.fleet) {
    for (let d = S.day; d < S.day + 10; d++) {
      const active = c.bookings.filter((b) => b.st !== 'reserved' && b.start <= d && d < b.end).length;
      if (active + (c.shopUntil > d ? 1 : 0) > 1) throw new Error(`${c.plate} occupata due volte il giorno ${d}`);
    }
  }
}

for (let g = 1; g <= games; g++) {
  newGame();
  let S = st.S;
  const perMonth = {};
  let bought = 0;
  for (let i = 0; i < days && !S.lost; i++) {
    const m = dateOf(S.day).m;
    perMonth[m] ??= { req: 0, days: 0 };
    perMonth[m].req += S.reqs.length;
    perMonth[m].days++;

    for (const k of [...S.desk]) {
      if (k.kind === 'over') (swapOptions(k.b).length ? overSwap : overColleague)(k.id);
      else if (k.ptype !== 'ritardo' || probOptions(k).length) probSolve(k.id);
      else probSendAway(k.id);
    }
    for (const q of [...S.reqs]) {
      if (!optionsFor(q).length) continue;
      st.ui.checks[q.id] = q.type === 'famiglia' ? ['seat', 'kasko'] : ['kasko', 'gps'];
      propose(q.id);
      assign(q.id);
    }
    for (const it of [...S.ins]) {
      insCheckInt(it.id);
      for (const k of Object.keys(it.zones)) if (S.time >= 1) insCheck(it.id, k, false);
      insClose(it.id);
    }
    for (const c of S.fleet) {
      if (c.dirty && freeNow(c)) clean(c.id);
      if ((c.cond < 60 || visiblyDamaged(c)) && S.cash > repairCost(c) + 800) repair(c.id);
    }
    const offer = S.market.filter((o) => o.dealer === 'gino' || o.dealer === 'flotte').sort((a, b) => a.price - b.price)[0];
    if (offer && S.cash > offer.price + 4000 && S.fleet.length < 14) { buyUsed(offer.id); bought++; }

    nextDay();
    S = st.S;
    check(S);
  }
  const demand = Object.entries(perMonth).map(([m, v]) => `${MSHORT[m]} ${(v.req / v.days).toFixed(1)}`).join(' · ');
  console.log(`Partita ${g}: giorno ${S.day}${S.lost ? ' (FALLITA)' : ''} · cassa €${Math.round(S.cash)} · patrimonio €${netWorth()} · flotta ${S.fleet.length} (comprate ${bought}) · reputazione ${Math.round(S.rep)} · debito €${debt()}`);
  console.log(`  clienti al giorno: ${demand}`);
}
console.log('Nessuna incoerenza trovata.');
