import {GuideLink} from '../app/user-guide';
import {CapacityCargoPicker} from './capacity-cargo-picker';
import {CapacityNumber} from './capacity-number';
import {FieldLabel} from './field-label';
import {vesselCapacityLimit,resolveCapacityLimit} from '../app/capacity-limit';
import {NumberInput} from './number-input';
import {useMemo,useState,useEffect} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {WeightDraft} from '../app/loading-state';
import {cargoSurfaces} from '../app/cargo-surfaces';
import {cargoCapacity,parseCapacitySettings,capacityCargoTemplate,type CapacityCargoTemplate,type CapacitySettings} from '../app/cargo-capacity';
import type {TweenDeckMode} from '../app/tween-deck';
import {useLanguage} from '../app/language-context';
export function CargoCapacity({ship,weights,deck,density,onDensityChange,settings,onChange,onLayout,onUseCargo,ready}:{ship:ShipModelPackage;weights:WeightDraft[];deck:TweenDeckMode;density?:number;onDensityChange:(value:number|undefined)=>void;settings:CapacitySettings;onChange:(s:CapacitySettings)=>void;onLayout:()=>void;onUseCargo:(cargo:CapacityCargoTemplate)=>void;ready:boolean}){
 const {t,language}=useLanguage();const [error,setError]=useState('');
 const limit=useMemo(()=>vesselCapacityLimit(ship),[ship]);
 const manual=settings.limitMode==='manual'||settings.limitMode===undefined&&settings.limit!==undefined||!limit;
 const [resolved,setResolved]=useState<{ship:ShipModelPackage;density:number;mass?:number;error?:string}>();
 useEffect(()=>{let active=true;if(manual||!limit||density===undefined||!Number.isFinite(density)||density<=0)return;resolveCapacityLimit(ship,limit,density).then(mass=>{if(active)setResolved({ship,density,mass});}).catch(e=>{if(active)setResolved({ship,density,error:(e as Error).message});});return()=>{active=false;};},[ship,limit,density,manual]);
 const current=resolved?.ship===ship&&resolved?.density===density?resolved:undefined;
 const effective=useMemo(()=>manual?settings:{...settings,limit:current?.mass,limitSource:limit?.source??'',limitDensity:density},[manual,settings,current,limit,density]);
 const areas=useMemo(()=>cargoSurfaces(ship,deck),[ship,deck]);
 const result=useMemo(()=>cargoCapacity(ship,weights,areas,effective,density),[ship,weights,areas,effective,density]);
 const fmt=(n:number|undefined)=>n===undefined?'—':new Intl.NumberFormat(language,{maximumFractionDigits:3}).format(n);
 const change=(patch:Partial<CapacitySettings>)=>{try{onChange(parseCapacitySettings({...settings,...patch}));setError('');}catch(e){setError((e as Error).message);}};
 const number=(key:'limit'|'reserve'|'supportAllowance'|'unitMass'|'length'|'width'|'height'|'stowageFactor'|'quantity',label:string,help?:string)=><label>{help?<FieldLabel label={label} help={help}/>:t(label)}<CapacityNumber aria-label={t(label)} min={['reserve','supportAllowance','quantity'].includes(key)?0:0.000001} step={key==='quantity'?1:'any'} value={settings[key]} zeroWhenEmpty={key==='reserve'||key==='supportAllowance'} onChange={value=>change({[key]:value,...(key==='limit'?{limitDensity:density}:{})})}/></label>;
 const template=capacityCargoTemplate(settings,areas);
 return <section className="panel capacity-panel"><div className="section-actions"><h2>{t('Cargo capacity')}</h2><button onClick={onLayout}>{t('Open cargo layout')}</button></div>
 <p>{t('Plan additional cargo against the current loading condition. Supports, tanks and other onboard weights are included once.')}</p>

 <dl className="curve-inputs">
 <div><dt>{t('Remaining additional mass (t)')}</dt><dd>{ready&&result.remainingMass!==undefined?fmt(result.remainingMass):t('Complete loading weights and limit settings')}</dd></div>
 <div><dt>{t('Remaining volume (m³)')}</dt><dd>{result.remainingVolume!==undefined?fmt(result.remainingVolume):t('Check cargo locations and area heights')}</dd></div>
 <div><dt>{t('Limiting factor')}</dt><dd>{t(ready&&result.limiting!=='Incomplete'?result.limiting:'Enter cargo details to compare weight and space')}</dd></div>
 </dl>
 <p className="planner-note">{t('Space is a geometric estimate. Verify fit, access and ventilation in Cargo layout.')}</p>
 <h3>{t('Cargo to add')}</h3><CapacityCargoPicker settings={settings} weights={weights} onChange={value=>change(value)}/><div className="curve-inputs"><label>{t('Loading area')}<select value={settings.areaId} onChange={e=>change({areaId:e.target.value})}><option value="">{t('All holds')}</option>{areas.map((a,i)=><option key={a.id??i} value={a.id??a.name}>{t(a.name)}</option>)}</select></label><label>{t('Volume basis')}<select value={settings.method} onChange={e=>change({method:e.target.value as 'package'|'sf'})}><option value="package">{t('Package dimensions')}</option><option value="sf">{t('Stowage factor')}</option></select></label>{number('unitMass','Gross package mass (t)',settings.method==='sf'?'Optional when using a stowage factor: capacity in tonnes uses m³/t directly. Enter gross mass per package, including packaging and pallet tare, to calculate package counts or send cargo to Cargo layout.':undefined)}{settings.method==='package'?<>{number('length','Package length (m)')}{number('width','Package width (m)')}{number('height','Package height (m)')}</>:number('stowageFactor','Stowage factor (m³/t)')}</div>
 {settings.method==='sf'&&<details><summary>{t('Package dimensions for Cargo layout (optional for capacity)')}</summary><p>{t('A stowage factor estimates volume but does not define a cargo shape.')}</p><div className="curve-inputs">{number('length','Package length (m)')}{number('width','Package width (m)')}{number('height','Package height (m)')}</div></details>}
 <section aria-label={t('Full and Down planning')}><h3>{t('Full and Down planning')}</h3>
 <dl className="curve-inputs">
 <div><dt>{t('Cargo stowage factor (m³/t)')}</dt><dd>{fmt(result.cargoStowageFactor)}</dd></div>
 <div><dt>{t('Critical stowage factor (m³/t)')}</dt><dd>{fmt(ready?result.criticalStowageFactor:undefined)}</dd></div>
 <div><dt>{t('Loading outcome at maximum intake')}</dt><dd>{t(ready?result.loadingOutcome:'Incomplete')}</dd></div>
 <div><dt>{t('Maximum additional cargo (t)')}</dt><dd>{fmt(ready?result.maximumCargoMass:undefined)}</dd></div>
 <div><dt>{t('Unused weight capacity (t)')}</dt><dd>{fmt(ready?result.unusedMass:undefined)}</dd></div>
 <div><dt>{t('Unused volume (m³)')}</dt><dd>{fmt(ready?result.unusedVolume:undefined)}</dd></div>
 </dl>
 <p>{t('Full: space runs out first. Down: weight capacity runs out first. Full and Down: both limits are reached together.')}</p>
 <p className="muted">{t('For the selected space and remaining ship weight capacity, assuming only this additional cargo. This is a planning estimate, not a prediction of actual draught or approved loading.')}</p>
 <p><GuideLink topic="capacity">{t('Stowage factor basis')}</GuideLink></p>
 </section>
 <details open={settings.quantity!==undefined||undefined}><summary>{t('Check a requested quantity (optional)')}</summary>
 {number('quantity','Packages to add','Optional: leave blank to estimate maximum capacity. Enter a quantity to check whether that many additional packages fit.')}
 <p>{t('Leave blank to calculate maximum capacity. A requested quantity does not add cargo or restrict the planner.')}</p>
 </details>
 <p><strong>{t('Estimated additional packages')}: {ready&&result.additionalUnits!==undefined?fmt(result.additionalUnits):t(settings.method==='sf'&&!settings.unitMass?'Add package mass only if you need a package count.':'Enter cargo details to compare weight and space')}</strong></p>
 <details><summary>{t('Package calculation details')}</summary><dl className="curve-inputs">{[...(settings.quantity===undefined?[]:[['Required additional mass (t)',result.requiredMass],['Required additional volume (m³)',result.requiredVolume]]),['Packages allowed by weight',ready?result.weightUnits:undefined],['Packages allowed by volume',ready?result.volumeUnits:undefined]].map(([label,value])=><div key={String(label)}><dt>{t(String(label))}</dt><dd>{value===undefined?t('More inputs needed'):fmt(value as number)}</dd></div>)}</dl></details>
 {ready&&(result.remainingMass!==undefined&&result.remainingMass<0||result.remainingVolume!==undefined&&result.remainingVolume<0||result.additionalUnits!==undefined&&settings.quantity!==undefined&&settings.quantity>result.additionalUnits)&&<p role="status" className="error">{t('The current plan or proposed addition exceeds the planning capacity.')}</p>}
 <button disabled={!template||!ready} onClick={()=>{if(template)onUseCargo(template);}}>{t('Use this cargo in the planner')}</button>
 <p role="status">{t(!ready?'Wait for the loading condition to finish loading.':!template?'To place individual packages, choose a loading area and enter valid mass, dimensions and cargo properties. Capacity estimates do not require this handoff.':'Opens Add cargo with this cargo type and its properties. Place each unit to update the loading condition.')}</p>
 <details><summary>{t('Planning assumptions')}</summary> <div className="curve-inputs"><NumberInput label={t('Surrounding water density (t/m³)')} value={density} onChange={onDensityChange} min={0.001}/><label>{t('Capacity limit basis')}<select value={manual?'manual':'documented'} onChange={e=>change({limitMode:e.target.value as 'manual'|'documented'})}>{limit&&<option value="documented">{t(limit.label)}</option>}<option value="manual">{t('Manual limit override')}</option></select></label>{number('reserve','Additional mass reserve (t)','Optional: extra mass kept available when planning cargo. Leave blank for zero; this does not add a weight to the ship.')}{number('supportAllowance','Additional unmodelled support allowance (t)','Optional: reserve mass for supports not yet placed in the layout. Leave blank for zero. Reduce this allowance as supports are modelled to avoid reserving their mass twice.')}</div>
 {!manual&&limit&&<><p><strong>{t('Calculated displacement at reference draught (t)')}: {fmt(current?.mass)}</strong> · {t('Reference draught (m)')}: {fmt(limit.draft)}</p><details><summary>{t('Source and applicability')}</summary><p>{t(limit.source)}</p><p>{t(limit.datum)}</p><p>{t(limit.applicability)}</p><p>{t('Displacement is recalculated from the upright hydrostatic table at this fixed draught and the selected water density. This does not apply a fresh-water load-line allowance.')}</p></details>{current?.error&&<p role="status">{t(current.error)}</p>}</>}
 {manual&&<><div className="curve-inputs">{number('limit','Displacement limit (t)')}<label>{t('Override source and reason')}<input value={settings.limitSource} onChange={e=>change({limitSource:e.target.value})}/></label></div><p>{t('Limit recorded at water density (t/m³)')}: {fmt(settings.limitDensity)}. {t('A density change requires reconfirming the applicable limit.')}<button disabled={settings.limit===undefined||density===undefined||density<=0} onClick={()=>change({limitDensity:density})}>{t('Confirm limit for current water density')}</button></p></>}
 <p>{t('The extra support allowance covers only supports not already placed.')}</p>
 {!result.limitCurrent&&<p role="status">{t(manual?'Enter the displacement limit, its source and confirm the current water density.':'Reference capacity is awaiting valid water density and hydrostatic data.')}</p>}
</details>
 <details><summary>{t('Current weight breakdown')}</summary> {!ready||!result.massesComplete?<p role="status">{t('Complete the loading weights to calculate remaining capacity.')}</p>:<dl className="curve-inputs">{[['Cargo (t)',result.cargo],['Placed supports (t)',result.supports],['Other onboard weights (t)',result.other],['Current displacement (t)',result.currentMass]].map(([label,value])=><div key={String(label)}><dt>{t(String(label))}</dt><dd>{value===undefined?t('More inputs needed'):fmt(value as number)}</dd></div>)}</dl>}
</details>
 <details><summary>{t('Space by loading area')}</summary> <h3>{t('Space by loading area')}</h3><p>{t('Estimated from planning outlines and clear heights, not certified hold volumes. Occupied volume sums cargo and support envelopes; packing, access, ventilation and collision checks remain in Cargo layout. Hatch tops are excluded from the all-holds total.')}</p>
 <div className="table-scroll"><table><thead><tr>{['Loading area','Planning volume (m³)','Occupied volume (m³)','Remaining volume (m³)'].map(x=><th key={x}>{t(x)}</th>)}</tr></thead><tbody>{result.rows.map((r,i)=><tr key={r.area.id??i}><th>{t(r.area.name)}</th><td>{fmt(r.total)}</td><td>{fmt(r.occupied)}</td><td>{fmt(result.unlocated?undefined:r.remaining)}</td></tr>)}</tbody></table></div>
 {result.unlocated>0&&<p role="status">{t('Cargo or supports lack an unambiguous layout location. Volume capacity is incomplete.')}</p>}
</details>
 <p>{t('This proposal adds no weights. Place the cargo in Cargo layout to update the condition. Capacity estimates do not establish stability, deck strength or securing compliance.')}</p>{error&&<p role="status">{t(error)}</p>}
 </section>;
}
