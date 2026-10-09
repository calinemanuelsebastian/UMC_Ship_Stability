import {cargoBounds,sameLoadingSurface} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
export type Stackability='unknown'|'stackable'|'unstackable';
export type StackWarning={id:string;load:number;reason:string};
/** Conservative contact graph: attribute each reachable upper mass in full, once per base.
 * Does not estimate reaction distribution or certify structural capacity. */
export function stackingWarnings(weights:WeightDraft[]):StackWarning[]{
 const items=weights.filter(w=>w.footprint&&cargoBounds(w));
 const above=(base:WeightDraft)=>items.filter(w=>{if(w.id===base.id||!sameLoadingSurface(w.footprint!.areaId,base.footprint!.areaId)||Math.abs(cargoBottom(w)-cargoBottom(base)-base.footprint!.height)>1e-7)return false;const a=cargoBounds(base)!,b=cargoBounds(w)!;return Math.min(a.xMax,b.xMax)-Math.max(a.xMin,b.xMin)>1e-8&&Math.min(a.yMax,b.yMax)-Math.max(a.yMin,b.yMin)>1e-8;});
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
