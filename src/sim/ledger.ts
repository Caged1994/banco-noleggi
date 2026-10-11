import { S } from '../core/state.js';
import { clamp } from '../core/util.js';
import { INSUR_W, OFFICE_W } from '../data/catalog.js';
import { loanWeekly } from './bank.js';
export function log(txt,kind='info'){S.log.unshift({d:S.day,txt,kind});S.log.length=Math.min(S.log.length,150)}
// tag: rent, svc, extra, sell (entrate) · fixed, repair, wash, refund, buy (uscite)
export function money(n,tag){
  S.cash+=n;if(n>=0)S.today.in+=n;else S.today.out-=n;
  if(tag&&S.wk&&n){const b=n>=0?S.wk.inc:S.wk.out;b[tag]=(b[tag]||0)+Math.abs(n)}
}
export function newWeek(){return{no:Math.ceil(S.day/7),start:S.day,rep0:S.rep,inc:{},out:{},cat:{},svc:{},car:{},lost:{},ignored:0,dmgFound:0,dmgMissed:0,dmgFalse:0,inspected:0,dmgValue:0,dmgLost:0,intValue:0,intLost:0,noshow:0,probSolved:0,probLeft:0,overOk:0,overBad:0}}
export const wkSvc=s=>S.wk.svc[s]||(S.wk.svc[s]={prop:0,acc:0,req:0,inc:0});
export function rep(n){S.rep=clamp(S.rep+n,0,100)}
export const wages=()=>S.staff.reduce((a,x)=>a+x.wage,0);
export const weeklyCosts=()=>OFFICE_W+INSUR_W*S.fleet.length+wages()+(S.loans?loanWeekly():0);
export const daysToSunday=()=>(7-((S.day-1)%7)-1);
