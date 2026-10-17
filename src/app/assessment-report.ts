import {weatherContext,weatherCurve,rectangularWeather} from './weather-context';
import {cargoCapacity} from './cargo-capacity';
import {vesselCapacityLimit,resolveCapacityLimit} from './capacity-limit';
import {computeTrimEquilibrium} from '../core/trim/compute-trim-equilibrium';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
import {isCargo} from './tank-operations';
import {assessSecuringPlan} from './securing-assessment';
import {heelEquilibrium} from '../core/stability/heel-equilibrium';
import {intactLimitsFor} from './assessment-settings';
import type {ShipModelPackage,SimulationCondition} from '../core/domain/ship-model';
import type {ScenarioState} from './saved-scenarios';
import {assessmentKey} from './assessment-settings';
import {sharedResults} from '../core/calculations/shared-results';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import {assessIntact,intactOverview} from '../core/stability/intact-assessment';
import {parseAssessmentBasis} from '../core/stability/assessment-basis';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {computeTableTrim} from '../core/trim/trimmed-table';
import {assessTrim} from '../core/stability/trim-assessment';
import {compareKg,parseKgLimits} from '../core/stability/kg-limit';
import {conditionWind} from './weather-wind';
import {assessWeatherDirections} from '../core/stability/weather-assessment';
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
 section('hydrostatics',async()=>{if(!valid)throw new Error('Shared inputs are incomplete or updating.');return computeUprightHydrostatics(ship,condition);}),
 section('trim',async()=>{if(!valid)throw new Error('Shared inputs are incomplete or updating.');if(inputs.longitudinalFsm!==0)throw new Error('Longitudinal liquid redistribution is not solved.');if(!manifest.resources.some(r=>r.kind==='hydrostatics.trimmed-table'))return {...await computeTrimEquilibrium(ship,{...condition,tcg:0},{freeSurfaceMomentLongitudinal:0}),referenceOnly:true};const table=await loadTrimmedTable(ship);datasets['trimmed-table']=table;trim=computeTableTrim(table,{displacementTonnes:inputs.displacementTonnes!,lcg:inputs.lcg!,waterDensity:inputs.waterDensity!},manifest.principalDimensions.lbp);return trim;}),
 section('curve',async()=>{if(!valid)throw new Error('Shared inputs are incomplete or updating.');curve=await computeStabilityCurves(ship,condition,{longitudinalFsm:inputs.longitudinalFsm});return curve;})
 ]);
 await section('curveSourceData',async()=>{if(!curve)throw new Error('No compatible curve calculated.');const resource=manifest.resources.find(r=>r.id===curve!.source.resourceId);if(!resource||resource.kind!=='stability.constant-lcb-cross-curves')return {source:curve.source,note:'Computed ordinates and source reference included.'};await json(resource.kind);return {included:resource.path};});
 sections.intact=basis?.intactCriteria==='msc267-general-source-v1'?assessIntact(curve,intactLimitsFor(state.assessment??{},key).starboard):unavailable('No applicable general intact-criteria basis.');
 sections.intactOverview=basis?.intactCriteria==='msc267-general-source-v1'?intactOverview(curve,intactLimitsFor(state.assessment??{},key)):unavailable('No applicable general intact-criteria basis.');
 await section('equilibrium',()=>{if(!curve)throw new Error('No compatible curve calculated.');return heelEquilibrium(curve,true,intactLimitsFor(state.assessment??{},key));});
 const draft=trim?.mouldedDraft??(state.assessment?.draft?.conditionKey===key?state.assessment.draft.value:undefined);
 await section('permissibleTrim',()=>{if(!basis?.trimLimits||!trim||draft===undefined)throw new Error('Trim limits, solved trim or compatible moulded draft unavailable.');return assessTrim(basis.trimLimits,draft,trim.trimMetres);});
 await section('limitingKg',async()=>{if(!valid||draft===undefined)throw new Error('Compatible draft/condition unavailable.');return {status:'Convention unresolved',comparison:compareKg(parseKgLimits(await json('documentation.annotated-kg')),draft,inputs.vcg!,inputs.freeSurfaceMomentTransverse!/inputs.displacementTonnes!)};});
 await section('weather',async()=>{
  const saved=state.assessment?.weather;if(!saved||saved.conditionKey!==key)throw new Error('Weather inputs are missing or belong to a different condition.');if(!curve)throw new Error('GZ curve unavailable.');
  const context=await weatherContext(ship,condition,inputs.longitudinalFsm),weatherDraft=context.draft;datasets[context.sourcePath]=context.data;
  const data=context.data,wind=conditionWind(data,saved,weatherDraft,inputs.displacementTonnes!,state.scenario==='loading'?state.weights:rectangularWeather(ship)?[]:undefined);
  const compatibleCurve=weatherCurve(curve,context);
  if(saved.estimatePort&&!manifest.resources.some(r=>r.config?.portSymmetryEvidence==='vectis-source-audit-v1'))throw new Error('No port-estimation basis is supplied.');
  const n=(k:keyof typeof saved.values)=>saved.values[k].trim()===''?undefined:Number(saved.values[k]);
  const overview=assessWeatherDirections(saved.estimatePort?derivePortEstimate(compatibleCurve):compatibleCurve,{steady:wind.steadyLever,draft:weatherDraft,beam:manifest.principalDimensions.beam,lwl:n('lwl'),cb:n('cb'),bilgeArea:n('bilge'),deckAngle:n('deck'),floodAngle:n('flood'),bilgeType:saved.bilgeType},{deckAngle:saved.portDeck?.trim()?Number(saved.portDeck):undefined,floodAngle:saved.portFlood?.trim()?Number(saved.portFlood):undefined},{profileConfirmed:wind.profileConfirmed,source:saved.inputSource});
  return {profile:saved.profile,pressureKgPerM2:data.pressureKgPerM2,operatorInputSource:saved.inputSource||'Unspecified',wind,assessment:overview[saved.direction??'starboard'],directionalAssessment:overview};
 });
 await section('securing',()=>{if(state.scenario!=='loading')throw new Error('Securing groups require weight-based loading.');return assessSecuringPlan(state.assessment?.securing??{groups:[]},state.weights.filter(w=>isCargo(ship,w)),cargoSurfaces(ship,state.tweenDeck),manifest.id,key);});
 await section('capacity',async()=>{if(state.scenario!=='loading'||!state.capacity)throw new Error('No weight-based capacity plan recorded.');const settings=state.capacity,limit=vesselCapacityLimit(ship);const manual=settings.limitMode==='manual'||settings.limitMode===undefined&&settings.limit!==undefined||!limit;const effective=manual?settings:{...settings,limit:await resolveCapacityLimit(ship,limit!,state.density!),limitSource:limit!.source,limitDensity:state.density};return {settings:effective,result:cargoCapacity(ship,state.weights,cargoSurfaces(ship,state.tweenDeck),effective,state.density)};});
 await section('cargoLoads',()=>{if(state.scenario!=='loading')throw new Error('Cargo loads are not linked to a manual condition.');return cargoLoadChecks(state.weights.filter(w=>w.category==='cargo'||!!w.footprint),cargoSurfaces(ship,state.tweenDeck),state.tweenDeck==='stored');});
 const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const revisions={algorithm:'SHA-256 of exported JSON',condition:await digest({state,inputs}),manifest:await digest(manifest),embeddedDatasets:await digest(datasets)};
 return {revisions,format:'umc-condition-assessment-report',version:1,generatedAt:new Date().toISOString(),manifest,state,conditionInputs:inputs,sections,datasets,unresolved:['Numerical checks do not constitute overall compliance.','Weather inputs require source/profile applicability review; derived port flooding is unknown.','Damage stability and longitudinal strength remain unassessed; securing is restricted to the declared-input screening method.'],scope:'Click-time input snapshot and newly computed numerical results. Embedded datasets identify the basis used for limits and trim. Saved conditions import editable inputs only; report results are not trusted as input.'};
}
