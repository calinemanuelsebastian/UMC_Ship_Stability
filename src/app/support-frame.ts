import {cloneMarkings} from './cargo-identification';
import {checkStackingChange} from './stackability';
import {cargoBounds,type CargoArea} from './cargo-layout';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
import {createDunnage,type DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
import type {WeightDraft} from './loading-state';
/** Shared geometry for the estimate and placement; no assumed structural capacity. */
export function supportFrameGeometry(items:WeightDraft[],area:CargoArea,s:Pick<DunnagePattern,'width'|'thickness'|'densityKgM3'|'frameClearance'>){
 if(!items.length||items.some(w=>!w.footprint||w.footprint.kind==='dunnage'||w.footprint.areaId!==area.id))throw new Error('Select cargo on one loading surface.');
 const clearance=s.frameClearance??.1;
 if(![s.width,s.thickness,s.densityKgM3].every(n=>Number.isFinite(n)&&n>0)||!Number.isFinite(clearance)||clearance<=0)throw new Error('Enter positive frame dimensions and spacing.');
 const b=items.map(w=>cargoBounds(w)!);const x0=Math.min(...b.map(b=>b.xMin))-clearance-s.width,x1=Math.max(...b.map(b=>b.xMax))+clearance+s.width,y0=Math.min(...b.map(b=>b.yMin))-clearance-s.width,y1=Math.max(...b.map(b=>b.yMax))+clearance+s.width;
 const top=Math.max(...items.map(w=>cargoBottom(w)+w.footprint!.height))+clearance;
 const postHeight=top-area.deckZ;
 const mass=dunnageMassTonnes(s.width,s.width,postHeight,s.densityKgM3)*4+dunnageMassTonnes(x1-x0,y1-y0,s.thickness,s.densityKgM3);
 return {x0,x1,y0,y1,top,postHeight,mass};
}
/** Four independent floor-supported posts and a solid platform. Capacity remains unknown. */
export function supportFrame(items:WeightDraft[],area:CargoArea,weights:WeightDraft[],s:DunnagePattern,id:()=>string){
 const {x0,x1,y0,y1,top}=supportFrameGeometry(items,area,s);
 if(s.frameMaxTopLoadTonnes!==undefined&&(!Number.isFinite(s.frameMaxTopLoadTonnes)||s.frameMaxTopLoadTonnes<=0))throw new Error('Enter a positive declared rack load limit.');
 const parts:WeightDraft[]=[];
 const add=(length:number,width:number,height:number,x:number,y:number,z:number,name:string)=>{const raw=createDunnage({id:id(),area,areas:[area],weights:[],length,width,thickness:height,mass:dunnageMassTonnes(length,width,height,s.densityKgM3),material:s.material,densityKgM3:s.densityKgM3,massMode:'calculated',properties:s.properties,position:{x,y}});const next=placeSupportedCargo(raw,[area],[...weights,...parts],{x,y,z},true,false);if(Math.abs(+next.lcg-x)>1e-8||Math.abs(+next.tcg-y)>1e-8||Math.abs(cargoBottom(next)-z)>1e-8)throw new Error('The support frame does not fit around this selection.');next.name=name;parts.push(next);};
 for(const x of [x0+s.width/2,x1-s.width/2])for(const y of [y0+s.width/2,y1-s.width/2])add(s.width,s.width,top-area.deckZ,x,y,area.deckZ,'Support frame post');
 add(x1-x0,y1-y0,s.thickness,(x0+x1)/2,(y0+y1)/2,top,'Support frame platform');const platform=parts.at(-1)!.footprint!;platform.stackability=s.frameMaxTopLoadTonnes===undefined?'unknown':'stackable';if(s.frameMaxTopLoadTonnes!==undefined)platform.maxTopLoadTonnes=s.frameMaxTopLoadTonnes;return parts;
}

/** Build and optionally load a rack as one transaction. Failure commits nothing. */
export function buildLoadedSupportFrame(items:WeightDraft[],area:CargoArea,weights:WeightDraft[],s:DunnagePattern,id:()=>string){
 const parts=supportFrame(items,area,weights,s,id);
 if(!s.frameCopyCargo)return parts;
 if(s.frameMaxTopLoadTonnes===undefined)throw new Error('Declare the rack load limit before adding the upper layer.');
 const base=cargoBottom(items[0]);
 if(items.some(w=>Math.abs(cargoBottom(w)-base)>1e-8))throw new Error('Select cargo units from one layer.');
 const platform=parts.at(-1)!,z=cargoBottom(platform)+platform.footprint!.height;
 const added:WeightDraft[]=[];
 for(const w of items){
  const clone={...structuredClone(w),id:id(),footprint:{...w.footprint!,markings:cloneMarkings(w.footprint?.markings)}};
  const next=placeSupportedCargo(clone,[area],[...weights,...parts,...added],{x:Number(w.lcg),y:Number(w.tcg),z},true,false);
  if(Math.abs(cargoBottom(next)-z)>1e-8||Math.abs(Number(next.lcg)-Number(w.lcg))>1e-8||Math.abs(Number(next.tcg)-Number(w.tcg))>1e-8)throw new Error('The next layer does not fit above this cargo.');
  added.push(next);
 }
 checkStackingChange(weights,[...weights,...parts,...added]);
 return [...parts,...added];
}
