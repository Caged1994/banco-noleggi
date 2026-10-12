// Traguardi di patrimonio e tasse di fine anno.
import { S } from '../core/state.js';
import { dateOf } from '../core/calendar.js';
import { eur } from '../core/util.js';
import { MILESTONES, TAX_RATE, TAX_RESERVE, TAX_WEEKS } from '../data/goals.js';
import { log, money } from './ledger.js';
import { netWorth } from './game.js';

export const msReached = () => S.ms || 0;
export const nextMilestone = () => MILESTONES[Math.min(msReached(), MILESTONES.length - 1)];

export function checkMilestones(nd: number) {
  while (msReached() < MILESTONES.length && netWorth() >= MILESTONES[msReached()].nw) {
    const m = MILESTONES[msReached()];
    S.ms = msReached() + 1;
    S.msDay = nd;
    S.won = true;
    log(`Traguardo raggiunto al giorno ${nd}: «${m.nome}» (${eur(m.nw)} di patrimonio). ${m.unlock}${m.soon ? ' (In arrivo in un prossimo aggiornamento.)' : ''}`, 'hdr');
  }
}

// utile dell'anno = aumento del patrimonio netto dal 1° gennaio
export const yearProfit = () => netWorth() - (S.nwYear ?? netWorth());
export const taxFree = (d: number) => dateOf(d).y < 2;
export const taxEstimate = () => (taxFree(S.day) ? 0 : Math.round(Math.max(0, yearProfit()) * TAX_RATE));

// chiamata alla chiusura del 31 dicembre
export function yearEnd(d: number) {
  const y = dateOf(d).y, profit = yearProfit();
  if (taxFree(d)) {
    log(`Fine dell'anno ${y}: utile ${eur(profit)}. Il primo anno è esente dalle tasse (agevolazione per la nuova attività); dal prossimo si paga il ${Math.round(TAX_RATE * 100)}% dell'utile.`, 'hdr');
  } else {
    const tax = Math.round(Math.max(0, profit) * TAX_RATE);
    if (!tax) log(`Fine dell'anno ${y}: nessun utile (${eur(profit)}), niente tasse.`, 'hdr');
    else {
      const pay = Math.min(tax, Math.max(0, Math.floor(S.cash - TAX_RESERVE)));
      if (pay) money(-pay, 'tax');
      S.stats.tax = (S.stats.tax || 0) + tax;
      const rest = tax - pay;
      if (rest > 0) {
        const weekly = Math.ceil(rest / TAX_WEEKS);
        S.loans.push({ id: S.nid++, amt: rest, weekly, left: TAX_WEEKS, weeks: TAX_WEEKS, rate: 0, tax: true });
      }
      log(`Fine dell'anno ${y}: utile ${eur(profit)}, tasse del ${Math.round(TAX_RATE * 100)}% −${eur(tax)}${rest > 0 ? ` (pagati ${eur(pay)}, il resto in ${TAX_WEEKS} rate da ${eur(Math.ceil(rest / TAX_WEEKS))} senza interessi)` : ''}.`, 'out');
    }
  }
  S.nwYear = netWorth();
}
