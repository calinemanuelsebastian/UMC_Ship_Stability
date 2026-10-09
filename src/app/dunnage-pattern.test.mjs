import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {createDunnagePattern}=await server.ssrLoadModule('/src/app/dunnage.ts');
const {placeSupportedCargo,carriesCargo}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const area={id:'hold-1-lower',name:'Hold 1 Lower',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:1,clearHeight:5};
const settings={length:2,width:.1,thickness:.1,mass:.0282,material:'Pine timber',densityKgM3:470,massMode:'calculated',count:3,gap:.7,direction:'y'};
let id=0;const options={area,areas:[area],weights:[],settings,position:{x:5,y:5},id:()=>`d${id++}`};
const cargo={id:'c',name:'Cargo',massTonnes:'3',lcg:'5',tcg:'5',vcg:'1.5',footprint:{areaId:area.id,length:2,width:2,height:1,rotation:0,deckZ:1}};
test('bearer pattern has separate solid pieces, clear gaps, summed mass and round-trip geometry',()=>{
 const pieces=createDunnagePattern(options);assert.equal(pieces.length,3);assert.deepEqual(pieces.map(p=>Number(p.tcg)),[4.2,5,5.8]);assert.ok(Math.abs(pieces.reduce((s,p)=>s+Number(p.massTonnes),0)-.0282)<1e-12);
 for(const p of pieces){assert.deepEqual(parseFootprint(JSON.parse(JSON.stringify(p.footprint))),p.footprint);assert.ok(Math.abs(Number(p.vcg)-1.05)<1e-12);}
});
test('cargo bridges multiple dunnage contacts and guards every loaded bearer',()=>{
 const pieces=createDunnagePattern(options);const top=placeSupportedCargo(cargo,[area],pieces,{x:5,y:5,z:1.1},true,false);assert.equal(top.footprint.bottomZ,1.1);assert.equal(top.massTonnes,'3');assert.throws(()=>placeSupportedCargo({...pieces[0],footprint:{...pieces[0].footprint,width:.001}},[area],[...pieces,top],{x:8,y:8,z:1},true,false),/supported/);assert.ok(Math.abs(Number(top.vcg)-1.6)<1e-10);
 for(const p of pieces){assert.equal(carriesCargo(p,[...pieces,top]),true);assert.throws(()=>placeSupportedCargo(p,[area],[...pieces,top],{x:6,y:5,z:1},true,false),/supported/);}
 assert.throws(()=>placeSupportedCargo(cargo,[area],pieces,{x:5,y:6.4,z:1.1},true,false),/supported/);
 assert.throws(()=>placeSupportedCargo(cargo,[area],pieces.slice(1,2),{x:5,y:5,z:1.1},true,false),/supported/);
});
test('invalid patterns are rejected atomically, including partial collisions and boundaries',()=>{
 const existing=[{...cargo,lcg:'5',tcg:'5.8'}];const before=JSON.stringify(existing);
 assert.throws(()=>createDunnagePattern({...options,weights:existing}),/intersect/);assert.equal(JSON.stringify(existing),before);
 assert.throws(()=>createDunnagePattern({...options,position:{x:0,y:5}}),/outside/);
 for(const count of [0,101,1.2,NaN])assert.throws(()=>createDunnagePattern({...options,settings:{...settings,count}}));
 assert.throws(()=>createDunnagePattern({...options,settings:{...settings,gap:-1}}));
});
test('manual total is distributed once and pattern can sit above existing cargo',()=>{
 const pieces=createDunnagePattern({...options,settings:{...settings,massMode:'manual',mass:.3},support:cargo,weights:[cargo]});
 assert.ok(Math.abs(pieces.reduce((s,p)=>s+Number(p.massTonnes),0)-.3)<1e-12);assert.ok(pieces.every(p=>p.footprint.bottomZ===2));
});
