import { S } from '../core/state.js';
import { H, SVC } from '../data/catalog.js';
import { clamp } from '../core/util.js';
/* ---------- render ---------- */
export function condColor(v){return v>=70?'var(--good)':v>=45?'var(--warn)':'var(--bad)'}
export function spark(){
  const h=S.hist,w=120,ht=30;if(h.length<2)return'';
  const mn=Math.min(...h,0),mx=Math.max(...h,1);
  const pts=h.map((v,i)=>[i/(h.length-1)*w,ht-2-(v-mn)/(mx-mn)*(ht-4)]);
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const last=pts[pts.length-1];
  return `<svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}" aria-label="Andamento cassa"><path d="${d} L${w} ${ht} L0 ${ht}Z" fill="var(--acc-bg)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="var(--accent)"/></svg>`;
}
export function bar(cls,s,e,label,title){
  s=Math.max(s,S.day);e=Math.min(e,S.day+H);if(e<=s)return'';
  return `<div class="bar ${cls}" style="grid-column:${s-S.day+2}/${e-S.day+2}" title="${title}">${label}</div>`;
}
export const svcTag=l=>l.length?' · '+l.map(s=>SVC[s].short).join(''):'';
export function hbar(v,max,cls=''){return `<div class="hbar ${cls}"><i style="width:${max>0?clamp(v/max*100,0,100):0}%"></i></div>`}
