import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {WeatherAssessment}=await server.ssrLoadModule('/src/components/weather-assessment.tsx');
const {LanguageContext}=await server.ssrLoadModule('/src/app/language-context.ts');
const curve={condition:{vcg:10,tcg:0},gmAtTrim:{correctedGm:2},points:[[-30,-.6],[0,0],[10,.2],[20,.4],[30,.2],[40,0]].map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected})),warnings:[]};
test('weather panel shows individual missing fields and export without inventing inputs',()=>{
 const html=renderToStaticMarkup(createElement(WeatherAssessment,{curve,steady:.1,draft:10,beam:20,bilgeArea:0}));
 for(const value of ['Numerical weather assessment','Insufficient data','Missing or invalid inputs','Waterline length LWL','Deck-edge immersion angle','Download weather assessment','Source or assumption'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});
test('weather assessment headings and status translate to Romanian',()=>{
 const html=renderToStaticMarkup(createElement(LanguageContext.Provider,{value:{language:'ro',setLanguage:()=>{}}},createElement(WeatherAssessment,{curve,steady:.1,draft:10,beam:20,bilgeArea:0})));
 assert.ok(html.includes('Evaluarea numerică a criteriului meteorologic'));assert.ok(html.includes('Date insuficiente'));assert.ok(html.includes('Descarcă evaluarea meteorologică'));
});
