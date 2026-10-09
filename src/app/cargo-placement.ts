import {cargoBounds,fitsArea,fitsFloor,sameLoadingSurface,placeCargo,type CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
export const cargoBottom=(w:WeightDraft)=>w.footprint?.bottomZ??w.footprint?.deckZ??0;
export function intersectsCargo(a:WeightDraft,b:WeightDraft){
 const x=cargoBounds(a),y=cargoBounds(b);if(!x||!y||!a.footprint||!b.footprint)return false;
 return Math.min(x.xMax,y.xMax)-Math.max(x.xMin,y.xMin)>1e-8&&Math.min(x.yMax,y.yMax)-Math.max(x.yMin,y.yMin)>1e-8&&Math.min(cargoBottom(a)+a.footprint.height,cargoBottom(b)+b.footprint.height)-Math.max(cargoBottom(a),cargoBottom(b))>1e-8;
}
function covers(a:WeightDraft,b:WeightDraft){const x=cargoBounds(a),y=cargoBounds(b);return !!x&&!!y&&x.xMin<=y.xMin+1e-8&&x.xMax>=y.xMax-1e-8&&x.yMin<=y.yMin+1e-8&&x.yMax>=y.yMax-1e-8;}
function horizontalContact(a:WeightDraft,b:WeightDraft){const x=cargoBounds(a),y=cargoBounds(b);return !!x&&!!y&&Math.min(x.xMax,y.xMax)-Math.max(x.xMin,y.xMin)>1e-8&&Math.min(x.yMax,y.yMax)-Math.max(x.yMin,y.yMin)>1e-8;}
/** Contact polygon only: this does not establish bending strength or allowable bearing loads. */
export function hasGeometricSupport(w:WeightDraft,others:WeightDraft[]){
 const contacts=others.filter(o=>o.id!==w.id&&o.footprint&&sameLoadingSurface(o.footprint.areaId,w.footprint?.areaId)&&Math.abs(cargoBottom(o)+o.footprint.height-cargoBottom(w))<1e-8&&horizontalContact(o,w));
 if(contacts.some(o=>covers(o,w)))return true;
 const b=cargoBounds(w);if(!b)return false;
 const regions=contacts.map(o=>cargoBounds(o)!);
 if(regions.length&&fitsArea({...b,id:'support',name:'Support',deckZ:cargoBottom(w),regions},b))return true;
 // Spanning is permitted over two or more dunnage contacts. The projected CG must
 // lie strictly inside their convex contact hull; arbitrary cargo cannot bridge voids.
 const bearers=contacts.filter(o=>o.footprint?.kind==='dunnage');if(bearers.length<2)return false;
 const points=bearers.flatMap(o=>{const r=cargoBounds(o)!;const x0=Math.max(r.xMin,b.xMin),x1=Math.min(r.xMax,b.xMax),y0=Math.max(r.yMin,b.yMin),y1=Math.min(r.yMax,b.yMax);return [[x0,y0],[x0,y1],[x1,y0],[x1,y1]];}).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const chain=(list:number[][])=>{const h:number[][]=[];for(const p of list){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h.slice(0,-1);};
 const hull=[...chain(points),...chain([...points].reverse())],cg=[Number(w.lcg),Number(w.tcg)];
 return hull.length>=3&&hull.every((p,i)=>cross(p,hull[(i+1)%hull.length],cg)>1e-8);
}
export function carriesCargo(w:WeightDraft,others:WeightDraft[]){return !!w.footprint&&others.some(o=>o.id!==w.id&&o.footprint&&Math.abs(cargoBottom(o)-(cargoBottom(w)+w.footprint!.height))<1e-8&&horizontalContact(w,o));}
/** One accepted placement updates geometry and physical CG together; no free-floating drops. */
export function placeSupportedCargo(w:WeightDraft,areas:CargoArea[],others:WeightDraft[],position:{x:number;y:number;z:number},stacking:boolean,snap:boolean|number):WeightDraft{
 if(!w.footprint)throw new Error('Select cargo with dimensions first.');
 const original=others.find(o=>o.id===w.id);
 if(original&&carriesCargo(original,others))throw new Error('Move the cargo supported by this item first.');
 const supports=areas.flatMap(area=>[
  {area,z:area.deckZ,support:undefined as WeightDraft|undefined},
  ...(stacking?others.filter(o=>o.id!==w.id&&o.footprint&&sameLoadingSurface(o.footprint.areaId,area.id)).map(o=>({area,z:cargoBottom(o)+o.footprint!.height,support:o})):[])
 ]).sort((a,b)=>Math.abs(a.z-position.z)-Math.abs(b.z-position.z));
 // Select the nearest support level. Never jump to a distant deck to evade a collision.
 const distance=supports.length?Math.abs(supports[0].z-position.z):Infinity;
 let reason='No supporting surface is available.';
 for(const candidate of supports.filter(s=>Math.abs(s.z-position.z)<=distance+1e-8)){
  const {area,z,support}=candidate;
  try{
   const footprint={...w.footprint,areaId:area.id,deckZ:area.deckZ,bottomZ:z};
   if(z+footprint.height>area.deckZ+(area.clearHeight??10)+1e-8)throw new Error('Cargo exceeds the available clear height.');
   const next={...w,footprint,hold:area.name,...placeCargo(area,footprint,position.x,position.y,snap),vcg:String(Number(w.vcg)+z-cargoBottom(w))};
   if(!fitsArea(area,cargoBounds(next)!))throw new Error('Cargo is outside the hold.');
   if(!support&&!fitsFloor(area,cargoBounds(next)!))throw new Error('A gap is not a supporting surface. Place cargo on explicit supports above it.');
   if(support&&!hasGeometricSupport(next,others))throw new Error('The cargo footprint must be fully supported.');
   if(others.some(o=>o.id!==w.id&&intersectsCargo(next,o)))throw new Error('Cargo would intersect another item.');
   return next;
  }catch(error){reason=(error as Error).message;}
 }
 throw new Error(reason);
}

/** Align a cargo item exactly with a chosen support; preserve its internal CG offset. */
export function stackCargoOn(w:WeightDraft,support:WeightDraft,areas:CargoArea[],others:WeightDraft[]){
 if(!support.footprint||w.id===support.id)throw new Error('Choose another cargo item as support.');
 const area=areas.find(a=>sameLoadingSurface(a.id,support.footprint!.areaId))||areas.find(a=>a.deckZ===support.footprint!.deckZ);
 if(!area)throw new Error('The supporting cargo is outside the selected hold.');
 return placeSupportedCargo(w,[area],others,{x:Number(support.lcg),y:Number(support.tcg),z:cargoBottom(support)+support.footprint.height},true,false);
}

/** Translate a selection atomically, preserving its spacing and support structure. */
export function translateCargoGroup(group:WeightDraft[],anchor:WeightDraft,next:WeightDraft){
 const dx=Number(next.lcg)-Number(anchor.lcg),dy=Number(next.tcg)-Number(anchor.tcg),dz=cargoBottom(next)-cargoBottom(anchor);
 return group.map(w=>({...w,lcg:String(Number(w.lcg)+dx),tcg:String(Number(w.tcg)+dy),vcg:String(Number(w.vcg)+dz),footprint:{...w.footprint!,bottomZ:cargoBottom(w)+dz}}));
}
export function placeCargoGroup(group:WeightDraft[],id:string,areas:CargoArea[],others:WeightDraft[],position:{x:number;y:number;z:number},stacking:boolean,snap:boolean|number){
 const anchor=group.find(w=>w.id===id)!;
 if(group.length===1)return [placeSupportedCargo(anchor,areas,others,position,stacking,snap)];
 const external=others.filter(w=>!group.some(g=>g.id===w.id));
 if(group.some(w=>carriesCargo(w,external)))throw new Error('Select the supported cargo as well before moving this structure.');
 const base=group.reduce((a,b)=>cargoBottom(a)<=cargoBottom(b)?a:b);
 const target={x:Number(base.lcg)+position.x-Number(anchor.lcg),y:Number(base.tcg)+position.y-Number(anchor.tcg),z:cargoBottom(base)+position.z-cargoBottom(anchor)};
 const placedBase=placeSupportedCargo(base,areas,external,target,stacking,snap);
 const moved=translateCargoGroup(group,base,placedBase);
 return moved.map(w=>{
  const next=placeSupportedCargo(w,areas,[...external,...moved.filter(v=>v.id!==w.id)],{x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)},true,false);
  if(Math.abs(Number(next.lcg)-Number(w.lcg))>1e-8||Math.abs(Number(next.tcg)-Number(w.tcg))>1e-8||Math.abs(cargoBottom(next)-cargoBottom(w))>1e-8)throw new Error('The whole selection must fit without changing its arrangement.');
  return next;
 });
}

/** Quarter turn in plan around the selected envelope centre. */
export function rotateCargoGroup(group:WeightDraft[],areas:CargoArea[],others:WeightDraft[]){
 if(!group.length||group.some(w=>!w.footprint))throw new Error('Select cargo with dimensions first.');
 const external=others.filter(w=>!group.some(g=>g.id===w.id));
 if(group.some(w=>carriesCargo(w,external)))throw new Error('Select the supported cargo as well before moving this structure.');
 const rotated=rotateCargoPreview(group);
 return rotated.map(w=>{const next=placeSupportedCargo(w,areas,[...external,...rotated.filter(v=>v.id!==w.id)],{x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)},true,false);if(Math.abs(Number(next.lcg)-Number(w.lcg))>1e-8||Math.abs(Number(next.tcg)-Number(w.tcg))>1e-8||Math.abs(cargoBottom(next)-cargoBottom(w))>1e-8)throw new Error('The rotated selection does not fit at this position.');return next;});
}

/** Rigid quarter turn for a ghost; placement validates it before committing. */
export function rotateCargoPreview(group:WeightDraft[]){
 if(!group.length||group.some(w=>!w.footprint))throw new Error('Select cargo with dimensions first.');
 const bounds=group.map(w=>cargoBounds(w)!);
 const cx=(Math.min(...bounds.map(b=>b.xMin))+Math.max(...bounds.map(b=>b.xMax)))/2,cy=(Math.min(...bounds.map(b=>b.yMin))+Math.max(...bounds.map(b=>b.yMax)))/2;
 return group.map(w=>({...w,lcg:String(cx-(Number(w.tcg)-cy)),tcg:String(cy+Number(w.lcg)-cx),footprint:{...w.footprint!,rotation:(w.footprint!.rotation===0?90:0) as 0|90}}));
}
