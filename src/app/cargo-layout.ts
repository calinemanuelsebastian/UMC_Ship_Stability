import {dunnageProfiles,type DunnageProfile} from './dunnage-profile';
import {parseCargoMarkings,type CargoMarkings} from './cargo-identification';
import type { WeightDraft } from './loading-state';
export type PlanRegion = {xMin:number;xMax:number;yMin:number;yMax:number};
export type CargoArea = { uniformLoad?:{tonnesPerM2:number;source:string;sha256?:string}; supportRegions?:PlanRegion[]; panels?: (PlanRegion & {id:string})[]; regions?:PlanRegion[]; sourceIds?:string[]; clearHeight?: number; id?: string; name: string; xMin: number; xMax: number; yMin: number; yMax: number; deckZ: number };
export type Footprint = { dunnageProfile?:DunnageProfile; markings?:CargoMarkings; stackability?:'unknown'|'stackable'|'unstackable'; maxTopLoadTonnes?:number; kind?:'dunnage'; dunnage?:{material:string;densityKgM3:number;massMode:'calculated'|'manual'}; bottomZ?:number; areaId?: string; length: number; width: number; height: number; rotation: 0 | 90; deckZ: number };
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function parseArea(v: unknown): CargoArea {
  const a = v as CargoArea;
  if (!a || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 120 || ![a.xMin,a.xMax,a.yMin,a.yMax,a.deckZ].every(finite)
    || a.xMax <= a.xMin || a.yMax <= a.yMin || a.xMax-a.xMin > 1000 || a.yMax-a.yMin > 1000) throw new Error('Enter a named planning area with increasing bounds and finite deck elevation.');
  if(a.id!==undefined && (typeof a.id!=='string'||!a.id||a.id.length>120))throw new Error('Invalid surface identifier.');
  if(a.clearHeight!==undefined&&(!finite(a.clearHeight)||a.clearHeight<=0||a.clearHeight>100))throw new Error('Invalid cargo clear height.');
  if(a.regions!==undefined&&(!Array.isArray(a.regions)||!a.regions.length||a.regions.length>100||a.regions.some(r=>!r||![r.xMin,r.xMax,r.yMin,r.yMax].every(finite)||r.xMin< a.xMin||r.xMax>a.xMax||r.yMin<a.yMin||r.yMax>a.yMax||r.xMin>=r.xMax||r.yMin>=r.yMax)))throw new Error('Invalid hold outline.');
  if(a.sourceIds!==undefined&&(!Array.isArray(a.sourceIds)||a.sourceIds.length>100||a.sourceIds.some(id=>typeof id!=='string'||!id||id.length>120)))throw new Error('Invalid source surfaces.');
  if(a.uniformLoad&&(!finite(a.uniformLoad.tonnesPerM2)||a.uniformLoad.tonnesPerM2<=0||typeof a.uniformLoad.source!=='string'||!a.uniformLoad.source.trim()))throw new Error('Invalid surface load limit.');
  const supported=a.supportRegions===undefined?undefined:parseArea({...a,supportRegions:undefined,panels:undefined,regions:a.supportRegions}).regions;
  if(a.panels!==undefined&&(!Array.isArray(a.panels)||a.panels.length>100||a.panels.some(p=>typeof p.id!=='string'||!p.id||p.id.length>120)))throw new Error('Invalid hatch panels.');
  const panels=a.panels?.map(p=>({...parseArea({...a,supportRegions:undefined,panels:undefined,regions:[p]}).regions![0],id:p.id}));
  return {...(a.uniformLoad?{uniformLoad:{...a.uniformLoad}}:{}),...(supported?{supportRegions:supported}:{}),...(panels?{panels}:{}),...(a.regions?{regions:a.regions.map(r=>({xMin:r.xMin,xMax:r.xMax,yMin:r.yMin,yMax:r.yMax}))}:{}),...(a.sourceIds?{sourceIds:[...a.sourceIds]}:{}),...(a.clearHeight===undefined?{}:{clearHeight:a.clearHeight}),...(a.id?{id:a.id}:{}),name:a.name,xMin:a.xMin,xMax:a.xMax,yMin:a.yMin,yMax:a.yMax,deckZ:a.deckZ};
}
export function parseFootprint(v: unknown): Footprint {
  const p = v as Footprint;
  if (!p || ![p.length,p.width,p.height].every(n => finite(n) && n > 0 && n <= 1000) || !finite(p.deckZ) || ![0,90].includes(p.rotation)) throw new Error('Cargo dimensions must be positive; rotation must be 0 or 90 degrees.');
  if(p.areaId!==undefined && (typeof p.areaId!=='string'||!p.areaId||p.areaId.length>120))throw new Error('Invalid surface identifier.');
  if(p.dunnage!==undefined&&(p.kind!=='dunnage'||typeof p.dunnage.material!=='string'||!p.dunnage.material||p.dunnage.material.length>120||!finite(p.dunnage.densityKgM3)||p.dunnage.densityKgM3<=0||!['calculated','manual'].includes(p.dunnage.massMode)))throw new Error('Invalid dunnage material details.');
  if(p.kind!==undefined&&p.kind!=='dunnage')throw new Error('Invalid cargo geometry kind.');
  if(p.bottomZ!==undefined&&(!finite(p.bottomZ)||p.bottomZ<p.deckZ-1e-8))throw new Error('Invalid cargo bottom elevation.');
  if(p.dunnageProfile!==undefined&&!dunnageProfiles.includes(p.dunnageProfile))throw new Error('Invalid dunnage profile.');
  if(p.stackability!==undefined&&!['unknown','stackable','unstackable'].includes(p.stackability))throw new Error('Invalid stackability setting.');
  if(p.maxTopLoadTonnes!==undefined&&(!finite(p.maxTopLoadTonnes)||p.maxTopLoadTonnes<0))throw new Error('Invalid top-load limit.');
  return {...(p.dunnageProfile?{dunnageProfile:p.dunnageProfile}:{}),...(p.markings?{markings:parseCargoMarkings(p.markings)}:{}),...(p.stackability?{stackability:p.stackability}:{}),...(p.maxTopLoadTonnes===undefined?{}:{maxTopLoadTonnes:p.maxTopLoadTonnes}),...(p.dunnage?{dunnage:{material:p.dunnage.material,densityKgM3:p.dunnage.densityKgM3,massMode:p.dunnage.massMode}}:{}),...(p.kind?{kind:p.kind}:{}),...(p.bottomZ===undefined?{}:{bottomZ:p.bottomZ}),...(p.areaId?{areaId:p.areaId}:{}),length:p.length,width:p.width,height:p.height,rotation:p.rotation,deckZ:p.deckZ};
}
export function cargoBounds(w: WeightDraft) {
  if (!w.footprint || !w.lcg.trim() || !w.tcg.trim() || ![Number(w.lcg),Number(w.tcg)].every(finite)) return undefined;
  const p = w.footprint, dx=(p.rotation===0?p.length:p.width)/2, dy=(p.rotation===0?p.width:p.length)/2;
  return {xMin:Number(w.lcg)-dx,xMax:Number(w.lcg)+dx,yMin:Number(w.tcg)-dy,yMax:Number(w.tcg)+dy};
}
export function layoutIssues(weights: WeightDraft[], area: CargoArea) {
  const issues: {id:string; kind:'outside'|'overlap'|'position'|'deck'|'height'|'support'; other?:string}[]=[];
  for(let i=0;i<weights.length;i++) {
    const w=weights[i]; if(!w.footprint) continue;
    if(area.clearHeight!==undefined&&(w.footprint.bottomZ??w.footprint.deckZ)+w.footprint.height>area.deckZ+area.clearHeight+1e-8)issues.push({id:w.id,kind:'height'});
    const b=cargoBounds(w); if(!b){issues.push({id:w.id,kind:'position'});continue;}
    if(Math.abs((w.footprint.bottomZ??w.footprint.deckZ)-area.deckZ)<1e-8&&!fitsFloor(area,b))issues.push({id:w.id,kind:'support'});
    if(!fitsArea(area,b))issues.push({id:w.id,kind:'outside'});
    if(w.footprint.deckZ!==area.deckZ)issues.push({id:w.id,kind:'deck'});
    for(let j=0;j<i;j++){
      const v=weights[j],c=cargoBounds(v);if(!c || !v.footprint)continue;
      if(Math.min((v.footprint.bottomZ??v.footprint.deckZ)+v.footprint.height,(w.footprint.bottomZ??w.footprint.deckZ)+w.footprint.height)-Math.max(v.footprint.bottomZ??v.footprint.deckZ,w.footprint.bottomZ??w.footprint.deckZ)<=1e-8)continue;
      // This first planner is a single-deck footprint check; stacking is not inferred from KG.
      if(Math.min(b.xMax,c.xMax)-Math.max(b.xMin,c.xMin)>1e-8&&Math.min(b.yMax,c.yMax)-Math.max(b.yMin,c.yMin)>1e-8)issues.push({id:w.id,kind:'overlap',other:v.id});
    }
  }
  return issues;
}

/** Snap the lower footprint edges relative to the surface, then contain the full rotated item. */
export function placeCargo(area: CargoArea, footprint: Footprint, x: number, y: number, snap: boolean | number) {
  const length = footprint.rotation === 0 ? footprint.length : footprint.width;
  const width = footprint.rotation === 0 ? footprint.width : footprint.length;
  if(area.clearHeight!==undefined&&footprint.height>area.clearHeight+1e-8)throw new Error('Cargo exceeds the available clear height.');
  if (![x,y].every(Number.isFinite)) throw new Error('Missing cargo position');
  if (length > area.xMax-area.xMin || width > area.yMax-area.yMin) throw new Error('Cargo footprint is larger than the planning area.');
  const increment=typeof snap==='number'?snap:.1;
  if(snap&&(!Number.isFinite(increment)||increment<=0))throw new Error('Invalid snap increment.');
  const centre = (value:number, min:number, max:number, size:number) => {
    const edge = snap ? min + Math.round((value-size/2-min)/increment)*increment : value-size/2;
    return Number((Math.max(min,Math.min(max-size,edge))+size/2).toFixed(10));
  };
  const cx=centre(x,area.xMin,area.xMax,length),cy=centre(y,area.yMin,area.yMax,width);
  if(!fitsArea(area,{xMin:cx-length/2,xMax:cx+length/2,yMin:cy-width/2,yMax:cy+width/2}))throw new Error('Cargo footprint crosses the stepped hold boundary.');
  return {lcg:String(cx),tcg:String(cy)};
}

/** Test coverage by the union of rectangular regions, including cargo spanning a step. */
export function fitsArea(area:CargoArea,b:PlanRegion):boolean {
 const eps=1e-8;
 if(b.xMin<area.xMin-eps||b.xMax>area.xMax+eps||b.yMin<area.yMin-eps||b.yMax>area.yMax+eps)return false;
 if(!area.regions)return true;
 const cuts=[...new Set([b.xMin,b.xMax,...area.regions.flatMap(r=>[r.xMin,r.xMax]).filter(x=>x>b.xMin&&x<b.xMax)])].sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){
  const x=(cuts[i-1]+cuts[i])/2;
  const intervals=area.regions.filter(r=>x>=r.xMin&&x<=r.xMax).sort((a,b)=>a.yMin-b.yMin);
  let covered=b.yMin;
  for(const r of intervals){if(r.yMin>covered+eps)break;if(r.yMax>=covered)covered=r.yMax;}
  if(covered<b.yMax-eps)return false;
 }
 return true;
}

/** Open gaps belong to the workspace envelope but never become supporting deck. */
export function fitsFloor(area:CargoArea,b:PlanRegion){return fitsArea(area.supportRegions?{...area,regions:area.supportRegions}:area,b);}
export function sameLoadingSurface(a:string|undefined,b:string|undefined){return a===b||!!a?.startsWith('hatch-')&&!!b?.startsWith('hatch-');}
