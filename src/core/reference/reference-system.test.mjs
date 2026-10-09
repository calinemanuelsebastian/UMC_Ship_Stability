import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../../scripts/test-server.mjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {createReferenceTransform,sourceReference,textbookReference}=await server.ssrLoadModule('/src/core/reference/reference-system.ts');
const {computeLoadingCondition}=await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
const {ReferenceContext}=await server.ssrLoadModule('/src/app/reference-context.ts');
const {ResultsTable}=await server.ssrLoadModule('/src/components/results-table.tsx');
const {NumberInput}=await server.ssrLoadModule('/src/components/number-input.tsx');
const {StabilityChart}=await server.ssrLoadModule('/src/components/stability-chart.tsx');
const source={origin:'AP',xPositive:'forward',yPositive:'starboard',zPositive:'up'};
const settings={...sourceReference(source),profile:'custom',longitudinalOrigin:50,xPositive:'aft',yPositive:'port',zPositive:'down',heelPositive:'port',trimPositive:'stern',notation:'coordinates'};
const reference=createReferenceTransform(source,settings);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const render=element=>renderToStaticMarkup(createElement(ReferenceContext.Provider,{value:{settings,setSettings:()=>{},...reference}},element));
test('source profile is identity regardless of inactive custom fields',()=>{
 const ref=createReferenceTransform(source,{...settings,profile:'source'});
 for(const axis of ['x','y','z']){assert.equal(ref.toDisplay(axis,13),13);assert.equal(ref.toSource(axis,13),13);}
 assert.equal(ref.heelSign,1);
});
test('origin translation and all sign combinations round trip',()=>{
 for(const xPositive of ['forward','aft'])for(const yPositive of ['port','starboard'])for(const zPositive of ['up','down']){
  const ref=createReferenceTransform(source,{...settings,xPositive,yPositive,zPositive});
  for(const axis of ['x','y','z'])for(const value of [-125,-1,0,1,98.123])close(ref.toSource(axis,ref.toDisplay(axis,value)),value);
 }
 assert.equal(reference.toDisplay('x',60),-10);assert.equal(reference.toDisplay('z',5),-5);
});
test('source axes are respected, not assumed',()=>{
 const ref=createReferenceTransform({...source,xPositive:'aft',yPositive:'port',zPositive:'down'},settings);
 assert.equal(ref.toDisplay('x',60),10);assert.equal(ref.toDisplay('y',2),2);assert.equal(ref.toDisplay('z',5),5);
});
test('loading centres and moments transform consistently without changing mass',()=>{
 const weights=[{id:'a',name:'A',massTonnes:2000,lcg:40,tcg:-1,vcg:4},{id:'b',name:'B',massTonnes:4000,lcg:55,tcg:.5,vcg:7}];
 const original=structuredClone(weights),result=computeLoadingCondition(weights);
 const displayed=weights.map(w=>({...w,lcg:reference.toDisplay('x',w.lcg),tcg:reference.toDisplay('y',w.tcg),vcg:reference.toDisplay('z',w.vcg)}));
 const view=computeLoadingCondition(displayed);
 for(const [axis,centre,moment]of [['x','lcg','longitudinalMoment'],['y','tcg','transverseMoment'],['z','vcg','verticalMoment']]){close(view[centre],reference.toDisplay(axis,result[centre]));close(view[moment],reference.moment(axis,result[moment],result.displacementTonnes));}
 assert.deepEqual(weights,original);assert.equal(view.displacementTonnes,result.displacementTonnes);
 const back=displayed.map(w=>({...w,lcg:reference.toSource('x',w.lcg),tcg:reference.toSource('y',w.tcg),vcg:reference.toSource('z',w.vcg)}));assert.deepEqual(back,weights);
});
test('result heights change sign while GM and correction remain physical distances',()=>{
 const result={kb:1.5,lcb:60,tcb:2,gmTransverseCorrected:7.5,freeSurfaceCorrectionTransverse:.1};
 const html=render(createElement(ResultsTable,{result}));
 assert.match(html,/-1.5/);assert.match(html,/-10/);assert.match(html,/7.5/);assert.match(html,/0.1/);assert.match(html,/zB/);assert.equal(result.kb,1.5);
});
test('coordinate input and chart labels use selected convention',()=>{
 const html=render(createElement(NumberInput,{label:'VCG / KG (m)',coordinate:'z',value:5,onChange:()=>{}}));assert.match(html,/zG/);assert.match(html,/value="-5"/);
 const chart=render(createElement(StabilityChart,{points:[{heelDeg:-1,kn:-1,gz:-1,gzCorrected:-1},{heelDeg:1,kn:1,gz:1,gzCorrected:1}]}));assert.match(chart,/starboard − \/ port \+/);
 assert.equal(reference.heelSign,-1);assert.equal(reference.trimSign,-1);
});
test('missing values and invalid numerical ranges are handled',()=>{
 assert.equal(reference.toDisplay('x',undefined),undefined);assert.equal(reference.toSource('z',undefined),undefined);
 assert.throws(()=>createReferenceTransform(source,{...settings,longitudinalOrigin:NaN}));assert.throws(()=>reference.toDisplay('x',Infinity));
 assert.equal(Object.is(reference.toDisplay('y',0),-0),false);
});

test('UK and Russian presets convert positions and edited inputs without moving weights',()=>{
 const model={...source,longitudinalOriginFromAP:0,amidshipsX:50};
 for(const profile of ['uk','russian']){
  const preset=textbookReference(model,profile);
  const ref=createReferenceTransform(model,preset);
  assert.equal(ref.toDisplay('x',60),profile==='uk'?60:10);
  assert.equal(ref.toSource('x',ref.toDisplay('x',60)),60);
  assert.equal(ref.toDisplay('z',5),5);
  assert.equal(ref.moment('x',600,10),10*ref.toDisplay('x',60));
 }
 assert.equal(textbookReference(model,'uk').notation,'nautical');
 assert.equal(textbookReference(model,'russian').notation,'coordinates');
});
test('textbook datums respect aft-positive source coordinates',()=>{
 const model={...source,xPositive:'aft',longitudinalOriginFromAP:50,amidshipsX:0};
 assert.equal(createReferenceTransform(model,textbookReference(model,'uk')).toDisplay('x',-10),60);
 assert.equal(createReferenceTransform(model,textbookReference(model,'russian')).toDisplay('x',-10),10);
});
test('presets reject absent and invalid datum metadata',()=>{
 for(const profile of ['uk','russian']){
  assert.equal(textbookReference(source,profile),undefined);
  for(const value of [NaN,Infinity,1000001])assert.equal(textbookReference({...source,longitudinalOriginFromAP:value,amidshipsX:value},profile),undefined);
 }
});

test('reference diagram locates preset origins and reverses custom axes',async()=>{
 const {ReferenceDiagram}=await server.ssrLoadModule('/src/components/reference-diagram.tsx');
 const model={...source,longitudinalOriginFromAP:0,amidshipsX:50};
 const ship={manifest:{coordinateSystem:model,principalDimensions:{lbp:100}}};
 const draw=selected=>renderToStaticMarkup(createElement(ReferenceContext.Provider,{value:{settings:selected,setSettings:()=>{},...createReferenceTransform(model,selected)}},createElement(ReferenceDiagram,{ship})));
 const uk=draw(textbookReference(model,'uk')), russian=draw(textbookReference(model,'russian'));
 assert.match(uk,/cx="100"/);assert.match(russian,/cx="280"/);
 const custom=draw({...settings,longitudinalOrigin:50});
 assert.match(custom,/M280 100 H240/);assert.match(custom,/M280 100 V45/);assert.match(custom,/M280 115 V160/);
 assert.match(draw({...settings,longitudinalOrigin:150}),/marker shown off-scale/);
 assert.match(draw({...settings,longitudinalOrigin:150}),/cx="505"/);
 const unknown=renderToStaticMarkup(createElement(ReferenceDiagram,{ship:{manifest:{coordinateSystem:source,principalDimensions:{lbp:100}}}}));
 assert.match(unknown,/Origin position is unknown/);
});
