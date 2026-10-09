import {parseShipBundle,type ShipBundle} from './ship-package';
import {shipResourceUrl} from '../core/domain/ship-resource';
import type {ShipModelPackage} from '../core/domain/ship-model';
export async function exportShipBundle(ship:ShipModelPackage):Promise<ShipBundle>{
 const bundle:ShipBundle={format:'umc-ship-package',version:1,manifest:structuredClone(ship.manifest),files:{}};
 async function collect(path:string){
  if(bundle.files[path])return;
  const response=await fetch(shipResourceUrl(ship,path));if(!response.ok)throw new Error(`Could not read ${path}`);
  if(/\.(json|csv|gltf|svg|txt)$/i.test(path))bundle.files[path]={encoding:'utf8',data:await response.text()};
  else {const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);bundle.files[path]={encoding:'base64',data:btoa(binary)};}
 }
 for(const r of ship.manifest.resources)if(r.path)await collect(r.path);
 for(const r of ship.manifest.resources.filter(r=>r.kind==='visualization.gltf')){
  const g=JSON.parse(bundle.files[r.path!].data);
  for(const kind of ['buffers','images'])for(const part of g[kind]??[])if(part.uri&&!part.uri.startsWith('data:'))await collect(r.path!.slice(0,r.path!.lastIndexOf('/')+1)+part.uri);
 }
 return parseShipBundle(bundle);
}
export function downloadShipBundle(bundle:ShipBundle){
 const url=URL.createObjectURL(new Blob([JSON.stringify(bundle)],{type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=`${bundle.manifest.id}.ship.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
