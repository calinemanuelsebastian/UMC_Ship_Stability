import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {intersectsCargo,hasGeometricSupport}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const {parseFootprint,layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {projectionEllipse,flatContactPolygon,polygonArea,worldShape}=await server.ssrLoadModule('/src/app/cargo-shape.ts');
const {permitsAutoDunnage}=await server.ssrLoadModule('/src/app/boundary-dunnage.ts');
const box=(id,x=0,y=0,z=0,shape='box')=>({id,name:id,lcg:String(x),tcg:String(y),vcg:String(z+1),massTonnes:'1',footprint:{length:2,width:2,height:2,rotation:0,deckZ:0,bottomZ:z,shape,catalogue:{family:'boxed',contact:'Flat contact',source:'Test fixture',cgDeclared:false},stackability:'stackable',maxTopLoadTonnes:10}});
test('upright cylinders use circular collision geometry and allow tangency',()=>{
 const a=box('a',0,0,0,'cylinder-z');
 for(const [x,y,expected] of [[1.5,1.5,false],[1.3,1.3,true],[2,0,false],[1.999,0,true],[0,0,true],[0,0,false]]){const b=box('b',x,y,expected===false&&x===0?2:0,'cylinder-z');assert.equal(intersectsCargo(a,b),expected);assert.equal(intersectsCargo(b,a),expected);}
 assert.equal(intersectsCargo(a,box('corner',1.9,1.9,0)),false); // box spans inward to .9,.9: separated from radius 1
});
test('sphere collisions agree with distance over a deterministic grid',()=>{
 const a=box('a',0,0,0,'ellipsoid');
 for(let i=0;i<100;i++){const x=(i*37%101)/30-1.6,y=(i*53%97)/30-1.6,z=(i*17%89)/30-1.4;const b=box('b',x,y,z,'ellipsoid');assert.equal(intersectsCargo(a,b),Math.hypot(x,y,z)<2-1e-8,`offset ${x},${y},${z}`);}
});
test('box corners are empty outside a cylinder, and all views project its axis',()=>{
 const a=box('a',0,0,0,'cylinder-z'),small=box('b',.9,.9);small.footprint.length=.1;small.footprint.width=.1;
 assert.equal(intersectsCargo(a,small),false);
 assert.equal(projectionEllipse(a.footprint,'top'),true);assert.equal(projectionEllipse(a.footprint,'side'),false);
 const roll={...a.footprint,shape:'cylinder-x',rotation:90};assert.equal(worldShape(roll),'cylinder-y');assert.equal(projectionEllipse(roll,'side'),true);assert.equal(projectionEllipse(roll,'end'),false);
 assert.equal(parseFootprint(JSON.parse(JSON.stringify(roll))).shape,'cylinder-x');assert.throws(()=>parseFootprint({...roll,shape:'unknown'}));
});
test('support patches reject curved crowns and rectangular corners outside round caps',()=>{
 const drum=box('drum',0,0,0,'cylinder-z');
 assert.ok(Math.abs(polygonArea(flatContactPolygon(drum))-Math.PI)<.006);
 assert.equal(hasGeometricSupport(box('above',0,0,2),[drum]),false);
 const small=box('small',0,0,2);small.footprint.length=1;small.footprint.width=1;assert.equal(hasGeometricSupport(small,[drum]),true);
 assert.equal(hasGeometricSupport(box('above',0,0,2),[box('roll',0,0,0,'cylinder-x')]),false);
 assert.equal(hasGeometricSupport(box('drum',0,0,2,'cylinder-z'),[box('platform')]),true);
 assert.equal(permitsAutoDunnage({...drum,footprint:{...drum.footprint,dunnageProfile:'boxed'}}),false);
 const area={name:'Test',xMin:-5,xMax:5,yMin:-5,yMax:5,deckZ:0};assert.equal(layoutIssues([drum,box('b',1.5,1.5,0,'cylinder-z')],area).filter(x=>x.kind==='overlap').length,0);
});

test('shape edits cannot create collisions and persist through templates and rotations',async()=>{
 const {editCargoBatch}=await server.ssrLoadModule('/src/app/cargo-batch-edit.ts');
 const {rotateCargoPreview}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
 const {cargoTemplateFromWeight}=await server.ssrLoadModule('/src/app/cargo-templates.ts');
 const a=box('a',0,0,0,'cylinder-z'),b=box('b',1.5,1.5,0,'cylinder-z'),area={name:'Test',xMin:-5,xMax:5,yMin:-5,yMax:5,deckZ:0};
 assert.throws(()=>editCargoBatch([a,b],['a','b'],{shape:'box'},[area]),/intersect/);
 assert.equal(cargoTemplateFromWeight(a).footprint.shape,'cylinder-z');
 assert.equal(rotateCargoPreview([box('roll',0,0,0,'cylinder-x')])[0].footprint.shape,'cylinder-x');
 assert.equal(worldShape(rotateCargoPreview([box('roll',0,0,0,'cylinder-x')])[0].footprint),'cylinder-y');
});

test('load assessment uses round cap area and leaves curved bearing pressure unresolved',async()=>{
 const {cargoLoadChecks}=await server.ssrLoadModule('/src/app/cargo-load-checks.ts');
 const area={name:'Test',xMin:-5,xMax:5,yMin:-5,yMax:5,deckZ:0};
 const a=cargoLoadChecks([box('drum',0,0,0,'cylinder-z')],[area]).surfaces[0];assert.ok(a.contacts[0].footprintM2<Math.PI);assert.ok(a.contacts[0].pressure>1/Math.PI);
 const b=cargoLoadChecks([box('roll',0,0,0,'cylinder-x')],[area]).surfaces[0];assert.equal(b.contacts[0].pressure,undefined);assert.equal(b.status,'Incomplete load assessment');
});
