import type {ShipModelPackage, SimulationCondition, Point3} from '../domain/ship-model';
import {sharedResults, normalizedCondition} from '../calculations/shared-results';

type V = [number,number,number];
export type EquilibriumBox = {length:number;beam:number;depth:number};
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mean=(v:V[]):V=>[0,1,2].map(k=>v.reduce((s,p)=>s+p[k],0)/v.length) as V;
/** Body X forward, Y up, Z starboard. Same Rx(heel) Rz(pitch) as the renderer. */
export function rotateEquilibriumPoint(v:V,pitch:number,heel:number):V {
 const x=Math.cos(pitch)*v[0]-Math.sin(pitch)*v[1],y=Math.sin(pitch)*v[0]+Math.cos(pitch)*v[1];
 return [x,Math.cos(heel)*y-Math.sin(heel)*v[2],Math.sin(heel)*y+Math.cos(heel)*v[2]];
}
export function boxVertices(b:EquilibriumBox):V[]{
 return [-b.length/2,b.length/2].flatMap(x=>[0,b.depth].flatMap(y=>[-b.beam/2,b.beam/2].map(z=>[x,y,z] as V)));
}
/** Exact planar clipping of a convex box, integrated as non-overlapping tetrahedra. */
export function immersedBox(b:EquilibriumBox,normal:V,level:number){
 const v=boxVertices(b),cuts:V[]=[],faces:V[][]=[];
 for(const ids of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]){
  const out:V[]=[];
  ids.forEach((id,i)=>{const a=v[id],c=v[ids[(i+1)%4]],da=dot(normal,a)-level,dc=dot(normal,c)-level;
   if(da<=0)out.push(a);
   if((da<0&&dc>0)||(da>0&&dc<0)){const f=da/(da-dc),p=a.map((n,k)=>n+f*(c[k]-n)) as V;out.push(p);cuts.push(p);}
   if(Math.abs(da)<1e-10)cuts.push(a);
  });if(out.length>=3)faces.push(out);
 }
 const waterline=cuts.filter((p,i)=>cuts.findIndex(q=>Math.hypot(...sub(p,q))<1e-9)===i);
 if(waterline.length>=3){const centre=mean(waterline),u=sub(waterline[0],centre),w=cross(normal,u);waterline.sort((a,c)=>Math.atan2(dot(sub(a,centre),w),dot(sub(a,centre),u))-Math.atan2(dot(sub(c,centre),w),dot(sub(c,centre),u)));faces.push(waterline);}
 if(!faces.length)return {volume:0,centre:[0,0,0] as V,waterline};
 const o=mean(faces.flat());let volume=0;const moment:V=[0,0,0];
 for(const f of faces)for(let i=1;i<f.length-1;i++){
  const a=f[0],c=f[i],d=f[i+1],dv=Math.abs(dot(sub(a,o),cross(sub(c,o),sub(d,o))))/6;
  volume+=dv;for(let k=0;k<3;k++)moment[k]+=dv*(o[k]+a[k]+c[k]+d[k])/4;
 }
 return {volume,centre:moment.map(n=>volume?n/volume:0) as V,waterline};
}
/** Numerical accuracy is relative to this explicitly sealed, rigid rectangular hull only. */
export function solveBoxEquilibrium(b:EquilibriumBox,mass:number,density:number,gravity:V){
 if(![b.length,b.beam,b.depth,mass,density,...gravity].every(Number.isFinite)||![b.length,b.beam,b.depth,mass,density].every(n=>n>0))throw new Error('Equilibrium requires finite dimensions, positive mass and density.');
 const target=mass/density,capacity=b.length*b.beam*b.depth;
 if(target<=capacity*1e-6||target>=capacity*(1-1e-6))throw new Error('Displacement is outside the surface-piercing hull capacity.');
 const evaluate=(pitch:number,heel:number)=>{
  const normal:V=[Math.cos(heel)*Math.sin(pitch),Math.cos(heel)*Math.cos(pitch),-Math.sin(heel)];
  const heights=boxVertices(b).map(v=>dot(normal,v));let lo=Math.min(...heights),hi=Math.max(...heights);
  for(let j=0;j<48;j++){const mid=(lo+hi)/2;if(immersedBox(b,normal,mid).volume<target)lo=mid;else hi=mid;}
  const level=(lo+hi)/2,wet=immersedBox(b,normal,level),B=rotateEquilibriumPoint(wet.centre,pitch,heel),G=rotateEquilibriumPoint(gravity,pitch,heel);
  return {...wet,level,normal,residual:[B[0]-G[0],B[2]-G[2]],energy:G[1]-B[1]};
 };
 let pitch=0,heel=0,r=evaluate(0,0),iterations=0;
 const step=1e-5,tolerance=1e-7,norm=(r:ReturnType<typeof evaluate>)=>Math.hypot(...r.residual);
 for(;iterations<35&&norm(r)>tolerance;iterations++){
  const p=evaluate(pitch+step,heel),h=evaluate(pitch,heel+step);
  const a=(p.residual[0]-r.residual[0])/step,c=(p.residual[1]-r.residual[1])/step,d=(h.residual[1]-r.residual[1])/step,bb=(h.residual[0]-r.residual[0])/step,det=a*d-bb*c;
  if(!Number.isFinite(det)||Math.abs(det)<1e-10)throw new Error('Coupled equilibrium is singular or unresolved.');
  const dp=(-r.residual[0]*d+bb*r.residual[1])/det,dh=(c*r.residual[0]-a*r.residual[1])/det;
  let accepted=false;
  for(let scale=1;scale>=1/1024;scale/=2){const np=pitch+scale*dp,nh=heel+scale*dh;
   if(Math.abs(np)>10*Math.PI/180||Math.abs(nh)>30*Math.PI/180)continue;
   const next=evaluate(np,nh);if(norm(next)<norm(r)){pitch=np;heel=nh;r=next;accepted=true;break;}
  }
  if(!accepted)throw new Error('No coupled equilibrium converged within 30° heel and 10° trim.');
 }
 if(norm(r)>tolerance||Math.abs(r.volume-target)>target*1e-9)throw new Error('Coupled equilibrium residual exceeds tolerance.');
 // A root is not sufficient: require positive local potential-energy curvature in both rotations.
 const e=1e-4,E=(p:number,h:number)=>evaluate(p,h).energy;
 const pp=(E(pitch+e,heel)-2*r.energy+E(pitch-e,heel))/(e*e),hh=(E(pitch,heel+e)-2*r.energy+E(pitch,heel-e))/(e*e);
 const ph=(E(pitch+e,heel+e)-E(pitch+e,heel-e)-E(pitch-e,heel+e)+E(pitch-e,heel-e))/(4*e*e);
 if(pp<=1e-6||hh<=1e-6||pp*hh-ph*ph<=1e-6)throw new Error('The equilibrium is unstable or neutral; no stable attitude is displayed.');
 const draft=(x:number)=>(r.level-r.normal[0]*x)/r.normal[1];
 const draftAft=draft(-b.length/2),draftForward=draft(b.length/2);
 if([draftAft,draftForward].some(d=>d<0||d>b.depth))throw new Error('Centreline end immersion is outside this view’s supported draft range.');
 return {pitch,heel,heave:-r.level,draftAft,draftForward,trimDeg:-pitch*180/Math.PI,heelDeg:heel*180/Math.PI,
  verticalDraftAft:r.level+r.normal[0]*b.length/2,verticalDraftForward:r.level-r.normal[0]*b.length/2,
  volume:r.volume,volumeResidual:r.volume-target,momentLeverResidual:norm(r),iterations,buoyancy:r.centre,waterline:r.waterline};
}
export const coupledCoverageMessage='Coupled equilibrium requires validated underwater geometry or coupled hydrostatic data. This ship supplies only reference trim and heel calculations.';
export function hasCoupledEquilibrium(ship:ShipModelPackage){return ship.manifest.resources.some(r=>r.kind==='visualization.box-hull')&&!ship.manifest.resources.some(r=>r.kind==='visualization.schematic-cargo-hull');}
export function computeCoupledEquilibrium(ship:ShipModelPackage,condition:SimulationCondition,longitudinalFsm=0){
 return sharedResults.read(ship,'coupled-equilibrium',{condition:normalizedCondition(condition),longitudinalFsm},(s,{condition:c,longitudinalFsm:fsm})=>{
  if(!hasCoupledEquilibrium(s))throw new Error(coupledCoverageMessage);
  if(c.freeSurfaceMomentTransverse!==0||fsm!==0)throw new Error('Coupled equilibrium requires fixed liquid centres. Partly filled tanks need a validated liquid-shift model; constant free-surface corrections are not substituted.');
  const m=s.manifest,{lbp:length,beam,mouldedDepth:depth}=m.principalDimensions,axes=m.coordinateSystem;
  if(m.units.length!=='m'||m.units.mass!=='t'||m.units.density!=='t/m3'||!Number.isFinite(axes.longitudinalOriginFromAP)||depth===undefined)throw new Error('Coupled equilibrium requires metre/tonne units and explicit hull datums.');
  const result=solveBoxEquilibrium({length,beam,depth},c.displacementTonnes!,c.waterDensity,[axes.longitudinalOriginFromAP!+(axes.xPositive==='forward'?c.lcg:-c.lcg)-length/2,axes.zPositive==='up'?c.vcg:-c.vcg,axes.yPositive==='starboard'?c.tcg:-c.tcg]);
  const B=result.buoyancy;
  const centreOfBuoyancy:Point3={x:(B[0]+length/2-axes.longitudinalOriginFromAP!)*(axes.xPositive==='forward'?1:-1),y:B[2]*(axes.yPositive==='starboard'?1:-1),z:B[1]*(axes.zPositive==='up'?1:-1)};
  return {...result,centreOfBuoyancy,warnings:['Sealed rigid rectangular hull; no waves, external loads, flooding or liquid redistribution. Local stability verified within the supported angle range.']};
 });
}
