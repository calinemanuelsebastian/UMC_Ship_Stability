export type ConclusionStatus='passed'|'failed'|'unresolved';
export type Conclusion={label:string;status:ConclusionStatus;reason:string};
const pass=new Set(['Meets numerical limit','Meets numerical minimum','Within declared limit','Screened within declared limits','Both directions meet numerical limits','Within documented limits']);
const fail=new Set(['Outside numerical limit','Below numerical minimum','Exceeds declared limit','Outside documented limits','Average exceeds uniform limit']);
/** Unknown and qualified results fail closed; a calculated value alone is not a verdict. */
export function conclude(label:string,value:unknown):Conclusion{
 const statuses:ConclusionStatus[]=[],reasons:string[]=[];
 function visit(v:unknown){
  if(!v||typeof v!=='object')return;
  if(Array.isArray(v)){v.forEach(visit);return;}
  const r=v as Record<string,unknown>;
  for(const key of ['status','numericalStatus'])if(typeof r[key]==='string'){const s=r[key] as string;statuses.push(pass.has(s)?'passed':fail.has(s)?'failed':'unresolved');}
  for(const key of ['issues','qualifications','unassigned','unlocated','unsupported'])if(Array.isArray(r[key])&&r[key].length){statuses.push('unresolved');reasons.push(key==='unassigned'?`${r[key].length} cargo/support items have no securing group.`:key==='unlocated'||key==='unsupported'?`${r[key].length} ${key} cargo/support items.`:(r[key] as unknown[]).join(' '));}
  if(typeof r.reason==='string'&&r.status&&!pass.has(String(r.status)))reasons.push(r.reason);
  Object.values(r).forEach(visit);
 }
 visit(value);
 const status=statuses.includes('failed')?'failed':!statuses.length||statuses.includes('unresolved')?'unresolved':'passed';
 return {label,status,reason:[...new Set(reasons)].join(' ')||(status==='passed'?'Implemented numerical checks pass within their stated scope.':status==='failed'?'One or more numerical limits are exceeded. Review the detailed checks.':'No complete applicable assessment is available. Review inputs and source coverage.')};
}
export function assessmentConclusions(sections:Record<string,unknown>){
 const capacity=sections.capacity as {settings?:{limit?:number;limitSource?:string};result?:{currentMass?:number;limitCurrent?:boolean;massesComplete?:boolean}}|undefined;
 const limit=capacity?.settings?.limit,mass=capacity?.result?.currentMass;
 const massCheck:Conclusion=capacity?.result?.limitCurrent&&capacity.result.massesComplete&&Number.isFinite(limit)&&Number.isFinite(mass)?{label:'Displacement limit',status:mass!>limit!?'failed':'passed',reason:`Current displacement ${mass!.toFixed(3)} t; selected limit ${limit!.toFixed(3)} t. Source and applicability: ${capacity.settings?.limitSource??'Unspecified'}. This comparison does not establish load-line applicability.`}:conclude('Displacement limit',sections.capacity);
 return [massCheck,conclude('Intact stability',sections.intactOverview),conclude('Severe wind and rolling',sections.weather),conclude('Supports and securing',sections.securing),conclude('Permissible trim',sections.permissibleTrim),conclude('Limiting KG',sections.limitingKg),conclude('Cargo surface loads',sections.cargoLoads),{label:'Damage stability and longitudinal strength',status:'unresolved' as const,reason:'These assessments are not implemented. Vessel applicability and approved limits require separate review.'}];
}
