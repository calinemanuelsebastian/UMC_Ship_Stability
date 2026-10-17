import {cargoGeometry} from './cargo-geometry';
import {CargoMarkingTextures} from './cargo-marking-textures';
import {markingLines} from '../app/cargo-identification';
import * as THREE from 'three';
import type {WeightDraft} from '../app/loading-state';
import {cargoBottom} from '../app/cargo-placement';
import {addCargoOutline,disposeCargoOutline} from './cargo-outline';
export type CargoMesh=THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
export function syncCargoMeshes(group:THREE.Group,meshes:Map<string,CargoMesh>,weights:WeightDraft[],selection:ReadonlySet<string>,invalidate:()=>void=()=>{}){
 const art:CargoMarkingTextures=group.userData.cargoArt??=new CargoMarkingTextures();art.begin();
 const live=new Set<string>();const names=new Set<string>();
 for(const w of weights){
  const p=w.footprint;if(!p||![Number(w.lcg),Number(w.tcg)].every(Number.isFinite))continue;
  live.add(w.id);const width=p.rotation===0?p.length:p.width,depth=p.rotation===0?p.width:p.length;
  let mesh=meshes.get(w.id);
  if(!mesh){mesh=new THREE.Mesh(cargoGeometry(p),new THREE.MeshStandardMaterial());mesh.userData.id=w.id;addCargoOutline(mesh);group.add(mesh);meshes.set(w.id,mesh);}
  else {if(mesh.userData.geometryKey!==JSON.stringify([p.shape??'box',width,p.height,depth,p.rotation])){disposeCargoOutline(mesh);mesh.geometry.dispose();mesh.geometry=cargoGeometry(p);addCargoOutline(mesh);}}
  mesh.userData.geometryKey=JSON.stringify([p.shape??'box',width,p.height,depth,p.rotation]);
  const label=selection.has(w.id)?markingLines(w).join(' · '):w.footprint?.markings?.layers.identity===false?'':w.name;
  names.add(label);mesh.name=w.name;syncNameLabel(group,mesh,label,Math.min(width,depth),p.height);
  const map=art.get(w.name,p.markings,p.stackability,invalidate);if(mesh.material.map!==map){mesh.material.map=map;mesh.material.needsUpdate=true;}
  mesh.position.set(Number(w.lcg),cargoBottom(w)+p.height/2,Number(w.tcg));mesh.material.color.set(selection.has(w.id)?'#be2961':p.kind==='dunnage'?'#a66b30':mesh.material.map?'#ffffff':'#3486b4');
 }
 for(const [id,mesh] of meshes)if(!live.has(id)){group.remove(mesh);for(const child of mesh.children)if(child.userData.cargoName)(child as THREE.Sprite).material.dispose();disposeCargoOutline(mesh);mesh.geometry.dispose();mesh.material.dispose();meshes.delete(id);}
 art.end();
 const textures=group.userData.cargoNameTextures as Map<string,THREE.CanvasTexture>|undefined;
 if(textures)for(const [name,texture] of textures)if(!names.has(name)){texture.dispose();textures.delete(name);}
}

/** Reuse a single label texture for each name, including repeated cargo units. */
function syncNameLabel(group:THREE.Group,mesh:CargoMesh,name:string,width:number,height:number){
 if(typeof document==='undefined')return;
 const textures:Map<string,THREE.CanvasTexture>=group.userData.cargoNameTextures??=new Map();
 let texture=textures.get(name);
 if(!texture){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fillRect(0,0,512,80);ctx.fillStyle='#122d43';ctx.font='32px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,256,40,490);
  texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.set(name,texture);
 }
 let label=mesh.children.find(c=>c.userData.cargoName) as THREE.Sprite|undefined;
 if(!label){label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));label.userData.cargoName=true;label.raycast=()=>{};mesh.add(label);}
 if(label.material.map!==texture){label.material.map=texture;label.material.needsUpdate=true;}
 label.visible=!!name;const size=Math.min(width*.9,5);label.scale.set(size,size*80/512,1);label.position.set(0,height/2+.04,0);
}
export function disposeCargoNameTextures(group:THREE.Group){(group.userData.cargoArt as CargoMarkingTextures|undefined)?.dispose();const textures=group.userData.cargoNameTextures as Map<string,THREE.CanvasTexture>|undefined;textures?.forEach(t=>t.dispose());textures?.clear();}
