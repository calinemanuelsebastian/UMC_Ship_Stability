import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {placeWithCargoSnap}=await server.ssrLoadModule('/src/app/cargo-snapping.ts');const {dunnageGap}=await server.ssrLoadModule('/src/app/dunnage.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8};
const box=(id,x)=>({id,name:id,lcg:String(x),tcg:'2',vcg:'.5',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,areaId:'hold'}});
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
test('cargo gap overrides grid and dunnage is not a snap target',()=>{const a=box('a',2),b=box('b',5);const place=o=>placeWithCargoSnap([a],'a',[area],[a,o],{x:3.86,y:2,z:0},false,false,{gap:.1,range:.2})[0];assert.ok(Math.abs(+place(b).lcg-3.9)<1e-8);b.footprint.kind='dunnage';assert.equal(+place(b).lcg,3.86);});
test('existing dunnage blocks cargo snapping through it',()=>{const a=box('a',2),b=box('b',5),d=box('d',4);d.footprint.kind='dunnage';assert.throws(()=>placeWithCargoSnap([a],'a',[area],[a,b,d],{x:3.86,y:2,z:0},false,false,{gap:0,range:.2}));});
test('spacer dimensions follow the real gap and shared face',()=>{const a=box('a',2),b=box('b',3.2);const g=dunnageGap(a,b);assert.ok(Math.abs(g.length-.2)<1e-8);assert.equal(g.width,1);assert.equal(g.y,2);assert.throws(()=>dunnageGap(a,box('touching',3)));});
test('paste preview and committed copy use identical magnetic coordinates',()=>{
 const source=box('source',2),target=box('target',5),settings={grid:.5,cargo:{gap:.1,range:.2}};
 const preview=pasteCargoGroup([source],area,[target],()=> 'preview',false,0,{x:3.86,y:2},settings);
 const placed=pasteCargoGroup([source],area,[target],()=> 'committed',false,0,{x:3.86,y:2},settings);
 assert.ok(Math.abs(+preview[0].lcg-3.9)<1e-8);assert.equal(preview[0].lcg,placed[0].lcg);assert.equal(preview[0].tcg,placed[0].tcg);
});
