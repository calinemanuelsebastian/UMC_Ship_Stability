import type {ShipModelPackage} from '../core/domain/ship-model';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
export type CapacityLimit={label:string;draft:number;datum:string;source:string;applicability:string;resourceId:string};
export function vesselCapacityLimit(ship:ShipModelPackage):CapacityLimit|undefined{
 const raw=ship.manifest.resources.find(r=>r.kind==='loading.capacity')?.config?.draftLimit;
 if(raw===undefined)return undefined;
 const c=raw as CapacityLimit;
 if(!c||!Number.isFinite(c.draft)||c.draft<=0||['label','datum','source','applicability','resourceId'].some(k=>typeof c[k as keyof CapacityLimit]!=='string'||!String(c[k as keyof CapacityLimit]).trim())||!ship.manifest.resources.some(r=>r.id===c.resourceId&&r.kind==='hydrostatics.upright-table'))throw new Error('Invalid documented capacity limit.');
 return c;
}
export async function resolveCapacityLimit(ship:ShipModelPackage,limit:CapacityLimit,density:number){
 if(!Number.isFinite(density)||density<=0)throw new Error('Enter a positive water density.');
 const result=await computeUprightHydrostatics(ship,{draft:limit.draft,waterDensity:density,vcg:0,lcg:0,tcg:0,heelDeg:0,trimDeg:0},{preferredResourceId:limit.resourceId});
 if(result.displacementTonnes===undefined||!Number.isFinite(result.displacementTonnes)||result.displacementTonnes<=0)throw new Error('Displacement is unavailable.');
 return result.displacementTonnes;
}
