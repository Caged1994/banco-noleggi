import { WINTER_TIRE_WEAR, inWinter, maintReminders, serviceRisk } from './maintenance.js';
import { rivalDaily, rivalWeekly } from './rival.js';
import { loyal } from './regulars.js';
import { S, ui } from '../core/state.js';
import { insClose, newInspection } from './inspection.js';
import { overSendAway, probSendAway, processPickups } from './pickups.js';
import { insurWeek, log, money, newWeek, rentWeek, rep, wages } from './ledger.js';
import { checkMilestones, yearEnd } from './progress.js';
import { dateOf } from '../core/calendar.js';
import { isSun, wdd, workEnd } from '../core/calendar.js';
import { R, eur } from '../core/util.js';
import { payLoans } from './bank.js';
import { missedOpportunity, optionsFor } from './desk.js';
import { buildReport } from './report.js';
import { PLAYER_TIME, staffDaily, weeklyCands } from './staff.js';
import { breakdownMul, crewMorning } from './crew.js';
import { rehome, rollReturnIncident, rollTotalLoss } from './incidents.js';
import { planEvents } from './seasons.js';
import { genMarket } from './market.js';
import { genReqs } from './clients.js';
export function nextDay(){
  if(S.lost)return;
  const d=S.day,nd=d+1;
  [...S.ins].forEach(it=>insClose(it.id,true));
  [...S.desk].forEach(k=>k.kind==='over'?overSendAway(k.id,true):probSendAway(k.id,true));
  log(`Chiusura ${wdd(d)}: entrate ${eur(S.today.in)}, uscite ${eur(S.today.out)}`,'hdr');
  S.today={in:0,out:0};
  if(isSun(d)){
    const r=rentWeek(),a=insurWeek(),f=r+a,w=wages();
    money(-f,'fixed');if(w)money(-w,'staff');
    log(`Fine settimana: affitto −${eur(r)} e assicurazioni −${eur(a)}${w?`, stipendi −${eur(w)}`:''}`,'out');
    payLoans();
  }
  if(dateOf(d).doy===365)yearEnd(d);

  S.todayInc=[];
  for(const c of [...S.fleet]){
    const b=c.bookings.find(x=>x.st==='out'&&x.start<=d&&d<x.end);
    if(b){
      if(rollTotalLoss(c,b,nd))continue;
      if(Math.random()<((c.cond<45?(45-c.cond)/160:0)+(c.fragile?.035:0)+serviceRisk(c))*breakdownMul(c,d)){
        const refund=Math.max(0,b.end-nd)*(b.rate+b.svcRate);
        c.bookings=c.bookings.filter(x=>x!==b);
        money(-150,'repair');money(-refund,'refund');rep(-6);loyal(b.cid,-30,'guasto durante il noleggio');c.cond=Math.max(5,c.cond-10);c.shopUntil=workEnd(nd,2);c.shopStart=nd;c.shopWhat='Guasto';c.dirty=false;
        log(`Guasto! ${c.model} ${c.plate} in panne con ${b.cust}. Carro attrezzi e rimborso: −${eur(150+refund)}`,'bad');
        c.bookings.filter(x=>x.start<c.shopUntil&&x.end>nd).forEach(x=>rehome(c,x,'auto in officina per un guasto'));
        continue;
      }
      if(b.end===nd){
        const blocked=c.bookings.some(x=>x!==b&&x.start===nd);
        if(!b.late&&!blocked&&Math.random()<.06){b.late=true;b.end=nd+1;money(b.rate+20,'extra');log(`${b.cust} riconsegna ${c.plate} in ritardo: addebito +${eur(b.rate+20)}`,'in')}
        else{
          c.bookings=c.bookings.filter(x=>x!==b);
          c.cond=Math.max(0,Math.round(c.cond-(R(1,2.5)*b.days+R(0,2))*(c.tires==='invernali'&&!inWinter(d)?WINTER_TIRE_WEAR:1)));c.km+=Math.round(R(90,260)*b.days);c.dirty=true;
          newInspection(c,b);
          rollReturnIncident(c,b,nd);
          const ev=Math.random();
          if(ev<.10){money(40,'extra');log(`${b.cust} riconsegna ${c.plate} senza aver fatto il pieno: +${eur(40)}`,'in')}
          else if(ev<.17){money(25,'extra');log(`Arrivata una multa per ${c.plate}: spese di gestione al cliente +${eur(25)}`,'in')}
          else if(ev<.24){rep(2);loyal(b.cid,10,'recensione a 5 stelle');log(`${b.cust} riconsegna ${c.plate} e lascia una recensione a 5 stelle.`,'rep')}
          else log(`${b.cust} riconsegna ${c.model} ${c.plate}: da ispezionare.`);
        }
      }
    }
    if(c.shopUntil===nd){if(/Officina|Guasto/.test(c.shopWhat||'Officina'))c.cond=Math.max(c.cond,96);log(`${c.model} ${c.plate} è pronta dall'officina (${(c.shopWhat||'officina').toLowerCase()}).`)}
  }

  if(S.reqs.length){
    S.stats.lost+=S.reqs.length;
    const ignored=S.reqs.filter(missedOpportunity);
    const pen=ignored.reduce((a,q)=>a+(q.type==='business'?1.5:1),0);
    S.reqs.forEach(q=>{if(optionsFor(q).length)S.wk.ignored++;else S.wk.lost[q.cat]=(S.wk.lost[q.cat]||0)+1});
    ignored.forEach(q=>loyal(q.cid,-25,'prenotazione ignorata'));
    const walk=S.reqs.length-ignored.length;
    if(walk)log(`${walk} client${walk>1?'i':'e'} senza auto se ne sono andati altrove.`);
    if(ignored.length){rep(-pen);log(`${ignored.length} prenotazion${ignored.length>1?'i':'e'} ignorat${ignored.length>1?'e':'a'} pur avendo auto libere. Reputazione −${pen.toFixed(1)}`,'rep')}
  }
  if(isSun(d))buildReport(d);
  S.reqs=[];S.day=nd;S.time=PLAYER_TIME;ui.insMsg=null;ui.preview=null;ui.sel={};ui.checks={};ui.dsel={};
  if(isSun(d))S.wk=newWeek();
  if((nd-1)%7===0)weeklyCands();
  staffDaily(nd);
  planEvents();
  maintReminders();
  if((nd-1)%7===0)rivalWeekly();
  rivalDaily();
  for(const e of S.events)if(e.start===nd)log(`Oggi inizia: ${e.nome}.`,'hdr');
  crewMorning();
  processPickups(nd);
  S.hist.push(Math.round(S.cash));if(S.hist.length>60)S.hist.shift();
  if(nd%3===1)genMarket();
  genReqs();
  checkMilestones(nd);
  if(S.cash<-3000){S.lost=true;log('Fallimento: la banca ha chiuso i conti.','bad')}
}
