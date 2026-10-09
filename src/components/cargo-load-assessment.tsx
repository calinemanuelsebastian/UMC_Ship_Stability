import {useMemo,useState} from 'react';
import {cargoLoadChecks} from '../app/cargo-load-checks';
import type {CargoArea} from '../app/cargo-layout';
import type {WeightDraft} from '../app/loading-state';
import {useLanguage} from '../app/language-context';
export function CargoLoadAssessment({weights,areas,storedDecks}:{weights:WeightDraft[];areas:CargoArea[];storedDecks:boolean}){
 const {t}=useLanguage();const [open,setOpen]=useState(false);
 const result=useMemo(()=>open?cargoLoadChecks(weights,areas,storedDecks):undefined,[open,weights,areas,storedDecks]);
 const n=(v:number|undefined)=>v===undefined?'—':v.toFixed(3);
 function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cargo-load-checks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('Cargo surface loads')}</summary>{result&&<>
 <p>{t('Includes cargo and dunnage once in each surface total. Average loading does not establish local structural adequacy. Each base contact includes all reachable cargo above; shared supports use a conservative upper bound.')}</p>
 {result.unlocated.length>0&&<p role="alert">{t('Unlocated or aggregate cargo weights require a layout before a complete load check.')} ({result.unlocated.length})</p>}
 <div style={{overflowX:'auto'}}><table><thead><tr>{['Loading surface','Mass (t)','Area (m²)','Average (t/m²)','Uniform limit (t/m²)','Assessment'].map(h=><th key={h}>{t(h)}</th>)}</tr></thead><tbody>{result.surfaces.map(s=><tr key={s.id??s.name}><th scope="row">{s.name}</th><td>{n(s.mass)}</td><td>{n(s.areaM2)}</td><td>{n(s.average)}</td><td>{n(s.limit)}</td><td>{t(s.status)}</td></tr>)}</tbody></table></div>
 {result.surfaces.map(s=><details key={s.id??s.name}><summary>{s.name} · {t('Contact loads')}</summary><p>{s.source?.source??t('No documented uniform limit')}</p>
 {(s.unsupported.length>0||s.geometryIssueCount>0)&&<p role="alert">{t('Resolve unsupported cargo, overlaps and boundary errors before assessing loads.')}</p>}
 {s.storedUnresolved&&<p>{t('Stored tween-deck bearing loads are not included: storage support reactions require separate verification.')}</p>}
 <div style={{overflowX:'auto'}}><table><thead><tr>{['Cargo / support','Carried load upper bound (t)','Assumed contact (m²)','Screening pressure (t/m²)','Assessment'].map(h=><th key={h}>{t(h)}</th>)}</tr></thead><tbody>{s.contacts.map(c=><tr key={c.id}><th>{c.name}</th><td>{n(c.carriedTonnes)}</td><td>{n(c.footprintM2)}</td><td>{n(c.pressure)}</td><td>{t(!c.supported?'Unsupported contact':s.limit!==undefined&&c.pressure!==undefined&&c.pressure>s.limit?'Local-load review required':'Concentrated capacity not assessed')}{c.panels.length>0&&<p>{c.panels.join(', ')}</p>}</td></tr>)}</tbody></table></div></details>)}
 <p>{t('Container stacks, coils, forklifts and hatch load spots have separate rules. General rectangles do not establish their applicability. Dunnage does not automatically spread loads over its full footprint.')}</p>
 <button type="button" onClick={download}>{t('Download cargo-load checks')}</button>
 </>}</details>;
}
