export type WeatherReference={
 weightRows?: (import('../domain/loading-condition').LoadingWeight & {page:number;text:string})[];
 id:string;condition:string;sourceFile:string;sourceSha256:string;curvePage:number;summaryPage:number;weightsPage:number;direction:'port';
 massTonnes:number;physicalKg:number;lcg:number;tcgStarboard:number;fsm:number;deckLimit80Deg:number;sourceWindHeelDeg:number;reportedFloodingDeg:number;
 rows:{anglePortDeg:number;draft:number;trim:number;kn:number;kgSin:number;tcgCos:number;gzCorrectedPort:number;areaPort:number}[];
};
export type WeatherEvidence={version:1;notice:string;waterlineFinding:string;scope:string;validation:string;sources:{file:string;sha256:string;pagesSearched:number;portCurvePages:number[]}[];cases:WeatherReference[]};
export function parseWeatherEvidence(raw:unknown):WeatherEvidence {
 const d=raw as WeatherEvidence;
 if(!d||d.version!==1||typeof d.notice!=='string'||typeof d.waterlineFinding!=='string'||typeof d.scope!=='string'||typeof d.validation!=='string'||!Array.isArray(d.sources)||!Array.isArray(d.cases)||!d.cases.length)throw new Error('Invalid weather evidence.');
 const files=new Set<string>();
 for(const s of d.sources){if(!s||typeof s.file!=='string'||files.has(s.file)||! /^[a-f0-9]{64}$/.test(s.sha256)||!Number.isInteger(s.pagesSearched)||s.pagesSearched<1||!Array.isArray(s.portCurvePages)||s.portCurvePages.some(p=>!Number.isInteger(p)||p<1||p>s.pagesSearched))throw new Error('Invalid weather evidence source.');files.add(s.file);}
 const ids=new Set<string>();
 for(const c of d.cases){
  const source=d.sources.find(s=>s.file===c.sourceFile);
  if(!c||typeof c.id!=='string'||ids.has(c.id)||typeof c.condition!=='string'||!c.condition||c.direction!=='port'||!source||source.sha256!==c.sourceSha256||!source.portCurvePages.includes(c.curvePage)||![c.curvePage,c.summaryPage,c.weightsPage].every(p=>Number.isInteger(p)&&p>0&&p<=source.pagesSearched)||![c.massTonnes,c.physicalKg,c.lcg,c.tcgStarboard,c.fsm,c.deckLimit80Deg,c.sourceWindHeelDeg,c.reportedFloodingDeg].every(Number.isFinite)||c.massTonnes<=0||c.fsm<0||c.deckLimit80Deg<=0||c.deckLimit80Deg>144||c.reportedFloodingDeg<=0||c.reportedFloodingDeg>180||!Array.isArray(c.rows)||c.rows.length<3)throw new Error('Invalid weather reference case.');
  if(c.weightRows!==undefined){
   if(!Array.isArray(c.weightRows)||!c.weightRows.length||c.weightRows.length>1000)throw new Error('Invalid reference weights.');
   const ids=new Set<string>();
   for(const w of c.weightRows){if(!w.id||ids.has(w.id)||typeof w.name!=='string'||typeof w.text!=='string'||!Number.isInteger(w.page)||w.page<1||![w.massTonnes,w.vcg,w.lcg,w.tcg,w.freeSurfaceMomentTransverse].every(Number.isFinite)||w.massTonnes<0||w.freeSurfaceMomentTransverse!<0)throw new Error('Invalid reference weight.');ids.add(w.id);}
  }
  ids.add(c.id);
  for(let i=0;i<c.rows.length;i++){const r=c.rows[i];if(!r||![r.anglePortDeg,r.draft,r.trim,r.kn,r.kgSin,r.tcgCos,r.gzCorrectedPort,r.areaPort].every(Number.isFinite)||r.anglePortDeg<0||r.anglePortDeg>180||i>0&&r.anglePortDeg<=c.rows[i-1].anglePortDeg)throw new Error('Invalid weather reference row.');}
 }
 return d;
}
