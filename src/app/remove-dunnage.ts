import {cargoBounds} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import {deleteCargoSelection} from './delete-cargo';
import type {WeightDraft} from './loading-state';
/** No selection removes all editable dunnage; selected cargo scopes removal to touching pieces. */
export function removableDunnageIds(weights:WeightDraft[],selection:string[],editableIds:string[]){
 const selected=new Set(selection),editable=new Set(editableIds);
 const anchors=weights.filter(w=>selected.has(w.id)&&w.footprint?.kind!=='dunnage'&&w.footprint);
 return weights.filter(w=>{
  if(w.footprint?.kind!=='dunnage'||!editable.has(w.id))return false;
  if(!selected.size||selected.has(w.id))return true;
  const b=cargoBounds(w)!;
  return anchors.some(a=>{const c=cargoBounds(a)!;return a.footprint!.areaId===w.footprint!.areaId&&Math.abs(cargoBottom(a)-cargoBottom(w))<1e-8&&Math.min(b.xMax,c.xMax)-Math.max(b.xMin,c.xMin)>=-1e-8&&Math.min(b.yMax,c.yMax)-Math.max(b.yMin,c.yMin)>=-1e-8;});
 }).map(w=>w.id);
}
export function removeDunnage(weights:WeightDraft[],selection:string[],editableIds:string[]){
 const ids=removableDunnageIds(weights,selection,editableIds);
 return deleteCargoSelection(weights,ids,editableIds);
}
