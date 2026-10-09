import {useState,useRef,useEffect} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {modelSignature,parseScenario,readLibrary,type SavedScenario,type ScenarioState} from '../app/saved-scenarios';
import {useLanguage} from '../app/language-context';
export function SavedScenarios({ship,state,ready,onRestore,saveRequest}:{ship:ShipModelPackage;state:ScenarioState;ready:boolean;onRestore:(state:ScenarioState)=>void;saveRequest?:{name:string;id:number}}){
 const {t}=useLanguage();const panelRef=useRef<HTMLDetailsElement>(null);const nameRef=useRef<HTMLInputElement>(null);const model=modelSignature(ship);const storageKey=`umc-scenarios-v1:${ship.manifest.id}`;
 const [initial]=useState(()=>{try{return {items:readLibrary(localStorage,storageKey,model),error:''};}catch{return {items:[] as SavedScenario[],error:'Saved scenarios could not be read. Export your current inputs as a backup.'};}});
 const [items,setItems]=useState(initial.items),[selected,setSelected]=useState(''),[name,setName]=useState('');
 useEffect(()=>{if(saveRequest){setName(saveRequest.name);if(panelRef.current)panelRef.current.open=true;nameRef.current?.focus();panelRef.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[saveRequest]);
 const [message,setMessage]=useState(initial.error);const [storageBlocked]=useState(!!initial.error);
 const previous=useRef<ScenarioState|undefined>(undefined);const [canUndoLoad,setCanUndoLoad]=useState(false);
 const snapshot=():SavedScenario=>parseScenario({version:1,id:crypto.randomUUID(),name:name.trim()||'Untitled scenario',model,savedAt:new Date().toISOString(),state},model);
 function persist(next:SavedScenario[]){
  if(storageBlocked)throw new Error('Local saving is unavailable. Export a scenario file instead.');
  if(next.length>100)throw new Error('The library can hold up to 100 scenarios.');
  localStorage.setItem(storageKey,JSON.stringify(next));setItems(next);
 }
 function action(work:()=>void){try{work();}catch(error){setMessage(error instanceof Error?error.message:'Scenario operation failed.');}}
 function restore(value:ScenarioState){const before=structuredClone(state);onRestore(structuredClone(value));previous.current=before;setCanUndoLoad(true);}
 return <details ref={panelRef} className="panel saved-scenarios"><summary>{t('Saved scenarios')}</summary>
 <p>{t('Save named input snapshots in this browser. Export a JSON file for backup or sharing. Incomplete inputs may be saved; results are recalculated when loaded.')}</p>
 <label>{t('Scenario name')} <input ref={nameRef} aria-label={t('Scenario name')} placeholder={t('e.g. Departure condition or Arrival condition')} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
 <div className="scene-toolbar"><button disabled={!ready||!name.trim()||storageBlocked} onClick={()=>action(()=>{const entry=snapshot();persist([...items,entry]);setSelected(entry.id);setMessage('Scenario saved.');})}>{t('Save new scenario')}</button>
 <button disabled={!ready} onClick={()=>action(()=>{const entry=snapshot();const url=URL.createObjectURL(new Blob([JSON.stringify(entry,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ship-stability-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Scenario file exported.');})}>{t('Export current inputs')}</button></div>
 <label>{t('Saved condition')} <select aria-label={t('Saved condition')} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('Choose a scenario')}</option>{items.map(item=><option key={item.id} value={item.id}>{item.name} · {new Date(item.savedAt).toLocaleString()}</option>)}</select></label>
 <div className="scene-toolbar"><button disabled={!ready||!selected} onClick={()=>action(()=>{const entry=items.find(i=>i.id===selected);if(entry){restore(entry.state);setName(entry.name);setMessage('Scenario loaded.');}})}>{t('Load selected scenario')}</button>
 <button disabled={!selected||storageBlocked} onClick={()=>action(()=>{persist(items.filter(i=>i.id!==selected));setSelected('');setMessage('Saved scenario deleted.');})}>{t('Delete saved scenario')}</button>
 <button disabled={!canUndoLoad} onClick={()=>action(()=>{if(previous.current){onRestore(previous.current);previous.current=undefined;setCanUndoLoad(false);setMessage('Previous inputs restored.');}})}>{t('Undo scenario load')}</button></div>
 <label>{t('Import scenario file')} <input aria-label={t('Import scenario file')} type="file" accept=".json,application/json" disabled={!ready} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>25_000_000)throw new Error('Scenario file is too large.');const entry=parseScenario(JSON.parse(await file.text()),model);restore(entry.state);setName(entry.name);setMessage('Scenario imported. Use Save new scenario to keep it in this browser.');}catch(error){setMessage(error instanceof Error?error.message:'Scenario import failed.');}}}/></label>
 <p role="status">{t(message)}</p></details>;
}
