import type {StabilityResult} from '../domain/stability-result';
/** Symmetric buoyancy estimate only: KN(-phi)=-KN(phi); GZ is not odd when TCG != 0.
 * Never reflect opening/downflooding limits or change the source starboard points.
 */
export function derivePortEstimate(source:StabilityResult):StabilityResult {
 const p=source.points;
 if(p.length<3||p[0].heelDeg!==0||p.some((v,i)=>![v.heelDeg,v.kn,v.gz,v.gzCorrected].every(Number.isFinite)||i>0&&v.heelDeg<=p[i-1].heelDeg)||!Number.isFinite(source.condition.tcg))throw new Error('Port estimate requires finite, ordered starboard samples starting at zero.');
 const port=p.slice(1).reverse().map(v=>{
  const transverse=2*source.condition.tcg*Math.cos(v.heelDeg*Math.PI/180);
  return {heelDeg:-v.heelDeg,kn:-v.kn,gz:-v.gz-transverse,gzCorrected:-v.gzCorrected-transverse};
 });
 return {...source,points:[...port,...p.map(v=>({...v}))],derivedPort:true,warnings:[...source.warnings,'Port KN is estimated by symmetric buoyancy. TCG is retained with its original sign; port flooding and heeled drafts are unknown. This is an educational estimate, not additional source data.']};
}
/** Diagnostic coefficients, not inputs silently promoted into a compliance check. */
export function estimateGeometryInputs(i:{mass:number;density:number;length:number;beam:number;draft:number;depth:number;appendageFactor:number}) {
 if(!Object.values(i).every(Number.isFinite)||Object.values(i).some(v=>v<=0)||i.appendageFactor<1||i.draft>=i.depth)throw new Error('Positive geometry inputs and draft below deck are required.');
 const volume=i.mass/i.density;
 const cb=volume/i.appendageFactor/(i.length*i.beam*i.draft);
 if(cb>1)throw new Error('Volume is inconsistent with the selected dimensions.');
 return {volume,cb,deckAngle:Math.atan2(i.depth-i.draft,i.beam/2)*180/Math.PI};
}
