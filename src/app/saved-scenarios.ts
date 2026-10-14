import {parseCapacitySettings,type CapacitySettings} from './cargo-capacity';
import {validateUniqueIdentifiers} from './cargo-identification';
import {parseAssessmentSettings,type AssessmentSettings} from './assessment-settings';
import {parseDeckMode,type TweenDeckMode} from './tween-deck';
import type { WeightDraft } from './loading-state';
import { numericFields } from './loading-state';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { parseTankInput } from './tank-operations';
import { parseArea, parseFootprint, type CargoArea } from './cargo-layout';
export type ManualInputs = {vcg?:number;lcg?:number;tcg?:number;displacementTonnes?:number;freeSurfaceMomentTransverse?:number};
export type ScenarioState = {capacity?:CapacitySettings;assessment?:AssessmentSettings;tweenDeck?:TweenDeckMode;scenario:'loading'|'manual';weights:WeightDraft[];manual:ManualInputs;manualMode:'draft'|'displacement';draft?:number;density?:number;longitudinalFsm?:number;cargoArea?:CargoArea};
export const voyagePhases=['departure','arrival','intermediate','port-loading','port-unloading','ballast-change'] as const;
export type VoyageMeta={name:string;phase:typeof voyagePhases[number];parentId?:string;note:string};
export type SavedScenario = {voyageStage?:VoyageMeta;version:1;id:string;name:string;model:string;savedAt:string;state:ScenarioState};
export const modelSignature=(ship:ShipModelPackage)=>JSON.stringify([ship.manifest.id,ship.manifest.units,ship.manifest.coordinateSystem,ship.manifest.principalDimensions,ship.manifest.resources.filter(r=>!['loading.capacity','stability.wind-profiles','documentation.annotated-kg','documentation.annotated-kg-csv','stability.downflooding-samples','documentation.downflooding-csv','stability.assessment-basis','stability.constant-lcb-cross-curves','documentation.cross-curves-constant-lcb','documentation.cross-curves-csv','visualization.gltf','loading.tank-catalog','loading.cargo-surfaces','loading.operational-weights'].includes(r.kind))]);
const object=(value:unknown):value is Record<string,unknown>=>!!value && typeof value==='object' && !Array.isArray(value);
const optionalNumber=(v:unknown)=>v===undefined || typeof v==='number' && Number.isFinite(v);
export function parseScenario(value:unknown,model:string):SavedScenario {
 if(!object(value)||value.version!==1||typeof value.id!=='string'||!value.id||typeof value.name!=='string'||!value.name.trim()||value.name.length>120||typeof value.savedAt!=='string'||!Number.isFinite(Date.parse(value.savedAt)))throw new Error('Invalid scenario file.');
 if(value.model!==model)throw new Error('This scenario belongs to a different model or model definition.');
 let voyage:VoyageMeta|undefined;
 if(value.voyageStage!==undefined){const v=value.voyageStage;if(!object(v)||typeof v.name!=='string'||!v.name.trim()||v.name.length>120||!voyagePhases.includes(v.phase as VoyageMeta['phase'])||typeof v.note!=='string'||v.note.length>4000||v.parentId!==undefined&&(typeof v.parentId!=='string'||!v.parentId||v.parentId.length>200||v.parentId===value.id))throw new Error('Invalid voyage metadata.');voyage={name:v.name.trim(),phase:v.phase as VoyageMeta['phase'],note:v.note,...(v.parentId?{parentId:v.parentId as string}:{})};}
 const s=value.state;
 if(!object(s)||!['loading','manual'].includes(String(s.scenario))||!['draft','displacement'].includes(String(s.manualMode))||!object(s.manual)||!Array.isArray(s.weights)||s.weights.length>40000)throw new Error('Invalid scenario inputs.');
 for(const key of ['draft','density','longitudinalFsm'])if(!optionalNumber(s[key]))throw new Error('Invalid scenario inputs.');
 for(const key of ['vcg','lcg','tcg','displacementTonnes','freeSurfaceMomentTransverse'])if(!optionalNumber(s.manual[key]))throw new Error('Invalid manual inputs.');
 const ids=new Set<string>();
 for(const w of s.weights){
  if(!object(w)||typeof w.id!=='string'||!w.id||ids.has(w.id)||typeof w.name!=='string'||w.name.length>1000||numericFields.some(k=>typeof w[k]!=='string'||w[k].length>100||w[k].trim()!==''&&!Number.isFinite(Number(w[k]))))throw new Error('Invalid saved weights.');
  ids.add(w.id);
  for(const k of ['category','hold','quantity']) if(w[k]!==undefined && (typeof w[k]!=='string' || w[k].length>120)) throw new Error('Invalid cargo details.');
  if(w.footprint!==undefined) parseFootprint(w.footprint);
  if(w.tank!==undefined)parseTankInput(w.tank);
 }
 // Keep editable input only. No imported results or executable content are used.
 const weights=s.weights.map(w=>({id:w.id,name:w.name,...Object.fromEntries([...numericFields,'category','hold','quantity'].filter(k=>w[k]!==undefined).map(k=>[k,w[k]])),...(w.footprint===undefined?{}:{footprint:parseFootprint(w.footprint)}),...(w.tank===undefined?{}:{tank:parseTankInput(w.tank)})})) as WeightDraft[];
 validateUniqueIdentifiers(weights);
 const manual=Object.fromEntries(['vcg','lcg','tcg','displacementTonnes','freeSurfaceMomentTransverse'].map(k=>[k,(s.manual as Record<string,unknown>)[k]])) as ManualInputs;
 return {...(voyage?{voyageStage:voyage}:{}),version:1,id:value.id,name:value.name.trim(),model,savedAt:value.savedAt,state:{...(s.capacity===undefined?{}:{capacity:parseCapacitySettings(s.capacity)}),...(s.assessment===undefined?{}:{assessment:parseAssessmentSettings(s.assessment)}),scenario:s.scenario as ScenarioState['scenario'],manualMode:s.manualMode as ScenarioState['manualMode'],weights,manual,...(s.tweenDeck===undefined?{}:{tweenDeck:parseDeckMode(s.tweenDeck)}),draft:s.draft as number|undefined,density:s.density as number|undefined,longitudinalFsm:s.longitudinalFsm as number|undefined,...(s.cargoArea===undefined?{}:{cargoArea:parseArea(s.cargoArea)})}};
}
export function readLibrary(storage:Pick<Storage,'getItem'>,key:string,model:string):SavedScenario[]{
 const raw=storage.getItem(key);if(!raw)return [];
 if(raw.length>5_000_000)throw new Error('Saved scenario library is too large.');
 const data:unknown=JSON.parse(raw);
 if(!Array.isArray(data)||data.length>100)throw new Error('Invalid saved scenario library.');
 const entries=data.map(item=>parseScenario(item,model));
 if(new Set(entries.map(e=>e.id)).size!==entries.length)throw new Error('Duplicate scenario identifiers.');
 return entries;
}

// Preserve unreadable entries verbatim; one damaged record must not hide its siblings.
export function readScenarioRecords(storage: Pick<Storage,'getItem'>, key: string, model: string) {
 const raw=storage.getItem(key);
 if(raw && raw.length>25_000_000)throw new Error('Saved scenario library is too large.');
 const records: unknown=raw?JSON.parse(raw):[];
 if(!Array.isArray(records)||records.length>100)throw new Error('Invalid saved scenario library.');
 const items:SavedScenario[]=[];let damaged=0;
 for(const value of records){try{const item=parseScenario(value,model);if(items.some(i=>i.id===item.id))throw new Error('Duplicate scenario');items.push(item);}catch{damaged++;}}
 return {records,items,damaged};
}
export function mutateScenarioLibrary(storage:Pick<Storage,'getItem'|'setItem'>,key:string,model:string,change:{add:SavedScenario}|{remove:string}) {
 const current=readScenarioRecords(storage,key,model);
 const records='add' in change?[...current.records,parseScenario(change.add,model)]:current.records.filter(value=>!(value&&typeof value==='object'&&'id' in value&&value.id===change.remove));
 if(records.length>100)throw new Error('The library can hold up to 100 scenarios.');
 const json=JSON.stringify(records);
 if(json.length>25_000_000)throw new Error('Saved scenario library is too large.');
 storage.setItem(key,json);
 return readScenarioRecords(storage,key,model);
}
