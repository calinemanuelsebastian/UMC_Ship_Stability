import {cargoVariants} from '../app/cargo-types';
import {cargoShapes,shapeLabels,type CargoShape} from '../app/cargo-shape';
import {useState} from 'react';
import {useLanguage} from '../app/language-context';
import type {CargoBatchPatch} from '../app/cargo-batch-edit';
export function CargoBatchProperties({family,selectedCount,matchingCount,onApply}:{family?:string;selectedCount:number;matchingCount:number;onApply:(patch:CargoBatchPatch,matching:boolean)=>string}){
 const {t}=useLanguage();const [scope,setScope]=useState('selected');const [feedback,setFeedback]=useState('');const [values,setValues]=useState<Record<string,string>>({});
 const [shape,setShape]=useState('');
 const [stackability,setStackability]=useState('');const [limitMode,setLimitMode]=useState('keep');const [limit,setLimit]=useState('');
 const variants=family==='project'||family===undefined?cargoShapes.map(s=>[s,shapeLabels[s]] as const):cargoVariants(family);
 const fields=[['name','Cargo name'],['massTonnes','Mass per unit (t)'],['length','Length (m)'],['width','Width (m)'],['height','Height (m)']];
 const valid=(!!shape||!!stackability||limitMode!=='keep'||Object.entries(values).some(([,v])=>v.trim()))&&(limitMode!=='set'||limit.trim()!==''&&Number.isFinite(Number(limit))&&Number(limit)>=0)&&Object.entries(values).every(([k,v])=>!v.trim()||k==='name'||Number.isFinite(Number(v))&&Number(v)>0);
 return <details className="cargo-batch-properties" open><summary>{t('Edit cargo properties')}</summary>
 <label>{t('Apply changes to')}<select value={scope} onChange={e=>setScope(e.target.value)}><option value="selected">{t('Selected cargo')} ({selectedCount})</option><option value="matching" disabled={!matchingCount}>{t('Matching cargo throughout vessel')} ({matchingCount})</option></select></label>
 <p>{t('Matching uses the cargo name and unit dimensions, regardless of horizontal rotation. Blank fields stay unchanged.')}</p>
 <div className="curve-inputs">{fields.map(([key,label])=><label key={key}>{t(label)}<input type={key==='name'?'text':'number'} min={key==='name'?undefined:'0.001'} step="any" value={values[key]??''} placeholder={t('Keep existing value')} onChange={e=>setValues({...values,[key]:e.target.value})}/></label>)}</div>
 {variants.length>1&&<label>{t(family==='project'||family===undefined?'Custom geometry':'Variant')}<select value={shape} onChange={e=>setShape(e.target.value)}><option value="">{t('Keep existing value')}</option>{variants.map(([s,label])=><option key={s} value={s}>{t(label)}</option>)}</select></label>}
 <label>{t('Stackability')}<select value={stackability} onChange={e=>setStackability(e.target.value)}><option value="">{t('Keep existing value')}</option><option value="unknown">{t('Unknown')}</option><option value="stackable">{t('Stackable')}</option><option value="unstackable">{t('Non-stackable')}</option></select></label>
 <label>{t('Top-load limit')}<select value={limitMode} onChange={e=>setLimitMode(e.target.value)}><option value="keep">{t('Keep existing value')}</option><option value="set">{t('Set top-load limit')}</option><option value="clear">{t('Clear top-load limit')}</option></select></label>
 {limitMode==='set'&&<label>{t('Maximum supported mass (t)')}<input type="number" min="0" step="any" value={limit} onChange={e=>setLimit(e.target.value)}/></label>}
 <p>{t('Positions and rotation stay unchanged. Height changes preserve the CG offset from the unit centre; stacked cargo is not moved automatically.')}</p>
 <button disabled={!valid||!(scope==='matching'?matchingCount:selectedCount)} onClick={()=>setFeedback(onApply({...(shape?{shape:shape as CargoShape}:{}),...Object.fromEntries(Object.entries(values).filter(([,v])=>v.trim()).map(([k,v])=>[k,k==='name'?v:Number(v)])),...(stackability?{stackability:stackability as CargoBatchPatch['stackability']}:{}),...(limitMode==='set'?{maxTopLoadTonnes:Number(limit)}:limitMode==='clear'?{maxTopLoadTonnes:null}:{})},scope==='matching'))}>{t('Apply to cargo')} ({scope==='matching'?matchingCount:selectedCount})</button><p role="status">{t(feedback)}</p>
 </details>;
}
