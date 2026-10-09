import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseWeatherEvidence}=await server.ssrLoadModule('/src/core/stability/weather-evidence.ts');
const d=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/assessment-basis.json','utf8')).weatherEvidence;
test('all 37 extracted cases preserve source orientation, tokens and rounded lever arithmetic',()=>{
 const data=parseWeatherEvidence(d);assert.equal(data.cases.length,37);assert.equal(data.cases.reduce((n,c)=>n+c.rows.length,0),481);
 for(const c of data.cases){assert.equal(c.direction,'port');assert.equal(c.massTonnes,Number(c.weightTokens[0]));
 for(const r of c.rows){assert.deepEqual([r.anglePortDeg,r.draft,r.trim,r.kn,r.kgSin,r.tcgCos,r.gzCorrectedPort,r.areaPort],r.sourceTokens.map(Number));assert.ok(Math.abs(r.kn-r.kgSin-r.tcgCos-r.gzCorrectedPort)<.00151);}}
});
test('specific cases retain their own limits rather than current-condition defaults',()=>{
 const c=d.cases.find(c=>c.id==='004-229');assert.equal(c.massTonnes,8245.847);assert.equal(c.deckLimit80Deg,30.325);assert.equal(c.sourceWindHeelDeg,3.064);assert.equal(c.rows[10].gzCorrectedPort,1.567);
 const b=d.cases.find(c=>c.id==='007-52');assert.equal(b.massTonnes,7919.980);assert.equal(b.deckLimit80Deg,30.414);assert.equal(b.rows[0].gzCorrectedPort,-.047);
});
test('corrupt provenance, direction, order and finite values are rejected',()=>{
 for(const mutate of [x=>x.cases[0].sourceSha256='bad',x=>x.cases[0].direction='starboard',x=>x.cases[0].deckLimit80Deg=NaN,x=>x.cases[0].rows[1].anglePortDeg=0,x=>x.cases.push(x.cases[0]),x=>x.sources[0].pagesSearched=0]){const bad=structuredClone(d);mutate(bad);assert.throws(()=>parseWeatherEvidence(bad));}
});
