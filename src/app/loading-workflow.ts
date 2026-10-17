import type {ShipModelPackage} from '../core/domain/ship-model';
import {roleOf,type TankCatalog} from './tank-operations';
export const loadingSteps=[['onboard','Onboard condition'],['capacity','Cargo capacity'],['layout','Cargo layout'],['ballast','Ballast'],['weights','Review totals']] as const;
/** Partition editing/presets, never duplicate authoritative weights. */
export function onboardTankCatalog(ship:ShipModelPackage,catalog:TankCatalog,scope:'fuel'|'service'):TankCatalog {
 const accepts=(group:string)=>scope==='fuel'?['hfo','mdo','fuel'].includes(group):['freshwater','lube','misc'].includes(group);
 return {...catalog,tanks:catalog.tanks.filter(t=>accepts(t.group)),departure:catalog.departure?{...catalog.departure,referenceLiquids:catalog.departure.referenceLiquids?.filter(w=>scope==='fuel'?accepts(roleOf(ship,w)):!['hfo','mdo','fuel','ballast'].includes(roleOf(ship,w)))}:undefined};
}

/** Saving is a utility, not a required loading stage. */
export function nextLoadingStep(section:string){
 const index=loadingSteps.findIndex(([id])=>id===(section==='tanks'?'onboard':section));
 const next=section==='onboard'||section==='tanks'?loadingSteps.find(([id])=>id==='layout'):loadingSteps[index+1];
 return section==='weights'?{page:'view3d' as const,label:'Continue to 3D inspection'}:index>=0&&next?{page:'loading' as const,section:next[0],label:next[1]}:undefined;
}
