import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {assessIntact,integrateGz,intactOverview,directionalCurve}=await server.ssrLoadModule('/src/core/stability/intact-assessment.ts');
const {heelEquilibrium}=await server.ssrLoadModule('/src/core/stability/heel-equilibrium.ts');
const {parseAssessmentSettings,intactLimitsFor}=await server.ssrLoadModule('/src/app/assessment-settings.ts');
const curve=(step=1,tcg=0)=>({points:Array.from({length:120/step+1},(_,i)=>{const heelDeg=-60+i*step;const g=Math.sign(heelDeg)*(Math.abs(heelDeg)<=35?Math.abs(heelDeg)/35:1-(Math.abs(heelDeg)-35)/30)-tcg;return {heelDeg,kn:999,gz:999,gzCorrected:g};}),gmAtTrim:{correctedGm:.3}});
const limit={angleDeg:40,source:'Independent fixture; same loading condition'};
test('reference triangle areas use radians without applying FSM twice',()=>{
 const p=[{heelDeg:0,gzCorrected:0},{heelDeg:30,gzCorrected:.4},{heelDeg:40,gzCorrected:.2}];
 assert.ok(Math.abs(integrateGz(p,0,30)-.2*Math.PI/6)<1e-12);
 assert.ok(Math.abs(integrateGz(p,30,40)-.3*Math.PI/18)<1e-12);
});
test('dense isolated maximum can be evaluated; coarse sampled maximum remains unresolved',()=>{
 const dense=assessIntact(curve(),limit);assert.ok(dense.every(r=>r.status==='Meets numerical minimum'));
 const coarse=assessIntact(curve(5),limit);assert.equal(coarse.find(r=>r.id==='peak').status,'Insufficient data');
});
test('declared flooding boundary truncates areas and invalidates higher-angle coverage',()=>{
 const c=curve();const rows=assessIntact(c,{...limit,angleDeg:35});
 assert.equal(rows.find(r=>r.id==='areaX').value,integrateGz(c.points,0,35));
 assert.equal(rows.find(r=>r.id==='area30X').value,integrateGz(c.points,30,35));
 const early=assessIntact(c,{...limit,angleDeg:25});assert.equal(early[0].status,'Insufficient data');assert.equal(early.find(r=>r.id==='gm').status,'Meets numerical minimum');
});
test('earlier sampled flooding prevents a later declared limit from completing X criteria',()=>{
 const rows=assessIntact({...curve(),downflooding:{firstReachedAngle:30}},limit);
 assert.equal(rows[1].status,'Insufficient data');assert.match(rows[1].reason,/conflicts/);
});
test('equality thresholds use only a floating-point tolerance; negative GM fails independently',()=>{
 const c=curve();c.gmAtTrim.correctedGm=.15;assert.equal(assessIntact(c).at(-1).status,'Meets numerical minimum');
 c.gmAtTrim.correctedGm=-.1;assert.equal(assessIntact(c).at(-1).status,'Below numerical minimum');
 assert.equal(assessIntact({...c,points:[]}).at(-1).status,'Below numerical minimum');
});
test('opposite sides preserve transverse asymmetry and do not invent missing port samples',()=>{
 const c=curve(1,.1),port=directionalCurve(c,'port');assert.equal(port.points.find(p=>p.heelDeg===30).gzCorrected,-c.points.find(p=>p.heelDeg===-30).gzCorrected);
 const overview=intactOverview({...c,points:c.points.filter(p=>p.heelDeg>=0)});assert.equal(overview.directions.port.rows[0].status,'Insufficient data');
});
test('condition-specific limits round-trip and are withheld after edits or without provenance',()=>{
 const settings=parseAssessmentSettings({intact:{conditionKey:'a',starboard:'35',port:'40',source:'fixture'}});
 assert.equal(intactLimitsFor(settings,'a').starboard.angleDeg,35);assert.deepEqual(intactLimitsFor(settings,'b'),{});
 assert.deepEqual(intactLimitsFor({intact:{...settings.intact,source:''}},'a'),{});
 for(const angle of ['NaN','91','-1'])assert.throws(()=>parseAssessmentSettings({intact:{...settings.intact,starboard:angle}}));
});
test('coarse roots remain candidates; dense linear roots converge and select only when resolved',()=>{
 const result=step=>({points:Array.from({length:20/step+1},(_,i)=>({heelDeg:-10+i*step,gzCorrected:(-10+i*step)-.25}))});
 const coarse=heelEquilibrium(result(5));assert.equal(coarse.equilibrium,undefined);assert.equal(coarse.roots[0].heelDeg,.25);
 for(const step of [1,.5,.25])assert.ok(Math.abs(heelEquilibrium(result(step)).equilibrium.heelDeg-.25)<1e-12);
});
test('area refinement converges against independent sine integral',()=>{
 const errors=[5,1,.2].map(step=>{const points=Array.from({length:40/step+1},(_,i)=>({heelDeg:i*step,gzCorrected:Math.sin(i*step*Math.PI/180)}));return Math.abs(integrateGz(points,0,40)-(1-Math.cos(40*Math.PI/180)));});
 assert.ok(errors[2]<errors[1]&&errors[1]<errors[0]);assert.ok(errors[2]<1e-6);
});
test('declared directional flooding limits block both signed equilibrium attitudes',()=>{
 for(const sign of [-1,1]){const result={points:Array.from({length:41},(_,i)=>({heelDeg:i-20,gzCorrected:i-20-sign*10}))};const limits={[sign<0?'port':'starboard']:{angleDeg:10,source:'test'}};assert.equal(heelEquilibrium(result,true,limits).equilibrium,undefined);assert.match(heelEquilibrium(result,true,limits).message,/declared downflooding/);}
});
