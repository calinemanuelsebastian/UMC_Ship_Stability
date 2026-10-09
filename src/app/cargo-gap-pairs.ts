import {cargoBounds} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
/** All equally near facing neighbours along each positive axis, including staggered rows. */
export function cargoGapPairs(units:WeightDraft[],maxGap:number){
 if(!Number.isFinite(maxGap)||maxGap<=0)throw new Error('Enter a positive maximum gap.');
 const boxes=units.filter(w=>w.footprint&&w.footprint.kind!=='dunnage').map(w=>({w,b:cargoBounds(w)!}));
 const result:[WeightDraft,WeightDraft][]=[];
 for(const a of boxes)for(const axis of ['x','y'] as const){
  let distance=Infinity;let nearest:(typeof a)[]=[];
  for(const b of boxes){if(a===b||a.w.footprint!.areaId!==b.w.footprint!.areaId||Math.abs(cargoBottom(a.w)-cargoBottom(b.w))>1e-8)continue;
   const gap=axis==='x'?b.b.xMin-a.b.xMax:b.b.yMin-a.b.yMax;
   const overlap=axis==='x'?Math.min(a.b.yMax,b.b.yMax)-Math.max(a.b.yMin,b.b.yMin):Math.min(a.b.xMax,b.b.xMax)-Math.max(a.b.xMin,b.b.xMin);
   if(gap>1e-8&&gap<=maxGap+1e-8&&overlap>1e-8){
    if(gap<distance-1e-8){distance=gap;nearest=[b];}
    else if(Math.abs(gap-distance)<=1e-8)nearest.push(b);
   }
  }
  for(const b of nearest)result.push([a.w,b.w]);
 }
 return result;
}
