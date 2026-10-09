import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {assessWeather}=await server.ssrLoadModule('/src/core/stability/weather-assessment.ts');
const curve={condition:{vcg:10},gmAtTrim:{correctedGm:1.504**2},points:[[-60,-.3],[0,0],[10,.8],[20,2],[30,3],[50,2],[60,0]].map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected}))};
const inputs={steady:.1,beam:20,draft:10,lwl:100,cb:.7,bilgeArea:0,deckAngle:30,floodAngle:60};
test('complete numerical weather checks share the roll and energy results',()=>{
 const r=assessWeather(curve,inputs);assert.equal(r.numericalStatus,'Meets numerical limit');assert.equal(r.checks[0].limit,16);assert.equal(r.checks[0].value,1.25);assert.equal(r.checks[1].value,r.areas.b);assert.equal(r.checks[1].limit,r.areas.a);assert.equal(r.checks[1].margin,r.areas.b-r.areas.a);assert.deepEqual(r.missing,[]);
});
test('missing roll/flooding data cannot hide a failed steady-heel check',()=>{
 const r=assessWeather(curve,{...inputs,deckAngle:1,lwl:undefined,cb:undefined,floodAngle:undefined});assert.equal(r.numericalStatus,'Outside numerical limit');assert.equal(r.checks[0].status,'Outside numerical limit');assert.equal(r.checks[1].status,'Insufficient data');assert.equal(r.missing.length,3);assert.equal(r.areas,undefined);
});
test('missing deck input blocks only steady heel; energy still computed',()=>{
 const r=assessWeather(curve,{...inputs,deckAngle:undefined});assert.equal(r.checks[0].status,'Insufficient data');assert.equal(r.checks[1].status,'Meets numerical limit');assert.equal(r.numericalStatus,'Insufficient data');
});
test('curve gaps, empirical limits and reached flooding remain explicit',()=>{
 const clipped={...curve,points:curve.points.filter(p=>p.heelDeg>=0)};const a=assessWeather(clipped,inputs);assert.equal(a.areas,undefined);assert.match(a.areaError,/coverage/);
 const b=assessWeather(curve,{...inputs,beam:35});assert.equal(b.roll,undefined);assert.match(b.rollError,/empirical/);
 const c=assessWeather({...curve,downflooding:{firstReachedAngle:30}},inputs);assert.equal(c.areas,undefined);assert.match(c.areaError,/flooding/);
});
test('derived provenance remains explicit and invalid values never produce a passing result',()=>{
 assert.equal(assessWeather({...curve,derivedPort:true},inputs).basis,'Includes symmetry-based port estimate');
 for(const value of [NaN,Infinity,-1]){const r=assessWeather(curve,{...inputs,steady:value});assert.notEqual(r.numericalStatus,'Meets numerical limit');assert.equal(r.checks[0].status,'Insufficient data');}
 const r=assessWeather(curve,{...inputs,cb:2,bilgeArea:-1});assert.equal(r.roll,undefined);assert.ok(r.missing.includes('Block coefficient CB (0–1)'));
});
test('insufficient restoring energy is a numerical failure rather than missing data',()=>{
 const weak={...curve,points:[[-60,-1.2],[0,0],[10,.2],[20,.4],[30,.2],[40,0],[50,-.2]].map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected}))};
 const r=assessWeather(weak,inputs);assert.ok(r.areas.margin<0);assert.equal(r.checks[1].status,'Outside numerical limit');assert.equal(r.numericalStatus,'Outside numerical limit');
});
