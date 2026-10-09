import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {createDunnage}=await server.ssrLoadModule('/src/app/dunnage.ts');
const {stackCargoOn}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const area={id:'hold-1-lower',name:'Hold 1 Lower',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:1,clearHeight:5};
const cargo={id:'cargo',name:'Cargo',category:'cargo',massTonnes:'2',lcg:'3',tcg:'3',vcg:'1.6',freeSurfaceMomentTransverse:'0',footprint:{areaId:area.id,length:2,width:1,height:1,rotation:0,deckZ:1}};
const options={id:'d',area,areas:[area],weights:[cargo],support:cargo,length:2,width:1,thickness:.05,mass:.01};
test('dunnage uses its independent dimensions on a support, adds physical thickness and mass, and retains type when serialized',()=>{
 const d=createDunnage(options);assert.equal(d.footprint.length,2);assert.equal(d.footprint.width,1);assert.equal(d.footprint.bottomZ,2);assert.equal(d.massTonnes,'0.01');assert.ok(Math.abs(Number(d.vcg)-2.025)<1e-10);assert.equal(parseFootprint(JSON.parse(JSON.stringify(d.footprint))).kind,'dunnage');
 const above=stackCargoOn({...cargo,id:'upper'},d,[area],[cargo,d]);assert.equal(above.footprint.bottomZ,2.05);assert.ok(Math.abs(Number(above.vcg)-2.65)<1e-10);
});
test('floor layer uses chosen dimensions and invalid or intersecting dunnage is rejected',()=>{
 const d=createDunnage({...options,support:undefined,weights:[]});assert.equal(d.footprint.length,2);assert.equal(d.footprint.bottomZ,1);
 assert.throws(()=>createDunnage({...options,mass:0}),/mass/);assert.throws(()=>createDunnage({...options,thickness:0}),/dimensions/);
 assert.throws(()=>createDunnage({...options,weights:[cargo,createDunnage(options)],id:'other'}),/intersect/);
});

test('above placement never silently substitutes cargo dimensions',()=>{const d=createDunnage({...options,length:1,width:.2});assert.equal(d.footprint.length,1);assert.equal(d.footprint.width,.2);assert.throws(()=>createDunnage({...options,length:4}),/supported/);});
