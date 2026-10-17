import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {cargoFamilies,cargoTypeInfo,cargoSizePresets,cargoVariants}=await server.ssrLoadModule('/src/app/cargo-types.ts');
const {defaultCargoShape}=await server.ssrLoadModule('/src/app/cargo-shape.ts');
const {parseCargoTemplate}=await server.ssrLoadModule('/src/app/cargo-templates.ts');
const {parseCapacitySettings,capacityCargoTemplate,defaultCapacitySettings}=await server.ssrLoadModule('/src/app/cargo-capacity.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:50,yMin:-10,yMax:10,deckZ:0,clearHeight:10};
test('each cargo type has source guidance and compatible default variant',()=>{
 for(const [id] of cargoFamilies){assert.ok(cargoTypeInfo[id].reference);assert.ok(cargoVariants(id).some(v=>v[0]===defaultCargoShape(id)));}
 assert.equal(defaultCargoShape('bale'),'box');assert.equal(defaultCargoShape('bulk-bag'),'cylinder-z');assert.equal(defaultCargoShape('bag'),'ellipsoid');assert.equal(defaultCargoShape('pipe'),'cylinder-x');assert.equal(defaultCargoShape('bundle'),'box');
});
test('old ambiguous families retain saved geometry, rather than silently changing units',()=>{
 for(const family of ['bale','pipe','boxed','reel']){const value=parseCargoTemplate({id:'old',name:'Old cargo',family,footprint:{length:1,width:1,height:1,rotation:0,deckZ:0},mass:{mode:'gross',value:1,tare:0},contact:'',source:''});assert.equal(value.footprint.shape,undefined);}
});
test('all variants survive capacity persistence and handoff with mass unchanged',()=>{
 for(const [family] of cargoFamilies)for(const [cargoShape] of cargoVariants(family)){
 const s=parseCapacitySettings(JSON.parse(JSON.stringify({...defaultCapacitySettings,cargoFamily:family,cargoShape,unitMass:1,length:2,width:1,height:1,areaId:'hold'})));
 const result=capacityCargoTemplate(s,[area]);assert.equal(result.definition.family,family);assert.equal(result.definition.footprint.shape,cargoShape);assert.equal(result.mass,1);
 }
 assert.throws(()=>parseCapacitySettings({...defaultCapacitySettings,cargoShape:'bad'}));
});
test('EUR 1, 2, 3, 6 and EPAL 7 plus CP1–9 are dimension presets, not loaded-height guesses',()=>{
 for(const id of ['eur1','eur2','eur3','eur6','epal7',...Array.from({length:9},(_,i)=>`cp${i+1}`)]){const p=cargoSizePresets.find(p=>p.id===id);assert.ok(p);assert.equal(p.height,undefined);assert.ok(p.source.startsWith('https://'));}
 assert.equal(cargoSizePresets.find(p=>p.id==='eur3').length,1);assert.equal(cargoSizePresets.find(p=>p.id==='eur6').width,.6);
});
test('preset reference accompanies handoff and dimensions remain editable',()=>{
 const s=parseCapacitySettings({...defaultCapacitySettings,cargoFamily:'pallet',cargoPresetId:'eur6',unitMass:.7,length:.81,width:.6,height:1.8,areaId:'hold'});
 const r=capacityCargoTemplate(s,[area]);assert.equal(r.height,1.8);assert.equal(r.length,.81);assert.equal(r.mass,.7);assert.match(r.definition.source,/EUR 6/);
});
