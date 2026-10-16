import {useMemo,useState} from 'react';
import {useLanguage} from '../app/language-context';
import {inspectionCategory} from '../visualization/condition-inspection';
import type {WeightDraft} from '../app/loading-state';
import type {ShipModelPackage} from '../core/domain/ship-model';
/** Search affects the list only; scene visibility is controlled separately. */
export function WeightInspectionList({ship,weights,selected,onSelect,disabled=false}:{ship:ShipModelPackage;weights:WeightDraft[];selected?:string;onSelect:(id:string)=>void;disabled?:boolean}){
 const {t}=useLanguage();const [search,setSearch]=useState('');const [group,setGroup]=useState('');const [empty,setEmpty]=useState(false);
 const categories=useMemo(()=>[...new Set(weights.map(w=>inspectionCategory(ship,w)))],[ship,weights]);
 const filtered=useMemo(()=>weights.filter(w=>(empty||Number(w.massTonnes)>0)&&(!group||inspectionCategory(ship,w)===group)&&`${w.name} ${w.id} ${w.hold??''}`.toLowerCase().includes(search.trim().toLowerCase())),[weights,empty,group,ship,search]);
 return <section className="weight-inspection-list"><label>{t('Find onboard item')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Name, ID or hold')}/></label><label>{t('Category')}<select value={group} onChange={e=>setGroup(e.target.value)}><option value="">{t('All categories')}</option>{categories.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label><label><input type="checkbox" checked={empty} onChange={e=>setEmpty(e.target.checked)}/>{t('Include zero-mass items')}</label><label>{t('Inspect onboard weight')}<select disabled={disabled} aria-label={t('Inspect onboard weight')} value={filtered.some(w=>w.id===selected)?selected:''} onChange={e=>onSelect(e.target.value)}><option value="">{t('Select an item')}</option>{filtered.map(w=><option key={w.id} value={w.id}>{t(inspectionCategory(ship,w))} · {w.name} · {w.massTonnes} t · {w.id}</option>)}</select></label><p className="muted">{filtered.length} / {weights.length} {t('items in list. Filters do not hide scene objects.')}</p>{!filtered.length&&<p role="status">{t('No matching onboard items.')}</p>}<button disabled={!selected} onClick={()=>onSelect('')}>{t('Clear selection')}</button></section>;
}
