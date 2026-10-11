import { maintOk } from './maintenance.js';
import { clientById, loyal, tierOf } from './regulars.js';
import { S, ui } from '../core/state.js';
import { busyOn, eligible, freeRange, visiblyDamaged } from './fleet.js';
import { CATS, KASKO, NOSHOW, PROBLEM, PROBS, QUICKWASH } from '../data/catalog.js';
import { log, money, rep, wkSvc } from './ledger.js';
import { eur, pick } from '../core/util.js';
import { hasTrait } from './staff.js';
/* ---------- ritiri: no-show, overbooking, clienti con problemi ---------- */
export const prepaid=b=>(b.rate+b.svcRate)*b.days;
export function carFor(b){return S.fleet.find(c=>c.bookings.includes(b))}
// auto libere che possono sostituire quella prenotata (stessa categoria o superiore)
export function swapOptions(b,minTier?){
  const q={cat:b.cat};
  return S.fleet.filter(c=>freeRange(c,S.day,b.end)&&maintOk(c,S.day,b.end)&&(minTier!=null?(c.cat!=='furgone'&&CATS[c.cat].tier>minTier):eligible(q,c)))
    .sort((x,y)=>CATS[x.cat].tier-CATS[y.cat].tier||y.cond-x.cond);
}
export function handOver(c,b){
  b.st='out';
  if(visiblyDamaged(c)){rep(-.5);loyal(b.cid,-5,'danni visibili al ritiro');log(`${b.cust} nota i danni su ${c.plate}: reputazione −0,5`,'rep')}
  if(c.dirty){c.dirty=false;money(-QUICKWASH,'wash');log(`Lavaggio rapido di ${c.plate} prima della consegna a ${b.cust}: −${eur(QUICKWASH)}`,'out')}
  if(c.cond<50){rep(-2);loyal(b.cid,-10,'auto malandata')}
}
export function processPickups(nd){
  const list=[];S.fleet.forEach(c=>c.bookings.forEach(b=>{if(b.st==='reserved'&&b.start===nd)list.push([c,b])}));
  list.sort((x,y)=>x[1].id-y[1].id);
  for(const [c,b] of list){
    const fedele=tierOf(clientById(b.cid))==='fedele';
    if(!fedele&&Math.random()<NOSHOW){
      c.bookings=c.bookings.filter(x=>x!==b);S.wk.noshow++;
      log(`${b.cust} non si presenta a ritirare ${c.plate}: prepagato di ${eur(prepaid(b))} trattenuto, l'auto torna libera.`);continue;
    }
    const taken=c.shopUntil>nd||c.bookings.some(x=>x!==b&&x.st!=='reserved'&&x.start<=nd&&nd<x.end);
    if(taken){
      c.bookings=c.bookings.filter(x=>x!==b);
      S.desk.push({id:S.nid++,kind:'over',b,plate:c.plate});
      log(`Overbooking: ${b.cust} è al banco ma ${c.plate} è già occupata.`,'bad');continue;
    }
    if(Math.random()<PROBLEM*(fedele?.4:1)){
      const types=['patente','ritardo'];if(!b.svc.includes('kasko'))types.push('deposito');
      b.st='waiting';
      S.desk.push({id:S.nid++,kind:'prob',ptype:pick(types),b});
      log(`${b.cust} è al banco per ritirare ${c.plate}, ma c'è un problema.`,'rep');continue;
    }
    handOver(c,b);log(`${b.cust} ritira ${c.model} ${c.plate} come prenotato.`);
  }
}
export function deskCase(id){return S.desk.find(x=>x.id===id)}
export function closeCase(k){S.desk=S.desk.filter(x=>x!==k);delete ui.dsel[k.id]}
// overbooking: consegna un'altra auto libera
export function overSwap(id){
  const k=deskCase(id);if(!k)return;
  const opts=swapOptions(k.b),c=opts.find(x=>x.id===ui.dsel[id])||opts[0];if(!c)return;
  c.bookings.push(k.b);handOver(c,k.b);S.wk.overOk++;
  const up=c.cat!==k.b.cat;if(up){rep(1);loyal(k.b.cid,10,'upgrade gratuito in overbooking')}
  log(`${k.b.cust} riceve ${c.model} ${c.plate}${up?' in upgrade gratuito (reputazione +1)':''}.`,up?'rep':'info');
  closeCase(k);
}
export const colleagueCost=b=>Math.round(CATS[b.cat].base*1.4*b.days);
export function overColleague(id){
  const k=deskCase(id);if(!k)return;const cost=colleagueCost(k.b);
  money(-cost,'colleague');S.wk.overOk++;
  log(`Un collega presta un'auto per ${k.b.cust}: −${eur(cost)}. Il cliente è servito.`,'out');
  closeCase(k);
}
export function overSendAway(id,auto=false){
  const k=deskCase(id);if(!k)return;
  money(-prepaid(k.b),'refund');rep(-6);S.wk.overBad++;loyal(k.b.cid,-60,'rimandato a casa per overbooking');
  log(`${k.b.cust} rimandato a casa per overbooking${auto?' (nessuna soluzione trovata in giornata)':''}: rimborso −${eur(prepaid(k.b))}, reputazione −6.`,'bad');
  closeCase(k);
}
// problemi: prezzo della soluzione
export function probPrice(k){
  const b=k.b,c=carFor(b);
  if(k.ptype==='deposito')return KASKO[c.cat]*b.days;
  if(k.ptype==='patente')return S.prices[c.cat]*b.days;
  return S.sprices.upgrade*b.days;
}
export const probOptions=k=>{const c=carFor(k.b);return k.ptype==='ritardo'&&c?swapOptions(k.b,CATS[c.cat].tier):[]};
// mul: bravura di chi propone la soluzione; by: venditore che se ne occupa (null = il giocatore)
export function probSolve(id,mul=1,by=null){
  const k=deskCase(id);if(!k||k.kind!=='prob')return;
  const b=k.b,c=carFor(b);if(!c)return;
  let nc=c;
  if(k.ptype==='ritardo'){const o=probOptions(k);nc=o.find(x=>x.id===ui.dsel[id])||o[0];if(!nc)return}
  const price=probPrice(k);
  if(Math.random()>=Math.min(.95,PROBS[k.ptype].acc*mul)){
    c.bookings=c.bookings.filter(x=>x!==b);S.wk.probLeft++;
    loyal(b.cid,-15,'soluzione rifiutata al ritiro');
    log(`${by?by.name.split(' ')[0]+' propone la soluzione, ma ':''}${b.cust} rifiuta: ${PROBS[k.ptype].sol.toLowerCase()} per ${eur(price)} è troppo. Se ne va, prepagato di ${eur(prepaid(b))} trattenuto.`);
    closeCase(k);return;
  }
  if(k.ptype==='deposito'){b.svc.push('kasko');b.svcRate+=KASKO[c.cat];money(price,'svc');S.stats.svc+=price;wkSvc('kasko').inc+=price}
  else if(k.ptype==='patente'){money(price,'rent')}
  else{c.bookings=c.bookings.filter(x=>x!==b);nc.bookings.push(b);b.svc.push('upgrade');b.svcRate+=S.sprices.upgrade;money(price,'svc');S.stats.svc+=price;wkSvc('upgrade').inc+=price}
  S.wk.car[nc.id]=(S.wk.car[nc.id]||0)+price;
  handOver(nc,b);S.wk.probSolved++;
  if(by&&hasTrait(by,'Gentile'))rep(.3);
  log(`${by?by.name.split(' ')[0]+': ':''}${b.cust} accetta: ${PROBS[k.ptype].sol.toLowerCase()} +${eur(price)}. Ritira ${nc.model} ${nc.plate}.`,'in');
  closeCase(k);
}
export function probSendAway(id,auto=false){
  const k=deskCase(id);if(!k)return;const c=carFor(k.b);
  if(c)c.bookings=c.bookings.filter(x=>x!==k.b);S.wk.probLeft++;loyal(k.b.cid,auto?-15:-25,auto?'problema al ritiro non risolto':'mandato via al ritiro');
  log(`${k.b.cust} ${auto?'se ne va senza aver risolto':'mandato via'}: prepagato di ${eur(prepaid(k.b))} trattenuto, l'auto torna libera.`);
  closeCase(k);
}
