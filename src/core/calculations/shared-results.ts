import type {ShipModelPackage,SimulationCondition} from '../domain/ship-model';

/** Stable, lossless keys: invalid numeric inputs must never alias valid values. */
export function calculationKey(value:unknown):string {
 if(value===undefined)return 'undefined';
 if(value===null)return 'null';
 if(typeof value==='number')return `number:${Object.is(value,-0)?'-0':String(value)}`;
 if(typeof value==='string'||typeof value==='boolean')return `${typeof value}:${JSON.stringify(value)}`;
 if(Array.isArray(value))return `[${value.map(calculationKey).join(',')}]`;
 if(typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${calculationKey((value as Record<string,unknown>)[k])}`).join(',')}}`;
 throw new Error('Unsupported calculation key.');
}
function freeze<T>(value:T):T {
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}
 return value;
}
export function normalizedCondition(c:SimulationCondition):SimulationCondition {
 return {draft:c.draft,displacementTonnes:c.displacementTonnes,vcg:c.vcg,lcg:c.lcg,tcg:c.tcg,waterDensity:c.waterDensity,freeSurfaceMomentTransverse:c.freeSurfaceMomentTransverse??0,heelDeg:c.heelDeg??0,trimDeg:c.trimDeg??0};
}
type Entry={promise:Promise<unknown>;status:'pending'|'ready';value?:unknown};
type Scope={revision:string;snapshot:ShipModelPackage;entries:Map<string,Entry>};
/** App-session cache. Weak vessel ownership; bounded settled entries; pending work is deduplicated. */
export class SharedResults {
 private scopes=new WeakMap<ShipModelPackage,Scope>();
 private readonly capacity:number;
 constructor(capacity=32){this.capacity=capacity;if(!Number.isInteger(capacity)||capacity<1)throw new Error('Cache capacity must be positive.');}
 private scope(ship:ShipModelPackage){
  const revision=calculationKey([ship.manifest,ship.baseUrl,ship.resourceUrls]);
  let scope=this.scopes.get(ship);
  if(!scope||scope.revision!==revision){
   const snapshot:ShipModelPackage=freeze({manifest:structuredClone(ship.manifest),baseUrl:ship.baseUrl,...(ship.resourceUrls?{resourceUrls:{...ship.resourceUrls}}:{})});
   scope={revision,snapshot,entries:new Map()};this.scopes.set(ship,scope);this.scopes.set(snapshot,scope);
  }
  return scope;
 }
 read<T,I>(ship:ShipModelPackage,operation:string,inputs:I,compute:(ship:ShipModelPackage,inputs:I)=>Promise<T>|T):Promise<T>{
  const scope=this.scope(ship),key=calculationKey([operation,inputs]),hit=scope.entries.get(key);
  if(hit){scope.entries.delete(key);scope.entries.set(key,hit);return hit.promise as Promise<T>;}
  const snapshot=freeze(structuredClone(inputs));
  const entry:Entry={status:'pending',promise:Promise.resolve()};
  entry.promise=Promise.resolve().then(()=>compute(scope.snapshot,snapshot)).then(value=>{
   const result=freeze(structuredClone(value));entry.status='ready';entry.value=result;
   // Never evict an in-flight entry: concurrent consumers must share its promise.
   let ready=[...scope.entries.values()].filter(e=>e.status==='ready').length;
   for(const [k,e] of scope.entries){if(ready<=this.capacity)break;if(e.status==='ready'){scope.entries.delete(k);ready--;}}
   return result;
  },error=>{if(scope.entries.get(key)===entry)scope.entries.delete(key);throw error;});
  // Also remove failures while copying/freezing an unsupported solver output.
  entry.promise=entry.promise.catch(error=>{if(scope.entries.get(key)===entry)scope.entries.delete(key);throw error;});
  scope.entries.set(key,entry);return entry.promise as Promise<T>;
 }
 /** Explicit refresh for resources replaced at the same URL without a package revision. */
 invalidate(ship:ShipModelPackage){const scope=this.scopes.get(ship);if(scope)this.scopes.delete(scope.snapshot);this.scopes.delete(ship);}
}
export const sharedResults=new SharedResults();
