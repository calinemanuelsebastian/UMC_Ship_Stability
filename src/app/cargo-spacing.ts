import {cargoBounds} from './cargo-layout';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
/** Face-to-face spacing between two bounding envelopes; preserves each arrangement. */
export function spacingTarget(moving:WeightDraft[],reference:WeightDraft[],gap:number,direction:'forward'|'aft'|'starboard'|'port'){
 if(!Number.isFinite(gap)||gap<0)throw new Error('Enter a non-negative gap.');
 if(!moving.length||!reference.length||moving.some(w=>reference.some(r=>r.id===w.id)))throw new Error('Choose a separate reference and moving selection.');
 const bounds=(items:WeightDraft[])=>{const b=items.map(w=>cargoBounds(w));if(b.some(v=>!v))throw new Error('Select items with dimensions.');return {xMin:Math.min(...b.map(v=>v!.xMin)),xMax:Math.max(...b.map(v=>v!.xMax)),yMin:Math.min(...b.map(v=>v!.yMin)),yMax:Math.max(...b.map(v=>v!.yMax))};};
 const a=bounds(moving),b=bounds(reference);
 const dx=direction==='forward'?b.xMax+gap-a.xMin:direction==='aft'?b.xMin-gap-a.xMax:0;
 const dy=direction==='starboard'?b.yMax+gap-a.yMin:direction==='port'?b.yMin-gap-a.yMax:0;
 const w=moving[0];return {x:Number(w.lcg)+dx,y:Number(w.tcg)+dy,z:cargoBottom(w)};
}
