import type {StabilityResult,StabilityPoint} from '../domain/stability-result';
export type IntactRow={id:string;label:string;unit:string;limit:number;value?:number;margin?:number;status:'Insufficient data'|'Meets numerical minimum'|'Below numerical minimum';reason:string;method?:string;resolutionDeg?:number};
const rad=Math.PI/180;
/** Signed trapezoidal integration of the supplied piecewise-linear curve, in m·rad. */
export function integrateGz(points:StabilityPoint[],from:number,to:number):number|undefined {
 if(!Number.isFinite(from)||!Number.isFinite(to)||from>=to||!points.length||points[0].heelDeg>from||points.at(-1)!.heelDeg<to)return undefined;
 let area=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(![a.heelDeg,b.heelDeg,a.gzCorrected,b.gzCorrected].every(Number.isFinite)||b.heelDeg<=a.heelDeg)return undefined;
  const lo=Math.max(from,a.heelDeg),hi=Math.min(to,b.heelDeg);if(hi<=lo)continue;
  const at=(x:number)=>a.gzCorrected+(b.gzCorrected-a.gzCorrected)*(x-a.heelDeg)/(b.heelDeg-a.heelDeg);
  area+=(at(lo)+at(hi))/2*(hi-lo)*rad;
 }
 return area;
}
export function directionalCurve(result:StabilityResult|undefined,direction:'starboard'|'port'){
 if(!result||direction==='starboard')return result;
 return {...result,points:result.points.filter(p=>p.heelDeg<=0).map(p=>({...p,heelDeg:-p.heelDeg,kn:-p.kn,gz:-p.gz,gzCorrected:-p.gzCorrected})).reverse(),downflooding:undefined};
}
export type IntactFloodLimit={angleDeg:number;source:string};
export function assessIntact(result?:StabilityResult,limit?:IntactFloodLimit):IntactRow[] {
 const declared=limit&&Number.isFinite(limit.angleDeg)&&limit.angleDeg>0&&limit.angleDeg<=90&&limit.source.trim()?limit:undefined;
 const points=result?.points??[];
 const valid=points.length>=3&&points.every((p,i)=>[p.heelDeg,p.gzCorrected].every(Number.isFinite)&&(i===0||p.heelDeg>points[i-1].heelDeg));
 const p=valid?points:[];
 const zero=p.find(x=>x.heelDeg===0),next=p.find(x=>x.heelDeg>0);
 const slope=zero&&next&&next.heelDeg<=2?(next.gzCorrected-zero.gzCorrected)/(next.heelDeg*rad):undefined;
 const gm=result?.gmAtTrim?.correctedGm??slope;
 const tableGm=result?.gmAtTrim!==undefined&&Number.isFinite(result.gmAtTrim.correctedGm);
 const floodUpper=result?.downflooding?.firstReachedAngle;
 const exact=declared&&(floodUpper===undefined||declared.angleDeg<=floodUpper)?declared:undefined;
 const end=Math.min(40,exact?.angleDeg??floodUpper??40);
 const positive=p.filter(x=>x.heelDeg>=0&&(!exact||x.heelDeg<exact.angleDeg)),tail=positive.filter(x=>x.heelDeg>=30);
 const maximum=positive.length?Math.max(...positive.map(x=>x.gzCorrected)):undefined;
 const peaks=positive.filter(x=>x.gzCorrected===maximum);
 const peak=peaks.length===1&&peaks[0]!==positive.at(-1)&&peaks[0]!==positive[0]?peaks[0].heelDeg:undefined;
 const peakIndex=peak===undefined?-1:positive.findIndex(x=>x.heelDeg===peak);
 const resolution=peakIndex>0?positive[peakIndex+1].heelDeg-positive[peakIndex-1].heelDeg:undefined;
 const peakResolved=resolution!==undefined&&resolution<=2;
 const unavailable='No compatible curve is available for the current condition.';
 const flooding=exact?`Numerical comparison within the operator-declared flooding range: ${exact.source}`:'Numerical estimate only. The usable range before downflooding is unconfirmed; only the selected side is evaluated.';
 const definitions:[string,string,string,number,number|undefined,string][]=[
  ['area30','Area 0–30°','m·rad',.055,integrateGz(p,0,30),flooding],
  ['areaX','Area 0–X (coverage estimate)','m·rad',.09,integrateGz(p,0,end),`X is unconfirmed. Integration ends at ${end}°; a sampled flooding threshold is only an upper bound on onset.`],
  ['area30X','Area 30°–X (coverage estimate)','m·rad',.03,end===30?0:integrateGz(p,30,end),`X is unconfirmed. Integration ends at ${end}°; a sampled flooding threshold is only an upper bound on onset.`],
  ['gz','Largest sampled GZ at or above 30°','m',.2,tail.length?Math.max(...tail.map(x=>x.gzCorrected)):undefined,flooding],
  ['peak','Angle of maximum GZ','°',25,peak,peak===undefined?'The maximum is unresolved at the curve boundary or shared by multiple samples.':'Sampled maximum only; extrema between samples and the flooding boundary remain unresolved.'],
  ['gm',tableGm?'Corrected initial GM at calculated trim':'Corrected initial GM (slope estimate)','m',.15,gm,tableGm?'KM at current displacement and initial trim, minus physical KG and FSM/displacement. Provisional source check; not overall compliance.':'0–2° secant estimate only. A validated initial GM at the calculated trim is not supplied.'],
 ];
 return definitions.map(([id,label,unit,limit,value,reason])=>{
  // Numerical curve checks are scoped to the supplied direction and method.
  // The X-dependent criteria require a known flooding boundary, not an invented 40°.
  const reached=exact?.angleDeg??result?.downflooding?.firstReachedAngle;
  const blockedByFlooding=reached!==undefined&&(id==='area30'?(exact?reached<30:reached<=30):!exact&&(id==='gz'||id==='peak'));
  const eligible=(valid||id==='gm'&&tableGm)&&value!==undefined&&Number.isFinite(value)&&!blockedByFlooding&&
   ((id==='areaX'||id==='area30X')&&!!exact||id==='area30'||id==='gz'||id==='peak'&&peakResolved||id==='gm'&&tableGm);
  const status=eligible?(value!>=limit-1e-12?'Meets numerical minimum':'Below numerical minimum'):'Insufficient data';
  return {id,label,unit,limit,value,method:'Piecewise-linear corrected GZ; exact segment integration in radians. Peak requires a bracket no wider than 2° (application resolution gate, not an IMO tolerance).',...(id==='peak'?{resolutionDeg:resolution}:{}),margin:value===undefined?undefined:Math.abs(value-limit)<=1e-12?0:value-limit,status:status as IntactRow['status'],
   reason:declared&&!exact?'Declared flooding angle conflicts with an earlier sampled threshold; review its applicability.':exact&&(id==='areaX'||id==='area30X')?`X = ${end}°. Operator-declared condition-specific flooding limit: ${exact.source}`:id==='peak'&&!peakResolved?'Peak angle is unresolved: the enclosing sample bracket exceeds 2° or the maximum is not isolated.':blockedByFlooding?'A sampled flooding threshold has been reached in the evaluated range. No intact-curve verdict is available.':!valid&&!(id==='gm'&&tableGm)?unavailable:value===undefined&&id!=='peak'?'Insufficient curve coverage for this estimate.':reason};
 });
}

export function summarizeIntact(rows:IntactRow[]) {
 return {meets:rows.filter(r=>r.status==='Meets numerical minimum').length,
  below:rows.filter(r=>r.status==='Below numerical minimum').length,
  unavailable:rows.filter(r=>r.status==='Insufficient data').length};
}

/** Shared by display and report. Opposite-side coverage is never silently mirrored. */
export function intactOverview(result?:StabilityResult,limits:{starboard?:IntactFloodLimit;port?:IntactFloodLimit}={}){
 const starboard=assessIntact(result,limits.starboard),port=assessIntact(directionalCurve(result,'port'),limits.port);
 return {method:'Piecewise-linear supplied ordinates; signed m·rad integration; no reapplication of FSM.',
  declaredFloodingLimits:limits,source:result?.source,freeSurfaceCorrectionMetres:result?.freeSurfaceCorrectionTransverse,
  directions:{starboard:{rows:starboard,summary:summarizeIntact(starboard)},port:{rows:port,summary:summarizeIntact(port),qualification:limits.port?'Operator-declared port flooding limit; applicability requires review.':result?.derivedPort?'Derived port curve; flooding coverage is not established.':'Only supplied negative-angle ordinates are used; port flooding is not established.'}},
  numericalComplete:[...starboard,...port].every(r=>r.status!=='Insufficient data'),complete:false,reason:'Directional numerical comparisons only. Flooding applicability and the complete vessel assessment remain separate.'};
}
