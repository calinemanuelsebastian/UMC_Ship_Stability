import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {derivePortEstimate,estimateGeometryInputs}=await server.ssrLoadModule('/src/core/stability/derived-stability-data.ts');
const {parseConstantLcb,interpolateConstantLcb}=await server.ssrLoadModule('/src/core/stability/constant-lcb.ts');
const make=(tcg)=>({condition:{tcg},points:[0,10,30].map(heelDeg=>{const a=heelDeg*Math.PI/180;return {heelDeg,kn:3*Math.sin(a),gz:Math.sin(a)-tcg*Math.cos(a),gzCorrected:.8*Math.sin(a)-tcg*Math.cos(a)};}),warnings:[],downflooding:{firstReachedAngle:25}});
test('symmetry reflects KN, preserves transverse sign and corrects free surface once',()=>{
 for(const tcg of [-.4,0,.4]){const source=make(tcg),before=JSON.stringify(source);const r=derivePortEstimate(source);
 assert.deepEqual(r.points.map(p=>p.heelDeg),[-30,-10,0,10,30]);assert.equal(r.derivedPort,true);assert.equal(JSON.stringify(source),before);
 for(const p of r.points){const a=p.heelDeg*Math.PI/180;assert.ok(Math.abs(p.gzCorrected-(.8*Math.sin(a)-tcg*Math.cos(a)))<1e-12);}
 assert.equal(r.downflooding,source.downflooding);assert.equal(r.points.filter(p=>p.heelDeg===0).length,1);
 }
 assert.throws(()=>derivePortEstimate({...make(0),points:make(0).points.reverse()}));
});
test('symmetry hypothesis is compared independently with all 37 source cases',async()=>{
 const root='validation-references/reviewed-apples-vessel/';const d=parseConstantLcb(JSON.parse(await readFile(root+'cross-curves-constant-lcb.json')));
 const cases=JSON.parse(await readFile(root+'assessment-basis.json')).weatherEvidence.cases;let manual=0,ballast=0;
 for(const c of cases){const kn=interpolateConstantLcb(d,c.massTonnes,c.rows.find(r=>r.anglePortDeg===0).trim);const max=Math.max(...c.rows.map(r=>Math.abs(kn[d.heelAnglesDegrees.indexOf(r.anglePortDeg)]-r.kn)));
 if(c.sourceFile.startsWith('004')){manual++;assert.ok(max<.001121,c.id);}else{ballast++;assert.ok(max<.006693,c.id);}
 }
 assert.equal(manual,19);assert.equal(ballast,18);
});
test('geometry diagnostics are bounded estimates with explicit volume convention',()=>{
 const input={mass:13976.39,density:1.025,length:121.7,beam:17.4,draft:8,depth:11.4,appendageFactor:1.0028};const r=estimateGeometryInputs(input);
 assert.ok(Math.abs(r.cb-.8026)<.0002);assert.ok(Math.abs(r.deckAngle-Math.atan(3.4/8.7)*180/Math.PI)<1e-12);
 assert.throws(()=>estimateGeometryInputs({...input,draft:12}));assert.throws(()=>estimateGeometryInputs({...input,appendageFactor:0}));assert.throws(()=>estimateGeometryInputs({...input,length:NaN}));
});
