import type {ScenarioState} from './saved-scenarios';
/** Compare snapshots independent of object insertion order, excluding undefined keys. */
function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
 return value;
}
export const conditionRevision=(state:ScenarioState)=>JSON.stringify(canonical(state));
export type ConditionTransaction={before:ScenarioState;afterRevision:string};
export function conditionTransaction(before:ScenarioState,after:ScenarioState):ConditionTransaction{return {before:structuredClone(before),afterRevision:conditionRevision(after)};}
export function canUndoCondition(transaction:ConditionTransaction|undefined,current:ScenarioState){return !!transaction&&transaction.afterRevision===conditionRevision(current);}
