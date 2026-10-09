import {useEffect,useState} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {WeatherReference} from '../core/stability/weather-evidence';
import {replayReference,replayWorkedExample,type Replay} from '../core/stability/reference-replay';
import {useLanguage} from '../app/language-context';
export function ReferenceReplay({ship,reference}:{ship:ShipModelPackage;reference?:WeatherReference}){
 const {t}=useLanguage();const [state,setState]=useState<{ship:ShipModelPackage;reference?:WeatherReference;result?:Replay;error?:string}>();
 useEffect(()=>{let active=true;const work=reference?replayReference(ship,reference):replayWorkedExample(ship);work.then(result=>{if(active)setState({ship,reference,result});}).catch(error=>{if(active)setState({ship,reference,error:error instanceof Error?error.message:String(error)});});return()=>{active=false;};},[ship,reference]);
 const current=state?.ship===ship&&state.reference===reference?state:undefined;
 const r=current?.result;
 function download(){if(!r)return;const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`booklet-replay-${r.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section><h3>{t('Booklet numerical reproduction')}</h3>{!r?<p role="status">{current?.error??t('Calculating reference case…')}</p>:<>
 <p>{t(r.scope)}</p><details><summary>{t('Original calculation inputs')}</summary><pre>{JSON.stringify(r.inputs,null,2)}</pre></details>
 <div style={{overflowX:'auto'}}><table><thead><tr>{['Quantity','Booklet','Calculated','Difference','Method / coverage'].map(x=><th key={x}>{t(x)}</th>)}</tr></thead><tbody>{r.rows.map(x=><tr key={x.label}><th scope="row">{t(x.label)} ({x.unit})</th>{[x.source,x.calculated,x.difference].map((v,i)=><td key={i}>{v===undefined?'—':v.toFixed(6)}</td>)}<td>{t(x.note)}</td></tr>)}</tbody></table></div>
 <button onClick={download}>{t('Download numerical reproduction')}</button>
 </>}</section>;
}
