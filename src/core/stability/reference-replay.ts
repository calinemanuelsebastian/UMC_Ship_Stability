import {computeLoadingCondition} from '../loading/compute-loading-condition';
import type {ShipModelPackage} from '../domain/ship-model';
import type {WeatherReference} from './weather-evidence';
import {sharedResults} from '../calculations/shared-results';
import {loadTrimmedTable} from '../trim/shared-trim-table';
import {computeTableTrim} from '../trim/trimmed-table';
import {computeStabilityCurves} from './compute-stability-curves';
import {computeFreeSurfaceCorrection} from '../loading/free-surface-correction';
import {referenceDiagnostics} from './reference-diagnostics';

export type ReplayRow={label:string;source?:number;calculated?:number;difference?:number;unit:string;note:string};
export type Replay={id:string;inputs:unknown;rows:ReplayRow[];source:unknown;scope:string;diagnostics?:ReturnType<typeof referenceDiagnostics>};
function row(label:string,source:number|undefined,calculated:number|undefined,unit:string,note:string):ReplayRow {
 return {label,source,calculated,difference:source===undefined||calculated===undefined?undefined:calculated-source,unit,note};
}
/** Read-only replay of printed totals, never a conversion to editable tank allocations.
 * Only requested cases run; the normal vessel-scoped cache deduplicates resources/work.
 */
export function replayReference(ship:ShipModelPackage,c:WeatherReference):Promise<Replay> {
 return sharedResults.read(ship,'booklet-reference-replay-v1',c,async(s,c)=>{
  const table=await loadTrimmedTable(s);
  const inputs={displacementTonnes:c.massTonnes,lcg:c.lcg,vcg:c.physicalKg,tcg:c.tcgStarboard,freeSurfaceMomentTransverse:c.fsm,waterDensity:table.waterDensity};
  const initial=c.rows.find(r=>r.anglePortDeg===0);
  const trim=computeTableTrim(table,inputs,s.manifest.principalDimensions.lbp);
  const fsc=computeFreeSurfaceCorrection(c.massTonnes,c.physicalKg,c.fsm).freeSurfaceCorrectionTransverse;
  const rows:ReplayRow[]=[
   row('Initial trim',initial?.trim,trim.trimMetres,'m','Live table solver using printed displacement and LCG. Residual includes rounded inputs and table interpolation; no regulatory tolerance is assumed.'),
   row('Initial moulded draft',initial?.draft,trim.mouldedDraft,'m','Live table solver; documented underside-keel to moulded offset applied once.'),
   row('Free-surface correction',undefined,fsc,'m','FSM / displacement; printed total FSM is applied once.'),
   row('Corrected initial GM',undefined,trim.kmTransverse===undefined?undefined:trim.kmTransverse-c.physicalKg-fsc,'m','Calculated at solved trim. An independent printed GM is not present in this extracted case; no comparison verdict.'),
  ];
  if(c.weightRows){
   const totals=computeLoadingCondition(c.weightRows);
   const note='Live weight summation from original printed rows, including original panel centres and tank masses. Differences retain source rounding; no adapted starter values.';
   rows.unshift(row('Displacement',c.massTonnes,totals.displacementTonnes,'t',note),row('KG',c.physicalKg,totals.vcg,'m',note),row('LCG',c.lcg,totals.lcg,'m',note),row('TCG',c.tcgStarboard,totals.tcg,'m',note),row('Total FSM',c.fsm,totals.freeSurfaceMomentTransverse,'t·m',note));
  }
  for(const p of c.rows){
   const a=p.anglePortDeg*Math.PI/180;
   rows.push(row(`Port GZ ${p.anglePortDeg}°`,p.gzCorrectedPort,p.kn-(c.physicalKg+fsc)*Math.sin(a)+c.tcgStarboard*Math.cos(a),'m','Uses printed port KN and original KG/TCG/FSM totals. Checks correction/sign arithmetic, not the general cross-curve interpolation.'));
  }
  return {id:c.id,inputs:{...inputs,originalWeightRows:c.weightRows},source:{file:c.sourceFile,sha256:c.sourceSha256,weightsPage:c.weightsPage,curvePage:c.curvePage},rows,diagnostics:referenceDiagnostics(c),scope:(c.weightRows?'Weight totals independently recomputed from preserved source rows. ':'Aggregate-only reference: mass and centres cannot be independently checked. ')+ 'Exact printed aggregate inputs; independent of current loading and editable starters. Trim uses printed totals to isolate the interpolation check from weight-rounding differences. Port GZ uses source KN because a reusable port grid is unavailable. Heeled draft/trim paths are not reproduced. Differences are reported for review, not labelled rounding automatically.'};
 });
}
/** Independent starboard example: manual PDF 12–13, already-corrected KG.
 * Supplying FSM=0 avoids correcting that KG a second time.
 */
export function replayWorkedExample(ship:ShipModelPackage):Promise<Replay>{
 return sharedResults.read(ship,'booklet-worked-example-v1',null,async s=>{
  const inputs={displacementTonnes:13201.307,waterDensity:1.025,vcg:4.647,lcg:58.731,tcg:.004,freeSurfaceMomentTransverse:0};
  const result=await computeStabilityCurves(s,inputs,{initialTrimMetres:-.774});
  const kn=[0,.267,.668,1.335,1.603,2.004,2.678,3.359,4.006,4.623,5.229,6.204,6.798];
  const gz=[-.004,.101,.259,.525,.633,.798,1.085,1.392,1.680,1.955,2.239,2.641,2.772];
  const angles=[0,2,5,10,12,15,20,25,30,35,40,50,60];
  const rows=[row('Corrected initial GM',3.005,result.gmAtTrim?.correctedGm,'m','Independent printed GM, PDF 12. Source KG is already corrected; FSM=0.')];
  angles.forEach((a,i)=>{const p=result.points.find(p=>p.heelDeg===a);rows.push(row(`Starboard KN ${a}°`,kn[i],p?.kn,'m','Live cross-curve interpolation at the printed initial trim.'),row(`Starboard GZ ${a}°`,gz[i],p?.gzCorrected,'m','Live corrected GZ solver; printed values have 0.001 m precision.'));});
  return {id:'manual-worked-example',inputs:{...inputs,initialTrimMetres:-.774,kgAlreadyCorrected:true},source:{file:'004_STABILITY_LOADING_MANUAL.pdf',pages:[12,13]},rows,scope:'Independent live-solver comparison for the manual worked example. Initial trim is prescribed by the example, not independently solved in this check. Only available for the Vectis source dataset.'};
 });
}
