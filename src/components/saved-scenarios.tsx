import {useState,useRef,useEffect} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {modelSignature,parseScenario,readScenarioRecords,mutateScenarioLibrary,type SavedScenario,type ScenarioState} from '../app/saved-scenarios';
import {useLanguage} from '../app/language-context';
export function SavedScenarios({ship,state,ready,onRestore,saveRequest}:{ship:ShipModelPackage;state:ScenarioState;ready:boolean;onRestore:(state:ScenarioState)=>void;saveRequest?:{name:string;id:number}}){
 const {t}=useLanguage();const panelRef=useRef<HTMLDetailsElement>(null);const nameRef=useRef<HTMLInputElement>(null);const model=modelSignature(ship);const storageKey=`umc-scenarios-v1:${ship.manifest.id}`;
 const [initial]=useState(()=>{try{const result=readScenarioRecords(localStorage,storageKey,model);return {items:result.items,error:result.damaged?'Some saved records could not be read. They were retained; other plans and recovery remain available.':'',blocked:false};}catch{return {items:[] as SavedScenario[],blocked:true,error:'Saved scenarios could not be read. Export your current inputs as a backup.'};}});
 const [items,setItems]=useState(initial.items),[selected,setSelected]=useState(''),[name,setName]=useState('');
 useEffect(()=>{if(saveRequest){setName(saveRequest.name);if(panelRef.current)panelRef.current.open=true;nameRef.current?.focus();panelRef.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[saveRequest]);
 const [message,setMessage]=useState(initial.error);const [storageBlocked]=useState(!!initial.blocked);
 const previous=useRef<ScenarioState|undefined>(undefined);const [canUndoLoad,setCanUndoLoad]=useState(false);
 const snapshot=():SavedScenario=>parseScenario({version:1,id:crypto.randomUUID(),name:name.trim()||'Untitled scenario',model,savedAt:new Date().toISOString(),state},model);
 const [busy,setBusy]=useState(false);
 async function persist(change:{add:SavedScenario}|{remove:string}){
  if(storageBlocked)throw new Error('Local saving is unavailable. Export a scenario file instead.');
  if(!navigator.locks)throw new Error('Safe local saving is unavailable in this browser. Export a scenario file instead.');
  await navigator.locks.request(storageKey,async()=>{const result=mutateScenarioLibrary(localStorage,storageKey,model,change);setItems(result.items);});
 }
 async function action(work:()=>void|Promise<void>){setBusy(true);try{await work();}catch(error){setMessage(error instanceof Error?error.message:'Scenario operation failed.');}finally{setBusy(false);}}
 useEffect(()=>{const refresh=(e:StorageEvent)=>{if(e.key===storageKey){try{setItems(readScenarioRecords(localStorage,storageKey,model).items);}catch{setMessage('Saved scenarios could not be read. Export your current inputs as a backup.');}}};window.addEventListener('storage',refresh);return()=>window.removeEventListener('storage',refresh);},[storageKey,model]);
 function restore(value:ScenarioState){const before=structuredClone(state);onRestore(structuredClone(value));previous.current=before;setCanUndoLoad(true);}
 return <details ref={panelRef} className="panel saved-scenarios"><summary>{t('Saved scenarios')}</summary>
 <p>{t('Save named input snapshots in this browser. Export a JSON file for backup or sharing. Incomplete inputs may be saved; results are recalculated when loaded.')}</p>
 <label>{t('Scenario name')} <input ref={nameRef} aria-label={t('Scenario name')} placeholder={t('e.g. Departure condition or Arrival condition')} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
 <div className="scene-toolbar"><button disabled={!ready||!name.trim()||storageBlocked||busy} onClick={()=>action(async()=>{const entry=snapshot();await persist({add:entry});setSelected(entry.id);setMessage('Scenario saved.');})}>{t('Save new scenario')}</button>
 <button disabled={!ready} onClick={()=>action(()=>{const entry=snapshot();const url=URL.createObjectURL(new Blob([JSON.stringify(entry,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ship-stability-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Scenario file exported.');})}>{t('Export current inputs')}</button></div>
 <label>{t('Saved condition')} <select aria-label={t('Saved condition')} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('Choose a scenario')}</option>{items.map(item=><option key={item.id} value={item.id}>{item.name} · {new Date(item.savedAt).toLocaleString()}</option>)}</select></label>
 <div className="scene-toolbar"><button disabled={!ready||!selected} onClick={()=>action(()=>{const entry=items.find(i=>i.id===selected);if(entry){restore(entry.state);setName(entry.name);setMessage('Scenario loaded.');}})}>{t('Load selected scenario')}</button>
 <button disabled={!selected||storageBlocked||busy} onClick={()=>action(async()=>{await persist({remove:selected});setSelected('');setMessage('Saved scenario deleted.');})}>{t('Delete saved scenario')}</button>
 <button disabled={!canUndoLoad} onClick={()=>action(()=>{if(previous.current){onRestore(previous.current);previous.current=undefined;setCanUndoLoad(false);setMessage('Previous inputs restored.');}})}>{t('Undo scenario load')}</button></div>
 <label>{t('Import scenario file')} <input aria-label={t('Import scenario file')} type="file" accept=".json,application/json" disabled={!ready} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>25_000_000)throw new Error('Scenario file is too large.');const entry=parseScenario(JSON.parse(await file.text()),model);restore(entry.state);setName(entry.name);setMessage('Scenario imported. Use Save new scenario to keep it in this browser.');}catch(error){setMessage(error instanceof Error?error.message:'Scenario import failed.');}}}/></label>
 <p role="status">{t(message)}</p></details>;
}
