import {validateLoadingPresets,type LoadingPresets} from './loading-presets';
import {shipResourceUrl} from '../core/domain/ship-resource';
import type { ShipModelPackage } from '../core/domain/ship-model';
import type { WeightDraft } from './loading-state';
export const tankGroups=['ballast','hfo','mdo','freshwater','lube','misc'] as const;
export type TankGroup=typeof tankGroups[number];
export type TankPlan={layer:string;polygon:number[][];label:number[]};
export type Tank={plan?:TankPlan;box?:{length:number;width:number;height:number;bottomZ:number};id:string;name:string;group:TankGroup;capacityM3:number;defaultDensity:number;fullCentre:number[];sourcePage:number;tableEnd:number;rows:number[][]};
export type DeparturePreset={source:string;note:string;tanks:{id:string;fillPercent:number;density:number;sourceMassTonnes:number}[];onboard:WeightDraft[];referenceLiquids?:WeightDraft[]};
export type TankCatalog={conditions?:LoadingPresets;departure?:DeparturePreset;version:number;source:string;arrangement?:{source:string;note:string;outline:number[][];layers:string[]};tanks:Tank[]};
export type TankInput={id:string;volumeM3:number;density:number};
export function roleOf(ship:ShipModelPackage,w:WeightDraft):string {
  if(w.tank)return 'tank';
  const roles=ship.manifest.resources.find(r=>r.kind==='loading.tank-catalog')?.config?.roles as Record<string,string>|undefined;
  if(roles?.[w.id])return roles[w.id];
  if(isFixedWeight(ship,w.id))return 'fixed';
  return w.category??'cargo';
}
export function isFixedWeight(ship:ShipModelPackage,id:string):boolean {
  return ship.manifest.resources.some(r=>['loading.weights','loading.tank-catalog'].includes(r.kind)&&Array.isArray(r.config?.fixedWeightIds)&&r.config.fixedWeightIds.includes(id));
}
export function isCargo(ship:ShipModelPackage,w:WeightDraft){return roleOf(ship,w)==='cargo';}
export function parseTankInput(v:unknown):TankInput {
  const p=v as TankInput;
  if(!p||typeof p.id!=='string'||!p.id||p.id.length>80||!Number.isFinite(p.volumeM3)||p.volumeM3<0||!Number.isFinite(p.density)||p.density<=0)throw new Error('Invalid tank volume or liquid density.');
  return {id:p.id,volumeM3:p.volumeM3,density:p.density};
}
export async function loadTankCatalog(ship:ShipModelPackage):Promise<TankCatalog|undefined>{
  const resource=ship.manifest.resources.find(r=>r.kind==='loading.tank-catalog');if(!resource?.path)return undefined;
  const response=await fetch(shipResourceUrl(ship,resource.path));if(!response.ok)throw new Error('Unable to load documented tank tables.');
  const c=await response.json() as TankCatalog;
  if(c.version!==1||!Array.isArray(c.tanks)||c.tanks.length>200)throw new Error('Invalid tank catalogue.');
  if(c.arrangement&&(!Array.isArray(c.arrangement.layers)||!c.arrangement.layers.every(v=>typeof v==='string')||!Array.isArray(c.arrangement.outline)||c.arrangement.outline.length<3||!c.arrangement.outline.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))))throw new Error('Invalid tank arrangement.');
  const ids=new Set<string>();
  for(const t of c.tanks){
    if(!t.id||ids.has(t.id)||!tankGroups.includes(t.group)||!Number.isFinite(t.capacityM3)||t.capacityM3<=0||!Number.isFinite(t.defaultDensity)||t.defaultDensity<=0||!Array.isArray(t.rows)||t.rows.length<2)throw new Error('Invalid tank definition.');
    ids.add(t.id);
    if(!Array.isArray(t.fullCentre)||t.fullCentre.length!==3||!t.fullCentre.every(Number.isFinite))throw new Error('Invalid tank centre.');
    if(t.box&&(![t.box.length,t.box.width,t.box.height].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(t.box.bottomZ)||Math.abs(t.box.length*t.box.width*t.box.height-t.capacityM3)>1e-6))throw new Error('Invalid rectangular tank geometry.');
    if(t.plan&&(!c.arrangement?.layers.includes(t.plan.layer)||!Array.isArray(t.plan.polygon)||t.plan.polygon.length<3||!t.plan.polygon.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||!Array.isArray(t.plan.label)||t.plan.label.length!==2||!t.plan.label.every(Number.isFinite)))throw new Error('Invalid tank plan geometry.');
    if(t.rows[0][0]!==0||t.rows.at(-1)![0]!==t.capacityM3)throw new Error('Tank table does not cover its capacity.');
    t.rows.forEach((r,i)=>{if(r.length!==5||!r.every(Number.isFinite)||r[4]<0||i>0&&r[0]<=t.rows[i-1][0])throw new Error('Invalid tank filling table.');});
  }
  if(c.conditions)validateLoadingPresets(c.conditions,c);
  return c;
}
/** Interpolate volumetric moments, not guessed fixed tank CGs. Upright table approximation. */
export function tankWeight(t:Tank,input:TankInput):WeightDraft{
  const p=parseTankInput(input),v=p.volumeM3;
  if(p.id!==t.id||v>t.capacityM3)throw new Error(`Tank ${t.id}: volume must be between 0 and ${t.capacityM3} m³.`);
  const upper=t.rows.findIndex(r=>r[0]>=v);const b=t.rows[Math.max(0,upper)],a=t.rows[Math.max(0,upper-1)];
  const f=b[0]===a[0]?0:(v-a[0])/(b[0]-a[0]);
  const centre=(k:number)=>t.box?(k===3?t.box.bottomZ+v/(t.box.length*t.box.width)/2:t.fullCentre[k-1]):v===0?t.fullCentre[k-1]:(a[0]*a[k]+f*(b[0]*b[k]-a[0]*a[k]))/v;
  // Empty and pressed-full have no free surface. Slack values use tabulated Ix,
  // retaining a nonzero upper limit rather than interpolating down to zero before full.
  const ix=v===0||v===t.capacityM3?0:t.box?t.box.length*t.box.width**3/12:a[4]+f*(b[4]-a[4]);
  const values=[v*p.density,centre(1),centre(2),centre(3),ix*p.density];
  if(!values.every(Number.isFinite))throw new Error('Tank calculation is outside the supported numeric range.');
  return {id:`tank-${t.id}`,name:t.name,category:t.group==='ballast'?'ballast':t.group==='freshwater'?'freshwater':'other',massTonnes:String(values[0]),lcg:String(values[1]),tcg:String(values[2]),vcg:String(values[3]),freeSurfaceMomentTransverse:String(values[4]),tank:p};
}
export function normalizeTankWeights(ship:ShipModelPackage,weights:WeightDraft[],catalog?:TankCatalog):WeightDraft[]{
  const ids=new Set<string>(),groups=new Set<string>();
  const result=weights.map(w=>{
    if(!w.tank){if(w.id.startsWith('tank-'))throw new Error('Tank row is missing volume and density.');return w;}
    const t=catalog?.tanks.find(t=>t.id===w.tank!.id);if(!t)throw new Error('Unknown tank or tank tables are not loaded.');
    if(ids.has(t.id)||w.id!==`tank-${t.id}`)throw new Error('Duplicate or invalid tank identity.');ids.add(t.id);groups.add(t.group);
    return tankWeight(t,w.tank);
  });
  if(result.some(w=>!w.tank&&groups.has(roleOf(ship,w))))throw new Error('A tank plan cannot also include its legacy liquid totals.');
  return result;
}

/** New operational plan: retain documented fixed weights; tanks start empty. */
export function cleanLoadingPlan(ship:ShipModelPackage,reference:WeightDraft[],catalog:TankCatalog):WeightDraft[]{
 return [...reference.filter(w=>isFixedWeight(ship,w.id)),...catalog.tanks.map(t=>tankWeight(t,{id:t.id,volumeM3:0,density:t.defaultDensity}))];
}
