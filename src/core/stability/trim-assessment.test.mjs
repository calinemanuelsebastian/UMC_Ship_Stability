import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseTrimLimits,assessTrim}=await server.ssrLoadModule('/src/core/stability/trim-assessment.ts');
const d=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/assessment-basis.json','utf8')).trimLimits;
test('annotated limits apply at every knot and exact boundaries',()=>{
 for(const r of d.rows){const a=assessTrim(d,r.draftMetres,r.minimumTrimMetres),b=assessTrim(d,r.draftMetres,r.maximumTrimMetres);assert.equal(a.margin,0);assert.equal(b.margin,0);assert.equal(a.status,'Within documented limits');}
 assert.equal(assessTrim(d,8,-2).status,'Outside documented limits');assert.ok(Math.abs(assessTrim(d,8,-2).margin+.14)<1e-12);
 assert.equal(assessTrim(d,4.4,0).status,'Outside documented limits');
});
test('interpolates both limits by moulded draught, not displacement',()=>{
 const s=assessTrim(d,5.48,-1.5);assert.ok(Math.abs(s.minimum+2.24)<1e-12);assert.ok(Math.abs(s.maximum+.38)<1e-12);assert.ok(Math.abs(s.margin-.74)<1e-12);
});
test('refuses extrapolation, missing inputs and mismatched datums',()=>{
 for(const draft of [4.39,8.01,NaN])assert.throws(()=>assessTrim(d,draft,0));assert.throws(()=>assessTrim(d,5,Infinity));
 assert.throws(()=>parseTrimLimits({...d,draftReference:'keel'}));assert.throws(()=>parseTrimLimits({...d,rows:[...d.rows].reverse()}));
});
