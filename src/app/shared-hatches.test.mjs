import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {cargoSurfaces,cargoOnSurface}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
const {placeSupportedCargo}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const {parseArea,layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {supportingHatchPanels}=await server.ssrLoadModule('/src/app/hatch-contacts.ts');
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
const area=cargoSurfaces({manifest}).find(a=>a.id==='hatch-tops');
const box=(id,x,z=12.53,length=8)=>({id,name:id,hold:'Hatch tops',massTonnes:'5',lcg:String(x),tcg:'0',vcg:String(z+.5),footprint:{length,width:2,height:1,rotation:0,deckZ:12.53,bottomZ:z,areaId:area.id}});
test('panel seams permit continuous floor loading, counted as a single item',()=>{
 const w=placeSupportedCargo(box('long',45),[area],[],{x:45,y:0,z:12.53},false,false);
 assert.equal(w.massTonnes,'5');assert.ok(supportingHatchPanels(w,[w],area).length>=2);assert.equal(layoutIssues([w],area).length,0);
 assert.deepEqual(parseArea(JSON.parse(JSON.stringify(area))),area);
});
test('the gap rejects direct floor placement, but explicit bearers can support a spanning unit',()=>{
 const w=box('bridge',81.5);assert.throws(()=>placeSupportedCargo(w,[area],[],{x:81.5,y:0,z:12.53},false,false),/gap/);
 const supports=[79.7,83.3].map((x,i)=>{const b=box('bearer'+i,x,12.53,1);b.footprint.kind='dunnage';b.footprint.height=.5;return b;});
 const placed=placeSupportedCargo(w,[area],supports,{x:81.5,y:0,z:13.03},true,false);
 assert.equal(placed.footprint.bottomZ,13.03);assert.equal(placed.massTonnes,'5');assert.ok(Math.abs(Number(placed.vcg)-13.53)<1e-8);
 const contacts=supportingHatchPanels(placed,[...supports,placed],area);assert.ok(contacts.some(id=>id.startsWith('hatch-1-')));assert.ok(contacts.some(id=>id.startsWith('hatch-2-')));
 assert.throws(()=>placeSupportedCargo(w,[area],supports.slice(0,1),{x:81.5,y:0,z:13.03},true,false),/supported/);
});
test('legacy hatch IDs remain visible and can support newly placed cargo',()=>{
 const old={...box('old',90,12.53,10),footprint:{...box('old',90,12.53,10).footprint,areaId:'hatch-1'}};
 assert.equal(cargoOnSurface(old,area),true);assert.doesNotThrow(()=>placeSupportedCargo(box('new',90),[area],[old],{x:90,y:0,z:13.53},true,false));
});
test('paste validates floor gaps and preserves complete supported geometry',()=>{
 const source=box('source',45);let id=0;const copies=pasteCargoGroup([source],area,[source],()=>`copy-${id++}`,true);assert.equal(layoutIssues(copies,area).length,0);
 const gapOnly={...area,xMin:80.9,xMax:82.1,regions:undefined,supportRegions:[]};assert.throws(()=>pasteCargoGroup([box('small',81.5,12.53,1)],gapOnly,[],()=>`copy-${id++}`,false),/No free/);
});
