import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';import * as THREE from 'three';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());const {InstancedCargo}=await server.ssrLoadModule('/src/visualization/instanced-cargo.ts');
test('large cargo batches share geometry, preserve IDs and reset previews without rebuilding',()=>{
 const ws=Array.from({length:3376},(_,i)=>({id:String(i),name:'Box',lcg:String(i*2),tcg:'0',vcg:'.5',massTonnes:'1',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0}}));const scene=new InstancedCargo();scene.sync(ws,new Set(),()=>{});assert.equal(scene.group.children.length,1);assert.equal(scene.proxies.size,3376);const batch=scene.group.children[0],proxy=scene.proxies.get('0');proxy.position.x=2;proxy.userData.syncInstance('#16845b');scene.sync(ws,new Set(['0']),()=>{});assert.equal(scene.group.children[0],batch);assert.equal(proxy.position.x,0);const c=new THREE.Color();batch.getColorAt(0,c);assert.equal(c.getHexString(),'be2961');scene.group.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,5,0),new THREE.Vector3(0,-1,0));assert.equal(scene.pick(ray).id,'0');scene.dispose();assert.equal(scene.group.children.length,0);assert.equal(scene.proxies.size,0);
});
test('mixed-shape batches retain geometry and do not pick empty cylinder corners',()=>{
 const ws=['box','cylinder-z','cylinder-x','ellipsoid'].map((shape,i)=>({id:shape,name:shape,lcg:String(i*4),tcg:'0',footprint:{length:2,width:2,height:2,rotation:0,deckZ:0,shape}}));
 const scene=new InstancedCargo();scene.sync(ws,new Set(),()=>{});assert.equal(scene.group.children.length,4);
 const ray=new THREE.Raycaster(new THREE.Vector3(4.9,5,.9),new THREE.Vector3(0,-1,0));assert.equal(scene.pick(ray),undefined);
 ray.ray.origin.set(4,5,0);assert.equal(scene.pick(ray).id,'cylinder-z');
 assert.equal(scene.proxies.get('cylinder-x').geometry.type,'CylinderGeometry');assert.equal(scene.proxies.get('ellipsoid').geometry.type,'SphereGeometry');scene.dispose();
});
