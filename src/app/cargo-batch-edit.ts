import type {WeightDraft} from './loading-state';
import {parseFootprint,type CargoArea} from './cargo-layout';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
export function sameCargoType(a:WeightDraft,b:WeightDraft){
 const x=a.footprint,y=b.footprint;
 return !!x&&!!y&&x.kind!=='dunnage'&&y.kind!=='dunnage'&&a.name.trim().toLowerCase()===b.name.trim().toLowerCase()&&x.length===y.length&&x.width===y.width&&x.height===y.height;
}
export type CargoBatchPatch={name?:string;massTonnes?:number;length?:number;width?:number;height?:number;stackability?:'unknown'|'stackable'|'unstackable';maxTopLoadTonnes?:number|null};
export function editCargoBatch(weights:WeightDraft[],ids:string[],patch:CargoBatchPatch,areas:CargoArea[]){
 if(!ids.length)throw new Error('Select cargo with dimensions first.');
 for(const [key,value] of Object.entries(patch)){
  if(key==='stackability'){if(!['unknown','stackable','unstackable'].includes(String(value)))throw new Error('Invalid stackability setting.');}
  else if(key==='maxTopLoadTonnes'){if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<0))throw new Error('Invalid top-load limit.');}
  else if(key==='name'?typeof value!=='string'||!value.trim():typeof value!=='number'||!Number.isFinite(value)||value<=0)throw new Error('Enter positive values and a non-empty cargo name.');
 }
 const targets=weights.filter(w=>ids.includes(w.id));
 if(targets.length!==ids.length||targets.some(w=>!w.footprint||w.footprint.kind==='dunnage'))throw new Error('Batch editing supports cargo units only.');
 const next=weights.map(w=>{
  if(!ids.includes(w.id))return w;
  const p=w.footprint!;
  const footprint=parseFootprint({...p,...(patch.stackability?{stackability:patch.stackability}:{}),...('maxTopLoadTonnes' in patch?{maxTopLoadTonnes:patch.maxTopLoadTonnes??undefined}:{}),length:patch.length??p.length,width:patch.width??p.width,height:patch.height??p.height});
  return {...w,name:patch.name?.trim()??w.name,massTonnes:patch.massTonnes===undefined?w.massTonnes:String(patch.massTonnes),footprint,vcg:String(Number(w.vcg)+(footprint.height-p.height)/2)};
 });
 if(['length','width','height'].some(k=>k in patch)){
  for(const w of next.filter(w=>w.footprint)){
   const placed=placeSupportedCargo(w,areas,next.filter(v=>v.id!==w.id),{x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)},true,false);
   if(Math.abs(Number(placed.lcg)-Number(w.lcg))>1e-8||Math.abs(Number(placed.tcg)-Number(w.tcg))>1e-8||Math.abs(cargoBottom(placed)-cargoBottom(w))>1e-8)throw new Error('Edited dimensions do not fit at the current cargo positions.');
  }
 }
 return next;
}
