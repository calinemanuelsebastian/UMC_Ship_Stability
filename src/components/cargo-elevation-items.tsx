import {memo,useMemo,type RefObject} from 'react';
import type {WeightDraft} from '../app/loading-state';import {cargoBottom} from '../app/cargo-placement';import {CargoTopItems,type CargoTopActions} from './cargo-top-items';
/** Reuse the batched footprint layer in an orthographic projection. Source weights
 * remain authoritative; callbacks map projected drawing records back to originals. */
export const CargoElevationItems=memo(function CargoElevationItems({weights,selected,view,ceiling,dragId,actions,zoom}:{weights:WeightDraft[];selected:ReadonlySet<string>;view:'side'|'end';ceiling:number;dragId?:string;actions:RefObject<CargoTopActions>;zoom:number}){
 const projected=useMemo(()=>weights.filter(w=>w.footprint).map(w=>{const p=w.footprint!;const width=view==='side'?(p.rotation===0?p.length:p.width):(p.rotation===0?p.width:p.length);return {...w,lcg:view==='side'?w.lcg:w.tcg,tcg:String(ceiling-cargoBottom(w)-p.height/2),footprint:{...p,length:width,width:p.height,rotation:0 as const}};}),[weights,view,ceiling]);
 const empty=useMemo(()=>new Set(weights.filter(w=>w.footprint&&cargoBottom(w)+w.footprint.height>ceiling+1e-8).map(w=>w.id)),[weights,ceiling]);
 const originals=useMemo(()=>new Map(weights.map(w=>[w.id,w])),[weights]);
 return <CargoTopItems projection={view} originals={originals} weights={projected} selection={selected} issues={empty} fixed={undefined} dragId={dragId} actions={actions} showLabels={weights.length<=500||zoom>=3}/>;
});
