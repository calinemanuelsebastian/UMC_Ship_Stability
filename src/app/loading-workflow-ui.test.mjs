import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {LoadingCondition}=await server.ssrLoadModule('/src/features/loading-condition.tsx');
const {TankControls}=await server.ssrLoadModule('/src/components/tank-controls.tsx');
const {LanguageContext}=await server.ssrLoadModule('/src/app/language-context.ts');
const ship={manifest:JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'))};
const catalog=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/tanks.json','utf8'));
const weights=JSON.parse(await readFile('src/app/fixtures/pre-capacity-plan.json','utf8')).state.weights;
const props={ship,catalog,weights,setWeights:()=>{},ready:true,loadError:''};
test('onboard editor excludes cargo and duplicate liquid contribution tables',()=>{
 const html=renderToStaticMarkup(createElement(LoadingCondition,{...props,section:'onboard'}));
 assert.ok(html.includes('Add onboard weight'));assert.ok(html.includes('Crew, provisions and other weights'));
 assert.ok(!html.includes('Cargo weights and positions'));assert.ok(!html.includes('Liquid contributions'));
});
test('review retains all weight groups with a layout handoff and no new onboard/cargo controls',()=>{
 const html=renderToStaticMarkup(createElement(LoadingCondition,{...props,section:'review',onLayout:()=>{}}));
 for(const text of ['Edit in Cargo layout','Calculated loading condition','Fixed vessel weights','Liquid contributions'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('Add onboard weight'));assert.ok(!html.includes('>Add weight<'));
});
test('fuel and service editors show only relevant groups in English and Romanian',()=>{
 for(const language of ['en','ro'])for(const scope of ['fuel','service']){
  const html=renderToStaticMarkup(createElement(LanguageContext.Provider,{value:{language,setLanguage:()=>{}}},createElement(TankControls,{...props,scope})));
  const heading=scope==='fuel'?(language==='en'?'Fuel':'Combustibil'):(language==='en'?'Service liquids':'Lichide de serviciu');
  assert.ok(html.includes(heading));assert.ok(!html.includes('NaN'));
  if(language==='en'){assert.equal(html.includes('Heavy fuel oil'),scope==='fuel');assert.equal(html.includes('Fresh water'),scope==='service');}
 }
});
