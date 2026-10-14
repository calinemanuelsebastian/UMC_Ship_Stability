import type {WeatherSettings} from './assessment-settings';
import type {WeightDraft} from './loading-state';
import {cargoBounds} from './cargo-layout';
import {windLever,type WindData} from '../core/stability/wind-profile';
import {silhouetteWind} from '../core/stability/wind-silhouette';
/** Includes geometry changes even when total mass and centre of gravity are unchanged. */
export function windLayoutKey(weights:WeightDraft[]|undefined){
 return JSON.stringify(weights===undefined?null:weights.map(w=>[w.id,w.category,w.lcg,w.tcg,w.footprint&&[w.footprint.length,w.footprint.width,w.footprint.height,w.footprint.rotation,w.footprint.deckZ,w.footprint.bottomZ,w.footprint.areaId]]));
}
export function windConfirmationKey(data:WindData,id:string,weights?:WeightDraft[]){return JSON.stringify([windLayoutKey(weights),data.pressureKgPerM2,data.profiles.find(p=>p.id===id)]);}
export function conditionWind(data:WindData,settings:WeatherSettings,draft:number,mass:number,weights?:WeightDraft[]){
 const base=windLever(data,settings.profile,draft,mass);
 const profile=data.profiles.find(p=>p.id===settings.profile)!;
 const confirmed=!!settings.profileConfirmed&&settings.layoutKey===windConfirmationKey(data,settings.profile,weights);
 if(!profile.baselineSilhouette)return {...base,steadyLever:base.steadyLever*504/(data.pressureKgPerM2*9.81),pressurePa:504,profileConfirmed:confirmed,method:'Documented complete-condition wind table; current cargo silhouette requires confirmation.'};
 if(weights===undefined)throw new Error('Baseline silhouette requires a linked cargo layout.');
 const cargo=weights.filter(w=>w.category==='cargo'||!!w.footprint);
 if(cargo.some(w=>!w.footprint||!cargoBounds(w)))throw new Error('Cargo without valid dimensions cannot establish the wind silhouette.');
 const rectangles=cargo.map(w=>{const b=cargoBounds(w)!,p=w.footprint!,bottom=p.bottomZ??p.deckZ;return {xMin:b.xMin,xMax:b.xMax,zMin:bottom,zMax:bottom+p.height};});
 const result=silhouetteWind([...profile.baselineSilhouette.rectangles,...rectangles],draft,mass);
 return {...base,...result,profileConfirmed:confirmed,method:'Union of documented ship profile and cargo projections at 504 Pa; overlapping area counted once.',silhouetteSource:profile.baselineSilhouette.source};
}
