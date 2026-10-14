import type {StabilityPoint,StabilityResult} from '../domain/stability-result';
import {findHeelEquilibria} from './heel-equilibrium';
import {steadyWindEquilibrium} from './wind-equilibrium';

// MSC.267(85), Part A 2.3.4, tables 1–4. Endpoint plateaus are explicit in the tables.
export const rollTables = {
 x1:[[2.4,1],[2.5,.98],[2.6,.96],[2.7,.95],[2.8,.93],[2.9,.91],[3,.9],[3.1,.88],[3.2,.86],[3.4,.82],[3.5,.8]],
 x2:[[.45,.75],[.5,.82],[.55,.89],[.6,.95],[.65,.97],[.7,1]],
 k:[[0,1],[1,.98],[1.5,.95],[2,.88],[2.5,.79],[3,.74],[3.5,.72],[4,.7]],
 s:[[6,.1],[7,.098],[8,.093],[12,.065],[14,.053],[16,.044],[18,.038],[20,.035]],
};
export function rollFactor(table:number[][],value:number) {
 if(!Number.isFinite(value))throw new Error('Invalid roll factor input.');
 if(value<=table[0][0])return table[0][1];
 for(let i=1;i<table.length;i++)if(value<=table[i][0]){const [x,y]=table[i-1],[xx,yy]=table[i];return y+(yy-y)*(value-x)/(xx-x);}
 return table.at(-1)![1];
}
export function weatherRoll(i:{beam:number;draft:number;lwl:number;cb:number;kg:number;gm:number;bilgeArea:number;bilgeType?:'keels'|'round'|'sharp'}) {
 if(![i.beam,i.draft,i.lwl,i.cb,i.kg,i.gm,i.bilgeArea].every(Number.isFinite)||i.beam<=0||i.draft<=0||i.lwl<=0||i.cb<=0||i.cb>1||i.gm<=0||i.bilgeArea<0)throw new Error('Valid dimensions, block coefficient and positive corrected GM are required.');
 if(i.bilgeType!==undefined&&!['round','sharp','keels'].includes(i.bilgeType))throw new Error('Invalid bilge configuration.');
 const bd=i.beam/i.draft,og=i.kg/i.draft-1;
 const c=.373+.023*bd-.043*i.lwl/100,period=2*c*i.beam/Math.sqrt(i.gm);
 if(bd>=3.5||og<-.3-1e-12||og>.5+1e-12||period<=0||period>=20)throw new Error('Outside the empirical roll method: B/d < 3.5, −0.3 ≤ KG/d − 1 ≤ 0.5 and T < 20 s are required.');
 const x1=rollFactor(rollTables.x1,bd),x2=rollFactor(rollTables.x2,i.cb),k=i.bilgeType==='sharp'?.7:i.bilgeType==='round'?1:rollFactor(rollTables.k,100*i.bilgeArea/(i.lwl*i.beam)),s=rollFactor(rollTables.s,period),r=.73+.6*og;
 return {period,x1,x2,k,s,r,angle:109*k*x1*x2*Math.sqrt(r*s)};
}
export function gustLever(steady:number){if(!Number.isFinite(steady)||steady<0)throw new Error('Invalid steady wind lever.');return 1.5*steady;}
export function curveSegment(points:StabilityPoint[],from:number,to:number) {
 if(!Number.isFinite(from)||!Number.isFinite(to)||from>=to||points.length<2||from<points[0].heelDeg||to>points.at(-1)!.heelDeg)throw new Error('GZ coverage does not span the required energy interval. No mirroring or extrapolation is used.');
 const at=(x:number)=>{const p=points.find(p=>p.heelDeg===x);if(p)return p;const j=points.findIndex(p=>p.heelDeg>x),a=points[j-1],b=points[j];return {...a,heelDeg:x,gzCorrected:a.gzCorrected+(b.gzCorrected-a.gzCorrected)*(x-a.heelDeg)/(b.heelDeg-a.heelDeg)};};
 return [at(from),...points.filter(p=>p.heelDeg>from&&p.heelDeg<to),at(to)];
}
const integral=(p:StabilityPoint[],lever:number)=>p.slice(1).reduce((sum,b,j)=>sum+(p[j].gzCorrected+b.gzCorrected-2*lever)/2*(b.heelDeg-p[j].heelDeg)*Math.PI/180,0);
/** Numerical energy balance only; operator-supplied flooding boundary is not approval. */
export function weatherAreas(curve:StabilityResult,steady:number,roll:number,flood:number) {
 if(!Number.isFinite(roll)||roll<=0||!Number.isFinite(flood)||flood<=0||flood>180)throw new Error('A positive roll angle and downflooding angle are required.');
 const eq=steadyWindEquilibrium(curve,steady);if(eq.angle===undefined)throw new Error('A unique steady-wind equilibrium is required for energy areas.');
 const gust=gustLever(steady),start=eq.angle-roll;
 const roots=findHeelEquilibria(curve.points.map(p=>({...p,gzCorrected:p.gzCorrected-gust})));
 if(roots.neutralIntervals.length||roots.roots.filter(r=>r.stability==='stable').length!==1||roots.roots.some(r=>r.stability==='one-sided / indeterminate'))throw new Error('Gust intersections are ambiguous.');
 const first=roots.roots.find(r=>r.stability==='stable')!.heelDeg;
 const descending=roots.roots.filter(r=>r.stability==='unstable'&&r.heelDeg>first);
 if(descending.length>1)throw new Error('Gust intersections are ambiguous.');
 const end=Math.min(flood,50,descending[0]?.heelDeg??Infinity);
 if(start>=first||end<=first)throw new Error('No usable restoring interval exists before the limiting angle.');
 if(curve.downflooding?.firstReachedAngle!==undefined&&end>=curve.downflooding.firstReachedAngle)throw new Error('The energy interval reaches a supplied flooding threshold.');
 const aPoints=curveSegment(curve.points,start,first),bPoints=curveSegment(curve.points,first,end);
 if(aPoints.some(p=>p.gzCorrected>gust+1e-9)||bPoints.some(p=>p.gzCorrected<gust-1e-9))throw new Error('Gust intersections are ambiguous.');
 const a=-integral(aPoints,gust),b=integral(bPoints,gust);
 return {a,b,margin:b-a,start,first,end,aPoints,bPoints};
}
