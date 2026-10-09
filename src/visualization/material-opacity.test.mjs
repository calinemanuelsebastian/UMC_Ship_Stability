import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {setSurfaceOpacity,setPanelOpacity}=await server.ssrLoadModule('/src/visualization/material-opacity.ts');
const {MeshPhongMaterial}=await import('three');
for (const [name, apply] of [['hull and cargo',setSurfaceOpacity],['tween-deck',setPanelOpacity]]) {
 test(`${name}: solid endpoints occlude and intermediate transparency is smooth`,()=>{
  const material=new MeshPhongMaterial({alphaHash:true});
  // Exercise slider changes in both directions and a previously hashed material.
  for(const opacity of [.1,.95,1,.95,.1,0,1]) {
   apply(material,opacity);
   assert.equal(material.opacity,opacity);
   assert.equal(material.alphaHash,false);
   assert.equal(material.transparent,opacity<1);
   assert.equal(material.depthWrite,opacity===1);
   assert.equal(material.depthTest,true);
  }
  material.dispose();
 });
 test(`${name}: repeated render updates do not recompile unchanged materials`,()=>{
  const material=new MeshPhongMaterial({alphaHash:true});
  apply(material,.1);const version=material.version;
  apply(material,.5);apply(material,.5);
  assert.equal(material.version,version);
  apply(material,1);assert.ok(material.version>version);
  const opaqueVersion=material.version;apply(material,1);
  assert.equal(material.version,opaqueVersion);
  assert.throws(()=>apply(material,NaN),/finite/);
  apply(material,2);assert.equal(material.opacity,1);assert.equal(material.depthWrite,true);
  apply(material,-1);assert.equal(material.opacity,0);assert.equal(material.depthWrite,false);
  material.dispose();
 });
}
