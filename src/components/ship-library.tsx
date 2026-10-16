import {FieldLabel} from './field-label';
import {ShipEditor} from './ship-editor';
import {useState} from 'react';
import {useLanguage} from '../app/language-context';
import {inspectShipPackage,type ShipInspection} from '../app/inspect-ship-package';
import {maxShipBytes} from '../app/ship-package';
import {downloadShipBundle,exportShipBundle} from '../app/ship-package-io';
import {shipLibrary,type LocalShipRecord} from '../platform/ship-models/local-ship-models';
import {loadBuiltInShipModel} from '../platform/ship-models/built-in-ship-model-source';
export function ShipLibrary({records,activeId,onRefresh,onUse,onClose}:{records:LocalShipRecord[];activeId:string;onRefresh:()=>Promise<void>;onUse:(id:string)=>void;onClose:()=>void}){
 const {language}=useLanguage();const l=(en:string,ro:string)=>language==='ro'?ro:en;
 const [editing,setEditing]=useState(false);
 const [preview,setPreview]=useState<ShipInspection>();const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <section className="panel ship-library" aria-label={l('Ship library','Biblioteca de nave')}>
 <div className="ship-library-heading"><h2>{l('Ship library','Biblioteca de nave')}</h2><button onClick={onClose}>{l('Close','Închide')}</button></div>
 <p>{l('Import prepared ship data as an open .ship.json package. Files stay in this browser; download a backup to keep them or move them to another computer.','Importă datele navei într-un pachet deschis .ship.json. Fișierele rămân în acest browser; descarcă o copie pentru păstrare sau transfer.')}</p>
 <p>{l('Packages may include hydrostatic tables, weights, tank filling tables, ballast arrangements, cargo surfaces and a glTF model. PDF drawings need to be converted into these data first. Maximum package size: 50 MB.','Pachetele pot include tabele hidrostatice, mase, tabele de umplere, planuri de balast, suprafețe de încărcare și un model glTF. Planurile PDF trebuie convertite în aceste date. Dimensiune maximă: 50 MB.')}</p>
 <div className="ship-library-actions"><button disabled={busy} onClick={()=>{setPreview(undefined);setEditing(true);}}>{l('Create ship','Creează navă')}</button><label>{l('Import ship package','Importă pachetul navei')}<input type="file" accept=".json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{setPreview(undefined);if(file.size>maxShipBytes)throw new Error('Package exceeds 50 MB.');const result=await inspectShipPackage(JSON.parse(await file.text()));setPreview(result);setName(result.bundle.manifest.name);});}}/></label>
 <button disabled={busy} onClick={()=>void run(async()=>{setPreview(undefined);const result=await inspectShipPackage(await exportShipBundle(await loadBuiltInShipModel('training-pontoon-100x20')));setPreview(result);setName(result.bundle.manifest.name);})}>{l('Preview training template','Previzualizează modelul didactic')}</button>
 <button disabled={busy} onClick={()=>void run(async()=>{downloadShipBundle(await exportShipBundle(await loadBuiltInShipModel('training-pontoon-100x20')));})}>{l('Download training template','Descarcă modelul didactic')}</button>
 <button disabled={busy} onClick={()=>void run(async()=>{setPreview(undefined);setEditing(false);const local=records.find(r=>r.id===activeId);const result=await inspectShipPackage(local?.bundle??await exportShipBundle(await loadBuiltInShipModel(activeId)));setPreview(result);setName(result.bundle.manifest.name);})}>{l('Review current ship package','Verifică pachetul navei curente')}</button>
 <button disabled={busy} onClick={()=>void run(async()=>{const local=records.find(r=>r.id===activeId);downloadShipBundle(local?.bundle??await exportShipBundle(await loadBuiltInShipModel(activeId)));})}>{l('Export current ship','Exportă nava curentă')}</button></div>
 {busy&&<p role="status">{l('Checking files…','Se verifică fișierele…')}</p>}{message&&<p role="status">{message}</p>}
 {editing&&<ShipEditor onCancel={()=>setEditing(false)} onReview={result=>{setPreview(result);setName(result.bundle.manifest.name);setEditing(false);}}/>}
 {preview&&!editing&&<div className="ship-package-preview"><h3>{l('Review before saving','Verifică înainte de salvare')}</h3><p><strong>{preview.bundle.manifest.name}</strong> · {preview.bundle.manifest.principalDimensions.lbp} × {preview.bundle.manifest.principalDimensions.beam} × {preview.bundle.manifest.principalDimensions.mouldedDepth} m</p>
 <p>{l('Draft range','Interval pescaj')}: {preview.draftRange.join('–')} m · {l('Tanks','Tancuri')}: {preview.catalog?.tanks.length??0} · {l('Fixed weights','Mase fixe')}: {preview.fixedCount}</p>
 <details><summary>{l('Numerical data coverage','Acoperirea datelor numerice')}</summary>
 <p>{l('Available data still has range and condition restrictions. This is not a safety approval.','Datele disponibile au limite de interval și de aplicabilitate. Aceasta nu este o aprobare de siguranță.')}</p>
 <dl className="vessel-data-coverage">{([
 ['uprightDisplacement','Upright displacement','Deplasament la asietă dreaptă'],
 ['transverseGM','Transverse GM','GM transversal'],
 ['longitudinalTrim','Trim calculation','Calculul asietei'],
 ['gzCurves','GZ curves','Curbe GZ'],
 ['tankFilling','Tank filling tables','Tabele de umplere a tancurilor'],
 ['kgLimitComparison','KG limit comparison','Compararea limitei KG'],
 ['windProfiles','Wind profiles','Profiluri de vânt'],
 ['downfloodingScreen','Downflooding screening','Verificarea inundării'],
 ['movableDeck','Movable deck weights','Masele punții mobile'],
 ['coupledHeeledDrafts','Coupled heeled draughts','Pescaje la înclinare cuplată'],
 ] as const).map(([key,en,ro])=><div key={key}><dt>{l(en,ro)}</dt><dd>{preview.foundation.capabilities[key]?l('Available within source coverage','Disponibil în limitele sursei'):l('Unavailable','Indisponibil')}</dd></div>)}</dl>
 {preview.foundation.upright.screening.findings.length>0&&<ul>{preview.foundation.upright.screening.findings.map((f,i)=><li key={i}>{l('Row','Rând')} {f.row}: {f.check} — {f.message}</li>)}</ul>}
 </details>
 <ul>{preview.warnings.map(w=><li key={w}>{w}</li>)}</ul>
 <label><FieldLabel label="Library name" help="Optional: leave blank to use the ship package name."/><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
 <button disabled={busy} onClick={()=>void run(async()=>{await shipLibrary('add',{id:`local-${crypto.randomUUID()}`,name:name.trim()||preview.bundle.manifest.name,savedAt:new Date().toISOString(),bundle:preview.bundle});await onRefresh();setPreview(undefined);setMessage(l('Ship saved locally. Choose Use ship when you are ready.','Nava a fost salvată local. Alege Folosește nava când ești pregătit.'));})}>{l('Save locally','Salvează local')}</button></div>}
 <h3>{l('Your ships','Navele tale')}</h3><p>{l('Save your current loading condition before switching ships.','Salvează condiția de încărcare curentă înainte de a schimba nava.')}</p>
 {!records.length&&<p>{l('No imported ships yet.','Nu există încă nave importate.')}</p>}
 <ul>{records.map(r=><li key={r.id} className="ship-library-entry"><strong>{r.name}</strong><button disabled={busy||r.id===activeId} onClick={()=>{onUse(r.id);onClose();}}>{r.id===activeId?l('Active','Activă'):l('Use ship','Folosește nava')}</button><button disabled={busy} onClick={()=>downloadShipBundle(r.bundle)}>{l('Download','Descarcă')}</button><button disabled={busy||r.id===activeId} onClick={()=>void run(async()=>{await shipLibrary('remove',undefined,r.id);await onRefresh();})}>{l('Remove from library','Elimină din bibliotecă')}</button></li>)}</ul>
 </section>;
}
