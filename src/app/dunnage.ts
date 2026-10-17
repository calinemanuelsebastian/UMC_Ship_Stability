import type {MaterialProperties} from './material-properties';
import type {DunnageArrangement} from './dunnage-arrangement';
import type {CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
import {parseFootprint} from './cargo-layout';
import {cargoBottom,placeSupportedCargo,stackCargoOn} from './cargo-placement';
export function createDunnage({id,area,areas,weights,support,length,width,thickness,mass,material,densityKgM3,massMode,properties,position}:{id:string;area:CargoArea;areas:CargoArea[];weights:WeightDraft[];support?:WeightDraft;length:number;width:number;thickness:number;mass:number;material?:string;densityKgM3?:number;massMode?:'calculated'|'manual';properties?:MaterialProperties;position?:{x:number;y:number}}){
 if(!Number.isFinite(mass)||mass<=0)throw new Error('Enter a positive dunnage mass.');
 const footprint=parseFootprint({kind:'dunnage',...(material?{dunnage:{material,densityKgM3,massMode,...(properties?{properties}:{})}}:{}),length:length,width:width,height:thickness,rotation:0,deckZ:area.deckZ,areaId:area.id});
 const w:WeightDraft={id,name:material?`${material} · Dunnage layer`:'Dunnage layer',category:'cargo',quantity:'1',hold:area.name,massTonnes:String(mass),lcg:String((area.xMin+area.xMax)/2),tcg:String((area.yMin+area.yMax)/2),vcg:String(area.deckZ+thickness/2),freeSurfaceMomentTransverse:'0',footprint};
 return support?stackCargoOn(w,support,areas,weights):placeSupportedCargo(w,[area],weights,{x:position?.x??Number(w.lcg),y:position?.y??Number(w.tcg),z:area.deckZ},false,false);
}

export type DunnagePattern=DunnageArrangement & {supportMode?:'gaps'|'separators'|'racks';fitTop?:boolean;properties?:MaterialProperties;length:number;width:number;thickness:number;mass:number;material:string;densityKgM3:number;massMode:'calculated'|'manual';count:number;gap:number;frameClearance?:number;frameMaxTopLoadTonnes?:number;frameCopyCargo?:boolean;direction:'x'|'y'};
/** Build the complete pattern before committing it, so a failed piece leaves no partial load. */
export function createDunnagePattern(options:{area:CargoArea;areas:CargoArea[];weights:WeightDraft[];settings:DunnagePattern;position:{x:number;y:number};support?:WeightDraft;id:()=>string}){
 const {area,areas,weights,settings:s,position,support,id}=options;
 if(!Number.isInteger(s.count)||s.count<1||s.count>100||!Number.isFinite(s.gap)||s.gap<0)throw new Error('Use 1–100 pieces and a non-negative gap.');
 const pieces:WeightDraft[]=[];
 for(let i=0;i<s.count;i++){
  const offset=(i-(s.count-1)/2)*((s.direction==='x'?s.length:s.width)+s.gap);
  const x=position.x+(s.direction==='x'?offset:0),y=position.y+(s.direction==='y'?offset:0);
  let piece=createDunnage({id:id(),area,areas,weights:[],...s,mass:s.mass/s.count,position:{x,y}});
  const z=support?cargoBottom(support)+support.footprint!.height:area.deckZ;
  piece=placeSupportedCargo(piece,[area],[...weights,...pieces],{x,y,z},!!support,false);
  if(Math.abs(Number(piece.lcg)-x)>1e-8||Math.abs(Number(piece.tcg)-y)>1e-8)throw new Error('The dunnage pattern is outside the hold.');
  piece.name=`${s.material} · ${s.count>1?'Bearer '+(i+1):'Dunnage'}`;pieces.push(piece);
 }
 return pieces;
}

/** A separate rectangular spacer in the clear horizontal gap between two units. */
export function dunnageGap(a:WeightDraft,b:WeightDraft){
 if([a,b].some(w=>w.footprint?.shape&&w.footprint.shape!=='box'))throw new Error('Curved cargo needs a reviewed cradle or shaped support; envelope gaps do not establish contact.');
 if(!a.footprint||!b.footprint||a.footprint.kind==='dunnage'||b.footprint.kind==='dunnage'||a.footprint.areaId!==b.footprint.areaId||Math.min(cargoBottom(a)+a.footprint.height,cargoBottom(b)+b.footprint.height)<=Math.max(cargoBottom(a),cargoBottom(b))+1e-8)throw new Error('Select two cargo units on the same surface with overlapping heights.');
 const bounds=(w:WeightDraft)=>{const p=w.footprint!,l=p.rotation===0?p.length:p.width,d=p.rotation===0?p.width:p.length;return {x0:+w.lcg-l/2,x1:+w.lcg+l/2,y0:+w.tcg-d/2,y1:+w.tcg+d/2};};
 const x=bounds(a),y=bounds(b),ox0=Math.max(x.x0,y.x0),ox1=Math.min(x.x1,y.x1),oy0=Math.max(x.y0,y.y0),oy1=Math.min(x.y1,y.y1);
 let x0:number,x1:number,y0:number,y1:number;
 if(oy1>oy0&&Math.max(x.x0,y.x0)>Math.min(x.x1,y.x1)){x0=Math.min(x.x1,y.x1);x1=Math.max(x.x0,y.x0);y0=oy0;y1=oy1;}
 else if(ox1>ox0&&Math.max(x.y0,y.y0)>Math.min(x.y1,y.y1)){x0=ox0;x1=ox1;y0=Math.min(x.y1,y.y1);y1=Math.max(x.y0,y.y0);}
 else throw new Error('The selected units need a clear gap between facing edges.');
 return {length:x1-x0,width:y1-y0,x:(x0+x1)/2,y:(y0+y1)/2,z:Math.max(cargoBottom(a),cargoBottom(b))};
}
