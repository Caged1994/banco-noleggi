import { S } from '../core/state.js';
import { eur, pick, wpick } from '../core/util.js';
import { NAMES, ROLES, SURN } from '../data/catalog.js';
import { log } from './ledger.js';
export const staffOf=r=>S.staff.filter(x=>x.role===r);
export const dailyTime=()=>10+staffOf('rientri').reduce((a,x)=>a+3+2*x.level+(x.trait==='Veloce'?2:0),0);
export const attento=()=>staffOf('rientri').some(x=>x.trait==='Attento');
export const washCap=()=>staffOf('lavaggio').reduce((a,x)=>a+1+x.level+(x.trait==='Veloce'?2:0),0);
export const salesBoost=()=>1+staffOf('vendite').reduce((a,x)=>a+.1*x.level+(x.trait==='Persuasivo'?.1:0),0);
export function newCand(role){
  const level=+wpick({1:5,2:3,3:1}),trait=pick(ROLES[role].traits);
  const wage=Math.round(ROLES[role].base*(.75+.25*level)*(trait==='Economico'?.8:1)/10)*10;
  return{id:S.nid++,name:pick(NAMES)+' '+pick(SURN),role,level:+level,trait,wage};
}
export function genCands(){S.cands=Object.keys(ROLES).sort(()=>Math.random()-.5).map(newCand)}
export function hire(id){const c=S.cands.find(x=>x.id===id);if(!c||S.staff.length>=6)return;S.staff.push(c);S.cands=S.cands.filter(x=>x!==c);log(`Assunto ${c.name}, ${ROLES[c.role].nome.toLowerCase()} (${eur(c.wage)}/settimana).`,'info');if(c.role==='rientri')S.time+=3+2*c.level+(c.trait==='Veloce'?2:0)}
export function fire(id){const c=S.staff.find(x=>x.id===id);if(!c)return;S.staff=S.staff.filter(x=>x!==c);log(`${c.name} non lavora più per te.`,'info')}
export const rientriLv=()=>staffOf('rientri').reduce((a,x)=>a+x.level,0);
