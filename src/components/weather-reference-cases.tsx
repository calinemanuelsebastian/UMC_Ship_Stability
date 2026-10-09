import {ReferenceReplay} from './reference-replay';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {ReferenceDiagnostics} from './reference-diagnostics';
import {useState} from 'react';
import {useLanguage} from '../app/language-context';
import type {WeatherEvidence} from '../core/stability/weather-evidence';
export function WeatherReferenceCases({ship,data,downloadUrl}:{ship:ShipModelPackage;data:WeatherEvidence;downloadUrl:string}) {
 const {t}=useLanguage();const [id,setId]=useState('');const c=data.cases.find(c=>c.id===id);
 const low=c?Math.min(0,...c.rows.map(r=>r.gzCorrectedPort)):0,high=c?Math.max(.1,...c.rows.map(r=>r.gzCorrectedPort)):1;
 const x=(v:number)=>60+590*v/(c?.rows.at(-1)?.anglePortDeg??60),y=(v:number)=>220-180*(v-low)/(high-low);
 return <details><summary>{t('Booklet reference-condition checks')} ({data.cases.length})</summary>
 <p>{t('These are separate documented loading conditions, not the current simulation. Selecting a case does not change cargo, tanks, GZ coverage or assessment inputs.')}</p>
 <p>{t(data.notice)}</p>
 <p>{t(data.waterlineFinding)}</p>
 <label>{t('Reference case')} <select value={id} onChange={e=>setId(e.target.value)}><option value="">{t('Choose a reference case')}</option>{data.cases.some(r=>r.sourceFile==='004_STABILITY_LOADING_MANUAL.pdf')&&<option value="worked">{t('Manual worked example — starboard KN, GZ and GM')}</option>}{data.cases.map(r=><option key={r.id} value={r.id}>{r.sourceFile.slice(0,3)} · PDF {r.curvePage} · {r.condition}</option>)}</select></label>
 {id==='worked'&&<ReferenceReplay key="worked" ship={ship}/>}
 {c&&<><p>{c.sourceFile} · {t('Curve page')}: {c.curvePage} · {t('Summary page')}: {c.summaryPage} · {t('Weights page')}: {c.weightsPage}</p>
 <dl><dt>{t('Reference displacement (t)')}</dt><dd>{c.massTonnes.toFixed(3)}</dd><dt>KG / LCG / TCG (m)</dt><dd>{c.physicalKg.toFixed(3)} / {c.lcg.toFixed(3)} / {c.tcgStarboard.toFixed(3)}</dd><dt>FSM (t·m)</dt><dd>{c.fsm.toFixed(3)}</dd><dt>{t('Source 80% deck-immersion limit (°)')}</dt><dd>{c.deckLimit80Deg.toFixed(3)}</dd><dt>{t('Derived deck-immersion angle (°)')}</dt><dd>{(c.deckLimit80Deg/.8).toFixed(3)}</dd><dt>{t('Source flooding summary (°)')}</dt><dd>{c.reportedFloodingDeg.toFixed(3)}</dd><dt>{t('Source steady-wind heel (°)')}</dt><dd>{c.sourceWindHeelDeg.toFixed(3)}</dd></dl>
 <p>{t('The deck angle is reconstructed by dividing the printed 80% limit by 0.8. Rounded source values and reported flooding angles do not establish a verified onset for other conditions.')}</p>
 <svg viewBox="0 0 700 275" role="img" aria-label={t('Documented corrected GZ toward port')} style={{width:'100%',maxWidth:750,background:'#f8fafc',borderRadius:8}}>
 <text x="60" y="22" fontSize="13" fill="#334155">GZ (m)</text>
 {[0,1,2,3].map(i=>{const v=low+(high-low)*i/3;return <g key={i}><line x1="60" x2="650" y1={y(v)} y2={y(v)} stroke="#cbd5e1"/><text x="53" y={y(v)+4} textAnchor="end" fontSize="12" fill="#334155">{v.toFixed(2)}</text></g>;})}
 <polyline points={c.rows.map(r=>`${x(r.anglePortDeg)},${y(r.gzCorrectedPort)}`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="2"/>
 {[0,15,30,45,60].filter(a=>a<=c.rows.at(-1)!.anglePortDeg).map(a=><text key={a} x={x(a)} y="240" textAnchor="middle" fontSize="12" fill="#334155">{a}°</text>)}
 <text x="350" y="265" textAnchor="middle" fontSize="13" fill="#334155">{t('Heel toward port (source convention)')}</text>
 </svg>
 <ReferenceReplay key={c.id} ship={ship} reference={c}/>
 <ReferenceDiagnostics reference={c}/>
 <details><summary>{t('Source curve values')}</summary><div style={{overflowX:'auto'}}><table><thead><tr>{['PS (°)','Draft (m)','Trim (m)','KN (m)','GZ (m)','Area (m·rad)'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{c.rows.map(r=><tr key={r.anglePortDeg}><td>{r.anglePortDeg}</td><td>{r.draft.toFixed(3)}</td><td>{r.trim.toFixed(3)}</td><td>{r.kn.toFixed(3)}</td><td>{r.gzCorrectedPort.toFixed(3)}</td><td>{r.areaPort.toFixed(3)}</td></tr>)}</tbody></table></div></details>
 </>}
 <p>{t('Port-positive angles and GZ are retained exactly as printed. They must not be joined to the live starboard curve without matching the loading condition and sign convention.')}</p>
 <a href={downloadUrl} download>{t('Download assessment evidence')}</a>
 </details>;
}
