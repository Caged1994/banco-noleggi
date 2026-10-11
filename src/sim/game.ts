import { newRival } from './rival.js';
import { S, ui, setState, setUi } from '../core/state.js';
import { log, newWeek } from './ledger.js';
import { CATS, CAT_KEYS, FIXED_SVC, GOAL, SVC } from '../data/catalog.js';
import { newCar, preDamage } from './fleet.js';
import { genMarket } from './market.js';
import { genCands } from './staff.js';
import { genReqs } from './clients.js';
import { planEvents } from './seasons.js';
import { eur } from '../core/util.js';
import { debt, fleetValue } from './bank.js';
export function newGame(){
  setState({day:1,cash:8000,rep:50,seats:2,gpsN:2,fleet:[],reqs:[],market:[],prices:{},sprices:{},log:[],hist:[8000],nid:1,won:false,lost:false,
     today:{in:0,out:0},stats:{rented:0,lost:0,svc:0},ins:[],reports:[],time:10,staff:[],cands:[],desk:[],loans:[],events:[],clients:[]});
  S.rival=newRival();
  S.wk=newWeek();
  CAT_KEYS.forEach(k=>S.prices[k]=CATS[k].base);
  FIXED_SVC.forEach(s=>S.sprices[s]=SVC[s].std);
  S.fleet.push(newCar('utilitaria',92,24000),newCar('utilitaria',78,61000),newCar('berlina',85,38000),newCar('suv',74,82000));
  preDamage(S.fleet[1],1);preDamage(S.fleet[3],2);
  setUi({tab:ui.tab||'banco',armed:null,preview:null,sel:{},checks:{},zone:{},report:null,dsel:{},hist:{},dcat:'berlina'});
  genMarket();genCands();genReqs();
  planEvents();
  log('1 gennaio, primo giorno di lavoro. È bassa stagione: pochi clienti, il momento giusto per imparare. Hai rilevato una piccola agenzia con 4 auto, 2 seggiolini e 2 GPS. Obiettivo: un patrimonio netto di '+eur(GOAL)+' (cassa + valore della flotta − debiti).','hdr');
}

/* ---------- banca ---------- */
export const netWorth=()=>Math.round(S.cash+fleetValue()-debt());
