import {cargoBounds,fitsArea,fitsFloor,layoutIssues,sameLoadingSurface,type CargoArea,type PlanRegion} from './cargo-layout';
import {cargoOnSurface} from './cargo-surfaces';
import {cargoBottom} from './cargo-placement';
import type {WeightDraft} from './loading-state';
/** Exact union area of axis-aligned source regions; gaps and overlaps do not count twice. */
export function surfaceArea(regions:PlanRegion[]) {
 const xs=[...new Set(regions.flatMap(r=>[r.xMin,r.xMax]))].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){
  const x=(xs[i-1]+xs[i])/2,ys=regions.filter(r=>r.xMin<x&&r.xMax>x).map(r=>[r.yMin,r.yMax]).sort((a,b)=>a[0]-b[0]);let length=0,hi=-Infinity;
  for(const [lo,end] of ys){length+=Math.max(0,end-Math.max(lo,hi));hi=Math.max(hi,end);}
  area+=(xs[i]-xs[i-1])*length;
 }return area;
}
const overlap=(a:PlanRegion,b:PlanRegion)=>Math.min(a.xMax,b.xMax)>Math.max(a.xMin,b.xMin)+1e-8&&Math.min(a.yMax,b.yMax)>Math.max(a.yMin,b.yMin)+1e-8;
/** Static screening. Each upper mass is counted once per base, in full: an upper
 * bound for shared supports, never an invented equal reaction distribution. */
export function cargoLoadChecks(weights:WeightDraft[],areas:CargoArea[],storedDecks=false){
 const unlocated=weights.filter(w=>!w.footprint||!areas.some(a=>cargoOnSurface(w,a))).map(w=>w.id);
 const surfaces=areas.map(area=>{
  const items=weights.filter(w=>cargoOnSurface(w,area)),size=surfaceArea(area.supportRegions??area.regions??[area]);
  const invalid=items.some(w=>!w.massTonnes.trim()||!Number.isFinite(+w.massTonnes)||+w.massTonnes<0||!cargoBounds(w));
  const geometryIssues=layoutIssues(items,area);
  const bounds=new Map(items.map(w=>[w.id,cargoBounds(w)]));
  const upper=new Map(items.map(base=>[base.id,items.filter(w=>w.id!==base.id&&bounds.get(w.id)&&bounds.get(base.id)&&sameLoadingSurface(base.footprint?.areaId,w.footprint?.areaId)&&Math.abs(cargoBottom(w)-cargoBottom(base)-base.footprint!.height)<1e-7&&overlap(bounds.get(w.id)!,bounds.get(base.id)!))]));
  const supportCounts=new Map<string,number>();for(const list of upper.values())for(const w of list)supportCounts.set(w.id,(supportCounts.get(w.id)??0)+1);
  const unsupported=items.filter(w=>cargoBottom(w)>area.deckZ+1e-7&&!supportCounts.has(w.id)).map(w=>w.id);
  const ambiguous=[...supportCounts.values()].some(n=>n>1);
  const roots=items.filter(w=>Math.abs(cargoBottom(w)-area.deckZ)<1e-7);
  const contacts=roots.map(base=>{
   const seen=new Set<string>();const pending=[base];
   while(pending.length){const w=pending.pop()!;if(seen.has(w.id))continue;seen.add(w.id);pending.push(...upper.get(w.id)!);}
   const carried=items.filter(w=>seen.has(w.id)).reduce((s,w)=>s+(+w.massTonnes),0),b=bounds.get(base.id);
   const footprintArea=b?(b.xMax-b.xMin)*(b.yMax-b.yMin):0;
   return {id:base.id,name:base.name,carriedTonnes:invalid?undefined:carried,footprintM2:footprintArea,pressure:!invalid&&footprintArea>0?carried/footprintArea:undefined,panels:area.panels?.filter(p=>b&&overlap(b,p)).map(p=>p.id)??[],supported:!!b&&fitsFloor(area,b),sharedSupport:ambiguous};
  });
  const mass=invalid?undefined:items.reduce((s,w)=>s+(+w.massTonnes),0),average=mass===undefined?undefined:mass/size;
  const storedUnresolved=storedDecks&&!area.id?.startsWith('hatch');
  const incomplete=invalid||geometryIssues.length>0||unsupported.length>0||storedUnresolved||unlocated.length>0||items.some(w=>!bounds.get(w.id)||!fitsArea(area,bounds.get(w.id)!));
  const limit=area.uniformLoad?.tonnesPerM2;
  const status=average!==undefined&&limit!==undefined&&average>limit?'Average exceeds uniform limit':incomplete?'Incomplete load assessment':limit===undefined?'No documented uniform limit':'Average within limit — local checks required';
  return {id:area.id,name:area.name,mass,areaM2:size,average,limit,status,source:area.uniformLoad,contacts,unsupported,geometryIssueCount:geometryIssues.length,storedUnresolved};
 });
 return {surfaces,unlocated,scope:'Uniform-load screening only. Base footprint is an assumed full contact area; actual feet, runners and point loads require contact geometry and applicable local capacities. Shared-support loads are conservative upper bounds, not reactions. Longitudinal strength and securing are not assessed.'};
}
