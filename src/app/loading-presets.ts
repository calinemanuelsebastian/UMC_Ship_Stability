import type {ShipModelPackage} from '../core/domain/ship-model';
import {numericFields,type WeightDraft} from './loading-state';
import {cleanLoadingPlan,tankWeight,type TankCatalog} from './tank-operations';
import {panelWeight,type TweenDeckMode} from './tween-deck';
export type LoadingPreset={id:string;name:string;waterDensity:number;tweenDeck:TweenDeckMode;tanks:{id:string;fillPercent:number;density:number;sourceMassTonnes:number}[];weights:WeightDraft[];reference:{displacementTonnes:number;vcg:number;lcg:number;tcg:number;fsm:number};sourcePages:number[]};
export type LoadingPresets={version:1;source:string;sha256:string;note:string;items:LoadingPreset[]};
export function validateLoadingPresets(value:LoadingPresets,catalog:TankCatalog){
 if(value.version!==1||typeof value.source!=='string'||typeof value.note!=='string'||!Array.isArray(value.items)||value.items.length>50)throw new Error('Invalid loading condition presets.');
 const ids=new Set<string>();
 for(const p of value.items){
  if(!p.id||ids.has(p.id)||typeof p.name!=='string'||!['installed','stored','ashore'].includes(p.tweenDeck)||!Number.isFinite(p.waterDensity)||p.waterDensity<=0||!Array.isArray(p.tanks)||!Array.isArray(p.weights)||p.weights.length>1000||!Array.isArray(p.sourcePages)||!p.sourcePages.every(n=>Number.isInteger(n)&&n>0)||!p.reference||!['displacementTonnes','vcg','lcg','tcg','fsm'].every(k=>Number.isFinite(p.reference[k as keyof typeof p.reference])))throw new Error('Invalid loading condition preset.');
  ids.add(p.id);const tanks=new Set<string>(),weights=new Set<string>();
  for(const row of p.tanks){if(tanks.has(row.id)||!catalog.tanks.some(t=>t.id===row.id)||!Number.isFinite(row.fillPercent)||row.fillPercent<0||row.fillPercent>100||!Number.isFinite(row.density)||row.density<=0)throw new Error('Invalid preset tank allocation.');tanks.add(row.id);}
  for(const w of p.weights){if(!w.id||weights.has(w.id)||typeof w.name!=='string'||w.tank||w.footprint||!['cargo','other'].includes(w.category??'')||numericFields.some(k=>typeof w[k]!=='string'||w[k].trim()===''||!Number.isFinite(Number(w[k])))||Number(w.massTonnes)<0||Number(w.freeSurfaceMomentTransverse)<0)throw new Error('Invalid preset weight.');weights.add(w.id);}
 }
 return value;
}
export function buildLoadingPreset(ship:ShipModelPackage,reference:WeightDraft[],catalog:TankCatalog,preset:LoadingPreset){
 validateLoadingPresets({version:1,source:'selected',sha256:'',note:'',items:[preset]},catalog);
 const clean=cleanLoadingPlan(ship,reference,catalog).map(w=>panelWeight(w,preset.tweenDeck,ship));
 const weights=clean.map(w=>{
  if(!w.tank)return w;
  const tank=catalog.tanks.find(t=>t.id===w.tank!.id)!;const fill=preset.tanks.find(t=>t.id===tank.id);
  return tankWeight(tank,{id:tank.id,volumeM3:tank.capacityM3*((fill?.fillPercent??0)/100),density:fill?.density??tank.defaultDensity});
 });
 const ids=new Set(weights.map(w=>w.id));
 for(const w of preset.weights){if(ids.has(w.id))throw new Error('Preset weight conflicts with the ship definition.');ids.add(w.id);}
 return [...weights,...structuredClone(preset.weights)];
}
