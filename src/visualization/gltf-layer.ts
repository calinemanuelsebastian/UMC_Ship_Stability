import {type TweenDeckMode} from '../app/tween-deck';
import { setSurfaceOpacity, setPanelOpacity } from './material-opacity';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {waterPlaneDistance,type BoxHull} from './ship-scene-data';
export function disposeModel(root:THREE.Object3D) {
  const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>(),ts=new Set<THREE.Texture>();
  root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)ts.add(v);}}});
  gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());
}
/** Rendering resource only. Its meshes never enter the hydrostatic solver. */
export function gltfLayer(body:THREE.Group,hull:BoxHull,onReady:()=>void,onError:()=>void) {
  let root:THREE.Group|undefined,disposed=false,lastDraft='',vertices:THREE.Vector3[][]=[];
  const originalPositions=new WeakMap<THREE.Object3D,THREE.Vector3>();
  let options={panelMode:'installed' as TweenDeckMode,exterior:true,panels:true,hullOpacity:.25,panelOpacity:1,plane:[0,1,0,0],lineWidth:6};
  const halo=new LineSegments2(new LineSegmentsGeometry(),new LineMaterial({color:'#ffffff',linewidth:10,depthTest:false,depthWrite:false}));
  const line=new LineSegments2(new LineSegmentsGeometry(),new LineMaterial({color:'#005b78',linewidth:6,depthTest:false,depthWrite:false}));
  halo.renderOrder=5;line.renderOrder=6;body.add(halo,line);
  function update(next:typeof options) {
    options=next;if(!root)return;
    const exterior=(hull.model!.exteriorGroup?root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(hull.model!.exteriorGroup)):root),panels=hull.model!.panelGroup?root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(hull.model!.panelGroup)):undefined;
    if(exterior){exterior.visible=next.exterior&&next.hullOpacity>0;exterior.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){setSurfaceOpacity(m,next.hullOpacity);}});}
    if(panels){panels.visible=next.panels&&next.panelOpacity>0&&next.panelMode!=='ashore';
      panels.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
        const placement=hull.model?.storedPanels?.find(p=>THREE.PropertyBinding.sanitizeNodeName(p.id)===o.name);
        if(!placement)return;
        o.geometry.computeBoundingBox();const centre=o.geometry.boundingBox!.getCenter(new THREE.Vector3());
        // Vertex positions are already expressed in the body frame. Dimensions are retained.
        // Stored slabs are centred on the tabulated VCG as a geometric approximation.
        if(!originalPositions.has(o))originalPositions.set(o,o.position.clone());
        if(next.panelMode==='stored'){const target=new THREE.Vector3(placement.x-hull.length/2,placement.z,placement.y);root!.updateMatrixWorld(true);root!.localToWorld(target);o.parent!.worldToLocal(target);o.position.copy(target.sub(centre.multiply(o.scale).applyQuaternion(o.quaternion)));}else o.position.copy(originalPositions.get(o)!);
      });panels.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){setPanelOpacity(m,next.panelOpacity);}});}
    line.visible=halo.visible=next.exterior;line.material.linewidth=next.lineWidth;halo.material.linewidth=next.lineWidth+4;
    if(JSON.stringify(next.plane)!==lastDraft){
      const positions:number[]=[];
      for(const tri of vertices){const hits:THREE.Vector3[]=[];
        for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],da=waterPlaneDistance(next.plane,a),db=waterPlaneDistance(next.plane,b);
          if((da<=0&&db>0)||(db<=0&&da>0))hits.push(a.clone().lerp(b,da/(da-db)));
        }
        if(hits.length===2)positions.push(...hits[0].toArray(),...hits[1].toArray());
      }
      line.geometry.dispose();halo.geometry.dispose();
      line.geometry=new LineSegmentsGeometry().setPositions(positions);halo.geometry=new LineSegmentsGeometry().setPositions(positions);lastDraft=JSON.stringify(next.plane);
    }
  }
  new GLTFLoader().load(hull.model!.url,gltf=>{
    if(disposed){gltf.scenes.forEach(disposeModel);return;}
    root=gltf.scene;root.updateMatrixWorld(true);
    root.traverse(o=>{if(o instanceof THREE.Mesh && hull.model!.waterlineMeshes.some(name=>THREE.PropertyBinding.sanitizeNodeName(name)===o.name)){
      const p=o.geometry.attributes.position,indices=o.geometry.index;
      for(let i=0;i<(indices?.count??p.count);i+=3)vertices.push([0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,indices?indices.getX(i+j):i+j).applyMatrix4(o.matrixWorld)));
    }});
    // Three.js sanitizes mesh/node names; explicit resource group names are also sanitized.
    const exterior=(hull.model!.exteriorGroup?root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(hull.model!.exteriorGroup)):root);
    for(const a of hull.model?.hatchSurfaces??[])for(const region of a.panels??a.supportRegions??a.regions??[a]){
      const cover=new THREE.Mesh(new THREE.PlaneGeometry(region.xMax-region.xMin,region.yMax-region.yMin),new THREE.MeshStandardMaterial({color:'#7d919b',side:THREE.DoubleSide}));
      cover.name=a.id+'-planning-cover';cover.rotation.x=-Math.PI/2;cover.position.set((region.xMin+region.xMax)/2-hull.length/2,a.deckZ,(region.yMin+region.yMax)/2);(exterior??root).add(cover);
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(cover.geometry),new THREE.LineBasicMaterial({color:'#426450',transparent:true,opacity:.6}));edges.position.z=.008;cover.add(edges);
    }
    body.add(root);update(options);onReady();
  },undefined,()=>{if(!disposed)onError();});
  return {update,dispose(){disposed=true;if(root){body.remove(root);disposeModel(root);}body.remove(line,halo);line.geometry.dispose();halo.geometry.dispose();line.material.dispose();halo.material.dispose();vertices=[];}};
}
