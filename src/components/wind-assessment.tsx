import {weatherContext,weatherCurve,rectangularWeather,documentedWindData} from '../app/weather-context';
import {useAssessmentSettings,assessmentKey,emptyWeatherValues} from '../app/assessment-settings';
import {WeatherAssessment} from './weather-assessment';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import type {StabilityResult} from '../core/domain/stability-result';
import {conditionWind,windConfirmationKey} from '../app/weather-wind';
import {useEffect,useState,useMemo} from 'react';
import {useLanguage} from '../app/language-context';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {shipResourceUrl} from '../core/domain/ship-resource';
import type {IntactInputs} from './intact-assessment-results';
export function WindAssessment({ship,inputs}:{ship:ShipModelPackage;inputs:IntactInputs}){
 const {t}=useLanguage();const {settings,setSettings,weights}=useAssessmentSettings();const conditionKey=assessmentKey(inputs);const saved=settings.weather;const profile=saved?.conditionKey===conditionKey?saved.profile:'';const setProfile=(profile:string)=>setSettings(previous=>({...previous,weather:{conditionKey,profile,values:{...emptyWeatherValues,...(state?.context&&'defaults' in state.context?state.context.defaults:{}),bilge:rectangularWeather(ship)?'0':(state?.data??availableData)?.bilgeKeelAreaM2===undefined?'':String((state?.data??availableData)!.bilgeKeelAreaM2)},bilgeType:rectangularWeather(ship)?'sharp':'keels',portDeck:state?.context&&'defaults' in state.context?state.context.defaults?.deck:'',estimatePort:false,inputSource:rectangularWeather(ship)?'Declared rectangular prism: LWL = LBP, CB = 1, sharp bilges; upright deck-edge estimate. Flooding limits require an explicit assumption.':''}}));const [state,setState]=useState<{key:string;ship:ShipModelPackage;data?:Awaited<ReturnType<typeof weatherContext>>['data'];draft?:number;context?:Awaited<ReturnType<typeof weatherContext>>;error?:string}>();
 const {pending,displacementTonnes,lcg,waterDensity,longitudinalFsm}=inputs;const key=JSON.stringify(inputs);
 const valid=!pending&&[displacementTonnes,lcg,waterDensity,longitudinalFsm].every(x=>x!==undefined&&Number.isFinite(x));
 const curveKey=JSON.stringify(inputs);
 const [curveState,setCurveState]=useState<{key:string;ship:ShipModelPackage;curve?:StabilityResult;error?:string}>();
 const curveValid=valid&&[inputs.vcg,inputs.tcg,inputs.freeSurfaceMomentTransverse].every(x=>x!==undefined&&Number.isFinite(x));
 useEffect(()=>{let active=true;if(!curveValid)return;
 computeStabilityCurves(ship,{displacementTonnes,waterDensity:waterDensity!,lcg:lcg!,vcg:inputs.vcg!,tcg:inputs.tcg!,freeSurfaceMomentTransverse:inputs.freeSurfaceMomentTransverse},{longitudinalFsm}).then(curve=>{if(active)setCurveState({key:curveKey,ship,curve});}).catch(e=>{if(active)setCurveState({key:curveKey,ship,error:(e as Error).message});});
 return()=>{active=false;};},[ship,curveKey,curveValid,displacementTonnes,waterDensity,lcg,inputs.vcg,inputs.tcg,inputs.freeSurfaceMomentTransverse,longitudinalFsm]);
 const derivation=ship.manifest.resources.find(r=>r.kind==='stability.constant-lcb-cross-curves')?.config?.portSymmetryEvidence==='vectis-source-audit-v1'?{lbp:ship.manifest.principalDimensions.lbp,depth:ship.manifest.principalDimensions.mouldedDepth??NaN}:undefined;
 const resource=ship.manifest.resources.find(r=>r.kind==='stability.wind-profiles');
 const [profileData,setProfileData]=useState<{ship:ShipModelPackage;data:Awaited<ReturnType<typeof documentedWindData>>}>();
 useEffect(()=>{let active=true;if(resource?.path)documentedWindData(ship).then(data=>{if(active)setProfileData({ship,data});}).catch(()=>{});return()=>{active=false;};},[ship,resource?.path]);
 const availableData=profileData?.ship===ship?profileData.data:undefined;
 useEffect(()=>{let active=true;if(!valid)return;
 weatherContext(ship,{displacementTonnes,waterDensity:waterDensity!,lcg:lcg!,vcg:inputs.vcg!,tcg:inputs.tcg!,freeSurfaceMomentTransverse:inputs.freeSurfaceMomentTransverse},longitudinalFsm).then(context=>{if(active)setState({key,ship,...context,context});}).catch(e=>{if(active)setState({key,ship,error:(e as Error).message});});return()=>{active=false;};},[key,ship,valid,displacementTonnes,lcg,waterDensity,longitudinalFsm,inputs.vcg,inputs.tcg,inputs.freeSurfaceMomentTransverse]);
 const current=valid&&state?.key===key&&state.ship===ship?state:undefined;
 const wind=useMemo(()=>{try{return {result:current?.data&&current.draft!==undefined&&profile?conditionWind(current.data,saved!,current.draft,displacementTonnes!,rectangularWeather(ship)?weights??[]:weights):undefined,error:current?.error};}catch(e){return {result:undefined,error:(e as Error).message};}},[current,profile,saved,displacementTonnes,weights,ship]);
 const {result,error}=wind;

 const curve=curveValid&&curveState?.key===curveKey&&curveState.ship===ship?curveState:undefined;
 return <details open id="weather-inputs"><summary>{t('Wind and rolling assessment')}</summary><p>{t('Select a wind profile to assess steady heel and gust/rolling energy. Each check reports a numerical result or the inputs and coverage it still needs.')}</p>
 {!rectangularWeather(ship)&&<p>{t('Choose a documented silhouette explicitly. It is not inferred from cargo layout; arbitrary cargo may not match these profiles. Tables dated 2011 do not establish the current wind profile.')}</p>}
 {saved&&saved.conditionKey!==conditionKey&&<p role="status">{t('Saved assessment inputs belong to a different condition and are not applied. Re-enter them for this condition.')}</p>}
 <label>{t('Wind profile')} <select value={profile} onChange={e=>setProfile(e.target.value)}><option value="">{t('Choose a profile')}</option>{(current?.data??availableData)?.profiles.map(p=><option key={p.id} value={p.id}>{t(p.label)}</option>)}</select></label>
 {derivation&&<p>{t('Vectis sources: General Arrangement 0000-001F (09-11-2010), principal dimensions and broadside arrangement; Stability Loading Manual PDF 34, design LWL 123.950 m at 8.000 m draught; PDF 80, bilge-keel area 21.500 m² and wind moments about half draught. The arrangement alone does not establish condition-specific flooding or deck-immersion angles.')}</p>}
 {error&&<><p role="alert">{t(error)}</p><p>{t('Review displacement and longitudinal centre of gravity in Loading or Condition settings. Wind calculations need a condition within the model’s hydrostatic coverage.')}</p></>}{!valid&&<p>{t('Complete the shared condition inputs.')}</p>}
 {result&&saved&&<label><input type="checkbox" checked={result.profileConfirmed} onChange={e=>setSettings(previous=>({...previous,weather:{...saved,profileConfirmed:e.target.checked,layoutKey:windConfirmationKey(current!.data!,profile,weights)}}))}/>{t('This profile represents the current ship and exposed cargo')}</label>}
 {result&&<p>{t(result.method)} · {t('Assessment wind pressure (Pa)')}: {result.pressurePa}</p>}
 {result&&<dl><dt>{t('Moulded draught (m)')}</dt><dd>{current!.draft!.toFixed(4)}</dd><dt>{t('Projected wind area (m²)')}</dt><dd>{result.areaM2.toFixed(2)}</dd><dt>{t('Steady wind lever (m)')}</dt><dd>{result.steadyLever.toFixed(6)}</dd><dt>{t('Source pressure (kg/m²)')}</dt><dd>{current!.data!.pressureKgPerM2}</dd></dl>}
 {curve?.error&&curve.error!==error&&<p role="status">{t(curve.error)}</p>}
 {rectangularWeather(ship)&&<p>{t('Educational rectangular model: the graph uses the upright hull and placed cargo projections. The IS Code empirical roll range may exclude this wide, shallow hull. Enter flooding limits explicitly; no opening angle is assumed.')}</p>}
 {result&&curve?.curve&&current?.draft!==undefined&&<WeatherAssessment profileConfirmed={result.profileConfirmed} conditionKey={conditionKey} profileSource={{id:profile,resourcePath:current.context!.sourcePath,pressureKgPerM2:current.data!.pressureKgPerM2}} derivation={derivation} key={curveKey+profile} curve={current.context?weatherCurve(curve.curve,current.context):curve.curve} steady={result.steadyLever} draft={current.draft} beam={ship.manifest.principalDimensions.beam} bilgeArea={current.data?.bilgeKeelAreaM2}/>}
 {!rectangularWeather(ship)&&<p>{t('Table moments are interpolated by moulded draught and normalized to 504 Pa. The half-draught reference is retained; trim effects on the silhouette are unresolved.')}</p>}
 {resource?.path&&<a href={shipResourceUrl(ship,resource.path)} download={resource.path}>{t('Download wind source data')}</a>}
 </details>;
}
