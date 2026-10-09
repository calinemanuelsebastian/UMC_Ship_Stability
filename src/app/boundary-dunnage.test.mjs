import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {boundaryDunnageFits,permitsAutoDunnage}=await server.ssrLoadModule('/src/app/boundary-dunnage.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:0,clearHeight:8};
const cargo=(x,y)=>({id:'a',name:'Cargo',massTonnes:'1',lcg:String(x),tcg:String(y),vcg:'.5',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,areaId:'hold',dunnageProfile:'boxed'}});
test('boundary spacers fill only facing gaps within the configured distance',()=>{
 const fits=boundaryDunnageFits(cargo(.6,.6),area,.2);assert.equal(fits.length,2);
 assert.ok(fits.every(f=>Math.abs(f.length*f.width-.1)<1e-8));
 assert.equal(boundaryDunnageFits(cargo(5,5),area,.2).length,0);
 assert.equal(boundaryDunnageFits(cargo(.5,.5),area,.2).length,0);
 assert.throws(()=>boundaryDunnageFits(cargo(1,1),area,NaN));
});
test('region seams are not mistaken for hull walls',()=>{
 const stepped={...area,regions:[{xMin:0,xMax:5,yMin:0,yMax:10},{xMin:5,xMax:10,yMin:2,yMax:8}]};
 assert.equal(boundaryDunnageFits(cargo(4.4,5),stepped,.2).length,0);
 const f=boundaryDunnageFits(cargo(4.4,1),stepped,.2);assert.equal(f.length,1);assert.ok(Math.abs(f[0].x-4.95)<1e-8);
});
test('all four exposed sides work and hatch edges are never treated as walls',()=>{
 assert.equal(boundaryDunnageFits(cargo(9.4,9.4),area,.2).length,2);
 assert.equal(boundaryDunnageFits(cargo(.6,.6),{...area,id:'hatch-1'},.2).length,0);
 assert.equal(boundaryDunnageFits(cargo(.6,.6),{...area,supportRegions:[]},.2).length,0);
 const raised=cargo(.6,.6);raised.footprint.bottomZ=2;assert.equal(boundaryDunnageFits(raised,area,.2).length,0);
});
test('automatic filling defaults to general cargo and preserves explicit restrictions',()=>{
 const c=cargo(1,1);assert.equal(permitsAutoDunnage(c),true);
 for(const dunnageProfile of [undefined,'unspecified','boxed'])assert.equal(permitsAutoDunnage({...c,footprint:{...c.footprint,dunnageProfile}}),true);
 for(const dunnageProfile of ['ventilated','drums','rolls','dangerous'])assert.equal(permitsAutoDunnage({...c,footprint:{...c.footprint,dunnageProfile}}),false);
 for(const markings of [{hazard:'3'},{unNumber:'1203'}])assert.equal(permitsAutoDunnage({...c,footprint:{...c.footprint,markings}}),false);
});
test('cargo profiles survive serialization and invalid profiles are rejected',()=>{
 const fp=cargo(1,1).footprint;assert.equal(parseFootprint(JSON.parse(JSON.stringify(fp))).dunnageProfile,'boxed');
 assert.throws(()=>parseFootprint({...fp,dunnageProfile:'invented'}));
});
