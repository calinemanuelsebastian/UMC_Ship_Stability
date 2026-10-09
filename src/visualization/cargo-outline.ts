import * as THREE from 'three';
/** Pixel-width edges remain unchanged by selection or object scale. */
export function addCargoOutline(mesh:THREE.Mesh){
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#24465f',linewidth:1,transparent:true,depthWrite:false}));
 edges.userData.cargoOutline=true;edges.raycast=()=>{};mesh.add(edges);return edges;
}
export function disposeCargoOutline(mesh:THREE.Mesh){for(const child of [...mesh.children])if(child.userData.cargoOutline){const line=child as THREE.LineSegments<THREE.EdgesGeometry,THREE.LineBasicMaterial>;line.geometry.dispose();line.material.dispose();mesh.remove(line);}}
