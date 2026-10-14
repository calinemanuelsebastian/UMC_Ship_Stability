import {useState} from 'react';
import {buildAssessmentReport,type ReportInputs} from '../app/assessment-report';
import {voyageInputs} from '../app/voyage-review';
import {conditionRevision} from '../app/condition-transaction';
import {printableAssessment} from '../app/print-assessment';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {ScenarioState} from '../app/saved-scenarios';
import {useLanguage} from '../app/language-context';
export function AssessmentReportExport({ship,state,inputs}:{ship:ShipModelPackage;state:ScenarioState;inputs:ReportInputs}){
 const {t}=useLanguage();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [prepared,setPrepared]=useState<{report:Awaited<ReturnType<typeof buildAssessmentReport>>;revision:string;ship:ShipModelPackage}>();
 function download(data:string,type:string,name:string){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function prepare(){setBusy(true);setMessage('');try{const snapshot=structuredClone(state),revision=conditionRevision(snapshot);const calculated=await voyageInputs(ship,snapshot);const report=await buildAssessmentReport(ship,snapshot,calculated);setPrepared({report,revision,ship});download(JSON.stringify(report,null,2),'application/json','condition-assessment-report.json');setMessage('Assessment report exported. The printable report uses the same saved snapshot.');}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 const available=prepared?.ship===ship?prepared:undefined;
 return <div><div className="scene-toolbar"><button disabled={busy||inputs.pending} onClick={prepare}>{t(busy?'Preparing assessment report…':'Export complete assessment report')}</button>{available&&<><button onClick={()=>download(printableAssessment(available.report),'text/html','condition-assessment-report.html')}>{t('Download printable report')}</button><button onClick={()=>download(JSON.stringify(available.report,null,2),'application/json','condition-assessment-report.json')}>{t('Download matching report data')}</button></>}</div>{available&&available.revision!==conditionRevision(state)&&<p role="status">{t('Inputs have changed. These downloads retain the previous report snapshot; export again to update it.')}</p>}{message&&<p role="status">{t(message)}</p>}</div>;
}
