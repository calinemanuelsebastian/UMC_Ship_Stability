import {theoryProjection} from '../app/cargo-theory-diagram';
import {useState} from 'react';
import {cargoFamilies,cargoTypeInfo,cargoVariants,cargoSizePresets,type CargoTypeId} from '../app/cargo-types';
import {useLanguage} from '../app/language-context';
import {CargoProjection} from '../components/cargo-projection';
import type {CargoShape} from '../app/cargo-shape';
function CargoArticle({id,label}:{id:CargoTypeId;label:string}){
 const {t}=useLanguage();const info=cargoTypeInfo[id];const [shape,setShape]=useState<CargoShape>(info.shape);
 const variants=cargoVariants(id),sizes=cargoSizePresets.filter(p=>p.types.includes(id));
 return <details open={typeof window!=='undefined'&&window.location.hash===`#cargo-type-${id}`} id={`cargo-type-${id}`} className="cargo-theory-entry"><summary>{t(label)}</summary>
 <p>{t(info.description)}</p><label>{t('Illustrated variant')}<select value={shape} onChange={e=>setShape(e.target.value as CargoShape)}>{variants.map(([s,n])=><option key={s} value={s}>{t(n)}</option>)}</select></label>
 <p role="status">{t('Illustration')}: <strong>{t(variants.find(v=>v[0]===shape)?.[1]??shape)}</strong> · {t('Changes this illustration only; cargo already placed is unchanged.')}</p>
 <svg viewBox="0 0 450 150" role="img" aria-label={`${t('Simplified top, side and end projections')} — ${t(variants.find(v=>v[0]===shape)?.[1]??shape)}`} style={{width:'100%',maxWidth:660}}>{(['top','side','end'] as const).map((view,i)=>{const p=theoryProjection(shape,view);return <g key={view}><text x={i*150+75} y={18} textAnchor="middle">{t(view==='top'?'Top · XY':view==='side'?'Side · XZ':'End · YZ')}</text><CargoProjection footprint={{shape,rotation:0}} view={view} x={i*150+75-p.width/2} y={112-p.height} width={p.width} height={p.height} fill="#c5dded" stroke="#175b7b" strokeWidth={2}/><path d={`M${i*150+18} 120 h114 m-5 -3 l5 3 -5 3 M${i*150+18} 120 v-90 m-3 5 l3 -5 3 5`} fill="none" stroke="#697d8d"/><text x={i*150+132} y={137} textAnchor="middle" fontSize={12}>{p.horizontalAxis}</text><text x={i*150+9} y={32} textAnchor="middle" fontSize={12}>{p.verticalAxis}</text></g>;})}</svg>
 <p className="planner-note">{t('Illustrative proportions at a shared scale. The same cylinder turns between X, Y and Z: its circular end and long side move between views. Rectangular shows a box. These are simplified envelopes, not shipment dimensions.')}</p>
 <h4>{t('Planning and support')}</h4><p>{t(info.guidance)}</p>
 <h4>{t('Dimensions and mass')}</h4><p>{t('Use the packing list or manufacturer drawing for outer dimensions, gross mass and permitted stacking. Stowage factor belongs to the commodity and packing condition, not just the package type.')}</p>
 {sizes.length>0&&<ul>{sizes.map(p=><li key={p.id}><a href={p.source} target="_blank" rel="noreferrer">{p.name}</a> — {t(p.note)}</li>)}</ul>}
 <p className="muted">{info.reference}</p>
 </details>;
}
export function CargoTheory(){
 const {t}=useLanguage();const [query,setQuery]=useState('');const matches=cargoFamilies.filter(([id,label])=>`${t(label)} ${cargoTypeInfo[id].romanian} ${cargoTypeInfo[id].description}`.toLowerCase().includes(query.toLowerCase().trim()));
 return <section id="theory-cargo" className="panel theory-section"><h2>{t('Cargo types and packaging')}</h2>
 <p>{t('Choose the transported unit first: a loose drum, a pallet of drums and a container of drums are different planning objects. Commodity, packaging, geometry and cargo-care requirements are separate properties.')}</p>
 <p>{t('These original summaries use Thomas’ Stowage, 8th edition (2018), Part 2. The 4th edition, pp. 12–13, also describes the variation in bale shapes. References use printed page numbers; PDF page numbers differ. They are learning notes, not a replacement for shipment instructions.')}</p>
 <details><summary>{t('Stowage factor and dimensions')}</summary><p>{t('SF = stowed volume / cargo mass, in m³/t. A package envelope L × W × H includes space outside a curved surface; it is not the material volume. Commodity SF may include packing or stowage losses, so do not add the same allowance twice. There is no universal SF, gross mass or loaded height for a pallet, sack, bale or drum.')}</p><p>{t('Capacity currently uses conservative package envelopes for dimensional estimates. Shape-aware placement checks the selected geometry; neither calculation predicts deformation or certifies support strength.')}</p></details>
 <label>{t('Find a cargo type')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 {matches.map(([id,label])=><CargoArticle key={id} id={id} label={label}/>)}{!matches.length&&<p role="status">{t('No matching cargo types.')}</p>}
 <p>{t('Coverage: the package types offered by this planner. Bulk commodities, liquid cargo systems and commodity-specific carriage schedules require separate assessment. A shape preset is not an automatic dunnage or securing design.')}</p>
 </section>;
}
