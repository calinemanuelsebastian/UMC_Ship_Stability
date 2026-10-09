import {test,after} from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{createServer}from'../../../scripts/test-server.mjs';
const s=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>s.close());
const {parseKgLimits,compareKg}=await s.ssrLoadModule('/src/core/stability/kg-limit.ts');const {computeTableTrim}=await s.ssrLoadModule('/src/core/trim/trimmed-table.ts');
const d=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/annotated-kg-limits.json','utf8'));
test('red table knots and corrected margins are preserved without displacement substitution',()=>{for(const r of d.rows)assert.equal(compareKg(d,r.draftMouldedMetres,5,.2).limit,r.maximumVcgMetres);const a=d.rows[0],b=d.rows[1],r=compareKg(d,(a.draftMouldedMetres+b.draftMouldedMetres)/2,6,.1);assert.ok(Math.abs(r.limit-(a.maximumVcgMetres+b.maximumVcgMetres)/2)<1e-12);assert.ok(Math.abs(r.physicalMargin-r.correctedMargin-.1)<1e-12);});
test('missing, invalid and out-of-range KG data are rejected',()=>{for(const x of [0,9,NaN])assert.throws(()=>compareKg(d,x,5,0));assert.throws(()=>compareKg(d,6,5,-1));assert.throws(()=>parseKgLimits({...d,rows:[...d.rows].reverse()}));});
test('documented draft references reproduce the manual end-draught example',()=>{
 const tables=[-2,0].map(trimMetres=>({trimMetres,rows:[{displacementTonnes:50,draft:5,lcb:trimMetres},{displacementTonnes:100,draft:6.4785,lcb:trimMetres}]}));
 const r=computeTableTrim({version:1,modelId:'example',source:'PDF32–33',waterDensity:1.025,xPositive:'forward',longitudinalOriginFromAP:0,trimPositive:'bow',draftDatumFromAP:60.85,mouldedDraftOffset:.011,tables},{displacementTonnes:100,lcg:-1.005,waterDensity:1.025},121.7);
 assert.ok(Math.abs(r.draftAft-6.981)<1e-12);assert.ok(Math.abs(r.draftForward-5.976)<1e-12);assert.ok(Math.abs(r.mouldedDraft-6.4675)<1e-12);
});
