import type {WeightDraft} from './loading-state';
export function cargoWeightGroups(weights:WeightDraft[]){
 const groups=new Map<string,WeightDraft[]>();
 for(const w of weights){const n=w.footprint?.areaId?.match(/^hold-(\d+)/)?.[1]??w.hold?.match(/hold\s*(\d+)/i)?.[1];const hatch=w.footprint?.areaId?.match(/^hatch-(\d+)/)?.[1];const key=hatch?`Hatch ${hatch}`:n?`Cargo hold ${n}`:w.hold?.trim()||'Unassigned cargo';groups.set(key,[...(groups.get(key)??[]),w]);}
 return [...groups].map(([name,items])=>({name,items,mass:items.every(w=>w.massTonnes.trim()&&Number.isFinite(Number(w.massTonnes)))?items.reduce((s,w)=>s+Number(w.massTonnes),0):undefined}));
}
