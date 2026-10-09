import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseAssessmentBasis}=await server.ssrLoadModule('/src/core/stability/assessment-basis.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const root='validation-references/reviewed-apples-vessel/';
const data=JSON.parse(await readFile(root+'assessment-basis.json','utf8'));
test('basis preserves class annotations and does not assert approval',()=>{
 const d=parseAssessmentBasis(data);
 assert.match(d.notice,/preliminary approval/);
 assert.match(d.requirements.find(r=>r.id==='trim').requirement,/−1.860/);
 assert.match(d.requirements.find(r=>r.id==='damage').gap,/red DAM-GM/);
 assert.equal(d.requirements.find(r=>r.id==='approval').applicability,'Unconfirmed');
 for(const key of ['pass','compliant','approved']){const bad=structuredClone(data);bad.requirements[0].applicability=key;assert.throws(()=>parseAssessmentBasis(bad));}
 const duplicate=structuredClone(data);duplicate.requirements.push(duplicate.requirements[0]);assert.throws(()=>parseAssessmentBasis(duplicate));
});
test('adding documentation does not invalidate saved loading conditions',async()=>{
 const manifest=JSON.parse(await readFile(root+'manifest.json','utf8'));
 const before={manifest:{...manifest,resources:manifest.resources.filter(r=>r.kind!=='stability.assessment-basis')},baseUrl:''};
 assert.equal(modelSignature(before),modelSignature({manifest,baseUrl:''}));
});
