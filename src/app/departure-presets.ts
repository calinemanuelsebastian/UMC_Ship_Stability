import type {ShipModelPackage} from '../core/domain/ship-model';
import type {WeightDraft} from './loading-state';
import {roleOf,tankWeight,type TankCatalog} from './tank-operations';
export function applyTankPreset(ship:ShipModelPackage,catalog:TankCatalog,weights:WeightDraft[],mode:'departure'|'empty',ballastOnly=false):WeightDraft[]{
 const tanks=catalog.tanks.filter(t=>ballastOnly?t.group==='ballast':t.group!=='ballast');
 const groups=new Set<string>(tanks.map(t=>t.group)),ids=new Set(tanks.map(t=>t.id));
 if(mode==='departure'&&!catalog.departure)throw new Error('No documented departure preset.');
 const replacements=tanks.map(t=>{
  const p=catalog.departure?.tanks.find(p=>p.id===t.id);
  if(mode==='departure'&&!p)throw new Error(`No departure allocation for tank ${t.id}.`);
  if(p&&(!Number.isFinite(p.fillPercent)||p.fillPercent<0||p.fillPercent>100))throw new Error('Invalid departure percentage.');
  const current=weights.find(w=>w.tank?.id===t.id)?.tank;
  return tankWeight(t,{id:t.id,volumeM3:mode==='empty'?0:t.capacityM3*p!.fillPercent/100,density:mode==='empty'?(current?.density??t.defaultDensity):p!.density});
 });
 const extra=ballastOnly?[]:catalog.departure?.referenceLiquids??[],extraIds=new Set(extra.map(w=>w.id));
 return [...weights.filter(w=>!extraIds.has(w.id)&&(w.tank?!ids.has(w.tank.id):!groups.has(roleOf(ship,w)))),...replacements,...(mode==='departure'?structuredClone(extra):[])];
}
export function applyDepartureOnboard(catalog:TankCatalog,weights:WeightDraft[]):WeightDraft[]{
 if(!catalog.departure)throw new Error('No documented departure preset.');
 const ids=new Set(catalog.departure.onboard.map(w=>w.id));
 return [...weights.filter(w=>!ids.has(w.id)),...structuredClone(catalog.departure.onboard)];
}
