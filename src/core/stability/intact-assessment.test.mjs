import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {assessIntact,integrateGz}=await server.ssrLoadModule('/src/core/stability/intact-assessment.ts');
const points=(angles,fn)=>angles.map(heelDeg=>({heelDeg,gzCorrected:fn(heelDeg),gz:999,kn:999}));
test('signed trapezoidal areas use radians and interpolate interval boundaries',()=>{
 const p=points([0,2,13,29,45,60],a=>a/30-0.5);
 assert.ok(Math.abs(integrateGz(p,0,30))<1e-12);
 assert.ok(Math.abs(integrateGz(p,30,40)-((.5+5/6)/2)*10*Math.PI/180)<1e-12);
 assert.equal(integrateGz(p,0,61),undefined);
 assert.equal(integrateGz([...p].reverse(),0,30),undefined);
});
test('six source criteria retain limits and provisional margins without approving the condition',()=>{
 const rows=assessIntact({points:points([0,2,10,20,30,40,50,60],a=>a<=40?a/40:1-(a-40)/40)});
 assert.equal(rows.length,6);assert.deepEqual(rows.map(r=>r.limit),[.055,.09,.03,.2,25,.15]);
 assert.equal(rows.find(r=>r.id==='peak').value,40);
 assert.deepEqual(rows.map(r=>r.status),['Meets numerical minimum','Insufficient data','Insufficient data','Meets numerical minimum','Meets numerical minimum','Insufficient data']);assert.ok(rows[0].margin>0);
 assert.match(rows.find(r=>r.id==='areaX').reason,/X is unconfirmed/);
});
test('slope estimate uses corrected GZ only and refuses sparse initial coverage',()=>{
 const p=points([0,2,30,40,60],a=>.4*a*Math.PI/180);
 assert.ok(Math.abs(assessIntact({points:p}).find(r=>r.id==='gm').value-.4)<1e-12);
 assert.equal(assessIntact({points:p.filter(x=>x.heelDeg!==2)}).find(r=>r.id==='gm').value,undefined);
});
test('boundary maxima, plateaus and missing curves do not invent peak angles or results',()=>{
 for(const p of [points([0,2,30,40,60],a=>a),points([0,2,30,40,60],a=>Math.min(a,30))])assert.equal(assessIntact({points:p}).find(r=>r.id==='peak').value,undefined);
 assert.ok(assessIntact().every(r=>r.value===undefined&&r.margin===undefined));
});

test('failed numerical minima remain separate from missing flood-dependent checks',()=>{
 const rows=assessIntact({points:points([0,2,10,20,30,40,50,60],a=>a<=20?a/1000:(60-a)/2000),gmAtTrim:{correctedGm:.1}});
 for(const id of ['area30','gz','peak','gm'])assert.equal(rows.find(r=>r.id===id).status,'Below numerical minimum');
 for(const id of ['areaX','area30X'])assert.equal(rows.find(r=>r.id===id).status,'Insufficient data');
});
test('sampled flooding blocks affected curve checks but leaves hydrostatic GM independent',()=>{
 const rows=assessIntact({points:points([0,2,10,20,30,40,50,60],a=>a<=40?a/40:1-(a-40)/40),gmAtTrim:{correctedGm:.3},downflooding:{firstReachedAngle:25}});
 for(const id of ['area30','gz','peak'])assert.equal(rows.find(r=>r.id===id).status,'Insufficient data');
 assert.equal(rows.find(r=>r.id==='gm').status,'Meets numerical minimum');
});
