import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {steadyWindEquilibrium}=await server.ssrLoadModule('/src/core/stability/wind-equilibrium.ts');
const curve=(values)=>({points:values.map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected,kn:0,gz:999}))});
test('wind equilibrium uses corrected GZ once and interpolates an interior stable root',()=>{
 const input=curve([[0,0],[10,.2],[20,.4],[30,.1]]),before=structuredClone(input);
 const r=steadyWindEquilibrium(input,.1);assert.equal(r.angle,5);assert.equal(r.marginTo16,11);assert.deepEqual(input,before);
 assert.equal(steadyWindEquilibrium(input,.2).angle,10);
});
test('ceiling exceedance is reported without clamping the angle',()=>{
 const r=steadyWindEquilibrium(curve([[0,0],[10,.1],[20,.2],[30,.3]]),.18);
 assert.ok(Math.abs(r.angle-18)<1e-10);assert.ok(Math.abs(r.marginTo16+2)<1e-10);
});
test('missing, boundary, neutral and multiple stable roots stay unresolved',()=>{
 for(const [values,lever]of[
 [[[0,0],[10,.1],[20,.2]],.3],
 [[[0,0],[10,.1],[20,.2]],0],
 [[[0,0],[10,.1],[20,.1],[30,.2]],.1],
 [[[0,0],[10,.2],[20,0],[30,.2]],.1],
 ])assert.equal(steadyWindEquilibrium(curve(values),lever).angle,undefined);
});
test('known flooding threshold blocks root; invalid inputs are rejected',()=>{
 const c=curve([[0,0],[10,.2],[20,.4]]);c.downflooding={firstReachedAngle:5};
 assert.equal(steadyWindEquilibrium(c,.1).angle,undefined);
 for(const lever of [-1,NaN,Infinity])assert.throws(()=>steadyWindEquilibrium(c,lever));
});
