import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());const {windowHits}=await server.ssrLoadModule('/src/components/use-window-selection.tsx');
const boxes=[{id:'inside',left:2,right:4,top:2,bottom:4},{id:'crossing',left:8,right:12,top:2,bottom:4},{id:'behind',left:2,right:4,top:2,bottom:4},{id:'outside',left:20,right:22,top:2,bottom:4}];
test('left-to-right enclosure excludes partial intersections',()=>assert.deepEqual(windowHits(boxes,{x:0,y:0},{x:10,y:10}),['inside','behind']));
test('right-to-left crossing selects partial intersections and projected hidden units',()=>assert.deepEqual(windowHits(boxes,{x:10,y:10},{x:0,y:0}),['inside','crossing','behind']));
