import {useState} from 'react';
import {buildAssessmentReport,type ReportInputs} from '../app/assessment-report';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {ScenarioState} from '../app/saved-scenarios';
import {useLanguage} from '../app/language-context';
export function AssessmentReportExport({ship,state,inputs}:{ship:ShipModelPackage;state:ScenarioState;inputs:ReportInputs}){
 const {t}=useLanguage();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(){setBusy(true);setMessage('');try{const report=await buildAssessmentReport(ship,state,inputs);const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='condition-assessment-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Assessment report exported with inputs, results, sources and unresolved checks.');}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <div><button disabled={busy||inputs.pending} onClick={download}>{t(busy?'Preparing assessment report…':'Export complete assessment report')}</button>{message&&<p role="status">{t(message)}</p>}</div>;
}
