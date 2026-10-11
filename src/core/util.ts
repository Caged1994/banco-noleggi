import { SVC } from '../data/catalog.js';
export const R=(a,b)=>a+Math.random()*(b-a), RI=(a,b)=>Math.floor(R(a,b+1)), pick=a=>a[Math.floor(Math.random()*a.length)];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const eur=n=>(n<0?'−':'')+'€'+Math.abs(Math.round(n)).toLocaleString('it-IT');
export function wpick(w: Record<string, number>): string {const t=Object.values<any>(w).reduce((a,b)=>a+b,0);let r=Math.random()*t;for(const k in w){r-=w[k];if(r<=0)return k}return Object.keys(w)[0]}
export function plate(){const L='ABCDEFGHJKLMNPRSTVWXYZ';return pick(L)+pick(L)+RI(100,999)+pick(L)+pick(L)}
export const surname=n=>n.split(' ').slice(1).join(' ')||n;
export const svcNames=l=>l.map(s=>SVC[s].nome).join(', ');
