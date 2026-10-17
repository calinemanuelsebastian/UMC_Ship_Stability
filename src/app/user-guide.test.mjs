import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {UserGuide,GuideLink}=await server.ssrLoadModule('/src/app/user-guide.tsx');
const {guideTopics}=await server.ssrLoadModule('/src/app/user-guide-content.ts');
const {LanguageContext}=await server.ssrLoadModule('/src/app/language-context.ts');
const {informationUrl,readInformationPage}=await server.ssrLoadModule('/src/app/site-information-state.ts');
test('guide navigation preserves the workspace and clears only guide route on return',()=>{const u=new URL('https://example.com/UMC_Ship_Stability/?page=loading&vessel=castle&section=layout');const next=informationUrl(u,'guide');next.searchParams.set('topic','supports');assert.equal(readInformationPage(next),'guide');assert.equal(informationUrl(next,null).href,u.href);assert.equal(informationUrl(next,'privacy').searchParams.has('topic'),false);});
test('every guide topic has unique links and bilingual operational content',()=>{assert.equal(new Set(guideTopics.map(r=>r[0])).size,guideTopics.length);for(const row of guideTopics){assert.ok(row[3].length>100&&row[4].length>100);const link=renderToStaticMarkup(createElement(GuideLink,{topic:row[0]}));assert.ok(link.includes('topic='+row[0]));}for(const language of ['en','ro']){const html=renderToStaticMarkup(createElement(LanguageContext.Provider,{value:{language,setLanguage(){}}},createElement(UserGuide)));assert.ok(html.includes(language==='ro'?'Flux complet':'Complete workflow'));assert.equal((html.match(/class="guide-link"/g)||[]).length,guideTopics.length);}});
test('practice is isolated, reversible and bounds stacking to a supported second layer',async()=>{
 const {practiceAction,emptyPractice}=await server.ssrLoadModule('/src/app/guide-practice-state.ts');
 const initial=structuredClone(emptyPractice),one=practiceAction(initial,'place');assert.equal(initial.units.length,0);assert.equal(one.units.length,1);
 assert.deepEqual(practiceAction(one,'stack'),one);
 const supported=practiceAction(one,'support'),stacked=practiceAction(supported,'stack');assert.equal(stacked.units[1].level,1);assert.equal(supported.units.length,1);assert.deepEqual(practiceAction(stacked,'stack'),stacked);
 const moved=practiceAction(one,'pan');assert.deepEqual(moved.units,one.units);assert.notEqual(moved.pan,one.pan);
 const copied=practiceAction(one,'copy');assert.equal(copied.units.length,2);assert.notEqual(copied.units[0].x,copied.units[1].x);
});
test('task guides include steps and expected outcomes in both languages',async()=>{const {lessons,examples,troubleshooting}=await server.ssrLoadModule('/src/app/guide-lessons.ts');for(const key of ['start','onboard','capacity','layout','selection','supports','dunnage','ballast','view3d','assessment','save']){assert.ok(lessons[key].steps.length>=3);assert.ok(lessons[key].result.every(x=>x.length>30));}assert.equal(examples.length,3);assert.ok(troubleshooting.length>=6);});
