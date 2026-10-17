import {useState} from 'react';
import {cargoVariants,cargoSizePresets,cargoTypeInfo,type CargoTypeId,type CargoSizePreset} from '../app/cargo-types';
import {cargoShapes,shapeLabels,type CargoShape} from '../app/cargo-shape';
import {useLanguage} from '../app/language-context';
export function CargoTypeOptions({family,shape,onShape,onSize}:{family:CargoTypeId;shape:CargoShape;onShape:(v:CargoShape)=>void;onSize:(v:CargoSizePreset)=>void}){
 const {t}=useLanguage();const [chosen,setChosen]=useState('');
 const theoryUrl=new URL(typeof window==='undefined'?'http://localhost/':window.location.href);theoryUrl.searchParams.set('page','theory');theoryUrl.searchParams.delete('info');theoryUrl.hash=`cargo-type-${family}`;
 const variants=family==='project'?cargoShapes.map(s=>[s,shapeLabels[s]] as const):cargoVariants(family);
 const sizes=cargoSizePresets.filter(p=>p.types.includes(family));const preset=sizes.find(p=>p.id===chosen);
 return <div className="cargo-type-options">
 {(variants.length>1||family==='project'||!variants.some(v=>v[0]===shape))&&<label>{t(family==='project'?'Custom geometry':'Variant')}<select value={shape} onChange={e=>onShape(e.target.value as CargoShape)}>{!variants.some(v=>v[0]===shape)&&<option value={shape}>{t('Saved geometry')} — {t(shapeLabels[shape])}</option>}{variants.map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></label>}
 {!!sizes.length&&<label>{t('Size preset')}<select value={chosen} onChange={e=>{setChosen(e.target.value);const p=sizes.find(p=>p.id===e.target.value);if(p)onSize(p);}}><option value="">{t('Custom dimensions')}</option>{sizes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
 {preset&&<p className="planner-note">{t(preset.note)} <a href={preset.source} target="_blank" rel="noreferrer">{t('Dimension source')}</a> · {t('Dimensions remain editable; editing them creates a custom size.')}</p>}
 <details><summary>{t('About this cargo type')}</summary><p>{t(cargoTypeInfo[family].description)}</p><p>{t(cargoTypeInfo[family].guidance)}</p><small>{cargoTypeInfo[family].reference}</small><p><a href={theoryUrl.href}>{t('Cargo types in Theory')}</a></p></details>
 </div>;
}
