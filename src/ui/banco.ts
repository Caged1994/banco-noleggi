import { S, ui } from '../core/state.js';
import { CATS, H, KASKO, PROBS, SVC, SVC_KEYS, ZONES, ZONE_KEYS } from '../data/catalog.js';
import { svcBlock, svcPrice } from '../sim/services.js';
import { eur } from '../core/util.js';
import { insCar, intLabel, zoneChance, zoneSure } from '../sim/inspection.js';
import { dmgLabel, openDmgs, zoneOld } from '../sim/fleet.js';
import { PLAYER_TIME } from '../sim/staff.js';
import { bestSeller, sellMul } from '../sim/crew.js';
import { dshort, wdd } from '../core/calendar.js';
import { carFor, colleagueCost, prepaid, probOptions, probPrice, swapOptions } from '../sim/pickups.js';
import { activeEvents } from '../sim/seasons.js';
export function svcChips(q,c){
  const checks=ui.checks[q.id]||[];
  return SVC_KEYS.map(s=>{
    const block=svcBlock(q,c,s),price=svcPrice(q,c,s),pr=c||s!=='upgrade'?` <b>${eur(price)}/g</b>`:'';
    if(q.ask.includes(s))return `<span class="svc ${block?'no':'inc'}" title="${block?'Richiesto ma non disponibile: '+block:'Richiesto dal cliente, già incluso'}"><span>${SVC[s].nome}</span>${block?' · '+block:' · richiesto'+pr}</span>`;
    if(q.tried[s]===true)return `<span class="svc ok">✓ ${SVC[s].nome}${block?' · '+block:pr}</span>`;
    if(q.tried[s]===false)return `<span class="svc no">✗ <span>${SVC[s].nome}</span></span>`;
    if(block)return `<span class="svc dis" title="${block}">${SVC[s].nome} · ${block}</span>`;
    return `<label class="svc"><input type="checkbox" id="svc-${q.id}-${s}" data-q="${q.id}" data-s="${s}" ${checks.includes(s)?'checked':''}>${SVC[s].nome}${pr}</label>`;
  }).join('');
}
// macchie di sporco e graffio: posizioni stabili ricavate dall'id
export function seeded(seed){let x=seed%2147483647||1;return()=>(x=x*16807%2147483647)/2147483647}
// icona per tipo di danno, disegnata attorno a (0,0)
export function dmgIcon(d,color,w=1.8){
  const t=`translate(${d.x} ${d.y}) rotate(${d.rot||0})`,sc=d.sev==='grave'?1.35:1;
  const g=inner=>`<g class="mk" transform="${t} scale(${sc})">${inner}</g>`;
  if(d.type==='graffio')return g(`<polyline points="-9,0 -5,-2.2 -2,1.2 2,-2 5,1 9,-1" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
  if(d.type==='ammaccatura')return g(`<ellipse rx="7" ry="5" fill="none" stroke="${color}" stroke-width="${w}"/><ellipse rx="3" ry="2" fill="${color}" fill-opacity=".5"/>`);
  if(d.type==='rottura')return g(`<path d="M0 0 L-7 -5 M0 0 L6 -6 M0 0 L7 4 M0 0 L-3 7 M0 0 L-8 2" stroke="${color}" stroke-width="${w*.8}" stroke-linecap="round"/>`);
  return g(`<rect x="-6" y="-4" width="12" height="8" rx="1.5" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="2.5 2"/>`);
}
export function carSvg(it){
  const sel=ui.zone[it.id],rnd=seeded(it.id*97+13);
  let marks='';
  for(const k of ZONE_KEYS){
    const z=ZONES[k],st=it.zones[k];
    const px=m=>z.x+m+rnd()*(z.w-2*m),py=m=>z.y+m+rnd()*(z.h-2*m);
    if(st.dirty)for(let n=0;n<4;n++)marks+=`<circle class="mk" cx="${px(4).toFixed(1)}" cy="${py(4).toFixed(1)}" r="${(3+rnd()*4).toFixed(1)}" fill="var(--dirt)" fill-opacity=".5"/>`;
    else{rnd();rnd()}
    const cx=z.x+z.w/2,cy=z.y+z.h/2;
    if(st.st==='found'){}
    else if(st.st==='ok')marks+=`<text class="mk" x="${cx}" y="${cy+5}" text-anchor="middle" font-size="15" font-weight="700" fill="var(--good)">✓</text>`;
    else if(st.st==='unsure')marks+=`<text class="mk" x="${cx}" y="${cy+6}" text-anchor="middle" font-size="17" font-weight="700" fill="var(--warn)">?</text>${st.checks>1?`<text class="mk" x="${cx+10}" y="${cy-4}" font-size="9" font-weight="700" fill="var(--warn)">×${st.checks}</text>`:''}`;
  }
  const car=insCar(it);
  if(car)openDmgs(car).filter(d=>d.zone!=='int').forEach(d=>marks+=dmgIcon(d,'var(--muted)',1.5));
  if(it.dmg&&it.zones[it.dmg.zone].st==='found')marks+=dmgIcon(it.dmg,'var(--bad)',2.4);
  const fill={none:'',ok:'var(--good-bg)',unsure:'var(--warn-bg)',found:'var(--bad-bg)'};
  const zones=ZONE_KEYS.map(k=>{const z=ZONES[k],st=it.zones[k].st;
    return `<rect class="zone${sel===k?' sel':''}" data-ins="${it.id}" data-z="${k}" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" ${fill[st]?`style="fill:${fill[st]};fill-opacity:.75"`:''}><title>${z.nome}</title></rect>`}).join('');
  return `<svg class="carsvg" viewBox="0 0 200 320" role="img" aria-label="Schema di ${it.plate} visto dall'alto">
    <rect x="18" y="62" width="14" height="40" rx="4" fill="var(--carline)"/><rect x="168" y="62" width="14" height="40" rx="4" fill="var(--carline)"/>
    <rect x="18" y="222" width="14" height="40" rx="4" fill="var(--carline)"/><rect x="168" y="222" width="14" height="40" rx="4" fill="var(--carline)"/>
    <rect x="12" y="106" width="16" height="9" rx="3" fill="var(--car)" stroke="var(--carline)" stroke-width="1.5"/><rect x="172" y="106" width="16" height="9" rx="3" fill="var(--car)" stroke="var(--carline)" stroke-width="1.5"/>
    <rect x="28" y="10" width="144" height="300" rx="44" fill="var(--car)" stroke="var(--carline)" stroke-width="2"/>
    <path d="M60 112 Q100 100 140 112 L134 128 Q100 120 66 128 Z" fill="var(--glass)"/>
    <path d="M66 238 Q100 244 134 238 L140 254 Q100 264 60 254 Z" fill="var(--glass)"/>
    ${zones}${marks}
  </svg>`;
}
export const ST_TXT={none:'Da controllare',ok:'Nessun danno nuovo visto',unsure:'Non si capisce se c\'è un danno nuovo',found:'Danno nuovo trovato'};
export function renderIns(){
  const box=document.getElementById('ins');
  const msg=ui.insMsg?`<div class="banner ${ui.insMsg.kind}" role="status" style="display:flex;gap:10px;justify-content:space-between;align-items:flex-start"><span>${ui.insMsg.txt}</span><button data-a="imsg" aria-label="Chiudi messaggio" style="padding:4px 8px">✕</button></div>`:'';
  if(!S.ins.length){box.innerHTML=msg;return}
  box.innerHTML=msg+`<div class="panel-h"><h2>Rientri da ispezionare</h2><span class="lbl">Il tuo tempo oggi <b class="num" style="color:${S.time?'var(--ink)':'var(--bad)'}">${S.time}/${PLAYER_TIME}</b></span></div>`+S.ins.map(it=>{
    const k=ui.zone[it.id],z=k&&it.zones[k];
    const found=ZONE_KEYS.some(x=>it.zones[x].st==='found');
    const checked=ZONE_KEYS.filter(x=>it.zones[x].st!=='none').length;
    let side;
    const car=insCar(it),old=k&&car?zoneOld(car,k):0,nf=it.dmg&&it.zones[it.dmg.zone].st==='found'?it.dmg:null;
    if(!z)side=`<p>Tocca una zona dello schema per ispezionarla. Lo sporco (macchie marroni) e i danni vecchi non riparati (in grigio) rendono più difficile vedere un danno nuovo.</p>`;
    else side=`<div class="zsel">${ZONES[k].nome}${z.dirty?' · sporca':''}${old?` · ${old} dann${old>1?'i':'o'} vecch${old>1?'i':'io'}`:''}</div><p>${ST_TXT[z.st]}${nf&&nf.zone===k?`: <b>${dmgLabel(nf)}</b>, listino ${eur(nf.cost)}`:''}</p>
      ${z.last?`<div class="reply">${z.last}</div>`:''}
      ${z.checks&&z.st!=='found'?`<div><span class="lbl">Sicurezza ${zoneSure(z)}%</span><div class="hbar good" style="margin-top:3px"><i style="width:${zoneSure(z)}%"></i></div><small style="color:var(--muted);font-size:12px">Se ci fosse un danno nuovo qui, l'avresti trovato con questa probabilità.</small></div>`:''}
      <div class="req-act">${z.st!=='found'?`
        <button data-a="icheck" data-id="${it.id}" ${S.time<1?'disabled':''}>${z.st==='none'?'Controlla':'Ricontrolla'} · 1 tempo · ${Math.round(zoneChance(it,k)*100)}%</button>
        ${z.dirty?`<button data-a="iwash" data-id="${it.id}" ${S.time<2?'disabled':''}>Pulisci e controlla · 2 tempo · ${Math.round(zoneChance(it,k,false)*100)}%</button>`:''}
        ${z.st==='unsure'&&!it.kasko?`<button class="danger" data-a="igamble" data-id="${it.id}" title="Se non c'è un danno nuovo il cliente contesta: −2 reputazione">Addebita lo stesso · se sbagli −2 rep.</button>`:''}`:''}
      </div>`;
    return `<article class="ins">
      <div class="ins-h"><b>${it.plate}</b><span>${it.model} · riconsegnata da ${it.cust}</span>${it.washedBy||it.checkedBy?`<span class="chip c-acc">${[it.washedBy?'lavata da '+it.washedBy:'',it.checkedBy?'primo controllo di '+it.checkedBy:''].filter(Boolean).join(' · ')}</span>`:''}${it.kasko?'<span class="chip c-ok">Assicurazione totale · danni coperti</span>':'<span class="chip c-warn">Senza assicurazione · franchigia addebitabile</span>'}</div>
      <div class="ins-body">${carSvg(it)}
        <div class="ins-side">${side}
          <div style="border-top:1px solid var(--line);padding-top:8px;display:grid;gap:6px">
            <div class="introw"><span><b>Interni</b> · ${!it.int||it.int.st==='none'?'da controllare':it.int.cond==='ok'?'<span style="color:var(--good)">puliti e in ordine</span>':`<span style="color:var(--bad)">${intLabel(it.int).toLowerCase()} · ${eur(it.int.cost)}</span>`}</span>
              ${it.int&&it.int.st==='none'?`<button data-a="iint" data-id="${it.id}" ${S.time<1?'disabled':''}>Controlla interni · 1 tempo</button>`:''}</div>
            <span class="lbl">${checked}/${ZONE_KEYS.length} zone ispezionate</span>
            <div class="req-act"><button class="pri" data-a="iclose" data-id="${it.id}">${(()=>{const t=(found&&!it.kasko?it.dmg.cost:0)+(it.int&&it.int.st==='checked'&&it.int.cond!=='ok'?it.int.cost:0);return t?`Chiudi e addebita ${eur(t)}`:found?'Chiudi · danno coperto':'Chiudi ispezione'})()}</button></div>
            <p style="font-size:12px">Un danno non trovato si scopre dopo e non è più addebitabile. Le ispezioni aperte si chiudono da sole a fine giornata.</p>
          </div>
        </div>
      </div></article>`}).join('');
}
export function renderDesk(){
  const box=document.getElementById('desk');
  if(!S.desk.length){box.innerHTML='';return}
  box.innerHTML=`<div class="panel-h"><h2>Ritiri da risolvere</h2><span class="lbl">${S.desk.length} · entro fine giornata</span></div>`+S.desk.map(k=>{
    const b=k.b,per=`${CATS[b.cat].nome} dal ${wdd(b.start)} al ${wdd(b.end)} · prepagato ${eur(prepaid(b))}`;
    if(k.kind==='over'){
      const opts=swapOptions(b),sel=opts.find(x=>x.id===ui.dsel[k.id])||opts[0];
      return `<article class="req case">
        <div class="req-top"><span class="req-name">${b.cust}</span><span class="chip c-bad">Overbooking</span></div>
        <div class="req-meta">${per}</div>
        <div class="req-note">«Ho prenotato, dov'è la mia auto?» La ${k.plate} è già occupata da un altro cliente.</div>
        ${opts.length?`<div class="req-act"><select id="dsel-${k.id}" data-desk="${k.id}" aria-label="Auto alternativa per ${b.cust}">${opts.map(o=>`<option value="${o.id}" ${o===sel?'selected':''}>${o.plate} · ${o.model}${o.cat!==b.cat?' (upgrade gratuito)':''} · ${o.cond}%${o.dirty?' · sporca':''}</option>`).join('')}</select>
          <button class="pri" data-a="dswap" data-id="${k.id}">Consegna questa</button></div>`:`<span class="chip c-mut">Nessuna auto adatta libera per tutto il periodo</span>`}
        <div class="req-act">
          <button data-a="dcol" data-id="${k.id}">Auto da un collega · −${eur(colleagueCost(b))}</button>
          <button class="danger" data-a="dsend" data-id="${k.id}">Manda via · rimborso ${eur(prepaid(b))}, −6 reputazione</button>
        </div></article>`;
    }
    const P=PROBS[k.ptype],c=carFor(b),opts=probOptions(k),sel=opts.find(x=>x.id===ui.dsel[k.id])||opts[0];
    const can=k.ptype!=='ritardo'||opts.length;
    const detail=k.ptype==='deposito'?`${eur(KASKO[c.cat])}/g × ${b.days} g`:k.ptype==='patente'?`listino ${eur(S.prices[c.cat])}/g × ${b.days} g`:`${eur(S.sprices.upgrade)}/g × ${b.days} g`;
    const chance=Math.round(Math.min(.95,P.acc)*100),sl=bestSeller(),slc=sl?Math.round(Math.min(.95,P.acc*sellMul(sl))*100):0;
    return `<article class="req case">
      <div class="req-top"><span class="req-name">${b.cust}</span><span class="chip c-warn">${P.nome}</span></div>
      <div class="req-meta">${per} · ${c?c.plate+' '+c.model:''}</div>
      <div class="req-note">${P.txt}</div>
      ${k.ptype==='ritardo'?(opts.length?`<div class="req-act"><select id="dsel-${k.id}" data-desk="${k.id}" aria-label="Auto superiore per ${b.cust}">${opts.map(o=>`<option value="${o.id}" ${o===sel?'selected':''}>${o.plate} · ${o.model} · ${CATS[o.cat].nome} · ${o.cond}%</option>`).join('')}</select></div>`:`<span class="chip c-mut">Nessuna auto superiore libera: puoi solo mandarlo via</span>`):''}
      <div class="req-total">Soluzione: <b>${P.sol}</b> · ${detail} = <b class="num">${eur(probPrice(k))}</b> · accetta circa ${chance}% delle volte</div>
      <div class="req-act">
        ${can?`<button class="pri" data-a="psolve" data-id="${k.id}">Proponi soluzione · +${eur(probPrice(k))}</button>`:''}
        ${can&&sl?`<button data-a="pdelegate" data-id="${k.id}" title="Usa 1 tempo di ${sl.name}">Affida a ${sl.name.split(' ')[0]} · circa ${slc}%</button>`:''}
        <button data-a="psend" data-id="${k.id}">Manda via · trattieni ${eur(prepaid(b))}</button>
      </div></article>`;
  }).join('');
}
// mini calendario di 14 giorni dell'auto scelta, con il periodo richiesto
export function miniStrip(q,c){
  if(!c)return'';
  const cells=[...Array(H)].map((_,i)=>{const d=S.day+i,want=d>=q.start&&d<q.start+q.days,busy=c.bookings.some(b=>b.start<=d&&d<b.end),shop=c.shopUntil>d,ev=activeEvents(d).length;
    const cls=want&&(busy||shop)?'clash':want?'want':shop?'shop':busy?'busy':'';
    return `<i class="${cls}${ev?' ev':''}" title="${wdd(d)}${busy?' · occupata':shop?' · officina':''}${ev?' · '+activeEvents(d).map(e=>e.nome).join(', '):''}"></i>`}).join('');
  return `<div><div class="minilbl"><span>${dshort(S.day)}</span><span>${c.plate} nei prossimi 14 giorni</span><span>${dshort(S.day+H-1)}</span></div><div class="mini" aria-hidden="true">${cells}</div></div>`;
}
