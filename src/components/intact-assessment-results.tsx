import {assessmentKey,useAssessmentSettings,intactLimitsFor} from '../app/assessment-settings';
import {useEffect,useState,useMemo} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {StabilityResult} from '../core/domain/stability-result';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import {assessIntact,summarizeIntact,directionalCurve} from '../core/stability/intact-assessment';
import {useLanguage} from '../app/language-context';
import type {TrimAssessmentInputs} from './trim-assessment-results';
export type IntactInputs=TrimAssessmentInputs&{vcg?:number;tcg?:number;freeSurfaceMomentTransverse?:number};
export function IntactAssessmentResults({ship,inputs}:{ship:ShipModelPackage;inputs:IntactInputs}){
 const {t}=useLanguage();const {pending,displacementTonnes,waterDensity,lcg,vcg,tcg,freeSurfaceMomentTransverse,longitudinalFsm}=inputs;
 const {settings,setSettings}=useAssessmentSettings();const conditionKey=assessmentKey(inputs);const limits=useMemo(()=>intactLimitsFor(settings,conditionKey),[settings,conditionKey]);
 const saved=settings.intact?.conditionKey===conditionKey?settings.intact:{conditionKey,starboard:'',port:'',source:''};
 const [direction,setDirection]=useState<'starboard'|'port'>('starboard');
 const key=JSON.stringify(inputs);const [state,setState]=useState<{ship:ShipModelPackage;key:string;result?:StabilityResult;error?:string}>();
 const valid=!pending&&[displacementTonnes,waterDensity,lcg,vcg,tcg,freeSurfaceMomentTransverse,longitudinalFsm].every(v=>v!==undefined&&Number.isFinite(v));
 useEffect(()=>{let active=true;if(!valid)return;
 computeStabilityCurves(ship,{displacementTonnes,waterDensity:waterDensity!,lcg:lcg!,vcg:vcg!,tcg:tcg!,freeSurfaceMomentTransverse},{longitudinalFsm}).then(result=>{if(active)setState({ship,key,result});}).catch(error=>{if(active)setState({ship,key,error:error instanceof Error?error.message:'Calculation unavailable.'});});
 return ()=>{active=false;};},[ship,key,valid,displacementTonnes,waterDensity,lcg,vcg,tcg,freeSurfaceMomentTransverse,longitudinalFsm]);
 const current=valid&&state?.ship===ship&&state.key===key?state:undefined;
 const rows=useMemo(()=>assessIntact(directionalCurve(current?.result,direction),limits[direction]),[current?.result,direction,limits]);
 const summary=summarizeIntact(rows);
 return <details open><summary>{t('Intact-stability criteria')}</summary>
 <details><summary>{t('Condition-specific downflooding limits')}</summary><p>{t('Enter only a sourced limit applicable to this condition and side. Sampled thresholds are not exact onset angles. Editing the loading condition invalidates these limits.')}</p>{(['starboard','port'] as const).map(side=><label key={side}>{t(side==='starboard'?'Starboard flooding angle (°)':'Port flooding angle (°)')}<input type="number" min="0.01" max="90" step="any" value={saved[side]} onChange={e=>{const value=e.target.value;if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>90))return;setSettings(old=>({...old,intact:{...saved,[side]:value}}));}}/></label>)}<label>{t('Limit source and applicability')}<input maxLength={4000} value={saved.source} onChange={e=>setSettings(old=>({...old,intact:{...saved,source:e.target.value}}))}/></label></details>
 <label>{t('Evaluated side')}<select aria-label={t('Evaluated side')} value={direction} onChange={e=>setDirection(e.target.value as 'starboard'|'port')}><option value="starboard">{t('Starboard')}</option><option value="port">{t('Port')}</option></select></label>
 <p>{t('Piecewise-linear corrected GZ. Peak-angle verdict requires an enclosing bracket no wider than 2°; this is an application resolution gate, not an IMO tolerance. Port uses supplied negative-angle data only; flooding coverage is not inferred.')}</p>
 <p role="status">{t('Numerical checks')}: {summary.meets} {t('meet the minimum')} · {summary.below} {t('below the minimum')} · {summary.unavailable} {t('insufficient data')}</p>
 <p>{t('Results apply to the supplied curve direction and numerical method. They are not an overall stability verdict. Unknown flooding limits remain unresolved even when a mathematical curve meets a minimum.')}</p>
 <p>{t('Source: manual §6.1, PDF 16; MSC.267(85), Part A §2.2. All six limits are minima. These are provisional numerical comparisons, not compliance results.')}</p>
 <p>{t('Margins compare the mathematical curve with the threshold. A positive margin does not establish compliance. Missing flooding limits and one-sided data remain explicit. Table-based GM is identified separately from a slope estimate.')}</p>
 {(!valid||!current||current.error)&&<p role="status">{t(!valid?'Complete the shared condition inputs.':current?.error??'Calculating GZ curves…')}</p>}
 {current?.result?.gmAtTrim&&<p>{t('Trimmed hydrostatic GM')}: KMt {current.result.gmAtTrim.kmTransverse.toFixed(6)} m − KG {current.result.condition.vcg.toFixed(6)} m − FSC {current.result.freeSurfaceCorrectionTransverse.toFixed(6)} m = {current.result.gmAtTrim.correctedGm.toFixed(6)} m. {t('Initial trim (source sign)')}: {current.result.gmAtTrim.initialTrimMetres.toFixed(6)} m · {current.result.gmAtTrim.sourcePath}</p>}
 <div style={{overflowX:'auto'}}><table><thead><tr><th>{t('Criterion')}</th><th>{t('Estimate')}</th><th>{t('Minimum')}</th><th>{t('Numerical margin')}</th><th>{t('Assessment')}</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><th scope="row">{t(r.label)}</th><td>{r.value===undefined?'—':`${r.value.toFixed(4)} ${r.unit}`}</td><td>{r.limit} {r.unit}</td><td>{r.margin===undefined?'—':`${r.margin.toFixed(4)} ${r.unit}`}</td><td>{t(r.status)}<p className="muted">{t(r.reason)}</p>{r.resolutionDeg!==undefined&&<small>{t('Peak bracket')}: {r.resolutionDeg}°</small>}</td></tr>)}</tbody></table></div>
 <p>{t('Areas use signed trapezoidal integration in radians, with free-surface correction applied once. X is not assumed to be 40° for a compliance decision. Weather and damage stability are separate checks.')}</p>
 </details>;
}
