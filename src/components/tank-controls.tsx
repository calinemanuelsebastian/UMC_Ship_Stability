import {AutoBallast} from './auto-ballast';
import type {ScenarioState} from '../app/saved-scenarios';
import {editTankContents,tankAmount,type TankUnit,type TankAction} from '../app/onboard-operations';
import {onboardTankCatalog} from '../app/loading-workflow';
import {applyTankPreset} from '../app/departure-presets';
import {BallastPlan} from './ballast-plan';
import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {WeightDraft} from '../app/loading-state';
import {tankGroups,tankWeight,roleOf,type TankCatalog,type Tank} from '../app/tank-operations';
import {useLanguage} from '../app/language-context';
const names={ballast:'Ballast water',hfo:'Heavy fuel oil',mdo:'Diesel oil',freshwater:'Fresh water',lube:'Lubricating oil',misc:'Other tank liquids'};
function TankEditor({tank,weight,referenceMass,apply}:{tank:Tank;weight:WeightDraft;referenceMass?:number;apply:(w:WeightDraft)=>void}){
 const {t}=useLanguage();
 const [entry,setEntry]=useState({unit:'volume' as TankUnit,action:'set' as TankAction,amount:String(weight.tank!.volumeM3),density:String(weight.tank!.density)});
 const {unit,action,amount,density}=entry;
 const [error,setError]=useState('');
 const setAmount=(amount:string)=>setEntry(e=>({...e,amount}));
 const setDensity=(density:string)=>setEntry(e=>({...e,density}));
 const setAction=(action:TankAction)=>setEntry(e=>({...e,action,amount:String(action==='consume'?0:tankAmount(tank,weight.tank!,e.unit)),density:String(weight.tank!.density)}));
 const setUnit=(unit:TankUnit)=>setEntry(e=>{
  const rho=Number(e.density),amount=Number(e.amount),volume=e.unit==='mass'?amount/rho:e.unit==='percent'?amount/100*tank.capacityM3:amount;
  return {...e,unit,amount:e.amount.trim()&&Number.isFinite(volume)&&Number.isFinite(rho)&&rho>0?String(tankAmount(tank,{id:tank.id,volumeM3:volume,density:rho},unit)):''};
 });
 const currentVolume=weight.tank!.volumeM3,currentDensity=weight.tank!.density;
 useEffect(()=>{setEntry(e=>({...e,amount:String(e.action==='consume'?0:tankAmount(tank,{id:tank.id,volumeM3:currentVolume,density:currentDensity},e.unit)),density:String(currentDensity)}));setError('');},[currentVolume,currentDensity,tank]);
 const rho=Number(density),entered=Number(amount);
 const max=unit==='mass'?tank.capacityM3*rho:unit==='percent'?100:tank.capacityM3;
 let preview:WeightDraft|undefined,validation='';
 try{if(!amount.trim()||!density.trim())throw new Error('Enter a non-negative amount and a positive liquid density.');preview=editTankContents(tank,weight.tank!,unit,action,entered,rho);}catch(e){validation=(e as Error).message;}
 const volume=preview?.tank?.volumeM3??0;
 const label=unit==='mass'?'Liquid mass (t)':unit==='percent'?'Fill (%)':'Volume (m³)';
 return <div className="panel"><h4>{tank.name}</h4><p>{t('Capacity')}: {tank.capacityM3} m³ · {t('Maximum mass at entered density')}: {Number.isFinite(rho)&&rho>0?(tank.capacityM3*rho).toFixed(3):'—'} t</p>
 <div className="curve-inputs">
 <label>{t('Tank operation')}<select aria-label={`${tank.id} ${t('Tank operation')}`} value={action} onChange={e=>setAction(e.target.value as TankAction)}><option value="set">{t('Set contents')}</option><option value="consume" disabled={referenceMass!==undefined}>{t('Consume / discharge')}</option></select></label>
 <label>{t('Enter tank contents by')}<select value={unit} onChange={e=>setUnit(e.target.value as TankUnit)}><option value="volume">{t('Volume (m³)')}</option><option value="mass">{t('Liquid mass (t)')}</option><option value="percent">{t('Fill (%)')}</option></select></label>
 <label>{t(label)}<input aria-label={`${tank.id} ${t(label)}`} type="number" min="0" max={Number.isFinite(max)&&max>0?max:undefined} step="any" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>{t('Tank liquid density (t/m³)')}<input aria-label={`${tank.id} ${t('Tank liquid density (t/m³)')}`} type="number" disabled={action==='consume'} min="0.001" step="any" value={density} onChange={e=>setDensity(e.target.value)}/></label></div>
 {action==='consume'&&<p>{t('Enter the amount to remove. Percentage means a percentage of total tank capacity, not of current contents.')}</p>}
 <p>{t('Current fill')}: {(weight.tank!.volumeM3/tank.capacityM3*100).toFixed(1)}% · {Number(weight.massTonnes).toFixed(3)} t</p>
 {preview&&<p role="status">{t('After applying')}: {(volume/tank.capacityM3*100).toFixed(1)}% · {volume.toFixed(3)} m³ · {Number(preview.massTonnes).toFixed(3)} t · LCG {Number(preview.lcg).toFixed(3)} m · TCG {Number(preview.tcg).toFixed(3)} m · KG {Number(preview.vcg).toFixed(3)} m · FSM {Number(preview.freeSurfaceMomentTransverse).toFixed(3)} t·m</p>}
 {referenceMass!==undefined&&<p className="warning">{t('This replaces the entire reference liquid group. All other tanks in this group start empty. Cargo and other liquid groups are retained.')}<br/>{t('Reference mass')}: {referenceMass.toFixed(3)} t → {t('Editable group mass')}: {preview?Number(preview.massTonnes).toFixed(3):'—'} t</p>}
 <button disabled={!preview} onClick={()=>{try{if(preview)apply(preview);setError('');}catch(e){setError((e as Error).message);}}}>{t(referenceMass!==undefined?'Apply and start editable group':'Apply tank contents')}</button>
 {!preview&&<p role="alert">{t(validation)}</p>}{error&&<p role="alert">{error}</p>}
 </div>;
}
export function TankControls({ship,catalog:sourceCatalog,scope,weights,setWeights,onSaveCondition,ballastOnly=false,state}:{ship:ShipModelPackage;catalog?:TankCatalog;scope?:'fuel'|'service';weights:WeightDraft[];setWeights:Dispatch<SetStateAction<WeightDraft[]>>;onSaveCondition?:(name:string)=>void;ballastOnly?:boolean;state?:ScenarioState}){
 const catalog=sourceCatalog&&scope?onboardTankCatalog(ship,sourceCatalog,scope):sourceCatalog;
 const {t}=useLanguage();const [selected,setSelected]=useState(''),[ballastDensity,setBallastDensity]=useState('1.025');const [editingGroup,setEditingGroup]=useState('');
 const [previous,setPrevious]=useState<{before:WeightDraft[];after:string}>();const [operationError,setOperationError]=useState('');
 if(!catalog)return <p role="status">{t('This model has no documented tank filling tables.')}</p>;
 if(!catalog.tanks.some(t=>ballastOnly?t.group==='ballast':t.group!=='ballast'))return <section className="panel"><h2>{t(ballastOnly?'Ballast':scope==='fuel'?'Fuel':scope==='service'?'Service liquids':'Tanks and liquids')}</h2><p>{t('This model has no tanks in this section.')}</p></section>;
 const chooseTank=(id:string)=>{setSelected(id);setEditingGroup('ballast');};
 const commit=(next:WeightDraft[])=>{setOperationError('');setPrevious({before:structuredClone(weights),after:JSON.stringify(next)});setWeights(next);};
 return <section className={'panel tank-controls'+(ballastOnly&&catalog.arrangement?' ballast-controls':'')}><div className="section-actions"><h2>{t(ballastOnly?'Ballast':scope==='fuel'?'Fuel':scope==='service'?'Service liquids':'Tanks and liquids')}</h2>{onSaveCondition&&<button onClick={()=>onSaveCondition('')}>{t('Save condition')}</button>}</div>
 <details className="tank-guidance"><summary>{t('Tank controls and assumptions')}</summary>
 <p>{t('Set tank contents for departure, arrival or any intermediate condition. Apply each tank change, then save the complete condition as a named scenario.')}</p>
 <p>{t('Choose a name, for example: Departure condition, Arrival condition or After ballasting.')}</p>
 <p>{t(catalog.tanks.some(tank=>tank.box)?'Synthetic rectangular tanks use analytical liquid centres and free-surface moments. Ballast density remains independent of surrounding water.':'Tank liquid density is independent of surrounding-water density. Mass = volume × liquid density. Centres and free-surface moments follow the upright filling tables.')}</p>
 <p>{t('Reference groups retain their original liquid totals. Start an editable group to enter documented tank contents; review the replacement mass before applying.')}</p></details>
 {!ballastOnly&&<div className="tank-presets"><div className="scene-toolbar">{catalog.departure&&<button onClick={()=>{try{commit(applyTankPreset(ship,catalog,weights,'departure'));}catch(e){setOperationError((e as Error).message);}}}>{t(scope==='fuel'?'Load departure fuel':scope==='service'?'Load departure service liquids':'Load departure tank contents')}</button>}<button onClick={()=>{try{commit(applyTankPreset(ship,catalog,weights,'empty'));}catch(e){setOperationError((e as Error).message);}}}>{t(scope==='fuel'?'Empty fuel tanks':scope==='service'?'Empty service tanks':'Empty tanks')}</button></div>{catalog.departure&&<p className="muted">{t('Departure fills use current capacity tables; review the resulting condition.')}</p>}{catalog.departure&&<details><summary>{t('Departure preset source and scope')}</summary><p>{catalog.departure.source}</p><p>{t(catalog.departure.note)}</p><p>{t('Replaces the liquids in this section. Use Undo tank operation to restore them.')}</p></details>}</div>}
 {ballastOnly&&state&&<AutoBallast ship={ship} catalog={catalog} state={state} onApply={commit}/>}
 {ballastOnly&&<BallastPlan catalog={catalog} weights={weights} selected={selected} onSelect={chooseTank}/>}
 {ballastOnly&&<details className="ballast-density"><summary>{t('Ballast water density (t/m³)')}</summary><label>{t('Ballast water density (t/m³)')}<input type="number" step="any" min="0.001" value={ballastDensity} onChange={e=>setBallastDensity(e.target.value)}/></label>
 <button disabled={!ballastDensity.trim()||!Number.isFinite(Number(ballastDensity))||Number(ballastDensity)<=0||!weights.some(w=>w.tank&&catalog.tanks.some(t=>t.id===w.tank!.id&&t.group==='ballast'))} onClick={()=>{try{commit(weights.map(w=>{const tank=catalog.tanks.find(t=>t.id===w.tank?.id&&t.group==='ballast');return tank?tankWeight(tank,{...w.tank!,density:Number(ballastDensity)}):w;}));}catch(e){setOperationError((e as Error).message);}}}>{t('Apply density to active ballast tanks')}</button>
 <p>{t('Individual tanks can retain different liquid densities after taking ballast in different locations.')}</p></details>}
 {tankGroups.filter(group=>(ballastOnly?group==='ballast':group!=='ballast')&&catalog.tanks.some(t=>t.group===group)).map(group=>{
 const tanks=catalog.tanks.filter(t=>t.group===group),legacy=weights.filter(w=>roleOf(ship,w)===group),active=weights.some(w=>w.tank&&tanks.some(t=>t.id===w.tank!.id));
 const referenceMass=legacy.reduce((s,w)=>s+Number(w.massTonnes),0);
 return <details className="tank-group" key={group} open={ballastOnly||editingGroup===group}><summary>{t(names[group])} · {t(active?'Editable tank plan':'Reference condition')} · {tanks.length} {t('tanks')}</summary>
 {!active&&<><p>{t('Reference mass')}: {referenceMass.toFixed(3)} t</p><button disabled={!tanks.length} onClick={()=>{setEditingGroup(group);setSelected(tanks[0].id);}}>{t('Start editable tank plan')}</button></>}
 {(active||editingGroup===group)&&<><label>{t('Tank')}<select aria-label={`${t(names[group])} ${t('Tank')}`} value={tanks.some(t=>t.id===selected)?selected:''} onChange={e=>setSelected(e.target.value)}><option value="">{t('Choose a tank')}</option>{tanks.map(tank=><option key={tank.id} value={tank.id}>{tank.name} · {tank.capacityM3} m³{catalog.departure?.tanks.find(p=>p.id===tank.id)?` · ${t('Departure')}: ${catalog.departure.tanks.find(p=>p.id===tank.id)!.fillPercent}%`:''}</option>)}</select></label>
 {tanks.filter(tank=>tank.id===selected).map(tank=>{
 const w=weights.find(w=>w.tank?.id===tank.id)??tankWeight(tank,{id:tank.id,volumeM3:0,density:tank.defaultDensity});
 return <TankEditor key={`${active}:${tank.id}`} tank={tank} weight={w} referenceMass={active?undefined:referenceMass} apply={next=>{
 if(active)commit(weights.some(w=>w.id===next.id)?weights.map(w=>w.id===next.id?next:w):[...weights,next]);
 else {commit([...weights.filter(w=>roleOf(ship,w)!==group),...tanks.map(t=>t.id===tank.id?next:tankWeight(t,{id:t.id,volumeM3:0,density:t.defaultDensity}))]);setEditingGroup('');}
 }}/>;})}</>}
 </details>;})}
 {operationError&&<p role="alert">{operationError}</p>}
 <button disabled={!previous||previous.after!==JSON.stringify(weights)} onClick={()=>{if(previous){setWeights(previous.before);setPrevious(undefined);}}}>{t('Undo tank operation')}</button>
 <details><summary>{t('Source and applicability')}</summary><p className="muted">{catalog.source}. {t(catalog.tanks.some(tank=>tank.box)?'Synthetic tank capacities are geometric volumes. Empty and pressed-full tanks have no free surface; slack rectangular tanks use I = length × width³ / 12.':'Tank capacity limits do not replace cargo, draft or stability limits. Empty and pressed-full tanks use zero free-surface moment; slack tanks use the tabulated upright values.')}</p></details>
 </section>;
}
