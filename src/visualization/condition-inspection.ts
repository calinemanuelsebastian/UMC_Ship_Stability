import type {WeightDraft} from '../app/loading-state';
import {roleOf, type TankCatalog} from '../app/tank-operations';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {bodyPoint} from './ship-scene-data';
import type {SceneWeight} from './create-ship-scene';
export const inspectionCategories = ['Cargo','Dunnage / support','Tanks / liquids','Fixed weights','Other onboard weights'] as const;
export type InspectionCategory = typeof inspectionCategories[number];
export function inspectionCategory(ship:ShipModelPackage,w:WeightDraft):InspectionCategory {
 if(w.tank)return 'Tanks / liquids';
 if(w.footprint?.kind==='dunnage')return 'Dunnage / support';
 const role=roleOf(ship,w);
 return role==='fixed'?'Fixed weights':role==='cargo'?'Cargo':'Other onboard weights';
}
/** Physical points only. A tank without declared 3D geometry remains a CG symbol. */
export function inspectionMarkers(ship:ShipModelPackage,weights:WeightDraft[],catalog?:TankCatalog):SceneWeight[]{
 return weights.filter(w=>[w.massTonnes,w.lcg,w.tcg,w.vcg].every(v=>v.trim()!==''&&Number.isFinite(Number(v)))).map(w=>{
  const point=bodyPoint(ship,{x:Number(w.lcg),y:Number(w.tcg),z:Number(w.vcg)});
  const tank=catalog?.tanks.find(t=>t.id===w.tank?.id);
  const box=tank?.box;
  const tankBox=box&&w.tank&&w.tank.volumeM3>=0&&w.tank.volumeM3<=tank.capacityM3?{length:box.length,width:box.width,height:box.height,fill:w.tank.volumeM3/tank.capacityM3,point:bodyPoint(ship,{x:tank.fullCentre[0],y:tank.fullCentre[1],z:box.bottomZ+box.height/2})}:undefined;
  return {tankMarker:!!w.tank,markerColor:w.tank?'#167e96':inspectionCategory(ship,w)==='Fixed weights'?'#59636e':w.footprint?.kind==='dunnage'?'#a66b30':'#6b3997',id:w.id,name:w.name,label:`${w.name}\n${inspectionCategory(ship,w)}${w.tank&&!tankBox?' · CG only':''}`,point,tankBox,...(!w.tank&&w.footprint?{footprint:w.footprint,cargoPoint:bodyPoint(ship,{x:Number(w.lcg),y:Number(w.tcg),z:(w.footprint.bottomZ??w.footprint.deckZ)+w.footprint.height/2})}:{})};
 });
}
export function draftMeasurements(result:{draftAft:number;draftForward:number;illustrativeDrafts?:boolean},mode:string){
 const unavailable=result.illustrativeDrafts?'Draft datum is unconfirmed.':mode==='heel'||mode==='teaching'?'Coupled heeled end drafts are not supplied.':undefined;
 return unavailable?{unavailable}:{aft:result.draftAft,forward:result.draftForward,mean:(result.draftAft+result.draftForward)/2,difference:result.draftForward-result.draftAft};
}
