import type {WeightDraft} from './loading-state';
/** Bounded snapshots; external changes invalidate the chain rather than being overwritten. */
export class LayoutHistory {
 private past:WeightDraft[][]=[];
 private future:WeightDraft[][]=[];
 private current='';
 private scope='';
 matches(weights:WeightDraft[],scope:string){return this.scope===scope&&this.current===JSON.stringify(weights);}
 canUndo(weights:WeightDraft[],scope:string){return this.matches(weights,scope)&&this.past.length>0;}
 canRedo(weights:WeightDraft[],scope:string){return this.matches(weights,scope)&&this.future.length>0;}
 record(before:WeightDraft[],after:WeightDraft[],scope:string){
  if(JSON.stringify(before)===JSON.stringify(after))return;
  if(!this.matches(before,scope))this.past=[];
  this.past.push(structuredClone(before));this.past=this.past.slice(-20);
  this.future=[];this.current=JSON.stringify(after);this.scope=scope;
 }
 step(weights:WeightDraft[],scope:string,redo=false){
  if(!(redo?this.canRedo(weights,scope):this.canUndo(weights,scope)))return;
  const source=redo?this.future:this.past,target=redo?this.past:this.future;
  const next=source.pop()!;target.push(structuredClone(weights));this.current=JSON.stringify(next);
  return structuredClone(next);
 }
}
