export type FloodData = {
 format: 'umc-downflooding-samples'; version: 1; heelDirection: 'starboard'; referenceDensity: number;
 massRangeTonnes: [number, number];
 sets: {initialTrimMetres: number; pdfPage: number; openings: {name: string; samples: {heelDegrees: number; floodingDisplacementTonnes: number | null}[]}[]}[];
};
export type FloodScreen = {
 initialTrimMetres: number;
 samples: {opening: string; heelDegrees: number; thresholdTonnes: number | null; status: 'unknown' | 'below threshold' | 'threshold reached'; sourcePages: number[]}[];
 firstReachedAngle?: number;
 message: string;
};
export function parseFloodData(raw: unknown): FloodData {
 const d=raw as FloodData;
 if(!d||d.format!=='umc-downflooding-samples'||d.version!==1||d.heelDirection!=='starboard'||!Number.isFinite(d.referenceDensity)||d.referenceDensity<=0||!Array.isArray(d.massRangeTonnes)||d.massRangeTonnes.length!==2||!d.massRangeTonnes.every(Number.isFinite)||d.massRangeTonnes[0]<=0||d.massRangeTonnes[1]<=d.massRangeTonnes[0]||!Array.isArray(d.sets)||d.sets.length<2)throw new Error('Invalid downflooding data.');
 for(const [i,s] of d.sets.entries()) {
  if(!Number.isFinite(s.initialTrimMetres)||i>0&&s.initialTrimMetres<=d.sets[i-1].initialTrimMetres||!Number.isInteger(s.pdfPage)||s.pdfPage<1||!Array.isArray(s.openings)||!s.openings.length)throw new Error('Invalid downflooding trim set.');
  const names=new Set<string>();
  for(const o of s.openings){
   if(typeof o.name!=='string'||!o.name.trim()||names.has(o.name)||!Array.isArray(o.samples)||o.samples.length<2)throw new Error('Invalid downflooding opening.');names.add(o.name);
   for(const [j,a] of o.samples.entries())if(!Number.isFinite(a.heelDegrees)||a.heelDegrees<0||a.heelDegrees>90||j>0&&a.heelDegrees<=o.samples[j-1].heelDegrees||a.floodingDisplacementTonnes!==null&&(!Number.isFinite(a.floodingDisplacementTonnes)||a.floodingDisplacementTonnes<=0))throw new Error('Invalid downflooding sample.');
  }
  if(i>0&&JSON.stringify(s.openings.map(o=>[o.name,o.samples.map(a=>a.heelDegrees)]))!==JSON.stringify(d.sets[0].openings.map(o=>[o.name,o.samples.map(a=>a.heelDegrees)])))throw new Error('Mismatched downflooding grid.');
 }
 return d;
}
/** Only numeric thresholds are interpolated in initial trim. Missing cells stay unknown. */
export function screenDownflooding(d: FloodData, mass: number, trim: number, density: number): FloodScreen {
 if(![mass,trim,density].every(Number.isFinite)||mass<d.massRangeTonnes[0]||mass>d.massRangeTonnes[1]||trim<d.sets[0].initialTrimMetres||trim>d.sets.at(-1)!.initialTrimMetres||Math.abs(density-d.referenceDensity)>1e-9)throw new Error('Condition outside downflooding source coverage.');
 const hi=d.sets.findIndex(s=>s.initialTrimMetres>=trim),lo=d.sets[hi].initialTrimMetres===trim?hi:hi-1;
 const a=d.sets[lo],b=d.sets[hi],f=lo===hi?0:(trim-a.initialTrimMetres)/(b.initialTrimMetres-a.initialTrimMetres);
 const samples: FloodScreen['samples']=a.openings.flatMap((o,i)=>o.samples.map((s,j)=>{
  const x=s.floodingDisplacementTonnes,y=b.openings[i].samples[j].floodingDisplacementTonnes;
  const thresholdTonnes=x===null||y===null?null:x+(y-x)*f;
  return {opening:o.name,heelDegrees:s.heelDegrees,thresholdTonnes,status:thresholdTonnes===null?'unknown':mass>=thresholdTonnes?'threshold reached':'below threshold',sourcePages:lo===hi?[a.pdfPage]:[a.pdfPage,b.pdfPage]};
 }));
 const reached=samples.filter(s=>s.status==='threshold reached').map(s=>s.heelDegrees);
 return {initialTrimMetres:trim,samples,firstReachedAngle:reached.length?Math.min(...reached):undefined,message:reached.length?'A supplied flooding threshold is reached. Earlier onset between samples remains unresolved.':'No supplied numeric threshold is reached; missing values and intermediate angles remain unresolved.'};
}
