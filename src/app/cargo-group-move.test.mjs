import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {placeCargoGroup}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8};
const box=(id,x,z=0)=>({id,name:id,lcg:String(x),tcg:'2',vcg:String(z+.5),massTonnes:'2',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:z,areaId:'hold'}});
test('moves adjacent units rigidly without mutating originals',()=>{const group=[box('a',2),box('b',3)];const before=structuredClone(group);const next=placeCargoGroup(group,'a',[area],group,{x:5,y:4,z:0},false,true);assert.deepEqual(next.map(w=>[+w.lcg,+w.tcg]),[[5,4],[6,4]]);assert.deepEqual(group,before);});
test('moves a stack together even when dragging the upper item',()=>{const group=[box('base',2),box('top',2,1)];const next=placeCargoGroup(group,'top',[area],group,{x:5,y:4,z:1},false,false);assert.deepEqual(next.map(w=>[+w.lcg,+w.vcg,w.footprint.bottomZ]),[[5,.5,0],[5,1.5,1]]);});
test('rejects entire move if a secondary unit collides or leaves bounds',()=>{const group=[box('a',2),box('b',3)];assert.throws(()=>placeCargoGroup(group,'a',[area],[...group,box('obstacle',6)],{x:5,y:2,z:0},false,false),/intersect/);assert.throws(()=>placeCargoGroup(group,'a',[area],group,{x:19.5,y:2,z:0},false,false));});
test('cannot leave unselected cargo behind on a moving support',()=>{const base=box('base',2),other=box('other',4),top=box('top',2,1);assert.throws(()=>placeCargoGroup([base,other],'base',[area],[base,other,top],{x:5,y:2,z:0},false,false),/supported cargo/);});
const {rotateCargoGroup}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
test('quarter turn preserves a group and four turns restore positions',()=>{const group=[box('a',3),box('b',4)];let next=rotateCargoGroup(group,[area],group);assert.equal(+next[0].lcg,+next[1].lcg);assert.equal(+next[1].tcg-Number(next[0].tcg),1);for(let i=0;i<3;i++)next=rotateCargoGroup(next,[area],next);assert.deepEqual(next.map(w=>[w.lcg,w.tcg,w.footprint.rotation,w.massTonnes,w.vcg]),group.map(w=>[w.lcg,w.tcg,w.footprint.rotation,w.massTonnes,w.vcg]));});
test('adjustable grid preserves group spacing and supports unsnapped movement',()=>{
 const group=[box('a',2),box('b',3)];
 const next=placeCargoGroup(group,'a',[area],group,{x:5.37,y:4.37,z:0},false,.5);
 assert.equal(+next[0].lcg,5.5);assert.equal(+next[0].tcg,4.5);assert.equal(+next[1].lcg-Number(next[0].lcg),1);
 const fine=placeCargoGroup([group[0]],'a',[area],group,{x:5.37,y:4.37,z:0},false,.01);assert.equal(+fine[0].lcg,5.37);
 const free=placeCargoGroup([group[0]],'a',[area],group,{x:5.373,y:4.371,z:0},false,false);assert.equal(+free[0].lcg,5.373);
});
const {rotateCargoPreview}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
test('preview rotation preserves a rectangular group, mass and elevation without mutating clipboard',()=>{
 const group=[{...box('a',3),footprint:{...box('a',3).footprint,length:2}},box('b',5)];
 const original=structuredClone(group);let rotated=rotateCargoPreview(group);
 assert.equal(rotated[0].footprint.rotation,90);
 assert.equal(+rotated[1].tcg-Number(rotated[0].tcg),2);
 assert.deepEqual(group,original);
 for(let i=0;i<3;i++)rotated=rotateCargoPreview(rotated);
 assert.deepEqual(rotated,original);
});
test('rotation rejects collisions and boundaries without changing the original cargo',()=>{
 const long={...box('long',3),footprint:{...box('long',3).footprint,length:4}};
 const obstacle={...box('obstacle',3),tcg:'3.5'};
 const before=structuredClone(long);
 assert.throws(()=>rotateCargoGroup([long],[area],[long,obstacle]));
 const edge={...long,tcg:'0.6'};
 assert.throws(()=>rotateCargoGroup([edge],[area],[edge]));
 assert.deepEqual(long,before);
});
test('rotating a support requires selecting the cargo above it',()=>{
 const base=box('base',3),top=box('top',3,1);
 assert.throws(()=>rotateCargoGroup([base],[area],[base,top]),/supported cargo/);
 const turned=rotateCargoGroup([base,top],[area],[base,top]);
 assert.deepEqual(turned.map(w=>w.footprint.bottomZ),[0,1]);
});
