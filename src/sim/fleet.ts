import { loyal } from './regulars.js';
import { S } from '../core/state.js';
import { R, RI, eur, pick, plate, wpick } from '../core/util.js';
import { CATS, CLEAN, DMG_KEYS, DMG_TYPES, REPAIR_SHARE, ZONES, ZONE_KEYS, dmgCost } from '../data/catalog.js';
import { log, money, rep } from './ledger.js';
import { wdd } from '../core/calendar.js';
import { carPriceMul } from './seasons.js';
/* ---------- calendario auto ---------- */
// booking: {id,start,end,cust,rate,days,svc,svcRate} — fuori nei giorni start..end-1, rientra il giorno end
export function busyOn(c,d){return c.shopUntil>d||c.bookings.some(b=>b.start<=d&&d<b.end)}
export function freeRange(c,from,to){for(let d=from;d<to;d++)if(busyOn(c,d))return false;return true}
// st: reserved (futura) · waiting (cliente al banco con un problema) · out (auto consegnata)
export function curBooking(c,d=S.day){const l=c.bookings.filter(b=>b.start<=d&&d<b.end);return l.find(b=>b.st!=='reserved')||l[0]}
// overbooking: l'auto è occupata solo da prenotazioni future (non ancora ritirate) e mai da più di una
export function canOverbook(c,q){
  if(q.start<=S.day||!eligible(q,c))return false;
  let any=false;
  for(let d=q.start;d<q.start+q.days;d++){
    if(c.shopUntil>d)return false;
    const l=c.bookings.filter(b=>b.start<=d&&d<b.end);
    if(l.length>1||l.some(b=>b.st!=='reserved'))return false;
    if(l.length)any=true;
  }
  return any;
}
export function nextBooking(c){return c.bookings.filter(b=>b.start>S.day).sort((a,b)=>a.start-b.start)[0]}
export const freeNow=c=>!busyOn(c,S.day);
// attrezzatura a scorta limitata: seggiolini e GPS
export const STOCK={seat:{nome:'Seggiolino',plur:'Seggiolini',key:'seats',cost:80},gps:{nome:'GPS',plur:'GPS',key:'gpsN',cost:120}};
export function usedOn(kind,d){let n=0;for(const c of S.fleet)for(const b of c.bookings)if(b.start<=d&&d<b.end&&b.svc.includes(kind))n++;return n}
export function stockFree(kind,from,to){for(let d=from;d<to;d++)if(usedOn(kind,d)>=S[STOCK[kind].key])return false;return true}
export const seatsUsed=d=>usedOn('seat',d);

export function newCar(cat,cond=100,km=0):any{return{id:S.nid++,cat,model:pick(CATS[cat].models),plate:plate(),cond,km,dirty:false,shopUntil:0,bookings:[],dmgs:[]}}
export const openDmgs=c=>c.dmgs.filter(d=>!d.repaired);
export const zoneOld=(c,k)=>openDmgs(c).filter(d=>d.zone===k).length;
export function rollDamage(cat,zone?){
  zone=zone||pick(ZONE_KEYS);const type=wpick(Object.fromEntries(DMG_KEYS.map(k=>[k,DMG_TYPES[k].w])));
  const sev=Math.random()<.25?'grave':'lieve',z=ZONES[zone],m=8;
  return{id:S.nid++,zone,type,sev,cost:dmgCost(cat,type,sev,zone),x:Math.round(R(z.x+m,z.x+z.w-m)),y:Math.round(R(z.y+m,z.y+z.h-m)),rot:RI(-50,50)};
}
// danni già presenti su un'auto usata
export function preDamage(c,n){for(let i=0;i<n;i++)c.dmgs.push({...rollDamage(c.cat),day:0,cust:'Proprietario precedente',status:'old'})}
export const dmgLabel=d=>`${DMG_TYPES[d.type].nome} ${d.sev}`;
export function value(c){return Math.max(CATS[c.cat].buy*.2,CATS[c.cat].buy*(0.35+0.55*c.cond/100)*Math.max(.5,1-c.km/600000)-openDmgs(c).reduce((a,d)=>a+d.cost*.5,0))}
export const wearCost=c=>c.cond<100?Math.round((100-c.cond)*CATS[c.cat].buy/1000*0.35+30):0;
export const dmgRepairCost=c=>Math.round(openDmgs(c).reduce((a,d)=>a+d.cost*REPAIR_SHARE,0)/10)*10;
export function repairCost(c){return wearCost(c)+dmgRepairCost(c)}
export const repairDays=c=>(c.cond<50?2:1)+(openDmgs(c).some(d=>d.sev==='grave')?1:0);
export function eligible(req,car){if(car.cat===req.cat)return true;if(req.cat==='furgone'||car.cat==='furgone')return false;return CATS[car.cat].tier>CATS[req.cat].tier}
export const isUpgrade=(q,c)=>!!c&&c.cat!==q.cat;
export const visiblyDamaged=c=>openDmgs(c).length>=3||openDmgs(c).some(d=>d.sev==='grave'&&d.type!=='mancanza');
export function clean(id){const c=S.fleet.find(x=>x.id===id);if(!c||!c.dirty||!freeNow(c)||S.cash<CLEAN)return;c.dirty=false;money(-CLEAN,'wash');log(`Lavaggio ${c.plate}: −${eur(CLEAN)}`,'out')}
export function canRepair(c){return freeNow(c)&&(c.cond<100||openDmgs(c).length>0)&&freeRange(c,S.day,S.day+repairDays(c))}
export function repair(id){const c=S.fleet.find(x=>x.id===id);if(!c||!canRepair(c))return;const cost=repairCost(c);if(S.cash<cost)return;
  const nd=openDmgs(c).length;money(-cost,'repair');c.shopUntil=S.day+repairDays(c);c.dirty=false;openDmgs(c).forEach(d=>d.repaired=c.shopUntil);
  log(`${c.model} ${c.plate} in officina${nd?` (${nd} dann${nd>1?'i':'o'} da riparare)`:''}, pronta ${wdd(c.shopUntil)}: −${eur(cost)}`,'out')}
export const canSell=c=>freeNow(c)&&!c.bookings.some(b=>b.end>S.day);
export const sellPrice=c=>Math.round(value(c)*.9*carPriceMul(S.day));
export function sell(id){const c=S.fleet.find(x=>x.id===id);if(!c||!canSell(c))return;const v=sellPrice(c);money(v,'sell');S.fleet=S.fleet.filter(x=>x!==c);log(`Venduta ${c.model} ${c.plate}: +${eur(v)}`,'in')}

export function cancelBooking(c,b,why){
  const refund=(b.rate+b.svcRate)*b.days;money(-refund,'refund');rep(-4);loyal(b.cid,-25,'prenotazione annullata');
  c.bookings=c.bookings.filter(x=>x!==b);
  log(`Prenotazione di ${b.cust} su ${c.plate} annullata (${why}). Rimborso −${eur(refund)}`,'bad');
}
