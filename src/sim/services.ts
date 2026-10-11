import { loyal, tierOfReq } from './regulars.js';
import { KASKO, SVC, SVC_KEYS, TYPES } from '../data/catalog.js';
import { S, ui } from '../core/state.js';
import { STOCK, isUpgrade, stockFree } from './fleet.js';
import { clamp, svcNames } from '../core/util.js';
import { salesBoost } from './staff.js';
import { selectedCar } from './desk.js';
import { log, rep, wkSvc } from './ledger.js';
/* ---------- servizi ---------- */
// l'assicurazione si calcola sull'auto consegnata, non su quella richiesta
export function svcPrice(q,c,s){return s==='kasko'?KASKO[c?c.cat:q.cat]:S.sprices[s]}
export function svcStd(q,c,s){return s==='kasko'?KASKO[c?c.cat:q.cat]:SVC[s].std}
// perché un servizio non si può offrire su questa richiesta con quest'auto
export function svcBlock(q,c,s){
  if(s==='upgrade'&&!isUpgrade(q,c))return'scegli un\'auto superiore';
  if(STOCK[s]&&!stockFree(s,q.start,q.start+q.days))return STOCK[s].plur.toLowerCase()+' esauriti';
  return'';
}
// servizi che il cliente pagherà se confermi adesso con quest'auto
export function includedSvc(q,c){
  return SVC_KEYS.filter(s=>(q.ask.includes(s)||q.tried[s]===true)&&!svcBlock(q,c,s));
}
export function acceptChance(q,c,s,price){
  const aff=TYPES[q.type].aff[s];
  const std=svcStd(q,c,s);
  return Math.min(.95,aff*clamp(1.6-0.6*price/std,0.12,1.3)*(0.85+S.rep/333)*salesBoost()*tierOfReq(q).accept);
}
export function propose(qid){
  const q=S.reqs.find(r=>r.id===qid);if(!q)return;
  const c=selectedCar(q),checks=ui.checks[qid]||[];
  const offered=checks.filter(s=>!q.ask.includes(s)&&!(s in q.tried)&&!svcBlock(q,c,s));
  if(!offered.length)return;
  const yes=[],no=[];
  for(const s of offered){
    const ok=Math.random()<acceptChance(q,c,s,svcPrice(q,c,s));
    q.tried[s]=ok;(ok?yes:no).push(s);
    wkSvc(s).prop++;if(ok)wkSvc(s).acc++;
  }
  q.reply=yes.length&&!no.length?`Va bene, aggiungiamo ${svcNames(yes).toLowerCase()}.`
    :!yes.length?`No grazie, mi basta l'auto.`
    :`${svcNames(yes)} sì, ${svcNames(no).toLowerCase()} no.`;
  if(offered.length>=3&&no.length>=2){loyal(q.cid,-10,'troppe proposte');rep(-0.5);q.reply+=' (Sembra un po\' infastidito da tutte queste proposte.)';log(`${q.name} si è sentito spinto a comprare troppo. Reputazione −0.5`,'rep')}
  ui.checks[qid]=[];
}
