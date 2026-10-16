import {useEffect,useMemo,useState} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {useLanguage} from '../app/language-context';
import {useReference} from '../app/reference-context';
import {loadStudyLibrary,studyGroups,studySample,studyPointInModel,studyGzPlot,type StudyLibrary} from '../visualization/documented-studies';
import {bodyPoint,sceneCondition,visualHullFor} from '../visualization/ship-scene-data';
import {Ship3DCanvas} from './ship-3d-canvas';
const colors=['#7651ad','#177b91','#bd6b2e','#456db4','#7d6d25','#914a67'];
export function DocumentedCasePlayback({ship,onBack}:{ship:ShipModelPackage;onBack:()=>void}){
 const {t,language}=useLanguage();const ref=useReference();
 const [loaded,setLoaded]=useState<{library?:StudyLibrary;error?:string}>({});const [retry,setRetry]=useState(0);
 const [id,setId]=useState('004-269'),[family,setFamily]=useState(''),[search,setSearch]=useState('');
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[selected,setSelected]=useState(''),[showG,setShowG]=useState(false);
 const [category,setCategory]=useState(''),[includeEmpty,setIncludeEmpty]=useState(false);
 const [distributionOpen,setDistributionOpen]=useState(false);
 const numberFormat=useMemo(()=>new Intl.NumberFormat(language,{maximumFractionDigits:3}),[language]);
 const [settingsTarget,setSettingsTarget]=useState<HTMLDivElement|null>(null);
 useEffect(()=>{let active=true;setLoaded({});loadStudyLibrary(ship).then(library=>{if(active)setLoaded({library});},e=>{if(active)setLoaded({error:String(e)});});return()=>{active=false;};},[ship,retry]);
 const library=loaded.library;
 const c=library?.cases.find(c=>c.id===id)??library?.cases[0];
 useEffect(()=>{setStep(0);setPlaying(false);setSelected('');setCategory('');},[c?.id]);
 useEffect(()=>{
  if(!playing||!c)return;
  const timer=window.setInterval(()=>setStep(n=>{if(n>=c.trajectory.length-1){setPlaying(false);return n;}return n+1;}),1400);
  const pause=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',pause);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',pause);};
 },[playing,c]);
 const plot=useMemo(()=>c?studyGzPlot(c):undefined,[c]);
 const maxMass=useMemo(()=>Math.max(1,...(c?.items.map(r=>r.mass)??[])),[c]);
 const groups=useMemo(()=>c?studyGroups(c):[],[c]);
 const items=useMemo(()=>c?.items.filter(r=>(includeEmpty||r.mass>0)&&(!category||r.group===category))??[],[c,category,includeEmpty]);
 const markers=useMemo(()=>items.map(r=>({id:r.id,name:r.name,label:`${r.name}\n${r.group} · ${r.mass} t`,markerColor:colors[Math.max(0,groups.findIndex(g=>g.group===r.group))%colors.length],point:bodyPoint(ship,studyPointInModel(ship,r))})),[items,groups,ship]);
 const hull=useMemo(()=>visualHullFor(ship),[ship]);
 const sample=useMemo(()=>c?studySample(c,Math.min(step,c.trajectory.length-1)):undefined,[c,step]);
 const data=useMemo(()=>{
  if(!c||!sample)return undefined;
  // The table's midship moulded draft and signed trim drive an explicitly illustrative
  // pose. This does not claim verified heeled AP/FP draft-mark readings or mesh volume.
  const aft=sample.draft-sample.trim/2,forward=sample.draft+sample.trim/2;
  if(Math.min(aft,forward)<0||Math.max(aft,forward)>hull.depth)return undefined;
  return {...sceneCondition(ship,ref.settings,studyPointInModel(ship,c.total),aft,forward),heelDeg:sample.heel,calculated:true};
 },[ship,ref.settings,c,sample,hull.depth]);
 const fmt=(v:number|undefined|null)=>v===undefined||v===null?'—':numberFormat.format(Math.abs(v)<.0005?0:v);
 const selectedRow=c?.items.find(r=>r.id===selected);
 const filtered=library?.cases.filter(c=>(!family||c.family===family)&&`${c.name} ${c.source} ${c.id}`.toLowerCase().includes(search.toLowerCase()))??[];
 const choose=(next:string)=>{setId(next);setStep(0);setPlaying(false);setSelected('');};
 return <section className="documented-study" aria-label={t('Documented-case study')}>
 <div className="scene-toolbar"><h2>{t('Documented-case study')}</h2><button onClick={onBack}>{t('Return to current condition')}</button></div>
 <p className="scene-model-summary"><strong>{t('Source case — separate from your current loading')}</strong><br/>{t('Playback never changes your cargo plan, tanks or assessment. Published weights and attitude samples are retained, including source rounding.')}</p>
 {loaded.error?<p role="alert">{loaded.error} <button onClick={()=>setRetry(n=>n+1)}>{t('Retry')}</button></p>:!c?<p role="status">{t('Loading documented cases…')}</p>:<>
 <div className="study-picker"><label>{t('Find study case')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>{t('Study group')}<select value={family} onChange={e=>setFamily(e.target.value)}><option value="">{t('All groups')}</option>{[...new Set(library!.cases.map(c=>c.family))].map(f=><option key={f} value={f}>{t(f)}</option>)}</select></label><label>{t('Documented condition')}<select value={filtered.some(x=>x.id===c.id)?c.id:''} onChange={e=>choose(e.target.value)}>{!filtered.some(x=>x.id===c.id)&&<option value="">{t('Choose a condition')}</option>}{filtered.map(x=><option key={x.id} value={x.id}>{x.name} · {x.source.slice(0,3)} p{x.trajectoryPage}</option>)}</select></label></div>
 {!filtered.length&&<p role="status">{t('No matching study cases. The current study remains displayed.')}</p>}
 <h3>{c.name}</h3>{c.qualifications.map(q=><p className="warnings" key={q}>{t(q)}</p>)}
 <dl className="study-totals">{[['Documented displacement',c.total.mass,'t'],['LCG',c.total.lcg,'m'],['Physical VCG',c.total.kg,'m'],['TCG',c.total.tcg,'m'],['FSM',c.total.fsm,'t·m'],['Water density',c.waterDensity,'t/m³']].map(([label,value,unit])=><div key={label}><dt>{t(String(label))}</dt><dd>{fmt(Number(value))} {unit}</dd></div>)}</dl>
 <p className="muted">{t('Source centres: AP / centreline / baseline; positive to starboard. Printed source totals are not recalculated tank-table values.')}</p>
 <div className="scene-toolbar"><button onClick={()=>{if(step===c.trajectory.length-1)setStep(0);setPlaying(v=>!v);}}>{t(playing?'Pause playback':'Play documented samples')}</button><button disabled={step===0} onClick={()=>{setPlaying(false);setStep(n=>n-1);}}>{t('Previous sample')}</button><button disabled={step===c.trajectory.length-1} onClick={()=>{setPlaying(false);setStep(n=>n+1);}}>{t('Next sample')}</button><label>{t('Documented heel sample')}<input type="range" aria-label={t('Documented heel sample')} min={0} max={c.trajectory.length-1} step={1} value={step} onChange={e=>{setPlaying(false);setStep(Number(e.target.value));}}/></label></div>
 <section className="scene-readouts" aria-label={t('Documented attitude')}><dl>{[['Source heel',sample!.heel*ref.heelSign,'°'],['Moulded midship draft',sample!.draft,'m'],['Source trim (FP − AP)',sample!.trim,'m'],['Source GZ',sample!.gz,'m']].map(([label,value,unit])=><div key={label}><dt>{t(String(label))}</dt><dd>{fmt(Number(value))} {unit}</dd></div>)}</dl><p>{t('Printed samples only; no interpolation. This is a prescribed heel sweep, not free motion or an equilibrium at every angle.')} {t('Source static heel')}: {fmt(c.staticHeel===null?null:c.staticHeel*ref.heelSign)}°.</p></section>
 <p className="muted">{t('Reconstructed geometry follows the documented draft, trim and heel. Its placement is illustrative: displaced mesh volume and heeled draft-mark readings are not verified. Cargo, tanks and panels are source CG markers, not invented individual shapes.')}</p>
 <div className="scene-workspace"><div className="scene-column">{data?<Ship3DCanvas settingsTarget={settingsTarget} draftsUnavailable panelMode="ashore" hull={hull} data={data} weights={markers} selectedWeight={selected} onSelectWeight={setSelected} selected={showG} onSelect={()=>setShowG(v=>!v)}/>:<p role="status">{t('This documented sample cannot be represented by the display hull. Numerical values remain available.')}</p>}
 <details><summary>{t('Source GZ curve')}</summary><svg viewBox="0 0 700 250" role="img" aria-label={t('Source GZ curve')}><title>{t('Source GZ curve')} · GZ (m)</title>
 <line x1="70" y1="30" x2="70" y2="205" stroke="#777"/>
 <line x1="70" y1={plot!.zeroY} x2="680" y2={plot!.zeroY} stroke="#555" strokeDasharray="5 3"/>
 {plot!.ticks.map(tick=><g key={tick.value}><line x1="65" x2="70" y1={tick.y} y2={tick.y} stroke="#555"/><text x="60" y={tick.y+4} textAnchor="end" fontSize="12">{fmt(tick.value)}</text></g>)}
 <text x="10" y="16" fontSize="12">GZ (m)</text><text x="675" y={plot!.zeroY-5} textAnchor="end" fontSize="12">GZ = 0</text>
 <polyline points={plot!.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#167e96" strokeWidth="3"/>{plot!.points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===step?6:3} fill={i===step?'#bf1674':'#167e96'}/>)}
 <text x="70" y="235">0°</text><text x="600" y="235">{c.direction} {c.trajectory.at(-1)![0]}°</text></svg></details>
 </div><aside className="scene-inspector"><details><summary>{t('Display settings')}</summary><div ref={setSettingsTarget}/></details><h3>{t('Source weight inspection')}</h3><label>{t('Weight group')}<select value={category} onChange={e=>{setCategory(e.target.value);setSelected('');}}><option value="">{t('All groups')}</option>{groups.map(g=><option key={g.group} value={g.group}>{g.group} · {fmt(g.mass)} t</option>)}</select></label><label><input type="checkbox" checked={includeEmpty} onChange={e=>setIncludeEmpty(e.target.checked)}/>{t('Include zero-mass items')}</label><label>{t('Inspect onboard weight')}<select value={items.some(r=>r.id===selected)?selected:''} onChange={e=>setSelected(e.target.value)}><option value="">{t('Select an item')}</option>{items.map(r=><option key={r.id} value={r.id}>{r.name} · {fmt(r.mass)} t</option>)}</select></label><button disabled={!selected} onClick={()=>setSelected('')}>{t('Clear selection')}</button>
 {selectedRow&&<section><h3>{selectedRow.name}</h3><p>{selectedRow.group} · {t('Source CG marker')}</p><dl className="summary-grid">{[['Mass',selectedRow.mass,'t'],['LCG',selectedRow.lcg,'m'],['TCG',selectedRow.tcg,'m'],['Physical VCG',selectedRow.kg,'m'],['Fill',selectedRow.fill,'%'],['Liquid density',selectedRow.density,'t/m³'],[selectedRow.flag==='#'?'Grain heeling moment':'FSM',selectedRow.fsm,'t·m']].map(([label,value,unit])=><div key={label}><dt>{t(String(label))}</dt><dd>{fmt(value===null?null:Number(value))} {unit}</dd></div>)}</dl><p>{t('PDF page')}: {selectedRow.page}</p><p>{selectedRow.sourceText}</p></section>}
 {showG&&<p>G: LCG {fmt(c.total.lcg)} / TCG {fmt(c.total.tcg)} / KG {fmt(c.total.kg)} m</p>}
 </aside></div>
 <details className="panel" onToggle={e=>setDistributionOpen(e.currentTarget.open)}><summary>{t('Cargo plan, tanks and weight distribution')}</summary>{distributionOpen&&<><p>{t('The diagrams below are source arrangements where supplied. Aggregate cargo rows provide mass and position, not individual unit dimensions or a complete editable packing plan.')}</p>
 <h3>{t('Longitudinal CG distribution')}</h3><svg viewBox="0 0 900 190" role="img" aria-label={t('Longitudinal CG distribution')}><line x1="20" y1="165" x2="880" y2="165" stroke="#777"/>{c.items.filter(r=>r.mass>0).map(r=><g key={r.id}><title>{r.group}: {r.name}, {r.mass} t, LCG {r.lcg} m</title><line x1={20+r.lcg/ship.manifest.principalDimensions.lbp*840} x2={20+r.lcg/ship.manifest.principalDimensions.lbp*840} y1="165" y2={165-145*r.mass/maxMass} stroke={colors[groups.findIndex(g=>g.group===r.group)%colors.length]} strokeWidth="4"/></g>)}<text x="20" y="185">AP · 0 m</text><text x="760" y="185">FP · {ship.manifest.principalDimensions.lbp} m</text></svg><p>{t('Bars show weight at its LCG, not continuous hull loading or cargo dimensions.')}</p>
 {c.arrangement.length?c.arrangement.map(a=><figure key={a.page}><a href={a.image} target="_blank" rel="noreferrer"><img className="study-source-image" loading="lazy" src={a.image} alt={`${c.name} · ${t('Source arrangement')} · p${a.page}`}/></a><figcaption>{c.source} · {t('PDF page')} {a.page}</figcaption></figure>):<p>{t('No separate arrangement drawing accompanies this case. Use the source weight distribution below.')}</p>}
 {groups.map(g=><details key={g.group}><summary>{g.group} · {fmt(g.mass)} t · {g.items.length} {t('items')}</summary><div className="table-scroll"><table><thead><tr>{['Item','Mass','LCG','TCG','VCG','Fill','Density','FSM / grain moment','PDF page'].map(h=><th key={h}>{t(h)}</th>)}</tr></thead><tbody>{g.items.map(r=><tr key={r.id}><td><button onClick={()=>{setCategory('');setIncludeEmpty(true);setSelected(r.id);}}>{r.name}</button></td>{[r.mass,r.lcg,r.tcg,r.kg,r.fill,r.density,r.fsm,r.page].map((v,i)=><td key={i}>{fmt(v)}{i===6?r.flag:''}</td>)}</tr>)}</tbody></table></div></details>)}
 <p>{t('! = source FSM treatment flag; # = grain heeling moment, not liquid FSM. Source figures are retained without substituting the current tank tables.')}</p></>}</details>
 <details className="panel"><summary>{t('Source record and qualifications')}</summary><p>{c.source} · {t('Weight pages')}: {c.weightPages.join(', ')} · {t('Trajectory page')}: {c.trajectoryPage}</p><p>SHA-256: <code className="study-hash">{library!.sources[c.source].sha256}</code></p>{c.strengthPages.length>0&&<p>006_STRENGHT_LOADING_MANUAL.pdf · {t('Corresponding condition pages')}: {c.strengthPages.join(', ')}</p>}<p>{t('Weight-row rounding difference')}: {fmt(c.reconciliation.massDifferenceTonnes)} t. {t('The source summary is historical evidence, not the live assessment.')}</p><pre className="study-source-text">{c.summaryText}</pre><p>{library!.note}</p></details>
 </>}
 </section>;
}
