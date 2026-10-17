import {cargoBounds,type CargoArea} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
export type DunnageFit={length:number;width:number;x:number;y:number;z:number};
/** Exposed edges of the documented rectangular-region union; internal seams are not walls. */
export function boundaryDunnageFits(w:WeightDraft,area:CargoArea,maxGap:number):DunnageFit[]{
 if(w.footprint?.shape&&w.footprint.shape!=='box')return [];
 if(!Number.isFinite(maxGap)||maxGap<=0)throw new Error('Enter a positive maximum gap.');
 const b=cargoBounds(w);if(!b||w.footprint?.kind==='dunnage'||area.id?.startsWith('hatch-')||area.supportRegions||Math.abs(cargoBottom(w)-area.deckZ)>1e-8)return [];
 const regions=area.regions??[area],fits:DunnageFit[]=[],seen=new Set<string>();
 const inside=(x:number,y:number)=>regions.some(r=>x>r.xMin&&x<r.xMax&&y>r.yMin&&y<r.yMax);
 for(const r of regions)for(const side of ['left','right','bottom','top'] as const){
  const vertical=side==='left'||side==='right',low=side==='left'||side==='bottom';
  const wall=vertical?(low?r.xMin:r.xMax):(low?r.yMin:r.yMax),start=vertical?r.yMin:r.xMin,end=vertical?r.yMax:r.xMax;
  const cuts=[...new Set([start,end,...regions.flatMap(v=>vertical?[v.yMin,v.yMax]:[v.xMin,v.xMax]).filter(v=>v>start&&v<end)])].sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const mid=(cuts[i-1]+cuts[i])/2,out=wall+(low?-1:1)*1e-6;
   if(vertical?inside(out,mid):inside(mid,out))continue;
   const gap=vertical?(low?b.xMin-wall:wall-b.xMax):(low?b.yMin-wall:wall-b.yMax);
   const a=Math.max(cuts[i-1],vertical?b.yMin:b.xMin),z=Math.min(cuts[i],vertical?b.yMax:b.xMax);
   if(gap<=1e-8||gap>maxGap+1e-8||z-a<=1e-8)continue;
   const f=vertical?{length:gap,width:z-a,x:wall+(low?1:-1)*gap/2,y:(a+z)/2,z:area.deckZ}:{length:z-a,width:gap,x:(a+z)/2,y:wall+(low?1:-1)*gap/2,z:area.deckZ};
   const key=JSON.stringify(f);if(!seen.has(key)){seen.add(key);fits.push(f);}
  }
 }
 return fits;
}
/** Generic geometric spacers are the default; explicit specialist requirements stay protected. */
export function permitsAutoDunnage(w:WeightDraft){if(w.footprint?.shape&&w.footprint.shape!=='box')return false;
 const fp=w.footprint;
 return !!fp&&!fp.keepGapsClear&&(!fp.catalogue||['boxed','crate'].includes(fp.catalogue.family))&&fp.kind!=='dunnage'&&(!fp.dunnageProfile||fp.dunnageProfile==='unspecified'||fp.dunnageProfile==='boxed')&&!fp.markings?.hazard&&!fp.markings?.unNumber;
}
