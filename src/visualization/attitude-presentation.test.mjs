import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {attitudeReadouts,isCalculatedMode}=await server.ssrLoadModule('/src/visualization/attitude-presentation.ts');
const base={draftAft:4,draftForward:5,trimDeg:1,heelDeg:3};
const teaching={axis:'heel',heel:20,trim:10};
test('reference drafts never masquerade as heeled drafts',()=>{
 const rows=attitudeReadouts('heel',{...base,initialTrimReference:true},1,-1,teaching);
 assert.deepEqual(rows.map(r=>r.value),[3,-1,undefined,undefined]);
 assert.equal(rows[1].label,'Initial reference trim angle');
 assert.equal(attitudeReadouts('heel',base,1,1,teaching)[1].value,undefined);
});
test('coupled readouts use vertical drafts and conventions, not body intersections',()=>{
 const rows=attitudeReadouts('equilibrium',{...base,verticalDraftAft:3.9,verticalDraftForward:4.9},-1,-1,teaching);
 assert.deepEqual(rows.map(r=>r.value),[-3,-1,3.9,4.9]);
});
test('missing heel and illustrative drafts are unavailable rather than zero or predictions',()=>{
 assert.equal(attitudeReadouts('equilibrium',{...base,heelDeg:undefined},1,1,teaching)[0].value,undefined);
 assert.deepEqual(attitudeReadouts('trim',{...base,illustrativeDrafts:true},1,1,teaching).map(r=>r.value),[undefined,1,undefined,undefined]);
});
test('teaching controls do not contaminate calculated values',()=>{
 assert.deepEqual(attitudeReadouts('teaching',base,-1,1,teaching).map(r=>r.value),[-20,0]);
 assert.equal(attitudeReadouts('equilibrium',base,1,1,teaching)[0].value,3);
 for(const mode of ['trim','heel','equilibrium'])assert.equal(isCalculatedMode(mode),true);
 for(const mode of ['upright','teaching'])assert.equal(isCalculatedMode(mode),false);
});
