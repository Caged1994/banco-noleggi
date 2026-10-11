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
const { tierOf } = await mod('sim/regulars.js');

const days = Number(process.argv[2] ?? 365);
// PRICE_MUL=1.2 node scripts/simulate.mjs → il bot usa un listino del 20% sopra la media (per provare la concorrenza)
const priceMul = Number(process.env.PRICE_MUL ?? 1);
// PRICING=rival → ogni giorno il bot mette i prezzi a PRICE_MUL × quelli di AutoSprint (giocatore attento)
const followRival = process.env.PRICING === 'rival';
const { rivalPrice } = await mod('sim/rival.js');
// MAINT=off → il bot non fa tagliandi, revisioni né cambi gomme (per misurare quanto costa trascurarli)
const maintOn = process.env.MAINT !== 'off';
const M = await mod('sim/maintenance.js');
const games = Number(process.argv[3] ?? 3);
// STAFF=off → il bot lavora da solo, senza dipendenti né box
const staffOn = process.env.STAFF !== 'off';
const ST = await mod('sim/staff.js');
const CR = await mod('sim/crew.js');
const SD = await mod('data/staffdata.js');
const hint = (c, role) => SD.BIO_ROLE[role].some((t) => c.bio.includes(t));
// Il bot assume secondo la flotta: lavaggista da 5 auto, addetto ai rientri da 6, venditore da 8, box e meccanico da 8 con la cassa.
function botStaff(S, idle) {
  for (const e of S.staff) if (e.raise) ST.grantRaise(e.id);
  for (const e of [...S.staff]) {
    if (ST.inProbation(e) && e.aptKnown[e.role] && ST.aptOf(e) < 0.85) ST.fire(e.id);
    if (e.contract === 'stagionale' && e.until - S.day <= 7) ST.offerFixed(e.id);
  }
  if (!S.box.own && S.fleet.length >= 8 && S.cash > 12000 && (!process.env.BOT_ROLES || process.env.BOT_ROLES.includes('meccanico'))) CR.buyBox();
  if (S.box.own && !S.box.diag && S.cash > 9000) CR.buyBoxUp('diag');
  if (S.box.own && !S.box.ponte && S.cash > 8000) CR.buyBoxUp('ponte');
  const want = [];
  if (S.fleet.length >= 5) want.push('lavaggio');
  if (S.fleet.length >= 6) want.push('rientri');
  if (S.fleet.length >= 8) want.push('vendite');
  if (S.box.own) want.push('meccanico');
  const only = process.env.BOT_ROLES ? process.env.BOT_ROLES.split(',') : null;
  for (const role of want) {
    if (only && !only.includes(role)) continue;
    if (ST.staffOf(role).length) continue;
    const c = S.cands.find((x) => x.trained && x.role === role) || S.cands.find((x) => !x.trained && hint(x, role))
      || (idle[role] > 14 ? S.cands.find((x) => !x.trained) : null);
    idle[role] = (idle[role] || 0) + 1;
    if (!c) continue;
    const con = c.wants === 'stagionale' ? 'stagionale' : 'fisso';
    CR.crewWork(ST.hire(c.id, role, con, 3));
    idle[role] = 0;
  }
}

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
  for (const k of Object.keys(S.prices)) S.prices[k] = Math.round(S.prices[k] * priceMul);
  const perMonth = {};
  let bought = 0, occ = 0, occDays = 0, minCash = Infinity, day100 = null, staffMax = 0;
  const idle = {};
  for (let i = 0; i < days && !S.lost; i++) {
    const m = dateOf(S.day).m;
    perMonth[m] ??= { req: 0, days: 0 };
    perMonth[m].req += S.reqs.length;
    perMonth[m].days++;

    if (staffOn) botStaff(S, idle);
    staffMax = Math.max(staffMax, S.staff.length);
    for (const k of [...S.desk]) {
      if (k.kind === 'over') (swapOptions(k.b).length ? overSwap : overColleague)(k.id);
      else if ((k.ptype !== 'ritardo' || probOptions(k).length) && CR.bestSeller()) CR.delegateProb(k.id);
      else if (k.ptype !== 'ritardo' || probOptions(k).length) probSolve(k.id);
      else probSendAway(k.id);
    }
    if (followRival) for (const k of Object.keys(S.prices)) S.prices[k] = Math.round(rivalPrice(k) * priceMul);
    if (maintOn) for (const c of S.fleet) {
      if (M.kmToService(c) <= 800 && !CR.mechDo('svc', c, true) && M.canWork(c)) M.doService(c.id);
      if (M.revDaysLeft(c) <= 20 && !CR.mechDo('rev', c, true) && M.canWork(c)) M.doRevision(c.id);
      const want = M.inWinter(S.day + 12) ? 'invernali' : 'estive';
      if (c.tires !== want && !CR.mechDo('tires', c, true) && M.canChangeTires(c)) M.changeTires(c.id, true);
    }
    // prima le ispezioni (chiuderle fa lavare le auto al lavaggista), poi i clienti con il tempo che resta
    for (const it of [...S.ins]) {
      insCheckInt(it.id);
      for (const k of Object.keys(it.zones)) if (S.time >= 3) insCheck(it.id, k, false);
      insClose(it.id);
    }
    for (const c of S.fleet) if (c.dirty && freeNow(c)) clean(c.id);
    for (const q of [...S.reqs]) {
      if (!optionsFor(q).length) continue;
      if (CR.bestSeller(3)) { CR.delegateReq(q.id); continue; }
      // proporre costa 1 tempo: il bot ne ha tenuto un po' per le proposte
      if (S.time >= 1) {
        st.ui.checks[q.id] = q.type === 'famiglia' ? ['seat', 'kasko'] : ['kasko', 'gps'];
        propose(q.id);
      }
      assign(q.id);
    }
    for (const c of S.fleet) {
      if (c.dirty && freeNow(c)) clean(c.id);
      if ((c.cond < 60 || visiblyDamaged(c)) && !CR.mechDo('repair', c, true) && S.cash > repairCost(c) + 800) repair(c.id);
    }
    const offer = S.market.filter((o) => o.dealer === 'gino' || o.dealer === 'flotte').sort((a, b) => a.price - b.price)[0];
    if (offer && S.cash > offer.price + 4000 && S.fleet.length < Number(process.env.FLEET_MAX ?? 14)) { buyUsed(offer.id); bought++; }

    occ += S.fleet.filter((c) => c.bookings.some((b) => b.st === 'out' && b.start <= S.day && S.day < b.end)).length / S.fleet.length; occDays++;
    nextDay();
    S = st.S;
    minCash = Math.min(minCash, S.cash);
    if (day100 === null && netWorth() >= 100000) day100 = S.day;
    check(S);
  }
  const demand = Object.entries(perMonth).map(([m, v]) => `${MSHORT[m]} ${(v.req / v.days).toFixed(1)}`).join(' · ');
  console.log(`Partita ${g}: giorno ${S.day}${S.lost ? ' (FALLITA)' : ''} · cassa €${Math.round(S.cash)} · patrimonio €${netWorth()} · flotta ${S.fleet.length} (comprate ${bought}) · reputazione ${Math.round(S.rep)} · debito €${debt()}`);
  console.log(`  clienti al giorno: ${demand}`);
  const maintCost = S.reports.reduce((a, r) => a + (r.out.maint || 0), 0);
  console.log(`  manutenzione: €${Math.round(maintCost)} nell'anno`);
  const wagesY = S.reports.reduce((a, r) => a + (r.out.staff || 0), 0);
  const repY = S.reports.reduce((a, r) => a + (r.out.repair || 0), 0), washY = S.reports.reduce((a, r) => a + (r.out.wash || 0), 0);
  const inY = S.reports.reduce((a, r) => a + r.totIn, 0), svcY = S.reports.reduce((a, r) => a + (r.inc.svc || 0), 0), dmgY = S.reports.reduce((a, r) => a + (r.inc.damage || 0) + (r.inc.interior || 0), 0);
  console.log(`  personale: ${S.staff.map((e) => `${SD.ROLES[e.role].nome.toLowerCase()} liv.${ST.lvOf(e)}`).join(', ') || 'nessuno'} · massimo ${staffMax} · ultime 12 settimane: entrate €${Math.round(inY)} (servizi €${Math.round(svcY)}, danni €${Math.round(dmgY)}), stipendi €${Math.round(wagesY)}, officina €${Math.round(repY)}, lavaggi €${Math.round(washY)}${S.box.own ? ' · box officina' : ''}`);
  console.log(`  auto fuori a noleggio in media: ${Math.round(occ / occDays * 100)}% · cassa minima €${Math.round(minCash)} · obiettivo €100.000 ${day100 ? 'raggiunto il giorno ' + day100 : 'non raggiunto'}`);
  const tiers = { fedele: 0, abituale: 0, nuovo: 0, perso: 0 };
  for (const c of S.clients) tiers[tierOf(c)]++;
  const back = S.reports.reduce((a, r) => a + (r.clBack || 0), 0);
  const rivLost = S.reports.reduce((a, r) => a + Object.values(r.rivLost || {}).reduce((x, y) => x + y, 0), 0);
  const rivWon = S.reports.reduce((a, r) => a + (r.rivWon || 0), 0);
  console.log(`  concorrenza: ${rivLost} clienti andati da AutoSprint, ${rivWon} arrivati da lei`);
  console.log(`  clienti: ${tiers.fedele} fedeli, ${tiers.abituale} abituali, ${tiers.nuovo} nuovi, ${tiers.perso} persi · ${back} ritorni nell'anno`);
}
console.log('Nessuna incoerenza trovata.');
