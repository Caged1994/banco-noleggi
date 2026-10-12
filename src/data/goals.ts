// Traguardi della partita e costi che crescono con il successo.

// Tappe di patrimonio netto. La prima è l'obiettivo iniziale (GOAL); ognuna sblocca qualcosa.
export const MILESTONES = [
  { nw: 100000, nome: 'Agenzia solida', unlock: 'La banca alza il fido, abbassa gli interessi del 25% e offre il prestito da €40.000; puoi assumere fino a 10 dipendenti.' },
  { nw: 250000, nome: 'Sede in aeroporto', unlock: 'Puoi aprire una seconda sede in aeroporto.', soon: true },
  { nw: 500000, nome: 'Leader della zona', unlock: 'Arrivano i contratti con le aziende, ma anche un secondo rivale più aggressivo.', soon: true },
  { nw: 1000000, nome: 'Impero del noleggio', unlock: 'Hai vinto la partita: puoi continuare a giocare quanto vuoi.' },
];
export const STAFF_BONUS = 2; // dipendenti in più dalla prima tappa
export const LOAN_GOOD_MUL = 0.75; // interessi dalla prima tappa
export const LOAN_BIG = { amt: 40000, weeks: 40, rate: 0.12 };

// Affitto settimanale di ufficio e parcheggio: più auto, più spazio.
export const RENT_TIERS = [
  { max: 10, w: 420 },
  { max: 20, w: 700 },
  { max: Infinity, w: 1100 },
];

// Tasse: il 31 dicembre si paga il 25% dell'utile dell'anno (aumento del patrimonio netto).
// Il primo anno è esente (agevolazione per la nuova attività). Se la cassa non basta, il resto si rateizza.
export const TAX_RATE = 0.25;
export const TAX_WEEKS = 12;
export const TAX_RESERVE = 3000; // in cassa resta almeno questo, il resto delle tasse va a rate
