import {cargoBounds,type CargoArea} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
/** Trace geometric contacts down through cargo/dunnage; never infer panel reactions. */
export function supportingHatchPanels(item:WeightDraft,weights:WeightDraft[],area:CargoArea):string[]{
 const found=new Set<string>(),visited=new Set<string>();
 const touches=(a:ReturnType<typeof cargoBounds>,b:ReturnType<typeof cargoBounds>)=>!!a&&!!b&&Math.min(a.xMax,b.xMax)-Math.max(a.xMin,b.xMin)>1e-8&&Math.min(a.yMax,b.yMax)-Math.max(a.yMin,b.yMin)>1e-8;
 function visit(w:WeightDraft){
  if(visited.has(w.id)||!w.footprint)return;visited.add(w.id);
  if(Math.abs(cargoBottom(w)-area.deckZ)<1e-8){for(const p of area.panels??[])if(touches(cargoBounds(w),p))found.add(p.id);return;}
  for(const support of weights)if(support.id!==w.id&&support.footprint&&Math.abs(cargoBottom(support)+support.footprint.height-cargoBottom(w))<1e-8&&touches(cargoBounds(w),cargoBounds(support)))visit(support);
 }
 visit(item);return [...found].sort();
}
