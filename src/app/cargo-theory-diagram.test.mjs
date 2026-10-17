import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {theoryDimensions,theoryProjection}=await server.ssrLoadModule('/src/app/cargo-theory-diagram.ts');
const {projectionEllipse}=await server.ssrLoadModule('/src/app/cargo-shape.ts');
test('orientations rotate one cylinder and give distinct three-view diagrams',()=>{
 const signatures=[];
 for(const [shape,end] of [['cylinder-x','end'],['cylinder-y','side'],['cylinder-z','top']]){
  assert.deepEqual([...theoryDimensions(shape)].sort(),[.6,.6,1.4]);
  const views=['top','side','end'].map(view=>{const p=theoryProjection(shape,view);const circle=projectionEllipse({shape,rotation:0},view);assert.equal(circle,view===end);if(circle)assert.equal(p.width,p.height);return {...p,circle};});
  signatures.push(JSON.stringify(views));
 }
 assert.equal(new Set(signatures).size,3);
 assert.ok(theoryProjection('cylinder-z','side').height>theoryProjection('cylinder-z','side').width);
 for(const view of ['top','side','end'])assert.equal(projectionEllipse({shape:'box',rotation:0},view),false);
});
