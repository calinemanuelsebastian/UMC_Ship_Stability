import * as THREE from 'three';
import {worldShape,type CargoShape} from '../app/cargo-shape';
import type {Footprint} from '../app/cargo-layout';
/** Model coordinates x/longitudinal, y/transverse, z/vertical map to Three x,z,y. */
export function unitCargoGeometry(shape:CargoShape):THREE.BufferGeometry{
 if(shape==='box')return new THREE.BoxGeometry(1,1,1);
 if(shape==='ellipsoid')return new THREE.SphereGeometry(.5,48,24);
 const geometry=new THREE.CylinderGeometry(.5,.5,1,64);
 if(shape==='cylinder-x')geometry.rotateZ(Math.PI/2);
 if(shape==='cylinder-y')geometry.rotateX(Math.PI/2);
 return geometry;
}
export function cargoGeometry(p:Footprint){
 const width=p.rotation===0?p.length:p.width,depth=p.rotation===0?p.width:p.length;
 if((p.shape??'box')==='box')return new THREE.BoxGeometry(width,p.height,depth);
 return unitCargoGeometry(worldShape(p)).scale(width,p.height,depth);
}
