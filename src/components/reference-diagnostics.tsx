import type {WeatherReference} from '../core/stability/weather-evidence';
import {referenceDiagnostics} from '../core/stability/reference-diagnostics';
import {useLanguage} from '../app/language-context';
export function ReferenceDiagnostics({reference}:{reference:WeatherReference}) {
 const {t}=useLanguage();const d=referenceDiagnostics(reference);
 function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`reference-check-${reference.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <details><summary>{t('Reference calculation checks')}</summary>
 <p>{t('GZ arithmetic checks the printed KN − KG sine term − TCG cosine term. No extra free-surface correction is applied.')}</p>
 <p><strong>{t(d.issues.length?'Review GZ arithmetic':'GZ arithmetic consistent with printed precision')}</strong> · {d.rowCount} {t('rows checked')} · {t('Largest residual (m)')}: {d.maxLeverResidual.toFixed(6)} · {t('Rounding bound (m)')}: {d.leverRoundingBound.toFixed(3)}</p>
 {d.issues.length>0&&<ul>{d.issues.map(r=><li key={r.anglePortDeg}>{r.anglePortDeg}° · {t('Printed')}: {r.printed.toFixed(3)} m · {t('Reconstructed')}: {r.reconstructed.toFixed(3)} m · {t('Difference')}: {r.residual.toFixed(6)} m</li>)}</ul>}
 <div style={{overflowX:'auto'}}><table><thead><tr><th>{t('Angle interval')}</th><th>{t('Printed area (m·rad)')}</th><th>{t('Trapezoidal area (m·rad)')}</th><th>{t('Difference (m·rad)')}</th></tr></thead><tbody>{d.areas.map(r=><tr key={`${r.from}-${r.to}`}><th scope="row">{r.from}–{r.to}°</th>{r.available?<><td>{r.printed.toFixed(6)}</td><td>{r.calculated.toFixed(6)}</td><td>{r.difference.toFixed(6)}</td></>:<td colSpan={3}>{t('Printed endpoints unavailable')}</td>}</tr>)}</tbody></table></div>
 <p>{t('Areas use signed trapezoids in radians. Differences may result from rounded ordinates or the source integrating a finer curve; they are not automatically classified as source errors. Original values are unchanged.')}</p>
 <p>{t('These checks validate source arithmetic only, not the live ship solver, approval status or compliance.')}</p>
 <button type="button" onClick={download}>{t('Download reference check')}</button>
 </details>;
}
