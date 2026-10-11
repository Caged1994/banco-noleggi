import { loyal } from './regulars.js';
import { CLEAN_INT, DMG_CAT, ZONE_KEYS, ZSU, dmgCost } from '../data/catalog.js';
import { R, clamp, eur } from '../core/util.js';
import { dmgLabel, rollDamage, zoneOld } from './fleet.js';
import { S, ui } from '../core/state.js';
import { aptOf, hasTrait, lvOf, useTime } from './staff.js';
import { log, money, rep } from './ledger.js';
import { washRound } from './crew.js';
/* ---------- ispezione ai rientri ---------- */
// ogni zona: dirty (sporca) e st: none (da controllare) · ok (nessun danno visto) · unsure (sporca, non si capisce) · found (danno trovato)
export const P_CLEAN=.85, P_DIRTY=.40;
export function newInspection(c,b){
  const zones={};ZONE_KEYS.forEach(k=>zones[k]={dirty:false,st:'none',checks:0,esc:1,last:''});
  const nd=clamp(Math.round(R(1,2.4)+b.days/4),1,4);
  [...ZONE_KEYS].sort(()=>Math.random()-.5).slice(0,nd).forEach(k=>zones[k].dirty=true);
  const dmg=Math.random()<clamp(.2+b.days*.02,.2,.36)?rollDamage(c.cat):null;
  // interni: molto sporchi o rovinati (più probabile con famiglie e noleggi lunghi)
  const fam=b.type==='famiglia'?1.6:1,ri=Math.random();let int:any={cond:'ok',st:'none'};
  if(ri<.05*fam)int={cond:'rovinati',sev:Math.random()<.25?'grave':'lieve',st:'none'};
  else if(ri<(.05+.13+b.days*.01)*fam)int={cond:'sporchi',st:'none'};
  int.cost=int.cond==='sporchi'?Math.round(CLEAN_INT*DMG_CAT[c.cat]/5)*5:int.cond==='rovinati'?dmgCost(c.cat,'interni',int.sev,'int'):0;
  S.ins.push({id:S.nid++,car:c.id,plate:c.plate,model:c.model,cat:c.cat,cust:b.cust,cid:b.cid,kasko:b.svc.includes('kasko'),dmg,zones,int,acted:false});
}
export const insCar=it=>S.fleet.find(c=>c.id===it.car);
// probabilità di trovare un danno nuovo nella zona: cala con lo sporco e con i danni vecchi non riparati
// by: dipendente che controlla (null = il giocatore). Livello, attitudine e tratti cambiano la probabilità.
export function zoneChance(it,k,dirtyOverride?,by?){
  const z=it.zones[k],dirty=dirtyOverride!=null?dirtyOverride:z.dirty;
  const c=insCar(it),old=c?zoneOld(c,k):0;
  let p=dirty?P_DIRTY:P_CLEAN,pen=dirty?.10:.15;
  if(by){
    const L=lvOf(by),att=hasTrait(by,'Attento');
    p+=.025*L+(aptOf(by)-1)*.2+(att?(dirty?.12:.07):0)+(hasTrait(by,'Pignolo')?.04:0)-(hasTrait(by,'Pasticcione')?.1:0);
    pen*=Math.max(.25,1-.15*L)*(att?.5:1);
  }
  return clamp(p-old*pen,.05,.97);
}
export function insCheck(id,k,wash,by=null){
  const it=S.ins.find(x=>x.id===id);if(!it)return;
  const z=it.zones[k],cost=wash?2:1;
  if((by?by.time:S.time)<cost||z.st==='found')return;
  if(by)useTime(by,cost);else S.time-=cost;
  it.acted=true;
  if(wash)z.dirty=false;
  const pr=zoneChance(it,k,undefined,by),hit=it.dmg&&it.dmg.zone===k&&Math.random()<pr;
  z.checks=(z.checks||0)+1;
  const who=by?`Primo controllo di ${by.name.split(' ')[0]}`:wash?'Pulita e controllata':'Controllo '+z.checks;
  if(hit){z.st='found';z.last=`${who}: trovato ${dmgLabel(it.dmg).toLowerCase()}, listino ${eur(it.dmg.cost)}.`;return}
  z.esc=(z.esc??1)*(1-pr);
  const old=insCar(it)?zoneOld(insCar(it),k):0;
  z.st=(z.dirty||old)?'unsure':'ok';
  z.last=`${who}: nessun danno nuovo trovato${z.dirty?' (la zona è ancora sporca)':old?' (i danni vecchi possono nasconderne uno nuovo)':''}.`;
}
// probabilità che un danno, se c'era, sia già stato trovato
export const zoneSure=z=>Math.round((1-(z.esc??1))*100);
export function insMsg(txt,kind){ui.insMsg={txt,kind}}
export function insCheckInt(id,by=null){
  const it=S.ins.find(x=>x.id===id);if(!it||!it.int||it.int.st!=='none'||(by?by.time:S.time)<1)return;
  if(by)useTime(by,1);else S.time-=1;
  it.acted=true;it.int.st='checked';if(by)it.int.by=by.name.split(' ')[0];
}
export const intLabel=i=>i.cond==='sporchi'?'Pulizia interna straordinaria':`Interni rovinati ${i.sev}`;
export function insGamble(id,k){
  const it=S.ins.find(x=>x.id===id);if(!it||it.zones[k].st!=='unsure')return;
  it.acted=true;
  if(it.dmg&&it.dmg.zone===k){it.zones[k].st='found';insClose(id)}
  else{S.wk.dmgFalse++;rep(-2);loyal(it.cid,-50,'addebito contestato');log(`${it.cust} contesta l'addebito: ${ZSU[k]} di ${it.plate} non c'è nessun danno nuovo. Reputazione −2`,'rep');
    insMsg(`${it.plate}: addebito contestato. ${ZSU[k][0].toUpperCase()+ZSU[k].slice(1)} non c'era nessun danno nuovo${it.dmg?`; il danno vero era ${ZSU[it.dmg.zone]} e ora non è più addebitabile`:''}. Reputazione −2.`,'lose');
    insClose(id,false,true,true)}
}
export function insClose(id,skipped=false,contested=false,quiet=false){
  const it=S.ins.find(x=>x.id===id);if(!it)return;
  S.ins=S.ins.filter(x=>x!==it);delete ui.zone[id];
  if(it.acted)S.wk.inspected++;
  const c=insCar(it),msgs=[];let bad=false;
  // interni (l'assicurazione totale non li copre)
  const I=it.int;
  if(I&&I.cond!=='ok'){
    if(I.st==='checked'){
      money(I.cost,'interior');S.wk.intValue=(S.wk.intValue||0)+I.cost;rep(-.5);loyal(it.cid,-5,'addebito interni');
      log(`${intLabel(I)} su ${it.plate}: addebitati ${eur(I.cost)} a ${it.cust} (reputazione −0,5)`,'in');
      msgs.push(`${intLabel(I).toLowerCase()} addebitata, +${eur(I.cost)}`);
      if(I.cond==='rovinati'&&c)c.dmgs.push({id:S.nid++,zone:'int',type:'interni',sev:I.sev,cost:I.cost,day:S.day,cust:it.cust,status:'charged'});
    }else{
      S.wk.intLost=(S.wk.intLost||0)+I.cost;bad=true;
      if(I.cond==='sporchi'){const own=Math.round(I.cost*.5);money(-own,'wash');log(`Interni di ${it.plate} trovati molto sporchi dopo la chiusura: pulizia a tuo carico −${eur(own)}`,'out');msgs.push(`gli interni erano molto sporchi: pulizia a tuo carico −${eur(own)}`)}
      else{if(c)c.dmgs.push({id:S.nid++,zone:'int',type:'interni',sev:I.sev,cost:I.cost,day:S.day,cust:it.cust,status:'missed'});log(`Interni rovinati su ${it.plate} scoperti dopo la chiusura: non più addebitabili (persi ${eur(I.cost)}).`,'bad');msgs.push(`gli interni erano rovinati e non li hai controllati: persi ${eur(I.cost)}`)}
    }
  }
  const d=it.dmg,found=d&&it.zones[d.zone].st==='found';
  if(d){
    const rec={...d,day:S.day,cust:it.cust};
    const where=`${dmgLabel(d).toLowerCase()} ${ZSU[d.zone]} di ${it.plate}`;
    if(found){
      S.wk.dmgFound++;
      if(it.kasko){rec.status='covered';log(`Trovato ${where}: coperto dall'assicurazione totale di ${it.cust}. Listino ${eur(d.cost)}, nessun addebito.`);msgs.push(`${dmgLabel(d).toLowerCase()} registrato, coperto dall'assicurazione`)}
      else{rec.status='charged';money(d.cost,'damage');S.wk.dmgValue+=d.cost;const r=d.sev==='grave'?1:.5;rep(-r);loyal(it.cid,d.sev==='grave'?-15:-10,'danno addebitato');
        log(`Trovato ${where}: addebitati ${eur(d.cost)} da listino a ${it.cust} (reputazione −${r})`,'in');
        msgs.push(`${dmgLabel(d).toLowerCase()} ${ZSU[d.zone]} addebitato, +${eur(d.cost)} (reputazione −${String(r).replace('.',',')})`)}
    }else{
      rec.status='missed';S.wk.dmgMissed++;if(!it.kasko){S.wk.dmgLost+=d.cost;bad=true}
      log(`${where[0].toUpperCase()+where.slice(1)} ${skipped&&!it.acted?'non controllato':'non trovato'} al rientro: scoperto più tardi, non più addebitabile${it.kasko?' (era comunque coperto)':` (persi ${eur(d.cost)})`}.`,it.kasko?'info':'bad');
      if(!quiet)msgs.push(`c'era un ${dmgLabel(d).toLowerCase()} ${ZSU[d.zone]} che ti è sfuggito${it.kasko?' (coperto dall\'assicurazione)':`: persi ${eur(d.cost)}`}`);
    }
    if(c)c.dmgs.push(rec);
  }else if(!contested&&it.acted&&!(I&&I.cond!=='ok'))log(`Ispezione di ${it.plate} chiusa: nessun danno nuovo.`);
  if(!skipped)washRound();
  if(!skipped&&!contested){
    if(!msgs.length)msgs.push('nessun danno nuovo, interni in ordine');
    insMsg(`${it.plate}: ispezione chiusa · ${msgs.join(' · ')}.`,bad?'lose':'win');
  }
}
