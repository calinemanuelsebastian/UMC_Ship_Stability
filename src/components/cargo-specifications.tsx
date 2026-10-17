import {shapeLabels} from '../app/cargo-shape';
import type {WeightDraft} from '../app/loading-state';
import {cargoBottom} from '../app/cargo-placement';
import {useLanguage} from '../app/language-context';
/** Read-only selection card: display specifications without changing the active editing tool. */
export function CargoSpecifications({item,categoryLabel}:{item?:WeightDraft;categoryLabel?:string}){
 const {t,language}=useLanguage();if(!item)return null;const p=item.footprint;
 const format=(value:string|number|undefined)=>value===undefined||typeof value==='string'&&!value.trim()||!Number.isFinite(Number(value))?'—':new Intl.NumberFormat(language,{maximumFractionDigits:6}).format(Number(value));
 const category=categoryLabel??(p?.kind==='dunnage'?'Dunnage / support':item.tank?'Tank / liquid':item.category??'Cargo');
 return <section className="panel" aria-label={t('Selected object specifications')}><h3>{item.name}</h3><dl className="summary-grid">
 <div><dt>{t('Category')}</dt><dd>{t(category)}</dd></div><div><dt>{t('Mass')}</dt><dd>{format(item.massTonnes)} t</dd></div>
 <div><dt>{t('Loading surface')}</dt><dd>{item.hold??p?.areaId??'—'}</dd></div>
 {p&&<><div><dt>{t('Transported shape')}</dt><dd>{t(shapeLabels[p.shape??'box'])}</dd></div><div><dt>{t('Dimensions (L × W × H)')}</dt><dd>{format(p.length)} × {format(p.width)} × {format(p.height)} m</dd></div><div><dt>{t('Orientation')}</dt><dd>{format(p.rotation)}°</dd></div><div><dt>{t('Bottom elevation')}</dt><dd>{format(cargoBottom(item))} m</dd></div><div><dt>{t('Stackability')}</dt><dd>{t(p.stackability??'unknown')}{p.maxTopLoadTonnes!==undefined?` · ${p.maxTopLoadTonnes} t`:''}</dd></div></>}
 <div><dt>{t('Source coordinates (LCG / TCG / VCG)')}</dt><dd>{format(item.lcg)} / {format(item.tcg)} / {format(item.vcg)} m</dd></div>
 {p?.keepGapsClear&&<p>{t('Protected clearance: surrounding gaps remain open.')}</p>}
 {p?.catalogue&&<div><dt>{t('Cargo family')}</dt><dd>{p.catalogue.family} · {p.catalogue.contact} {p.catalogue.source}</dd></div>}
 {p?.dunnage&&<><div><dt>{t('Dunnage material')}</dt><dd>{t(p.dunnage.material)}</dd></div><div><dt>{t('Material density (kg/m³)')}</dt><dd>{p.dunnage.densityKgM3}</dd></div><div><dt>{t('Mass calculation')}</dt><dd>{t(p.dunnage.massMode==='calculated'?'Volume × density':'Manual override')}</dd></div></>}
 <div><dt>{t('Unit ID')}</dt><dd style={{overflowWrap:'anywhere'}}>{item.id}</dd></div></dl>
 {p?.dunnage?.properties&&<p>{p.dunnage.properties.source} · {p.dunnage.properties.applicability} · {p.dunnage.properties.contact}{p.dunnage.properties.capacityKN!==undefined?` · ${p.dunnage.properties.capacityKN} kN`:''}{p.dunnage.properties.frictionCoefficient!==undefined?` · μ ${p.dunnage.properties.frictionCoefficient}`:''}</p>}
 {p?.kind==='dunnage'&&<p>{t('Securing capacity: not assessed. Dimensions and density do not establish allowable load.')}</p>}
 </section>;
}
