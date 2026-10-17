import {GuideLink} from '../app/user-guide';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useLanguage} from '../app/language-context';
import {dunnageMaterials} from '../app/dunnage-materials';
import type {DunnageSettings} from './dunnage-controls';
export function AutoDunnageControls({statusReset=0,revision,selectedCount,onInvalidate,onAction,onRemove,canRemove}:{statusReset?:number;revision:string;selectedCount:number;onInvalidate:()=>void;onRemove:()=>string;canRemove:boolean;onAction:(settings:DunnageSettings,maxGap:number,walls:boolean,action:'add'|'preview'|'refresh',signal:AbortSignal)=>Promise<string>}){
 const [saved]=useState(()=>{try{return JSON.parse(localStorage.getItem('umc-auto-dunnage-settings')??'{}');}catch{return {};}});
 const {t}=useLanguage();const [notice,setNotice]=useState({text:'',reset:statusReset});const setMessage=(text:string)=>setNotice({text,reset:statusReset});const message=notice.reset===statusReset?notice.text:'';const [enabled,setEnabled]=useState(saved?.enabled!==false),[maxGap,setMaxGap]=useState(String(Number(saved?.maxGap)>0?saved.maxGap:'0.2')),[thickness,setThickness]=useState(String(Number(saved?.thickness)>0?saved.thickness:'0.05')),[walls,setWalls]=useState(saved?.walls===true),[material,setMaterial]=useState(dunnageMaterials.some(p=>p.id===saved?.material&&!p.manualOnly)?saved.material:'pine');
 const [supportMode,setSupportMode]=useState<'gaps'|'separators'|'racks'>('gaps');
 const [clearance,setClearance]=useState('0.1');
 const [boundarySource,setBoundarySource]=useState(typeof saved?.boundarySource==='string'?saved.boundarySource:'');
 const [arrangement,setArrangement]=useState<'solid'|'frame'>(saved?.arrangement==='solid'?'solid':'frame');
 const [solidLimit,setSolidLimit]=useState(String(Number(saved?.solidLimit)>0?saved.solidLimit:.2)),[memberWidth,setMemberWidth]=useState(String(Number(saved?.memberWidth)>0?saved.memberWidth:.1)),[bearerSpacing,setBearerSpacing]=useState(String(Number(saved?.bearerSpacing)>0?saved.bearerSpacing:1));
 const [estimate,setEstimate]=useState(''),[reviewed,setReviewed]=useState('');
 const signature=useMemo(()=>JSON.stringify([supportMode,clearance,revision,maxGap,thickness,walls,boundarySource,material,arrangement,solidLimit,memberWidth,bearerSpacing]),[supportMode,clearance,revision,maxGap,thickness,walls,boundarySource,material,arrangement,solidLimit,memberWidth,bearerSpacing]);
 const timber=material==='pine'||material==='spruce';
 useEffect(()=>{if(!timber&&arrangement==='frame')setArrangement('solid');},[timber,arrangement]);
 const preset=dunnageMaterials.find(p=>p.id===material)!;
 const positive=(v:string)=>Number.isFinite(Number(v))&&Number(v)>0;
 const valid=positive(thickness)&&(supportMode==='racks'?timber&&positive(clearance)&&positive(memberWidth):supportMode==='separators'?true:(!walls||!!boundarySource.trim())&&positive(maxGap)&&(arrangement!=='frame'||timber&&[solidLimit,memberWidth,bearerSpacing].every(positive)));

 const settings:DunnageSettings={supportMode,frameClearance:Number(clearance),boundarySource,arrangement,solidLimit:Number(solidLimit),memberWidth:Number(memberWidth),bearerSpacing:Number(bearerSpacing),length:1,width:Number(memberWidth),thickness:Number(thickness),mass:1,material:preset.name,densityKgM3:preset.density,massMode:'calculated',count:1,gap:0,direction:'x'};
 useEffect(()=>{if(valid)try{localStorage.setItem('umc-auto-dunnage-settings',JSON.stringify({enabled,maxGap,thickness,walls,boundarySource,material,arrangement,solidLimit,memberWidth,bearerSpacing}));}catch{/* Settings remain usable when storage is unavailable. */}},[enabled,maxGap,thickness,walls,boundarySource,material,valid,arrangement,solidLimit,memberWidth,bearerSpacing]);
 const actionRef=useRef(onAction);actionRef.current=onAction;
 const job=useRef<AbortController|undefined>(undefined);const [busy,setBusy]=useState(false);
 const invalidateRef=useRef(onInvalidate);invalidateRef.current=onInvalidate;
 const refreshTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const cancel=()=>{invalidateRef.current();clearTimeout(refreshTimer.current);refreshTimer.current=undefined;job.current?.abort();job.current=undefined;setBusy(false);};
 const run=async(action:'add'|'preview'|'refresh')=>{
  clearTimeout(refreshTimer.current);refreshTimer.current=undefined;job.current?.abort();const controller=new AbortController();job.current=controller;setBusy(true);
  try{const text=await actionRef.current(settings,Number(maxGap),walls,action,controller.signal);if(controller.signal.aborted)return;if(action==='add')setMessage(text);else{setEstimate(text);setReviewed(signature);}}
  catch(error){if(!controller.signal.aborted)setMessage((error as Error).message);}
  finally{if(job.current===controller){job.current=undefined;setBusy(false);}}
 };
 const runRef=useRef(run);runRef.current=run;
 useEffect(()=>{
  cancel();setReviewed('');
  if(!enabled||!valid)return;
  refreshTimer.current=setTimeout(()=>{void runRef.current('refresh');},350);
  return()=>{clearTimeout(refreshTimer.current);job.current?.abort();};
 },[signature,enabled,valid]);
 return <section className="cargo-stack-controls" aria-label={t('Auto dunnage assistant')}>
 <p><strong>{selectedCount?`${t('Scope: selected cargo')} (${selectedCount})`:t('Scope: all loading areas')}</strong></p>
 <label>{t('Support purpose')}<select value={supportMode} onChange={e=>{setSupportMode(e.target.value as typeof supportMode);if(e.target.value==='racks'&&!timber)setMaterial('pine');setWalls(false);}}><option value="gaps">{t('Spacers between flat faces')}</option><option value="separators">{t('Fitted separators above cargo')}</option><option value="racks">{t('Independent racks around cargo')}</option></select></label><p>{t(supportMode==='separators'?'Matches box tops and upright round caps. Cargo must have a declared top-load capacity.':supportMode==='racks'?'One floor-supported rack per cargo unit. Cargo is not duplicated; rack capacity remains unknown.':'Fits eligible facing gaps. Curved contact needs a reviewed cradle or restraint.')}</p>
 <div className="curve-inputs"><label>{t('Dunnage material')}<select value={material} onChange={e=>setMaterial(e.target.value)}>{dunnageMaterials.filter(p=>p.id!=='custom'&&!p.manualOnly&&(supportMode!=='racks'||p.id==='pine'||p.id==='spruce')).map(p=><option key={p.id} value={p.id}>{t(p.name)}</option>)}</select></label>{supportMode==='gaps'&&<label>{t('Maximum gap (m)')}<input type="number" min="0.001" step="0.01" value={maxGap} onChange={e=>setMaxGap(e.target.value)}/></label>}</div>
 {supportMode==='gaps'&&<><label>{t('Dunnage arrangement')}<select value={arrangement} onChange={e=>setArrangement(e.target.value as 'solid'|'frame')}><option value="frame" disabled={!timber}>{t('Small spacers + open frames')}</option><option value="solid">{t('Solid spacers')}</option></select></label>
 <label><input type="checkbox" checked={walls} onChange={e=>setWalls(e.target.checked)}/>{t('Include hold-boundary gaps')}</label>{walls&&<label>{t('Boundary bearing source and applicability')}<textarea maxLength={500} value={boundarySource} onChange={e=>setBoundarySource(e.target.value)}/><small>{t('Confirm the intended bearing surface from ship documentation. A hold outline alone does not establish lining or shell capacity. Elevated boundary support is not inferred.')}</small></label>}
 </>}{supportMode==='racks'&&<div className="curve-inputs"><label>{t('Clearance around and above cargo (m)')}<input type="number" min="0.001" step="0.01" value={clearance} onChange={e=>setClearance(e.target.value)}/></label><label>{t('Post width (m)')}<input type="number" min="0.001" step="0.01" value={memberWidth} onChange={e=>setMemberWidth(e.target.value)}/></label></div>}
 <details><summary>{t('Dimensions and preview settings')}</summary><label>{t('Dunnage thickness (m)')}<input type="number" min="0.001" step="0.01" value={thickness} onChange={e=>setThickness(e.target.value)}/></label>{supportMode==='gaps'&&arrangement==='frame'&&<div className="curve-inputs"><label>{t('Solid spacer threshold (m)')}<input type="number" min="0.001" step="0.01" value={solidLimit} onChange={e=>setSolidLimit(e.target.value)}/></label><label>{t('Frame member width (m)')}<input type="number" min="0.001" step="0.01" value={memberWidth} onChange={e=>setMemberWidth(e.target.value)}/></label><label>{t('Maximum cross-bearer spacing (m)')}<input type="number" min="0.001" step="0.1" value={bearerSpacing} onChange={e=>setBearerSpacing(e.target.value)}/></label></div>}<label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{t('Update preview automatically')}</label></details>
 {busy&&<p role="status" aria-live="polite">{t('Calculating dunnage… You can cancel without changing the layout.')}</p>}<p role="status">{valid?(reviewed===signature?estimate:t('Update the preview to review the added mass.')):t(walls&&!boundarySource.trim()?'Provide a boundary bearing source, or turn off boundary gaps.':'Enter positive frame dimensions and spacing.')}</p>
 <div className="scene-toolbar"><button disabled={busy||!valid||reviewed!==signature} onClick={()=>void run('add')}>{t('Add proposed supports')}</button><button disabled={busy||!valid} onClick={()=>void run('preview')}>{t('Preview')}</button>{busy&&<button onClick={cancel}>{t('Cancel calculation')}</button>}<button disabled={busy||!canRemove} onClick={()=>setMessage(onRemove())}>{t('Remove dunnage')}</button></div>
 <p role="status" aria-live="polite" style={{minHeight:'2.5em'}}>{t(message)}</p>
 <GuideLink topic="dunnage"/></section>;
}
