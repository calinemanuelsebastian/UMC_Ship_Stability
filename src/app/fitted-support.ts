import {worldShape} from './cargo-shape';
import {cargoBounds,type CargoArea} from './cargo-layout';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
import {checkStackingEdits} from './stackability';
import {createDunnage,type DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
import type {WeightDraft} from './loading-state';
/** A separator follows an actual flat top face, never the empty corners of an envelope. */
export function fittedSupportGeometry(w:WeightDraft){
 if(!w.footprint)throw new Error('Select cargo with dimensions.');
 const s=worldShape(w.footprint),b=cargoBounds(w)!;
 if(s!=='box'&&s!=='cylinder-z')throw new Error('This cargo has a curved crown. Use an independent rack or a reviewed cradle.');
 return {length:b.xMax-b.xMin,width:b.yMax-b.yMin,shape:s,factor:s==='cylinder-z'?Math.PI/4:1} as const;
}
export function fittedSeparator(w:WeightDraft,area:CargoArea,weights:WeightDraft[],s:DunnagePattern,id:()=>string){
 const g=fittedSupportGeometry(w),x=+w.lcg,y=+w.tcg,z=cargoBottom(w)+w.footprint!.height;
 const raw=createDunnage({id:id(),area,areas:[area],weights:[],length:g.length,width:g.width,thickness:s.thickness,mass:dunnageMassTonnes(g.length,g.width,s.thickness,s.densityKgM3)*g.factor,material:s.material,densityKgM3:s.densityKgM3,massMode:'calculated',properties:s.properties,position:{x,y}});
 raw.footprint!.shape=g.shape;raw.name=`${s.material} · Fitted separator`;
 const next=placeSupportedCargo(raw,[area],weights,{x,y,z},true,false);
 if(Math.abs(cargoBottom(next)-z)>1e-8||Math.abs(+next.lcg-x)>1e-8||Math.abs(+next.tcg-y)>1e-8)throw new Error('The fitted separator cannot be placed at the intended contact.');
 checkStackingEdits(weights,[next]);return next;
}
