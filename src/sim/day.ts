import { S, ui } from '../core/state.js';
import { insClose, newInspection } from './inspection.js';
import { nightWash, overSendAway, probSendAway, processPickups } from './pickups.js';
import { log, money, newWeek, rep, wages } from './ledger.js';
import { isSun, wdd } from '../core/calendar.js';
import { R, eur } from '../core/util.js';
import { GOAL, INSUR_W, OFFICE_W } from '../data/catalog.js';
import { payLoans } from './bank.js';
import { cancelBooking } from './fleet.js';
import { missedOpportunity, optionsFor } from './desk.js';
import { buildReport } from './report.js';
import { dailyTime, genCands } from './staff.js';
import { planEvents } from './seasons.js';
import { genMarket } from './market.js';
import { genReqs } from './clients.js';
import { netWorth } from './game.js';
export function nextDay(){
  if(S.lost)return;
  const d=S.day,nd=d+1;
  [...S.ins].forEach(it=>insClose(it.id,true));
  [...S.desk].forEach(k=>k.kind==='over'?overSendAway(k.id,true):probSendAway(k.id,true));
  log(`Chiusura ${wdd(d)}: entrate ${eur(S.today.in)}, uscite ${eur(S.today.out)}`,'hdr');
  S.today={in:0,out:0};
  if(isSun(d)){
    const f=OFFICE_W+INSUR_W*S.fleet.length,w=wages();
    money(-f,'fixed');if(w)money(-w,'staff');
    log(`Fine settimana: affitto e assicurazioni −${eur(f)}${w?`, stipendi −${eur(w)}`:''}`,'out');
    payLoans();
  }

  for(const c of S.fleet){
    const b=c.bookings.find(x=>x.st==='out'&&x.start<=d&&d<x.end);
    if(b){
      if(Math.random()<(c.cond<45?(45-c.cond)/160:0)+(c.fragile?.035:0)){
        const refund=Math.max(0,b.end-nd)*(b.rate+b.svcRate);
        c.bookings=c.bookings.filter(x=>x!==b);
        money(-150,'repair');money(-refund,'refund');rep(-6);c.cond=Math.max(5,c.cond-10);c.shopUntil=nd+2;c.dirty=false;
        log(`Guasto! ${c.model} ${c.plate} in panne con ${b.cust}. Carro attrezzi e rimborso: −${eur(150+refund)}`,'bad');
        c.bookings.filter(x=>x.start<c.shopUntil&&x.end>nd).forEach(x=>cancelBooking(c,x,'auto in officina'));
        continue;
      }
      if(b.end===nd){
        const blocked=c.bookings.some(x=>x!==b&&x.start===nd);
        if(!b.late&&!blocked&&Math.random()<.06){b.late=true;b.end=nd+1;money(b.rate+20,'extra');log(`${b.cust} riconsegna ${c.plate} in ritardo: addebito +${eur(b.rate+20)}`,'in')}
        else{
          c.bookings=c.bookings.filter(x=>x!==b);
          c.cond=Math.max(0,Math.round(c.cond-R(1,2.5)*b.days-R(0,2)));c.km+=Math.round(R(90,260)*b.days);c.dirty=true;
          newInspection(c,b);
          const ev=Math.random();
          if(ev<.10){money(40,'extra');log(`${b.cust} riconsegna ${c.plate} senza aver fatto il pieno: +${eur(40)}`,'in')}
          else if(ev<.17){money(25,'extra');log(`Arrivata una multa per ${c.plate}: spese di gestione al cliente +${eur(25)}`,'in')}
          else if(ev<.24){rep(2);log(`${b.cust} riconsegna ${c.plate} e lascia una recensione a 5 stelle.`,'rep')}
          else log(`${b.cust} riconsegna ${c.model} ${c.plate}: da ispezionare.`);
        }
      }
    }
    if(c.shopUntil===nd){c.cond=Math.max(c.cond,96);log(`${c.model} ${c.plate} è pronta dall'officina.`)}
  }
  nightWash(nd);

  if(S.reqs.length){
    S.stats.lost+=S.reqs.length;
    const ignored=S.reqs.filter(missedOpportunity);
    const pen=ignored.reduce((a,q)=>a+(q.type==='business'?1.5:1),0);
    S.reqs.forEach(q=>{if(optionsFor(q).length)S.wk.ignored++;else S.wk.lost[q.cat]=(S.wk.lost[q.cat]||0)+1});
    const walk=S.reqs.length-ignored.length;
    if(walk)log(`${walk} client${walk>1?'i':'e'} senza auto se ne sono andati altrove.`);
    if(ignored.length){rep(-pen);log(`${ignored.length} prenotazion${ignored.length>1?'i':'e'} ignorat${ignored.length>1?'e':'a'} pur avendo auto libere. Reputazione −${pen.toFixed(1)}`,'rep')}
  }
  if(isSun(d))buildReport(d);
  S.reqs=[];S.day=nd;S.time=dailyTime();ui.insMsg=null;ui.preview=null;ui.sel={};ui.checks={};ui.dsel={};
  if(isSun(d))S.wk=newWeek();
  if((nd-1)%7===0){genCands();log('Nuovi candidati per il personale disponibili questa settimana.')}
  planEvents();
  for(const e of S.events)if(e.start===nd)log(`Oggi inizia: ${e.nome}.`,'hdr');
  processPickups(nd);
  S.hist.push(Math.round(S.cash));if(S.hist.length>60)S.hist.shift();
  if(nd%3===1)genMarket();
  genReqs();
  if(!S.won&&netWorth()>=GOAL){S.won=true;log(`Obiettivo raggiunto al giorno ${nd}!`,'hdr')}
  if(S.cash<-3000){S.lost=true;log('Fallimento: la banca ha chiuso i conti.','bad')}
}
