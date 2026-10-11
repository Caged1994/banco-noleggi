import { REVISION_COST, TIRE_COST, canChangeTires, canWork, inWinter, kmToService, maintIssues, revDaysLeft, serviceCost, tireTarget, tiresToChange } from '../sim/maintenance.js';
import { RIVAL_NAME, RIVAL_SLOGAN, rivalPrice } from '../sim/rival.js';
import { renderClients, tierChip } from './clients.js';
import { S, ui } from '../core/state.js';
import { clamp, eur, svcNames } from '../core/util.js';
import { MNAME, dateOf, dshort, isWE, wdd, workEnd } from '../core/calendar.js';
import { netWorth } from '../sim/game.js';
import { FRANCHIGIA, CATS, CAT_KEYS, CLEAN, CLEAN_INT, DMG_CAT, DMG_KEYS, DMG_TYPES, FIXED_SVC, GOAL, KASKO, PRE_DISC, REPAIR_SHARE, SVC, SVC_KEYS, TYPES, dmgCost, zn } from '../data/catalog.js';
import { debt, fleetValue } from '../sim/bank.js';
import { condColor, spark } from './common.js';
import { carRate, obOptions, optionsFor, selectedCar } from '../sim/desk.js';
import { includedSvc, svcBlock, svcPrice } from '../sim/services.js';
import { miniStrip, renderDesk, renderIns, svcChips } from './banco.js';
import { STOCK, repairEnd, canRepair, canSell, curBooking, dmgLabel, dmgRepairCost, freeNow, nextBooking, openDmgs, repairCost, repairDays, sellPrice, wearCost } from '../sim/fleet.js';
import { renderPlan } from './planning.js';
import { renderBank } from './manage.js';
import { renderCrew, renderTeam } from './team.js';
import { boxValue, bestSeller, inHouse, mechRepairCost, mechSvcCost, mechTireCost } from '../sim/crew.js';
import { PROPOSE_T } from '../sim/services.js';
import { TIRE_PRICE, tireOne } from '../sim/incidents.js';
import { renderEvList, renderSeason, renderTabs } from './tabs.js';
import { renderReport } from './report.js';
import { carPriceMul } from '../sim/seasons.js';
import { DEALER, DEALERS } from '../sim/market.js';
import { daysToSunday, weeklyCosts } from '../sim/ledger.js';
import { save } from '../app/save.js';
// Riga di manutenzione nella scheda dell'auto: stato e pulsanti dei lavori.
function maintRow(c){
  const iss=maintIssues(c),k=kmToService(c),r=revDaysLeft(c);
  const cls=l=>l==='bad'?'c-bad':'c-warn';
  const info=`<span class="mi">Tagliando ${k>=0?`tra ${k.toLocaleString('it-IT')} km`:`<b>scaduto</b>`} · Gomme ${c.tires} · Revisione ${r>=0?`entro il ${dshort(c.revDue)}`:'<b>scaduta</b>'}</span>`;
  const work=canWork(c);
  // con il meccanico e il box il lavoro si fa in sede: costa meno e l'auto non si ferma
  const hs=inHouse('svc',c),ht=inHouse('tires',c),hr=inHouse('rev',c);
  const btns=[
    k<=3000?(hs?`<button data-a="mservice" data-id="${c.id}" ${S.cash<hs.cost?'disabled':''} title="${hs.e.name}, ${hs.t} tempo: l'auto resta disponibile">Tagliando in sede ${eur(hs.cost)}</button>`
      :`<button data-a="service" data-id="${c.id}" ${!work||S.cash<serviceCost(c)?'disabled':''} title="Officina esterna: pronta ${wdd(workEnd(S.day,1))}">Tagliando ${eur(serviceCost(c))}</button>`):'',
    r<=60?(hr?`<button data-a="mrev" data-id="${c.id}" ${S.cash<hr.cost?'disabled':''} title="${hr.e.name}, ${hr.t} tempo: l'auto resta disponibile">Revisione in sede ${eur(hr.cost)}</button>`
      :`<button data-a="revision" data-id="${c.id}" ${!work||S.cash<REVISION_COST?'disabled':''} title="Officina esterna: pronta ${wdd(workEnd(S.day,1))}">Revisione ${eur(REVISION_COST)}</button>`):'',
    ht?`<button data-a="mtires" data-id="${c.id}" ${S.cash<ht.cost?'disabled':''} title="${ht.e.name}, ${ht.t} tempo">Monta ${tireTarget(c)} in sede ${eur(ht.cost)}</button>`
      :canChangeTires(c)?`<button data-a="tires" data-id="${c.id}" ${S.cash<TIRE_COST[c.cat]?'disabled':''} title="In giornata">Monta ${tireTarget(c)} ${eur(TIRE_COST[c.cat])}</button>`:'',
  ].join('');
  return `<div class="maint">${iss.map(i=>`<span class="chip ${cls(i.lvl)}">${i.txt}</span>`).join(' ')}${info}${btns?`<div class="acts">${btns}</div>`:''}</div>`;
}
export function render(){
  document.getElementById('stats').innerHTML=`
    <div class="stat"><span class="lbl">Cassa</span><b class="${S.cash<0?'neg':''}">${eur(S.cash)}</b></div>
    <div class="stat"><span class="lbl">Reputazione</span><b>${Math.round(S.rep)}<small style="font-size:14px;color:var(--muted)">/100</small></b><div class="repbar"><i style="width:${S.rep}%"></i></div></div>
    <div class="stat"><span class="lbl">Oggi</span><b>${wdd(S.day)}</b></div>
    <div class="stat"><span class="lbl">Incasso servizi</span><b>${eur(S.stats.svc)}</b><span class="lbl" style="letter-spacing:.04em">${S.stats.rented} noleggi</span></div>`;
  const nw=netWorth(),pct=clamp(nw/GOAL*100,0,100);
  document.getElementById('goal').innerHTML=`<span class="lbl" title="Cassa ${eur(S.cash)} + flotta ${eur(fleetValue())}${boxValue()?` + box officina ${eur(boxValue())}`:''} − debiti ${eur(debt())}">Patrimonio netto ${eur(nw)} / ${eur(GOAL)}</span><div class="track"><i style="width:${pct}%"></i></div><span class="num" style="font-size:13px">${Math.round(pct)}%</span>${spark()}`;
  document.getElementById('banner').innerHTML=S.lost?`<div class="banner lose">Fallimento al giorno ${S.day}. La cassa è scesa sotto ${eur(-3000)}. Premi «Nuova partita» per riprovare.</div>`:S.won?`<div class="banner win">Obiettivo raggiunto! Puoi continuare a giocare per far crescere la flotta.</div>`:'';

  // richieste
  document.getElementById('reqcount').textContent=S.reqs.length?S.reqs.length+' in attesa · rispondi entro stasera':'';
  const seller=bestSeller();
  document.getElementById('reqs').innerHTML=S.reqs.length?S.reqs.map(q=>{
    const pre=q.start>S.day,T=TYPES[q.type],price=pre?Math.round(S.prices[q.cat]*PRE_DISC):S.prices[q.cat],ok=price<=q.budget,rate=carRate(q);
    const free=optionsFor(q),obs=obOptions(q),opts=free.concat(obs),c=selectedCar(q),isOb=c&&obs.includes(c);
    const optTag=o=>`<option value="${o.id}" ${o===c?'selected':''}>${o.plate} · ${o.model}${o.cat!==q.cat?' (upgrade)':''} · ${o.cond}%${o.dirty?' · sporca':''}</option>`;
    const inc=c?includedSvc(q,c):[],svcRate=inc.reduce((a,s)=>a+svcPrice(q,c,s),0),tot=(rate+svcRate)*q.days;
    const canPropose=c&&SVC_KEYS.some(s=>!q.ask.includes(s)&&!(s in q.tried)&&!svcBlock(q,c,s));
    return `<article class="req" data-req="${q.id}">
      <div class="req-top"><span class="req-name">${q.name}</span><span>${pre?`<span class="chip c-mut">Prenotazione −20%</span> `:''}${tierChip(q)}<span class="chip c-acc">${T.label}</span></span></div>
      <div class="req-meta">Cerca <b>${CATS[q.cat].nome}</b> · ${pre?`dal <b>${wdd(q.start)}</b>, `:'da <b>oggi</b>, '}${q.days} ${q.days>1?'giorni':'giorno'} (rientro ${wdd(q.start+q.days)}) · budget fino a <b class="num">${eur(q.budget)}/g</b></div>
      <div class="req-note">«${q.note}»</div>
      <div>${ok?`<span class="chip c-ok">${pre?'Prezzo prenotazione':'Listino'} ${eur(price)}/g · accetta</span>`:`<span class="chip c-warn">${pre?'Prezzo prenotazione':'Listino'} ${eur(price)}/g troppo caro · sconto a ${eur(q.budget)}</span>`}</div>
      ${opts.length?`
        <div class="req-act"><select id="sel-${q.id}" data-req="${q.id}" aria-label="Auto per ${q.name}">${free.length&&obs.length?`<optgroup label="Libere">${free.map(optTag).join('')}</optgroup>`:free.map(optTag).join('')}${obs.length?`<optgroup label="Overbooking (già prenotate)">${obs.map(optTag).join('')}</optgroup>`:''}</select></div>
        ${miniStrip(q,c)}
        ${isOb?`<div><span class="chip c-bad">Overbooking</span> <span class="req-total">L'auto è già prenotata in quel periodo. Se si presentano entrambi i clienti dovrai trovare una soluzione al banco.</span></div>`:''}
        <span class="lbl">Servizi</span>
        <div class="svcs">${svcChips(q,c)}</div>
        ${q.reply?`<div class="reply">«${q.reply}»</div>`:''}
        <div class="req-total">Auto <b class="num">${eur(rate)}/g</b>${svcRate?` + servizi <b class="num">${eur(svcRate)}/g</b>`:''} × ${q.days} g</div>
        <div class="req-act">
          ${canPropose?`<button data-a="propose" data-id="${q.id}" ${S.time<PROPOSE_T?'disabled title="Hai finito il tempo di oggi"':''}>Proponi servizi · ${PROPOSE_T} tempo</button>`:''}
          ${seller&&free.length?`<button data-a="delegate" data-id="${q.id}" title="${seller.name} sceglie l'auto e propone i servizi con il suo tempo (1 + 1 per servizio)">Affida a ${seller.name.split(' ')[0]}</button>`:''}
          <button class="pri" data-a="assign" data-id="${q.id}" ${S.lost?'disabled':''}>${pre?'Prenota':'Noleggia'} ${eur(tot)}</button>
          <button data-a="decline" data-id="${q.id}" title="${pre?'Rifiutare una prenotazione che puoi servire costa 0,5 di reputazione':'Nessun calo di reputazione'}">Rifiuta</button>
        </div>`
      :`<div class="req-act"><span class="chip c-mut">Nessuna auto adatta libera · nessun calo di reputazione</span><button data-a="decline" data-id="${q.id}">Congeda</button></div>`}
    </article>`}).join(''):`<div class="empty">Nessun cliente al banco. Chiudi la giornata per far entrare i prossimi.</div>`;

  // flotta
  const free=S.fleet.filter(freeNow).length;
  const tch=tiresToChange();
  document.getElementById('fleetcount').innerHTML=`${free} libere su ${S.fleet.length}${tch.length?` <button data-a="tiresall">Gomme ${inWinter(S.day)?'invernali':'estive'} a ${tch.length} aut${tch.length>1?'o':'o'} · ${eur(tch.reduce((a,c)=>a+TIRE_COST[c.cat],0))}</button>`:''}`;
  document.getElementById('fleet').innerHTML=S.fleet.length?S.fleet.map(c=>{
    const b=curBooking(c),nb=nextBooking(c);let st;
    if(b)st=`<span class="chip c-acc">Noleggiata · rientra ${wdd(b.end)}</span>`;
    else if(c.shopUntil>S.day)st=`<span class="chip c-mut">${c.shopWhat||'Officina'} · pronta ${wdd(c.shopUntil)}</span>`;
    else st=c.dirty?`<span class="chip c-warn">Libera · sporca</span>`:`<span class="chip c-ok">Libera</span>`;
    if(nb&&nb!==b)st+=` <span class="chip c-mut">Prenotata dal ${wdd(nb.start)}</span>`;
    const isFree=freeNow(c),rc=repairCost(c),sv=sellPrice(c),armed=ui.armed==='sell-'+c.id,od=openDmgs(c),grave=od.some(d=>d.sev==='grave');
    const dchip=od.length?` <span class="chip ${grave||od.length>=3?'c-bad':'c-warn'}" title="${od.map(dmgLabel).join(', ')}">${od.length} dann${od.length>1?'i':'o'}${grave||od.length>=3?' visibili':''}</span>`:'';
    const STS={charged:['Addebitato','c-ok'],covered:['Coperto da assicurazione','c-acc'],missed:['Non addebitato','c-bad'],old:['Preesistente','c-mut']};
    const hist=ui.hist[c.id]?`<div class="hist">${c.dmgs.length?c.dmgs.slice().reverse().map(d=>`<div class="hrow"><span class="d">${d.day?dshort(d.day):'—'}</span><span class="l"><b>${dmgLabel(d)}</b> · ${zn(d.zone).toLowerCase()}<small>${d.cust}</small></span><span class="chip ${STS[d.status][1]}">${STS[d.status][0]}</span><span class="num">${eur(d.cost)}</span><span class="chip ${d.repaired?'c-ok':'c-mut'}">${d.repaired?(d.repaired>S.day?'In officina':'Riparato '+dshort(d.repaired)):'Da riparare'}</span></div>`).join(''):'<div class="hrow"><span class="l"><small>Nessun danno registrato.</small></span></div>'}</div>`:'';
    return `<article class="car">
      <span class="plate"><span>${c.plate.slice(0,2)} ${c.plate.slice(2,5)} ${c.plate.slice(5)}</span></span>
      <div class="car-info">
        <div class="car-name">${c.model} <small>${CATS[c.cat].nome}</small></div>
        <div class="car-line">${st}<span><span class="cond"><i style="width:${c.cond}%;background:${condColor(c.cond)}"></i></span> ${c.cond}%</span><span class="num">${c.km.toLocaleString('it-IT')} km</span>${dchip}${c.fragile?' <span class="chip c-warn" title="Rischio di guasto più alto a ogni giorno di noleggio">Meccanica fragile</span>':''}${b?`<span>${b.cust}${b.svc.length?' · '+svcNames(b.svc):''}</span>`:''}</div>
      </div>
      <div class="acts"><button data-a="hist" data-id="${c.id}" aria-expanded="${!!ui.hist[c.id]}">${ui.hist[c.id]?'Chiudi storico':'Storico danni'}</button>${isFree?`
        ${c.dirty?`<button data-a="clean" data-id="${c.id}" ${S.cash<CLEAN?'disabled':''}>Lava ${eur(CLEAN)}</button>`:''}
        ${(()=>{const hp=inHouse('repair',c);return hp?`<button data-a="mrepair" data-id="${c.id}" ${S.cash<hp.cost?'disabled':''} title="${hp.e.name}, ${hp.t} tempo: l'auto resta disponibile${!S.box.ponte&&od.length?' · solo usura, per i danni serve il ponte':''}">Ripara in sede ${eur(hp.cost)}</button>`:''})()}
        ${c.cond<100||od.length?`<button data-a="repair" data-id="${c.id}" ${(S.cash<rc||!canRepair(c))?'disabled':''} title="${canRepair(c)?`Usura ${eur(wearCost(c))} + danni ${eur(dmgRepairCost(c))} · pronta ${wdd(repairEnd(c))}${isWE(S.day)?' (officina chiusa nel weekend)':''}`:'Prenotata: non c\'è tempo per l\'officina'}">Officina ${eur(rc)}</button>`:''}
        ${canSell(c)?`<button class="danger ${armed?'armed':''}" data-a="sell" data-id="${c.id}">${armed?'Conferma '+eur(sv):'Vendi'}</button>`:''}`:''}
      </div>${maintRow(c)}${hist}</article>`}).join(''):`<div class="empty">Non hai auto. Comprane una dal mercato qui sotto.</div>`;

  document.getElementById('incbox').innerHTML=S.todayInc&&S.todayInc.length?`<div class="banner lose incs" role="status"><b>Imprevisti di oggi</b><ul>${S.todayInc.map(t=>`<li>${t}</li>`).join('')}</ul></div>`:'';
  renderPlan();
  renderIns();
  renderDesk();
  renderTeam();
  renderCrew();
  renderTabs();
  renderSeason();
  renderEvList();
  renderClients();
  document.getElementById('backempty').innerHTML=!S.ins.length&&!S.desk.length?'<div class="panel-h"><h2>Rientri e ritiri</h2></div><div class="empty">Nessun rientro da ispezionare e nessun ritiro da risolvere.</div>':'';
  renderBank();
  renderReport();

  // listino
  const stepper=(key,val,step,label)=>`<div class="stepper"><button data-a="price" data-k="${key}" data-d="-${step}" aria-label="Riduci">−</button><input id="price-${key.replace(':','-')}" class="num" type="number" min="1" step="1" value="${val}" data-k="${key}" aria-label="Prezzo ${label}"><button data-a="price" data-k="${key}" data-d="${step}" aria-label="Aumenta">+</button></div>`;
  const rivTxt=k=>{const r=rivalPrice(k),d=Math.round((S.prices[k]/r-1)*100);return `${RIVAL_NAME} ${eur(r)}/g · <span style="color:${d>10?'var(--bad)':d<-5?'var(--good)':'var(--muted)'}">${d>0?'sei il '+d+'% più caro':d<0?'sei il '+(-d)+'% più economico':'stesso prezzo'}</span>`};
  document.getElementById('prices').innerHTML=`<div class="rival"><b>Concorrenza: ${RIVAL_NAME}</b><span class="slogan">${RIVAL_SLOGAN}</span><small>Catena low cost davanti alla stazione. Se sei più caro, una parte dei clienti va da lei (i fedeli mai); se sei più economico, qualche suo cliente viene da te. Ogni lunedì adegua i prezzi ai tuoi.</small></div>`
    +CAT_KEYS.map(k=>`<div class="row"><div class="l">${CATS[k].nome}<small>Media di mercato ${eur(CATS[k].base)}/g</small><small>${rivTxt(k)}</small></div>${stepper(k,S.prices[k],5,CATS[k].nome)}</div>`).join('')
    +`<span class="lbl" style="display:block;margin-top:10px">Servizi al giorno</span>`
    +FIXED_SVC.map(s=>`<div class="row"><div class="l">${SVC[s].nome}<small>Uguale per ogni auto · abituale ${eur(SVC[s].std)}/g</small></div>${stepper('svc:'+s,S.sprices[s],1,SVC[s].nome)}</div>`).join('')
    +`<div class="row"><div class="l">Assicurazione totale e franchigia<small>Tariffa fissa per tipo di veicolo. Senza assicurazione totale il cliente paga i danni e, per furto, incendio o incidente, fino alla franchigia.</small></div></div>`
    +CAT_KEYS.map(k=>`<div class="row" style="padding:3px 0 3px 12px"><div class="l"><small style="font-size:13px;color:var(--ink)">${CATS[k].nome}</small></div><span class="num" style="font-size:13px;font-weight:600">${eur(KASKO[k])}/g · franchigia ${eur(FRANCHIGIA[k])}</span></div>`).join('')
    +`<div class="panel-h" style="margin-top:12px"><span class="lbl">Listino danni</span><select id="dcat" aria-label="Categoria per il listino danni">${CAT_KEYS.map(k=>`<option value="${k}" ${ui.dcat===k?'selected':''}>${CATS[k].nome}</option>`).join('')}</select></div>
      <div class="dtab"><span></span><span class="lbl">Lieve</span><span class="lbl">Grave</span>${DMG_KEYS.map(t=>`<span>${DMG_TYPES[t].nome}${DMG_TYPES[t].ex?`<small>${DMG_TYPES[t].ex}</small>`:''}</span><span class="num">${eur(dmgCost(ui.dcat,t,'lieve','front'))}</span><span class="num">${eur(dmgCost(ui.dcat,t,'grave','front'))}</span>`).join('')}
        <span>${DMG_TYPES.interni.nome}<small>${DMG_TYPES.interni.ex}</small></span><span class="num">${eur(dmgCost(ui.dcat,'interni','lieve','int'))}</span><span class="num">${eur(dmgCost(ui.dcat,'interni','grave','int'))}</span>
        <span>Pulizia interna straordinaria<small>interni molto sporchi, peli, sabbia, odori</small></span><span class="num">${eur(Math.round(CLEAN_INT*DMG_CAT[ui.dcat]/5)*5)}</span><span class="num">—</span></div>
      <small style="color:var(--muted);font-size:12px">Prezzi esterni per paraurti e fiancate: cofano ×1,15, tetto ×1,3. Gli interni non sono coperti dall'assicurazione totale. L'officina costa il ${Math.round(REPAIR_SHARE*100)}% del listino.</small>`;

  // mercato
  const nm=S.day+(((3-(S.day-1)%3)%3)||3);
  const pmul=carPriceMul(S.day),ptxt=pmul>1.02?`usato caro (+${Math.round((pmul-1)*100)}%)`:pmul<.98?`usato a buon prezzo (−${Math.round((1-pmul)*100)}%)`:'prezzi nella media';
  document.getElementById('mktnote').textContent=`Nuove offerte ${wdd(nm)} · ${MNAME[dateOf(S.day).m]}: ${ptxt}`;
  const D=DEALER(ui.dealer)||DEALERS[1];
  const chips=(tipi,label)=>`<span class="lbl">${label}</span><div class="dchips">${DEALERS.filter(x=>tipi.includes(x.tipo)).map(x=>`<button class="dchip ${x===D?'on':''}" data-a="dealer" data-k="${x.id}" aria-pressed="${x===D}">${x.nome}<small>${x.isNew?'sempre aperto':S.market.filter(o=>o.dealer===x.id).length+' offerte'}</small></button>`).join('')}</div>`;
  const offers=D.isNew?CAT_KEYS.map(k=>`<div class="row"><div class="l">${CATS[k].nome} nuova<small>100% · 0 km · nessun danno</small></div><button data-a="buynew" data-k="${k}" ${S.cash<CATS[k].buy?'disabled':''}>${eur(CATS[k].buy)}</button></div>`).join('')
    :(S.market.filter(o=>o.dealer===D.id).map(m=>`<div class="row"><div class="l">${m.model} <small>${CATS[m.cat].nome} · ${m.cond}% · ${m.km.toLocaleString('it-IT')} km${m.dmgN?` · ${m.dmgN} dann${m.dmgN>1?'i':'o'} dichiarat${m.dmgN>1?'i':'o'}`:' · nessun danno dichiarato'}</small></div><button data-a="buyused" data-id="${m.id}" ${S.cash<m.price?'disabled':''}>${eur(m.price)}</button></div>`).join('')||`<div class="row"><div class="l"><small>${D.nome} ha venduto tutto. Torna ${wdd(nm)}.</small></div></div>`);
  document.getElementById('market').innerHTML=
    (ui.mktMsg?`<div class="banner ${ui.mktMsg.kind}" role="status" style="display:flex;gap:10px;justify-content:space-between;align-items:flex-start;font-size:13px"><span>${ui.mktMsg.txt}</span><button data-a="mmsg" aria-label="Chiudi messaggio" style="padding:4px 8px">✕</button></div>`:'')
    +chips(['usato'],'Usato')+chips(['nuovo','seminuovo','prestige'],'Autosaloni')
    +`<div class="dealer"><b>${D.nome}</b><span class="slogan">${D.slogan}</span><small>${D.desc}</small></div>`
    +offers
    +`<span class="lbl" style="margin-top:6px">Attrezzatura</span>${['seat','gps'].map(k=>`<div class="row"><div class="l">${STOCK[k].nome}<small>Ne hai ${S[STOCK[k].key]}</small></div><button data-a="buystock" data-k="${k}" ${S.cash<STOCK[k].cost?'disabled':''}>${eur(STOCK[k].cost)}</button></div>`).join('')}`
    +`<span class="lbl" style="margin-top:6px">Gomme di scorta</span><small style="color:var(--muted);font-size:12px">Con una gomma uguale in magazzino, una foratura si ripara subito e l'auto non si ferma.</small>`
    +CAT_KEYS.filter(k=>S.fleet.some(c=>c.cat===k)).map(k=>`<div class="row"><div class="l">${CATS[k].nome}<small>Estive ${(S.spare||{})[k+':estive']||0} · invernali ${(S.spare||{})[k+':invernali']||0} in magazzino</small></div><span class="acts">${['estive','invernali'].map(t=>`<button data-a="buyspare" data-k="${k}:${t}" ${S.cash<TIRE_PRICE[k]?'disabled':''}>${tireOne(t)[0].toUpperCase()+tireOne(t).slice(1)} ${eur(TIRE_PRICE[k])}</button>`).join('')}</span></div>`).join('');

  // registro
  document.getElementById('log').innerHTML=S.log.map(e=>`<div><span class="d">${dshort(e.d)}</span><span class="${e.kind}">${e.txt}</span></div>`).join('');
  const rs=document.getElementById('reset');
  rs.textContent=ui.armed==='reset'?'Conferma: cancella':'Nuova partita';
  rs.classList.toggle('armed',ui.armed==='reset');

  const dts=daysToSunday();
  document.getElementById('dock').innerHTML=`Oggi <b class="num">+${eur(S.today.in)}</b> / <b class="num">−${eur(S.today.out)}</b> · costi fissi settimanali <b class="num">${eur(weeklyCosts())}</b> ${dts===0?'<b>stasera</b>':`tra ${dts} g (domenica)`}`;
  (document.getElementById('next') as HTMLButtonElement).disabled=S.lost;
  save();
}
export function setPrice(key,abs,delta){
  if(key.startsWith('svc:')){const s=key.slice(4);const v=abs!=null?abs:S.sprices[s]+delta;S.sprices[s]=Math.max(1,isFinite(v)?Math.round(v):SVC[s].std)}
  else{const v=abs!=null?abs:S.prices[key]+delta;S.prices[key]=Math.max(5,isFinite(v)?Math.round(v):CATS[key].base)}
}
