export type AuditRow=Record<string,number|undefined>;
export type TableFinding={row:number;check:string;observed?:number;expected?:number;message:string};
/** Screening only: differences may reflect rounding, appendages or source conventions. */
export function auditHydrostatics(rows:AuditRow[],density:number){
 const findings:TableFinding[]=[];let comparisons=0;
 const flag=(row:number,check:string,message:string,observed?:number,expected?:number)=>findings.push({row:row+1,check,message,observed,expected});
 function compare(i:number,check:string,observed:number|undefined,expected:number|undefined,absolute:number,relative=.005){
  if(observed===undefined||expected===undefined||!Number.isFinite(observed)||!Number.isFinite(expected))return;
  comparisons++;if(Math.abs(observed-expected)>Math.max(absolute,Math.abs(expected)*relative))flag(i,check,'Likely inconsistency; verify source conventions and rounding before correcting.',observed,expected);
 }
 if(!Number.isFinite(density)||density<=0)flag(0,'Density','A positive table density is required.');
 if(!rows.length)flag(0,'Rows','The table is empty.');
 rows.forEach((r,i)=>{
  for(const [key,n] of Object.entries(r))if(n!==undefined&&!Number.isFinite(n))flag(i,key,'Non-finite table value.');
  if(r.draft===undefined)flag(i,'Draft','Draft is missing.');
  if((r.draft??0)<0||(r.displacementTonnes??1)<=0||(r.volume??1)<=0||(r.tonnesPerCentimetre??1)<=0)flag(i,'Positive quantities','Draft, displacement, volume or TPC has an invalid sign.');
  compare(i,'Δ = ρ × volume',r.displacementTonnes,r.volume===undefined?undefined:density*r.volume,.05);
  compare(i,'TPC = ρ × waterplane area / 100',r.tonnesPerCentimetre,r.waterplaneArea===undefined?undefined:density*r.waterplaneArea/100,.03);
  for(const axis of ['Transverse','Longitudinal'])compare(i,`KM = KB + BM (${axis})`,r['km'+axis],r.kb===undefined||r['bm'+axis]===undefined?undefined:r.kb+r['bm'+axis]!, .01);
  const a=rows[i-1];if(!a)return;
  if(r.draft!==undefined&&a.draft!==undefined&&r.draft<=a.draft)flag(i,'Draft order','Draft must increase; duplicate or reversed row.');
  if(r.displacementTonnes!==undefined&&a.displacementTonnes!==undefined&&r.displacementTonnes<=a.displacementTonnes)flag(i,'Displacement order','Displacement must increase with draft within one trim table.');
  if(r.draft!==undefined&&a.draft!==undefined&&r.draft>a.draft&&r.displacementTonnes!==undefined&&a.displacementTonnes!==undefined&&r.tonnesPerCentimetre!==undefined&&a.tonnesPerCentimetre!==undefined){
   compare(i,'TPC ≈ change in displacement / change in draft (cm)',(r.tonnesPerCentimetre+a.tonnesPerCentimetre)/2,(r.displacementTonnes-a.displacementTonnes)/((r.draft-a.draft)*100),.1,.05);
  }
 });
 return {rowCount:rows.length,comparisons,findings};
}
