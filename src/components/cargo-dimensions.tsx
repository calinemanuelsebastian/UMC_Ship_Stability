import {useState} from 'react';
import type {Footprint} from '../app/cargo-layout';
import {useLanguage} from '../app/language-context';
export function CargoDimensions({footprint,onApply}:{footprint:Footprint;onApply:(v:{length:number;width:number;height:number})=>void}){
 const {t}=useLanguage();const [values,setValues]=useState({length:String(footprint.length),width:String(footprint.width),height:String(footprint.height)});
 return <div><div className="curve-inputs">{(['length','width','height'] as const).map(k=><label key={k}>{t({length:'Length (m)',width:'Width (m)',height:'Height (m)'}[k])}<input type="number" min="0.001" step="any" value={values[k]} onChange={e=>setValues({...values,[k]:e.target.value})}/></label>)}</div><button disabled={Object.values(values).some(v=>!Number.isFinite(Number(v))||Number(v)<=0)} onClick={()=>onApply({length:Number(values.length),width:Number(values.width),height:Number(values.height)})}>{t('Apply dimensions')}</button></div>;
}
