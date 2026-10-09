import {useEffect,useState,useMemo} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {StabilityResult} from '../core/domain/stability-result';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import {assessIntact,summarizeIntact} from '../core/stability/intact-assessment';
import {useLanguage} from '../app/language-context';
import type {TrimAssessmentInputs} from './trim-assessment-results';
export type IntactInputs=TrimAssessmentInputs&{vcg?:number;tcg?:number;freeSurfaceMomentTransverse?:number};
export function IntactAssessmentResults({ship,inputs}:{ship:ShipModelPackage;inputs:IntactInputs}){
 const {t}=useLanguage();const {pending,displacementTonnes,waterDensity,lcg,vcg,tcg,freeSurfaceMomentTransverse,longitudinalFsm}=inputs;
 const key=JSON.stringify(inputs);const [state,setState]=useState<{ship:ShipModelPackage;key:string;result?:StabilityResult;error?:string}>();
 const valid=!pending&&[displacementTonnes,waterDensity,lcg,vcg,tcg,freeSurfaceMomentTransverse,longitudinalFsm].every(v=>v!==undefined&&Number.isFinite(v));
 useEffect(()=>{let active=true;if(!valid)return;
 computeStabilityCurves(ship,{displacementTonnes,waterDensity:waterDensity!,lcg:lcg!,vcg:vcg!,tcg:tcg!,freeSurfaceMomentTransverse},{longitudinalFsm}).then(result=>{if(active)setState({ship,key,result});}).catch(error=>{if(active)setState({ship,key,error:error instanceof Error?error.message:'Calculation unavailable.'});});
 return ()=>{active=false;};},[ship,key,valid,displacementTonnes,waterDensity,lcg,vcg,tcg,freeSurfaceMomentTransverse,longitudinalFsm]);
 const current=valid&&state?.ship===ship&&state.key===key?state:undefined;
 const rows=useMemo(()=>assessIntact(current?.result),[current?.result]);
 const summary=summarizeIntact(rows);
 return <details open><summary>{t('Intact-stability criteria')}</summary>
 <p role="status">{t('Numerical checks')}: {summary.meets} {t('meet the minimum')} · {summary.below} {t('below the minimum')} · {summary.unavailable} {t('insufficient data')}</p>
 <p>{t('Results apply to the supplied curve direction and numerical method. They are not an overall stability verdict. Unknown flooding limits remain unresolved even when a mathematical curve meets a minimum.')}</p>
 <p>{t('Source: manual §6.1, PDF 16; MSC.267(85), Part A §2.2. All six limits are minima. These are provisional numerical comparisons, not compliance results.')}</p>
 <p>{t('Margins compare the mathematical curve with the threshold. A positive margin does not establish compliance. Missing flooding limits and one-sided data remain explicit. Table-based GM is identified separately from a slope estimate.')}</p>
 {(!valid||!current||current.error)&&<p role="status">{t(!valid?'Complete the shared condition inputs.':current?.error??'Calculating GZ curves…')}</p>}
 {current?.result?.gmAtTrim&&<p>{t('Trimmed hydrostatic GM')}: KMt {current.result.gmAtTrim.kmTransverse.toFixed(6)} m − KG {current.result.condition.vcg.toFixed(6)} m − FSC {current.result.freeSurfaceCorrectionTransverse.toFixed(6)} m = {current.result.gmAtTrim.correctedGm.toFixed(6)} m. {t('Initial trim (source sign)')}: {current.result.gmAtTrim.initialTrimMetres.toFixed(6)} m · {current.result.gmAtTrim.sourcePath}</p>}
 <div style={{overflowX:'auto'}}><table><thead><tr><th>{t('Criterion')}</th><th>{t('Estimate')}</th><th>{t('Minimum')}</th><th>{t('Numerical margin')}</th><th>{t('Assessment')}</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><th scope="row">{t(r.label)}</th><td>{r.value===undefined?'—':`${r.value.toFixed(4)} ${r.unit}`}</td><td>{r.limit} {r.unit}</td><td>{r.margin===undefined?'—':`${r.margin.toFixed(4)} ${r.unit}`}</td><td>{t(r.status)}<p className="muted">{t(r.reason)}</p></td></tr>)}</tbody></table></div>
 <p>{t('Areas use signed trapezoidal integration in radians, with free-surface correction applied once. X is not assumed to be 40° for a compliance decision. Weather and damage stability are separate checks.')}</p>
 </details>;
}
