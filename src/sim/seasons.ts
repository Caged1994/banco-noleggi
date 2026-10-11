import { absDay, dateOf, dshort } from '../core/calendar.js';
import { S } from '../core/state.js';
import { log } from './ledger.js';
import { RI, wpick } from '../core/util.js';
import { CATS, TYPES } from '../data/catalog.js';
/* ---------- stagioni ed eventi ---------- */
export const SEASONS={
  inverno:{nome:'Inverno',desc:'Bassa stagione: pochi turisti, più clienti business.',types:{turista:.5,business:1.3,famiglia:.8,locale:1.1},cats:{berlina:1.2,suv:1.15},bud:.95},
  primavera:{nome:'Primavera',desc:'La stagione si risveglia: tornano i turisti e i primi ponti.',types:{turista:1.1,famiglia:1},cats:{},bud:1},
  estate:{nome:'Estate',desc:'Alta stagione: turisti e famiglie ovunque, servono SUV, furgoni, seggiolini e GPS.',types:{turista:2,famiglia:1.8,business:.55,locale:.9},cats:{suv:1.3,furgone:1.4,utilitaria:1.1},bud:1.15},
  autunno:{nome:'Autunno',desc:'Si torna al lavoro: fiere e trasferte, meno vacanzieri.',types:{turista:.8,business:1.35,famiglia:.85},cats:{berlina:1.2},bud:1},
};
export const MONTH_SEASON=['inverno','inverno','primavera','primavera','primavera','estate','estate','estate','autunno','autunno','autunno','inverno'];
export const MONTH_DEM=[.7,.75,.9,1,1.05,1.25,1.5,1.6,1.15,.9,.85,.95];
// prezzi dell'usato nel corso dell'anno: salgono prima dell'estate, crollano a settembre
export const MONTH_CARPRICE=[.95,.95,1,1.03,1.08,1.1,1.05,1,.88,.9,.92,.95];
export const seasonOf=d=>SEASONS[MONTH_SEASON[dateOf(d).m]];
export const carPriceMul=d=>MONTH_CARPRICE[dateOf(d).m];
// eventi a data fissa (giorno dell'anno) e casuali per mese
export const FIXED_EVENTS=[
  {key:'pasqua',nome:'Ponte di Pasqua',doy:104,len:4,desc:'Gite fuori porta e parenti da visitare.',dem:1.5,types:{famiglia:2,turista:1.5}},
  {key:'liberazione',nome:'Ponte del 25 aprile',doy:114,len:3,desc:'Tre giorni di gite.',dem:1.35,types:{turista:1.5,famiglia:1.5}},
  {key:'maggio',nome:'Primo maggio',doy:120,len:3,desc:'Concertone e scampagnate.',dem:1.35,types:{locale:1.5,turista:1.4},cats:{utilitaria:1.3}},
  {key:'repubblica',nome:'Ponte del 2 giugno',doy:152,len:3,desc:'Primo assaggio d\'estate.',dem:1.4,types:{famiglia:1.6,turista:1.6}},
  {key:'ferragosto',nome:'Settimana di Ferragosto',doy:221,len:10,desc:'Il picco dell\'anno: tutti partono, nessuno lavora.',dem:1.35,types:{turista:1.6,famiglia:1.8,business:.2},cats:{suv:1.4,furgone:1.5},bud:1.15},
  {key:'santi',nome:'Ponte di Ognissanti',doy:304,len:4,desc:'Ultimo ponte d\'autunno.',dem:1.3,types:{famiglia:1.6}},
  {key:'immacolata',nome:'Ponte dell\'Immacolata',doy:341,len:3,desc:'Mercatini di Natale e prime sciate.',dem:1.3,types:{turista:1.5,famiglia:1.4},cats:{suv:1.3}},
  {key:'natale',nome:'Feste di Natale',doy:354,len:12,desc:'Rientri a casa, cenoni e settimana bianca.',dem:1.4,types:{famiglia:2,business:.3,locale:1.3},cats:{suv:1.3,furgone:1.3}},
];
export const RANDOM_EVENTS=[
  {key:'fiera',nome:'Fiera dell\'Innovazione',months:[1,2,3,9,10],len:3,desc:'Espositori e visitatori da tutta Europa.',dem:1.6,types:{business:2.5},cats:{berlina:1.5,lusso:1.6},bud:1.15},
  {key:'moda',nome:'Settimana della Moda',months:[1,8],len:4,desc:'Buyer, modelle e giornalisti: tutti vogliono arrivare in grande stile.',dem:1.5,types:{business:2},cats:{lusso:2.5},bud:1.3},
  {key:'concerto',nome:'Concerto allo stadio',months:[4,5,6,7,8],len:2,desc:'Arrivano fan da fuori città.',dem:1.5,types:{turista:1.6,locale:1.6},cats:{utilitaria:1.5}},
  {key:'matrimoni',nome:'Stagione dei matrimoni',months:[4,5,8],len:3,desc:'Sposi, testimoni e parenti da accompagnare.',dem:1.4,types:{famiglia:1.8},cats:{lusso:1.8,furgone:1.4},bud:1.1},
  {key:'gp',nome:'Gran Premio',months:[3,4,5,6,8],len:3,desc:'Appassionati di motori da tutto il mondo.',dem:1.6,types:{turista:2},cats:{lusso:2,suv:1.3},bud:1.2},
  {key:'sagra',nome:'Sagra del tartufo',months:[9,10],len:3,desc:'Buongustai in gita tra le colline.',dem:1.35,types:{turista:1.5,famiglia:1.3},cats:{suv:1.3}},
  {key:'neve',nome:'Grandi nevicate in montagna',months:[0,1,11],len:4,desc:'Tutti vogliono salire sulle piste.',dem:1.4,types:{famiglia:1.8,turista:1.4},cats:{suv:2}},
  {key:'sciopero',nome:'Sciopero dei treni',months:[0,1,2,3,4,5,6,7,8,9,10,11],w:.25,len:1,notice:2,desc:'Treni fermi: chiunque abbia un appuntamento cerca un\'auto.',dem:1.7,types:{business:1.8,locale:1.8}},
  {key:'congresso',nome:'Congresso medico',months:[2,3,9,10],len:3,desc:'Medici in trasferta con rimborso spese.',dem:1.35,types:{business:2},cats:{berlina:1.4},bud:1.2},
];
export const activeEvents=d=>S.events.filter(e=>e.start<=d&&d<e.end);
export function evMul(d){
  const s=seasonOf(d),m={dem:MONTH_DEM[dateOf(d).m],types:{...s.types},cats:{...s.cats},bud:s.bud};
  for(const e of activeEvents(d)){m.dem*=e.dem;for(const k in e.types||{})m.types[k]=(m.types[k]||1)*e.types[k];for(const k in e.cats||{})m.cats[k]=(m.cats[k]||1)*e.cats[k];m.bud*=e.bud||1}
  return m;
}
// annuncia gli eventi fissi 10 giorni prima e programma quelli casuali ogni lunedì
export function planEvents(){
  const t=dateOf(S.day);
  for(const f of FIXED_EVENTS)for(const y of [t.y,t.y+1]){
    const st=absDay(y,f.doy);
    if(st-S.day<=10&&st>=S.day&&!S.events.some(e=>e.key===f.key&&e.start===st)){
      S.events.push({id:S.nid++,key:f.key,nome:f.nome,desc:f.desc,start:st,end:st+f.len,ann:S.day,dem:f.dem,types:f.types,cats:f.cats,bud:f.bud});
      log(`In arrivo: ${f.nome} dal ${dshort(st)} al ${dshort(st+f.len-1)}. ${f.desc}`,'hdr');
    }
  }
  if((S.day-1)%7===0&&Math.random()<.7){
    const notice=RI(5,9),st0=S.day+notice,m=dateOf(st0).m;
    const pool=RANDOM_EVENTS.filter(e=>e.months.includes(m)&&!S.events.some(x=>x.key===e.key&&x.end>S.day-(e.key==='sciopero'?50:20)));
    if(pool.length){
      const E=pool[+wpick(Object.fromEntries(pool.map((e,i)=>[i,e.w||1])))],st=E.notice?S.day+E.notice:st0;
      if(!S.events.some(x=>x.start<st+E.len&&st<x.end)){
        S.events.push({id:S.nid++,key:E.key,nome:E.nome,desc:E.desc,start:st,end:st+E.len,ann:S.day,dem:E.dem,types:E.types,cats:E.cats,bud:E.bud});
        log(`Annunciato: ${E.nome} dal ${dshort(st)}${E.len>1?' al '+dshort(st+E.len-1):''}. ${E.desc}`,'hdr');
      }
    }
  }
  S.events=S.events.filter(e=>e.end>S.day-30);
}
export const evCatsTxt=e=>Object.entries<any>(e.cats||{}).filter(([,v])=>v>1).map(([k])=>CATS[k].nome).join(', ');
export const evTypesTxt=e=>Object.entries<any>(e.types||{}).filter(([,v])=>v>1).map(([k])=>TYPES[k].label.toLowerCase()).join(', ');
