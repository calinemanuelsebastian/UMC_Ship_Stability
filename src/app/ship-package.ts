import {parseWindData} from '../core/stability/wind-profile';
import {parseKgLimits} from '../core/stability/kg-limit';
import {parseFloodData} from '../core/stability/downflooding';
import {parseAssessmentBasis} from '../core/stability/assessment-basis';
import {parseConstantLcb} from '../core/stability/constant-lcb';
import {deckDefinition} from './tween-deck';
import type {ShipModelManifest,ShipModelPackage} from '../core/domain/ship-model';
import {parseHydrostaticTableCsv} from '../core/hydrostatics/solvers/table/hydrostatic-table-parser';
import {parseCrossCurvesCsv} from '../core/stability/solvers/cross-curves/cross-curves-parser';
import {parseTrimmedTable} from '../core/trim/trimmed-table';
import {parseArea} from './cargo-layout';
export type PackageFile={encoding:'utf8'|'base64';data:string};
export type ShipBundle={format:'umc-ship-package';version:1;manifest:ShipModelManifest;files:Record<string,PackageFile>};
export const maxShipBytes=50*1024*1024;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function safeShipPath(path:string){return /^[a-zA-Z0-9_./ -]+$/.test(path)&&!path.startsWith('/')&&!path.split('/').some(p=>!p||p==='.'||p==='..')&&path.length<240;}
export function fileText(bundle:ShipBundle,path:string){const f=bundle.files[path];if(!f||f.encoding!=='utf8')throw new Error(`Expected text resource: ${path}`);return f.data;}
function gltfJson(bundle:ShipBundle,path:string){
 const value=JSON.parse(fileText(bundle,path));
 if(!object(value)||!object(value.asset)||value.asset.version!=='2.0'||!Array.isArray(value.nodes))throw new Error(`${path}: expected glTF 2.0 with nodes.`);
 const config=bundle.manifest.resources.find(r=>r.kind==='visualization.gltf'&&r.path===path)?.config;
 const names=new Set(value.nodes.map(n=>object(n)?n.name:undefined));
 for(const key of ['exteriorGroup','panelGroup'])if(config?.[key]&&!names.has(config[key]))throw new Error(`${path}: model group ${String(config[key])} is missing.`);
 const deck=deckDefinition({manifest:bundle.manifest,baseUrl:''});
 if(deck?.storedPanels.length){if(!config?.panelGroup)throw new Error('Stored panels require a named glTF panel group.');for(const panel of deck.storedPanels)if(!names.has(panel.id))throw new Error(`Missing panel mesh node: ${panel.id}`);}
 if(Array.isArray(value.extensionsRequired)&&value.extensionsRequired.length)throw new Error(`${path}: export uncompressed glTF without required extensions.`);
 for(const kind of ['buffers','images'])for(const part of (value[kind]??[]) as {uri?:string}[]){
  if(!part.uri)continue;
  if(part.uri.startsWith('data:')){if(!/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,[a-zA-Z0-9+/=\s]+$/.test(part.uri))throw new Error(`${path}: unsupported embedded asset.`);}
  else {const relative=path.slice(0,path.lastIndexOf('/')+1)+part.uri;if(!safeShipPath(relative)||!bundle.files[relative])throw new Error(`${path}: missing or external asset ${part.uri}.`);}
 }
 return value;
}
export function parseShipBundle(raw:unknown):ShipBundle{
 if(!object(raw)||raw.format!=='umc-ship-package'||raw.version!==1||!object(raw.manifest)||!object(raw.files))throw new Error('Choose an UMC .ship.json package (version 1).');
 const m=raw.manifest as unknown as ShipModelManifest;
 if(m.schemaVersion!=='1.0.0'||!m.id||!(/^[a-zA-Z0-9_-]{1,100}$/).test(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>120)throw new Error('Manifest needs a name, a safe ID and schemaVersion 1.0.0.');
 if(m.units?.length!=='m'||m.units.mass!=='t'||m.units.density!=='t/m3'||m.units.angle!=='deg')throw new Error('Convert the package to metres, tonnes, t/m³ and degrees before importing.');
 if(m.reviewNotes&&(!Array.isArray(m.reviewNotes.messages)||!m.reviewNotes.messages.every(v=>typeof v==='string')||!Array.isArray(m.reviewNotes.resourceIds)||!m.reviewNotes.resourceIds.every(v=>typeof v==='string')))throw new Error('Invalid source review notes.');
 const c=m.coordinateSystem,d=m.principalDimensions,s=m.defaultCondition;
 if(!c||c.longitudinalOriginFromAP!==0||c.xPositive!=='forward'||c.yPositive!=='starboard'||c.zPositive!=='up'||typeof c.origin!=='string')throw new Error('Import currently requires AP / centreline / baseline coordinates: x forward, y starboard, z up.');
 if(!d||![d.lbp,d.beam,d.mouldedDepth].every(v=>finite(v)&&v>0)||d.loa!==undefined&&(!finite(d.loa)||d.loa<d.lbp))throw new Error('Provide positive LBP, beam and moulded depth; LOA cannot be shorter than LBP.');
 if(!s||![s.vcg,s.lcg,s.tcg,s.waterDensity].every(finite)||s.waterDensity<=0||(s.draft!==undefined?(!finite(s.draft)||s.draft<=0||s.draft>=d.mouldedDepth!):(!finite(s.displacementTonnes)||s.displacementTonnes<=0)))throw new Error('Provide finite default centres, positive water density and a draft inside the hull or positive displacement.');
 if(!Array.isArray(m.resources)||m.resources.length>100||!m.resources.length)throw new Error('Manifest resources are missing or too numerous.');
 const ids=new Set<string>(),kinds=new Set<string>();let size=0;
 for(const [path,f] of Object.entries(raw.files)){
  if(!safeShipPath(path)||!object(f)||!['utf8','base64'].includes(String(f.encoding))||typeof f.data!=='string')throw new Error(`Invalid packaged file: ${path}`);
  if(f.encoding==='base64'&&!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data))throw new Error(`Invalid base64: ${path}`);
  size+=new TextEncoder().encode(f.data).length;
 }
 if(size>maxShipBytes||Object.keys(raw.files).length>200)throw new Error('Ship package exceeds 50 MB or 200 files.');
 const b=raw as unknown as ShipBundle;
 for(const r of m.resources){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.kind!=='string'||kinds.has(r.kind))throw new Error('Resources must have unique IDs and one resource per kind.');ids.add(r.id);kinds.add(r.kind);
  if(r.path&&(!safeShipPath(r.path)||!b.files[r.path]))throw new Error(`Missing resource file: ${r.path}`);
  const pathKinds=['hydrostatics.upright-table','stability.cross-curves','hydrostatics.trimmed-table','loading.weights','loading.operational-weights','loading.tank-catalog','validation.reference-cases','visualization.gltf'];
  if(pathKinds.includes(r.kind)&&!r.path)throw new Error(`Missing path for ${r.kind}.`);
  if(r.kind==='hydrostatics.upright-table')parseHydrostaticTableCsv(fileText(b,r.path!));
  if(r.kind==='stability.downflooding-samples'){if(!r.path)throw new Error('Missing downflooding path.');parseFloodData(JSON.parse(fileText(b,r.path)));}
  if(r.kind==='documentation.annotated-kg'){if(!r.path)throw new Error('Missing KG limits path.');parseKgLimits(JSON.parse(fileText(b,r.path)));}
  if(r.kind==='stability.wind-profiles'){if(!r.path)throw new Error('Missing wind resource path.');parseWindData(JSON.parse(fileText(b,r.path)));}
  if(r.kind==='stability.assessment-basis'){if(!r.path)throw new Error('Assessment basis path is missing.');parseAssessmentBasis(JSON.parse(fileText(b,r.path)));}
  if(r.kind==='stability.constant-lcb-cross-curves'){if(!r.path)throw new Error('Constant-LCB path is missing.');parseConstantLcb(JSON.parse(fileText(b,r.path)));}
  if(r.kind==='stability.cross-curves')parseCrossCurvesCsv(fileText(b,r.path!));
  if(r.kind==='hydrostatics.trimmed-table'){const t=parseTrimmedTable(JSON.parse(fileText(b,r.path!)));if(t.modelId!==m.id||t.longitudinalOriginFromAP!==0||t.xPositive!=='forward')throw new Error('Trim table model ID or coordinates differ from manifest.');}
  if(r.kind==='visualization.gltf')gltfJson(b,r.path!);
  for(const key of ['surfaces','hatchSurfaces'])if(r.config?.[key]!==undefined){if(!Array.isArray(r.config[key]))throw new Error(`Invalid ${key}.`);(r.config[key] as unknown[]).forEach(parseArea);}
 }
 if(!kinds.has('hydrostatics.upright-table')||!kinds.has('loading.weights'))throw new Error('An upright hydrostatic table and loading weights are required.');
 if(m.resources.some(r=>r.kind==='visualization.gltf'&&r.config?.surfaces))throw new Error('Define cargo spaces in loading.cargo-surfaces.');
 deckDefinition({manifest:m,baseUrl:''});
 for(const r of m.resources){const byMode=r.config?.byMode;if(byMode!==undefined){if(!object(byMode))throw new Error('Invalid deck cargo spaces.');for(const mode of ['installed','stored','ashore']){if(!Array.isArray(byMode[mode]))throw new Error('Provide cargo spaces for every deck mode.');(byMode[mode] as unknown[]).forEach(parseArea);}}}
 if(kinds.has('visualization.gltf')&&!kinds.has('visualization.schematic-cargo-hull'))throw new Error('glTF display requires visualization.schematic-cargo-hull.');
 return structuredClone(b);
}
/** Local files keep canonical relative paths in the manifest for stable saved-plan signatures. */
export function mountShipBundle(bundle:ShipBundle):ShipModelPackage{
 const urls:Record<string,string>={},allocated:string[]=[];
 const add=(path:string,blob:Blob)=>{const url=URL.createObjectURL(blob);allocated.push(url);urls[path]=url;};
 const release=()=>allocated.splice(0).forEach(url=>URL.revokeObjectURL(url));
 try{
  for(const [path,f] of Object.entries(bundle.files)){
   const bytes=f.encoding==='utf8'?f.data:Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));
   add(path,new Blob([bytes],{type:path.endsWith('.png')?'image/png':path.endsWith('.jpg')?'image/jpeg':'application/octet-stream'}));
  }
  for(const r of bundle.manifest.resources.filter(r=>r.kind==='visualization.gltf')){
   const g=gltfJson(bundle,r.path!);
   for(const kind of ['buffers','images'])for(const part of (g[kind]??[]) as {uri?:string}[])if(part.uri&&!part.uri.startsWith('data:'))part.uri=urls[r.path!.slice(0,r.path!.lastIndexOf('/')+1)+part.uri];
   add(r.path!,new Blob([JSON.stringify(g)],{type:'model/gltf+json'}));
  }
  return {manifest:bundle.manifest,baseUrl:'',resourceUrls:urls,release};
 }catch(error){release();throw error;}
}
