import type {WeightDraft} from '../app/loading-state';
import {cargoBottom} from '../app/cargo-placement';
import {useLanguage} from '../app/language-context';
/** Read-only selection card: display specifications without changing the active editing tool. */
export function CargoSpecifications({item}:{item?:WeightDraft}){
 const {t}=useLanguage();if(!item)return null;const p=item.footprint;
 const category=p?.kind==='dunnage'?'Dunnage / support':item.tank?'Tank / liquid':item.category??'Cargo';
 return <section className="panel" aria-label={t('Selected object specifications')}><h3>{item.name}</h3><dl className="summary-grid">
 <div><dt>{t('Category')}</dt><dd>{t(category)}</dd></div><div><dt>{t('Mass')}</dt><dd>{Number(item.massTonnes).toLocaleString(undefined,{maximumFractionDigits:6})} t</dd></div>
 <div><dt>{t('Loading surface')}</dt><dd>{item.hold??p?.areaId??'—'}</dd></div>
 {p&&<><div><dt>{t('Dimensions (L × W × H)')}</dt><dd>{p.length} × {p.width} × {p.height} m</dd></div><div><dt>{t('Orientation')}</dt><dd>{p.rotation}°</dd></div><div><dt>{t('Bottom elevation')}</dt><dd>{cargoBottom(item)} m</dd></div><div><dt>{t('Stackability')}</dt><dd>{t(p.stackability??'unknown')}{p.maxTopLoadTonnes!==undefined?` · ${p.maxTopLoadTonnes} t`:''}</dd></div></>}
 <div><dt>{t('Source coordinates (LCG / TCG / VCG)')}</dt><dd>{item.lcg} / {item.tcg} / {item.vcg} m</dd></div>
 {p?.dunnage&&<><div><dt>{t('Dunnage material')}</dt><dd>{t(p.dunnage.material)}</dd></div><div><dt>{t('Material density (kg/m³)')}</dt><dd>{p.dunnage.densityKgM3}</dd></div><div><dt>{t('Mass calculation')}</dt><dd>{t(p.dunnage.massMode==='calculated'?'Volume × density':'Manual override')}</dd></div></>}
 <div><dt>{t('Unit ID')}</dt><dd style={{overflowWrap:'anywhere'}}>{item.id}</dd></div></dl>
 {p?.kind==='dunnage'&&<p>{t('Securing capacity: not assessed. Dimensions and density do not establish allowable load.')}</p>}
 </section>;
}
