import {cloneMarkings} from './cargo-identification';
import {placeWithCargoSnap} from './cargo-snapping';
import {cargoBottom,intersectsCargo,hasGeometricSupport} from './cargo-placement';
import type {WeightDraft} from './loading-state';
import {placeCargo,layoutIssues,cargoBounds,fitsArea,fitsFloor,type CargoArea} from './cargo-layout';
import {cargoOnSurface} from './cargo-surfaces';
/** Find a free placement while preserving mass and KG relative to the supporting deck. */
export function pasteCargo(source:WeightDraft,area:CargoArea,weights:WeightDraft[],id:string,snap:boolean):WeightDraft {
 if(!source.footprint)throw new Error('Copy a cargo item with a footprint first.');
 const footprint={...source.footprint,markings:cloneMarkings(source.footprint.markings),deckZ:area.deckZ,bottomZ:area.deckZ,areaId:area.id};
 const dx=footprint.rotation===0?footprint.length:footprint.width,dy=footprint.rotation===0?footprint.width:footprint.length;
 const base={...structuredClone(source),id,name:source.name,hold:area.name,footprint,vcg:String(Number(source.vcg)+area.deckZ-(source.footprint.bottomZ??source.footprint.deckZ))};
 const neighbours=weights.filter(w=>cargoOnSurface(w,area));
 function attempt(x:number,y:number){try{const next={...base,...placeCargo(area,footprint,x,y,snap)};return layoutIssues([...neighbours,next],area).some(q=>q.id===id||q.other===id)?undefined:next;}catch{return undefined;}}
 const adjacent=attempt(Number(source.lcg)+dx+.1,Number(source.tcg));if(adjacent)return adjacent;
 let tries=0;
 for(let y=area.yMin+dy/2;y<=area.yMax-dy/2+1e-8;y+=dy+.1){
  for(let x=area.xMin+dx/2;x<=area.xMax-dx/2+1e-8;x+=dx+.1){
   if(++tries>10000)throw new Error('No free paste position found. Make space or choose another hold.');
   const next=attempt(x,y);if(next)return next;
  }
 }
 throw new Error('No free paste position found. Make space or choose another hold.');
}

/** Paste one rigid arrangement: only the common translation changes. */
export function pasteCargoGroup(sources:WeightDraft[],area:CargoArea,weights:WeightDraft[],id:()=>string,snap:boolean,gap=.1,position?:{x:number;y:number},snapping?:{grid:boolean|number;cargo?:{gap:number;range:number}}):WeightDraft[]{
 if(!Number.isFinite(gap)||gap<0)throw new Error('Enter a non-negative gap.');
 if(!sources.length||sources.some(w=>!w.footprint||!cargoBounds(w)))throw new Error('Select items with dimensions and positions first.');
 if(new Set(sources.map(w=>w.footprint!.deckZ)).size>1)throw new Error('Copy a structure from one loading surface at a time.');
 const bounds=sources.map(w=>cargoBounds(w)!);
 const minX=Math.min(...bounds.map(b=>b.xMin)),maxX=Math.max(...bounds.map(b=>b.xMax)),minY=Math.min(...bounds.map(b=>b.yMin)),maxY=Math.max(...bounds.map(b=>b.yMax));
 const bottom=Math.min(...sources.map(cargoBottom)),dz=area.deckZ-bottom;
 const clones=sources.map(w=>({...structuredClone(w),id:id(),name:w.name,hold:area.name,vcg:String(Number(w.vcg)+dz),footprint:{...w.footprint!,markings:cloneMarkings(w.footprint!.markings),areaId:area.id,deckZ:area.deckZ,bottomZ:cargoBottom(w)+dz}}));
 function attempt(x:number,y:number,align=snap){
  if(align){x=area.xMin+Math.round((x-area.xMin)*10)/10;y=area.yMin+Math.round((y-area.yMin)*10)/10;}
  const next=clones.map((w,i)=>({...w,lcg:String(Number(sources[i].lcg)+x-minX),tcg:String(Number(sources[i].tcg)+y-minY)}));
  if(next.some(w=>!fitsArea(area,cargoBounds(w)!)||cargoBottom(w)+w.footprint.height>area.deckZ+(area.clearHeight??10)+1e-8))return;
  if(next.some(w=>Math.abs(cargoBottom(w)-area.deckZ)<1e-8&&!fitsFloor(area,cargoBounds(w)!)))return;
  const all=[...weights,...next];
  if(next.some(w=>all.some(o=>o.id!==w.id&&intersectsCargo(w,o))))return;
  if(next.some(w=>cargoBottom(w)>area.deckZ+1e-8&&!hasGeometricSupport(w,all)))return;
  return next;
 }
 if(position&&snapping){const raw=clones.map((w,i)=>({...w,lcg:String(Number(sources[i].lcg)+position.x-(minX+maxX)/2),tcg:String(Number(sources[i].tcg)+position.y-(minY+maxY)/2)}));const anchor=raw[0];return placeWithCargoSnap(raw,anchor.id,[area],weights,{x:Number(anchor.lcg),y:Number(anchor.tcg),z:cargoBottom(anchor)},false,snapping.grid,snapping.cargo);}
 if(position){const next=attempt(position.x-(maxX-minX)/2,position.y-(maxY-minY)/2,false);if(!next)throw new Error('The copied selection does not fit here or lacks support.');return next;}
 const adjacent=attempt(maxX+gap,minY,false);if(adjacent)return adjacent;
 let tries=0;
 for(let y=area.yMin;y<=area.yMax-(maxY-minY)+1e-8;y+=maxY-minY+gap){for(let x=area.xMin;x<=area.xMax-(maxX-minX)+1e-8;x+=maxX-minX+gap){if(++tries>10000)break;const next=attempt(x,y);if(next)return next;}}
 throw new Error('No free supported position for this structure. Include its supports or choose a larger clear area.');
}
