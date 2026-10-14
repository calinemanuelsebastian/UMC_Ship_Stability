import {useState,useMemo,memo} from 'react';
import type {DunnageJobResult} from '../app/dunnage-job';
import type {WeightDraft} from '../app/loading-state';
import {useLanguage} from '../app/language-context';
function DunnageReviewContent({result,weights}:{result:DunnageJobResult;weights:WeightDraft[]}){
 const {t}=useLanguage();const [page,setPage]=useState(0);const pages=Math.max(1,Math.ceil(result.diagnostics.length/50)),current=Math.min(page,pages-1);
 const names=useMemo(()=>new Map(weights.map(w=>[w.id,w.name])),[weights]);const before=useMemo(()=>weights.reduce((v,w)=>v+Number(w.massTonnes),0),[weights]);
 return <section aria-label={t('Dunnage proposal review')}><dl className="dunnage-review-metrics"><div><dt>{t('Members to add')}</dt><dd>{result.parts.length}</dd></div><div><dt>{t('Affected cargo units')}</dt><dd>{result.affectedIds.length}</dd></div><div><dt>{t('Added mass')}</dt><dd>{result.massTonnes.toFixed(6)} t</dd></div><div><dt>{t('Condition mass after applying')}</dt><dd>{Number.isFinite(before)?(before+result.massTonnes).toFixed(6):'—'} t</dd></div><div><dt>{t('Added CG (LCG / TCG / VCG)')}</dt><dd>{result.cg?[result.cg.lcg,result.cg.tcg,result.cg.vcg].map(n=>n.toFixed(3)).join(' / ')+' m':'—'}</dd></div></dl><p className="planner-note">{t('Review before applying. Mass and CG use actual members; openings contain no material. Connection strength, bearing, buckling and securing forces still require engineering assessment.')}</p>
 {result.diagnostics.length>0&&<details><summary>{t('Excluded cargo and rejected gaps')} · {result.diagnostics.length}</summary><ul>{result.diagnostics.slice(current*50,current*50+50).map((d,i)=><li key={i}>{d.ids.map(id=>`${names.get(id)??id} · #${id.slice(0,8)}`).join(' / ')||d.areaId}: {t(d.reason)}{d.position&&` (${d.position.x.toFixed(2)}, ${d.position.y.toFixed(2)}, ${d.position.z.toFixed(2)} m)`}</li>)}</ul>{pages>1&&<div className="scene-toolbar"><button disabled={!current} onClick={()=>setPage(current-1)}>{t('Previous')}</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)}>{t('Next')}</button></div>}</details>}
 </section>;
}

export const DunnageReview=memo(DunnageReviewContent);
