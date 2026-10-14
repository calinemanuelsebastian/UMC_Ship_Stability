import type {ShipModelPackage} from '../core/domain/ship-model';
import {roleOf,type TankCatalog} from './tank-operations';
export const loadingSteps=[['onboard','Onboard condition'],['capacity','Cargo capacity'],['layout','Cargo layout'],['ballast','Ballast'],['weights','Review totals'],['plans','Saved cargo plans']] as const;
/** Partition editing/presets, never duplicate authoritative weights. */
export function onboardTankCatalog(ship:ShipModelPackage,catalog:TankCatalog,scope:'fuel'|'service'):TankCatalog {
 const accepts=(group:string)=>scope==='fuel'?['hfo','mdo','fuel'].includes(group):['freshwater','lube','misc'].includes(group);
 return {...catalog,tanks:catalog.tanks.filter(t=>accepts(t.group)),departure:catalog.departure?{...catalog.departure,referenceLiquids:catalog.departure.referenceLiquids?.filter(w=>scope==='fuel'?accepts(roleOf(ship,w)):!['hfo','mdo','fuel','ballast'].includes(roleOf(ship,w)))}:undefined};
}
