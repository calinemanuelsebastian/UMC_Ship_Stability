import {unitCargoGeometry} from './cargo-geometry';
import {cargoShapes,worldShape,type CargoShape} from '../app/cargo-shape';
import * as THREE from 'three';
import type {WeightDraft} from '../app/loading-state';
import {cargoBottom} from '../app/cargo-placement';
import {CargoMarkingTextures} from './cargo-marking-textures';
/** Large-plan rendering: shared shape geometries/materials with per-instance transforms and colour.
 * Labels remain available in the selection inspector; surface identification art is retained. */
export class InstancedCargo {
 readonly group=new THREE.Group();readonly proxies=new Map<string,THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>>();
 private batches:THREE.InstancedMesh[]=[];private geometries=new Map(cargoShapes.map(s=>[s,unitCargoGeometry(s)]));private proxyMaterial=new THREE.MeshStandardMaterial();private art=new CargoMarkingTextures();
 private weights?:WeightDraft[];private selected=new Set<string>();private baseColors=new Map<string,string>();
 sync(weights:WeightDraft[],selection:ReadonlySet<string>,invalidate:()=>void){
  if(this.weights!==weights){
   this.clear();this.weights=weights;this.art.begin();
   const groups=new Map<string,{w:WeightDraft;map:THREE.Texture|null}[]>();
   for(const w of weights){if(!w.footprint)continue;const map=this.art.get(w.name,w.footprint.markings,w.footprint.stackability,invalidate);const key=(map?.uuid??'none')+':'+worldShape(w.footprint);const list=groups.get(key)??[];list.push({w,map});groups.set(key,list);}
   for(const items of groups.values()){const map=items[0].map,shape=worldShape(items[0].w.footprint!),geometry=this.geometries.get(shape)!;
    const material=new THREE.MeshStandardMaterial({map});
    // Screen-space edge width remains constant, including selected instances.
    material.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 cargoUv;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\ncargoUv = uv;');shader.fragmentShader='varying vec2 cargoUv;\n'+shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nvec2 edge = min(cargoUv, 1.0-cargoUv) / max(fwidth(cargoUv), vec2(0.000001));\nfloat border = smoothstep(0.6, 1.3, min(edge.x,edge.y));\ngl_FragColor.rgb = mix(vec3(0.04,0.23,0.32),gl_FragColor.rgb,border);');};
    const batch=new THREE.InstancedMesh(geometry,material,items.length);batch.frustumCulled=false;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.userData.ids=items.map(x=>x.w.id);this.group.add(batch);this.batches.push(batch);
    items.forEach(({w},i)=>{const p=w.footprint!,proxy=new THREE.Mesh(geometry,this.proxyMaterial);proxy.userData.id=w.id;proxy.userData.shape=shape;proxy.name=w.name;proxy.scale.set(p.rotation===0?p.length:p.width,p.height,p.rotation===0?p.width:p.length);proxy.position.set(+w.lcg,cargoBottom(w)+p.height/2,+w.tcg);const color=p.kind==='dunnage'?'#a66b30':map?'#ffffff':'#3486b4';this.baseColors.set(w.id,color);
     proxy.userData.syncInstance=(color?:string)=>{proxy.updateMatrix();batch.setMatrixAt(i,proxy.matrix);if(batch.userData.ready)batch.instanceMatrix.addUpdateRange(i*16,16);if(color)batch.setColorAt(i,new THREE.Color(color));batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor){if(batch.userData.ready)batch.instanceColor.addUpdateRange(i*3,3);batch.instanceColor.needsUpdate=true;}batch.boundingSphere=null;};
     proxy.userData.syncInstance(selection.has(w.id)?'#be2961':color);this.proxies.set(w.id,proxy);
    });batch.userData.ready=true;
   }this.art.end();
  }else{
   for(const id of new Set([...this.selected,...selection]))this.proxies.get(id)?.userData.syncInstance(selection.has(id)?'#be2961':this.baseColors.get(id));
   // Reset moved preview proxies to the authoritative condition on release/cancel.
   for(const w of weights){const proxy=this.proxies.get(w.id);if(proxy&&w.footprint&&(proxy.position.x!==+w.lcg||proxy.position.z!==+w.tcg||proxy.position.y!==cargoBottom(w)+w.footprint.height/2)){proxy.position.set(+w.lcg,cargoBottom(w)+w.footprint.height/2,+w.tcg);proxy.userData.syncInstance(selection.has(w.id)?'#be2961':this.baseColors.get(w.id));}}
  }this.selected=new Set(selection);
 }
 /** Envelope rejection keeps picking inexpensive; curved candidates use their mesh.
  * The proxy follows the current preview transform. */
 pick(ray:THREE.Raycaster){
  const box=new THREE.Box3(),point=new THREE.Vector3();let nearest=Infinity,result:{id:string;point:THREE.Vector3}|undefined;
  for(const [id,proxy] of this.proxies){
   box.min.copy(proxy.position).addScaledVector(proxy.scale,-.5);box.max.copy(proxy.position).addScaledVector(proxy.scale,.5);
   if(!ray.ray.intersectBox(box,point))continue;
   if((proxy.userData.shape as CargoShape)!=='box'){proxy.updateMatrixWorld(true);const hit=ray.intersectObject(proxy,false)[0];if(!hit)continue;point.copy(hit.point);}
   const distance=ray.ray.origin.distanceTo(point);
   if(distance<ray.near||distance>ray.far||distance>=nearest)continue;
   nearest=distance;result={id,point:point.clone()};
  }return result;
 }

 private clear(){for(const batch of this.batches){this.group.remove(batch);(batch.material as THREE.Material).dispose();batch.dispose();}this.batches=[];this.proxies.clear();this.baseColors.clear();}
 dispose(){this.clear();this.art.dispose();for(const geometry of this.geometries.values())geometry.dispose();this.proxyMaterial.dispose();this.weights=undefined;}
}
