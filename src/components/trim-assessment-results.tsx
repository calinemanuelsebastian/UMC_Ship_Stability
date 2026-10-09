import {useAssessmentSettings,assessmentKey} from '../app/assessment-settings';
import {sharedResults} from '../core/calculations/shared-results';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {useEffect,useState} from 'react';
import {useLanguage} from '../app/language-context';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {computeTableTrim} from '../core/trim/trimmed-table';
import {assessTrim,type TrimLimits} from '../core/stability/trim-assessment';
import {compareKg,parseKgLimits,type KgLimits} from '../core/stability/kg-limit';
import {NumberInput} from './number-input';
export type TrimAssessmentInputs={pending:boolean;displacementTonnes?:number;lcg?:number;waterDensity?:number;longitudinalFsm?:number;vcg?:number;freeSurfaceMomentTransverse?:number};
export function TrimAssessmentResults({ship,limits,inputs}:{ship:ShipModelPackage;limits:TrimLimits;inputs:TrimAssessmentInputs}) {
 const {t}=useLanguage();
 const {pending,displacementTonnes,lcg,waterDensity,longitudinalFsm}=inputs;
 const key=JSON.stringify([displacementTonnes,lcg,waterDensity,longitudinalFsm]);
 const [calculation,setCalculation]=useState<{ship:ShipModelPackage;key:string;trim?:number;mouldedDraft?:number;kgLimits?:KgLimits;error?:string}>();
 const {settings,setSettings}=useAssessmentSettings();const draftKey=assessmentKey(inputs);
 const manualDraft=settings.draft?.conditionKey===draftKey?settings.draft.value:undefined;
 const valid=!pending&&[displacementTonnes,lcg,waterDensity,longitudinalFsm].every(v=>v!==undefined&&Number.isFinite(v));
 useEffect(()=>{
  if(!valid)return;
  const controller=new AbortController();
  async function run(){try{
   if(longitudinalFsm!==0)throw new Error('Trim assessment requires zero longitudinal FSM; liquid redistribution is not solved.');
   const resource=ship.manifest.resources.find(r=>r.kind==='hydrostatics.trimmed-table');
   if(!resource?.path)throw new Error('No compatible trimmed table is supplied.');
   const table=await loadTrimmedTable(ship);
   const result=computeTableTrim(table,{displacementTonnes:displacementTonnes!,lcg:lcg!,waterDensity:waterDensity!},ship.manifest.principalDimensions.lbp);
   const kr=ship.manifest.resources.find(r=>r.kind==='documentation.annotated-kg');let kgLimits;
   if(kr?.path){kgLimits=await sharedResults.read(ship,'kg-limits',kr.path,async(s,path)=>{const response=await fetch(shipResourceUrl(s,path));if(!response.ok)throw new Error('Could not load annotated KG limits.');return parseKgLimits(await response.json());});}
   if(!controller.signal.aborted)setCalculation({ship,key,trim:result.trimMetres,mouldedDraft:result.mouldedDraft,kgLimits});
  }catch(error){if(!controller.signal.aborted)setCalculation({ship,key,error:error instanceof Error?error.message:'Trim assessment unavailable.'});}}
  void run();return ()=>controller.abort();
 },[ship,key,valid,displacementTonnes,lcg,waterDensity,longitudinalFsm]);
 const current=valid&&calculation?.ship===ship&&calculation.key===key?calculation:undefined;
 const draft=current?.mouldedDraft??manualDraft;
 let result:ReturnType<typeof assessTrim>|undefined;
 let reason=pending?'Shared condition is updating.':!valid?'Complete the shared condition inputs.':current?.error??(!current?'Calculating trim…':draft===undefined?'Enter the moulded draught for this condition.':'');
 if(current?.trim!==undefined&&draft!==undefined){try{result=assessTrim(limits,draft,current.trim);}catch(error){reason=(error as Error).message;}}
 return <section aria-label={t('Trim assessment')}><h3>{t('Trim assessment')}</h3>
 <p>{t('Provisional numerical check only; current vessel approval remains unconfirmed.')}</p>
 {current?.mouldedDraft===undefined&&<details><summary>{t('Assessment draught')}</summary><p>{t('Enter a verified moulded draught for this loading condition. It is used only for this check. The table draught cannot yet be converted reliably; changing the condition clears this input.')}</p>
 <NumberInput label={t('Verified moulded draught (m)')} value={manualDraft} disabled={pending} min={limits.rows[0].draftMetres} onChange={value=>setSettings(previous=>({...previous,draft:{conditionKey:draftKey,value}}))}/></details>}
 <p role="status"><strong>{t(result?.status??'Not assessed')}</strong>{!result&&` · ${t(reason)}`}</p>
 {current?.trim!==undefined&&<p>{t('Calculated trim (bow positive)')}: {current.trim.toFixed(4)} m</p>}
 {result&&<table><caption>{t('Permissible trim · source sign: stern negative, bow positive')}</caption><thead><tr><th>{t('Moulded draught (m)')}</th><th>{t('Lower limit (m)')}</th><th>{t('Upper limit (m)')}</th><th>{t('Margin to nearest limit (m)')}</th></tr></thead><tbody><tr><td>{result.draft.toFixed(4)}</td><td>{result.minimum.toFixed(4)}</td><td>{result.maximum.toFixed(4)}</td><td>{result.margin.toFixed(4)}</td></tr></tbody></table>}
 {current?.mouldedDraft!==undefined&&<p>{t('Moulded draught follows the current loading condition using the documented mean-draught reference and keel offset.')}</p>}
 {current?.kgLimits&&draft!==undefined&&<KgComparison data={current.kgLimits} draft={draft} inputs={inputs}/>}
 <small>{t('Source')}: {limits.source}</small>
 </section>;
}

function KgComparison({data,draft,inputs}:{data:KgLimits;draft:number;inputs:TrimAssessmentInputs}){
 const {t}=useLanguage();let result;let error;
 try{if(inputs.vcg===undefined||inputs.freeSurfaceMomentTransverse===undefined||!inputs.displacementTonnes)throw new Error('Complete the shared condition inputs.');result=compareKg(data,draft,inputs.vcg,inputs.freeSurfaceMomentTransverse/inputs.displacementTonnes);}catch(e){error=(e as Error).message;}
 return <details><summary>{t('Annotated limiting KG comparison')}</summary><p>{t('Not assessed')} · {t('Both KG conventions are shown because the red-table free-surface convention and final approval scope remain unconfirmed. Positive margins are not a compliance verdict.')}</p>
 {error?<p>{t(error)}</p>:result&&<table><thead><tr><th>{t('Maximum KG (m)')}</th><th>{t('Physical KG (m)')}</th><th>{t('Corrected KG (m)')}</th><th>{t('Physical margin (m)')}</th><th>{t('Corrected margin (m)')}</th></tr></thead><tbody><tr>{[result.limit,result.physicalKg,result.correctedKg,result.physicalMargin,result.correctedMargin].map((x,i)=><td key={i}>{x.toFixed(4)}</td>)}</tr></tbody></table>}
 <p>{t('Interpolated by the red table’s moulded draught, not its displacement. Source: PDF 175–176. Other stability and load-line checks remain separate.')}</p></details>;
}
