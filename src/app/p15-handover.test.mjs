import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseVoyageBackup,decodeVoyageBackup,importVoyageBackup}=await server.ssrLoadModule('/src/app/voyage-backup.ts');
const {printableAssessment}=await server.ssrLoadModule('/src/app/print-assessment.ts');
const condition=id=>({version:1,id,name:id,model:'test',savedAt:'2026-10-14T00:00:00Z',state:{scenario:'loading',manualMode:'displacement',manual:{},weights:[],density:1.025}});
const backup=()=>({format:'umc-voyage-inputs',version:1,model:'test',exportedAt:'2026-10-14T00:00:00Z',conditions:[condition('a'),{...condition('b'),voyageStage:{name:'Trip',phase:'arrival',parentId:'a',note:'Consume'}}]});
test('voyage roundtrip restores branch links, rejects future versions, wrong model and broken lineage',()=>{
 const b=backup();assert.equal(decodeVoyageBackup(JSON.stringify(b),'test').conditions[1].voyageStage.parentId,'a');
 for(const raw of [{...b,version:2},{...b,model:'wrong'},{...b,conditions:[b.conditions[1]]},{...b,conditions:[b.conditions[0],b.conditions[0]]}])assert.throws(()=>parseVoyageBackup(raw,'test'));
 b.conditions[0].voyageStage={name:'Trip',phase:'departure',parentId:'b',note:''};assert.throws(()=>parseVoyageBackup(b,'test'),/cycle/);
 assert.throws(()=>decodeVoyageBackup('{','test'));
});
test('clean-profile import is a single atomic append and remaps parents without overwriting existing IDs',()=>{
 let json=JSON.stringify([condition('a'),{damaged:true}]),writes=0;const storage={getItem:()=>json,setItem:(_,v)=>{writes++;json=v;}};
 const result=importVoyageBackup(storage,'key','test',backup());assert.equal(writes,1);assert.equal(result.damaged,1);assert.equal(result.items.length,3);assert.equal(result.items[0].id,'a');assert.notEqual(result.items[1].id,'a');assert.equal(result.items[2].voyageStage.parentId,result.items[1].id);
 json=null;const clean=importVoyageBackup({getItem:()=>json,setItem:(_,v)=>{json=v;}},'key','test',backup());assert.equal(clean.items.length,2);
});
test('invalid backup, quota denial and corrupt destination do not partially import',()=>{
 let json=JSON.stringify([condition('old')]);const previous=json;let writes=0;
 const storage={getItem:()=>json,setItem(){writes++;throw new Error('QuotaExceededError')}};
 assert.throws(()=>importVoyageBackup(storage,'key','test',backup()),/Quota/);assert.equal(json,previous);assert.equal(writes,1);
 assert.throws(()=>importVoyageBackup(storage,'key','test',{...backup(),version:99}));assert.equal(writes,1);
 assert.throws(()=>importVoyageBackup({...storage,getItem:()=>'{not valid'},'key','test',backup()));assert.equal(writes,1);
});
test('printable report escapes all imported names and includes inputs, geometry, results and source provenance',()=>{
 const html=printableAssessment({manifest:{name:'<script>alert(1)</script>',schemaVersion:'1.0.0'},generatedAt:'now',state:{weights:[{id:'a',name:'<img src=x onerror=alert(1)>',massTonnes:'2',footprint:{height:3}}],capacity:{method:'package'}},conditionInputs:{waterDensity:1.025},sections:{weather:{status:'Insufficient data'},curve:{points:[{angle:10,gz:.5}]}},unresolved:['Not approval'],scope:'Snapshot'});
 assert.ok(!html.includes('<script'));assert.ok(!html.includes('<img'));assert.match(html,/&lt;script&gt;/);for(const text of ['Insufficient data','Water density (t/m³)','Height','Schema Version','Not approval','@media print'])assert.ok(html.includes(text),text);
});
