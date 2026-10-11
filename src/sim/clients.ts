import { RETURN_NOTES, TIERS, pickReturning, returnChance, returningCandidates, tierOf } from './regulars.js';
import { isWE } from '../core/calendar.js';
import { S } from '../core/state.js';
import { evMul } from './seasons.js';
import { R, RI, pick, wpick } from '../core/util.js';
import { CATS, NAMES, SURN, TYPES } from '../data/catalog.js';
export function genReqs(){
  const weekend=isWE(S.day),M=evMul(S.day);
  const n=Math.max(1,Math.round((S.fleet.length*0.6+S.rep/30+(weekend?1:0))*M.dem+R(-0.8,1)));
  for(let i=0;i<n;i++){
    let tw={turista:3,business:weekend?1:4,famiglia:weekend?4:2,locale:3};
    if(S.rep>70)tw.business+=2;
    for(const k in tw)tw[k]*=M.types[k]||1;
    // cliente già visto che torna?
    const cands=returningCandidates();
    const back=cands.length&&Math.random()<returnChance(cands.length)?pickReturning(cands):null;
    const tk=back?back.type:wpick(tw),T=TYPES[tk];
    const w={...T.w};
    for(const k in w)w[k]*=M.cats[k]||1;
    if(w.lusso)w.lusso=S.rep>=60?w.lusso:0;
    const cat=back&&Math.random()<.7&&(back.cat!=='lusso'||S.rep>=60)?back.cat:wpick(w);
    if(back)S.wk.clBack=(S.wk.clBack||0)+1;
    const tier=TIERS[tierOf(back)];
    const budget=Math.round(CATS[cat].base*R(T.bud[0],T.bud[1])*(0.85+S.rep/333)*M.bud*tier.budget);
    const pre=Math.random()<tier.pre;
    const ask=Object.entries<any>(T.ask).filter(([s,p])=>Math.random()<p&&!(s==='upgrade'&&cat==='lusso')).map(([s])=>s);
    const note=back?pick(RETURN_NOTES[tierOf(back)]):pick(T.notes);
    S.reqs.push({id:S.nid++,name:back?back.name:pick(NAMES)+' '+pick(SURN),type:tk,cat,days:RI(T.days[0],T.days[1]),budget,note,
      start:pre?S.day+RI(1,4):S.day,ask,tried:{},cid:back?back.id:null});
  }
  S.reqs.sort((a,b)=>a.start-b.start);
}
