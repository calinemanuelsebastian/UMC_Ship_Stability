import {CargoNeighbours,cargoNeighbours} from './cargo-neighbours';
import {cargoBounds,sameLoadingSurface} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
export type Stackability='unknown'|'stackable'|'unstackable';
export type StackWarning={id:string;load:number;reason:string};
/** Conservative contact graph: attribute each reachable upper mass in full, once per base.
 * Does not estimate reaction distribution or certify structural capacity. */
export function stackingWarnings(weights:WeightDraft[]):StackWarning[]{
 const items=weights.filter(w=>w.footprint&&cargoBounds(w));
 const index=new CargoNeighbours(items);
 const above=(base:WeightDraft)=>index.query(cargoBounds(base)!).filter(w=>{if(w.id===base.id||!sameLoadingSurface(w.footprint!.areaId,base.footprint!.areaId)||Math.abs(cargoBottom(w)-cargoBottom(base)-base.footprint!.height)>1e-7)return false;const a=cargoBounds(base)!,b=cargoBounds(w)!;return Math.min(a.xMax,b.xMax)-Math.max(a.xMin,b.xMin)>1e-8&&Math.min(a.yMax,b.yMax)-Math.max(a.yMin,b.yMin)>1e-8;});
 return items.flatMap(base=>{if(base.footprint!.kind==='dunnage'&&!base.footprint!.stackability)return [];const seen=new Set<string>();const visit=(w:WeightDraft)=>{for(const upper of above(w)){if(seen.has(upper.id))continue;seen.add(upper.id);visit(upper);}};visit(base);if(!seen.size)return [];
 const load=items.filter(w=>seen.has(w.id)).reduce((sum,w)=>sum+(Number.isFinite(+w.massTonnes)&&+w.massTonnes>=0?+w.massTonnes:Infinity),0);
 const policy=base.footprint!.stackability??'unknown',limit=base.footprint!.maxTopLoadTonnes;
 const reason=policy==='unstackable'?'Non-stackable cargo carries a load. Add an independently supported structure.':policy==='unknown'?'Stackability is unknown. Review the cargo or use the teaching override.':limit===undefined?'Stackable cargo has no specified top-load limit.':load>limit+1e-8?'The supported load exceeds the cargo top-load limit.':undefined;
 return reason?[{id:base.id,load,reason}]:[];});
}
export function checkStackingChange(before:WeightDraft[],after:WeightDraft[],override=false){
 if(override)return;const prior=stackingWarnings(before);
 const issue=stackingWarnings(after).find(w=>!prior.some(p=>p.id===w.id&&p.reason===w.reason&&p.load>=w.load-1e-8));
 if(issue)throw new Error(issue.reason);
}

/** Recheck only contact-connected stacks touched by a placement preview. */
export function checkStackingEdits(before:WeightDraft[],edited:WeightDraft[],override=false){
 if(override)return;
 const ids=new Set(edited.map(w=>w.id)),index=cargoNeighbours(before),affected=new Map<string,WeightDraft>();
 const queue=[...edited,...before.filter(w=>ids.has(w.id))];
 for(let i=0;i<queue.length;i++){
  const w=queue[i],b=cargoBounds(w);if(!b||!w.footprint)continue;
  for(const other of index.query(b)){
   if(affected.has(other.id)||!other.footprint||!sameLoadingSurface(w.footprint.areaId,other.footprint.areaId))continue;
   const c=cargoBounds(other)!;
   if(Math.min(b.xMax,c.xMax)-Math.max(b.xMin,c.xMin)<=1e-8||Math.min(b.yMax,c.yMax)-Math.max(b.yMin,c.yMin)<=1e-8)continue;
   if(ids.has(other.id)||Math.abs(cargoBottom(other)-cargoBottom(w)-w.footprint.height)<1e-7||Math.abs(cargoBottom(w)-cargoBottom(other)-other.footprint.height)<1e-7){affected.set(other.id,other);queue.push(other);}
  }
 }
 const old=[...affected.values()];checkStackingChange(old,[...old.filter(w=>!ids.has(w.id)),...edited],false);
}
