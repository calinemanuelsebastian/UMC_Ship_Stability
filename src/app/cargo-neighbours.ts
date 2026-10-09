import {cargoBounds,type CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
type Bounds=Pick<CargoArea,'xMin'|'xMax'|'yMin'|'yMax'>;
/** Conservative XY broad phase. Exact 3D contact/collision rules still run afterwards. */
export class CargoNeighbours{
 private cells=new Map<string,Set<WeightDraft>>();private wide=new Set<WeightDraft>();private all:WeightDraft[]=[];
 private keys(b:Bounds){const x0=Math.floor((b.xMin-1e-8)/2),x1=Math.floor((b.xMax+1e-8)/2),y0=Math.floor((b.yMin-1e-8)/2),y1=Math.floor((b.yMax+1e-8)/2);if((x1-x0+1)*(y1-y0+1)>1024)return undefined;const keys:string[]=[];for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)keys.push(`${x}:${y}`);return keys;}
 constructor(weights:WeightDraft[]){weights.forEach(w=>this.add(w));}
 add(w:WeightDraft){const b=cargoBounds(w);if(!b)return;this.all.push(w);const keys=this.keys(b);if(!keys){this.wide.add(w);return;}for(const k of keys){let cell=this.cells.get(k);if(!cell){cell=new Set();this.cells.set(k,cell);}cell.add(w);}}
 query(b:Bounds){const keys=this.keys(b);if(!keys)return this.all;const result=new Set(this.wide);for(const k of keys)for(const w of this.cells.get(k)??[])result.add(w);return [...result];}
}
