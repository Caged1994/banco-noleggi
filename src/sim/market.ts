import { initMaint } from './maintenance.js';
import { dateOf } from '../core/calendar.js';
import { S, ui } from '../core/state.js';
import { RI, eur, pick, wpick } from '../core/util.js';
import { CATS } from '../data/catalog.js';
import { carPriceMul } from './seasons.js';
import { STOCK, dmgLabel, newCar, openDmgs, preDamage, value } from './fleet.js';
import { log, money } from './ledger.js';
/* ---------- rivenditori e autosaloni ---------- */
export const DEALERS=[
  {id:'ciro',nome:'Ciro «Autoapposto»',tipo:'usato',slogan:'«Dotto\', è tutto a posto: si guida!»',
   desc:'Usato in pessime condizioni a prezzi stracciati. Spesso c\'è qualche danno che Ciro «si è dimenticato» di dire, e la meccanica resta fragile anche dopo l\'officina.',
   cats:{utilitaria:4,berlina:3,furgone:2,suv:1},cond:[30,58],km:[140,240],dmg:[2,4],price:.7,hidden:.5,fragile:true,n:3},
  {id:'gino',nome:'Il Garage di Nonno Gino',tipo:'usato',slogan:'«Ve la vendo come la venderei a mio nipote.»',
   desc:'Usato onesto in condizioni medie: quello che vedi è quello che compri.',
   cats:{utilitaria:3,berlina:3,suv:2,furgone:1},cond:[62,84],km:[60,150],dmg:[0,2],price:1,n:3},
  {id:'tony',nome:'Tony «Chilometri Zero… quasi»',tipo:'usato',slogan:'«Questa l\'ha guidata solo una vecchietta, la domenica.»',
   desc:'Auto lucidate che sembrano quasi nuove, a buon prezzo. Il contachilometri a volte racconta un\'altra storia.',
   cats:{utilitaria:2,berlina:3,suv:3,lusso:1},cond:[84,96],km:[15,45],dmg:[0,1],price:.9,odo:.4,n:2},
  {id:'flotte',nome:'Ex-Flotte Bassi',tipo:'usato',slogan:'«Ex aziendali, tagliandate, tutte uguali.»',
   desc:'Utilitarie e furgoni ex aziendali: tanti km, ma manutenzione regolare e niente sorprese.',
   cats:{utilitaria:3,furgone:3},cond:[70,82],km:[90,160],dmg:[0,1],price:.85,n:3},
  {id:'stella',nome:'Concessionaria Stellauto',tipo:'nuovo',slogan:'«Ufficiale, nuova, con il fiocco.»',
   desc:'Auto nuove di tutte le categorie a prezzo di listino, sempre disponibili.',isNew:true},
  {id:'bianchi',nome:'Seminuovi Bianchi & Figli',tipo:'seminuovo',slogan:'«Un anno di vita, tutta la vita davanti.»',
   desc:'Seminuove di un anno in condizioni perfette, a circa il 78% del prezzo del nuovo.',
   cats:{utilitaria:2,berlina:3,suv:3,furgone:1},cond:[90,97],km:[12,35],dmg:[0,0],newPrice:.78,n:3},
  {id:'riviera',nome:'Autosalone Riviera Prestige',tipo:'prestige',slogan:'«Non vendiamo auto. Vendiamo arrivi.»',
   desc:'SUV e auto di lusso nuove o seminuove, pronta consegna. Prezzi alti, ma l\'aperitivo è offerto.',
   cats:{suv:2,lusso:3},cond:[94,100],km:[0,12],dmg:[0,0],newPrice:.94,n:2},
];
export const DEALER=id=>DEALERS.find(d=>d.id===id);
export function genMarket(){
  S.market=[];
  for(const D of DEALERS){
    if(D.isNew)continue;
    const extra=D.id==='flotte'&&dateOf(S.day).m===8?2:0; // a settembre AutoSprint rivende la flotta estiva
    for(let i=0;i<D.n+extra;i++){
      const cat=wpick(D.cats),cond=RI(D.cond[0],D.cond[1]),km=RI(D.km[0],D.km[1])*1000;
      const o:any={id:S.nid++,dealer:D.id,cat,model:pick(CATS[cat].models),cond,km,dmgN:RI(D.dmg[0],D.dmg[1])};
      const pm=carPriceMul(S.day);
      if(D.newPrice)o.price=Math.round(CATS[cat].buy*D.newPrice*(0.9+0.1*cond/100)*(1-km/400000)*(0.5+pm/2)/50)*50;
      else o.price=Math.round(Math.max(CATS[cat].buy*.18,value({cat,cond,km,dmgs:[]})*D.price*pm-o.dmgN*CATS[cat].buy*.012)/50)*50;
      if(D.hidden&&Math.random()<D.hidden)o.hid=RI(1,2);
      if(D.odo&&Math.random()<D.odo)o.odo={km:RI(60,140)*1000,cond:RI(10,20)};
      S.market.push(o);
    }
  }
}
export function buyUsed(id){
  const m=S.market.find(x=>x.id===id);if(!m||S.cash<m.price)return;
  const D:any=DEALER(m.dealer)||{nome:'rivenditore'};
  money(-m.price,'buy');const c=newCar(m.cat,m.cond,m.km);c.model=m.model;preDamage(c,m.dmgN||0);if(D.fragile)c.fragile=true;
  initMaint(c,D.fragile?'bad':D.newPrice?'new':'used');if(D.newPrice)c.revDue-=365;
  S.fleet.push(c);S.market=S.market.filter(x=>x!==m);
  let note='';
  if(m.hid){preDamage(c,m.hid);note=` Sorpresa: ${m.hid} dann${m.hid>1?'i':'o'} non dichiarat${m.hid>1?'i':'o'} (${openDmgs(c).slice(-m.hid).map(dmgLabel).join(', ').toLowerCase()}).`}
  if(m.odo){c.km+=m.odo.km;c.cond=Math.max(20,c.cond-m.odo.cond);note+=` Dal libretto tagliandi risultano ${m.odo.km.toLocaleString('it-IT')} km in più: in realtà ne ha ${c.km.toLocaleString('it-IT')}, condizioni ${c.cond}%.`}
  log(`Acquistata da ${D.nome} ${c.model} (${c.plate}): −${eur(m.price)}.${note}`,note?'bad':'out');
  ui.mktMsg={txt:`${c.model} ${c.plate} acquistata da ${D.nome} per ${eur(m.price)}.${note||' Nessuna sorpresa.'}`,kind:note?'lose':'win'};
}
export function buyNew(cat){const p=CATS[cat].buy;if(S.cash<p)return;money(-p,'buy');const c=initMaint(newCar(cat),'new');S.fleet.push(c);log(`Acquistata da Concessionaria Stellauto ${c.model} nuova (${c.plate}): −${eur(p)}`,'out');ui.mktMsg={txt:`${c.model} ${c.plate} nuova, consegnata con il fiocco. −${eur(p)}.`,kind:'win'}}
export function buyStock(kind){const K=STOCK[kind];if(!K||S.cash<K.cost)return;money(-K.cost,'buy');S[K.key]++;log(`Acquistato un ${K.nome} (ora ${S[K.key]}): −${eur(K.cost)}`,'out')}
