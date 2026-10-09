import {cargoBounds,type CargoArea} from './cargo-layout';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
import {createDunnage,type DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
import type {WeightDraft} from './loading-state';
/** Teaching frame: four independent floor-supported posts and a platform. Capacity remains unknown. */
export function supportFrame(items:WeightDraft[],area:CargoArea,weights:WeightDraft[],s:DunnagePattern,id:()=>string){
 if(!items.length||items.some(w=>!w.footprint||w.footprint.areaId!==area.id))throw new Error('Select cargo on one loading surface.');
 const b=items.map(w=>cargoBounds(w)!);const x0=Math.min(...b.map(b=>b.xMin))-.1-s.width,x1=Math.max(...b.map(b=>b.xMax))+.1+s.width,y0=Math.min(...b.map(b=>b.yMin))-.1-s.width,y1=Math.max(...b.map(b=>b.yMax))+.1+s.width;
 const top=Math.max(...items.map(w=>cargoBottom(w)+w.footprint!.height))+.1;
 const parts:WeightDraft[]=[];
 const add=(length:number,width:number,height:number,x:number,y:number,z:number,name:string)=>{const raw=createDunnage({id:id(),area,areas:[area],weights:[],length,width,thickness:height,mass:dunnageMassTonnes(length,width,height,s.densityKgM3),material:s.material,densityKgM3:s.densityKgM3,massMode:'calculated',position:{x,y}});const next=placeSupportedCargo(raw,[area],[...weights,...parts],{x,y,z},true,false);if(Math.abs(+next.lcg-x)>1e-8||Math.abs(+next.tcg-y)>1e-8||Math.abs(cargoBottom(next)-z)>1e-8)throw new Error('The support frame does not fit around this selection.');next.name=name;parts.push(next);};
 for(const x of [x0+s.width/2,x1-s.width/2])for(const y of [y0+s.width/2,y1-s.width/2])add(s.width,s.width,top-area.deckZ,x,y,area.deckZ,'Support frame post');
 add(x1-x0,y1-y0,s.thickness,(x0+x1)/2,(y0+y1)/2,top,'Support frame platform');parts.at(-1)!.footprint!.stackability='unknown';return parts;
}
