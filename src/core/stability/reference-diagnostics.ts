import type {WeatherReference} from './weather-evidence';

/** Four independently rounded 0.001 m quantities can differ by up to 0.002 m. */
export const leverRoundingBound = .002;
export function referenceDiagnostics(c:WeatherReference) {
 const rows=c.rows;
 if(rows.length<2||rows.some((r,i)=>![r.anglePortDeg,r.kn,r.kgSin,r.tcgCos,r.gzCorrectedPort,r.areaPort].every(Number.isFinite)||i>0&&r.anglePortDeg<=rows[i-1].anglePortDeg))throw new Error('Invalid diagnostic curve.');
 const leverChecks=rows.map(r=>({anglePortDeg:r.anglePortDeg,printed:r.gzCorrectedPort,reconstructed:r.kn-r.kgSin-r.tcgCos,residual:r.kn-r.kgSin-r.tcgCos-r.gzCorrectedPort}));
 const issues=leverChecks.filter(r=>Math.abs(r.residual)>leverRoundingBound+1e-10);
 const areas=[[0,30],[0,40],[30,40]].map(([from,to])=>{
  // Compare exact printed endpoints only. Do not synthesize a source area ordinate.
  const a=rows.findIndex(r=>r.anglePortDeg===from),b=rows.findIndex(r=>r.anglePortDeg===to);
  if(a<0||b<0)return {from,to,available:false as const};
  let calculated=0;
  for(let i=a+1;i<=b;i++)calculated+=(rows[i-1].gzCorrectedPort+rows[i].gzCorrectedPort)/2*(rows[i].anglePortDeg-rows[i-1].anglePortDeg)*Math.PI/180;
  const printed=rows[b].areaPort-rows[a].areaPort;
  return {from,to,available:true as const,calculated,printed,difference:calculated-printed};
 });
 return {caseId:c.id,sourceFile:c.sourceFile,sourceSha256:c.sourceSha256,curvePage:c.curvePage,rowCount:rows.length,leverRoundingBound,maxLeverResidual:Math.max(...leverChecks.map(r=>Math.abs(r.residual))),issues,areas,scope:'Source arithmetic and sampled-curve integration diagnostics only; not a validation of the live ship solver or a compliance verdict. Area differences can reflect source rounding and integration of a finer curve. Original values are unchanged.'};
}
