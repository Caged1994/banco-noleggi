import { CATS, CAT_KEYS, H } from '../data/catalog.js';
import { S, ui } from '../core/state.js';
import { MSHORT, dateOf, isWE, wd, wdd } from '../core/calendar.js';
import { bar, svcTag } from './common.js';
import { STOCK, freeNow, usedOn } from '../sim/fleet.js';
import { surname, svcNames } from '../core/util.js';
import { selectedCar } from '../sim/desk.js';
export function renderPlan(){
  const days=[...Array(H)].map((_,i)=>S.day+i);
  const cls=(d,i)=>i===0?' today':isWE(d)?' we':'';
  const cells=days.map((d,i)=>`<div class="pc${cls(d,i)}" style="grid-column:${i+2}"></div>`).join('');
  let html=`<div class="prow hd"><div class="pl"><span class="lbl">Auto</span></div>${days.map((d,i)=>{const t=dateOf(d);return `<div class="pc${cls(d,i)}" style="grid-column:${i+2}">${wd(d)}<br>${t.dom}${t.dom===1||i===0?'<br>'+MSHORT[t.m]:''}</div>`}).join('')}</div>`;
  const evs=S.events.filter(e=>e.end>S.day&&e.start<S.day+H);
  if(evs.length)html+=`<div class="prow"><div class="pl"><b>Eventi</b><small>${evs.length} nei 14 giorni</small></div>${cells}${evs.map(e=>bar('ev',e.start,e.end,e.nome,`${e.nome}: ${e.desc}`)).join('')}</div>`;
  for(const k of CAT_KEYS){
    const cars=S.fleet.filter(c=>c.cat===k),asks=S.reqs.filter(q=>q.cat===k).length;
    if(!cars.length&&!asks)continue;
    const freeToday=cars.filter(freeNow).length;
    html+=`<div class="pcat"><b>${CATS[k].nome}</b><span>${cars.length} auto · ${freeToday} libere oggi</span>${asks?`<span class="${asks>freeToday?'hot':''}">${asks} richiest${asks>1?'e':'a'} al banco</span>`:''}</div>`;
    for(const c of cars){
      let bars='';
      c.bookings.forEach(b=>{const cls=b.ob?'book ob':b.st==='out'?'rent':b.st==='waiting'?'book wait':'book';bars+=bar(cls,b.start,b.end,surname(b.cust)+svcTag(b.svc),`${b.cust} · ${wdd(b.start)} → rientro ${wdd(b.end)}${b.svc.length?' · '+svcNames(b.svc):''}${b.ob?' · overbooking':''}${b.st==='waiting'?' · problema al banco':''}`)});
      if(c.shopUntil>S.day)bars+=bar('shop',S.day,c.shopUntil,'Officina',`In officina fino a ${wdd(c.shopUntil)}`);
      const p=ui.preview;
      if(p&&p.car===c.id)bars+=bar('prev',p.start,p.end,surname(p.name),`Proposta per ${p.name}`);
      html+=`<div class="prow"><div class="pl"><b>${c.plate}</b><small>${c.model} · ${c.cond}%${c.dirty?' · <span class="dirty">sporca</span>':''}</small></div>${cells}${bars}</div>`;
    }
  }
  // riga seggiolini
  for(const kind of ['seat','gps']){const K=STOCK[kind];
    const row=days.map((d,i)=>{const f=S[K.key]-usedOn(kind,d);return `<div class="pc${cls(d,i)}" style="grid-column:${i+2};display:flex;align-items:center;justify-content:center;font:600 11px var(--f-mono);color:${f<=0?'var(--bad)':'var(--muted)'}">${f}</div>`}).join('');
    html+=`<div class="pcat"><b>${K.plur}</b><span>${S[K.key]} in magazzino · disponibili per giorno</span></div><div class="prow"><div class="pl"><small>Liberi</small></div>${row}</div>`;}
  document.getElementById('plan').innerHTML=html;
}
export function setPreview(reqId){
  const q=S.reqs.find(r=>r.id===reqId);const c=q&&selectedCar(q);
  const np=q&&c?{car:c.id,start:q.start,end:q.start+q.days,name:q.name,req:q.id}:null;
  if(JSON.stringify(ui.preview)===JSON.stringify(np))return;
  ui.preview=np;renderPlan();
}
