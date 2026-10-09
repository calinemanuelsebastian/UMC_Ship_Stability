import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {anchoredPlanOffset,clampPlanZoom}=await server.ssrLoadModule('/src/app/plan-navigation.ts');
test('pinch keeps an off-centre anchor at its screen location',()=>{
 const offset=anchoredPlanOffset({x:0,y:0},{x:8,y:4},{x:5,y:5},{x:0,y:0},1,2);
 assert.deepEqual(offset,{x:1.5,y:-.5});
 assert.equal((8-(5+offset.x))*2,8-5);
});
test('two-finger pan and zoom combine without moving cargo coordinates',()=>{
 assert.deepEqual(anchoredPlanOffset({x:3,y:2},{x:5,y:5},{x:5,y:5},{x:2,y:4},1,2),{x:2,y:0});
 assert.deepEqual(anchoredPlanOffset({x:3,y:2},{x:5,y:5},{x:5,y:5},{x:2,y:4},2,2),{x:1,y:-2});
 assert.equal(clampPlanZoom(.1),1);assert.equal(clampPlanZoom(100),15);
});
