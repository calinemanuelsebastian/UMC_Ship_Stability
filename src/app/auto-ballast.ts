import {tankWeight,roleOf,type TankCatalog} from './tank-operations';
import {evaluateWeights,type WeightDraft} from './loading-state';
import type {ShipModelPackage} from '../core/domain/ship-model';
import type {ScenarioState} from './saved-scenarios';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
import {computeTrimEquilibrium} from '../core/trim/compute-trim-equilibrium';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {computeTableTrim} from '../core/trim/trimmed-table';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import {heelEquilibrium} from '../core/stability/heel-equilibrium';
import {buildAssessmentReport} from './assessment-report';
import {vesselCapacityLimit,resolveCapacityLimit} from './capacity-limit';
export type BallastBound={id:string;locked:boolean;min:number;max:number};
export type BallastGoals={trim?:number;list?:number;draft?:number;trimTolerance:number;listTolerance:number;draftTolerance:number;maxDraft?:number;maxDisplacement?:number;minGM:number;objective:'change'|'mass';requireIntact:boolean};
export type BallastMetrics={mass:number;draft?:number;trim?:number;list?:number;gm?:number;maxEndDraft?:number;missing:string[]};
export type BallastEvaluation={metrics:BallastMetrics;failures:string[];missing:string[];report?:unknown};
export type BallastCandidate={weights:WeightDraft[];volumes:number[];evaluation:BallastEvaluation;violation:number;cost:number};
export type BallastProposal={best?:BallastCandidate;before:BallastEvaluation;evaluations:number;exhausted:boolean;reasons:string[];feasible:boolean};
export function ballastBounds(catalog:TankCatalog,weights:WeightDraft[]):BallastBound[]{return catalog.tanks.filter(t=>t.group==='ballast').map(t=>({id:t.id,locked:!weights.some(w=>w.tank?.id===t.id),min:0,max:t.capacityM3}));}
export function ballastWeights(catalog:TankCatalog,weights:WeightDraft[],bounds:BallastBound[],volumes:number[]){
 const map=new Map(bounds.map((b,i)=>[b.id,volumes[i]]));
 return weights.map(w=>{if(!w.tank||!map.has(w.tank.id))return w;const t=catalog.tanks.find(t=>t.id===w.tank!.id&&t.group==='ballast');if(!t)throw new Error('Unknown ballast tank.');return tankWeight(t,{...w.tank,volumeM3:map.get(t.id)!});});
}
export function constraintViolation(m:BallastMetrics,g:BallastGoals){
 if(!Number.isFinite(m.mass))return Infinity;let v=0;for(const [key,tolerance] of [['trim',g.trimTolerance],['list',g.listTolerance],['draft',g.draftTolerance]] as const){if(g[key]!==undefined){if(m[key]===undefined||!Number.isFinite(m[key]))return Infinity;v+=Math.max(0,Math.abs(m[key]!-g[key]!)/tolerance-1)**2;}}
 if(m.gm===undefined||!Number.isFinite(m.gm))return Infinity;v+=Math.max(0,(g.minGM-m.gm)/.05)**2;
 if(g.maxDraft!==undefined){if(m.maxEndDraft===undefined||!Number.isFinite(m.maxEndDraft))return Infinity;v+=Math.max(0,(m.maxEndDraft-g.maxDraft)/.01)**2;}
 if(g.maxDisplacement!==undefined)v+=Math.max(0,(m.mass-g.maxDisplacement)/1)**2;
 return v;
}
/** Bounded deterministic coordinate search with endpoint/midpoint starts and a small-grid exhaustive path.
 * Feasibility precedes cost. No convergence/global optimality claim; errors never become feasible scores. */
export async function optimiseBallast(catalog:TankCatalog,weights:WeightDraft[],bounds:BallastBound[],goals:BallastGoals,evaluate:(w:WeightDraft[],final:boolean)=>Promise<BallastEvaluation>,options:{signal?:AbortSignal;budget?:number;progress?:(n:number)=>void}={}):Promise<BallastProposal>{
 const budget=options.budget??240;if(!Number.isInteger(budget)||budget<1||budget>2000)throw new Error('Invalid search budget.');
 if([goals.trimTolerance,goals.listTolerance,goals.draftTolerance].some(n=>!Number.isFinite(n)||n<=0)||!Number.isFinite(goals.minGM)||goals.minGM<=0||[goals.trim,goals.list,goals.draft,goals.maxDraft,goals.maxDisplacement].some(n=>n!==undefined&&!Number.isFinite(n))||!['mass','change'].includes(goals.objective))throw new Error('Enter finite targets, positive tolerances and positive minimum GM.');
 if([goals.draft,goals.maxDraft,goals.maxDisplacement].some(n=>n!==undefined&&n<=0))throw new Error('Draft and displacement limits must be positive.');
 const ids=new Set<string>();const initial=bounds.map(b=>{const t=catalog.tanks.find(t=>t.id===b.id&&t.group==='ballast'),w=weights.find(w=>w.tank?.id===b.id);if(!t||!w?.tank||ids.has(b.id)||![b.min,b.max].every(Number.isFinite)||b.min<0||b.max>t.capacityM3||b.min>b.max||w.tank.volumeM3<0||w.tank.volumeM3>t.capacityM3)throw new Error('Start an editable ballast plan and review tank bounds.');ids.add(b.id);if(b.locked&&(w.tank.volumeM3<b.min||w.tank.volumeM3>b.max))throw new Error('A locked tank violates its fill restriction.');return w.tank.volumeM3;});
 if(weights.filter(w=>w.tank&&ids.has(w.tank.id)).length!==bounds.length)throw new Error('Duplicate ballast tank identity.');
 const abort=()=>{if(options.signal?.aborted)throw new DOMException('Ballast search cancelled.','AbortError');};abort();
 let before:BallastEvaluation;try{before=await evaluate(weights,false);}catch(e){before={metrics:{mass:NaN,missing:[]},failures:[String(e)],missing:[]};}abort();let evaluations=0;const cache=new Map<string,BallastCandidate>(),reasons=new Set<string>();let best:BallastCandidate|undefined;
 const better=(a:BallastCandidate,b?:BallastCandidate)=>!b||a.violation<b.violation-1e-10||Math.abs(a.violation-b.violation)<1e-10&&a.cost<b.cost-1e-8;
 async function trial(raw:number[]){abort();const volumes=raw.map((v,i)=>bounds[i].locked?initial[i]:Math.max(bounds[i].min,Math.min(bounds[i].max,v))),key=JSON.stringify(volumes);const cached=cache.get(key);if(cached)return cached;if(evaluations>=budget)return undefined;
  const next=ballastWeights(catalog,weights,bounds,volumes);let e:BallastEvaluation;try{e=await evaluate(next,false);}catch(error){e={metrics:{mass:NaN,missing:[]},failures:[String(error)],missing:[]};}abort();evaluations++;options.progress?.(evaluations);
  e.failures.forEach(r=>reasons.add(r));const violation=e.failures.length?Infinity:constraintViolation(e.metrics,goals);const cost=volumes.reduce((sum,v,i)=>sum+(goals.objective==='mass'?v:Math.abs(v-initial[i]))*weights.find(w=>w.tank?.id===bounds[i].id)!.tank!.density,0);const candidate={weights:next,volumes,evaluation:e,violation,cost};cache.set(key,candidate);if(Number.isFinite(violation)&&better(candidate,best))best=candidate;
  if(evaluations%8===0)await new Promise(resolve=>setTimeout(resolve,0));return candidate;
 }
 await trial(initial);const movable=bounds.map((b,i)=>!b.locked&&b.max>b.min?i:-1).filter(i=>i>=0);
 // Independent coarse enumeration for up to three variables avoids coordinate barriers at empty/full FSM discontinuities.
 if(movable.length<=3){const visit=async(v:number[],depth:number):Promise<void>=>{if(evaluations>=budget)return;if(depth===movable.length){await trial(v);return;}const i=movable[depth];for(const f of [0,.25,.5,.75,1]){const n=[...v];n[i]=bounds[i].min+f*(bounds[i].max-bounds[i].min);await visit(n,depth+1);}};await visit(initial,0);}
 else for(const f of [0,.5,1])await trial(bounds.map(b=>b.min+f*(b.max-b.min)));
 for(const fraction of [.25,.1,.025,.005]){let improved=true;while(improved&&evaluations<budget){improved=false;const start=best;for(const i of movable){const base=best?.volumes??initial;for(const sign of [-1,1]){const v=[...base];v[i]+=sign*fraction*(bounds[i].max-bounds[i].min);await trial(v);}}improved=best!==start;}}
 abort();if(best){
  const finalists=[...cache.values()].filter(c=>Number.isFinite(c.violation)).sort((a,b)=>a.violation-b.violation||a.cost-b.cost).slice(0,8);
  let reviewed:BallastCandidate|undefined;
  for(const c of finalists){abort();let final:BallastEvaluation;try{final=await evaluate(c.weights,true);}catch(e){final={...c.evaluation,failures:[String(e)]};}abort();const candidate={...c,evaluation:final,violation:final.failures.length?Infinity:constraintViolation(final.metrics,goals)};final.failures.forEach(r=>reasons.add(r));if(!reviewed||better(candidate,reviewed))reviewed=candidate;if(candidate.violation<=1e-10){reviewed=candidate;break;}}
  best=reviewed;
 }
 return {best,before,evaluations,exhausted:evaluations>=budget,reasons:[...reasons].slice(0,12),feasible:!!best&&best.violation<=1e-10};
}
export async function createBallastEvaluator(ship:ShipModelPackage,state:ScenarioState,goals:BallastGoals){
 if(state.scenario!=='loading'||!state.density||state.density<=0||state.longitudinalFsm!==0)throw new Error('Use weight-based loading, positive surrounding-water density and zero longitudinal FSM for this proposal method.');
 const documented=vesselCapacityLimit(ship),massLimit=documented?await resolveCapacityLimit(ship,documented,state.density):undefined;
 const table=ship.manifest.resources.some(r=>r.kind==='hydrostatics.trimmed-table')?await loadTrimmedTable(ship):undefined;
 return async(weights:WeightDraft[],final:boolean):Promise<BallastEvaluation>=>{
  const l=evaluateWeights(weights);if(!l.result)throw new Error(l.error);const condition={...l.result,waterDensity:state.density!},failures:string[]=[],missing:string[]=[];
  const hydro=await computeUprightHydrostatics(ship,condition);const metrics:BallastMetrics={mass:l.result.displacementTonnes,draft:hydro.draft,gm:hydro.gmTransverseCorrected,missing};
  if(hydro.warnings.some(w=>w.severity==='error'))failures.push(...hydro.warnings.filter(w=>w.severity==='error').map(w=>w.message));
  try{const trim=table?computeTableTrim(table,condition,ship.manifest.principalDimensions.lbp):await computeTrimEquilibrium(ship,{...condition,tcg:0},{freeSurfaceMomentLongitudinal:0});metrics.trim=trim.trimMetres;if('kmTransverse' in trim){metrics.gm=trim.kmTransverse===undefined?undefined:trim.kmTransverse-l.result.vcg-l.result.freeSurfaceMomentTransverse/l.result.displacementTonnes;}metrics.maxEndDraft=trim.draftAft!==undefined&&trim.draftForward!==undefined?Math.max(trim.draftAft,trim.draftForward):undefined;}catch(e){missing.push(String(e));if(goals.trim!==undefined||goals.maxDraft!==undefined)failures.push(String(e));}
  try{const curve=await computeStabilityCurves(ship,condition,{longitudinalFsm:0}),heel=heelEquilibrium(curve);metrics.list=heel.equilibrium?.heelDeg;if(metrics.list===undefined)missing.push(heel.message);}catch(e){missing.push(String(e));}
  if(massLimit!==undefined&&metrics.mass>massLimit+1e-8)failures.push('Documented displacement limit exceeded at surrounding-water density.');
  if(!documented)missing.push('No documented displacement/loading limit.');
  missing.push('End drafts are longitudinal-reference drafts; coupled heeled end drafts are not predicted.','Pumping sequence, ballast management/discharge restrictions and longitudinal strength are not assessed.');
  let report:Awaited<ReturnType<typeof buildAssessmentReport>>|undefined;
  if(final){report=await buildAssessmentReport(ship,{...state,weights},{pending:false,...condition,longitudinalFsm:0});
   const sectionNames:Record<string,string>={basis:'Assessment basis',trim:'Reference trim',intact:'Intact stability',intactOverview:'Directional intact stability',permissibleTrim:'Permissible trim',limitingKg:'Limiting KG',weather:'Wind and rolling',securing:'Cargo securing',cargoLoads:'Cargo surface loads',equilibrium:'Heel equilibrium'};
   for(const [section,value] of Object.entries(report.sections)){
    const name=sectionNames[section]??section;
    const walk=(value:unknown)=>{if(!value||typeof value!=='object')return;const o=value as Record<string,unknown>;if(typeof o.status==='string'){if(/Below numerical minimum|Exceeds|Outside|Not satisfied|Fails/i.test(o.status))failures.push(name+': '+o.status);else if(/Insufficient|Incomplete|Not assessed|unresolved|No documented/i.test(o.status))missing.push(name+': '+o.status+(typeof o.reason==='string'?' — '+o.reason:''));}for(const v of Object.values(o))walk(v);};walk(value);
   }
   const securing=report.sections.securing as {unassigned?:string[]};if(securing?.unassigned?.length)missing.push('Cargo securing: some cargo/supports have no securing group.');

   const overview=report.sections.intactOverview as {numericalComplete?:boolean};if(goals.requireIntact&&!overview?.numericalComplete)failures.push('Complete directional intact checks are required but unavailable.');
  }
  return {metrics,failures:[...new Set(failures)],missing:[...new Set(missing)],report};
 };
}
export function assertEditableBallast(ship:ShipModelPackage,catalog:TankCatalog,weights:WeightDraft[]){if(weights.some(w=>!w.tank&&roleOf(ship,w)==='ballast'))throw new Error('Replace the reference ballast group with an editable tank plan first.');if(!catalog.tanks.filter(t=>t.group==='ballast').some(t=>weights.some(w=>w.tank?.id===t.id)))throw new Error('Start an editable ballast plan first.');}
