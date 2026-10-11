export const CATS={
  utilitaria:{nome:'Utilitaria',base:40,buy:9000,tier:1,models:['Pico 1.0','Zeta City','Duetto 1.2']},
  berlina:{nome:'Berlina',base:60,buy:18000,tier:2,models:['Aurora 1.6','Strada 2.0','Vela TD']},
  suv:{nome:'SUV',base:85,buy:29000,tier:3,models:['Colle 4x4','Ranger X','Dolomia 2.2']},
  lusso:{nome:'Lusso',base:150,buy:56000,tier:4,models:['Imperiale V6','Sirio Sport']},
  furgone:{nome:'Furgone 9 posti',base:75,buy:24000,tier:0,models:['Cargo 9','Navetta L2']},
};
export const CAT_KEYS=['utilitaria','berlina','suv','lusso','furgone'];
// servizi, tutti al giorno. std = prezzo che i clienti considerano normale.
// Upgrade, seggiolino, seconda guida e GPS hanno un prezzo fisso uguale per ogni auto; l'assicurazione ha un prezzo fisso per tipo di veicolo
export const SVC={
  upgrade:{nome:'Upgrade',short:'U',std:15},
  seat:{nome:'Seggiolino',short:'S',std:8},
  driver:{nome:'Seconda guida',short:'G',std:10},
  gps:{nome:'GPS',short:'N',std:6},
  kasko:{nome:'Assicurazione totale',short:'K'},
};
export const KASKO={utilitaria:22,berlina:29,suv:36,furgone:34,lusso:55};
// franchigia: quanto paga il cliente senza assicurazione totale in caso di furto, incendio o incidente
export const FRANCHIGIA={utilitaria:1000,berlina:1500,suv:2000,furgone:2000,lusso:3500};
export const SVC_KEYS=['upgrade','seat','driver','gps','kasko'];
export const FIXED_SVC=['upgrade','seat','driver','gps'];
export const TYPES={
  turista:{label:'Turista',w:{utilitaria:5,berlina:3,suv:2,furgone:1,lusso:1},days:[2,7],bud:[.9,1.25],
    aff:{upgrade:.35,seat:.08,driver:.4,gps:.6,kasko:.55},ask:{kasko:.22,driver:.15,gps:.18},
    notes:['Atterra stamattina, vuole girare la costiera','Prima volta in Italia, non conosce le strade','Viaggia leggero, solo uno zaino','Vuole fare il giro dei laghi',
      'In viaggio di nozze, cerca qualcosa di comodo','Ha prenotato un agriturismo sperduto in collina','Vuole vedere tre città d\'arte in cinque giorni','Parla poco italiano, si aiuta con il telefono',
      'Fotografo naturalista, andrà su strade sterrate','Tour enogastronomico tra le cantine','Gruppo di amici in vacanza, si alterneranno alla guida','Deve raggiungere un traghetto all\'alba',
      'Segue il Giro d\'Italia tappa per tappa','Vuole provare la guida a sinistra… no, a destra']},
  business:{label:'Business',w:{berlina:5,suv:2,lusso:3},days:[1,3],bud:[1.1,1.6],
    aff:{upgrade:.6,seat:0,driver:.15,gps:.25,kasko:.45},ask:{upgrade:.2,kasko:.15},
    notes:['Ha fretta, riunione alle 10','Paga l\'azienda, vuole la fattura','Cliente abituale di un concorrente','Chiede un\'auto silenziosa',
      'Deve accompagnare un cliente importante','Fiera di settore in città per tre giorni','Agente di commercio, farà molti km','Al telefono per tutto il tempo del contratto',
      'Volo cancellato, deve arrivare a Milano stasera','Consulente, cambia sede ogni giorno','Chiede se c\'è la presa USB per il portatile','Vuole un\'auto che faccia bella figura']},
  famiglia:{label:'Famiglia',w:{berlina:2,suv:4,furgone:4},days:[3,7],bud:[.85,1.2],
    aff:{upgrade:.3,seat:.7,driver:.5,gps:.35,kasko:.45},ask:{seat:.5,driver:.3,kasko:.12},
    notes:['Due bambini e un cane','Matrimonio di un cugino in campagna','Tanti bagagli, vacanza al mare','Nonni al seguito',
      'Settimana bianca, servono le catene','Il passeggino non entra nella loro auto','Gemelli di due anni, entrambi assonnati','Comunione della nipote, parenti da recuperare in stazione',
      'Campeggio al lago con canoa sul tetto','Trasloco della figlia all\'università','Parco divertimenti, partenza alle sei','Il cane soffre la macchina, chiedono teli coprisedili']},
  locale:{label:'Residente',w:{utilitaria:6,berlina:2,furgone:2},days:[1,3],bud:[.8,1.15],
    aff:{upgrade:.15,seat:.15,driver:.2,gps:.05,kasko:.25},ask:{kasko:.08},
    notes:['Auto sua dal meccanico','Deve fare un trasloco','Va a prendere parenti in stazione','Vuole spendere il meno possibile',
      'Ha tamponato ieri, la sua è dal carrozziere','Deve portare un armadio dalla suocera','Visita medica in un\'altra città','Esame per la patente nautica, non chiedete',
      'Studente, ha appena preso la patente','Vende mobili usati, deve fare consegne','Sua moglie gli ha preso la macchina','Concerto in città, vuole parcheggiare vicino']},
};
export const NAMES=['Giulia','Marco','Sofia','Luca','Chiara','Matteo','Elena','Davide','Sara','Paolo','Anna','Federico','Martina','Andrea','Greta','Alessandro','Francesca','Lorenzo','Valentina','Riccardo',
  'Beatrice','Simone','Alice','Tommaso','Aurora','Gabriele','Ginevra','Nicola','Camilla','Stefano','Ilaria','Vincenzo','Rosa','Salvatore','Carmela','Gennaro','Assunta','Pasquale','Marta','Emanuele',
  'Noemi','Filippo','Irene','Raffaele','Teresa','Domenico','Lucia','Antonio','Grazia','Giorgio','Ludovica','Cristian','Debora','Mattia','Asia',
  'Hans','Claire','Tom','Ingrid','Pierre','Yuki','Lucía','Sven','Amélie','Oliver','Emma','Kenji','Mateo','Fatima','Omar','Olga','Piotr','Aisha','Liam','Chloé','Jonas','Hiroshi','Isabela','Nikos','Zoe'];
export const SURN=['Rossi','Bianchi','Esposito','Ferrari','Greco','Conti','Marino','Gallo','Romano','Bruno','Costa','Ricci','Colombo','Russo','Fontana','Lombardi','Moretti','Barbieri','Santoro','Rinaldi',
  'Caruso','De Luca','Mancini','Leone','Longo','Martinelli','Vitale','Serra','Coppola','De Santis','Fabbri','Ferraro','Galli','Marchetti','Monti','Pellegrini','Villa','Cattaneo','Bassi','Sartori',
  'Lo Russo','Di Stefano','Cuomo','Amato','Parisi','Messina','Orlando','Palumbo','Gentile','Sorrentino',
  'Müller','Dubois','Smith','Tanaka','García','Schmidt','Martin','Johnson','Nakamura','Fernández','Kowalski','Andersson','Novak','Papadopoulos','Silva','Yilmaz','Ivanova','O\'Brien','Van Dijk','Haddad'];
export const GOAL=100000, OFFICE_W=420, INSUR_W=35, CLEAN=15, QUICKWASH=20, SEAT_COST=80, GPS_COST=120, H=14, SAVE='banco-noleggi-v9';
// zone dello schema auto vista dall'alto (viewBox 200×320)
export const ZONES={
  front:{nome:'Paraurti anteriore',x:52,y:14,w:96,h:24},
  hood:{nome:'Cofano',x:50,y:42,w:100,h:68},
  left:{nome:'Fiancata sinistra',x:26,y:64,w:22,h:196},
  right:{nome:'Fiancata destra',x:152,y:64,w:22,h:196},
  roof:{nome:'Tetto',x:56,y:124,w:88,h:110},
  rear:{nome:'Paraurti posteriore',x:52,y:282,w:96,h:24},
};
export const ZONE_KEYS=Object.keys(ZONES);
export const zn=k=>k==='int'?'Interni':ZONES[k].nome;
export const ZSU={int:'negli interni',front:'sul paraurti anteriore',hood:'sul cofano',left:'sulla fiancata sinistra',right:'sulla fiancata destra',roof:'sul tetto',rear:'sul paraurti posteriore'};
// listino danni: prezzo di riferimento per una berlina, moltiplicato per categoria e zona
export const DMG_TYPES={
  graffio:{nome:'Graffio',lieve:120,grave:350,w:4},
  ammaccatura:{nome:'Ammaccatura',lieve:250,grave:700,w:3},
  rottura:{nome:'Rottura',lieve:300,grave:900,w:1.5,ex:'fanale, specchietto, vetro'},
  mancanza:{nome:'Parte mancante',lieve:80,grave:400,w:1.5,ex:'coprimozzo, antenna, modanatura'},
  interni:{nome:'Interni rovinati',lieve:200,grave:600,w:0,ex:'sedili macchiati, bruciature, plastiche rotte'},
};
export const DMG_KEYS=Object.keys(DMG_TYPES).filter(k=>DMG_TYPES[k].w>0);
export const DMG_CAT={utilitaria:.75,berlina:1,furgone:1.1,suv:1.25,lusso:2};
export const ZONE_MUL={front:1,hood:1.15,left:1,right:1,roof:1.3,rear:1,int:1};
export const CLEAN_INT=80; // pulizia interna straordinaria, prezzo berlina
export const REPAIR_SHARE=.6; // l'officina costa il 60% del listino danni
export const dmgCost=(cat,type,sev,zone)=>Math.round(DMG_TYPES[type][sev]*DMG_CAT[cat]*ZONE_MUL[zone]/10)*10;
export const LOANS=[{amt:5000,weeks:12,rate:.06},{amt:10000,weeks:20,rate:.09},{amt:20000,weeks:30,rate:.12}];
export const PRE_DISC=0.8, NOSHOW=.12, PROBLEM=.15;
// problemi al ritiro (solo prenotazioni) e relativa soluzione a pagamento
export const PROBS={
  deposito:{nome:'Deposito non disponibile',txt:'Sulla carta non ci sono fondi sufficienti per il deposito cauzionale, oppure non ha una carta di credito.',sol:'Assicurazione totale (niente deposito)',acc:.7},
  patente:{nome:'Patente mancante',txt:'Non ha con sé la patente. Un amico può firmare un nuovo contratto a prezzo pieno a suo nome.',sol:'Contratto a nome dell\'amico',acc:.5},
  ritardo:{nome:'Arrivo in ritardo',txt:'È arrivato oltre l\'orario: la prenotazione è decaduta e la sua auto non è più garantita. Resta solo un\'auto di categoria superiore.',sol:'Upgrade a pagamento',acc:.6},
};
// domanda giornaliera di clienti: (auto × DEMAND_PER_CAR + reputazione × DEMAND_REP + weekend) × stagione ed eventi.
// Tarata perché i clienti siano di poco sopra quelli che la flotta può servire (d'inverno anche sotto):
// così il prezzo conta. Con il listino di mercato le auto sono fuori in media 2/3 del tempo.
export const DEMAND_PER_CAR=0.4, DEMAND_REP=1/50, DEMAND_WEEKEND=0.7;
