import { maintOk } from './maintenance.js';
import { loyal, recordVisit, registerClient } from './regulars.js';
import { S, ui } from '../core/state.js';
import { canOverbook, eligible, freeRange, isUpgrade, visiblyDamaged } from './fleet.js';
import { PRE_DISC } from '../data/catalog.js';
import { includedSvc, svcPrice } from './services.js';
import { log, money, rep, wkSvc } from './ledger.js';
import { hasTrait } from './staff.js';
import { wdd } from '../core/calendar.js';
import { eur } from '../core/util.js';
/* ---------- azioni ---------- */
export const obOptions=q=>q.start>S.day?S.fleet.filter(c=>!freeRange(c,q.start,q.start+q.days)&&canOverbook(c,q)):[];
export const allOptions=q=>optionsFor(q).concat(obOptions(q));
export const carRate=q=>{const l=q.start>S.day?Math.round(S.prices[q.cat]*PRE_DISC):S.prices[q.cat];return Math.min(l,q.budget)};
export function selectedCar(q){
  const opts=allOptions(q);if(!opts.length)return null;
  return opts.find(c=>c.id===ui.sel[q.id])||opts[0];
}
// by: venditore che ha servito il cliente (null = il giocatore)
export function assign(reqId,by=null){
  const q=S.reqs.find(r=>r.id===reqId);if(!q)return;
  const c=selectedCar(q);
  if(!c||!eligible(q,c))return;
  const ob=!freeRange(c,q.start,q.start+q.days);
  if(ob&&!canOverbook(c,q))return;
  const pre=q.start>S.day,list=pre?Math.round(S.prices[q.cat]*PRE_DISC):S.prices[q.cat];
  const rate=carRate(q),disc=rate<list;
  const svc=includedSvc(q,c);
  const svcRate=svc.reduce((a,s)=>a+svcPrice(q,c,s),0);
  const tot=(rate+svcRate)*q.days;
  const cl=registerClient(q,q.cat);recordVisit(cl,tot,q.cat);
  c.bookings.push({id:S.nid++,start:q.start,end:q.start+q.days,cust:q.name,cid:cl.id,rate,days:q.days,svc,svcRate,cat:q.cat,type:q.type,st:pre?'reserved':'out',ob});
  money(rate*q.days,'rent');money(svcRate*q.days,'svc');S.stats.rented++;S.stats.svc+=svcRate*q.days;
  const wc=S.wk.cat[q.cat]||(S.wk.cat[q.cat]={n:0,inc:0});wc.n++;wc.inc+=rate*q.days;
  S.wk.car[c.id]=(S.wk.car[c.id]||0)+tot;
  svc.forEach(s=>{const w=wkSvc(s);w.inc+=svcPrice(q,c,s)*q.days;if(q.ask.includes(s))w.req++});
  let r=1,extra=[],fl=10;
  if(isUpgrade(q,c))(svc.includes('upgrade')?extra.push('upgrade a pagamento'):(r+=2,fl+=10,extra.push('upgrade gratuito')));
  if(q.ask.includes('seat')&&!svc.includes('seat')){r-=1;fl-=5;extra.push('niente seggiolino')}
  if(q.start===S.day){
    if(visiblyDamaged(c)){r-=.5;fl-=5;extra.push('danni visibili')}
    if(c.dirty){r-=4;fl-=20;extra.push('auto sporca');c.dirty=false}
    if(c.cond<50){r-=2;fl-=10;extra.push('auto malandata')}
  }
  loyal(cl.id,fl,extra.length?'noleggio: '+extra.join(', '):'noleggio senza problemi');
  if(disc)extra.push('sconto');
  if(ob)extra.push('overbooking');
  if(by&&hasTrait(by,'Gentile'))r+=0.3;
  if(by)extra.push('servito da '+by.name.split(' ')[0]);
  rep(r);
  const when=q.start===S.day?`da oggi per ${q.days} g`:`dal ${wdd(q.start)} al ${wdd(q.start+q.days)}`;
  log(`${q.name}: ${c.model} ${c.plate} ${when}, +${eur(tot)}`+(svcRate?` di cui servizi ${eur(svcRate*q.days)}`:'')+(extra.length?' ('+extra.join(', ')+')':''),'in');
  S.reqs=S.reqs.filter(x=>x!==q);
  ui.preview=null;delete ui.sel[q.id];delete ui.checks[q.id];
}
export const missedOpportunity=q=>q.start>S.day&&optionsFor(q).length>0;
export function decline(id){const q=S.reqs.find(r=>r.id===id);if(!q)return;
  if(missedOpportunity(q)){rep(-0.5);S.wk.ignored++;loyal(q.cid,-20,'prenotazione rifiutata');log(`Hai rifiutato la prenotazione di ${q.name} pur avendo un'auto libera. Reputazione −0.5`,'rep')}
  else if(!optionsFor(q).length){S.wk.lost[q.cat]=(S.wk.lost[q.cat]||0)+1;loyal(q.cid,-5,'nessuna auto disponibile');log(`${q.name} se ne va: nessuna auto adatta.`)}
  else log(`Hai rifiutato ${q.name}.`);
  S.reqs=S.reqs.filter(x=>x!==q);ui.preview=null}
export function optionsFor(q){
  return S.fleet.filter(c=>eligible(q,c)&&freeRange(c,q.start,q.start+q.days)&&maintOk(c,q.start,q.start+q.days))
    .sort((a,b)=>(a.cat===q.cat?0:1)-(b.cat===q.cat?0:1)||b.cond-a.cond);
}
