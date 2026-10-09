import {useMemo,useState} from 'react';
import {useLanguage} from '../app/language-context';
import {buildLoadingPreset} from '../app/loading-presets';
import {cleanLoadingPlan,type TankCatalog} from '../app/tank-operations';
import {evaluateWeights,type WeightDraft} from '../app/loading-state';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {TweenDeckMode} from '../app/tween-deck';
export function LoadingConditionPresets({ship,catalog,reference,onApply,onUndo,canUndo}:{ship:ShipModelPackage;catalog:TankCatalog;reference:WeightDraft[];onApply:(weights:WeightDraft[],mode:TweenDeckMode,density:number)=>void;onUndo:()=>void;canUndo:boolean}){
 const {t,language}=useLanguage();const [choice,setChoice]=useState('');const [applied,setApplied]=useState('');
 const preset=catalog.conditions?.items.find(p=>p.id===choice);
 const preview=useMemo(()=>{try{
  const weights=preset?buildLoadingPreset(ship,reference,catalog,preset):choice==='empty'?cleanLoadingPlan(ship,reference,catalog):choice==='reference'?structuredClone(reference):undefined;
  const evaluated=weights?evaluateWeights(weights):undefined;
  if(evaluated?.error)throw new Error(evaluated.error);
  return {weights,result:evaluated?.result};
 }catch(e){return {error:(e as Error).message};}},[preset,choice,ship,reference,catalog]);
 const fmt=(n:number)=>new Intl.NumberFormat(language,{maximumFractionDigits:3}).format(n);
 return <details className="loading-plan-start"><summary>{t('Start a loading condition')}</summary>
 <p>{t('Choose a condition, review its totals, then apply it. Applying replaces the current cargo, tanks and onboard weights; Undo restores the previous plan.')}</p>
 <div className="scene-toolbar"><label>{t('Loading condition')}<select value={choice} onChange={e=>{setChoice(e.target.value);setApplied('');}}><option value="">{t('Choose a condition')}</option><option value="empty">{t('Empty cargo plan — empty tanks')}</option>{catalog.conditions?.items.map(p=><option key={p.id} value={p.id}>{t(p.name)}</option>)}<option value="reference">{t('Original loading reference')}</option></select></label>
 <button disabled={!preview.weights||!!preview.error} onClick={()=>{if(preview.weights){onApply(preview.weights,preset?.tweenDeck??'installed',preset?.waterDensity??ship.manifest.defaultCondition.waterDensity);setApplied(t('Condition applied. Further edits update the shared calculations.'));}}}>{t('Apply condition')}</button>
 <button disabled={!canUndo} onClick={()=>{onUndo();setApplied('');}}>{t('Undo condition replacement')}</button></div>
 {preview.error&&<p role="alert">{t(preview.error)}</p>}
 {preview.result&&<p>{t('Preview')}: {fmt(preview.result.displacementTonnes)} t · LCG {fmt(preview.result.lcg)} m · KG {fmt(preview.result.vcg)} m · TCG {fmt(preview.result.tcg)} m · FSM {fmt(preview.result.freeSurfaceMomentTransverse)} t·m. {t('Centres use the ship source coordinates.')}</p>}
 {preset&&<><p>{t('Tween-deck')}: {t({installed:'Installed',stored:'Stored onboard',ashore:'Ashore'}[preset.tweenDeck])} · {t('Surrounding water density')}: {preset.waterDensity} t/m³</p>
 {preset.weights.some(w=>w.category==='cargo')&&<p className="warnings">{t('Cargo is represented by aggregate weights and centres, not individual blocks in the cargo planner. Replace these weights when creating a detailed cargo layout to avoid double counting.')}</p>}
 <details><summary>{t('Source and differences')}</summary><p>{catalog.conditions?.source} · {t('PDF pages')}: {preset.sourcePages.join(', ')}</p><p>{t('These starters recalculate tank contents using the current tank tables and use the current deck-storage arrangement. Mass, centres and free-surface moments can differ from the documented case. They are not approved operating conditions.')}</p><p>{t('Documented displacement')}: {fmt(preset.reference.displacementTonnes)} t{preview.result&&<> · Δ {fmt(preview.result.displacementTonnes-preset.reference.displacementTonnes)} t</>}</p></details></>}
 {choice==='empty'&&<p>{t('Empty tanks do not constitute a ballast departure condition. Calculated trim may be outside the available tables.')}</p>}
 {applied&&<p role="status">{applied}</p>}
 </details>;
}
