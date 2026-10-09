import {shipResourceUrl} from '../core/domain/ship-resource';
import {useEffect,useState} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {parseCsv,readCsvNumber} from '../platform/files/csv';
import {auditHydrostatics,type AuditRow} from '../app/hydrostatic-audit';
import {useLanguage} from '../app/language-context';
type Report={originalTable?:unknown;name:string;source:string;density:number;rows:AuditRow[];audit:ReturnType<typeof auditHydrostatics>};
export function HydrostaticAudit({ship}:{ship:ShipModelPackage}){
 const {t}=useLanguage();const [reports,setReports]=useState<Report[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{let active=true;setBusy(true);setError('');
 Promise.all(ship.manifest.resources.filter(r=>['hydrostatics.upright-table','hydrostatics.trimmed-table'].includes(r.kind)).map(async r=>{
  const response=await fetch(shipResourceUrl(ship,r.path!));if(!response.ok)throw new Error('Could not read table for audit.');
  if(r.kind==='hydrostatics.trimmed-table'){
   const data=await response.json();return data.tables.map((table:{trimMetres:number;rows:AuditRow[]})=>({name:`${r.id} · trim ${table.trimMetres} m`,source:r.path!,density:data.waterDensity,rows:table.rows,audit:auditHydrostatics(table.rows,data.waterDensity)}));
  }
  const originalTable=parseCsv(await response.text());
  const rows=originalTable.map(row=>Object.fromEntries(['draft','displacementTonnes','lcb','lcf','tcb','volume','waterplaneArea','tonnesPerCentimetre','kb','kmTransverse','kmLongitudinal','bmTransverse','bmLongitudinal'].map(key=>[key,readCsvNumber(row,key)])));
  const density=ship.manifest.defaultCondition.waterDensity;return [{originalTable,name:r.id,source:r.path!,density,rows,audit:auditHydrostatics(rows,density)}];
 })).then(result=>{if(active)setReports(result.flat());}).catch(e=>{if(active)setError(String(e));}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[ship]);
 function download(){const blob=new Blob([JSON.stringify({notice:'Screening findings are not automatic corrections. Verify against source data.',reports},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hydrostatic-tables-with-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="panel"><h2>{t('Automatic table checks')}</h2><p>{t('Formula checks flag likely inconsistencies, not proven errors. Missing columns limit coverage; source conventions and rounding must be reviewed before correcting values.')}</p><p>{t('Checks: displacement = density × volume; TPC from waterplane area and displacement increments; KM = KB + BM; positive values and increasing table rows.')}</p>
 {busy?<p role="status">{t('Checking tables…')}</p>:error?<p role="alert">{error}</p>:<>{reports.map(report=><details key={report.name}><summary>{report.name} · {report.audit.rowCount} {t('rows')} · {report.audit.findings.length} {t('flags')}</summary><p>{report.audit.comparisons} {t('available formula comparisons')}</p>{report.audit.findings.length?<ul>{report.audit.findings.map((f,i)=><li key={i}>{t('Row')} {f.row}: {f.check} — {f.message} {f.observed!==undefined&&`${f.observed.toFixed(5)} → ${f.expected?.toFixed(5)??'—'}`}</li>)}</ul>:<p>{t('No inconsistencies detected by the available checks. This does not verify every table value.')}</p>}</details>)}<button disabled={!reports.length} onClick={download}>{t('Export tables with audit log')}</button></>}
 </section>;
}
