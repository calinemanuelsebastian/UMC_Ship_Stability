import type {ShipModelPackage,SimulationCondition} from '../core/domain/ship-model';
import type {ScenarioState} from './saved-scenarios';
import {assessmentKey} from './assessment-settings';
import {sharedResults} from '../core/calculations/shared-results';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import {assessIntact} from '../core/stability/intact-assessment';
import {parseAssessmentBasis} from '../core/stability/assessment-basis';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {computeTableTrim} from '../core/trim/trimmed-table';
import {assessTrim} from '../core/stability/trim-assessment';
import {compareKg,parseKgLimits} from '../core/stability/kg-limit';
import {parseWindData,windLever} from '../core/stability/wind-profile';
import {assessWeather} from '../core/stability/weather-assessment';
import {derivePortEstimate} from '../core/stability/derived-stability-data';
import {cargoLoadChecks} from './cargo-load-checks';
import {cargoSurfaces} from './cargo-surfaces';
export type ReportInputs={pending:boolean;displacementTonnes?:number;lcg?:number;vcg?:number;tcg?:number;freeSurfaceMomentTransverse?:number;waterDensity?:number;longitudinalFsm?:number};
export async function buildAssessmentReport(ship:ShipModelPackage,state:ScenarioState,inputs:ReportInputs){
 // Immutable click-time snapshot: later edits cannot change a report being built.
 state=structuredClone(state);inputs=structuredClone(inputs);
 const manifest=structuredClone(ship.manifest);const sections:Record<string,unknown>={},datasets:Record<string,unknown>={};
 const unavailable=(reason:string)=>({status:'Insufficient data',reason});
 async function json(kind:string){const r=manifest.resources.find(r=>r.kind===kind);if(!r?.path)throw new Error('Missing resource: '+kind);const value=await sharedResults.read(ship,'report-resource',r.path,async(s,path)=>{const res=await fetch(shipResourceUrl(s,path));if(!res.ok)throw new Error('Could not load '+path);return res.json();});datasets[r.path]=value;return value;}
 async function section(name:string,run:()=>Promise<unknown>|unknown){try{sections[name]=await run();}catch(e){sections[name]=unavailable(e instanceof Error?e.message:String(e));}}
 const key=assessmentKey(inputs),valid=!inputs.pending&&[inputs.displacementTonnes,inputs.lcg,inputs.vcg,inputs.tcg,inputs.freeSurfaceMomentTransverse,inputs.waterDensity,inputs.longitudinalFsm].every(v=>v!==undefined&&Number.isFinite(v));
 let basis:ReturnType<typeof parseAssessmentBasis>|undefined,trim:ReturnType<typeof computeTableTrim>|undefined,curve:Awaited<ReturnType<typeof computeStabilityCurves>>|undefined;
 await section('basis',async()=>basis=parseAssessmentBasis(await json('stability.assessment-basis')));
 const condition={displacementTonnes:inputs.displacementTonnes,lcg:inputs.lcg,vcg:inputs.vcg,tcg:inputs.tcg,freeSurfaceMomentTransverse:inputs.freeSurfaceMomentTransverse,waterDensity:inputs.waterDensity} as SimulationCondition;
 await Promise.all([
 section('trim',async()=>{if(!valid)throw new Error('Shared inputs are incomplete or updating.');if(inputs.longitudinalFsm!==0)throw new Error('Longitudinal liquid redistribution is not solved.');const table=await loadTrimmedTable(ship);datasets['trimmed-table']=table;trim=computeTableTrim(table,{displacementTonnes:inputs.displacementTonnes!,lcg:inputs.lcg!,waterDensity:inputs.waterDensity!},manifest.principalDimensions.lbp);return trim;}),
 section('curve',async()=>{if(!valid)throw new Error('Shared inputs are incomplete or updating.');curve=await computeStabilityCurves(ship,condition,{longitudinalFsm:inputs.longitudinalFsm});return curve;})
 ]);
 await section('curveSourceData',async()=>{if(!curve)throw new Error('No compatible curve calculated.');const resource=manifest.resources.find(r=>r.id===curve!.source.resourceId);if(!resource||resource.kind!=='stability.constant-lcb-cross-curves')return {source:curve.source,note:'Computed ordinates and source reference included.'};await json(resource.kind);return {included:resource.path};});
 sections.intact=basis?.intactCriteria==='msc267-general-source-v1'?assessIntact(curve):unavailable('No applicable general intact-criteria basis.');
 const draft=trim?.mouldedDraft??(state.assessment?.draft?.conditionKey===key?state.assessment.draft.value:undefined);
 await section('permissibleTrim',()=>{if(!basis?.trimLimits||!trim||draft===undefined)throw new Error('Trim limits, solved trim or compatible moulded draft unavailable.');return assessTrim(basis.trimLimits,draft,trim.trimMetres);});
 await section('limitingKg',async()=>{if(!valid||draft===undefined)throw new Error('Compatible draft/condition unavailable.');return {status:'Convention unresolved',comparison:compareKg(parseKgLimits(await json('documentation.annotated-kg')),draft,inputs.vcg!,inputs.freeSurfaceMomentTransverse!/inputs.displacementTonnes!)};});
 await section('weather',async()=>{
  const saved=state.assessment?.weather;if(!saved||saved.conditionKey!==key)throw new Error('Weather inputs are missing or belong to a different condition.');if(!curve||draft===undefined)throw new Error('GZ curve or moulded draft unavailable.');
  const data=parseWindData(await json('stability.wind-profiles')),wind=windLever(data,saved.profile,draft,inputs.displacementTonnes!);
  if(saved.estimatePort&&!manifest.resources.some(r=>r.config?.portSymmetryEvidence==='vectis-source-audit-v1'))throw new Error('No port-estimation basis is supplied.');
  const n=(k:keyof typeof saved.values)=>saved.values[k].trim()===''?undefined:Number(saved.values[k]);
  return {profile:saved.profile,pressureKgPerM2:data.pressureKgPerM2,operatorInputSource:saved.inputSource||'Unspecified',assessment:assessWeather(saved.estimatePort?derivePortEstimate(curve):curve,{steady:wind.steadyLever,draft,beam:manifest.principalDimensions.beam,lwl:n('lwl'),cb:n('cb'),bilgeArea:n('bilge'),deckAngle:n('deck'),floodAngle:n('flood')})};
 });
 await section('cargoLoads',()=>{if(state.scenario!=='loading')throw new Error('Cargo loads are not linked to a manual condition.');return cargoLoadChecks(state.weights.filter(w=>w.category==='cargo'||!!w.footprint),cargoSurfaces(ship,state.tweenDeck),state.tweenDeck==='stored');});
 return {format:'umc-condition-assessment-report',version:1,generatedAt:new Date().toISOString(),manifest,state,conditionInputs:inputs,sections,datasets,unresolved:['Numerical checks do not constitute overall compliance.','Weather inputs require source/profile applicability review; derived port flooding is unknown.','Damage stability conventions, longitudinal strength and securing remain outside the completed assessment.'],scope:'Click-time input snapshot and newly computed numerical results. Embedded datasets identify the basis used for limits and trim. Saved conditions import editable inputs only; report results are not trusted as input.'};
}
