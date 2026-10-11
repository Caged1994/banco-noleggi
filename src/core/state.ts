// Stato della partita (S) e stato dell'interfaccia (ui).
// Sono "let" esportati: gli altri moduli li leggono sempre aggiornati,
// ma possono sostituirli solo tramite setState / setUi.
export let S: any = null;
export let ui: any = { tab: 'banco', armed: null, preview: null, sel: {}, checks: {}, zone: {}, report: null, dsel: {}, hist: {}, dcat: 'berlina' };

export function setState(next: any) { S = next; }
export function setUi(next: any) { ui = next; }
