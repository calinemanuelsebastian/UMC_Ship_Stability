import type {ShipModelPackage} from '../core/domain/ship-model';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {sharedResults} from '../core/calculations/shared-results';
export type StudyWeight={id:string;name:string;group:string;fill:number|null;density:number|null;mass:number;kg:number;lcg:number;tcg:number;fsm:number;flag:string;page:number;sourceText:string};
export type StudyCase={id:string;name:string;family:string;source:string;trajectoryPage:number;weightPages:number[];strengthPages:number[];qualifications:string[];total:{mass:number;kg:number;lcg:number;tcg:number;fsm:number};waterDensity:number;staticHeel:number|null;direction:'SB'|'PS';trajectory:number[][];items:StudyWeight[];arrangement:{page:number;image:string}[];summaryText:string;reconciliation:{massDifferenceTonnes:number;maxCentreDifferenceMetres:number}};
export type StudyLibrary={version:1;modelId:string;sources:Record<string,{sha256:string;pages:number}>;cases:StudyCase[];note:string};
export function parseStudyLibrary(raw:unknown,modelId:string):StudyLibrary{
 const v=raw as StudyLibrary;const fail=()=>{throw new Error('Invalid documented study library.');};
 if(!v||v.version!==1||v.modelId!==modelId||typeof v.note!=='string'||!v.sources||!Array.isArray(v.cases)||!v.cases.length||v.cases.length>100)fail();
 for(const source of Object.values(v.sources))if(!source||!Number.isInteger(source.pages)||source.pages<1||! /^[a-f0-9]{64}$/.test(source.sha256))fail();
 const ids=new Set<string>();
 for(const c of v.cases){
  if(!c||typeof c.id!=='string'||ids.has(c.id)||typeof c.name!=='string'||typeof c.family!=='string'||!['SB','PS'].includes(c.direction)||!v.sources[c.source]||!Number.isInteger(c.trajectoryPage)||c.trajectoryPage<1||c.trajectoryPage>v.sources[c.source].pages||!Array.isArray(c.qualifications)||!c.qualifications.every(s=>typeof s==='string')||!c.total||![c.total.mass,c.total.kg,c.total.lcg,c.total.tcg,c.total.fsm,c.waterDensity].every(Number.isFinite)||c.total.mass<=0||c.waterDensity<=0||c.staticHeel!==null&&!Number.isFinite(c.staticHeel))fail();ids.add(c.id);
  if(!Array.isArray(c.trajectory)||c.trajectory.length<2||c.trajectory.length>100||c.trajectory.some((r,i)=>!Array.isArray(r)||r.length!==8||!r.every(Number.isFinite)||r[0]<0||r[0]>90||i>0&&r[0]<=c.trajectory[i-1][0]))fail();
  if(!Array.isArray(c.items)||!c.items.length||c.items.length>1000||!Array.isArray(c.arrangement)||c.arrangement.length>5||!Array.isArray(c.weightPages)||!Array.isArray(c.strengthPages)||typeof c.summaryText!=='string'||![...c.weightPages,...c.strengthPages].every(n=>Number.isInteger(n)&&n>0)||!c.reconciliation||![c.reconciliation.massDifferenceTonnes,c.reconciliation.maxCentreDifferenceMetres].every(Number.isFinite))fail();
  const rowIds=new Set<string>();
  for(const r of c.items){if(!r||typeof r.id!=='string'||rowIds.has(r.id)||typeof r.name!=='string'||typeof r.group!=='string'||typeof r.sourceText!=='string'||!['','!','#'].includes(r.flag)||![r.mass,r.kg,r.lcg,r.tcg,r.fsm,r.page].every(Number.isFinite)||r.mass<0||r.fill!==null&&(!Number.isFinite(r.fill)||r.fill<0||r.fill>100)||r.density!==null&&(!Number.isFinite(r.density)||r.density<=0))fail();rowIds.add(r.id);}
  for(const a of c.arrangement)if(!Number.isInteger(a.page)||typeof a.image!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(a.image)||a.image.length>2000000)fail();
  const mass=c.items.reduce((sum,r)=>sum+r.mass,0);
  if(Math.abs(mass-c.total.mass)>.08)fail();
  for(const k of ['lcg','tcg','kg'] as const)if(Math.abs(c.items.reduce((sum,r)=>sum+r.mass*r[k],0)/mass-c.total[k])>.003)fail();
 }
 return v;
}
export function loadStudyLibrary(ship:ShipModelPackage){
 return sharedResults.read(ship,'documented-studies',{},async snapshot=>{
  const resource=snapshot.manifest.resources.find(r=>r.kind==='documentation.study-cases');
  if(!resource?.path)throw new Error('No documented study cases are supplied for this vessel.');
  const response=await fetch(shipResourceUrl(snapshot,resource.path));if(!response.ok)throw new Error('Unable to load documented study cases.');
  return parseStudyLibrary(await response.json(),String(resource.config?.sourceModelId??snapshot.manifest.id));
 });
}
/** Select printed samples only: no interpolation or equilibrium claim. */
export function studySample(c:StudyCase,index:number){
 if(!Number.isInteger(index)||index<0||index>=c.trajectory.length)throw new Error('Choose a documented angle.');
 const r=c.trajectory[index];return {heel:r[0]*(c.direction==='PS'?-1:1),draft:r[1],trim:r[2],lever:r[3],gz:r[6],area:r[7]};
}
export function studyGroups(c:StudyCase){return [...new Set(c.items.map(r=>r.group))].map(group=>({group,items:c.items.filter(r=>r.group===group),mass:c.items.filter(r=>r.group===group).reduce((s,r)=>s+r.mass,0)}));}

/** Version 1 source rows are metres from AP/centreline/baseline, forward/starboard/up. */
export function studyPointInModel(ship:ShipModelPackage,p:{lcg:number;tcg:number;kg:number}) {
 const a=ship.manifest.coordinateSystem;
 if(ship.manifest.units.length!=='m'||!Number.isFinite(a.longitudinalOriginFromAP))throw new Error('Study coordinates require metre units and an explicit longitudinal datum.');
 return {x:(p.lcg-a.longitudinalOriginFromAP!)*(a.xPositive==='forward'?1:-1),y:p.tcg*(a.yPositive==='starboard'?1:-1),z:p.kg*(a.zPositive==='up'?1:-1)};
}
/** One common transform for points, ticks and the physically meaningful GZ=0 line. */
export function studyGzPlot(c:StudyCase) {
 const low=Math.min(0,...c.trajectory.map(r=>r[6])),high=Math.max(.1,...c.trajectory.map(r=>r[6]));
 const y=(gz:number)=>205-(gz-low)/(high-low)*175;
 return {low,high,zeroY:y(0),ticks:[low,0,high].filter((v,i,a)=>a.indexOf(v)===i).map(value=>({value,y:y(value)})),points:c.trajectory.map(r=>({x:70+r[0]/c.trajectory.at(-1)![0]*600,y:y(r[6])}))};
}
