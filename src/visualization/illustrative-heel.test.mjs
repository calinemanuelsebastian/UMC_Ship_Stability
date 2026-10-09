import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {illustrativeHeelPose,waterPlaneDistance,heeledBox}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
test('visual heel holds the centreline water-level pivot through signed right angles',()=>{for(const degrees of [-90,-45,-10,0,10,45,90]){const {angle,heave}=illustrativeHeelPose(5,degrees);assert.ok(Number.isFinite(heave));assert.ok(Math.abs(5*Math.cos(angle)+heave)<1e-12);const plane=[0,Math.cos(angle),-Math.sin(angle),heave];for(const p of [{x:0,y:5,z:0},{x:12,y:8,z:3},{x:-30,y:1,z:-4}])assert.ok(Math.abs(waterPlaneDistance(plane,p)-(p.y*Math.cos(angle)-p.z*Math.sin(angle)+heave))<1e-12);}});
test('invalid visual inputs are rejected and reconstructed hulls never use rectangular buoyancy',()=>{for(const angle of [NaN,Infinity,91,-91])assert.throws(()=>illustrativeHeelPose(5,angle));assert.throws(()=>illustrativeHeelPose(-1,0));assert.throws(()=>heeledBox({length:100,beam:20,depth:10,schematic:true},5,10),/unavailable/);});
