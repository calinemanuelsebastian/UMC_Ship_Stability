import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../../scripts/test-server.mjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(async()=>{delete globalThis.localStorage;await server.close()});
const {translate}=await server.ssrLoadModule('/src/app/language-context.ts');
const {LanguageProvider,LanguageSwitch}=await server.ssrLoadModule('/src/app/language.tsx');
const {Theory}=await server.ssrLoadModule('/src/features/theory.tsx');
const {ResultsTable}=await server.ssrLoadModule('/src/components/results-table.tsx');
const {TabBar}=await server.ssrLoadModule('/src/components/tab-bar.tsx');
const manifest=JSON.parse(await readFile('public/built-in-ship-models/training-pontoon-100x20/manifest.json','utf8'));
const render=(element,language)=>{globalThis.localStorage={getItem:()=>language};return renderToStaticMarkup(createElement(LanguageProvider,null,element));};
test('translations preserve numerical values, unknown names and English',()=>{
 assert.equal(translate('Displacement','ro'),'Deplasament');assert.equal(translate('Displacement','en'),'Displacement');
 const object={value:123.456};assert.equal(translate(object,'ro'),object);assert.equal(translate(123.456,'ro'),123.456);
 assert.equal(translate('My own vessel name','ro'),'My own vessel name');assert.equal(translate(' KN ','ro'),' KN ');
});
test('dynamic messages retain exact values and variable names',()=>{
 assert.equal(translate('12 of 12 cases passed.','ro'),'12 din 12 cazuri validate.');
 assert.match(translate('Interpolation value 6 is outside the available table range 1 - 5.','ro'),/6.*1.*5/);
 assert.match(translate('Remove weight 2: Custom name','ro'),/Elimină.*2.*Custom name/);
});
test('all navigation labels render in both languages',()=>{
 const en=render(createElement(TabBar,{activeTab:'loading',onChange:()=>{}}),'en');
 const ro=render(createElement(TabBar,{activeTab:'loading',onChange:()=>{}}),'ro');
 assert.equal((ro.match(/<button/g)||[]).length,4);assert.match(en,/Overview/);assert.match(ro,/Privire de ansamblu/);assert.match(en,/Loading/);assert.match(ro,/Încărcare/);assert.match(ro,/Simularea ruliului/);
});
test('theory retains sections, equations and action buttons after translation',()=>{
 const element=createElement(Theory,{ship:{manifest,baseUrl:'/'},onTabChange:()=>{}});
 for(const language of ['en','ro']){
  const html=render(element,language);assert.equal((html.match(/<section/g)||[]).length,8);assert.equal((html.match(/<button/g)||[]).length,6);assert.match(html,/GZ = KN/);assert.match(html,/theory-validation/);
  assert.match(html,language==='ro'?/Ruliu liber la unghiuri mici/:/Small-angle free roll/);assert.doesNotMatch(html,/&amp;lt;/);
 }
});
test('result labels translate while every result row and number remains',()=>{
 const result={displacementTonnes:6150,gmTransverseCorrected:7.511};
 const ro=render(createElement(ResultsTable,{result}),'ro');const en=render(createElement(ResultsTable,{result}),'en');
 assert.equal((ro.match(/<tr/g)||[]).length,(en.match(/<tr/g)||[]).length);assert.match(ro,/Deplasament/);assert.match(ro,/7,511/);assert.match(en,/7.511/);
});
test('saved Romanian selection and storage failure both render safely',()=>{
 assert.match(render(createElement(LanguageSwitch),'ro'),/value="ro" selected=""/);
 globalThis.localStorage={getItem:()=>{throw new Error('blocked')}};
 const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(LanguageSwitch)));assert.match(html,/value="en" selected=""/);
});

test('assessment navigation keeps the trim route in its primary group',()=>{
 const html=render(createElement(TabBar,{activeTab:'trim',onChange:()=>{}}),'en');
 assert.match(html,/<button aria-current="page">Assessment<\/button>/);
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
});
test('supporting routes remain available in the tool selector',()=>{
 const html=render(createElement(TabBar,{activeTab:'validation',onChange:()=>{}}),'en');
 assert.match(html,/<option value="validation" selected="">Validation<\/option>/);
 for(const id of ['hydrostatics','roll','validation','theory'])assert.ok(html.includes(`value="${id}"`));
});

test('portrait workspace selector exposes every existing route',()=>{
 const html=render(createElement(TabBar,{activeTab:'trim',onChange:()=>{}}),'en');
 assert.match(html,/class="mobile-workspace-nav"/);
 assert.match(html,/<option value="trim" selected="">Trim &amp; Drafts<\/option>/);
 for(const id of ['home','loading','view3d','stability','hydrostatics','roll','validation','theory'])assert.ok(html.includes(`value="${id}"`));
});
test('portrait condition summary supports incomplete values and translated disclosure',async()=>{
 const {ConditionSummary}=await server.ssrLoadModule('/src/components/condition-summary.tsx');
 const html=render(createElement(ConditionSummary,{name:'Vectis Castle',fromWeights:true,displacement:4500}),'ro');
 assert.match(html,/data-expanded="false"/);assert.match(html,/aria-expanded="false"/);
 assert.match(html,/Detaliile condiției/);assert.match(html,/Vectis Castle/);assert.match(html,/—/);
 assert.equal((html.match(/class="condition-extra"/g)||[]).length,3);
});

test('cargo planner starts in selection and keeps creation fields contextual',async()=>{
 const {CargoPlanner}=await server.ssrLoadModule('/src/components/cargo-planner.tsx');
 const html=render(createElement(CargoPlanner,{ship:{manifest,baseUrl:'/built-in-ship-models/training-pontoon-100x20/'},weights:[],setWeights:()=>{},setArea:()=>{},ready:false}),'en');
 assert.match(html,/>Select<\/button>/);
 assert.match(html,/Select cargo in the drawing/);
 assert.match(html,/aria-label="Cargo properties"/);
 assert.doesNotMatch(html,/>Cargo name</);
 assert.match(html,/Back to drawing/);
});
