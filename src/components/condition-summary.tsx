import {useState} from 'react';
import {useLanguage} from '../app/language-context';
export function ConditionSummary({hideIdentity=false,name,fromWeights,displacement,kg,density,fsm}:{hideIdentity?:boolean;name:string;fromWeights:boolean;displacement?:number;kg?:number;density?:number;fsm?:number}) {
 const {t}=useLanguage();const [expanded,setExpanded]=useState(false);
 const value=(n:number|undefined)=>n!==undefined&&Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:3}):'—';
 return <section className="condition-summary-strip" aria-label={t('Current condition')} data-expanded={expanded}>
 {!hideIdentity&&<div><strong>{name}</strong><small>{t(fromWeights?'Weight-based loading':'Manual scenario')}</small></div>}
 <dl>{([['Displacement',displacement,'t'],['VCG / KG',kg,'m'],['Water density',density,'t/m³'],['Total transverse FSM',fsm,'t·m']] as const).map(([label,n,unit],index)=><div className={index?'condition-extra':''} key={label}><dt>{t(label)}</dt><dd>{value(n)} <small>{unit}</small></dd></div>)}</dl>
 <button className="mobile-condition-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{t(expanded?'Less detail':'Condition details')}</button>
 </section>;
}
