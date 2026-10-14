import {CargoNeighbours} from './cargo-neighbours';
import {cargoBounds} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
/** All equally near facing neighbours along each positive axis, including staggered rows. */
export function cargoGapPairs(units:WeightDraft[],maxGap:number){
 if(!Number.isFinite(maxGap)||maxGap<=0)throw new Error('Enter a positive maximum gap.');
 const boxes=units.filter(w=>w.footprint&&w.footprint.kind!=='dunnage').map(w=>({w,b:cargoBounds(w)!}));
 const index=new CargoNeighbours(units);const byId=new Map(boxes.map(b=>[b.w.id,b]));
 const result:[WeightDraft,WeightDraft][]=[];
 for(const a of boxes)for(const axis of ['x','y'] as const){
  const levels=new Map<string,{distance:number;nearest:(typeof a)[]}>();
  const region=axis==='x'?{...a.b,xMin:a.b.xMax,xMax:a.b.xMax+maxGap}:{...a.b,yMin:a.b.yMax,yMax:a.b.yMax+maxGap};
  for(const other of index.query(region)){const b=byId.get(other.id);if(!b||a===b||a.w.footprint!.areaId!==b.w.footprint!.areaId||Math.min(cargoBottom(a.w)+a.w.footprint!.height,cargoBottom(b.w)+b.w.footprint!.height)<=Math.max(cargoBottom(a.w),cargoBottom(b.w))+1e-8)continue;
   const gap=axis==='x'?b.b.xMin-a.b.xMax:b.b.yMin-a.b.yMax;
   const overlap=axis==='x'?Math.min(a.b.yMax,b.b.yMax)-Math.max(a.b.yMin,b.b.yMin):Math.min(a.b.xMax,b.b.xMax)-Math.max(a.b.xMin,b.b.xMin);
   if(gap>1e-8&&gap<=maxGap+1e-8&&overlap>1e-8){
    const level=Math.max(cargoBottom(a.w),cargoBottom(b.w)).toFixed(8),found=levels.get(level);
    if(!found||gap<found.distance-1e-8)levels.set(level,{distance:gap,nearest:[b]});
    else if(Math.abs(gap-found.distance)<=1e-8)found.nearest.push(b);
   }
  }
  for(const {nearest} of levels.values())for(const b of nearest)result.push([a.w,b.w]);
 }
 return result;
}
