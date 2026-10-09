import type {StabilityResult,StabilityPoint} from '../domain/stability-result';
export type IntactRow={id:string;label:string;unit:string;limit:number;value?:number;margin?:number;status:'Insufficient data'|'Meets numerical minimum'|'Below numerical minimum';reason:string};
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
export function assessIntact(result?:StabilityResult):IntactRow[] {
 const points=result?.points??[];
 const valid=points.length>=3&&points.every((p,i)=>[p.heelDeg,p.gzCorrected].every(Number.isFinite)&&(i===0||p.heelDeg>points[i-1].heelDeg));
 const p=valid?points:[];
 const zero=p.find(x=>x.heelDeg===0),next=p.find(x=>x.heelDeg>0);
 const slope=zero&&next&&next.heelDeg<=2?(next.gzCorrected-zero.gzCorrected)/(next.heelDeg*rad):undefined;
 const gm=result?.gmAtTrim?.correctedGm??slope;
 const tableGm=result?.gmAtTrim!==undefined&&Number.isFinite(result.gmAtTrim.correctedGm);
 const positive=p.filter(x=>x.heelDeg>=0),tail=positive.filter(x=>x.heelDeg>=30);
 const maximum=positive.length?Math.max(...positive.map(x=>x.gzCorrected)):undefined;
 const peaks=positive.filter(x=>x.gzCorrected===maximum);
 const peak=peaks.length===1&&peaks[0]!==positive.at(-1)&&peaks[0]!==positive[0]?peaks[0].heelDeg:undefined;
 const unavailable='No compatible curve is available for the current condition.';
 const flooding='Numerical estimate only. The usable range before downflooding is unconfirmed; only starboard samples are evaluated.';
 const definitions:[string,string,string,number,number|undefined,string][]=[
  ['area30','Area 0–30°','m·rad',.055,integrateGz(p,0,30),flooding],
  ['areaX','Area 0–X (shown at 40°)','m·rad',.09,integrateGz(p,0,40),'X = min(40°, downflooding angle). Value shown at 40° only; X is unconfirmed.'],
  ['area30X','Area 30°–X (shown at 40°)','m·rad',.03,integrateGz(p,30,40),'X = min(40°, downflooding angle). Value shown at 40° only; X is unconfirmed.'],
  ['gz','Largest sampled GZ at or above 30°','m',.2,tail.length?Math.max(...tail.map(x=>x.gzCorrected)):undefined,flooding],
  ['peak','Angle of maximum GZ','°',25,peak,peak===undefined?'The maximum is unresolved at the curve boundary or shared by multiple samples.':'Sampled maximum only; extrema between samples and the flooding boundary remain unresolved.'],
  ['gm',tableGm?'Corrected initial GM at calculated trim':'Corrected initial GM (slope estimate)','m',.15,gm,tableGm?'KM at current displacement and initial trim, minus physical KG and FSM/displacement. Provisional source check; not overall compliance.':'0–2° secant estimate only. A validated initial GM at the calculated trim is not supplied.'],
 ];
 return definitions.map(([id,label,unit,limit,value,reason])=>{
  // Numerical curve checks are scoped to the supplied direction and method.
  // The X-dependent criteria require a known flooding boundary, not an invented 40°.
  const reached=result?.downflooding?.firstReachedAngle;
  const blockedByFlooding=reached!==undefined&&(id==='area30'?reached<=30:id==='gz'||id==='peak');
  const eligible=valid&&value!==undefined&&Number.isFinite(value)&&!blockedByFlooding&&
   (id==='area30'||id==='gz'||id==='peak'||id==='gm'&&tableGm);
  const status=eligible?(value!>=limit?'Meets numerical minimum':'Below numerical minimum'):'Insufficient data';
  return {id,label,unit,limit,value,margin:value===undefined?undefined:value-limit,status:status as IntactRow['status'],
   reason:blockedByFlooding?'A sampled flooding threshold has been reached in the evaluated range. No intact-curve verdict is available.':!valid?unavailable:value===undefined&&id!=='peak'?'Insufficient curve coverage for this estimate.':reason};
 });
}

export function summarizeIntact(rows:IntactRow[]) {
 return {meets:rows.filter(r=>r.status==='Meets numerical minimum').length,
  below:rows.filter(r=>r.status==='Below numerical minimum').length,
  unavailable:rows.filter(r=>r.status==='Insufficient data').length};
}
