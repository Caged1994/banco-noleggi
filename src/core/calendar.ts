export const WD=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
export const wd=d=>WD[(d-1)%7];
// calendario: il giorno 1 è lunedì 1 gennaio, anni da 365 giorni
export const MLEN=[31,28,31,30,31,30,31,31,30,31,30,31];
export const MNAME=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
export const MSHORT=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
export function dateOf(d){let y=Math.floor((d-1)/365),r=(d-1)%365,m=0;while(r>=MLEN[m]){r-=MLEN[m];m++}return{y:y+1,m,dom:r+1,doy:(d-1)%365+1}}
export const dshort=d=>{const t=dateOf(d);return t.dom+' '+MSHORT[t.m]};
export const wdd=d=>wd(d)+' '+dshort(d);
export const dlong=d=>{const t=dateOf(d);return `${['lunedì','martedì','mercoledì','giovedì','venerdì','sabato','domenica'][(d-1)%7]} ${t.dom} ${MNAME[t.m]}${t.y>1?' · anno '+t.y:''}`};
// giorno assoluto di un giorno dell'anno (doy) nell'anno y (1, 2, ...)
export const absDay=(y,doy)=>(y-1)*365+doy;
export const isWE=d=>((d-1)%7)>=5;
export const isSun=d=>((d-1)%7)===6;
