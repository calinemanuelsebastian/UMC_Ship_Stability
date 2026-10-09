import {carriesCargo} from './cargo-placement';
import type {WeightDraft} from './loading-state';
/** Delete a complete selection atomically, retaining loads supported by unselected items. */
export function deleteCargoSelection(weights:WeightDraft[],ids:string[],editableIds:string[]){
 const allowed=new Set(editableIds),remove=new Set(ids.filter(id=>allowed.has(id)));
 const remaining=weights.filter(w=>!remove.has(w.id));
 if(weights.some(w=>remove.has(w.id)&&carriesCargo(w,remaining)))throw new Error('Select the cargo supported by these items too before deleting them.');
 return remaining;
}
