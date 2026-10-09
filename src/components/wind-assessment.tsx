import {useAssessmentSettings,assessmentKey,emptyWeatherValues} from '../app/assessment-settings';
import {sharedResults} from '../core/calculations/shared-results';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {WeatherAssessment} from './weather-assessment';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import type {StabilityResult} from '../core/domain/stability-result';
import {steadyWindEquilibrium} from '../core/stability/wind-equilibrium';
import {useEffect,useState} from 'react';
import {useLanguage} from '../app/language-context';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {parseWindData,windLever,type WindData} from '../core/stability/wind-profile';
import {computeTableTrim} from '../core/trim/trimmed-table';
import type {IntactInputs} from './intact-assessment-results';
export function WindAssessment({ship,inputs}:{ship:ShipModelPackage;inputs:IntactInputs}){
 const {t}=useLanguage();const {settings,setSettings}=useAssessmentSettings();const conditionKey=assessmentKey(inputs);const saved=settings.weather;const profile=saved?.conditionKey===conditionKey?saved.profile:'';const setProfile=(profile:string)=>setSettings(previous=>({...previous,weather:{conditionKey,profile,values:{...emptyWeatherValues,bilge:state?.data?.bilgeKeelAreaM2===undefined?'':String(state.data.bilgeKeelAreaM2)},estimatePort:false,inputSource:''}}));const [state,setState]=useState<{key:string;ship:ShipModelPackage;data?:WindData;draft?:number;error?:string}>();
 const {pending,displacementTonnes,lcg,waterDensity,longitudinalFsm}=inputs;const key=JSON.stringify([displacementTonnes,lcg,waterDensity,longitudinalFsm]);
 const valid=!pending&&[displacementTonnes,lcg,waterDensity,longitudinalFsm].every(x=>x!==undefined&&Number.isFinite(x));
 const curveKey=JSON.stringify(inputs);
 const [curveState,setCurveState]=useState<{key:string;ship:ShipModelPackage;curve?:StabilityResult;error?:string}>();
 const curveValid=valid&&[inputs.vcg,inputs.tcg,inputs.freeSurfaceMomentTransverse].every(x=>x!==undefined&&Number.isFinite(x));
 useEffect(()=>{let active=true;if(!curveValid)return;
 computeStabilityCurves(ship,{displacementTonnes,waterDensity:waterDensity!,lcg:lcg!,vcg:inputs.vcg!,tcg:inputs.tcg!,freeSurfaceMomentTransverse:inputs.freeSurfaceMomentTransverse},{longitudinalFsm}).then(curve=>{if(active)setCurveState({key:curveKey,ship,curve});}).catch(e=>{if(active)setCurveState({key:curveKey,ship,error:(e as Error).message});});
 return()=>{active=false;};},[ship,curveKey,curveValid,displacementTonnes,waterDensity,lcg,inputs.vcg,inputs.tcg,inputs.freeSurfaceMomentTransverse,longitudinalFsm]);
 const derivation=ship.manifest.resources.find(r=>r.kind==='stability.constant-lcb-cross-curves')?.config?.portSymmetryEvidence==='vectis-source-audit-v1'?{lbp:ship.manifest.principalDimensions.lbp,depth:ship.manifest.principalDimensions.mouldedDepth??NaN}:undefined;
 const resource=ship.manifest.resources.find(r=>r.kind==='stability.wind-profiles');
 useEffect(()=>{let active=true;if(!valid||!resource?.path)return;
 async function run(){try{if(longitudinalFsm!==0)throw new Error('Zero longitudinal FSM is required for this table calculation.');const tr=ship.manifest.resources.find(r=>r.kind==='hydrostatics.trimmed-table');if(!tr?.path)throw new Error('Missing trimmed hydrostatics.');
 const [data,table]=await Promise.all([sharedResults.read(ship,'wind-profiles',resource!.path!,async(s,path)=>{const response=await fetch(shipResourceUrl(s,path));if(!response.ok)throw new Error('Could not load wind assessment data.');return parseWindData(await response.json());}),loadTrimmedTable(ship)]);
 const result=computeTableTrim(table,{displacementTonnes:displacementTonnes!,lcg:lcg!,waterDensity:waterDensity!},ship.manifest.principalDimensions.lbp);if(result.mouldedDraft===undefined)throw new Error('Moulded draught reference is unavailable.');if(active)setState({key,ship,data,draft:result.mouldedDraft});
 }catch(e){if(active)setState({key,ship,error:(e as Error).message});}}void run();return()=>{active=false;};},[key,ship,valid,resource,displacementTonnes,lcg,waterDensity,longitudinalFsm]);
 if(!resource)return null;const current=valid&&state?.key===key&&state.ship===ship?state:undefined;
 let result;let error=current?.error;if(current?.data&&current.draft!==undefined&&profile)try{result=windLever(current.data,profile,current.draft,displacementTonnes!);}catch(e){error=(e as Error).message;}
 const curve=curveValid&&curveState?.key===curveKey&&curveState.ship===ship?curveState:undefined;
 const windHeel=result&&curve?.curve?steadyWindEquilibrium(curve.curve,result.steadyLever):undefined;
 return <details><summary>{t('Wind and rolling assessment')}</summary><p>{t('Select a wind profile to assess steady heel and gust/rolling energy. Each check reports a numerical result or the inputs and coverage it still needs.')}</p>
 <p>{t('Choose a documented silhouette explicitly. It is not inferred from cargo layout; arbitrary cargo may not match these profiles. Tables dated 2011 do not establish the current wind profile.')}</p>
 {saved&&saved.conditionKey!==conditionKey&&<p role="status">{t('Saved assessment inputs belong to a different condition and are not applied. Re-enter them for this condition.')}</p>}
 <label>{t('Documented wind profile')} <select value={profile} onChange={e=>setProfile(e.target.value)}><option value="">{t('Choose a profile')}</option>{current?.data?.profiles.map(p=><option key={p.id} value={p.id}>{t(p.label)}</option>)}</select></label>
 {error&&<p role="alert">{t(error)}</p>}{!valid&&<p>{t('Complete the shared condition inputs.')}</p>}
 {result&&<dl><dt>{t('Moulded draught (m)')}</dt><dd>{current!.draft!.toFixed(4)}</dd><dt>{t('Projected wind area (m²)')}</dt><dd>{result.areaM2.toFixed(2)}</dd><dt>{t('Steady wind lever (m)')}</dt><dd>{result.steadyLever.toFixed(6)}</dd><dt>{t('Source pressure (kg/m²)')}</dt><dd>{current!.data!.pressureKgPerM2}</dd></dl>}
 {result&&<section aria-label={t('Steady-wind heel')}><h4>{t('Steady-wind heel')}</h4>
 {windHeel?.angle!==undefined?<dl><dt>{t('Estimated heel (°)')}</dt><dd>{windHeel.angle.toFixed(3)}</dd><dt>{t('Margin to 16° ceiling (°)')}</dt><dd>{windHeel.marginTo16!.toFixed(3)}</dd></dl>:<p role="status">{t(windHeel?.message??curve?.error??(curveValid?'Calculating GZ curves…':'Complete the shared condition inputs.'))}</p>}
 <p>{t('Solves corrected GZ = steady wind lever for wind acting toward source starboard. A negative margin exceeds 16°; a positive margin is not a pass. The additional limit of 80% of deck-edge immersion remains unverified.')}</p>
 <p>{t('This is a local equilibrium estimate, not a simulated roll or a verified path to equilibrium. Sampled downflooding thresholds block a reached root; unknown flooding onset remains unresolved. No port-side result is inferred.')}</p></section>}
 {result&&curve?.curve&&current?.draft!==undefined&&<WeatherAssessment conditionKey={conditionKey} profileSource={{id:profile,resourcePath:resource.path!,pressureKgPerM2:current.data!.pressureKgPerM2}} derivation={derivation} key={curveKey+profile} curve={curve.curve} steady={result.steadyLever} draft={current.draft} beam={ship.manifest.principalDimensions.beam} bilgeArea={current.data?.bilgeKeelAreaM2}/>}
 <p>{t('The source wind moment is interpolated by moulded draught and divided by the current displacement in kg. Source pressure and half-draught moment reference are retained; trim effects on silhouette are not resolved.')}</p>
 <p>{t('Still needed: confirmed wind profile, windward rolling parameters, both-sided GZ coverage, deck-edge immersion and verified downflooding limits. No weather-criterion pass is assigned.')}</p>
 <a href={shipResourceUrl(ship,resource.path!)} download={resource.path}>{t('Download wind source data')}</a>
 </details>;
}
