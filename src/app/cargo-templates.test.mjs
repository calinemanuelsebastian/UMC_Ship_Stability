import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const c=await server.ssrLoadModule('/src/app/cargo-templates.ts');
const {decodeSupportTemplates,encodeSupportTemplates,parseSupportTemplate}=await server.ssrLoadModule('/src/app/support-templates.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {editCargoBatch,sameCargoType}=await server.ssrLoadModule('/src/app/cargo-batch-edit.ts');
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const {permitsAutoDunnage}=await server.ssrLoadModule('/src/app/boundary-dunnage.ts');
const {parseMaterialProperties}=await server.ssrLoadModule('/src/app/material-properties.ts');
const {createDunnage}=await server.ssrLoadModule('/src/app/dunnage.ts');
const {dunnageMaterials,dunnageMassTonnes}=await server.ssrLoadModule('/src/app/dunnage-materials.ts');
const fp={length:2,width:1,height:1,rotation:0,deckZ:0,areaId:'hold',stackability:'stackable'};
const raw=()=>({id:'template',name:'Cases',family:'boxed',footprint:fp,mass:{mode:'gross',value:1,tare:0},quantity:100,contact:'Full base',source:'Packing list'});
const box=(id,x,rotation=0)=>({id,name:'Cases',category:'cargo',quantity:'1',massTonnes:'1',lcg:String(x),tcg:'5',vcg:'.3',freeSurfaceMomentTransverse:'0',footprint:{...fp,rotation}});
const area={id:'hold',name:'Hold',xMin:0,xMax:30,yMin:0,yMax:10,deckZ:0,clearHeight:5};
test('gross and net/tare are mutually exclusive and quantity adds no mass',()=>{
 assert.equal(c.grossTemplateMass(c.parseCargoTemplate(raw()).mass),1);
 assert.equal(c.grossTemplateMass({mode:'net-plus-tare',value:.95,tare:.05}),1);
 assert.throws(()=>c.grossTemplateMass({mode:'gross',value:1,tare:.05}));
 for(const value of [0,-1,NaN,Infinity])assert.throws(()=>c.grossTemplateMass({mode:'gross',value,tare:0}));
});
test('templates normalize location and strip unique identity without losing markings',()=>{
 const markings={scheme:'internal',sscc:'000000000000000000',color:'#123456',port:'Port 1',layers:{identity:true,destination:true,company:true,handling:true,dangerous:true}};
 const result=c.parseCargoTemplate({...raw(),footprint:{...fp,deckZ:10,bottomZ:12,markings},cgAboveBase:.3});
 assert.equal(result.footprint.deckZ,0);assert.equal(result.footprint.areaId,undefined);assert.equal(result.footprint.markings.sscc,undefined);assert.equal(result.footprint.markings.port,'Port 1');assert.equal(result.cgAboveBase,.3);
});
test('invalid geometry, quantity, CG, family and undocumented top loads fail atomically',()=>{
 for(const patch of [{quantity:0},{quantity:1.5},{quantity:40001},{cgAboveBase:2},{family:'unknown'},{footprint:{...fp,width:0}},{source:'',footprint:{...fp,maxTopLoadTonnes:2}}])assert.throws(()=>c.parseCargoTemplate({...raw(),...patch}));
});
test('versioned libraries round-trip; unsafe versions, duplicates and oversized inputs reject',()=>{
 const library={...c.emptyCargoLibrary(),templates:[raw()]};const result=c.decodeCargoLibrary(JSON.stringify(library));assert.deepEqual(c.decodeCargoLibrary(JSON.stringify(result)),result);
 assert.throws(()=>c.parseCargoLibrary({...library,version:2}));assert.throws(()=>c.parseCargoLibrary({...library,templates:[raw(),raw()]}));assert.throws(()=>c.decodeCargoLibrary(' '.repeat(5_000_001)));assert.throws(()=>c.decodeCargoLibrary('{'));
});
test('library imports append independent copies; quota errors propagate without success',()=>{
 const a={...c.emptyCargoLibrary(),templates:[raw()]},b=c.mergeCargoLibrary(a,a);assert.equal(b.templates.length,2);assert.notEqual(b.templates[0].id,b.templates[1].id);
 assert.throws(()=>c.saveCargoLibrary({setItem(){throw new Error('quota');}},a),/quota/);
 let saved;c.saveCargoLibrary({setItem(_key,value){saved=value;}},a);assert.equal(c.decodeCargoLibrary(saved).templates.length,1);
});
test('mixed-orientation batch edits preserve identity and unedited overrides',()=>{
 const a=box('a',3),b={...box('b',8,90),massTonnes:'2'};assert.ok(sameCargoType(a,b));
 const edited=editCargoBatch([a,b],['a','b'],{name:'Revised'},[area]);assert.equal(edited[1].massTonnes,'2');assert.equal(edited[1].footprint.rotation,90);assert.deepEqual(edited.map(w=>w.id),['a','b']);
 const single=editCargoBatch(edited,['a'],{massTonnes:3},[area]);assert.equal(single[1].massTonnes,'2');
});
test('assemblies preserve relative layout and CG while placement generates unique IDs',()=>{
 const assembly=c.parseCargoAssembly({id:'group',name:'Two cases',items:[box('a',3),box('b',6,90)]});let n=0;
 const placed=pasteCargoGroup(assembly.items,area,[],()=>`new-${++n}`,false,.1,{x:15,y:5});assert.equal(placed.length,2);assert.deepEqual(placed.map(w=>w.id),['new-1','new-2']);assert.equal(+placed[1].lcg-+placed[0].lcg,3);assert.equal(+placed[0].vcg,.3);assert.equal(placed[1].footprint.rotation,90);
 assert.throws(()=>c.parseCargoAssembly({...assembly,items:[box('a',3),box('a',6)]}));assert.throws(()=>c.parseCargoAssembly({...assembly,items:[{...box('a',3),tank:{id:'tank'}}]}));
});
test('specialist envelopes retain explicit family and contact qualifications through save',()=>{
 for(const family of ['drum','reel','coil','pipe','container']){const value=parseFootprint({...fp,catalogue:{family,contact:'Envelope only; actual supports require review',source:'Declared'}});assert.equal(parseFootprint(JSON.parse(JSON.stringify(value))).catalogue.family,family);assert.equal(permitsAutoDunnage({...box('special',3),footprint:{...value,dunnageProfile:'boxed'}}),false);}
 assert.throws(()=>parseFootprint({...fp,catalogue:{family:'bogus',contact:'',source:''}}));
});
test('declared material values need units, source and conditions and survive support reuse',()=>{
 assert.throws(()=>parseMaterialProperties({source:'',applicability:'',contact:'',capacityKN:20}));
 assert.throws(()=>parseMaterialProperties({source:'Certificate',applicability:'Dry contact',contact:'',frictionCoefficient:-1}));
 const properties={source:'Product certificate',applicability:'Dry, along grain, stated bearing area',contact:'Full face',capacityKN:20,frictionCoefficient:.3};
 const d=createDunnage({id:'support',area,areas:[area],weights:[],length:2,width:.1,thickness:.05,mass:dunnageMassTonnes(2,.1,.05,470),material:'Pine',densityKgM3:470,massMode:'calculated',properties});
 const assembly=c.parseCargoAssembly({id:'s',name:'Bearer',items:[d]});assert.deepEqual(assembly.items[0].footprint.dunnage.properties,properties);assert.ok(Math.abs(+d.massTonnes-.0047)<1e-12);
});
test('unsupported material models cannot enter the automatic catalogue',()=>{
 const automatic=dunnageMaterials.filter(p=>p.id!=='custom'&&!p.manualOnly);assert.ok(automatic.every(p=>p.density>0&&!p.unsupported));for(const id of ['steel','aluminium','rated-bag','chock'])assert.ok(!automatic.some(p=>p.id===id));
});

test('material pattern library preserves density, repeated-piece mass, source and manual overrides',()=>{
 const settings={length:2,width:.1,thickness:.05,densityKgM3:470,material:'Pine timber',count:3,gap:.5,direction:'y',massMode:'calculated',mass:.0141,properties:{source:'Supplier',applicability:'Dry',contact:'Full face',frictionCoefficient:.3}};
 const saved=parseSupportTemplate({name:'Three bearers',settings});assert.deepEqual(decodeSupportTemplates(encodeSupportTemplates([saved])),[saved]);
 assert.throws(()=>parseSupportTemplate({name:'Invalid',settings:{...settings,mass:1}}),/mass/);
 assert.equal(parseSupportTemplate({name:'Weighed',settings:{...settings,massMode:'manual',mass:.02}}).settings.mass,.02);
 assert.throws(()=>decodeSupportTemplates(JSON.stringify({format:'umc-support-templates',version:2,templates:[]})));
 for(const patch of [{width:0},{densityKgM3:0},{count:101},{gap:-1},{mass:NaN}])assert.throws(()=>parseSupportTemplate({name:'Invalid',settings:{...settings,...patch}}));
});

test('shared height edits retain declared vertical CG and reject enclosing a smaller height',()=>{
 const w={...box('known',3),footprint:{...fp,catalogue:{family:'boxed',source:'Packing list',contact:'Full face',cgDeclared:true}}};
 assert.equal(editCargoBatch([w],['known'],{height:2},[area])[0].vcg,'0.3');
 assert.throws(()=>editCargoBatch([w],['known'],{height:.2},[area]),/declared cargo CG/);
});

test('reused support assemblies and cargo metadata survive a complete cargo-plan export/import',()=>{
 const support={...box('support',3),footprint:{...fp,kind:'dunnage',dunnage:{material:'Timber',densityKgM3:470,massMode:'manual',properties:{source:'Supplier',applicability:'Dry',contact:'Full face',capacityKN:20}}}};
 const assembly=c.parseCargoAssembly({id:'a',name:'Support',items:[support]});
 const cargo={...box('cargo',8),footprint:{...fp,catalogue:{family:'boxed',source:'Packing list',contact:'Full base',cgDeclared:true}}};
 const plan={kind:'cargo-plan',version:1,id:'p',name:'Template round trip',voyage:'',model:'test-vessel',savedAt:new Date().toISOString(),state:{scenario:'loading',manual:{},manualMode:'displacement',density:1.025,longitudinalFsm:0,weights:[...assembly.items,cargo]}};
 const restored=parseCargoPlan(JSON.parse(JSON.stringify(plan)),'test-vessel',[]);
 assert.deepEqual(restored.state.weights[0].footprint.dunnage.properties,support.footprint.dunnage.properties);assert.deepEqual(restored.state.weights[1].footprint.catalogue,cargo.footprint.catalogue);
});

test('planned quantity is optional and survives library roundtrip without inventing a target',()=>{
 const value=raw();delete value.quantity;
 const template=c.parseCargoTemplate(value);
 assert.equal(template.quantity,undefined);
 const library=c.decodeCargoLibrary(JSON.stringify({...c.emptyCargoLibrary(),templates:[template]}));
 assert.equal(library.templates[0].quantity,undefined);
 assert.equal(c.grossTemplateMass(template.mass),1);
 for(const quantity of [0,-1,1.5,40001])assert.throws(()=>c.parseCargoTemplate({...value,quantity}));
});
