import {parseFootprint,type Footprint} from './cargo-layout';
import {cloneMarkings} from './cargo-identification';
import type {WeightDraft} from './loading-state';
import {cargoFamilies} from './cargo-types';
export {cargoFamilies} from './cargo-types';
export type CargoFamily=typeof cargoFamilies[number][0];
export type CargoTemplate={id:string;name:string;family:CargoFamily;footprint:Footprint;mass:{mode:'gross'|'net-plus-tare';value:number;tare:number};stowageFactor?:number;quantity?:number;cgAboveBase?:number;contact:string;source:string};
export type CargoAssembly={id:string;name:string;items:WeightDraft[]};
export type CargoLibrary={format:'umc-cargo-library';version:1;templates:CargoTemplate[];assemblies:CargoAssembly[]};
export const libraryKey='umc-cargo-library-v1';
export const emptyCargoLibrary=():CargoLibrary=>({format:'umc-cargo-library',version:1,templates:[],assemblies:[]});
const text=(v:unknown,max=500):v is string=>typeof v==='string'&&v.length<=max;
const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export function grossTemplateMass(m:CargoTemplate['mass']){
 if(!m||!['gross','net-plus-tare'].includes(m.mode)||!positive(m.value)||!Number.isFinite(m.tare)||m.tare<0||m.mode==='gross'&&m.tare!==0)throw new Error('Use gross mass including tare, or net mass plus tare, once only.');
 const gross=m.value+(m.mode==='net-plus-tare'?m.tare:0);if(!Number.isFinite(gross))throw new Error('Invalid gross mass.');return gross;
}
export function parseCargoTemplate(raw:unknown):CargoTemplate{
 const r=raw as CargoTemplate;
 if(!r||!text(r.id,120)||!r.id||!text(r.name,120)||!r.name.trim()||!cargoFamilies.some(f=>f[0]===r.family)||(r.quantity!==undefined&&(!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>40000))||!text(r.contact)||!text(r.source))throw new Error('Invalid cargo template.');
 grossTemplateMass(r.mass);
 if(r.stowageFactor!==undefined&&!positive(r.stowageFactor))throw new Error('Invalid stowage factor.');
 const p=parseFootprint(r.footprint);if(p.kind)throw new Error('Save support members as an assembly.');
 if(r.cgAboveBase!==undefined&&(!Number.isFinite(r.cgAboveBase)||r.cgAboveBase<0||r.cgAboveBase>p.height))throw new Error('Cargo CG must lie within the unit height.');
 if(p.maxTopLoadTonnes!==undefined&&!r.source.trim())throw new Error('Give the source and applicability of the top-load limit.');
 return {id:r.id,name:r.name.trim(),family:r.family,footprint:{...p,catalogue:{family:r.family,contact:r.contact,source:r.source,cgDeclared:r.cgAboveBase!==undefined,...(r.stowageFactor===undefined?{}:{stowageFactor:r.stowageFactor})},deckZ:0,bottomZ:undefined,areaId:undefined,markings:cloneMarkings(p.markings)},mass:{...r.mass},quantity:r.quantity,...(r.stowageFactor===undefined?{}:{stowageFactor:r.stowageFactor}),...(r.cgAboveBase===undefined?{}:{cgAboveBase:r.cgAboveBase}),contact:r.contact,source:r.source};
}
export function parseCargoAssembly(raw:unknown):CargoAssembly{
 const r=raw as CargoAssembly;
 if(!r||!text(r.id,120)||!r.id||!text(r.name,120)||!r.name.trim()||!Array.isArray(r.items)||!r.items.length||r.items.length>4000)throw new Error('Assemblies need 1–4000 members and a name.');
 const ids=new Set<string>();
 const items=r.items.map(w=>{
  if(!w||!text(w.id,120)||!w.id||ids.has(w.id)||!text(w.name,120)||!w.name.trim()||!positive(Number(w.massTonnes))||![w.lcg,w.tcg,w.vcg].every(v=>typeof v==='string'&&v.trim()&&Number.isFinite(Number(v)))||Number(w.freeSurfaceMomentTransverse)!==0||w.tank)throw new Error('Invalid assembly member.');ids.add(w.id);
  const p=parseFootprint(w.footprint);return {id:w.id,name:w.name,category:'cargo',quantity:'1',massTonnes:String(Number(w.massTonnes)),lcg:w.lcg,tcg:w.tcg,vcg:w.vcg,freeSurfaceMomentTransverse:'0',footprint:{...p,markings:cloneMarkings(p.markings)}};
 });
 if(new Set(items.map(w=>w.footprint.deckZ)).size!==1)throw new Error('Save an assembly from one loading surface at a time.');
 return {id:r.id,name:r.name.trim(),items};
}
export function parseCargoLibrary(raw:unknown):CargoLibrary{
 const r=raw as CargoLibrary;
 if(!r||r.format!=='umc-cargo-library'||r.version!==1||!Array.isArray(r.templates)||!Array.isArray(r.assemblies)||r.templates.length>200||r.assemblies.length>100)throw new Error('Unsupported or oversized cargo library. Expected version 1.');
 const templates=r.templates.map(parseCargoTemplate),assemblies=r.assemblies.map(parseCargoAssembly),ids=new Set<string>();
 for(const v of [...templates,...assemblies]){if(ids.has(v.id))throw new Error('Duplicate library identifier.');ids.add(v.id);}
 return {format:r.format,version:1,templates,assemblies};
}
export function decodeCargoLibrary(json:string){if(json.length>5_000_000)throw new Error('Cargo library exceeds 5 MB.');return parseCargoLibrary(JSON.parse(json));}
export function saveCargoLibrary(storage:Pick<Storage,'setItem'>,library:CargoLibrary){const value=JSON.stringify(parseCargoLibrary(library));if(value.length>5_000_000)throw new Error('Cargo library exceeds 5 MB.');storage.setItem(libraryKey,value);}
export function mergeCargoLibrary(a:CargoLibrary,b:CargoLibrary):CargoLibrary{
 // Imports append independent snapshots; never silently replace a locally edited template.
 return parseCargoLibrary({...a,templates:[...a.templates,...b.templates.map(v=>({...v,id:crypto.randomUUID()}))],assemblies:[...a.assemblies,...b.assemblies.map(v=>({...v,id:crypto.randomUUID()}))]});
}

/** Reuse the transported package, independent of its location and orientation. */
export function cargoTemplateFromWeight(w:WeightDraft):CargoTemplate|undefined{
 if(!w.footprint||w.footprint.kind==='dunnage')return;
 const p=w.footprint,c=p.catalogue;
 try{return parseCargoTemplate({id:w.id,name:w.name,family:c?.family??'boxed',footprint:p,mass:{mode:'gross',value:Number(w.massTonnes),tare:0},contact:c?.contact??'',source:c?.source??'',stowageFactor:c?.stowageFactor,...(c?.cgDeclared?{cgAboveBase:Number(w.vcg)-(p.bottomZ??p.deckZ)}:{})});}catch{return;}
}
