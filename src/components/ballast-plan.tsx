import {useEffect,useState} from 'react';
import type {TankCatalog} from '../app/tank-operations';
import type {WeightDraft} from '../app/loading-state';
import {useLanguage} from '../app/language-context';
/** Selection diagram only: tankWeight remains the sole source of liquid moments. */
export function BallastPlan({catalog,weights,selected,onSelect}:{catalog:TankCatalog;weights:WeightDraft[];selected:string;onSelect:(id:string)=>void}) {
 const {t}=useLanguage();const layers=catalog.arrangement?.layers??[];
 const [chosen,setChosen]=useState(layers[0]??'');
 useEffect(()=>{const selectedLayer=catalog.tanks.find(tank=>tank.id===selected)?.plan?.layer;if(selectedLayer)setChosen(selectedLayer);},[catalog,selected]);
 const layer=layers.includes(chosen)?chosen:layers[0];
 const tanks=catalog.tanks.filter(t=>t.group==='ballast');
 if(!catalog.arrangement||!tanks.some(t=>t.plan))return null;
 const sx=(x:number)=>40+x*5.4,sy=(y:number)=>145+y*4;
 const points=(p:number[][])=>p.map(([x,y])=>`${sx(x)},${sy(y)}`).join(' ');
 const active=weights.some(w=>w.tank&&tanks.some(t=>t.id===w.tank!.id));
 const volume=tanks.reduce((sum,tank)=>sum+(weights.find(w=>w.tank?.id===tank.id)?.tank?.volumeM3??0),0);
 const mass=tanks.reduce((sum,tank)=>sum+Number(weights.find(w=>w.tank?.id===tank.id)?.massTonnes??0),0);
 return <section className="ballast-plan" aria-label={t('Ballast tank arrangement')}>
  <div className="section-actions"><h3>{t('Ballast tank arrangement')} <span className="diagram-qualifier">{t('Simplified diagram')}</span></h3><div className="scene-toolbar">{layers.map(v=><button key={v} aria-pressed={layer===v} onClick={()=>setChosen(v)}>{t(v)}</button>)}</div></div>
  <p className="muted">{t('Select a tank to edit its contents. Colours show applied fill percentages.')}</p>
  <div className="ballast-plan-scroll"><svg viewBox="0 0 1060 290" role="group" aria-label={t(layer)}>
   <text x="40" y="28">← {t('Stern')}</text><text x="1012" y="28" textAnchor="end">{t('Bow')} →</text><text x="525" y="48" textAnchor="middle">{t('Port')}</text><text x="525" y="266" textAnchor="middle">{t('Starboard')}</text>
   <polygon points={points(catalog.arrangement.outline)} fill="#f0f4f7" stroke="#96adba"/>
   <path d="M40 145 H1012" stroke="#9cabb5" strokeDasharray="5 5"/>
   {tanks.filter(tank=>tank.plan?.layer===layer).map(tank=>{
    const p=tank.plan!,w=weights.find(w=>w.tank?.id===tank.id),fill=active?(w?.tank?.volumeM3??0)/tank.capacityM3:undefined;
    const pct=fill===undefined?'—':`${Math.round(fill*100)}%`,label=`${tank.name} · ${pct}`;
    return <g key={tank.id} role="button" tabIndex={0} aria-label={label} aria-pressed={selected===tank.id} onClick={()=>onSelect(tank.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(tank.id);}}}>
     <title>{tank.name} · {tank.capacityM3} m³ · {pct}</title>
     <polygon points={points(p.polygon)} fill={fill===undefined?'#e5e5e5':`hsl(198 65% ${96-fill*53}%)`} stroke={selected===tank.id?'#8d31bb':'#35748e'} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
     <text x={sx(p.label[0])} y={sy(p.label[1])-3} textAnchor="middle" fill={fill!==undefined&&fill>.65?'white':'#153b50'}><tspan>{tank.id}</tspan><tspan x={sx(p.label[0])} dy="14">{pct}</tspan></text>
    </g>;
   })}
  </svg></div>
  <div className="ballast-plan-status"><span>{t('Empty')} <i className="tank-fill-key"/> {t('Full')}</span><span>{active?`${volume.toFixed(1)} m³ · ${mass.toFixed(1)} t`:t('Individual tank contents are not assigned in this reference condition.')}</span></div>
  <details><summary>{t('Arrangement source and assumptions')}</summary><p>{catalog.arrangement.source}</p><p>{t(catalog.arrangement.note)}</p></details>
 </section>;
}
