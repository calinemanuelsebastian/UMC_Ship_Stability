import {cargoNeighbours} from './cargo-neighbours';
import {cargoBounds} from './cargo-layout';
import {cargoBottom,horizontalContact} from './cargo-placement';
import {deleteCargoSelection} from './delete-cargo';
import type {WeightDraft} from './loading-state';
/** No selection removes all editable dunnage; selected cargo scopes removal to touching pieces. */
export function removableDunnageIds(weights:WeightDraft[],selection:string[],editableIds:string[]){
 const selected=new Set(selection),editable=new Set(editableIds);
 const anchors=weights.filter(w=>selected.has(w.id)&&w.footprint?.kind!=='dunnage'&&w.footprint);
 const touching=new Set<string>();
 if(selected.size){const index=cargoNeighbours(weights);for(const a of anchors){const c=cargoBounds(a)!;for(const w of index.query({xMin:c.xMin-1e-8,xMax:c.xMax+1e-8,yMin:c.yMin-1e-8,yMax:c.yMax+1e-8})){
  if(w.footprint?.kind!=='dunnage'||a.footprint!.areaId!==w.footprint.areaId)continue;
  if((Math.abs(cargoBottom(w)-cargoBottom(a)-a.footprint!.height)<1e-8||Math.abs(cargoBottom(a)-cargoBottom(w)-w.footprint.height)<1e-8)&&horizontalContact(a,w)){touching.add(w.id);continue;}
  if(Math.min(cargoBottom(a)+a.footprint!.height,cargoBottom(w)+w.footprint.height)<=Math.max(cargoBottom(a),cargoBottom(w))+1e-8)continue;
  const b=cargoBounds(w)!;if(Math.min(b.xMax,c.xMax)-Math.max(b.xMin,c.xMin)>=-1e-8&&Math.min(b.yMax,c.yMax)-Math.max(b.yMin,c.yMin)>=-1e-8)touching.add(w.id);
 }}}
 return weights.filter(w=>w.footprint?.kind==='dunnage'&&editable.has(w.id)&&(!selected.size||selected.has(w.id)||touching.has(w.id))).map(w=>w.id);
}
export function removeDunnage(weights:WeightDraft[],selection:string[],editableIds:string[]){
 const ids=removableDunnageIds(weights,selection,editableIds);
 return deleteCargoSelection(weights,ids,editableIds);
}
