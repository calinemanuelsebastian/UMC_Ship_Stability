import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseStudyLibrary,studySample,studyGroups,loadStudyLibrary}=await server.ssrLoadModule('/src/visualization/documented-studies.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const raw=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/documented-studies.json','utf8'));
const audit=JSON.parse(await readFile('docs/audits/vectis-coupled-data-search/condition-trajectories.json','utf8'));
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));const ship={manifest,baseUrl:'/study/'};
test('77 unique cases retain all 1001 printed trajectory rows and source fingerprints',()=>{
 const v=parseStudyLibrary(raw,manifest.id);assert.equal(v.cases.length,77);assert.equal(v.cases.reduce((s,c)=>s+c.trajectory.length,0),1001);
 for(const c of v.cases){const source=audit.records.find(r=>r.file===c.source&&r.pdfPage===c.trajectoryPage);assert.deepEqual(c.trajectory,source.sourceTokens.map(r=>r.map(Number)));assert.equal(v.sources[c.source].sha256,source.sha256);}
});
test('all weight tables reconcile mass and physical centres within printed rounding',()=>{
 assert.equal(raw.cases.reduce((s,c)=>s+c.items.length,0),5847);
 for(const c of raw.cases){const mass=c.items.reduce((s,r)=>s+r.mass,0);assert.ok(Math.abs(mass-c.total.mass)<.08);for(const k of ['kg','lcg','tcg'])assert.ok(Math.abs(c.items.reduce((s,r)=>s+r.mass*r[k],0)/mass-c.total[k])<.003);assert.ok(Math.abs(studyGroups(c).reduce((s,g)=>s+g.mass,0)-mass)<1e-8);}
});
test('steel-coil playback preserves documented draft change and signed port paths',()=>{
 const c=raw.cases.find(c=>c.id==='004-269');assert.deepEqual(studySample(c,8),{heel:30,draft:7.528,trim:-.475,lever:c.trajectory[8][3],gz:c.trajectory[8][6],area:c.trajectory[8][7]});
 const p=raw.cases.find(c=>c.id==='007-52');assert.equal(studySample(p,8).heel,-30);assert.equal(studySample(p,8).draft,4.663);
 for(const i of [-1,.5,13,NaN])assert.throws(()=>studySample(c,i));
});
test('source qualifications, grain moments and cargo geometry gaps are retained',()=>{
 const ballast=raw.cases.filter(c=>c.source.startsWith('007'));assert.equal(ballast.length,43);assert.ok(ballast.every(c=>c.qualifications.some(q=>q.includes('NOT ACCEPTED'))));
 assert.equal(raw.cases.filter(c=>c.family==='Non-seagoing').length,2);
 assert.ok(raw.cases.some(c=>c.items.some(r=>r.flag==='#'&&r.fsm>0)));
 assert.ok(raw.cases.every(c=>c.items.every(r=>!r.footprint)));
 assert.equal(raw.cases.reduce((s,c)=>s+c.arrangement.length,0),34);
});
test('malformed study data, altered mass, conflicting IDs and unsafe images fail closed',()=>{
 for(const mutate of [v=>v.cases[0].items[0].mass+=2,v=>v.cases[0].trajectory[1][0]=0,v=>v.cases[1].id=v.cases[0].id,v=>v.cases[0].arrangement[0].image='https://example.com/track',v=>v.cases[0].items[0].kg=NaN]){const v=structuredClone(raw);mutate(v);assert.throws(()=>parseStudyLibrary(v,manifest.id));}
 assert.throws(()=>parseStudyLibrary(raw,'different-vessel'));
});
test('study resource does not invalidate existing saved conditions',()=>{const before={...ship,manifest:{...manifest,resources:manifest.resources.filter(r=>r.kind!=='documentation.study-cases')}};assert.equal(modelSignature(ship),modelSignature(before));});
test('library is cached without changing live loading inputs',async()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify(raw));};
 try{const before=JSON.stringify(manifest.defaultCondition);const a=loadStudyLibrary(ship),b=loadStudyLibrary(ship);assert.equal(a,b);const result=await a;assert.equal(calls,1);assert.ok(Object.isFrozen(result));assert.equal(JSON.stringify(manifest.defaultCondition),before);}finally{globalThis.fetch=previous;}
});
test('source AP coordinates retain physical positions with amidships and reversed model axes',async()=>{
 const {studyPointInModel}=await server.ssrLoadModule('/src/visualization/documented-studies.ts');
 const {bodyPoint}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
 const point={lcg:58.731,tcg:.4,kg:4.62},expected=bodyPoint(ship,studyPointInModel(ship,point));
 for(const xPositive of ['forward','aft'])for(const yPositive of ['starboard','port'])for(const zPositive of ['up','down']){
 const changed=structuredClone(ship);Object.assign(changed.manifest.coordinateSystem,{longitudinalOriginFromAP:60.85,xPositive,yPositive,zPositive});assert.deepEqual(bodyPoint(changed,studyPointInModel(changed,point)),expected);
 }
 const invalid=structuredClone(ship);delete invalid.manifest.coordinateSystem.longitudinalOriginFromAP;assert.throws(()=>studyPointInModel(invalid,point));
});
test('GZ zero line and ordinates share one scale, including negative and flat curves',async()=>{
 const {studyGzPlot}=await server.ssrLoadModule('/src/visualization/documented-studies.ts');
 for(const values of [[-.4,0,.8],[0,.2,.5],[-.5,-.2,-.1],[0,0,0]]){
 const c={trajectory:values.map((gz,i)=>[i*10,0,0,0,0,0,gz,0])};const p=studyGzPlot(c);
 assert.ok(p.ticks.some(t=>t.value===0&&t.y===p.zeroY));
 values.forEach((gz,i)=>{assert.ok(Number.isFinite(p.points[i].y));if(gz===0)assert.equal(p.points[i].y,p.zeroY);if(gz<0)assert.ok(p.points[i].y>p.zeroY);if(gz>0)assert.ok(p.points[i].y<p.zeroY);});
 }
});
