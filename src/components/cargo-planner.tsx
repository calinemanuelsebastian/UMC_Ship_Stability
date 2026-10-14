import {DunnageReview} from './dunnage-review';
import {CargoTemplateLibrary,type TemplateDetails} from './cargo-template-library';
import {cargoFamilies,grossTemplateMass,parseCargoTemplate,type CargoTemplate} from '../app/cargo-templates';
import {useCargoDragCancellation} from './use-cargo-drag-cancellation';
import {CargoTopItems,type CargoTopActions} from './cargo-top-items';
import {CargoObjectList} from './cargo-object-list';
import {runDunnageJob} from '../app/dunnage-job';
import type {CapacityCargoTemplate} from '../app/cargo-capacity';
import {removeDunnage,removableDunnageIds} from '../app/remove-dunnage';
import type {autoDunnageBatch} from '../app/auto-dunnage';
import {AutoDunnageControls} from './auto-dunnage-controls';
import {boundaryDunnageFits,permitsAutoDunnage} from '../app/boundary-dunnage';
import {dunnageProfiles,type DunnageProfile} from '../app/dunnage-profile';
import {CargoIdentificationEditor} from './cargo-identification-editor';
import {parseCargoMarkings,validateUniqueIdentifiers,cloneMarkings,type CargoMarkings} from '../app/cargo-identification';
import {usePlanPan} from './use-plan-pan';
import {cargoGapPairs} from '../app/cargo-gap-pairs';
import {CargoBatchProperties} from './cargo-batch-properties';
import {editCargoBatch,sameCargoType} from '../app/cargo-batch-edit';
import {LayoutHistory} from '../app/layout-history';
import {SecuringAssessment} from './securing-assessment';
import {CargoLoadAssessment} from './cargo-load-assessment';
import {deckDefinition} from '../app/tween-deck';
import {useWindowSelection} from './use-window-selection';
import {buildLoadedSupportFrame} from '../app/support-frame';
import {stackingWarnings,checkStackingChange,checkStackingEdits,type Stackability} from '../app/stackability';
import {stackLayer} from '../app/stack-layer';
import {deleteCargoSelection} from '../app/delete-cargo';
import {placeWithCargoSnap} from '../app/cargo-snapping';
import {spacingTarget} from '../app/cargo-spacing';
import {supportingHatchPanels} from '../app/hatch-contacts';
import {CargoDimensions} from './cargo-dimensions';
import {dunnageMassTonnes} from '../app/dunnage-materials';
import {DunnageControls,type DunnageSettings} from './dunnage-controls';
import {createDunnagePattern,dunnageGap,createDunnage} from '../app/dunnage';
import {lazy,Suspense} from 'react';
import {cargoBottom,rotateCargoPreview,rotateCargoGroup,placeCargoGroup,translateCargoGroup,placeSupportedCargo,stackCargoOn} from '../app/cargo-placement';
const Cargo3DEditor=lazy(()=>import('./cargo-3d-editor'));
import {pasteCargoGroup} from '../app/copy-cargo';
import {CargoElevations} from './cargo-elevations';
import { isCargo } from '../app/tank-operations';
import { cargoSurfaces, cargoOnSurface } from '../app/cargo-surfaces';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import type { WeightDraft } from '../app/loading-state';
import { placeCargo, cargoBounds, layoutIssues, parseArea, parseFootprint, type CargoArea } from '../app/cargo-layout';
import { useLanguage } from '../app/language-context';
import { NumberInput } from './number-input';

function AreaEditor({area,onChange}:{area?:CargoArea;onChange:(a:CargoArea)=>void}) {
  const {t}=useLanguage();
  const [values,setValues]=useState<Record<string,string>>({name:area?.name??'',...Object.fromEntries(['xMin','xMax','yMin','yMax','deckZ','clearHeight'].map(k=>[k,String(area?.[k as keyof CargoArea]??(k==='clearHeight'?10:''))]))});
  const [error,setError]=useState('');
  return <details><summary>{t('Define rectangular planning area')}</summary><p>{t('Use vessel-source coordinates in metres. This rectangle is a user-defined working boundary, not a verified hold shape.')}</p>
    <div className="curve-inputs">{['name','xMin','xMax','yMin','yMax','deckZ','clearHeight'].map(k=><label key={k}>{t(({name:'Area name',xMin:'Minimum x',xMax:'Maximum x',yMin:'Minimum y',yMax:'Maximum y',deckZ:'Deck elevation',clearHeight:'Available clear height'} as Record<string,string>)[k])}<input type={k==='name'?'text':'number'} step="any" value={values[k]} onChange={e=>setValues({...values,[k]:e.target.value})}/></label>)}</div>
    <button onClick={()=>{try{if(Object.values(values).some(v=>!v.trim()))throw new Error('Complete all planning-area fields.');onChange(parseArea({...values,...Object.fromEntries(['xMin','xMax','yMin','yMax','deckZ','clearHeight'].map(k=>[k,Number(values[k])]))}));setError('');}catch(e){setError((e as Error).message);}}}>{t('Apply planning area')}</button><p role="status">{t(error)}</p>
  </details>;
}
export function CargoPlanner({capacityCargo,onCapacityCargoUsed,tweenDeck='installed',onDeckChange,ship,weights,setWeights,area,setArea,ready}:{capacityCargo?:CapacityCargoTemplate;onCapacityCargoUsed?:()=>void;tweenDeck?:'installed'|'stored'|'ashore';onDeckChange?:(mode:'installed'|'stored'|'ashore')=>void;ship:ShipModelPackage;weights:WeightDraft[];setWeights:Dispatch<SetStateAction<WeightDraft[]>>;area?:CargoArea;setArea:(a:CargoArea)=>void;ready:boolean}) {
  const {t}=useLanguage();
  const [panMode,setPanMode]=useState(false);
  const [panReset,setPanReset]=useState(0);
  const [supportStatusReset,setSupportStatusReset]=useState(0);
  const [cargoSearch,setCargoSearch]=useState('');
  const [autoReview,setAutoReview]=useState<Awaited<ReturnType<typeof runDunnageJob>>>();
  const [gapPreview,setGapPreview]=useState<{parts:WeightDraft[];before:string;scope:string;skipped:number;excluded?:number}>();
  const [objectsOpen,setObjectsOpen]=useState(false);
  const [contextMenu,setContextMenu]=useState<{x:number;y:number}>();
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!contextMenu)return;
    const previous=document.activeElement as HTMLElement|null;
    menuRef.current?.querySelector('button')?.focus();
    const close=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node))setContextMenu(undefined);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setContextMenu(undefined);previous?.focus({preventScroll:true});}};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',key,true);
    return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key,true);};
  },[contextMenu]);
  function showContext(id:string|undefined,x:number,y:number){
    if(pending||pasteDraft||placingCargo)return;
    if(id&&!editable.some(w=>w.id===id))return;
    if(id&&!selection.includes(id))setSelection([id]);
    setPalette('selection');setContextMenu({x:Math.max(8,Math.min(x,window.innerWidth-248)),y:Math.max(8,Math.min(y,window.innerHeight-340))});
  }
  const toolsPanel=useRef<HTMLDetailsElement>(null);
  const [reveal,setReveal]=useState<{target:'tools'|'drawing';id:number}>();
  const revealPanel=(target:'tools'|'drawing')=>setReveal(previous=>({target,id:(previous?.id??0)+1}));
  const openTool=(tool:'cargo'|'dunnage'|'selection')=>{setPanMode(false);setToolsOpen(true);setPalette(tool);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);revealPanel('tools');};
  const startSelecting=()=>{setPanMode(false);setPalette('selection');setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);setToolsOpen(false);revealPanel('drawing');};
  const [toolsOpen,setToolsOpen]=useState(false);
  const [selection,setSelection]=useState<string[]>([]),[multiSelect,setMultiSelect]=useState(false);
  const selected=selection.at(-1)??'';
  const setSelected=(id:string)=>setSelection(id?[id]:[]);
  const [name,setName]=useState('Rectangular cargo'),[length,setLength]=useState('1.2'),[width,setWidth]=useState('0.8'),[height,setHeight]=useState('1.2'),[mass,setMass]=useState(''),[snap,setSnap]=useState(true),[error,setError]=useState('');
  const [teachingOverride,setTeachingOverride]=useState(false);
  const [templateDetails,setTemplateDetails]=useState<TemplateDetails>({family:'boxed',quantity:1,contact:'',source:''});
  const [cargoStackability,setCargoStackability]=useState<Stackability>('unknown'),[topLoad,setTopLoad]=useState('');
  const [snapStep,setSnapStep]=useState(.1);
  const [cargoSnap,setCargoSnap]=useState(false),[snapGap,setSnapGap]=useState(0),[snapRange,setSnapRange]=useState(.2);
  const cargoSnapOptions=cargoSnap?{gap:snapGap,range:snapRange}:undefined;
  const snapValue=snap?snapStep:false;
  const [view,setView]=useState<'3d'|'top'|'side'|'end'>('3d'),[stacking,setStacking]=useState(true);
  const [supportTask,setSupportTask]=useState<'auto'|'pieces'|'stack'>('auto');
  const [palette,setPalette]=useState<'cargo'|'dunnage'|'selection'>('selection');
  const [newMarkings,setNewMarkings]=useState<CargoMarkings>();
  const [dunnageProfile,setDunnageProfile]=useState<DunnageProfile>('unspecified');
  const profileLabels={unspecified:'General cargo — automatic spacers',boxed:'Boxed / palletised — gap spacer preview',ventilated:'Ventilated / perishable',drums:'Drums / cylindrical packages',rolls:'Rolls / coils',dangerous:'Dangerous goods'};
  const [cargoRotation,setCargoRotation]=useState<0|90>(0);
  const [pending,setPending]=useState<DunnageSettings>();
  const [pasteDraft,setPasteDraft]=useState<WeightDraft[]>();
  const [placingCargo,setPlacingCargo]=useState(false);
  const [cursor,setCursor]=useState<{x:number;y:number}>();
  const [supportId,setSupportId]=useState('');
  const [clipboard,setClipboard]=useState<WeightDraft[]>();
  const [gap,setGap]=useState('0.1'),[spacingReference,setSpacingReference]=useState<string[]>([]),[gapDirection,setGapDirection]=useState<'forward'|'aft'|'starboard'|'port'>('forward');
  const [zoom,setZoom]=useState(1),[focus,setFocus]=useState<{x:number;y:number}>();
  const planPan=usePlanPan(panMode,zoom,setZoom);
  const drawings=useRef<HTMLDivElement>(null);
  const [capacityTarget,setCapacityTarget]=useState<number>();
  useEffect(()=>{
    if(!capacityCargo)return;
    setName(t('Rectangular cargo'));setLength(String(capacityCargo.length));setWidth(String(capacityCargo.width));setHeight(String(capacityCargo.height));setMass(String(capacityCargo.mass));
    setTemplateDetails({family:'boxed',quantity:capacityCargo.quantity??1,contact:'',source:''});setCapacityTarget(capacityCargo.quantity);setCargoRotation(0);setCargoStackability('unknown');setTopLoad('');setNewMarkings(undefined);setDunnageProfile('unspecified');setTeachingOverride(false);setError('');
    openTool('cargo');onCapacityCargoUsed?.();
  },[capacityCargo,onCapacityCargoUsed,t]);

  useEffect(()=>{
    if(!reveal)return;
    const frame=requestAnimationFrame(()=>{
      const target=reveal.target==='tools'?toolsPanel.current:drawings.current;
      if(!target)return;
      if(reveal.target==='tools')target.scrollTop=0;
      target.focus({preventScroll:true});
      const rect=target.getBoundingClientRect();
      if(rect.top<0||rect.top>window.innerHeight-100)target.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });
    return ()=>cancelAnimationFrame(frame);
  },[reveal]);
  const svg=useRef<SVGSVGElement>(null), latest=useRef(weights);latest.current=weights;
  const drag=useRef<{id:string;dx:number;dy:number;before:WeightDraft[];target?:{x:number;y:number;z:number};valid?:boolean}|undefined>(undefined);
  const blankClick=useRef(false);
  const [dragPreview,setDragPreview]=useState<{w:WeightDraft;valid:boolean}>();
  const history=useRef(new LayoutHistory());
  const fixed=ship.manifest.resources.find(r=>r.kind==='loading.weights')?.config?.fixedWeightIds;
  const editable=useMemo(()=>weights.filter(w=>isCargo(ship,w)&&(!Array.isArray(fixed)||!fixed.includes(w.id))),[weights,ship,fixed]);
  const selectionSet=useMemo(()=>new Set(selection),[selection]);
  const editableIds=useMemo(()=>new Set(editable.map(w=>w.id)),[editable]);
  const selectedItems=useMemo(()=>editable.filter(w=>selectionSet.has(w.id)&&w.footprint),[editable,selectionSet]);
  const item=editable.find(w=>w.id===selected);
  const surfaces=useMemo(()=>cargoSurfaces(ship,tweenDeck),[ship,tweenDeck]);
  const holdId=area?.id?.match(/^hold-(\d+)/)?.[1];
  const spatialAreas=useMemo(()=>holdId?surfaces.filter(s=>s.id?.startsWith(`hold-${holdId}`)):area?[area]:[],[holdId,surfaces,area]);
  const cargoWeights=useMemo(()=>weights.filter(w=>isCargo(ship,w)),[weights,ship]);
  const visibleWeights=useMemo(()=>area?.id?cargoWeights.filter(w=>cargoOnSurface(w,area)):cargoWeights,[area,cargoWeights]);
  const spatialWeights=useMemo(()=>cargoWeights.filter(w=>spatialAreas.some(a=>cargoOnSurface(w,a))||!area?.id),[cargoWeights,spatialAreas,area?.id]);
  const issues=useMemo(()=>area?layoutIssues(visibleWeights,area):[],[area,visibleWeights]);
  const issueIds=useMemo(()=>new Set(issues.flatMap(q=>q.other?[q.id,q.other]:[q.id])),[issues]);
  const stackWarnings=useMemo(()=>stackingWarnings(weights),[weights]);
  const itemOnSurface=!!area&&!!item&&(!area.id||cargoOnSurface(item,area));
  const supported=ship.manifest.units.length==='m'&&ship.manifest.units.mass==='t'&&ship.manifest.coordinateSystem.zPositive==='up';
  const historyScope=useMemo(()=>JSON.stringify([ship.manifest.id,tweenDeck,spatialAreas]),[ship.manifest.id,tweenDeck,spatialAreas]);
  const weightsSignature=useMemo(()=>JSON.stringify(weights),[weights]);
  const canUndoLayout=useMemo(()=>history.current.canUndo(weights,historyScope),[weights,historyScope]);
  const canRedoLayout=useMemo(()=>history.current.canRedo(weights,historyScope),[weights,historyScope]);
  function restoreLayout(redo=false){
    const next=history.current.step(latest.current,historyScope,redo);if(!next)return;
    drag.current=undefined;setDragPreview(undefined);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);
    latest.current=next;setWeights(next);setSelection(ids=>ids.filter(id=>next.some(w=>w.id===id)));
    setGapPreview(undefined);setSupportStatusReset(v=>v+1);
    setError(redo?'Layout action redone.':'Layout action undone.');
  }
  const batchSelected=selectedItems.filter(w=>w.footprint?.kind!=='dunnage');
  const matchingCargo=item?editable.filter(w=>sameCargoType(item,w)):[];
  function applyMarkings(value:CargoMarkings){try{
    const ids=new Set(batchSelected.map(w=>w.id));
    const next=latest.current.map(w=>{if(!ids.has(w.id)||!w.footprint)return w;const old=w.footprint.markings;const markings=parseCargoMarkings(batchSelected.length===1?value:{...value,scheme:old?.scheme??'internal',sscc:old?.sscc,container:old?.container});return {...w,footprint:{...w.footprint,markings}};});
    validateUniqueIdentifiers(next);save(next);return t('Identification and appearance updated.');
  }catch(e){return t((e as Error).message);}}
  function applyBatch(patch:Parameters<typeof editCargoBatch>[2],matching:boolean){
    try{
      const ids=(matching?matchingCargo:batchSelected).map(w=>w.id);
      const edited=editCargoBatch(cargoWeights,ids,patch,surfaces.length?surfaces:area?[area]:[]);
      save(latest.current.map(w=>edited.find(v=>v.id===w.id)??w));setError('Cargo properties updated. Undo restores the previous values.');return 'Cargo properties updated. Undo restores the previous values.';
    }catch(e){const message=(e as Error).message;setError(message);return message;}
  }
  const save=(next:WeightDraft[],record=true)=>{if(next.length>40000)throw new Error('This plan exceeds the 40,000-item limit, including support members.');checkStackingChange(latest.current,next,teachingOverride);if(record)history.current.record(latest.current,next,historyScope);latest.current=next;setWeights(next);};
  const update=(id:string,patch:Partial<WeightDraft>,record=true)=>{try{save(latest.current.map(w=>w.id===id?{...w,...patch}:w),record);}catch(e){setError((e as Error).message);}};
  const point=(clientX:number,clientY:number)=>{const matrix=svg.current?.getScreenCTM();return matrix?new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse()):undefined;};
  function move(id:string,x:number,y:number,record=true){const w=latest.current.find(w=>w.id===id);if(w?.footprint)commit3D(id,{x,y,z:cargoBottom(w)},record);}
  const selectWindow=(ids:string[],add:boolean)=>{if(palette!=='dunnage')setPalette('selection');const valid=ids.filter(id=>editableIds.has(id));setSelection(previous=>add?[...new Set([...previous,...valid])]:valid);};
  const windowSelection=useWindowSelection(!pending&&!pasteDraft&&!placingCargo,selectWindow,()=>{const matrix=svg.current?.getScreenCTM();if(!matrix)return [];return visibleWeights.flatMap(w=>{const b=cargoBounds(w);if(!b||!editableIds.has(w.id))return [];const a=new DOMPoint(b.xMin,b.yMin).matrixTransform(matrix),c=new DOMPoint(b.xMax,b.yMax).matrixTransform(matrix);return [{id:w.id,left:Math.min(a.x,c.x),right:Math.max(a.x,c.x),top:Math.min(a.y,c.y),bottom:Math.max(a.y,c.y)}];});});
  function captureTemplate(massOverride?:CargoTemplate['mass']):CargoTemplate{return parseCargoTemplate({id:crypto.randomUUID(),name,...templateDetails,footprint:dimensions(),mass:massOverride??{mode:'gross',value:Number(mass),tare:0}});}
  function applyTemplate(value:CargoTemplate){setCapacityTarget(undefined);const p=value.footprint;setTemplateDetails({family:value.family,quantity:value.quantity,contact:value.contact,source:value.source,cgAboveBase:value.cgAboveBase});setName(value.name);setLength(String(p.length));setWidth(String(p.width));setHeight(String(p.height));setMass(String(grossTemplateMass(value.mass)));setCargoRotation(p.rotation);setCargoStackability(p.stackability??'unknown');setTopLoad(p.maxTopLoadTonnes===undefined?'':String(p.maxTopLoadTonnes));setDunnageProfile(p.dunnageProfile??'unspecified');setNewMarkings(p.markings);setPlacingCargo(false);setCursor(undefined);}
  function dimensions(){if(!Number.isInteger(templateDetails.quantity)||templateDetails.quantity<1||templateDetails.quantity>40000)throw new Error('Enter a planned quantity from 1 to 40,000.');if(topLoad.trim()&&!templateDetails.source.trim())throw new Error('Give the source and applicability of the top-load limit.');if(!area)throw new Error('Define a planning area first.');if(templateDetails.cgAboveBase!==undefined&&(!Number.isFinite(templateDetails.cgAboveBase)||templateDetails.cgAboveBase<0||templateDetails.cgAboveBase>Number(height)))throw new Error('Cargo CG must lie within the unit height.');return parseFootprint({catalogue:{family:templateDetails.family,contact:templateDetails.contact,source:templateDetails.source,cgDeclared:templateDetails.cgAboveBase!==undefined},dunnageProfile,...(newMarkings?{markings:newMarkings}:{}),stackability:cargoStackability,...(topLoad.trim()?{maxTopLoadTonnes:Number(topLoad)}:{}),length:Number(length),width:Number(width),height:Number(height),rotation:cargoRotation,deckZ:area.deckZ,...(area.id?{areaId:area.id}:{})});}
  const cargoMassValid=mass.trim()!==''&&Number.isFinite(Number(mass))&&Number(mass)>0;
  const cargoDimensionsValid=[length,width,height].every(v=>v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=1000);
  function add(x:number,y:number){try{
    if(!ready)return;
    const footprint=dimensions();if(!mass.trim()||!Number.isFinite(Number(mass))||Number(mass)<=0)throw new Error('Enter a positive total cargo mass.');
    const w:WeightDraft={id:crypto.randomUUID(),name:name.trim()||'Rectangular cargo',category:'cargo',hold:area!.name,quantity:'1',massTonnes:mass,...placeCargo(area!,footprint,x,y,snapValue),vcg:String(area!.deckZ+(templateDetails.cgAboveBase??footprint.height/2)),freeSurfaceMomentTransverse:'0',footprint};
    const placed=placeWithCargoSnap([w],w.id,[area!],latest.current.filter(v=>isCargo(ship,v)),{x,y,z:area!.deckZ},false,snapValue,cargoSnapOptions)[0];validateUniqueIdentifiers([...latest.current,placed]);save([...latest.current,placed]);setNewMarkings(cloneMarkings(newMarkings));setSelected(w.id);setCursor(undefined);setMultiSelect(false);setError('');
  }catch(e){setError((e as Error).message);}}
  let newCargoPreview:WeightDraft|undefined;
  if(placingCargo&&cursor&&area&&cargoDimensionsValid){try{const footprint=dimensions();const w={id:'new-cargo-preview',name:'',lcg:String(cursor.x),tcg:String(cursor.y),vcg:String(area.deckZ+(templateDetails.cgAboveBase??footprint.height/2)),footprint} as WeightDraft;newCargoPreview=placeWithCargoSnap([w],w.id,[area],cargoWeights,{...cursor,z:area.deckZ},false,snapValue,cargoSnapOptions)[0];}catch{/* Red cursor preview indicates a rejected placement. */}}
  function previewGroup(id:string,p:{x:number;y:number;z:number}){const group=latest.current.filter(w=>w.footprint&&editableIds.has(w.id)&&(selection.includes(id)?selectionSet.has(w.id):w.id===id));return checkedPreview(placeWithCargoSnap(group,id,spatialAreas,cargoWeights,p,stacking,snapValue,cargoSnapOptions));}
  function checkedPreview(next:WeightDraft[]){checkStackingEdits(latest.current,next,teachingOverride);return next;}
  function preview3D(id:string,p:{x:number;y:number;z:number}){return previewGroup(id,p).find(w=>w.id===id)!;}
  function commit3D(id:string,p:{x:number;y:number;z:number},record=true){try{const moved=previewGroup(id,p);save(latest.current.map(w=>moved.find(v=>v.id===w.id)??w),record);setError('');}catch(e){setError((e as Error).message);}}
  function dunnagePattern(settings:DunnageSettings,position:{x:number;y:number},above=false){return createDunnagePattern({area:(above?spatialAreas.find(a=>a.id===item?.footprint?.areaId):undefined)??area!,areas:spatialAreas,weights:latest.current.filter(w=>isCargo(ship,w)),settings,position,support:above?item:undefined,id:()=>crypto.randomUUID()});}
  function buildFrame(settings:DunnageSettings){if(!area)return;try{const parts=buildLoadedSupportFrame(selectedItems,area,cargoWeights,settings,()=>crypto.randomUUID());save([...latest.current,...parts]);setSelection(parts.map(p=>p.id));setView('side');setZoom(1);setPalette('selection');setError(settings.frameCopyCargo?'Rack and upper cargo layer created.':'Support frame created. Review the platform capacity before loading.');}catch(e){setError((e as Error).message);}}
  const autoRevision=useMemo(()=>({weights,selection,surfaces,id:crypto.randomUUID()}),[weights,selection,surfaces]).id;
  const autoCache=useRef<{key:string;result:ReturnType<typeof autoDunnageBatch>}|undefined>(undefined);
  const dunnageRemovalIds=useMemo(()=>removableDunnageIds(weights,selection,editable.map(w=>w.id)),[weights,selection,editable]);
  function removeAutoDunnage(){try{
    const next=removeDunnage(latest.current,selection,editable.map(w=>w.id));
    const count=latest.current.length-next.length;
    if(!count)return t('No dunnage in this scope.');
    save(next);setGapPreview(undefined);setSelection(ids=>ids.filter(id=>next.some(w=>w.id===id)));
    return `${count} ${t('dunnage pieces removed. Use toolbar Undo to restore them.')}`;
  }catch(e){return t((e as Error).message);}}
  const currentAutoRevision=useRef(autoRevision);currentAutoRevision.current=autoRevision;
  async function runAutoDunnage(settings:DunnageSettings,maxGap:number,walls:boolean,action:'add'|'preview'|'refresh',signal:AbortSignal){
    try{
      if(!ready)return t('Wait for the loading condition to finish updating.');
      const key=JSON.stringify([autoRevision,settings,maxGap,walls]);
      if(autoCache.current?.key!==key){
        const result=await runDunnageJob({cargo:cargoWeights,selection,areas:surfaces,settings,maxGap,walls},signal);
        if(signal.aborted||currentAutoRevision.current!==autoRevision)throw new DOMException('Cancelled','AbortError');
        autoCache.current={key,result};
      }
      if(signal.aborted||currentAutoRevision.current!==autoRevision)throw new DOMException('Cancelled','AbortError');
      const result=autoCache.current.result;setAutoReview(result);
      if(!result.parts.length){
        setGapPreview(undefined);
        if(!result.targetCount)return t('No cargo in this scope. Add cargo or select cargo units first.');
        if(!result.eligibleCount)return t(result.diagnostics[0]?.reason??'No automatic dunnage added: this cargo has explicit ventilation or specialist handling requirements.');
        return result.reasons.length?`${t('No spacers added.')} ${t(result.reasons[0])} (${t('Maximum gap (m)')}: ${maxGap})`:`${t('No facing gaps found within the maximum gap.')} ${maxGap} m. ${t('Check Dunnage settings or the selected scope.')}`;
      }
      if(action==='add'){
        save([...latest.current,...result.parts]);setGapPreview(undefined);setAutoReview(undefined);
        return `${result.parts.length} ${t('spacers added. Undo is available.')} ${(result.massTonnes*1000).toFixed(1)} kg. ${result.excluded?`${result.excluded} ${t('units require manual review')}.`:''}`;
      }
      let previewScope=historyScope;
      if(action==='preview'){
        const first=surfaces.find(a=>a.id===result.parts[0].footprint?.areaId);
        if(first){setArea(first);const hold=first.id?.match(/^hold-(\d+)/)?.[1];const nextAreas=hold?surfaces.filter(s=>s.id?.startsWith(`hold-${hold}`)):[first];previewScope=JSON.stringify([ship.manifest.id,tweenDeck,nextAreas]);}
        setView('top');setPanMode(false);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);revealPanel('drawing');
      }
      setGapPreview({...result,before:JSON.stringify(latest.current),scope:previewScope});
      return `${result.parts.length} ${t('pieces ready')} · ${t('Added mass')}: ${(result.massTonnes*1000).toFixed(1)} kg · ${t('Less than solid filling by')}: ${(Math.max(0,result.solidMassTonnes-result.massTonnes)*1000).toFixed(1)} kg. ${t('Choose Apply spacers in the drawing or Add auto dunnage here.')}`;
    }catch(e){if((e as Error).name==='AbortError')throw e;setGapPreview(undefined);return t((e as Error).message);}
  }
  function previewGapBatch(settings:DunnageSettings,maxGap:number,walls=false,automatic=false,reveal=true){
    if(!area)return;
    try{
      const scope=selectedItems.length?selectedItems:visibleWeights.filter(w=>w.footprint?.kind!=='dunnage'&&editableIds.has(w.id));
      const eligible=automatic?scope.filter(permitsAutoDunnage):scope;
      const parts:WeightDraft[]=[];let skipped=0;
      const candidates:{fit:ReturnType<typeof dunnageGap>;surface:CargoArea}[]=[];
      for(const [a,b] of cargoGapPairs(eligible,maxGap)){const surface=surfaces.find(s=>s.id===a.footprint?.areaId)??area;candidates.push({fit:dunnageGap(a,b),surface});}
      if(walls)for(const w of eligible){const surface=surfaces.find(s=>s.id===w.footprint?.areaId)??area;for(const fit of boundaryDunnageFits(w,surface,maxGap))candidates.push({fit,surface});}
      for(const {fit:fitted,surface} of candidates){
        try{
          const mass=dunnageMassTonnes(fitted.length,fitted.width,settings.thickness,settings.densityKgM3);
          const base=createDunnage({id:crypto.randomUUID(),area:surface,areas:surfaces,weights:[],length:fitted.length,width:fitted.width,thickness:settings.thickness,mass,material:settings.material,densityKgM3:settings.densityKgM3,massMode:'calculated',properties:settings.properties,position:fitted});
          const next=placeSupportedCargo(base,[surface],[...cargoWeights,...parts],fitted,true,false);
          if(Math.abs(cargoBottom(next)-fitted.z)>1e-8||Math.abs(Number(next.lcg)-fitted.x)>1e-8||Math.abs(Number(next.tcg)-fitted.y)>1e-8)throw new Error('Unsupported gap');
          parts.push(next);
        }catch{skipped++;}
      }
      setGapPreview({parts,before:JSON.stringify(latest.current),scope:historyScope,skipped,excluded:scope.length-eligible.length});
      if(reveal){setView('top');setPanMode(false);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);revealPanel('drawing');}
    }catch(e){setError((e as Error).message);}
  }
  function addBetween(settings:DunnageSettings){try{if(selectedItems.length!==2||!area)throw new Error('Select two cargo units on the same surface and level.');const fitted=dunnageGap(selectedItems[0],selectedItems[1]);const surface=spatialAreas.find(a=>a.id===selectedItems[0].footprint?.areaId)??area;
   const mass=dunnageMassTonnes(fitted.length,fitted.width,settings.thickness,settings.densityKgM3);
   const base=createDunnage({id:crypto.randomUUID(),area:surface,areas:spatialAreas,weights:[],length:fitted.length,width:fitted.width,thickness:settings.thickness,mass,material:settings.material,densityKgM3:settings.densityKgM3,massMode:'calculated',properties:settings.properties,position:fitted});
   const next=placeSupportedCargo(base,[surface],cargoWeights,fitted,true,false);if(Math.abs(cargoBottom(next)-fitted.z)>1e-8)throw new Error('Dunnage in this gap needs support at the selected level.');save([...latest.current,next]);setError('');
  }catch(e){setError((e as Error).message);}}
  function addDunnage(above:boolean,settings:DunnageSettings,position?:{x:number;y:number}){if(!area||!ready)return;try{const next=dunnagePattern(settings,position??{x:above?Number(item?.lcg):(area.xMin+area.xMax)/2,y:above?Number(item?.tcg):(area.yMin+area.yMax)/2},above);save([...latest.current,...next]);setSelected(next[0].id);setPending(undefined);setPasteDraft(undefined);setCursor(undefined);setMultiSelect(false);if(above)setStacking(true);setError('');}catch(e){setError((e as Error).message);}}
  let previewValid=false;
  if(pending&&cursor&&area){try{checkedPreview(dunnagePattern(pending,cursor));previewValid=true;}catch{/* Red preview leaves the current condition untouched. */}}
  const selectItem=(id:string,additive=false)=>{if(!id){setSelection([]);return;}if(additive)setSelection(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]);else if(!selection.includes(id))setSelected(id);if(palette!=='dunnage')setPalette('selection');};
  function addLayer(){try{const next=stackLayer(selectedItems,spatialAreas,cargoWeights,()=>crypto.randomUUID());save([...latest.current,...next]);setSelection(next.map(w=>w.id));setStacking(true);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setView('side');setZoom(1);setError('New layer added. Select Add layer above again to continue.');}catch(e){setError((e as Error).message);}}
  function stackOn(duplicate=false){if(!item?.footprint)return;try{const support=duplicate?item:latest.current.find(w=>w.id===supportId);if(!support)throw new Error('Choose another cargo item as support.');const source=duplicate?{...structuredClone(item),id:crypto.randomUUID(),name:item.name+' (copy)'}:item;const next=stackCargoOn(source,support,spatialAreas,latest.current.filter(w=>isCargo(ship,w)));save(duplicate?[...latest.current,next]:latest.current.map(w=>w.id===item.id?next:w));setSelected(next.id);setStacking(true);setError('');}catch(e){setError((e as Error).message);}}
  function copy(){if(selectedItems.length){setClipboard(structuredClone(selectedItems));setError('Selection copied. Choose a loading surface and paste.');}}
  function paste(source=clipboard){if(!source?.length||!area||!ready)return;setPending(undefined);setPlacingCargo(false);setCursor(undefined);setMultiSelect(false);setPasteDraft(structuredClone(source));setView('top');setError('');revealPanel('drawing');}
  function pasteAt(position:{x:number;y:number},preview=false){if(!pasteDraft||!area)throw new Error('Select cargo with dimensions first.');let i=0;return checkedPreview(pasteCargoGroup(pasteDraft,area,cargoWeights,()=>preview?'paste-preview-'+i++:crypto.randomUUID(),false,0,position,{grid:snapValue,cargo:cargoSnapOptions}));}
  function commitPaste(position:{x:number;y:number}){try{const next=pasteAt(position);save([...latest.current,...next]);setSelection(next.map(w=>w.id));setPasteDraft(undefined);setCursor(undefined);setError('');}catch(e){setError((e as Error).message);}}
  let pasteValid=false,pastePreview:WeightDraft[]|undefined;if(pasteDraft&&cursor){try{pastePreview=pasteAt(cursor,true);pasteValid=true;}catch{/* Invalid preview stays under the pointer. */}}

  function deleteSelection(){if(pending||pasteDraft||placingCargo)return;try{const next=deleteCargoSelection(latest.current,selection,editable.map(w=>w.id));if(next.length===latest.current.length)return;save(next);setSelection([]);setError('Selected cargo deleted. Use Undo to restore it.');}catch(e){setError((e as Error).message);}}
  function rotateActive(){
    if(pending)return;
    if(pasteDraft){setPasteDraft(rotateCargoPreview(pasteDraft));setError('');}
    else if(placingCargo){setCargoRotation(v=>v===0?90:0);setError('');}
    else if(selectedItems.length)rotateSelection();
  }
  function rotateSelection(){if(pending||pasteDraft||placingCargo)return;try{const next=checkedPreview(rotateCargoGroup(selectedItems,spatialAreas,cargoWeights));save(latest.current.map(w=>next.find(v=>v.id===w.id)??w));setError('');}catch(e){setError((e as Error).message);}}
  function switchView(next:'3d'|'top'|'side'|'end'){setView(next);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);setZoom(1);setFocus(undefined);planPan.reset();setPanReset(v=>v+1);}
  function changeZoom(value:number){setZoom(Math.max(1,Math.min(15,value)));if(area)setFocus({x:item?.lcg.trim()?Number(item.lcg):(area.xMin+area.xMax)/2,y:item?.tcg.trim()?Number(item.tcg):(area.yMin+area.yMax)/2});}
  function applyGap(){try{if(!gap.trim())throw new Error('Enter a non-negative gap.');const reference=latest.current.filter(w=>spacingReference.includes(w.id));if(reference.length!==spacingReference.length)throw new Error('Choose a separate reference and moving selection.');const target=spacingTarget(selectedItems,reference,Number(gap),gapDirection);const moved=placeCargoGroup(selectedItems,selectedItems[0].id,spatialAreas,cargoWeights,target,stacking,false);const first=moved.find(w=>w.id===selectedItems[0].id)!;if(Math.abs(Number(first.lcg)-target.x)>1e-8||Math.abs(Number(first.tcg)-target.y)>1e-8)throw new Error('The requested gap does not fit in this hold.');save(latest.current.map(w=>moved.find(v=>v.id===w.id)??w));setError('Spacing applied.');}catch(e){setError((e as Error).message);}}
  function finish(cancel=false){const d=drag.current;drag.current=undefined;setDragPreview(undefined);if(!cancel&&d?.valid&&d.target&&d.before===latest.current)commit3D(d.id,d.target);}
  useCargoDragCancellation(()=>finish(true),weights,`${view}:${panMode}`);
  const topActions=useRef<CargoTopActions>({pointer:()=>{},key:()=>{},click:()=>{}});
  topActions.current={
   click:(w,e)=>{if(e.detail===0&&!pasteDraft&&!pending&&!placingCargo)selectItem(w.id,e.shiftKey||e.ctrlKey||e.metaKey);},
   pointer:(w,e)=>{if(!e.isPrimary){finish(true);return;}if(pasteDraft||pending||placingCargo||e.button!==0)return;const p=point(e.clientX,e.clientY);if(!p)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});if(e.shiftKey||e.ctrlKey||e.metaKey||(multiSelect&&!selectionSet.has(w.id))){selectItem(w.id,true);return;}selectItem(w.id);drag.current={id:w.id,dx:p.x-Number(w.lcg),dy:p.y-Number(w.tcg),before:latest.current};svg.current?.setPointerCapture(e.pointerId);},
   key:(w,e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectItem(w.id,e.shiftKey||e.ctrlKey||e.metaKey);return;}if(e.ctrlKey||e.metaKey||e.altKey)return;const step=(snap?snapStep:.1)*(e.shiftKey?10:1);const delta=({'ArrowLeft':[-1,0],'ArrowRight':[1,0],'ArrowUp':[0,-1],'ArrowDown':[0,1]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();move(w.id,Number(w.lcg)+delta[0]*step,Number(w.tcg)+delta[1]*step);}}
  };
  return <section className="panel cargo-planner" onKeyDown={e=>{if(e.key==='Escape'){finish(true);setGapPreview(undefined);if(!pending&&!pasteDraft&&!placingCargo&&!((e.target as HTMLElement).closest('input,select,textarea,[contenteditable="true"]')))setSelection([]);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);}if(e.nativeEvent.isComposing||(e.target as HTMLElement).closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))return;if(!e.ctrlKey&&!e.metaKey&&!e.altKey){if((e.key==='Delete'||e.key==='Backspace')&&selection.length){e.preventDefault();if(!e.repeat)deleteSelection();}if(['1','2','3','4'].includes(e.key)){e.preventDefault();switchView((['3d','top','side','end'] as const)[Number(e.key)-1]);}if(view!=='3d'&&['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){setZoom(1);setFocus(undefined);planPan.reset();setPanReset(v=>v+1);}else changeZoom(zoom*(e.key==='-'?1/1.12:1.12));}if(e.key.toLowerCase()==='r'&&!pending&&(selectedItems.length||placingCargo||pasteDraft)){e.preventDefault();if(!e.repeat)rotateActive();}if(e.key.toLowerCase()==='s'){e.preventDefault();setSnap(v=>!v);}}if((e.ctrlKey||e.metaKey)&&!e.altKey){
const key=e.key.toLowerCase();
if(key==='z'||key==='y'){e.preventDefault();if(!e.repeat)restoreLayout(key==='y'||e.shiftKey);return;}
if(key==='a'){e.preventDefault();if(!e.repeat){startSelecting();setSelection(visibleWeights.filter(w=>editableIds.has(w.id)&&w.footprint).map(w=>w.id));}return;}
if(key==='d'&&selectedItems.length){e.preventDefault();if(!e.repeat)paste(selectedItems);return;}
if(e.repeat)return;
if(e.key.toLowerCase()==='c'&&selectedItems.length){e.preventDefault();copy();}if(e.key.toLowerCase()==='v'&&clipboard){e.preventDefault();paste();}}}}>{contextMenu&&<div className="cargo-context-menu" ref={menuRef} role="dialog" aria-label={t('Selection actions')} style={{left:contextMenu.x,top:contextMenu.y}} onKeyDown={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}>{([
 ['Properties',()=>openTool('selection'),selectedItems.length>0],
 ['Select matching cargo',()=>setSelection(matchingCargo.map(w=>w.id)),matchingCargo.length>0],
 ['Copy selection',copy,selectedItems.length>0],
 ['Duplicate cargo',()=>paste(selectedItems),selectedItems.length>0],
 ['Rotate 90°',rotateSelection,selectedItems.length>0],
 ['Delete selected',deleteSelection,selectedItems.length>0],
 ['Close',()=>{},true],
 ] as const).map(([label,action,enabled])=><button key={label} disabled={!enabled} onClick={()=>{setContextMenu(undefined);drawings.current?.focus({preventScroll:true});action();}}>{t(label)}</button>)}</div>}{ready&&!cargoWeights.length&&<div className="cargo-empty-state"><p>{t('Start your cargo plan by choosing a loading area and adding the first unit.')}</p><button onClick={()=>openTool('cargo')}>{t('Add first cargo unit')}</button></div>}<div className="workspace-commandbar" role="toolbar" aria-label={t('Cargo tools')}><button aria-pressed={objectsOpen} onClick={()=>setObjectsOpen(v=>!v)}>{t('Loading areas')}</button><button aria-pressed={!panMode&&palette==='selection'&&!pending&&!pasteDraft&&!placingCargo} onClick={startSelecting}>{t('Select')}</button><button aria-pressed={panMode} onClick={()=>{setPanMode(v=>!v);setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);}}>{t('Pan view')}</button><button aria-pressed={palette==='cargo'&&toolsOpen} onClick={()=>openTool('cargo')}>{t('Add cargo')}</button><button aria-pressed={palette==='dunnage'&&toolsOpen} onClick={()=>openTool('dunnage')}>{t('Add support')}</button>    <details className="planner-secondary"><summary>{t('Edit')} · {selectedItems.length} {t('items selected')}</summary><div className="scene-toolbar"><label><input type="checkbox" checked={multiSelect} onChange={e=>setMultiSelect(e.target.checked)}/>{t('Multi-select')}</label><button onClick={()=>setSelection(visibleWeights.filter(w=>editableIds.has(w.id)&&w.footprint).map(w=>w.id))}>{t('Select all on surface')}</button><button disabled={!selection.length} onClick={()=>setSelection([])}>{t('Clear selection')}</button><button disabled={!selectedItems.length||!!pending||!!pasteDraft||placingCargo} onClick={rotateSelection} title={t('Turn selection in plan; height stays unchanged.')}>↻ {t('Rotate 90°')}</button><button disabled={!selectedItems.length} onClick={copy}>{t('Copy selection')}</button><button disabled={!clipboard||!area||!ready} onClick={()=>paste()}>{t('Paste selection')}</button><button disabled={!selection.length||!!pending||!!pasteDraft||placingCargo} onClick={deleteSelection}>{t('Delete selected')}</button></div><p className="planner-note">{t('Delete or Backspace removes selected cargo. Undo restores its geometry and mass.')}</p></details>      <button disabled={!canUndoLayout} title="Ctrl/Cmd+Z" onClick={()=>restoreLayout()}>{t('Undo layout action')}</button><button disabled={!canRedoLayout} title="Ctrl/Cmd+Shift+Z · Ctrl+Y" onClick={()=>restoreLayout(true)}>{t('Redo layout action')}</button><button className="inspector-toggle" aria-expanded={toolsOpen} onClick={()=>{if(toolsOpen&&palette==='selection')setToolsOpen(false);else openTool('selection');}}>{t('Properties')}</button></div>


    
    {!supported?<p>{t('The planner requires metres, tonnes and a positive-up vertical axis.')}</p>:<>
    

    {teachingOverride&&<p role="status" className="warnings">{t('Teaching override active — stacking restrictions are not enforced.')}</p>}
    {stackWarnings.length>0&&<ul className="warnings" aria-label={t('Stacking warnings')}>{stackWarnings.map(w=><li key={w.id}>{weights.find(v=>v.id===w.id)?.name}: {t(w.reason)} ({Number.isFinite(w.load)?w.load.toFixed(3):'—'} t)</li>)}</ul>}



<p role="status" className="planner-status">{pending||placingCargo?t('Click the top view to place items. Escape cancels.')+' '+t(error):t(error)}</p>{pending&&<button onClick={()=>{setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);}}>{t('Finish placing')}</button>}
    <div className={'cargo-workspace'+(objectsOpen?' has-objects':'')}>{objectsOpen&&<CargoObjectList surfaces={surfaces} weights={cargoWeights} area={area} selection={selectionSet} search={cargoSearch} setSearch={setCargoSearch} onSelect={(surface,id,add)=>{setArea(surface);selectItem(id,add);openTool('selection');}}/>}<details ref={toolsPanel} tabIndex={-1} aria-label={t(palette==='cargo'?'Add cargo':palette==='dunnage'?'Add support':'Cargo properties')} className="cargo-tools" open={toolsOpen} onToggle={e=>setToolsOpen(e.currentTarget.open)}><summary><span>{t(palette==='cargo'?'Add cargo':palette==='dunnage'?'Add support':'Properties')}</span><span className="tools-toggle-label">{t(toolsOpen?'Hide tools':'Show tools')}</span></summary><button className="return-to-drawing" onClick={()=>revealPanel('drawing')}>{t('Back to drawing')}</button><details className="inspector-setup"><summary>{t('Hold and deck settings')}</summary>    {surfaces.length>0&&<div className="cargo-context">{deckDefinition(ship)&&<label>{t('Tween-deck configuration')}<select aria-label={t('Tween-deck configuration')} value={tweenDeck} onChange={e=>onDeckChange?.(e.target.value as 'installed'|'stored'|'ashore')}><option value="installed">{t('Installed')}</option><option value="stored">{t(deckDefinition(ship)?.storedLabel??'Stored onboard')}</option>{tweenDeck==='ashore'&&<option value="ashore">{t('Legacy: removed ashore')}</option>}</select></label>}
    {tweenDeck!=='installed'&&cargoWeights.some(w=>w.footprint&&!w.footprint.areaId?.startsWith('hatch-')&&w.footprint.deckZ>7)&&<p role="alert">{t('Cargo remains on a removed tween deck. Move or remove those cargo items.')}</p>}<label>{t('Loading surface')} <select aria-label={t('Loading surface')} value={surfaces.some(s=>s.id===area?.id)?area?.id:''} onChange={e=>{const a=surfaces.find(s=>s.id===e.target.value);if(a){setArea(a);setSelected('');setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setCursor(undefined);setZoom(1);setFocus(undefined);planPan.reset();setPanReset(v=>v+1);}}}><option value="">{t('Choose a documented surface')}</option>{surfaces.map(a=><option key={a.id} value={a.id}>{a.name} · {a.deckZ} m</option>)}</select></label></div>}
    <details className="planner-secondary"><summary>{t('Stacking rules')}</summary><div className="scene-toolbar"><label><input type="checkbox" checked={stacking} onChange={e=>setStacking(e.target.checked)}/>{t('Allow stacking — geometry only')}</label></div>{stacking&&<p className="planner-note">{t('Multiple bearers use a geometric contact check only; bending strength and bearing loads are not calculated.')}</p>}<p>{t('Unknown stackability requires review. Non-stackable cargo needs a structure that carries the load independently. Dunnage alone does not bypass these checks.')}</p><label><input type="checkbox" checked={teachingOverride} onChange={e=>setTeachingOverride(e.target.checked)}/>{t('Teaching override — allow unresolved stacking')}</label><p>{t('Top-load checks conservatively count the full connected load, including dunnage. Structural reactions and rack capacity are not calculated.')}</p></details>    {area?.id?.startsWith('hatch-')&&<p className="planner-note">{t('Hatch cargo: covers assumed closed. Elevation 12.53 m is provisional, based on documented hatch openings. Cover load limits and securing are not verified. The 10 m view height is a planning envelope, not an approved cargo height.')} {t('Dashed panel seams are approximate. Gaps require explicit supports; panel reactions are not calculated.')}</p>}</details>{palette==='cargo'&&<><CargoTemplateLibrary details={templateDetails} onDetails={setTemplateDetails} onFamily={family=>{setTemplateDetails({family,quantity:templateDetails.quantity,contact:'',source:''});const preset=cargoFamilies.find(f=>f[0]===family)!;setName(preset[1]);setDunnageProfile(preset[2]);setCargoStackability(family==='perishable'?'unstackable':'unknown');setTopLoad('');}} capture={captureTemplate} onUse={applyTemplate} selection={selectedItems} onAssembly={items=>paste(items)}/>{capacityTarget===undefined&&<p className="planner-note">{t('Planned quantity (units)')}: {templateDetails.quantity}</p>}{capacityTarget!==undefined&&<p className="planner-note">{t('Capacity planning target (units)')}: {capacityTarget}. {t('Place each unit; this target does not add weight automatically.')}</p>}<label>{t('Dunnage profile')}<select value={dunnageProfile} onChange={e=>setDunnageProfile(e.target.value as DunnageProfile)}>{dunnageProfiles.map(p=><option key={p} value={p}>{t(profileLabels[p])}</option>)}</select></label><CargoIdentificationEditor value={newMarkings} count={1} onApply={value=>{setNewMarkings(value);return t('Identification and appearance will be applied to the next cargo unit.');}}/>
    <AreaEditor key={JSON.stringify(area)} area={area} onChange={setArea}/>
    <div className="curve-inputs">{[['Cargo name',name,setName],['Length (m)',length,setLength],['Width (m)',width,setWidth],['Height (m)',height,setHeight],['Gross unit mass (t)',mass,setMass]].map(([label,value,setter])=><label key={label as string}>{t(label as string)}<input type={label==='Cargo name'?'text':'number'} step="any" value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)}/></label>)}</div>
    <div className="scene-toolbar"><button onClick={()=>setCargoRotation(v=>v===0?90:0)} title={t('Rotate 90° (R) — horizontal rotation')}>↻ {t('Rotate 90°')}</button><span>{cargoRotation}° · {t('Horizontal orientation')}</span></div><StackabilityFields value={cargoStackability} limit={topLoad} onChange={(v,l)=>{setCargoStackability(v);setTopLoad(l);}}/>
    <div className="scene-toolbar"><button draggable={ready&&!!area&&cargoMassValid&&cargoDimensionsValid} onDragStart={e=>{if(!cargoMassValid||!cargoDimensionsValid){e.preventDefault();return;}setView('top');setPending(undefined);setPasteDraft(undefined);setPlacingCargo(false);setError('');e.dataTransfer.setData('application/x-umc-cargo','rectangle');}} disabled={!ready||!area||!cargoMassValid||!cargoDimensionsValid} onClick={()=>{setPlacingCargo(true);setMultiSelect(false);setPending(undefined);setPasteDraft(undefined);setView('top');setCursor(undefined);setError('');revealPanel('drawing');}}>{t(placingCargo?'Placement active':'Place cargo')}</button><p className="planner-note" role="status">{t(!cargoMassValid?'Enter the cargo mass in tonnes to enable placement.':!cargoDimensionsValid?'Enter positive cargo dimensions.':'Click Place cargo once, then click each free position. Finish placing or press Escape before dragging cargo.')}</p>
</div>
    </>}
    {palette==='selection'&&batchSelected.length>0&&<label><input type="checkbox" checked={batchSelected.every(w=>w.footprint?.keepGapsClear)} onChange={e=>{const ids=new Set(batchSelected.map(w=>w.id));save(latest.current.map(w=>ids.has(w.id)?{...w,footprint:{...w.footprint!,keepGapsClear:e.target.checked}}:w));}}/>{t('Preserve gaps during auto dunnage (ventilation / access)')}</label>}{palette==='selection'&&batchSelected.length>0&&<label>{t('Dunnage profile')}<select value={new Set(batchSelected.map(w=>w.footprint?.dunnageProfile??'unspecified')).size===1?batchSelected[0].footprint?.dunnageProfile??'unspecified':''} onChange={e=>{const profile=e.target.value as DunnageProfile;const ids=new Set(batchSelected.map(w=>w.id));save(latest.current.map(w=>ids.has(w.id)?{...w,footprint:{...w.footprint!,dunnageProfile:profile}}:w));}}><option value="" disabled>{t('Mixed profiles')}</option>{dunnageProfiles.map(p=><option key={p} value={p}>{t(profileLabels[p])}</option>)}</select></label>}{palette==='selection'&&batchSelected.length>0&&<CargoIdentificationEditor key={'markings-'+selection.join(',')} value={batchSelected.at(-1)?.footprint?.markings} count={batchSelected.length} onApply={applyMarkings}/>}{palette==='selection'&&batchSelected.length>0&&<CargoBatchProperties key={selection.join(',')} selectedCount={batchSelected.length} matchingCount={matchingCargo.length} onApply={applyBatch}/>}{palette==='selection'&&<p className="planner-note">{t('Selection edits existing cargo: dimensions, position, stacking and spacing. Select an item in the drawing or choose one below.')}</p>}{palette==='selection'&&editable.length>100&&<label>{t('Find cargo')}<input type="search" value={cargoSearch} onChange={e=>setCargoSearch(e.target.value)}/><small>{t('Showing up to 100 matching items. Search by name or unit ID to narrow the list.')}</small></label>}{palette==='selection'&&<label>{t('Selected loading item')} <select value={item?.id??''} onChange={e=>setSelected(e.target.value)}><option value="">{t('Choose an item')}</option>{[...(item?[item]:[]),...editable.filter(w=>w.id!==item?.id&&`${w.name} ${w.id}`.toLowerCase().includes(cargoSearch.toLowerCase())).slice(0,item?99:100)].map(w=><option key={w.id} value={w.id}>{w.name} · #{w.id.slice(0,8)}{w.footprint?'':' · '+t('No footprint')}</option>)}</select></label>}
    {palette==='dunnage'&&<CargoTemplateLibrary assembliesOnly details={templateDetails} onDetails={setTemplateDetails} onFamily={()=>{}} capture={captureTemplate} onUse={value=>{applyTemplate(value);openTool('cargo');}} selection={selectedItems} onAssembly={items=>paste(items)}/>}
    <div hidden={palette!=='dunnage'}>
      <label>{t('What do you want to add?')}<select value={supportTask} onChange={e=>{setSupportTask(e.target.value as typeof supportTask);setGapPreview(undefined);setPending(undefined);setCursor(undefined);}}><option value="auto">{t('Fill gaps automatically')}</option><option value="pieces">{t('Place individual pieces')}</option><option value="stack">{t('Support stacked cargo')}</option></select></label>
      <p className="planner-note">{t('Geometry and mass only · securing capacity not assessed')}</p>
      {palette==='dunnage'&&toolsOpen&&supportTask==='auto'&&<><AutoDunnageControls statusReset={supportStatusReset} revision={autoRevision} selectedCount={selection.length} canRemove={dunnageRemovalIds.length>0} onRemove={removeAutoDunnage} onAction={runAutoDunnage} onInvalidate={()=>{setGapPreview(undefined);setAutoReview(undefined);}}/>{autoReview&&<DunnageReview result={autoReview} weights={weights}/>}
      <details><summary>{t('Fit a spacer to selected cargo manually')}</summary><DunnageControls task="gaps" onBoundary={selectedItems.length?(s,g)=>previewGapBatch(s,g,true,false):undefined} onBatch={selectedItems.length>=2?previewGapBatch:undefined} onBetween={selectedItems.length===2?addBetween:undefined} item={item} ready={ready&&!!area} onAdd={addDunnage} onPlace={()=>{}}/></details></>}
      <div hidden={supportTask==='auto'}><DunnageControls items={selectedItems} area={area} task={supportTask==='stack'?'stack':'pieces'} onFrame={selectedItems.length?buildFrame:undefined} item={item} ready={ready&&!!area} onAdd={addDunnage} onPlace={settings=>{setPending(settings);setPlacingCargo(false);setCursor(undefined);setView('top');setError('');revealPanel('drawing');}}/></div>
    </div>
    {palette==='selection'&&<details className="cargo-stack-controls"><summary>{t('Spacing')}</summary><p>{t('Select a unit or group as reference, then select the cargo to move.')}</p><button disabled={!selectedItems.length} onClick={()=>setSpacingReference(selectedItems.map(w=>w.id))}>{t('Use selection as reference')}</button><p>{spacingReference.length} {t('reference items')}</p><label>{t('Gap (m)')}<input type="number" min="0" step="0.05" value={gap} onChange={e=>setGap(e.target.value)}/></label><label>{t('Place selection')}<select value={gapDirection} onChange={e=>setGapDirection(e.target.value as typeof gapDirection)}>{(['forward','aft','starboard','port'] as const).map(v=><option key={v} value={v}>{t({forward:'Forward of reference',aft:'Aft of reference',starboard:'Starboard of reference',port:'Port of reference'}[v])}</option>)}</select></label><button disabled={!selectedItems.length||!spacingReference.length||selection.some(id=>spacingReference.includes(id))} onClick={applyGap}>{t('Apply gap')}</button><p>{t('Face-to-face gap between group envelopes. Other coordinates stay unchanged. Ventilation requirements depend on the cargo.')}</p></details>}
    {palette==='selection'&&selection.length===1&&item&&<>{item.footprint&&(item.footprint.kind!=='dunnage'||item.footprint.stackability)&&<StackabilityFields key={'stackability-'+item.id+JSON.stringify(item.footprint)} value={item.footprint.stackability??'unknown'} limit={item.footprint.maxTopLoadTonnes===undefined?'':String(item.footprint.maxTopLoadTonnes)} onChange={(v,l)=>{const footprint=parseFootprint({...item.footprint,stackability:v,maxTopLoadTonnes:l.trim()?Number(l):undefined});const next=latest.current.map(w=>w.id===item.id?{...w,footprint}:w);history.current.record(latest.current,next,historyScope);latest.current=next;setWeights(next);}}/>}{area?.panels&&<p>{t('Supporting hatch panels')}: {supportingHatchPanels(item,cargoWeights,area).join(', ')||t('No panel contact found')}. {t('Contact identification only; reactions and allowable loads are not calculated.')}</p>}{item.footprint&&<CargoDimensions key={'dimensions-'+item.id+JSON.stringify(item.footprint)} footprint={item.footprint} onApply={dims=>{if(!area)return;try{const footprint=parseFootprint({...item.footprint,...dims});let changed={...item,footprint};if(footprint.kind==='dunnage'){changed={...changed,vcg:String(cargoBottom(item)+dims.height/2)};if(footprint.dunnage?.massMode==='calculated')changed.massTonnes=String(dunnageMassTonnes(dims.length,dims.width,dims.height,footprint.dunnage.densityKgM3));}update(item.id,placeSupportedCargo(changed,spatialAreas,latest.current.filter(v=>isCargo(ship,v)),{x:Number(item.lcg),y:Number(item.tcg),z:cargoBottom(item)},true,false));setError('');}catch(e){setError((e as Error).message);}}}/>}{item.footprint&&<details className="cargo-stack-controls"><summary>{t('Stack cargo')}</summary><button onClick={addLayer}>{t('Build next layer')}</button><label>{t('Supporting cargo')}<select value={supportId} onChange={e=>setSupportId(e.target.value)}><option value="">{t('Choose supporting cargo')}</option>{spatialWeights.filter(w=>w.id!==item.id&&w.footprint&&(!cargoSearch||`${w.name} ${w.id}`.toLowerCase().includes(cargoSearch.toLowerCase()))).slice(0,100).map(w=><option key={w.id} value={w.id}>{w.name} · {(cargoBottom(w)+w.footprint!.height).toFixed(2)} m</option>)}</select></label><button disabled={!supportId} onClick={()=>stackOn()}>{t('Place selected item on support')}</button><p>{t('Select the top item and repeat Add identical item above to build the next layer. Each copy adds its own mass. Height, support and collision checks still apply.')}</p></details>}<div className="scene-toolbar">
      <button disabled={!item.footprint||!itemOnSurface} onClick={()=>paste([item])}>{t('Duplicate cargo')}</button>
      <button onClick={deleteSelection}>{t('Delete selected')}</button></div>
      <div className="curve-inputs">{item.footprint&&<NumberInput label={t('Cargo bottom elevation (m)')} value={cargoBottom(item)} onChange={z=>z!==undefined&&commit3D(item.id,{x:Number(item.lcg),y:Number(item.tcg),z})}/>}<NumberInput label={t('LCG (m)')} coordinate="x" value={item.lcg.trim()?Number(item.lcg):undefined} onChange={v=>v!==undefined&&move(item.id,v,Number(item.tcg))}/><NumberInput label={t('TCG (m)')} coordinate="y" value={item.tcg.trim()?Number(item.tcg):undefined} onChange={v=>v!==undefined&&move(item.id,Number(item.lcg),v)}/><NumberInput label={t('VCG / KG (m)')} coordinate="z" value={item.vcg.trim()?Number(item.vcg):undefined} onChange={v=>update(item.id,{vcg:v===undefined?'':String(v)})}/></div>
      {item.footprint&&<p>{item.footprint.length} × {item.footprint.width} × {item.footprint.height} m · {item.footprint.rotation}°</p>}
    </>}
    </details><div className="cargo-drawings" onContextMenu={e=>{const target=(e.target as Element).closest('[data-cargo-id]');if(target){e.preventDefault();showContext(target.getAttribute('data-cargo-id')??undefined,e.clientX,e.clientY);}}} ref={drawings} tabIndex={-1} aria-label={t('Cargo drawing')}><div className="planner-viewbar" aria-label={t('Planner views')}><select aria-label={t('Loading surface')} value={area?.id??''} onChange={e=>{const next=surfaces.find(a=>a.id===e.target.value);if(next){setArea(next);setSelection([]);switchView(view);}}}>{surfaces.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>{(['3d','top','side','end'] as const).map(v=><button key={v} aria-pressed={view===v} onClick={()=>switchView(v)}>{t({ '3d':'3D view',top:'Top view',side:'Side view',end:'End view'}[v])}</button>)}</div><div className="planner-interaction-bar">
      <p className="planner-interaction-message" role="status">{gapPreview?`${gapPreview.parts.length} ${t('spacers ready')} · ${gapPreview.skipped} ${t('gaps skipped')} · ${gapPreview.excluded??0} ${t('units require manual review')}`:pasteDraft?t('Click to place the copied selection. Escape cancels.'):placingCargo?t('Placement active — click free positions to add more units.'):pending?t('Click the top view to place items. Escape cancels.'):selectedItems.length?`${selectedItems.length} ${t('items selected')}`:t('Select cargo in the drawing. To create new units, choose Add cargo.')}</p>
      <div className="planner-interaction-actions">{gapPreview&&<><button disabled={!gapPreview.parts.length||gapPreview.before!==weightsSignature||gapPreview.scope!==historyScope} onClick={()=>{try{if(gapPreview.before!==JSON.stringify(latest.current)||gapPreview.scope!==historyScope)return;save([...latest.current,...gapPreview.parts]);setGapPreview(undefined);setAutoReview(undefined);}catch(e){setError((e as Error).message);}}}>{t('Apply spacers')}</button><button onClick={()=>setGapPreview(undefined)}>{t('Cancel preview')}</button></>}{selectedItems.length>0&&!pending&&!pasteDraft&&!placingCargo&&<button onClick={e=>{const r=e.currentTarget.getBoundingClientRect();showContext(undefined,r.left,r.bottom);}}>{t('Selection actions')}</button>}
        {(pasteDraft||placingCargo||selectedItems.length>0&&!pending)&&<button onClick={rotateActive} aria-keyshortcuts="R" title={t('Rotate 90° (R) — horizontal rotation')}>↻ {t('Rotate 90°')}</button>}
        {pasteDraft&&<button onClick={()=>{setPasteDraft(undefined);setCursor(undefined);}}>{t('Cancel paste')}</button>}
        {(placingCargo||pending)&&<button onClick={()=>{setPlacingCargo(false);setPending(undefined);setCursor(undefined);}}>{t('Finish placing')}</button>}
        {selectedItems.length>0&&!placingCargo&&!pasteDraft&&!pending&&<><button onClick={()=>openTool('selection')}>{t('Properties')}</button><button onClick={()=>setSelection([])}>{t('Clear selection')}</button><button onClick={addLayer}>{t('Build next layer')}</button></>}
      </div>
    </div>{view==='3d'&&area&&<Suspense fallback={<p>{t('Loading 3D viewer…')}</p>}><Cargo3DEditor panMode={panMode} onContextMenu={showContext} onSelectWindow={selectWindow} areas={spatialAreas} weights={spatialWeights} selected={selected} selectedIds={selection} multiSelect={multiSelect} onSelect={selectItem} preview={preview3D} commit={commit3D}/></Suspense>}
    {area?<><p><strong>{area.name}</strong> · {t('Source axes')}: x → {t(ship.manifest.coordinateSystem.xPositive)}, y ↓ {t(ship.manifest.coordinateSystem.yPositive)}. {t('Deck elevation')}: {area.deckZ} m · {t('Available clear height')}: {area.clearHeight ?? '—'} m · {t('Grid: 1 m')}</p>
      {view==='top'&&<><h3>{t('Top view')}</h3><div {...planPan.handlers} style={{cursor:panMode?'grab':undefined}}><svg tabIndex={0} className="cargo-plan-canvas" ref={svg} viewBox={`${(focus?.x??(area.xMin+area.xMax)/2)+planPan.offset.x-(area.xMax-area.xMin+2)/zoom/2} ${(focus?.y??(area.yMin+area.yMax)/2)+planPan.offset.y-(area.yMax-area.yMin+2)/zoom/2} ${(area.xMax-area.xMin+2)/zoom} ${(area.yMax-area.yMin+2)/zoom}`} role="group" aria-label={t('Cargo placement canvas')}
        onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-umc-cargo'))e.preventDefault();}} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData('application/x-umc-cargo')!=='rectangle')return;const p=point(e.clientX,e.clientY);if(p)add(p.x,p.y);}}
        {...windowSelection.handlers} onPointerDownCapture={e=>{blankClick.current=!(e.target as Element).closest('[role="button"]');windowSelection.handlers.onPointerDownCapture(e);}} onClick={e=>{if(pasteDraft){const p=point(e.clientX,e.clientY);if(p)commitPaste(p);}else if(placingCargo){const p=point(e.clientX,e.clientY);if(p)add(p.x,p.y);}else if(pending){const p=point(e.clientX,e.clientY);if(p)addDunnage(false,pending,{x:snap?Math.round(p.x/snapStep)*snapStep:p.x,y:snap?Math.round(p.y/snapStep)*snapStep:p.y});}else if(blankClick.current)setSelection([]);}}
        onPointerMove={e=>{const d=drag.current,p=point(e.clientX,e.clientY);if(pasteDraft&&p)setCursor({x:p.x,y:p.y});else if(placingCargo&&p)setCursor({x:p.x,y:p.y});else if(pending&&p)setCursor({x:snap?Math.round(p.x/snapStep)*snapStep:p.x,y:snap?Math.round(p.y/snapStep)*snapStep:p.y});if(d&&p){if(d.before!==latest.current){finish(true);return;}const w=d.before.find(w=>w.id===d.id)!;const target={x:p.x-d.dx,y:p.y-d.dy,z:cargoBottom(w)};d.target=target;try{const next=preview3D(d.id,target);d.valid=true;setDragPreview({w:next,valid:true});}catch{d.valid=false;setDragPreview({w:{...w,lcg:String(target.x),tcg:String(target.y)},valid:false});}}}}
        onPointerUp={()=>finish()} onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>finish(true)}>
        <defs><pattern id="cargo-planner-grid" x={area.xMin} y={area.yMin} width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#94a3b8" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/></pattern></defs>
        {(area.supportRegions??area.regions??[area]).map((r,i)=><g key={i}><rect x={r.xMin} y={r.yMin} width={r.xMax-r.xMin} height={r.yMax-r.yMin} fill="#edf4f8" stroke="#334155" vectorEffect="non-scaling-stroke"/><rect pointerEvents="none" x={r.xMin} y={r.yMin} width={r.xMax-r.xMin} height={r.yMax-r.yMin} fill="url(#cargo-planner-grid)"/></g>)}
        {area.panels?.map((p,i)=><g key={p.id+i} pointerEvents="none"><rect x={p.xMin} y={p.yMin} width={p.xMax-p.xMin} height={p.yMax-p.yMin} fill="none" stroke="#527c60" strokeDasharray="4 2" vectorEffect="non-scaling-stroke"/><text x={(p.xMin+p.xMax)/2} y={p.yMin+.65} textAnchor="middle" fontSize=".55" fill="#365641">{p.id.replace('hatch-','H')}</text></g>)}

        <CargoTopItems showLabels={visibleWeights.length<=500||zoom>=3} weights={visibleWeights} selection={selectionSet} issues={issueIds} fixed={fixed} dragId={dragPreview?.w.id} actions={topActions}/>
        {dragPreview&&translateCargoGroup(visibleWeights.filter(w=>selection.includes(dragPreview.w.id)?selectionSet.has(w.id):w.id===dragPreview.w.id),latest.current.find(w=>w.id===dragPreview.w.id)!,dragPreview.w).map(w=>{const b=cargoBounds(w);return b?<rect key={w.id} pointerEvents="none" x={b.xMin} y={b.yMin} width={b.xMax-b.xMin} height={b.yMax-b.yMin} fill={dragPreview.valid?'#16a34a':'#dc2626'} fillOpacity=".5" stroke={dragPreview.valid?'#166534':'#991b1b'} vectorEffect="non-scaling-stroke"/>:null;})}
        {pending&&cursor&&Array.from({length:pending.count},(_,i)=>{const offset=(i-(pending.count-1)/2)*((pending.direction==='x'?pending.length:pending.width)+pending.gap);return <rect key={`preview-${i}`} pointerEvents="none" x={cursor.x-pending.length/2+(pending.direction==='x'?offset:0)} y={cursor.y-pending.width/2+(pending.direction==='y'?offset:0)} width={pending.length} height={pending.width} fill={previewValid?'#16a34a':'#dc2626'} fillOpacity="0.4" stroke={previewValid?'#166534':'#991b1b'} vectorEffect="non-scaling-stroke"/>;})}
        {pasteDraft&&cursor&&(()=>{const bounds=(pastePreview??pasteDraft).map(w=>cargoBounds(w)!);const cx=(Math.min(...bounds.map(b=>b.xMin))+Math.max(...bounds.map(b=>b.xMax)))/2,cy=(Math.min(...bounds.map(b=>b.yMin))+Math.max(...bounds.map(b=>b.yMax)))/2;return bounds.map((b,i)=><rect key={'paste-'+i} pointerEvents="none" x={pastePreview?b.xMin:b.xMin+cursor.x-cx} y={pastePreview?b.yMin:b.yMin+cursor.y-cy} width={b.xMax-b.xMin} height={b.yMax-b.yMin} fill={pasteValid?'#16a34a':'#dc2626'} fillOpacity=".45" stroke={pasteValid?'#166534':'#991b1b'} vectorEffect="non-scaling-stroke"/>);})()}
        {placingCargo&&cursor&&Number(length)>0&&Number(width)>0&&<rect pointerEvents="none" x={(newCargoPreview?Number(newCargoPreview.lcg):cursor.x)-(cargoRotation===0?Number(length):Number(width))/2} y={(newCargoPreview?Number(newCargoPreview.tcg):cursor.y)-(cargoRotation===0?Number(width):Number(length))/2} width={cargoRotation===0?Number(length):Number(width)} height={cargoRotation===0?Number(width):Number(length)} fill={newCargoPreview?'#16a34a':'#dc2626'} fillOpacity="0.35" stroke="#075985" vectorEffect="non-scaling-stroke"/>}
      {gapPreview?.before===weightsSignature&&gapPreview.scope===historyScope&&gapPreview.parts.filter(w=>cargoOnSurface(w,area)).map(w=>{const b=cargoBounds(w)!;return <rect key={w.id} pointerEvents="none" x={b.xMin} y={b.yMin} width={b.xMax-b.xMin} height={b.yMax-b.yMin} fill="#c28a4b" fillOpacity=".55" stroke="#815125" vectorEffect="non-scaling-stroke"/>;})}{windowSelection.overlay}</svg></div></>}{(view==='side'||view==='end')&&<CargoElevations key={`${area?.id}:${view}:${panReset}`} panMode={panMode} onZoom={setZoom} onSelectWindow={selectWindow} zoom={zoom} view={view} area={area} surfaces={surfaces} weights={cargoWeights} selected={selected} selectedIds={selection} multiSelect={multiSelect} onSelect={selectItem} preview={preview3D} onMove={(id,p)=>commit3D(id,p)}/>}
    <div className="scene-toolbar planner-actions">      {view!=='3d'&&<div className="planner-zoom" role="group" aria-label={t('Plan zoom')}><button aria-label={t('Zoom out')} title="−" disabled={zoom<=1} onClick={()=>changeZoom(zoom/1.12)}>−</button><label>{t('Plan zoom')} <input type="range" min="1" max="15" step="0.01" value={zoom} onChange={e=>changeZoom(Number(e.target.value))}/></label><button aria-label={t('Zoom in')} title="+" disabled={zoom>=15} onClick={()=>changeZoom(zoom*1.12)}>+</button><output>{Math.round(zoom*100)}%</output><button onClick={()=>{setZoom(1);setFocus(undefined);planPan.reset();setPanReset(v=>v+1);}}>{t('Fit planning area')}</button></div>}
      <label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>{t('Grid snap')}</label><details className="planner-secondary"><summary>{t('Snap settings')}</summary><label>{t('Grid spacing (m)')}<select value={snapStep} onChange={e=>setSnapStep(Number(e.target.value))}>{[.01,.05,.1,.25,.5,1].map(v=><option key={v} value={v}>{v} m</option>)}</select></label><label><input type="checkbox" checked={cargoSnap} onChange={e=>setCargoSnap(e.target.checked)}/>{t('Snap to cargo')}</label>{cargoSnap&&<><label>{t('Cargo gap (m)')}<select value={snapGap} onChange={e=>setSnapGap(Number(e.target.value))}>{[0,.05,.1,.2,.3,.5,1].map(v=><option key={v} value={v}>{v} m</option>)}</select></label><label>{t('Capture distance (m)')}<select value={snapRange} onChange={e=>setSnapRange(Number(e.target.value))}>{[.05,.1,.2,.3,.5].map(v=><option key={v} value={v}>{v} m</option>)}</select></label><p>{t('Cargo edges snap on the same level. Dunnage stays a support and is not a snap target. Selected structures move together.')}</p></>}<p className="planner-note">{t('Placement, paste and drag previews use these settings. Turn snapping off to follow the pointer exactly. Vertical placement follows supporting surfaces.')}</p></details>
</div>
    <p className="workspace-hint">{t('Drag empty space to select · Shift adds · Delete removes · Escape cancels')}</p>
    </>:<p>{t('Define a planning area first.')}</p>}
    </div></div>
    {cargoWeights.some(w=>!w.footprint)&&<p>{cargoWeights.filter(w=>!w.footprint).length} {t('rows have no footprint; their masses remain included in calculations.')}</p>}
    {issues.length>0&&<ul className="warnings">{issues.map((q,i)=><li key={i}>{weights.find(w=>w.id===q.id)?.name}: {t(({outside:'Outside planning boundary',overlap:'Overlapping cargo',position:'Missing cargo position',deck:'Cargo belongs to another deck elevation',height:'Cargo exceeds the available clear height.',support:'A gap is not a supporting surface. Place cargo on explicit supports above it.'} as const)[q.kind])}{q.other?' · '+weights.find(w=>w.id===q.other)?.name:''}</li>)}</ul>}
    <details className="inspector-help"><summary>{t('Planning help')}</summary><p>{t('Trackpad: choose Pan view and scroll with two fingers; pinch to zoom over the plan. Touchscreen: choose Pan view, drag with one finger, or pinch and move with two fingers. Choose Select to edit cargo again. Scroll outside the drawing to move the page.')}</p><p>{t('Pan view moves the drawing without selecting cargo. In 2D, middle-button dragging also pans. Use Select to edit cargo again; Fit planning area resets the view.')}</p><dl className="shortcut-reference">{[['Ctrl/Cmd + Z','Undo layout action'],['Ctrl/Cmd + Shift + Z / Ctrl + Y','Redo layout action'],['Ctrl/Cmd + A','Select all on surface'],['Ctrl/Cmd + C','Copy selection'],['Ctrl/Cmd + V','Paste selection'],['Ctrl/Cmd + D','Duplicate cargo'],['Delete / Backspace','Delete selected'],['R','Rotate 90°'],['Esc','Cancel placement or clear selection'],['1 / 2 / 3 / 4','3D / Top / Side / End'],['+ / − / 0','Zoom in / out / fit'],['S','Grid snap']].map(([keys,label])=><div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{t(label)}</dd></div>)}</dl><p>{t('Shortcuts: + / − zoom, 0 fit, S toggle grid snapping. Shift-click selects multiple items. Shortcuts are inactive while editing fields.')}</p><p>{t('One rectangle represents one loading row. New cargo uses geometric-centre KG; edit KG if the load is uneven. Moving a rectangle changes LCG and TCG only.')}</p><p>{t('Edges snap relative to the planning surface; dragging and rotation keep the footprint inside its bounds.')}</p>{deckDefinition(ship)?.notes?.map(note=><p key={note}>{t(note)}</p>)}<p>{t('Clear heights are nominal planning limits; local beams, hatch openings and securing clearances require separate checks.')}</p></details></>}
  <SecuringAssessment selection={selection} ship={ship} weights={cargoWeights} areas={surfaces}/>
  <CargoLoadAssessment weights={cargoWeights} areas={surfaces} storedDecks={tweenDeck==='stored'}/>
  </section>;
}

function StackabilityFields({value,limit,onChange}:{value:Stackability;limit:string;onChange:(v:Stackability,l:string)=>void}){
 const {t}=useLanguage();const [v,setV]=useState(value),[l,setL]=useState(limit);
 return <details className="cargo-stack-controls"><summary>{t('Stackability')}: {t({unknown:'Unknown',stackable:'Stackable',unstackable:'Not stackable'}[value])}</summary><label>{t('Stackability')}<select value={v} onChange={e=>setV(e.target.value as Stackability)}><option value="unknown">{t('Unknown')}</option><option value="stackable">{t('Stackable')}</option><option value="unstackable">{t('Not stackable')}</option></select></label>{v==='stackable'&&<label>{t('Maximum load above (t)')}<input type="number" min="0" step="any" value={l} onChange={e=>setL(e.target.value)}/></label>}<button disabled={v==='stackable'&&(!l.trim()||!Number.isFinite(Number(l))||Number(l)<0)} onClick={()=>onChange(v,v==='stackable'?l:'')}>{t('Apply stackability')}</button></details>;
}
