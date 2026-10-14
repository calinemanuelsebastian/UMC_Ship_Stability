import type {WeightDraft} from './loading-state';
type Entry={weights:WeightDraft[];bytes:number};
/** Bounded snapshots; external changes invalidate the chain rather than being overwritten.
 * UTF-16 serialized size is a conservative payload budget, not a JS heap measurement. */
export class LayoutHistory {
 private encoded=new WeakMap<WeightDraft[],string>();
 private encode(weights:WeightDraft[]){let value=this.encoded.get(weights);if(value===undefined){value=JSON.stringify(weights);this.encoded.set(weights,value);}return value;}
 private past:Entry[]=[];private future:Entry[]=[];private current='';private scope='';private budget:number;
 constructor(budget=32*1024*1024){this.budget=budget;}
 private trim(){while(this.past.length+this.future.length>20||[...this.past,...this.future].reduce((n,s)=>n+s.bytes,0)>this.budget){if(this.past.length)this.past.shift();else if(this.future.length)this.future.shift();else break;}}
 matches(weights:WeightDraft[],scope:string){return this.scope===scope&&this.current===this.encode(weights);}
 canUndo(weights:WeightDraft[],scope:string){return this.matches(weights,scope)&&this.past.length>0;}
 canRedo(weights:WeightDraft[],scope:string){return this.matches(weights,scope)&&this.future.length>0;}
 record(before:WeightDraft[],after:WeightDraft[],scope:string){
  const prior=this.encode(before),next=this.encode(after);if(prior===next)return;
  if(this.scope!==scope||this.current!==prior)this.past=[];
  this.past.push({weights:structuredClone(before),bytes:prior.length*2});this.future=[];this.current=next;this.scope=scope;this.trim();
 }
 step(weights:WeightDraft[],scope:string,redo=false){
  if(!(redo?this.canRedo(weights,scope):this.canUndo(weights,scope)))return;
  const source=redo?this.future:this.past,target=redo?this.past:this.future;
  const next=source.pop()!;target.push({weights:structuredClone(weights),bytes:this.current.length*2});this.current=this.encode(next.weights);this.trim();return structuredClone(next.weights);
 }
}
