import {cloneMarkings} from './cargo-identification';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
import type {CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
/** Duplicate a level of cargo as one atomic, supported layer. */
export function stackLayer(items:WeightDraft[],areas:CargoArea[],weights:WeightDraft[],id:()=>string){
 if(!items.length||items.some(w=>!w.footprint||w.footprint.kind==='dunnage'))throw new Error('Select cargo units from one layer.');
 const bottom=cargoBottom(items[0]),height=items[0].footprint!.height;
 if(items.some(w=>Math.abs(cargoBottom(w)-bottom)>1e-8||Math.abs(w.footprint!.height-height)>1e-8))throw new Error('Select cargo units with the same bottom level and height.');
 const added:WeightDraft[]=[];
 for(const w of items){const clone={...structuredClone(w),id:id(),name:w.name,footprint:{...w.footprint!,markings:cloneMarkings(w.footprint?.markings)}};const target={x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)+height};const next=placeSupportedCargo(clone,areas,[...weights,...added],target,true,false);
 if(Math.abs(cargoBottom(next)-target.z)>1e-8||Math.abs(Number(next.lcg)-target.x)>1e-8||Math.abs(Number(next.tcg)-target.y)>1e-8)throw new Error('The next layer does not fit above this cargo.');added.push(next);}
 return added;
}
