import type {ShipModelPackage,SimulationCondition} from '../core/domain/ship-model';
import type {StabilityResult} from '../core/domain/stability-result';
import {sharedResults} from '../core/calculations/shared-results';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {parseWindData,type WindData} from '../core/stability/wind-profile';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {computeTableTrim} from '../core/trim/trimmed-table';
export const rectangularWeather=(ship:ShipModelPackage)=>ship.manifest.resources.some(r=>r.kind==='stability.cross-curves'&&r.config?.weatherGeometry==='sealed-rectangular-prism');
export async function documentedWindData(ship:ShipModelPackage){
 const resource=ship.manifest.resources.find(r=>r.kind==='stability.wind-profiles');
 if(!resource?.path)throw new Error('No documented wind profile supplied.');
 return sharedResults.read(ship,'wind-profiles',resource.path,async(s,path)=>{const res=await fetch(shipResourceUrl(s,path));if(!res.ok)throw new Error('Could not load wind assessment data.');return parseWindData(await res.json());});
}
/** Explicit calculation capability; never infer hydrostatics from a display mesh. */
export async function weatherContext(ship:ShipModelPackage,condition:SimulationCondition,longitudinalFsm=0){
 if(longitudinalFsm!==0)throw new Error('Longitudinal liquid redistribution is not solved.');
 const resource=ship.manifest.resources.find(r=>r.kind==='stability.wind-profiles');
 if(rectangularWeather(ship)){
  const {lbp: length,beam,mouldedDepth:depth}=ship.manifest.principalDimensions;
  if(!depth)throw new Error('Rectangular hull depth is required.');
  const h=await computeUprightHydrostatics(ship,condition),draft=h.draft;
  if(draft===undefined||draft<=0||draft>=depth)throw new Error('A positive draught below the rectangular deck is required.');
  if(Math.abs(condition.lcg-length/2)>1e-6)throw new Error('Rectangular weather model requires zero longitudinal trim: centre LCG or use condition-specific wind data.');
  const data:WindData={format:'umc-wind-profiles',version:1,pressureKgPerM2:504/9.81,profiles:[{id:'rectangular-hull-cargo',label:'Rectangular hull and placed cargo — educational geometry',baselineSilhouette:{source:'Declared sealed rectangular prism; upright broadside silhouette plus placed cargo bounding projections.',rectangles:[{xMin:0,xMax:length,zMin:0,zMax:depth}]},rows:[{draftMouldedMetres:.000001,momentKgMetres:0,areaM2:0},{draftMouldedMetres:depth,momentKgMetres:0,areaM2:0}]}]};
  return {data,draft,gm:h.gmTransverseCorrected,km:h.kmTransverse,sourcePath:'manifest:sealed-rectangular-prism',defaults:{lwl:String(length),cb:'1',bilge:'0',deck:String(Math.atan2(depth-draft,beam/2)*180/Math.PI),flood:''}};
 }
 if(!resource?.path)throw new Error('No wind profile supplied. Add a documented broadside wind profile to the ship package; the visual hull is not a wind-area source.');
 const [data,table]=await Promise.all([documentedWindData(ship),loadTrimmedTable(ship)]);
 const result=computeTableTrim(table,{displacementTonnes:condition.displacementTonnes!,lcg:condition.lcg,waterDensity:condition.waterDensity},ship.manifest.principalDimensions.lbp);
 if(result.mouldedDraft===undefined)throw new Error('Moulded draught reference is unavailable.');
 return {data,draft:result.mouldedDraft,sourcePath:resource.path};
}
export function weatherCurve(curve:StabilityResult,context:Awaited<ReturnType<typeof weatherContext>>):StabilityResult{
 if(curve.gmAtTrim||!('gm' in context)||context.gm===undefined||context.km===undefined)return curve;
 return {...curve,gmAtTrim:{correctedGm:context.gm,kmTransverse:context.km,initialTrimMetres:0,sourcePath:context.sourcePath}};
}
