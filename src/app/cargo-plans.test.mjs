import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../scripts/test-server.mjs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { parseCargoPlan: parse } = await server.ssrLoadModule('/src/app/cargo-plans.ts');
const base = { id:'light', name:'Lightship', massTonnes:'100', lcg:'50', vcg:'4', tcg:'0', freeSurfaceMomentTransverse:'0' };
const plan = () => ({ kind:'cargo-plan', version:1, id:'p', name:'Apples', voyage:'Voyage 1', model:'vessel-v1', savedAt:new Date().toISOString(), state:{scenario:'loading', manual:{},manualMode:'displacement',density:1.025,longitudinalFsm:0,weights:[{...base},{...base,id:'cargo',name:'Apples',massTonnes:'20',category:'cargo',hold:'Hold 1',quantity:'10'}]} });
test('cargo metadata survives JSON round trip without multiplying total mass', () => {
  const result = parse(JSON.parse(JSON.stringify(plan())), 'vessel-v1', [base]);
  assert.equal(result.state.weights[1].hold,'Hold 1'); assert.equal(result.state.weights[1].quantity,'10'); assert.equal(result.state.weights[1].massTonnes,'20');
});
test('wrong vessel, altered or missing fixed items and duplicate IDs rejected', () => {
  assert.throws(()=>parse(plan(),'another-vessel',[base]));
  for(const mutate of [p=>p.state.weights.shift(),p=>p.state.weights[0].massTonnes='101',p=>p.state.weights[1].id='light']) {
    const p=plan();mutate(p);assert.throws(()=>parse(p,'vessel-v1',[base]));
  }
});
test('incomplete cargo coordinates can be retained for recovery', () => {
  const p=plan();p.state.weights[1].lcg='';assert.equal(parse(p,'vessel-v1',[base]).state.weights[1].lcg,'');
});
test('invalid quantity, category, mass and density are rejected', () => {
  for(const change of [{quantity:'1.5'},{quantity:'0'},{category:'unknown'},{massTonnes:'-1'},{tcg:'Infinity'}]) {
    const p=plan();Object.assign(p.state.weights[1],change);assert.throws(()=>parse(p,'vessel-v1',[base]));
  }
  const p=plan();p.state.density=0;assert.throws(()=>parse(p,'vessel-v1',[base]));
});
test('manual scenarios and imported calculation results do not become plans', () => {
  const p=plan();p.state.scenario='manual';assert.throws(()=>parse(p,'vessel-v1',[base]));
  const q=plan();q.results={displacement:0};assert.equal(parse(q,'vessel-v1',[base]).results,undefined);
});
