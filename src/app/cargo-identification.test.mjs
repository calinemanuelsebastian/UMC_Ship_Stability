import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {emptyMarkings,parseCargoMarkings,validSSCC,validContainer,cloneMarkings,validateUniqueIdentifiers,markingLines}=await server.ssrLoadModule('/src/app/cargo-identification.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const {parseScenario}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const mark=()=>({...emptyMarkings(),scheme:'iso6346',container:'CSQU3054383',sscc:'195201234567891232',port:'Port 1',color:'#00aa44',company:'Maria Shipping',hazard:'1.1D',unNumber:'0082',pattern:'stripes'});
const fp=()=>({length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,areaId:'hold',markings:mark()});
test('validates GS1 and BIC check digits and scheme applicability',()=>{
 assert.equal(validSSCC('195201234567891232'),true);assert.equal(validSSCC('195201234567891233'),false);assert.equal(validSSCC('(00)195201234567891232'),false);
 assert.equal(validContainer('CSQU3054383'),true);assert.equal(validContainer('CSQU3054384'),false);assert.equal(validContainer('CSQJ3054383'),false);
 assert.throws(()=>parseCargoMarkings({...emptyMarkings(),scheme:'sscc'}));
});
test('schemes coexist and display switches without losing identifiers',()=>{
 const m=parseCargoMarkings(mark());const w={id:'unit-1',name:'Cargo',footprint:{markings:m}};
 assert.ok(markingLines(w).some(v=>v.includes('CSQU3054383')));
 const changed=parseCargoMarkings({...m,scheme:'sscc'});assert.equal(changed.container,m.container);assert.ok(markingLines({...w,footprint:{markings:changed}}).some(v=>v.includes('(00)')));
 const hidden={...m,layers:{...m.layers,dangerous:false}};assert.ok(!markingLines({...w,footprint:{markings:hidden}}).some(v=>v.startsWith('DG ')));assert.equal(hidden.unNumber,'0082');
});
test('import validates metadata and rejects unsafe image sources and duplicate IDs',()=>{
 assert.deepEqual(parseFootprint(fp()).markings,parseCargoMarkings(mark()));
 for(const image of ['https://example.org/logo.svg','data:image/svg+xml,<svg/>','javascript:alert(1)'])assert.throws(()=>parseCargoMarkings({...mark(),image}));
 assert.throws(()=>validateUniqueIdentifiers([{footprint:fp()},{footprint:fp()}]));assert.throws(()=>parseCargoMarkings({...mark(),hazard:'10'}));
});
test('copies preserve layers but never copy external identifiers',()=>{
 const area={id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8};const w={id:'old',name:'Cargo',massTonnes:'1',lcg:'2',tcg:'2',vcg:'.5',footprint:fp()};
 const copies=pasteCargoGroup([w],area,[w],()=> 'new',false,0,{x:5,y:5});
 assert.equal(copies[0].footprint.markings.scheme,'internal');assert.equal(copies[0].footprint.markings.container,undefined);assert.equal(copies[0].footprint.markings.port,'Port 1');assert.equal(w.footprint.markings.container,'CSQU3054383');
 assert.equal(cloneMarkings(mark()).sscc,undefined);
});
test('saved condition round trip retains markings and rejects repeated external identifiers',()=>{
 const w={id:'a',name:'Cargo',massTonnes:'1',lcg:'2',tcg:'2',vcg:'.5',freeSurfaceMomentTransverse:'0',footprint:fp()};const f={version:1,id:'test',name:'Marked cargo',model:'pontoon',savedAt:'2026-10-01T00:00:00Z',state:{scenario:'loading',manualMode:'draft',draft:3,density:1.025,longitudinalFsm:0,manual:{vcg:5,lcg:50,tcg:0},weights:[w]}};
 const parsed=parseScenario(JSON.parse(JSON.stringify(f)),'pontoon');assert.equal(parsed.state.weights[0].footprint.markings.container,'CSQU3054383');
 f.state.weights.push({...w,id:'b'});assert.throws(()=>parseScenario(f,'pontoon'),/unique/);
});
