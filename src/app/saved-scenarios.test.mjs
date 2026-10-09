import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseScenario,readLibrary}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const fixture=()=>({version:1,id:'test',name:'Cargo test',model:'pontoon',savedAt:'2026-09-10T00:00:00Z',state:{scenario:'loading',manualMode:'draft',draft:3,density:1.025,longitudinalFsm:0,manual:{vcg:5,lcg:50,tcg:0},weights:[{id:'cargo',name:'Cargo',massTonnes:'6150',lcg:'50',vcg:'5',tcg:'0',freeSurfaceMomentTransverse:'0'}]}});
test('JSON round trip retains source coordinates, manual inputs and incomplete drafts',()=>{
 const f=fixture();f.state.weights[0].lcg='';delete f.state.draft;
 assert.deepEqual(JSON.parse(JSON.stringify(parseScenario(JSON.parse(JSON.stringify(f)),'pontoon'))),f);
});
test('incompatible models, versions and malformed input are rejected',()=>{
 for(const mutate of [f=>f.model='other',f=>f.version=2,f=>f.state.density=null,f=>f.state.manual.vcg='5',f=>f.state.weights.push({...f.state.weights[0]}),f=>f.state.weights[0].lcg='Infinity',f=>f.state.scenario='bad']){
  const f=fixture();mutate(f);assert.throws(()=>parseScenario(f,'pontoon'));
 }
});
test('import discards results and unrelated content',()=>{
 const f=fixture();f.state.results={draft:999};f.injected='ignore';
 const parsed=parseScenario(f,'pontoon');assert.equal(parsed.injected,undefined);assert.equal(parsed.state.results,undefined);
});
test('library survives serialization and reports storage corruption and access failures',()=>{
 const raw=JSON.stringify([fixture()]);assert.equal(readLibrary({getItem:()=>raw},'key','pontoon')[0].name,'Cargo test');
 assert.deepEqual(readLibrary({getItem:()=>null},'key','pontoon'),[]);
 assert.throws(()=>readLibrary({getItem:()=>'{broken'},'key','pontoon'));
 assert.throws(()=>readLibrary({getItem:()=>{throw new Error('denied');}},'key','pontoon'));
});
