import {CargoProjection} from './cargo-projection';
import {useCargoDragCancellation} from './use-cargo-drag-cancellation';
import {CargoElevationItems} from './cargo-elevation-items';
import type {CargoTopActions} from './cargo-top-items';
import {usePlanPan} from './use-plan-pan';
import {useWindowSelection} from './use-window-selection';
import {useRef,useState,useMemo} from 'react';
import {cargoBottom,translateCargoGroup} from '../app/cargo-placement';
import {cargoOnSurface} from '../app/cargo-surfaces';
import type {CargoArea} from '../app/cargo-layout';
import type {WeightDraft} from '../app/loading-state';
import {useLanguage} from '../app/language-context';
/** Orthographic footprint elevations; KG is not used as a geometric bottom. */
export function CargoElevations({onZoom,panMode=false,onSelectWindow,zoom=1,view:activeView,area,surfaces=[],weights,selected,selectedIds=[selected],multiSelect=false,onSelect,onMove,preview,onBegin,onFinish}:{onZoom?:(zoom:number)=>void;panMode?:boolean;onSelectWindow?:(ids:string[],add:boolean)=>void;zoom?:number;preview?:(id:string,p:{x:number;y:number;z:number})=>WeightDraft;selectedIds?:string[];multiSelect?:boolean;view?:'side'|'end';onMove?:(id:string,p:{x:number;y:number;z:number})=>void;onBegin?:()=>void;onFinish?:()=>void;area:CargoArea;surfaces?:CargoArea[];weights:WeightDraft[];selected:string;onSelect:(id:string,additive?:boolean)=>void}) {
 const pan=usePlanPan(panMode,zoom,onZoom);
 const windowSelection=useWindowSelection(true,(ids,add)=>onSelectWindow?.(ids,add),(svg)=>{const projection=svg.dataset.view??activeView;const matrix=svg.getScreenCTM();if(!matrix)return [];return visible.filter(w=>w.footprint).map(w=>{const p=w.footprint!,centre=Number(projection==='end'?w.tcg:w.lcg),width=projection==='end'?(p.rotation===0?p.width:p.length):(p.rotation===0?p.length:p.width),y=ceiling-cargoBottom(w)-p.height;const a=new DOMPoint(centre-width/2,y).matrixTransform(matrix),b=new DOMPoint(centre+width/2,y+p.height).matrixTransform(matrix);return {id:w.id,left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)};});});
 const blankClick=useRef(false);
 const drag=useRef<{id:string;x:number;y:number;z:number;px:number;py:number;target?:{x:number;y:number;z:number};valid?:boolean;before:WeightDraft[]}|undefined>(undefined);
 const [ghost,setGhost]=useState<{w:WeightDraft;valid:boolean}>();
 const finish=(cancel=false)=>{const d=drag.current;drag.current=undefined;setGhost(undefined);if(!cancel&&d?.valid&&d.target&&d.before===weights)onMove?.(d.id,d.target);onFinish?.();};
 useCargoDragCancellation(()=>finish(true),weights,`${activeView}:${panMode}`);
 const point=(svg:SVGSVGElement,x:number,y:number)=>{const m=svg.getScreenCTM();return m?new DOMPoint(x,y).matrixTransform(m.inverse()):undefined;};
 const {t}=useLanguage();const hold=area.id?.match(/^hold-([12])/u)?.[1];
 const related=hold?surfaces.filter(s=>s.id?.startsWith(`hold-${hold}`)):[area];
 const floor=Math.min(...(related.length?related:[area]).map(s=>s.deckZ));
 const ceiling=Math.max(...(related.length?related:[area]).map(s=>s.deckZ+(s.clearHeight??10)));
 const height=ceiling-floor;
 const selectedSet=useMemo(()=>new Set(selectedIds),[selectedIds]);
 const relatedKey=JSON.stringify(related);
 const visible=useMemo(()=>{const surfaces=JSON.parse(relatedKey) as CargoArea[];return weights.filter(w=>surfaces.some(s=>cargoOnSurface(w,s))||!area.id);},[weights,relatedKey,area.id]);
 const originals=useMemo(()=>new Map(weights.map(w=>[w.id,w])),[weights]);
 const actions=useRef<CargoTopActions>({pointer:()=>{},key:()=>{},click:()=>{}});
 actions.current={pointer:(projected,e)=>{if(!e.isPrimary){finish(true);return;}const w=originals.get(projected.id)!;if(e.button!==0||!onMove)return;const svg=e.currentTarget.ownerSVGElement;if(!svg)return;const q=point(svg,e.clientX,e.clientY);if(!q)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});if(e.shiftKey||e.ctrlKey||e.metaKey||(multiSelect&&!selectedSet.has(w.id))){onSelect(w.id,true);return;}onSelect(w.id);onBegin?.();drag.current={id:w.id,x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w),px:q.x,py:q.y,before:weights};svg.setPointerCapture(e.pointerId);},click:(w,e)=>{if(e.detail===0)onSelect(w.id,e.shiftKey||e.ctrlKey||e.metaKey);},key:(w,e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(w.id,e.shiftKey||e.ctrlKey||e.metaKey);}}};
 const bounds=related.length?related:[area];
 return <div className="cargo-elevations" {...pan.handlers}>{(['side','end'] as const).filter(v=>!activeView||v===activeView).map(view=>{
  const min=view==='side'?Math.min(...bounds.map(a=>a.xMin)):Math.min(...bounds.map(a=>a.yMin)),max=view==='side'?Math.max(...bounds.map(a=>a.xMax)):Math.max(...bounds.map(a=>a.yMax));
  return <figure key={view}><h3>{t(view==='side'?'Side view':'End view')}</h3><svg data-view={view} tabIndex={0} role="group" aria-label={t(view==='side'?'Cargo side elevation':'Cargo end elevation')} viewBox={`${pan.offset.x+(min+max)/2-(max-min+2)/zoom/2} ${pan.offset.y+height/2-(height+2)/zoom/2} ${(max-min+2)/zoom} ${(height+2)/zoom}`} style={{touchAction:'none'}} {...windowSelection.handlers} onPointerDownCapture={e=>{blankClick.current=!(e.target as Element).closest('[role="button"]');windowSelection.handlers.onPointerDownCapture(e);}} onClick={()=>{if(blankClick.current)onSelect('');}} onPointerMove={e=>{const d=drag.current,p=point(e.currentTarget,e.clientX,e.clientY);if(d&&p){if(d.before!==weights){finish(true);return;}const target={x:d.x+(view==='side'?p.x-d.px:0),y:d.y+(view==='end'?p.x-d.px:0),z:d.z-(p.y-d.py)};d.target=target;try{const w=preview?.(d.id,target);if(w){d.valid=true;setGhost({w,valid:true});}}catch{d.valid=false;const w=weights.find(w=>w.id===d.id)!;setGhost({w:{...w,lcg:String(target.x),tcg:String(target.y),footprint:{...w.footprint!,bottomZ:target.z}},valid:false});}}}} onPointerUp={()=>finish()} onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>finish(true)}>
   <rect x={min} y={0} width={max-min} height={height} fill="#edf4f8" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
   {Array.from({length:Math.floor(height)},(_,i)=>i+1).map(z=><g key={'height-'+z} pointerEvents="none"><line x1={min} x2={max} y1={height-z} y2={height-z} stroke="#cad7df" strokeDasharray="3 4" vectorEffect="non-scaling-stroke"/><text x={min-.15} y={height-z} textAnchor="end" dominantBaseline="middle" fontSize=".32" fill="#475569">{z} m</text></g>)}
   {related.filter(s=>s.deckZ>floor).map(s=><line key={s.id} x1={min} x2={max} y1={ceiling-s.deckZ} y2={ceiling-s.deckZ} stroke="#8b6914" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"/>)}
   {view==='side'&&area.supportRegions?.map((r,i)=><line key={'floor'+i} x1={r.xMin} x2={r.xMax} y1={height} y2={height} stroke="#527c60" strokeWidth="5" vectorEffect="non-scaling-stroke"/>)}
   <CargoElevationItems weights={visible} selected={selectedSet} view={view} ceiling={ceiling} dragId={ghost?.w.id} actions={actions} zoom={zoom}/>
   {ghost&&translateCargoGroup(visible.filter(w=>selectedSet.has(ghost.w.id)?selectedSet.has(w.id):w.id===ghost.w.id),originals.get(ghost.w.id)!,ghost.w).map(w=>{const p=w.footprint!,width=view==='side'?(p.rotation===0?p.length:p.width):(p.rotation===0?p.width:p.length),centre=Number(view==='side'?w.lcg:w.tcg);return <CargoProjection footprint={p} view={view} key={w.id} pointerEvents="none" x={centre-width/2} y={ceiling-cargoBottom(w)-p.height} width={width} height={p.height} fill={ghost.valid?'#16a34a':'#dc2626'} fillOpacity=".5" stroke="#075985" vectorEffect="non-scaling-stroke"/>;})}

  {windowSelection.overlay}</svg><figcaption><p>{t('Drag upward to stack on a supported surface. Green previews are valid; red previews cannot be placed. Height marks are measured above the hold floor.')}</p>{t(area.clearHeight===undefined?'View height':'Full hold height')}: {height.toFixed(2)} m · {t('Deck elevation')}: {area.deckZ} m · {t('Available clear height')}: {area.clearHeight??'—'} m. {t('Projection only; cargo behind other items may overlap in this view.')}</figcaption></figure>;
 })}</div>;
}
