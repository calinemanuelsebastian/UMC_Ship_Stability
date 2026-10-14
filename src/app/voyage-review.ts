import {evaluateWeights,type WeightDraft} from './loading-state';
import {buildAssessmentReport,type ReportInputs} from './assessment-report';
import {conditionRevision} from './condition-transaction';
import {isCargo,type TankCatalog} from './tank-operations';
import {editTankContents} from './onboard-operations';
import {cargoSurfaces,cargoOnSurface} from './cargo-surfaces';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {ScenarioState,SavedScenario} from './saved-scenarios';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
export function voyageChanges(before:ScenarioState,after:ScenarioState){
 const a=new Map(before.weights.map(w=>[w.id,w])),b=new Map(after.weights.map(w=>[w.id,w]));
 return {added:after.weights.filter(w=>!a.has(w.id)),removed:before.weights.filter(w=>!b.has(w.id)),changed:after.weights.filter(w=>a.has(w.id)&&JSON.stringify(a.get(w.id))!==JSON.stringify(w)).map(w=>({before:a.get(w.id)!,after:w})),density:before.density!==after.density,deck:before.tweenDeck!==after.tweenDeck,capacity:JSON.stringify(before.capacity)!==JSON.stringify(after.capacity),assumptions:JSON.stringify(before.assessment)!==JSON.stringify(after.assessment)};
}
/** Explicit edits to a cloned stage: no implicit consumption rates, partial unloading or support deletion. */
export function voyageOperation(ship:ShipModelPackage,state:ScenarioState,catalog:TankCatalog|undefined,consumption:Record<string,number>,unload:string[]):ScenarioState{
 if(state.scenario!=='loading')throw new Error('Voyage operations require weight-based loading.');
 const next=structuredClone(state),ids=new Set(unload);if(ids.size!==unload.length||unload.some(id=>!state.weights.some(w=>w.id===id&&isCargo(ship,w))))throw new Error('Select actual cargo or support instances for unloading.');
 for(const [id,volume] of Object.entries(consumption)){
  const tank=catalog?.tanks.find(t=>t.id===id),index=next.weights.findIndex(w=>w.tank?.id===id);if(!tank||index<0||tank.group==='ballast')throw new Error('Use the ballast workplan for ballast changes. Consumption requires an existing fuel/service tank.');
  next.weights[index]=editTankContents(tank,next.weights[index].tank!,'volume','consume',volume,next.weights[index].tank!.density);
 }
 next.weights=next.weights.filter(w=>!ids.has(w.id));return next;
}
export function cargoReconciliation(ship:ShipModelPackage,state:ScenarioState){
 const areas=cargoSurfaces(ship,state.tweenDeck),cargo=state.weights.filter(w=>isCargo(ship,w)),groups=new Map<string,{area:string;type:string;kind:string;mass:number;complete:boolean;items:WeightDraft[]}>();
 for(const w of cargo){const area=areas.find(a=>cargoOnSurface(w,a)),kind=w.footprint?.kind==='dunnage'?'Support':'Cargo',type=w.footprint?.dunnage?.material??w.footprint?.catalogue?.family??w.name,key=JSON.stringify([area?.id??'unlocated',kind,type]);let g=groups.get(key);if(!g){g={area:area?.name??'Unlocated',type,kind,mass:0,complete:true,items:[]};groups.set(key,g);}g.items.push(w);if(!w.massTonnes.trim()||!Number.isFinite(+w.massTonnes)||+w.massTonnes<0)g.complete=false;else g.mass+=+w.massTonnes;}
 const c=state.capacity,area=c?.areaId?areas.find(a=>(a.id??a.name)===c.areaId):undefined;
 const scoped=cargo.filter(w=>!c?.areaId||area&&cargoOnSurface(w,area));
 const supports=scoped.filter(w=>w.footprint?.kind==='dunnage');
 const compatible=scoped.filter(w=>w.footprint&&w.footprint.kind!=='dunnage'&&c?.method==='package'&&c.unitMass!==undefined&&c.length!==undefined&&c.width!==undefined&&c.height!==undefined&&Math.abs(+w.massTonnes-c.unitMass)<1e-8&&Math.abs(w.footprint.height-c.height)<1e-8&&((Math.abs(w.footprint.length-c.length)<1e-8&&Math.abs(w.footprint.width-c.width)<1e-8)||(Math.abs(w.footprint.length-c.width)<1e-8&&Math.abs(w.footprint.width-c.length)<1e-8)));
 const hasMatch=c?.method==='package'&&[c.unitMass,c.length,c.width,c.height].every(n=>n!==undefined)&&(!c.areaId||!!area);
 return {groups:[...groups.values()],planned:c?.quantity,compatible:hasMatch?compatible.length:undefined,remaining:hasMatch&&c?.quantity!==undefined?Math.max(0,c.quantity-compatible.length):undefined,excess:hasMatch&&c?.quantity!==undefined?Math.max(0,compatible.length-c.quantity):undefined,other:scoped.filter(w=>!compatible.includes(w)&&!supports.includes(w)).length,supportAllowance:c?.supportAllowance,supportMass:supports.every(w=>w.massTonnes.trim()&&Number.isFinite(+w.massTonnes)&&+w.massTonnes>=0)?supports.reduce((s,w)=>s+(+w.massTonnes),0):undefined,note:'Capacity matching uses area, mass and dimensions, including rotation; it is not consignment identity. Support allowance is a planning reserve, not an automatic required support mass.'};
}
export async function voyageInputs(ship:ShipModelPackage,state:ScenarioState):Promise<ReportInputs>{
 if(state.scenario==='loading'){const r=evaluateWeights(state.weights);if(!r.result)throw new Error(r.error);return {pending:false,...r.result,waterDensity:state.density,longitudinalFsm:state.longitudinalFsm??0};}
 const m=state.manual;let displacementTonnes=m.displacementTonnes;
 if(state.manualMode==='draft'){const hydro=await computeUprightHydrostatics(ship,{draft:state.draft,lcg:m.lcg!,tcg:m.tcg!,vcg:m.vcg!,waterDensity:state.density!,freeSurfaceMomentTransverse:m.freeSurfaceMomentTransverse});displacementTonnes=hydro.displacementTonnes;}
 return {pending:false,...m,displacementTonnes,waterDensity:state.density,longitudinalFsm:state.longitudinalFsm??0};
}
export function reviewFindings(sections:Record<string,unknown>){
 const failures=new Set<string>(),missing=new Set<string>();
 for(const [name,section] of Object.entries(sections)){
  const walk=(v:unknown)=>{if(!v||typeof v!=='object')return;const o=v as Record<string,unknown>;if(typeof o.status==='string'){if(/Below numerical minimum|Exceeds|Outside|Fails/i.test(o.status))failures.add(name+': '+o.status);else if(/Insufficient|Incomplete|Not assessed|unresolved|No documented/i.test(o.status))missing.add(name+': '+o.status);}for(const value of Object.values(o))walk(value);};walk(section);
 }
 const hydro=sections.hydrostatics as {gmTransverseCorrected?:number;warnings?:{severity:string;message:string}[]};if(hydro?.gmTransverseCorrected!==undefined&&hydro.gmTransverseCorrected<=0)failures.add('Hydrostatics: non-positive corrected GM.');for(const warning of hydro?.warnings??[])if(warning.severity==='error')failures.add('Hydrostatics: '+warning.message);
 const securing=sections.securing as {unassigned?:string[]};if(securing?.unassigned?.length)missing.add('Securing: unassigned cargo/supports.');
 missing.add('Damage stability, longitudinal strength and transfer sequences remain unassessed.');return {failures:[...failures],missing:[...missing]};
}
export async function reviewVoyage(ship:ShipModelPackage,entries:SavedScenario[],signal?:AbortSignal,reporter=buildAssessmentReport){
 const snapshots=structuredClone(entries);const ids=new Set(snapshots.map(e=>e.id));if(ids.size!==snapshots.length)throw new Error('Duplicate voyage condition.');
 const results=[];for(const entry of snapshots){if(signal?.aborted)throw new DOMException('Review cancelled','AbortError');
  const lineage:string[]=[];let node:SavedScenario|undefined=entry;const seen=new Set<string>();while(node?.voyageStage?.parentId){if(seen.has(node.id))throw new Error('Voyage parent cycle.');seen.add(node.id);const parent=snapshots.find(e=>e.id===node!.voyageStage!.parentId);if(!parent){lineage.push('Parent snapshot is absent from this voyage.');break;}node=parent;}
  try{const inputs=await voyageInputs(ship,entry.state),report=await reporter(ship,entry.state,inputs);if(signal?.aborted)throw new DOMException('Review cancelled','AbortError');const findings=reviewFindings(report.sections);results.push({id:entry.id,name:entry.name,phase:entry.voyageStage?.phase,revision:conditionRevision(entry.state),inputs,report,failures:findings.failures,missing:[...lineage,...findings.missing],reconciliation:cargoReconciliation(ship,entry.state)});}catch(e){if(signal?.aborted)throw e;results.push({id:entry.id,name:entry.name,phase:entry.voyageStage?.phase,revision:conditionRevision(entry.state),failures:[],missing:[...lineage,String(e)],reconciliation:cargoReconciliation(ship,entry.state)});}
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {conditions:results,scope:'Explicit saved stages only; intervals between snapshots are not simulated. No whole-voyage approval is implied.'};
}
