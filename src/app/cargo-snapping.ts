import {cargoBounds,sameLoadingSurface,type CargoArea} from './cargo-layout';
import {cargoBottom,placeCargoGroup,translateCargoGroup} from './cargo-placement';
import type {WeightDraft} from './loading-state';
type Position={x:number;y:number;z:number};
/** Nearby cargo faces are magnets; dunnage remains support/collision geometry only. */
export function placeWithCargoSnap(group:WeightDraft[],id:string,areas:CargoArea[],others:WeightDraft[],p:Position,stacking:boolean,grid:boolean|number,options?:{gap:number;range:number}){
 const fallback=()=>placeCargoGroup(group,id,areas,others,p,stacking,grid);
 if(!options)return fallback();
 if(!Number.isFinite(options.gap)||options.gap<0||!Number.isFinite(options.range)||options.range<=0)throw new Error('Invalid cargo snapping settings.');
 const anchor=group.find(w=>w.id===id)!;
 const shifted=translateCargoGroup(group,anchor,{...anchor,lcg:String(p.x),tcg:String(p.y),footprint:{...anchor.footprint!,bottomZ:p.z}});
 const candidates:{dx:number;dy:number}[]=[];
 const groupIds=new Set(group.map(w=>w.id));
 const targets=others.filter(other=>!groupIds.has(other.id)&&other.footprint&&other.footprint.kind!=='dunnage').map(other=>({other,b: cargoBounds(other),bottom:cargoBottom(other)})).filter(t=>t.b);
 for(const w of shifted.filter(w=>w.footprint?.kind!=='dunnage')){
  const a=cargoBounds(w)!;
  for(const {other,b:bounds,bottom} of targets){
  if(!sameLoadingSurface(w.footprint?.areaId,other.footprint!.areaId)||Math.abs(cargoBottom(w)-bottom)>1e-6)continue;
  const b=bounds!;
  if(Math.min(a.yMax,b.yMax)-Math.max(a.yMin,b.yMin)>1e-8)for(const dx of [b.xMin-options.gap-a.xMax,b.xMax+options.gap-a.xMin])if(Math.abs(dx)<=options.range){candidates.push({dx,dy:0});for(const dy of [b.yMin-a.yMin,b.yMax-a.yMax])if(Math.abs(dy)<=options.range)candidates.push({dx,dy});}
  if(Math.min(a.xMax,b.xMax)-Math.max(a.xMin,b.xMin)>1e-8)for(const dy of [b.yMin-options.gap-a.yMax,b.yMax+options.gap-a.yMin])if(Math.abs(dy)<=options.range){candidates.push({dx:0,dy});for(const dx of [b.xMin-a.xMin,b.xMax-a.xMax])if(Math.abs(dx)<=options.range)candidates.push({dx,dy});}
 }
 }
 // Prefer alignment of both axes when available, then the smallest movement.
 candidates.sort((a,b)=>Number(b.dx!==0&&b.dy!==0)-Number(a.dx!==0&&a.dy!==0)||Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));
 for(const delta of candidates){const target={...p,x:p.x+delta.dx,y:p.y+delta.dy};try{const moved=placeCargoGroup(group,id,areas,others,target,stacking,false),a=moved.find(w=>w.id===id)!;if(Math.abs(+a.lcg-target.x)<1e-7&&Math.abs(+a.tcg-target.y)<1e-7&&Math.abs(cargoBottom(a)-p.z)<1e-7)return moved;}catch{/* Try another valid face, never bypass support or collision checks. */}}
 return fallback();
}
