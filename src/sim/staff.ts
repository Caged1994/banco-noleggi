// Personale: candidati, assunzioni, contratti, livelli, assenze e aumenti.
//
// - I candidati arrivano ogni lunedì, pochi d'inverno e tanti in estate, e restano due settimane.
// - Addestrato: conosci ruolo e livello, non i tratti. Non addestrato: livello 0, non sai niente.
//   Per entrambi c'è una frase di presentazione che dà indizi.
// - Settimana di prova: alla fine scopri i tratti e l'attitudine per il ruolo che ha fatto.
//   Cambiando ruolo, l'attitudine per il nuovo ruolo si scopre dopo un'altra settimana.
// - Livelli 0–5 per ruolo: si sale con l'esperienza (tempo di lavoro) o con un corso.
//   A ogni livello chiede un aumento: se rifiuti diventa scontento e può andarsene.
// - Malattie rare (mai nei primi 60 giorni, al massimo 14 giorni), 10 giorni di ferie l'anno per i fissi.
import { STAFF_BONUS } from '../data/goals.js';
import { S } from '../core/state.js';
import { dateOf, dshort, isSun } from '../core/calendar.js';
import { R, RI, clamp, eur, pick, wpick } from '../core/util.js';
import { NAMES, SURN } from '../data/catalog.js';
import {
  APPRENTICE_WAGE, BIO_NEUTRAL, BIO_ROLE, BIO_TRAINED, BIO_TRAIT, CANDS_MONTH, CAND_DAYS, COURSE_DAYS, LEVEL_MAX, MAX_STAFF,
  PROBATION, ROLES, ROLE_KEYS, SEASONAL_MUL, SEVERANCE_WEEKS, SICK_DAY, SICK_GRACE, STAFF_TIME_BASE, TRAINED_SHARE, TRAITS,
  TRAIT_KEYS, VAC_AUTO_DOY, VAC_DAYS, XP_NEED, courseCost, roleWage,
} from '../data/staffdata.js';
import { log, money } from './ledger.js';

// dalla prima tappa si possono assumere più dipendenti
export const maxStaff = () => MAX_STAFF + ((S.ms || 0) >= 1 ? STAFF_BONUS : 0);
export const PLAYER_TIME = 12;

// --- lettura dello stato di un dipendente
export const hasTrait = (e, t: string) => e.traits.includes(t);
export const lvOf = (e, role = e.role) => (e.levels && e.levels[role]) || 0;
export const xpOf = (e, role = e.role) => (e.xps && e.xps[role]) || 0;
export const aptOf = (e, role = e.role) => e.apt[role] ?? 1;
export function aptLabel(v: number) {
  return v < 0.85 ? 'scarsa' : v < 1 ? 'discreta' : v < 1.2 ? 'buona' : 'ottima';
}
const spanOn = (x, d) => x && x.start <= d && d < x.end;
// motivo dell'assenza in un giorno ('' se è al lavoro)
export const DAY_NAMES = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
export function absence(e, d = S.day): string {
  if (spanOn(e.sick, d)) return 'malattia';
  if (e.dayOff != null && (d - 1) % 7 === e.dayOff) return 'riposo';
  if (e.vac && e.vac.some((v) => spanOn(v, d))) return 'ferie';
  if (spanOn(e.course, d)) return 'corso';
  return '';
}
export function staffTime(e): number {
  if (absence(e)) return 0;
  return STAFF_TIME_BASE + lvOf(e) + (hasTrait(e, 'Veloce') ? 2 : 0) - (hasTrait(e, 'Lento') ? 2 : 0);
}
// la prova dura fino al settimo giorno compreso: quel giorno scopri i tratti e puoi ancora lasciarlo andare gratis
export const inProbation = (e) => S.day - e.hired <= PROBATION;
export const staffOf = (role: string) => S.staff.filter((e) => e.role === role);
// dipendenti al lavoro oggi in un ruolo (il meccanico lavora solo nel box, e solo quanti ne entrano)
export function workingOf(role: string) {
  let l = staffOf(role).filter((e) => !absence(e));
  if (role === 'meccanico') l = S.box && S.box.own ? l.slice(0, S.box.posto ? 2 : 1) : [];
  return l;
}
export const xpMul = (e) => clamp(aptOf(e), 0.6, 1.4) * (hasTrait(e, 'Studioso') ? 1.6 : 1) * (hasTrait(e, 'Svogliato') ? 0.5 : 1) * (hasTrait(e, 'Ambizioso') ? 1.5 : 1);

// Usa tempo del dipendente e gli dà esperienza.
export function useTime(e, n: number) {
  e.time = Math.max(0, e.time - n);
  gainXp(e, n * xpMul(e));
}
export function gainXp(e, n: number) {
  const r = e.role;
  e.xps[r] = (e.xps[r] || 0) + n;
  while (lvOf(e) < LEVEL_MAX && e.xps[r] >= XP_NEED[lvOf(e)]) {
    e.xps[r] -= XP_NEED[lvOf(e)];
    e.levels[r] = lvOf(e) + 1;
    log(`${e.name} sale al livello ${lvOf(e)} come ${ROLES[r].nome.toLowerCase()}.`, 'rep');
    askRaise(e);
  }
  if (lvOf(e) >= LEVEL_MAX) e.xps[r] = 0;
}

// --- aumenti
export function raiseTarget(e) {
  let t = roleWage(e.role, lvOf(e)) * (e.contract === 'stagionale' ? SEASONAL_MUL : 1) * (hasTrait(e, 'Ambizioso') ? 1.15 : 1);
  if (hasTrait(e, 'Economico')) t = e.wage + (t - e.wage) / 2;
  return Math.round(t / 10) * 10;
}
function askRaise(e) {
  const t = raiseTarget(e);
  if (t <= e.wage) return;
  e.raise = { wage: t, day: S.day };
  log(`${e.name} chiede un aumento a ${eur(t)} a settimana (ora ${eur(e.wage)}). Rispondi entro una settimana.`, 'hdr');
}
export function grantRaise(id) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || !e.raise) return;
  e.wage = e.raise.wage;
  e.raise = null;
  e.unhappy = false;
  log(`Aumento concesso a ${e.name}: ora ${eur(e.wage)} a settimana.`, 'info');
}
export function refuseRaise(id, auto = false) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || !e.raise) return;
  e.raise = null;
  e.unhappy = true;
  log(`${auto ? `Nessuna risposta alla richiesta di ${e.name}` : `Aumento negato a ${e.name}`}: ora è scontento e potrebbe andarsene.`, 'rep');
}
// a uno scontento si può ancora concedere l'aumento dopo averlo negato
export function makeHappy(id) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || !e.unhappy) return;
  const t = raiseTarget(e);
  e.wage = Math.max(e.wage, t);
  e.unhappy = false;
  log(`${e.name} ottiene l'aumento a ${eur(e.wage)}: torna soddisfatto.`, 'info');
}

// --- candidati
function rollTraits() {
  const n = Math.random() < 0.7 ? 1 : 2, out = [];
  const clash = { Veloce: 'Lento', Lento: 'Veloce', Studioso: 'Svogliato', Svogliato: 'Studioso', Affidabile: 'Cagionevole', Cagionevole: 'Affidabile', Attento: 'Pasticcione', Pasticcione: 'Attento' };
  while (out.length < n) {
    const good = Math.random() < 0.65;
    const t = pick(TRAIT_KEYS.filter((k) => TRAITS[k].good === good));
    if (!out.includes(t) && !out.includes(clash[t])) out.push(t);
  }
  return out;
}
function bioFor(c) {
  const parts = [];
  if (c.trained) parts.push(BIO_TRAINED[c.role](c.level));
  const others = ROLE_KEYS.filter((r) => !c.trained || r !== c.role).sort((a, b) => c.apt[b] - c.apt[a]);
  if (c.apt[others[0]] >= 1.15 && (!c.trained || Math.random() < 0.6)) parts.push(pick(BIO_ROLE[others[0]]));
  else if (!c.trained) parts.push(pick(BIO_NEUTRAL));
  if (Math.random() < 0.75) parts.push(BIO_TRAIT[pick(c.traits)]);
  return parts.join(' ');
}
export function newCandidate() {
  const m = dateOf(S.day).m, summer = m >= 3 && m <= 8;
  const trained = Math.random() < TRAINED_SHARE;
  const apt = {};
  for (const r of ROLE_KEYS) apt[r] = Math.round(R(0.6, 1.4) * 100) / 100;
  const c: any = { id: S.nid++, name: pick(NAMES) + ' ' + pick(SURN), trained, role: null, level: 0, apt, traits: rollTraits(), expires: S.day + CAND_DAYS };
  if (trained) {
    c.role = pick(ROLE_KEYS);
    c.level = +wpick({ 1: 5, 2: 3, 3: 1 });
    c.apt[c.role] = Math.max(c.apt[c.role], Math.round(R(1, 1.35) * 100) / 100);
    c.wage = roleWage(c.role, c.level);
  } else c.wage = APPRENTICE_WAGE;
  c.wants = wpick(summer ? { stagionale: 0.45, entrambi: 0.45, fisso: 0.1 } : { stagionale: 0.15, entrambi: 0.6, fisso: 0.25 });
  c.bio = bioFor(c);
  return c;
}
// Ogni lunedì: via i candidati scaduti, ne arrivano di nuovi secondo la stagione.
export function weeklyCands() {
  S.cands = S.cands.filter((c) => c.expires > S.day);
  const n = clamp(CANDS_MONTH[dateOf(S.day).m] + RI(-1, 1), 0, 7);
  for (let i = 0; i < n && S.cands.length < 10; i++) S.cands.push(newCandidate());
  if (n) log(`${n} nuov${n > 1 ? 'i candidati' : 'o candidato'} per il personale questa settimana.`);
}
export function genCands() { S.cands = []; weeklyCands(); }
export const canHireAs = (c, contract: string) => (contract === 'fisso' ? c.wants !== 'stagionale' : c.wants !== 'fisso');

// --- assunzioni e contratti
// contract: 'fisso' oppure 'stagionale'; months: durata dello stagionale (1–3)
export function hire(id, role: string, contract: string, months = 2) {
  const c = S.cands.find((x) => x.id === id);
  if (!c || S.staff.length >= maxStaff()) return null;
  role = c.trained ? c.role : role;
  if (!ROLES[role] || !canHireAs(c, contract)) return null;
  const doy = dateOf(S.day).doy;
  const e: any = {
    id: c.id, name: c.name, bio: c.bio, trained: c.trained, role, apt: c.apt, traits: c.traits, wants: c.wants,
    levels: { [role]: c.level }, xps: {}, aptKnown: {}, traitsKnown: false,
    wage: Math.round(c.wage * (contract === 'stagionale' ? SEASONAL_MUL : 1) / 10) * 10,
    contract, until: contract === 'stagionale' ? S.day + months * 30 : null,
    hired: S.day, roleSince: S.day, dayOff: RI(0, 6), sick: null, vac: [], course: null, raise: null, unhappy: false,
    vacLeft: contract === 'fisso' ? Math.round(VAC_DAYS * (366 - doy) / 365) : 0, time: 0,
  };
  e.time = staffTime(e);
  S.staff.push(e);
  S.cands = S.cands.filter((x) => x !== c);
  log(`Assunt${e.name.endsWith('a') ? 'a' : 'o'} ${e.name}, ${ROLES[role].nome.toLowerCase()}, ${contract === 'fisso' ? 'contratto fisso' : `stagionale fino al ${dshort(e.until)}`} (${eur(e.wage)}/settimana), giorno di riposo: ${DAY_NAMES[e.dayOff]}. Settimana di prova fino al ${dshort(S.day + PROBATION)}.`, 'info');
  return e;
}
export function fireCost(e) {
  if (inProbation(e)) return 0;
  return e.contract === 'fisso' ? e.wage * SEVERANCE_WEEKS : e.wage;
}
export function fire(id) {
  const e = S.staff.find((x) => x.id === id);
  if (!e) return;
  const cost = fireCost(e);
  if (cost) money(-cost, 'train');
  S.staff = S.staff.filter((x) => x !== e);
  log(`${e.name} non lavora più per te${cost ? `: liquidazione −${eur(cost)}` : ' (in prova, nessun costo)'}.`, cost ? 'out' : 'info');
}
export function setRole(id, role: string) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || e.role === role || !ROLES[role]) return;
  e.role = role;
  e.roleSince = S.day;
  e.levels[role] = e.levels[role] || 0;
  log(`${e.name} passa a ${ROLES[role].nome.toLowerCase()} (livello ${lvOf(e)}).${e.aptKnown[role] ? '' : ' Tra una settimana saprai se è portato.'}`, 'info');
}
// stagionale → fisso: chi voleva solo uno stagionale accetta una volta su due (una proposta a settimana)
export function offerFixed(id) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || e.contract !== 'stagionale' || (e.offerDay && S.day - e.offerDay < 7)) return;
  e.offerDay = S.day;
  if (e.wants === 'stagionale' && Math.random() < 0.5) {
    log(`${e.name} preferisce restare stagionale. Puoi riproporglielo tra una settimana.`, 'info');
    return;
  }
  e.contract = 'fisso';
  e.until = null;
  e.wage = Math.round(e.wage / SEASONAL_MUL / 10) * 10;
  e.vacLeft = Math.round(VAC_DAYS * (366 - dateOf(S.day).doy) / 365);
  log(`${e.name} accetta il contratto fisso: ${eur(e.wage)} a settimana.`, 'rep');
}

// --- formazione e ferie
export const canCourse = (e) => !inProbation(e) && !['malattia', 'ferie', 'corso'].includes(absence(e, S.day + 1)) && lvOf(e) < LEVEL_MAX && !(e.course && e.course.end > S.day) && S.cash >= courseCost(lvOf(e));
export function course(id) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || !canCourse(e)) return;
  const cost = courseCost(lvOf(e));
  money(-cost, 'train');
  e.course = { start: S.day + 1, end: S.day + 1 + COURSE_DAYS, role: e.role };
  log(`${e.name} andrà a un corso di formazione dal ${dshort(e.course.start)} al ${dshort(e.course.end - 1)}: −${eur(cost)}.`, 'out');
}
export function vacFree(e, start: number, len: number) {
  for (let d = start; d < start + len; d++) { const a = absence(e, d); if (a && a !== 'riposo') return false; }
  return true;
}
export function scheduleVac(id, start: number, len: number) {
  const e = S.staff.find((x) => x.id === id);
  if (!e || e.contract !== 'fisso' || len < 1 || len > e.vacLeft || start <= S.day || !vacFree(e, start, len)) return;
  e.vac.push({ start, end: start + len });
  e.vacLeft -= len;
  log(`Ferie per ${e.name} dal ${dshort(start)} al ${dshort(start + len - 1)}.`, 'info');
}
export function cancelVac(id, start: number) {
  const e = S.staff.find((x) => x.id === id);
  const v = e && e.vac.find((x) => x.start === start && x.start > S.day);
  if (!v) return;
  e.vac = e.vac.filter((x) => x !== v);
  e.vacLeft += v.end - v.start;
}
// prossimi lunedì in cui si possono far partire le ferie
export function vacStarts() {
  const out = [];
  let d = S.day + 1;
  while ((d - 1) % 7 !== 0) d++;
  for (let i = 0; i < 10; i++) out.push(d + i * 7);
  return out;
}

// --- giornata: assenze, fine contratti, prova, aumenti, ferie automatiche
export function staffDaily(nd: number) {
  const doy = dateOf(nd).doy, monday = (nd - 1) % 7 === 0;
  for (const e of [...S.staff]) {
    if (doy === 1 && e.contract === 'fisso') e.vacLeft = VAC_DAYS;
    // contratti stagionali
    if (e.contract === 'stagionale' && e.until === nd + 7) log(`Il contratto stagionale di ${e.name} scade il ${dshort(nd + 7)}: proponigli il fisso se vuoi tenerlo.`, 'hdr');
    if (e.contract === 'stagionale' && e.until <= nd) {
      S.staff = S.staff.filter((x) => x !== e);
      log(`Finito il contratto stagionale di ${e.name}.`, 'info');
      continue;
    }
    // fine corso: esperienza pari al 60% del livello successivo
    if (e.course && e.course.end === nd) {
      const r = e.role;
      if (lvOf(e) < LEVEL_MAX) gainXp(e, XP_NEED[lvOf(e)] * 0.6);
      log(`${e.name} torna dal corso: esperienza da ${ROLES[r].nome.toLowerCase()} in crescita.`, 'info');
    }
    if (e.sick && e.sick.end === nd) log(`${e.name} è guarit${e.name.endsWith('a') ? 'a' : 'o'} e torna al lavoro.`, 'info');
    // malattia: rara, mai nei primi 60 giorni, al massimo 14 giorni
    if (!absence(e, nd) && !hasTrait(e, 'Affidabile') && nd - e.hired >= SICK_GRACE && Math.random() < SICK_DAY * (hasTrait(e, 'Cagionevole') ? 3 : 1)) {
      const len = +wpick({ [RI(1, 3)]: 6, [RI(4, 7)]: 3, [RI(8, 14)]: 1 });
      e.sick = { start: nd, end: nd + len };
      log(`${e.name} è in malattia fino al ${dshort(nd + len - 1)}.`, 'bad');
    }
    // fine della prova e attitudine per il ruolo
    if (!e.traitsKnown && nd - e.hired >= PROBATION) {
      e.traitsKnown = true;
      e.aptKnown[e.role] = true;
      log(`Fine della prova di ${e.name}: attitudine ${aptLabel(aptOf(e))} come ${ROLES[e.role].nome.toLowerCase()}; ${e.traits.join(' e ')}.`, 'rep');
    } else if (e.traitsKnown && !e.aptKnown[e.role] && nd - e.roleSince >= PROBATION) {
      e.aptKnown[e.role] = true;
      log(`${e.name} dopo una settimana: attitudine ${aptLabel(aptOf(e))} come ${ROLES[e.role].nome.toLowerCase()}.`, 'rep');
    }
    if (e.raise && nd - e.raise.day >= 7) refuseRaise(e.id, true);
    // chi è scontento ogni lunedì può andarsene, a volte da AutoSprint
    if (monday && e.unhappy && Math.random() < (hasTrait(e, 'Ambizioso') ? 0.4 : 0.25)) {
      S.staff = S.staff.filter((x) => x !== e);
      log(Math.random() < 0.35 ? `AutoSprint ha assunto ${e.name}: ti saluta e se ne va.` : `${e.name} si è licenziat${e.name.endsWith('a') ? 'a' : 'o'}: non ha avuto l'aumento che chiedeva.`, 'bad');
      continue;
    }
    // ferie non date: dal 1° novembre partono da sole il lunedì dopo
    if (monday && doy >= VAC_AUTO_DOY && e.contract === 'fisso' && e.vacLeft > 0 && !e.vac.some((v) => v.end > nd)) {
      const start = nd + 7, len = e.vacLeft;
      e.vac.push({ start, end: start + len });
      e.vacLeft = 0;
      log(`${e.name} non ha ancora fatto le ferie: le prende dal ${dshort(start)} al ${dshort(start + len - 1)}.`, 'hdr');
    }
    e.vac = e.vac.filter((v) => v.end > nd - 30);
  }
  for (const e of S.staff) e.time = staffTime(e);
}

// Salvataggi vecchi: i dipendenti del sistema precedente diventano addestrati, già conosciuti.
export function migrateStaff() {
  S.staff = (S.staff || []).map((x) => {
    if (x.levels) return x;
    const role = x.role === 'vendite' || x.role === 'lavaggio' || x.role === 'rientri' ? x.role : 'lavaggio';
    const apt = {};
    for (const r of ROLE_KEYS) apt[r] = 1;
    return {
      id: x.id, name: x.name, bio: '', trained: true, role, apt, traits: x.trait && TRAITS[x.trait] ? [x.trait] : [], wants: 'entrambi',
      levels: { [role]: Math.min(LEVEL_MAX, x.level || 1) }, xps: {}, aptKnown: { [role]: true }, traitsKnown: true,
      wage: x.wage, contract: 'fisso', until: null, hired: S.day - 90, roleSince: S.day - 90, sick: null, vac: [], course: null,
      raise: null, unhappy: false, vacLeft: VAC_DAYS, time: null,
    };
  });
  for (const e of S.staff) { if (e.dayOff == null) e.dayOff = RI(0, 6); if (e.time == null) e.time = staffTime(e); }
  if (!S.cands || S.cands.some((c) => !c.bio)) genCands();
  if (!S.box) S.box = { own: false, ponte: false, diag: false, posto: false };
}
