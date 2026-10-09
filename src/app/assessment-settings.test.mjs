import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseAssessmentSettings,assessmentKey}=await server.ssrLoadModule('/src/app/assessment-settings.ts');
const {parseScenario}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const settings={weather:{conditionKey:'abc',profile:'no-cargo',values:{lwl:'123.95',cb:'.8',bilge:'21.5',deck:'30',flood:''},estimatePort:true,inputSource:'Manual p34; flooding unknown'},draft:{conditionKey:'abc',value:6}};
const scenario={version:1,id:'case',name:'Departure',model:'model',savedAt:'2026-09-28T00:00:00Z',state:{scenario:'loading',weights:[],manual:{},manualMode:'displacement',assessment:settings}};
test('assessment settings round-trip through conditions while imported results are discarded',()=>{
 const parsed=parseScenario(JSON.parse(JSON.stringify({...scenario,state:{...scenario.state,result:{approved:true}}})),'model');assert.deepEqual(parsed.state.assessment,settings);assert.equal(parsed.state.result,undefined);parsed.state.assessment.weather.values.cb='.9';assert.equal(settings.weather.values.cb,'.8');
 const old=structuredClone(scenario);delete old.state.assessment;assert.equal(parseScenario(old,'model').state.assessment,undefined);
});
test('malformed and nonfinite assessment inputs are rejected',()=>{
 for(const change of [w=>w.values.cb='NaN',w=>w.values=null,w=>w.estimatePort='true',w=>w.inputSource='x'.repeat(4001)]){const bad=structuredClone(settings);change(bad.weather);assert.throws(()=>parseAssessmentSettings(bad));}
 assert.throws(()=>parseAssessmentSettings({draft:{conditionKey:'abc',value:-1}}));
});
test('condition keys ignore page/pending/order but detect all relevant numerical edits',()=>{
 const c={displacementTonnes:8000,lcg:60,vcg:6,tcg:0,freeSurfaceMomentTransverse:30,waterDensity:1.025,longitudinalFsm:0};assert.equal(assessmentKey(c),assessmentKey({...c,pending:true}));for(const key of Object.keys(c))assert.notEqual(assessmentKey(c),assessmentKey({...c,[key]:c[key]+1}));
});
