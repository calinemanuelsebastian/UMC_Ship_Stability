import type {ShipModelPackage} from '../core/domain/ship-model';
import type {WeightDraft} from './loading-state';
import {isCargo} from './tank-operations';
import {cargoOnSurface} from './cargo-surfaces';
import type {CargoArea,PlanRegion} from './cargo-layout';
export type CapacitySettings={limitMode?:'documented'|'manual';limit?:number;limitSource:string;limitDensity?:number;reserve:number;supportAllowance:number;areaId:string;method:'package'|'sf';unitMass?:number;length?:number;width?:number;height?:number;stowageFactor?:number;quantity?:number};
export const defaultCapacitySettings:CapacitySettings={limitSource:'',reserve:0,supportAllowance:0,areaId:'',method:'package'};
export function parseCapacitySettings(raw:unknown):CapacitySettings{
 const s=raw as CapacitySettings;
 if(!s||typeof s!=='object'||Array.isArray(s)||typeof s.limitSource!=='string'||s.limitSource.length>1000||typeof s.areaId!=='string'||s.areaId.length>120||!['package','sf'].includes(s.method))throw new Error('Invalid capacity settings.');
 if(s.limitMode!==undefined&&!['documented','manual'].includes(s.limitMode))throw new Error('Invalid capacity settings.');
 for(const k of ['reserve','supportAllowance'] as const)if(!Number.isFinite(s[k])||s[k]<0)throw new Error('Invalid capacity allowance.');
 for(const k of ['limit','limitDensity','unitMass','length','width','height','stowageFactor'] as const)if(s[k]!==undefined&&(!Number.isFinite(s[k])||s[k]!<=0))throw new Error('Capacity inputs must be positive.');
 if(s.quantity!==undefined&&(!Number.isSafeInteger(s.quantity)||s.quantity<0))throw new Error('Quantity must be a non-negative whole number.');
 return {...(s.limitMode?{limitMode:s.limitMode}:{}),limitSource:s.limitSource,areaId:s.areaId,method:s.method,reserve:s.reserve,supportAllowance:s.supportAllowance,...Object.fromEntries(['limit','limitDensity','unitMass','length','width','height','stowageFactor','quantity'].filter(k=>s[k as keyof CapacitySettings]!==undefined).map(k=>[k,s[k as keyof CapacitySettings]]))};
}
/** Area of a union, so stepped/overlapping planning regions are never counted twice. */
export function regionArea(regions:PlanRegion[]){
 const xs=[...new Set(regions.flatMap(r=>[r.xMin,r.xMax]))].sort((a,b)=>a-b);let total=0;
 for(let i=1;i<xs.length;i++){
  const x=(xs[i-1]+xs[i])/2,ys=regions.filter(r=>r.xMin<x&&r.xMax>x).map(r=>[r.yMin,r.yMax]).sort((a,b)=>a[0]-b[0]);
  let end=-Infinity,length=0;for(const [lo,hi] of ys){length+=Math.max(0,hi-Math.max(lo,end));end=Math.max(end,hi);}total+=(xs[i]-xs[i-1])*length;
 }return total;
}
/** Correct only machine-precision quotient noise, never displayed-value rounding.
 * Counts beyond safe integer precision are unavailable rather than misleading. */
export function wholeCapacityUnits(available:number,perUnit:number):number|undefined {
 if(!Number.isFinite(available)||!Number.isFinite(perUnit)||perUnit<=0)return;
 const quotient=Math.max(0,available)/perUnit;
 if(!Number.isFinite(quotient)||quotient>Number.MAX_SAFE_INTEGER)return;
 const nearest=Math.round(quotient),tolerance=8*Number.EPSILON*Math.max(1,quotient);
 // Do not round a positive sub-unit capacity up when integer precision is coarse.
 return Math.abs(quotient-nearest)<=Math.min(tolerance,1e-7)?nearest:Math.floor(quotient);
}
/** Continuous single-cargo intake; whole-package rounding is reported separately. */
export function stowageComparison(mass:number|undefined,volume:number|undefined,sf:number|undefined){
 const valid=(n:number|undefined):n is number=>n!==undefined&&Number.isFinite(n)&&n>0;
 const criticalStowageFactor=valid(mass)&&valid(volume)?volume/mass:undefined;
 if(!valid(mass)||!valid(volume)||!valid(sf))return {criticalStowageFactor,loadingOutcome:mass!==undefined&&mass<=0||volume!==undefined&&volume<=0?'No remaining capacity':'Incomplete'};
 const volumeMass=volume/sf;
 const equal=Math.abs(volumeMass-mass)<=1e-9*Math.max(mass,volumeMass);
 const maximumCargoMass=Math.min(mass,volumeMass);
 return {criticalStowageFactor,maximumCargoMass,unusedMass:Math.max(0,mass-maximumCargoMass),unusedVolume:Math.max(0,volume-maximumCargoMass*sf),loadingOutcome:equal?'Full and Down':volumeMass<mass?'Full':'Down'};
}
export function cargoCapacity(ship:ShipModelPackage,weights:WeightDraft[],areas:CargoArea[],settings:CapacitySettings,density?:number){
 const s=parseCapacitySettings(settings);let cargo=0,supports=0,other=0;let massesComplete=true;let unlocated=0;
 const used=new Map<CargoArea,number>();const unknown=new Set<CargoArea>();
 for(const w of weights){
  const mass=Number(w.massTonnes);if(!w.massTonnes.trim()||!Number.isFinite(mass)||mass<0)massesComplete=false;
  else if(!isCargo(ship,w))other+=mass;else if(w.footprint?.kind==='dunnage')supports+=mass;else cargo+=mass;
  if(!isCargo(ship,w))continue;
  const matches=areas.filter(a=>cargoOnSurface(w,a));
  if(!w.footprint||matches.length!==1){unlocated++;for(const a of matches)unknown.add(a);continue;}
  const p=w.footprint,volume=p.length*p.width*p.height;
  if(!Number.isFinite(volume)||volume<=0){unknown.add(matches[0]);continue;}
  used.set(matches[0],(used.get(matches[0])??0)+volume);
 }
 const rows=areas.map(a=>{const total=a.clearHeight===undefined?undefined:regionArea(a.regions??[a])*a.clearHeight;const occupied=used.get(a)??0;return {area:a,total,occupied,remaining:total===undefined||unknown.has(a)?undefined:total-occupied};});
 const selected=s.areaId?rows.filter(r=>(r.area.id??r.area.name)===s.areaId):rows.filter(r=>!r.area.panels&&!r.area.id?.startsWith('hatch-'));
 const spaceComplete=selected.length>0&&unlocated===0&&selected.every(r=>r.remaining!==undefined);
 const remainingVolume=spaceComplete?selected.reduce((sum,r)=>sum+r.remaining!,0):undefined;
 const limitCurrent=s.limit!==undefined&&!!s.limitSource.trim()&&s.limitDensity!==undefined&&density!==undefined&&Math.abs(s.limitDensity-density)<1e-9;
 const currentMass=massesComplete?cargo+supports+other:undefined;
 const remainingMass=limitCurrent&&currentMass!==undefined?s.limit!-currentMass-s.reserve-s.supportAllowance:undefined;
 const volumePerUnit=s.method==='package'?(s.length&&s.width&&s.height?s.length*s.width*s.height:undefined):(s.stowageFactor&&s.unitMass?s.stowageFactor*s.unitMass:undefined);
 const weightUnits=remainingMass!==undefined&&s.unitMass?wholeCapacityUnits(remainingMass,s.unitMass):undefined;
 const volumeUnits=remainingVolume!==undefined&&volumePerUnit?wholeCapacityUnits(remainingVolume,volumePerUnit):undefined;
 const additionalUnits=weightUnits!==undefined&&volumeUnits!==undefined?Math.min(weightUnits,volumeUnits):undefined;
 const cargoStowageFactor=s.method==='sf'?s.stowageFactor:volumePerUnit!==undefined&&s.unitMass?volumePerUnit/s.unitMass:undefined;
 const comparison=stowageComparison(remainingMass,remainingVolume,cargoStowageFactor);
 return {...comparison,cargoStowageFactor,cargo,supports,other,currentMass,massesComplete,unlocated,rows,remainingVolume,remainingMass,limitCurrent,weightUnits,volumeUnits,additionalUnits,
  limiting:comparison.loadingOutcome==='Full'?'Volume':comparison.loadingOutcome==='Down'?'Weight':comparison.loadingOutcome==='Full and Down'?'Weight and volume':comparison.loadingOutcome==='No remaining capacity'?'No remaining capacity':'Incomplete',
  requiredMass:s.quantity!==undefined&&s.unitMass?s.quantity*s.unitMass:undefined,requiredVolume:s.quantity!==undefined&&volumePerUnit?s.quantity*volumePerUnit:undefined};
}

export type CapacityCargoTemplate={area:CargoArea;mass:number;length:number;width:number;height:number;quantity?:number};
export function capacityCargoTemplate(settings:CapacitySettings,areas:CargoArea[]):CapacityCargoTemplate|undefined{
 const area=areas.find(a=>(a.id??a.name)===settings.areaId)??(!settings.areaId&&areas.length===1?areas[0]:undefined);
 const {unitMass:mass,length,width,height,quantity}=settings;
 if(!area||[mass,length,width,height].some(n=>n===undefined||!Number.isFinite(n)||n<=0))return;
 return {area,mass:mass!,length:length!,width:width!,height:height!,quantity};
}
