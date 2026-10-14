import {fileText,type ShipBundle} from './ship-package';
import type {TankCatalog} from './tank-operations';
import {parseHydrostaticTableCsv} from '../core/hydrostatics/solvers/table/hydrostatic-table-parser';
import {parseTrimmedTable} from '../core/trim/trimmed-table';
import {parseCrossCurvesCsv} from '../core/stability/solvers/cross-curves/cross-curves-parser';
import {parseConstantLcb} from '../core/stability/constant-lcb';
import {parseKgLimits} from '../core/stability/kg-limit';
import {parseWindData} from '../core/stability/wind-profile';
import {parseFloodData} from '../core/stability/downflooding';
import {auditHydrostatics} from './hydrostatic-audit';
import {deckDefinition} from './tween-deck';

/** Coverage of validated source data, not approval or a guarantee for every condition.
 * Runs on import/review only, never in the rendering or calculation loop. */
export function vesselDataFoundation(bundle:ShipBundle,catalog?:TankCatalog){
 const {manifest:m}=bundle;
 const resource=(kind:string)=>m.resources.find(r=>r.kind===kind);
 const json=(kind:string)=>{const r=resource(kind);return r?.path?JSON.parse(fileText(bundle,r.path)):undefined;};
 const upright=resource('hydrostatics.upright-table');
 const rows=upright?.path?parseHydrostaticTableCsv(fileText(bundle,upright.path)).rows:[];
 const range=(values:number[])=>values.length?[Math.min(...values),Math.max(...values)]:undefined;
 const complete=(field:keyof typeof rows[number])=>rows.length>0&&rows.every(r=>r[field]!==undefined);
 const volumes=rows.map(r=>r.volume??(r.displacementTonnes===undefined?undefined:r.displacementTonnes/m.defaultCondition.waterDensity));
 const inverse=volumes.length>0&&volumes.every((v,i)=>v!==undefined&&Number.isFinite(v)&&v>=0&&(i===0||v>volumes[i-1]!));
 const trimmedRaw=json('hydrostatics.trimmed-table'),trimmed=trimmedRaw?parseTrimmedTable(trimmedRaw):undefined;
 const constantRaw=json('stability.constant-lcb-cross-curves'),constant=constantRaw?parseConstantLcb(constantRaw):undefined;
 const crossResource=resource('stability.cross-curves');
 const cross=crossResource?.path?parseCrossCurvesCsv(fileText(bundle,crossResource.path)):undefined;
 const kgRaw=json('documentation.annotated-kg'),kg=kgRaw?parseKgLimits(kgRaw):undefined;
 const windRaw=json('stability.wind-profiles'),wind=windRaw?parseWindData(windRaw):undefined;
 const floodRaw=json('stability.downflooding-samples'),flood=floodRaw?parseFloodData(floodRaw):undefined;
 const deck=deckDefinition({manifest:m,baseUrl:''});
 const capabilities={
  uprightDisplacement:inverse,
  transverseGM:complete('kmTransverse'),
  longitudinalTrim:!!trimmed||(!!resource('trim.linear-equilibrium')&&complete('kmLongitudinal')&&complete('lcb')),
  gzCurves:!!cross||!!constant,
  tankFilling:!!catalog?.tanks.length,
  kgLimitComparison:!!kg,
  windProfiles:!!wind,
  downfloodingScreen:!!flood,
  movableDeck:!!deck,
  // There is no supported numerical resource for a coupled heeled draft/trim path.
  coupledHeeledDrafts:false,
 };
 return {
  capabilities,units:m.units,coordinates:m.coordinateSystem,
  upright:{rows:rows.length,draftMetres:range(rows.map(r=>r.draft)),referenceDensity:m.defaultCondition.waterDensity,
   missingFields:['kb','lcb','lcf','tcb','kmTransverse','kmLongitudinal','waterplaneArea','tonnesPerCentimetre'].filter(f=>!complete(f as keyof typeof rows[number])),
   screening:auditHydrostatics(rows,m.defaultCondition.waterDensity)},
  trimmed:trimmed?{waterDensity:trimmed.waterDensity,draftDatumFromAP:trimmed.draftDatumFromAP,mouldedDraftOffset:trimmed.mouldedDraftOffset,
   slices:trimmed.tables.map(t=>({trimMetres:t.trimMetres,rows:t.rows.length,displacementTonnes:range(t.rows.map(r=>r.displacementTonnes)),draftMetres:range(t.rows.map(r=>r.draft)),kmComplete:t.rows.every(r=>r.kmTransverse!==undefined)}))}:undefined,
  crossCurves:constant?{kind:'constant-lcb',heelDegrees:constant.heelAnglesDegrees,
   slices:constant.sets.map(s=>({initialTrimMetres:s.initialTrimMetres,rows:s.rows.length,displacementTonnes:range(s.rows.map(r=>r.displacementTonnes))}))}:cross?{kind:'zero-trim',volumeM3:range(cross.volumes),heelDegrees:cross.angles,rows:cross.rows.length}:undefined,
  tanks:catalog?.tanks.map(t=>({id:t.id,group:t.group,capacityM3:t.capacityM3,rows:t.rows.length,sourcePage:t.sourcePage,model:t.box?'analytic box':'upright volumetric-moment interpolation'})),
  kg:kg?{rows:kg.rows.length,draftMouldedMetres:range(kg.rows.map(r=>r.draftMouldedMetres))}:undefined,
  wind:wind?.profiles.map(p=>({id:p.id,rows:p.rows.length,draftMouldedMetres:range(p.rows.map(r=>r.draftMouldedMetres))})),
  flooding:flood?{massRangeTonnes:flood.massRangeTonnes,initialTrimMetres:range(flood.sets.map(s=>s.initialTrimMetres)),unknownSamples:flood.sets.reduce((n,s)=>n+s.openings.reduce((n,o)=>n+o.samples.filter(a=>a.floodingDisplacementTonnes===null).length,0),0)}:undefined,
  deck:deck?{source:deck.source,weights:deck.weights,storedPanels:deck.storedPanels.length}:undefined,
 };
}
