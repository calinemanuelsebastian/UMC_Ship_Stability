import {sharedResults} from '../calculations/shared-results';
import {loadTrimmedTable} from '../trim/shared-trim-table';
import {parseFloodData,screenDownflooding} from './downflooding';
import type {ShipModelPackage,SimulationCondition} from '../domain/ship-model';
import type {StabilityResult} from '../domain/stability-result';
import {shipResourceUrl} from '../domain/ship-resource';
import {computeFreeSurfaceCorrection} from '../loading/free-surface-correction';
import {computeTableTrim,interpolateTrimmedKm} from '../trim/trimmed-table';
type Row={displacementTonnes:number;ordinatesMetres:number[]};
export type ConstantLcbData={format:string;version:number;heelDirection:string;heelAnglesDegrees:number[];sets:{initialTrimMetres:number;rows:Row[]}[]};
export function parseConstantLcb(raw:unknown):ConstantLcbData{
 const d=raw as ConstantLcbData;
 if(!d||d.format!=='vectis-cross-curves-source'||d.version!==1||d.heelDirection!=='starboard'||!Array.isArray(d.heelAnglesDegrees)||d.heelAnglesDegrees.length<3||d.heelAnglesDegrees[0]!==0||d.heelAnglesDegrees.some((a,i)=>!Number.isFinite(a)||a<0||a>90||i>0&&a<=d.heelAnglesDegrees[i-1])||!Array.isArray(d.sets)||d.sets.length<2)throw new Error('Invalid constant-LCB cross curves.');
 for(const [i,s] of d.sets.entries()){if(!Number.isFinite(s.initialTrimMetres)||i>0&&s.initialTrimMetres<=d.sets[i-1].initialTrimMetres||!Array.isArray(s.rows)||s.rows.length<2)throw new Error('Invalid initial-trim grid.');s.rows.forEach((r,j)=>{if(!Number.isFinite(r.displacementTonnes)||r.displacementTonnes<=0||j>0&&r.displacementTonnes<=s.rows[j-1].displacementTonnes||!Array.isArray(r.ordinatesMetres)||r.ordinatesMetres.length!==d.heelAnglesDegrees.length||!r.ordinatesMetres.every(Number.isFinite))throw new Error('Invalid cross-curve row.');});}
 return d;
}
function bracket(values:number[],value:number){if(!Number.isFinite(value)||value<values[0]||value>values.at(-1)!)throw new Error('Condition is outside the supplied constant-LCB table range.');const hi=values.findIndex(x=>x>=value),lo=Math.max(0,hi-1);return {lo,hi,f:hi===lo?0:(value-values[lo])/(values[hi]-values[lo])};}
export function interpolateConstantLcb(d:ConstantLcbData,mass:number,trim:number){const t=bracket(d.sets.map(s=>s.initialTrimMetres),trim);const at=(index:number)=>{const rows=d.sets[index].rows,b=bracket(rows.map(r=>r.displacementTonnes),mass);return rows[b.lo].ordinatesMetres.map((v,i)=>v+(rows[b.hi].ordinatesMetres[i]-v)*b.f);};const a=at(t.lo),b=at(t.hi);return a.map((v,i)=>v+(b[i]-v)*t.f);}
export async function computeConstantLcb(ship:ShipModelPackage,c:SimulationCondition,options:{initialTrimMetres?:number;longitudinalFsm?:number}={}):Promise<StabilityResult>{
 const r=ship.manifest.resources.find(r=>r.kind==='stability.constant-lcb-cross-curves');if(!r?.path)throw new Error('No constant-LCB cross curves are configured.');
 if(ship.manifest.units.length!=='m'||ship.manifest.units.mass!=='t'||ship.manifest.units.angle!=='deg'||ship.manifest.units.density!=='t/m3'||ship.manifest.coordinateSystem.yPositive!=='starboard'||ship.manifest.coordinateSystem.zPositive!=='up')throw new Error('Constant-LCB curves require metre/tonne units and baseline-up, starboard-positive coordinates.');
 if(![c.displacementTonnes,c.vcg,c.tcg,c.lcg,c.waterDensity].every(v=>typeof v==='number'&&Number.isFinite(v))||c.displacementTonnes!<=0||c.draft!==undefined||(c.heelDeg??0)!==0||(c.trimDeg??0)!==0)throw new Error('Enter a finite loading condition with positive displacement and no imposed attitude.');
 const referenceDensity=r.config?.referenceWaterDensity;
 if(typeof referenceDensity!=='number'||!Number.isFinite(referenceDensity)||referenceDensity<=0||Math.abs(c.waterDensity-referenceDensity)>1e-9)throw new Error('Constant-LCB mass tables currently require their declared reference water density; density rescaling is not enabled.');
 if((options.longitudinalFsm??0)!==0)throw new Error('Constant-LCB initial trim requires zero longitudinal FSM; liquid redistribution is not solved.');
 const d=await sharedResults.read(ship,'constant-lcb-data',r.path,async s=>{const response=await fetch(shipResourceUrl(s,r.path!));if(!response.ok)throw new Error('Could not load constant-LCB cross curves.');return parseConstantLcb(await response.json());});
 let trim=options.initialTrimMetres;
 const tr=ship.manifest.resources.find(r=>r.kind==='hydrostatics.trimmed-table');
 let table;
 if(tr?.path){table=await loadTrimmedTable(ship);if(Math.abs(table.waterDensity-c.waterDensity)>1e-10)throw new Error('Water density must match trimmed KM data.');}
 if(trim===undefined){if(!table)throw new Error('Initial trim requires a compatible trimmed hydrostatic table.');trim=computeTableTrim(table,{displacementTonnes:c.displacementTonnes!,lcg:c.lcg,waterDensity:c.waterDensity},ship.manifest.principalDimensions.lbp).trimMetres;}
 const km=table?interpolateTrimmedKm(table,c.displacementTonnes!,trim):undefined;
 const ordinates=interpolateConstantLcb(d,c.displacementTonnes!,trim);
 const correction=computeFreeSurfaceCorrection(c.displacementTonnes!,c.vcg,c.freeSurfaceMomentTransverse??0);
 const points=d.heelAnglesDegrees.map((heelDeg,i)=>{const a=heelDeg*Math.PI/180,kn=ordinates[i],gz=kn-c.vcg*Math.sin(a)-c.tcg*Math.cos(a),gzCorrected=gz-correction.freeSurfaceCorrectionTransverse*Math.sin(a);if(![gz,gzCorrected].every(Number.isFinite))throw new Error('Righting lever exceeds the supported numeric range.');return {heelDeg,kn,gz,gzCorrected};});
 const floodResource=ship.manifest.resources.find(r=>r.kind==='stability.downflooding-samples');
 let downflooding;
 if(floodResource){if(!floodResource.path)throw new Error('Missing downflooding resource path.');const flood=await sharedResults.read(ship,'flood-data',floodResource.path,async s=>{const response=await fetch(shipResourceUrl(s,floodResource.path!));if(!response.ok)throw new Error('Could not load downflooding data.');return parseFloodData(await response.json());});downflooding=screenDownflooding(flood,c.displacementTonnes!,trim,c.waterDensity);}
 const gmAtTrim=km===undefined?undefined:{kmTransverse:km,correctedGm:km-c.vcg-correction.freeSurfaceCorrectionTransverse,initialTrimMetres:trim,sourcePath:tr!.path!};
 if(gmAtTrim&&!Number.isFinite(gmAtTrim.correctedGm))throw new Error('Corrected GM exceeds supported numeric range.');
 return {gmAtTrim,downflooding,condition:c,displacementTonnes:c.displacementTonnes!,volume:c.displacementTonnes!/c.waterDensity,freeSurfaceCorrectionTransverse:correction.freeSurfaceCorrectionTransverse,points,source:{resourceId:r.id,resourcePath:r.path,resourceLabel:r.label??r.id},warnings:[`Initial trim: ${trim.toFixed(6)} m. Trim changes during heel to maintain constant LCB; the heeled trim and draft path are not supplied.`, 'Starboard samples only. No port-side symmetry is assumed; boundary roots cannot establish two-sided stability.','Transverse free surface uses the virtual-KG approximation; liquid redistribution is not solved.','Source seawater-density convention is required. No extrapolation or automatic stability approval.',...(downflooding?[downflooding.message,...(downflooding.firstReachedAngle!==undefined?[`First sampled angle with threshold reached: ${downflooding.firstReachedAngle} degrees SB; exact onset is unresolved.`]:[]),'Downflooding screening uses preliminary source thresholds. PDF 18 requires engine-room vent positions to be updated to the final Damage Control Plan. Missing values are unknown; no exact flooding angle or port-side assessment is supplied.']:[])]};
}
