import {CargoTypeOptions} from './cargo-type-options';
import {defaultCargoShape} from '../app/cargo-shape';
import {useMemo,useState} from 'react';
import {cargoFamilies,cargoTemplateFromWeight,decodeCargoLibrary,libraryKey,type CargoTemplate} from '../app/cargo-templates';
import {capacitySettingsFromCargo,type CapacitySettings} from '../app/cargo-capacity';
import type {WeightDraft} from '../app/loading-state';
import {useLanguage} from '../app/language-context';

/** Shared definitions are snapshots: choosing a proposal never edits placed cargo. */
export function CapacityCargoPicker({settings,weights,onChange}:{settings:CapacitySettings;weights:WeightDraft[];onChange:(s:CapacitySettings)=>void}){
 const {t}=useLanguage();
 const [library]=useState(()=>{try{const raw=localStorage.getItem(libraryKey);return {templates:raw?decodeCargoLibrary(raw).templates:[],error:''};}catch{return {templates:[],error:'The saved library could not be read. Export the original or import a valid library to recover it.'};}});
 const [chosen,setChosen]=useState('');
 const placed=useMemo(()=>{
  const groups=new Map<string,{definition:CargoTemplate;count:number;mass:number}>();
  for(const w of weights){const definition=cargoTemplateFromWeight(w);if(!definition)continue;
   const {id:_id,footprint,...properties}=definition;
   const key=JSON.stringify({...properties,footprint:{...footprint,rotation:0}});
   const group=groups.get(key);if(group){group.count++;group.mass+=Number(w.massTonnes);}else groups.set(key,{definition,count:1,mass:Number(w.massTonnes)});
  }return [...groups.values()];
 },[weights]);
 const options=[...library.templates.map(d=>({id:'saved:'+d.id,definition:d,label:d.name})),...placed.map((g,i)=>({id:'placed:'+i,definition:g.definition,label:`${g.definition.name} · ${g.count} ${t('units')} · ${g.mass.toFixed(3)} t`}))];
 return <div className="capacity-cargo-picker"><div className="curve-inputs">
 <label>{t('Reuse cargo definition')}<select value={chosen} onChange={e=>{const value=e.target.value;setChosen(value);const item=options.find(o=>o.id===value);if(item)onChange(capacitySettingsFromCargo(settings,item.definition));}}><option value="">{t('Choose cargo or define below')}</option><optgroup label={t('Cargo templates')}>{options.filter(o=>o.id.startsWith('saved:')).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</optgroup><optgroup label={t('Cargo in the layout')}>{options.filter(o=>o.id.startsWith('placed:')).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</optgroup></select></label>
 <label>{t('Cargo type')}<select value={settings.cargoFamily??settings.cargoDefinition?.family??'boxed'} onChange={e=>{setChosen('');onChange({...settings,cargoDefinition:undefined,cargoPresetId:undefined,cargoShape:undefined,cargoFamily:e.target.value as CargoTemplate['family'],cargoName:cargoFamilies.find(f=>f[0]===e.target.value)![1]});}}>{cargoFamilies.map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></label>
 <label>{t('Cargo name')}<input maxLength={120} value={settings.cargoName??''} placeholder={t(cargoFamilies.find(f=>f[0]===(settings.cargoFamily??'boxed'))![1])} onChange={e=>onChange({...settings,cargoName:e.target.value})}/></label>
 </div><CargoTypeOptions key={settings.cargoFamily??'boxed'} family={settings.cargoFamily??settings.cargoDefinition?.family??'boxed'} shape={settings.cargoShape??settings.cargoDefinition?.footprint.shape??defaultCargoShape(settings.cargoFamily??'boxed')} onShape={cargoShape=>onChange({...settings,cargoShape})} onSize={p=>onChange({...settings,cargoPresetId:p.id,length:p.length,width:p.width,...(p.height===undefined?{}:{height:p.height,cargoShape:defaultCargoShape(settings.cargoFamily??'boxed')})})}/><p className="planner-note">{t('Reusing cargo keeps its properties. Edits here affect the proposal, not units already placed.')}</p>{library.error&&<p role="status">{t(library.error)}</p>}
 {settings.cargoDefinition&&<details><summary>{t('Cargo properties carried to layout')}</summary><dl><dt>{t('Stackability')}</dt><dd>{t(settings.cargoDefinition.footprint.stackability??'unknown')}</dd><dt>{t('Contact footprint / support instructions')}</dt><dd>{settings.cargoDefinition.contact||'—'}</dd><dt>{t('Property source and applicability')}</dt><dd>{settings.cargoDefinition.source||'—'}</dd></dl><p>{t('Orientation, CG, support rules and appearance are preserved. Review or edit them in Add cargo before placement.')}</p></details>}
 </div>;
}
