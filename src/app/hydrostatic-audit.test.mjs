import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {auditHydrostatics}=await server.ssrLoadModule('/src/app/hydrostatic-audit.ts');
const base=[{draft:1,volume:1000,displacementTonnes:1025,waterplaneArea:1000,tonnesPerCentimetre:10.25,kb:.5,bmTransverse:2,kmTransverse:2.5},{draft:2,volume:2000,displacementTonnes:2050,waterplaneArea:1000,tonnesPerCentimetre:10.25}];
test('independent rectangular table passes all available identities',()=>assert.equal(auditHydrostatics(base,1.025).findings.length,0));
test('likely transcription errors identify row and formula without modifying data',()=>{const bad=structuredClone(base);bad[0].kmTransverse=25;bad[1].displacementTonnes=2500;const before=JSON.stringify(bad),a=auditHydrostatics(bad,1.025);assert.ok(a.findings.some(f=>f.row===1&&f.check.startsWith('KM')));assert.ok(a.findings.some(f=>f.row===2&&f.check.startsWith('Δ')));assert.equal(JSON.stringify(bad),before);});
test('duplicate drafts are flagged and missing columns do not invent values',()=>{assert.ok(auditHydrostatics([{draft:1},{draft:1}],1).findings.some(f=>f.check==='Draft order'));const a=auditHydrostatics([{draft:1},{draft:2}],1);assert.equal(a.comparisons,0);assert.equal(a.findings.length,0);});
