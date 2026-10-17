import {useId} from 'react';
import {useLanguage} from '../app/language-context';
/** Compact field help: hover, keyboard focus, or tap the information button. */
export function FieldLabel({label,help,optional=true}:{label:string;help:string;optional?:boolean}){
 const {t}=useLanguage();const id=useId();
 return <span className="field-label">{t(label)} {optional&&<small className="field-optional">{t("Optional")}</small>} <span className="field-help"><button type="button" className="field-help-trigger" aria-label={`${t(label)}: ${t('Field information')}`} aria-describedby={id} onClick={e=>e.preventDefault()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.currentTarget.blur();}}}>ⓘ</button><span role="tooltip" id={id} className="field-help-tooltip">{t(help)}</span></span></span>;
}
