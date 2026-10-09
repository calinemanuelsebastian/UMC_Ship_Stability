import {useAssessmentSettings,emptyWeatherValues} from '../app/assessment-settings';
import {useMemo} from 'react';
import {derivePortEstimate,estimateGeometryInputs} from '../core/stability/derived-stability-data';
import {useLanguage} from '../app/language-context';
import type {StabilityResult} from '../core/domain/stability-result';
import {assessWeather} from '../core/stability/weather-assessment';

export function WeatherAssessment({curve:sourceCurve,steady,draft,beam,bilgeArea,derivation,profileSource,conditionKey}:{curve:StabilityResult;steady:number;draft:number;beam:number;bilgeArea?:number;derivation?:{lbp:number;depth:number};conditionKey?:string;profileSource?:{id:string;resourcePath:string;pressureKgPerM2:number}}) {
 const {t}=useLanguage();
 const {settings,setSettings}=useAssessmentSettings();
 const stored=settings.weather;const saved=stored?.conditionKey===conditionKey&&stored?.profile===profileSource?.id?stored:undefined;
 const values=saved?.values??emptyWeatherValues;
 const effectiveValues=saved?values:{...values,bilge:bilgeArea===undefined?'':String(bilgeArea)};
 function patch(update:Partial<NonNullable<typeof saved>>){if(!conditionKey||!profileSource)return;setSettings(previous=>({...previous,weather:{conditionKey,profile:profileSource.id,values:{...effectiveValues},estimatePort:false,inputSource:'',...saved,...update}}));}
 const estimatePort=saved?.estimatePort??false;const setEstimatePort=(estimatePort:boolean)=>patch({estimatePort});
 const setValues=(values:typeof emptyWeatherValues)=>patch({values});
 const mayEstimate=!!derivation;
 const curve=useMemo(()=>estimatePort&&mayEstimate?derivePortEstimate(sourceCurve):sourceCurve,[estimatePort,mayEstimate,sourceCurve]);
 let geometry:ReturnType<typeof estimateGeometryInputs>|undefined;
 if(derivation)try{geometry=estimateGeometryInputs({mass:curve.displacementTonnes,density:curve.condition.waterDensity,length:derivation.lbp,beam,draft,depth:derivation.depth,appendageFactor:1.0028});}catch{/* Out-of-range diagnostic stays unavailable. */}

 const number=(key:keyof typeof values)=>effectiveValues[key].trim()===''?NaN:Number(effectiveValues[key]);
 const inputSource=saved?.inputSource??'';const setInputSource=(inputSource:string)=>patch({inputSource});
 const lwl=number('lwl'),cb=number('cb'),bilge=number('bilge'),deck=number('deck'),flood=number('flood');
 const assessment=useMemo(()=>assessWeather(curve,{steady,draft,beam,lwl,cb,bilgeArea:bilge,deckAngle:deck,floodAngle:flood}),[curve,steady,draft,beam,lwl,cb,bilge,deck,flood]);
 const {roll,areas,rollError,areaError,limit}=assessment;
 const eq=assessment.eq??{angle:undefined};const gust=assessment.gust??0;
 function downloadAssessment(){
  const report={format:'umc-weather-assessment',version:1,condition:curve.condition,curveSource:curve.source,profile:profileSource,operatorInputSource:inputSource.trim()||'Unspecified',inputs:{steady,draft,beam,...effectiveValues},derivedPort:!!curve.derivedPort,assessment};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='weather-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const start=roll&&eq.angle!==undefined?eq.angle-roll.angle:undefined;
 const minX=Math.min(curve.points[0].heelDeg,start??0),maxX=curve.points.at(-1)!.heelDeg;
 const low=Math.min(0,...curve.points.map(p=>p.gzCorrected)),high=Math.max(gust,...curve.points.map(p=>p.gzCorrected),.1);
 const minY=low-.1*(high-low),maxY=high+.1*(high-low);
 const x=(v:number)=>65+610*(v-minX)/(maxX-minX),y=(v:number)=>265-225*(v-minY)/(maxY-minY);
 const polygon=(points:typeof curve.points)=>`${x(points[0].heelDeg)},${y(gust)} ${points.map(p=>`${x(p.heelDeg)},${y(p.gzCorrected)}`).join(' ')} ${x(points.at(-1)!.heelDeg)},${y(gust)}`;
 return <section aria-label={t('Wind and rolling calculation')}>
 <h4>{t('Wind and rolling calculation')}</h4>
 <p role="status"><strong>{t('Numerical weather assessment')}: {t(assessment.numericalStatus)}</strong> · {t(assessment.basis)}</p>
 <div style={{overflowX:'auto'}}><table><thead><tr>{['Criterion','Calculated','Limit','Numerical margin','Assessment'].map(h=><th key={h}>{t(h)}</th>)}</tr></thead><tbody>{assessment.checks.map(r=><tr key={r.id}><th scope="row">{t(r.label)}</th>{[r.value,r.limit,r.margin].map((v,i)=><td key={i}>{v===undefined?'—':`${v.toFixed(5)} ${r.unit}`}</td>)}<td>{t(r.status)}<p className="muted">{t(r.reason)}</p></td></tr>)}</tbody></table></div>
 {assessment.missing.length>0&&<div><strong>{t('Missing or invalid inputs')}</strong><ul>{assessment.missing.map(m=><li key={m}>{t(m)}</li>)}</ul></div>}
 <p>{t('Numerical limits apply to the selected wind profile and entered inputs. They do not confirm the profile, flooding boundaries or overall compliance.')}</p>
 <button type="button" onClick={downloadAssessment}>{t('Download weather assessment')}</button>
 {derivation&&<details><summary>{t('Derived data — educational estimates')}</summary>
 <p>{t('Symmetric KN matches 19 stability-booklet port cases within 0.001121 m; 18 ballast-plan cases differ by up to 0.006692 m. This supports an estimate, not a new source table.')}</p>
 <label><input type="checkbox" checked={estimatePort} onChange={e=>setEstimatePort(e.target.checked)}/>{t('Use symmetry-based port estimate in this weather calculation')}</label>
 <p>{t('KN is reflected; GZ is recalculated with the original TCG. Port flooding limits are not reflected. This option does not change the live 3D attitude or source dataset.')}</p>
 {geometry&&<dl><dt>{t('Estimated CB using LPP and appendage factor 1.0028')}</dt><dd>{geometry.cb.toFixed(6)}</dd><dt>{t('Wall-sided deck-edge angle estimate (°)')}</dt><dd>{geometry.deckAngle.toFixed(3)}</dd></dl>}
 <p>{t('CB uses displacement/density divided by 1.0028 × LPP × breadth × moulded draft. The volume convention is an assumption. The deck estimate uses atan((depth − draft)/(breadth/2)); it omits trim, sinkage and actual deck shape. Neither estimate is applied automatically.')}</p>
 <p>{t('Condition-specific LWL remains unavailable. The design value 123.950 m and reconstructed hull do not establish it for other drafts. Open vent coordinates remain qualified by the source annotation; no exact flooding angle is derived.')}</p>
 </details>}
 {estimatePort&&<p role="status"><strong>{t('Estimated port curve active — flooding coverage remains unknown.')}</strong></p>}
 <p>{t('Gust wind lever (m)')}: <strong>{gust.toFixed(6)}</strong> · lw₂ = 1.5 × lw₁</p>
 <details open><summary>{t('Roll and immersion inputs')}</summary>
 <p>{t('Assessment inputs and assumptions are saved with the condition. Changed loading inputs require a new assessment; saved values from another condition are not applied.')}</p>
 <p>{t('The manual lists LWL 123.950 m at design draught (PDF 34), not a curve across conditions. Do not substitute LPP or use the summer block coefficient for every condition. Bilge-keel area: PDF 80.')}</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
 {([['lwl','Waterline length LWL (m)'],['cb','Block coefficient CB'],['bilge','Bilge-keel area (m²)'],['deck','Deck-edge immersion angle (°)'],['flood','Downflooding limit (°)']] as const).map(([key,label])=><label key={key}>{t(label)}<input type="number" step="any" min="0" value={effectiveValues[key]} onChange={e=>setValues({...effectiveValues,[key]:e.target.value})}/></label>)}
 </div><label>{t('Source or assumption for these inputs')}<input type="text" value={inputSource} onChange={e=>setInputSource(e.target.value)} placeholder={t('Document, page and condition, or estimation method')}/></label><p>{t('Inputs are operator supplied, not verified approval data. Do not use a sampled flooding threshold as the exact flooding onset.')}</p>
 </details>
 {roll?<><dl><dt>{t('Estimated roll period (s)')}</dt><dd>{roll.period.toFixed(3)}</dd><dt>{t('Windward roll amplitude (°)')}</dt><dd>{roll.angle.toFixed(3)}</dd>{start!==undefined&&<><dt>{t('Windward starting angle (°)')}</dt><dd>{start.toFixed(3)}</dd></>}</dl><details><summary>{t('Roll coefficients')}</summary><p>φ₁ = 109 k X₁ X₂ √(r s)</p><p>k = {roll.k.toFixed(5)} · X₁ = {roll.x1.toFixed(5)} · X₂ = {roll.x2.toFixed(5)} · r = {roll.r.toFixed(5)} · s = {roll.s.toFixed(5)}</p><p>{t('Physical KG is used in r; corrected GM is used in the approximate period. No active anti-roll credit is applied.')}</p></details></>:<p role="status">{t(rollError)}</p>}
 {limit!==undefined&&eq.angle!==undefined?<p>{t('Operator-input heel limit (°)')}: {limit.toFixed(3)} · {t('Numerical margin')}: {(limit-Math.abs(eq.angle)).toFixed(3)}°</p>:<p>{t('Deck-edge comparison unavailable until an immersion angle is supplied.')}</p>}
 <figure style={{margin:'16px 0'}}>
 <svg viewBox="0 0 720 315" role="img" aria-label={t('Corrected GZ with steady and gust wind levers')} style={{width:'100%',maxWidth:850,background:'#f8fafc',borderRadius:8}}>
 <text x="65" y="22" fill="#334155" fontSize="13">{t('Lever (m)')}</text>
 {[0,1,2,3,4].map(i=>{const v=minY+(maxY-minY)*i/4;return <g key={i}><line x1="65" x2="675" y1={y(v)} y2={y(v)} stroke="#cbd5e1"/><text x="57" y={y(v)+4} textAnchor="end" fontSize="12" fill="#334155">{v.toFixed(2)}</text></g>;})}
 {areas&&<><polygon points={polygon(areas.aPoints)} fill="#eab308" opacity=".3"/><polygon points={polygon(areas.bPoints)} fill="#0d9488" opacity=".25"/></>}
 <line x1="65" x2="675" y1={y(steady)} y2={y(steady)} stroke="#2563eb" strokeDasharray="7 4"/>
 <line x1="65" x2="675" y1={y(gust)} y2={y(gust)} stroke="#a21caf" strokeDasharray="3 4"/>
 <polyline points={curve.points.map(p=>`${x(p.heelDeg)},${y(p.gzCorrected)}`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="2.5"/>
 {start!==undefined&&<line x1={x(start)} x2={x(start)} y1="40" y2="265" stroke="#b45309" strokeDasharray="5 4"/>}
 {[0,1,2,3,4].map(i=>{const v=minX+(maxX-minX)*i/4;return <text key={i} x={x(v)} y="283" textAnchor="middle" fill="#334155" fontSize="12">{v.toFixed(1)}°</text>;})}
 <text x="370" y="307" textAnchor="middle" fill="#334155" fontSize="13">{t('Heel angle (source sign)')}</text>
 </svg>
 <figcaption>{t('Solid teal: corrected GZ. Blue dashed: steady wind. Purple dotted: gust. Orange vertical: windward starting angle. Blank regions have no GZ data.')}</figcaption>
 </figure>
 {areas?<dl><dt>{t('Area a (m·rad)')}</dt><dd>{areas.a.toFixed(6)}</dd><dt>{t('Area b (m·rad)')}</dt><dd>{areas.b.toFixed(6)}</dd><dt>b − a (m·rad)</dt><dd>{areas.margin.toFixed(6)}</dd><dt>{t('Energy integration limit (°)')}</dt><dd>{areas.end.toFixed(3)}</dd></dl>:<p role="status">{t(areaError||'Energy areas require valid roll inputs and a downflooding limit.')}</p>}
 <p>{t('Energy shading appears only when the entire integration interval is covered. Yellow: area a; teal: area b. Port estimation is available only through the explicit educational option; no angle extrapolation or assumed 50° flooding limit. Numerical estimates do not establish compliance.')}</p>
 <p><a href="https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf" target="_blank" rel="noreferrer">MSC.267(85) · Part A §2.3.2–2.3.5</a></p>
 </section>;
}
