import {vesselDataFoundation} from './vessel-data-foundation';
import {deckDefinition} from './tween-deck';
import {mountShipBundle,parseShipBundle,type ShipBundle} from './ship-package';
import {loadTankCatalog,isFixedWeight,type TankCatalog} from './tank-operations';
import {loadLoadingWeights} from '../platform/ship-models/load-loading-weights';
import {loadValidationCases} from '../platform/ship-models/load-validation-cases';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
import {parseHydrostaticTableCsv} from '../core/hydrostatics/solvers/table/hydrostatic-table-parser';
import {fileText} from './ship-package';
export type ShipInspection={bundle:ShipBundle;foundation:ReturnType<typeof vesselDataFoundation>;catalog?:TankCatalog;warnings:string[];fixedCount:number;draftRange:number[];resourceCount:number};
export async function inspectShipPackage(raw:unknown):Promise<ShipInspection>{
 const bundle=parseShipBundle(raw),ship=mountShipBundle(bundle),warnings:string[]=[];
 try{
  const weights=await loadLoadingWeights(ship),catalog=await loadTankCatalog(ship);
  if(!weights.length||!weights.some(w=>w.massTonnes>0))throw new Error('Loading weights must include a positive vessel mass.');
  const ids=new Set(weights.map(w=>w.id));
  for(const r of ship.manifest.resources)for(const id of Array.isArray(r.config?.fixedWeightIds)?r.config.fixedWeightIds:[])if(!ids.has(String(id)))throw new Error(`Fixed weight ${id} is absent from the operational loading weights.`);
  if(catalog?.departure){for(const p of catalog.departure.tanks){const t=catalog.tanks.find(t=>t.id===p.id);if(!t||!Number.isFinite(p.fillPercent)||p.fillPercent<0||p.fillPercent>100||!Number.isFinite(p.density)||p.density<=0)throw new Error('Invalid departure tank preset.');}}
  await computeUprightHydrostatics(ship,ship.manifest.defaultCondition);
  if(ship.manifest.resources.some(r=>r.kind==='validation.reference-cases'))await loadValidationCases(ship);
  for(const w of deckDefinition(ship)?.weights??[])if(!ids.has(w.id)||!isFixedWeight(ship,w.id))throw new Error('Every deck weight must be declared as a fixed loading weight.');
  const fixedCount=weights.filter(w=>isFixedWeight(ship,w.id)).length;
  if(!fixedCount)warnings.push('No fixed vessel weights are declared. Review the loading model.');
  if(catalog?.tanks.some(t=>t.group==='ballast'&&!t.plan))warnings.push('Some ballast tanks have no arrangement polygon; numerical tank controls remain available.');
  if(!catalog)warnings.push('No tank filling tables are included.');
  if(!ship.manifest.resources.some(r=>['visualization.box-hull','visualization.schematic-cargo-hull'].includes(r.kind)))warnings.push('No supported 3D hull is included; calculation pages remain available.');
  if(ship.manifest.resources.some(r=>r.kind==='visualization.schematic-cargo-hull'))warnings.push('The 3D model is a visual reference. Imported geometry does not enable trim or heel calculations.');
  if(!ship.manifest.resources.some(r=>['stability.cross-curves','stability.constant-lcb-cross-curves'].includes(r.kind)))warnings.push('No cross curves: GZ and heel calculations are unavailable.');
  const resource=ship.manifest.resources.find(r=>r.kind==='hydrostatics.upright-table')!;
  const table=parseHydrostaticTableCsv(fileText(bundle,resource.path!));
  warnings.push('Import checks file consistency and the default hydrostatic calculation. It does not certify source accuracy or vessel safety.');
  const foundation=vesselDataFoundation(bundle,catalog);
  if(foundation.upright.screening.findings.length)warnings.push(`${foundation.upright.screening.findings.length} hydrostatic consistency findings require source review; values have not been changed.`);
  return {bundle,foundation,catalog,warnings,fixedCount,resourceCount:ship.manifest.resources.length,draftRange:[table.rows[0].draft,table.rows.at(-1)!.draft]};
 }finally{ship.release?.();}
}
