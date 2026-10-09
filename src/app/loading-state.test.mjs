import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../scripts/test-server.mjs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { draftWeights, evaluateWeights } = await server.ssrLoadModule('/src/app/loading-state.ts');
const source = [{id:'light',name:'Lightship',massTonnes:4000,lcg:50,vcg:4,tcg:0},{id:'cargo',name:'Cargo',massTonnes:2000,lcg:53,vcg:7,tcg:0,freeSurfaceMomentTransverse:600}];
test('editable weights retain physical centres and separate free-surface correction', () => {
 const result = evaluateWeights(draftWeights(source)).result;
 assert.equal(result.displacementTonnes,6000);
 assert.equal(result.lcg,51); assert.equal(result.vcg,5);
 assert.equal(result.freeSurfaceMomentTransverse,600);
 assert.equal(source[0].freeSurfaceMomentTransverse,undefined);
});
test('incomplete or invalid edits cannot produce a shared loading condition', () => {
 for (const [field,value] of [['massTonnes',''],['lcg',' '],['vcg','NaN'],['tcg','Infinity'],['massTonnes','-1'],['freeSurfaceMomentTransverse','-1']]) {
  const weights=draftWeights(source); weights[1][field]=value;
  const state=evaluateWeights(weights);
  assert.equal(state.result,undefined,`${field}=${value}`); assert.ok(state.error);
 }
 assert.equal(evaluateWeights([]).result,undefined);
});
test('correcting an invalid edit recomputes totals without mutating source weights', () => {
 const weights=draftWeights(source); weights[1].massTonnes='';
 assert.equal(evaluateWeights(weights).result,undefined);
 weights[1].massTonnes='2400';
 assert.equal(evaluateWeights(weights).result.displacementTonnes,6400);
 assert.equal(source[1].massTonnes,2000);
});
