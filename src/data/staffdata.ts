// Personale: ruoli, tratti, livelli, contratti e frasi di presentazione dei candidati.

// Ruoli. base = riferimento dello stipendio settimanale (livello 0: 65%, livello 5: 115%).
export const ROLE_KEYS = ['lavaggio', 'rientri', 'vendite', 'meccanico'];
export const ROLES = {
  lavaggio: { nome: 'Lavaggista', base: 120, desc: 'Lava le auto dopo il controllo, appena chiudi l\'ispezione, e la mattina quelle da consegnare. Prodotti €4 per auto invece di €15.' },
  rientri: { nome: 'Addetto ai rientri', base: 210, desc: 'Fa il primo controllo delle auto rientrate: più sale di livello, più zone controlla da solo. Le zone sporche le pulisce sul posto prima di guardarle.' },
  vendite: { nome: 'Venditore al banco', base: 240, desc: 'Gli affidi tu i clienti e i problemi al ritiro: sceglie l\'auto e propone i servizi con il suo tempo.' },
  meccanico: { nome: 'Meccanico', base: 260, desc: 'Lavora nel box officina: tagliandi, gomme e riparazioni in sede, a costo ridotto e senza fermare l\'auto. Lavora da solo ogni mattina.' },
};
export const APPRENTICE_WAGE = 100; // non addestrato, livello 0
export const MAX_STAFF = 8;
export const LEVEL_MAX = 5;
// esperienza per passare dal livello L al livello L+1
export const XP_NEED = [60, 120, 200, 300, 420];
export const roleWage = (role: string, level: number) => Math.round(ROLES[role].base * (0.65 + 0.1 * level) / 10) * 10;
// tempo giornaliero di un dipendente
export const STAFF_TIME_BASE = 7;

// Tratti: nascosti all'assunzione, si scoprono dopo la settimana di prova.
export const TRAITS = {
  Attento: { good: true, txt: 'trova più danni e sbaglia meno' },
  Veloce: { good: true, txt: '+2 tempo al giorno' },
  Persuasivo: { good: true, txt: 'i clienti accettano più servizi e soluzioni' },
  Gentile: { good: true, txt: '+0,3 reputazione per ogni cliente che serve' },
  Studioso: { good: true, txt: 'impara il 60% più in fretta' },
  Poliglotta: { good: true, txt: 'con i turisti vende il 20% in più' },
  Affidabile: { good: true, txt: 'non si ammala mai' },
  Pignolo: { good: true, txt: 'non sbaglia mai un lavaggio, riparazioni al 100%' },
  Economico: { good: true, txt: 'chiede aumenti più piccoli' },
  Lento: { good: false, txt: '−2 tempo al giorno' },
  Pasticcione: { good: false, txt: 'sbaglia più spesso: controlli meno affidabili, lavori da rifare' },
  Svogliato: { good: false, txt: 'impara la metà' },
  Ambizioso: { good: false, txt: 'impara il 50% più in fretta, ma chiede aumenti più alti e se ne va più facilmente' },
  Cagionevole: { good: false, txt: 'si ammala tre volte più spesso' },
};
export const TRAIT_KEYS = Object.keys(TRAITS);

// Candidati per settimana nei vari mesi (gen … dic): pochi d'inverno, tanti in estate.
export const CANDS_MONTH = [1, 1, 2, 3, 4, 5, 6, 6, 4, 3, 2, 1];
export const CAND_DAYS = 14; // un candidato resta disponibile per due settimane
export const TRAINED_SHARE = 0.35;
export const SEASONAL_MUL = 1.1; // il contratto stagionale costa il 10% in più a settimana
export const PROBATION = 7;
export const SEVERANCE_WEEKS = 2; // licenziare un fisso dopo la prova costa due settimane di stipendio
export const SICK_DAY = 1 / 450, SICK_GRACE = 60;
export const VAC_DAYS = 10, VAC_AUTO_DOY = 305; // dal 1° novembre le ferie non date partono da sole
export const COURSE_DAYS = 2;
export const courseCost = (level: number) => 250 + 100 * level;

// Box officina e miglioramenti.
export const BOX_COST = 4000;
export const BOX_UP = {
  ponte: { nome: 'Ponte e carrozzeria', cost: 3500, desc: 'Il meccanico ripara anche i danni di carrozzeria, al 60% del prezzo dell\'officina esterna.' },
  diag: { nome: 'Diagnosi e revisioni', cost: 2500, desc: 'Revisioni in sede a €45 e controlli che dimezzano il rischio di guasto per 10 giorni.' },
  posto: { nome: 'Secondo posto auto', cost: 5000, desc: 'Due meccanici possono lavorare insieme nel box.' },
};
export const BOX_UP_KEYS = Object.keys(BOX_UP);

// Frasi di presentazione: indizi sul ruolo più adatto e sui tratti, mai una dichiarazione esplicita.
export const BIO_ROLE = {
  lavaggio: ['Ho lavorato tre estati in un autolavaggio a mano.', 'La mia auto è sempre lucida, anche sotto i tappetini.', 'Ho fatto le pulizie in un hotel a cinque stelle.', 'Mi rilassa vedere le cose tornare come nuove.'],
  rientri: ['Ho lavorato per un perito delle assicurazioni.', 'Facevo il controllo qualità in una fabbrica di piastrelle.', 'Mi accorgo subito se qualcuno ha spostato un soprammobile.', 'Restauro mobili antichi nel tempo libero.'],
  vendite: ['Ho venduto telefoni in un centro commerciale per quattro anni.', 'Facevo il cameriere in un ristorante pieno di turisti.', 'Attacco bottone con chiunque, anche in fila alla posta.', 'Ho lavorato alla reception di un villaggio vacanze.'],
  meccanico: ['Smonto motorini da quando avevo dodici anni.', 'Ho fatto l\'apprendista in un\'officina di paese.', 'Ho rimesso in strada da solo una vecchia utilitaria.', 'Con mio padre sistemavamo i trattori della cooperativa.'],
};
export const BIO_NEUTRAL = ['Cerco lavoro, imparo in fretta quello che serve.', 'Ho fatto un po\' di tutto: magazziniere, barista, corriere.', 'Esco da un contratto in un call center.', 'Ho appena finito la scuola e voglio iniziare a lavorare.'];
export const BIO_TRAIT = {
  Attento: 'Rileggo sempre tutto due volte.',
  Veloce: 'Non sopporto stare con le mani in mano.',
  Persuasivo: 'Dicono che saprei vendere la sabbia nel deserto.',
  Gentile: 'I clienti mi lasciavano sempre la mancia.',
  Studioso: 'La sera seguo un corso di formazione.',
  Poliglotta: 'Parlo inglese, tedesco e un po\' di spagnolo.',
  Affidabile: 'In dieci anni non ho mai preso un giorno di malattia.',
  Pignolo: 'Se una cosa non è perfetta, la rifaccio.',
  Economico: 'Non chiedo molto, mi basta lavorare vicino a casa.',
  Lento: 'Preferisco fare le cose con calma, senza fretta.',
  Pasticcione: 'Ogni tanto mi cade qualcosa, ma rimedio sempre.',
  Svogliato: 'Cerco qualcosa di tranquillo.',
  Ambizioso: 'Tra cinque anni voglio avere un\'agenzia tutta mia.',
  Cagionevole: 'Spero che l\'ufficio non abbia spifferi, soffro un po\' il freddo.',
};
export const BIO_TRAINED = {
  lavaggio: (l: number) => `${l > 1 ? 'Responsabile' : 'Addetto'} al lavaggio in un concessionario per ${l + 1} anni.`,
  rientri: (l: number) => `${l + 1} anni ai rientri di un noleggio in aeroporto.`,
  vendite: (l: number) => `${l + 1} anni al banco di una grande catena di noleggio.`,
  meccanico: (l: number) => `${l + 1} anni da meccanico in un'officina autorizzata.`,
};
