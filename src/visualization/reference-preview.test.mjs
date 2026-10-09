import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {default:Ship3DView}=await server.ssrLoadModule('/src/features/ship-3d-view.tsx');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
const props={ship:{manifest,baseUrl:'/'},pending:true,weights:[],setWeights:()=>{},fromWeights:false,movementHistory:{},onTabChange:()=>{},lcg:999,tcg:888,vcg:777,displacementTonnes:13000,trimDensity:1.025,freeSurfaceMomentTransverse:0,longitudinalFsm:0};
test('incomplete loading renders a locked upright reference with original CG values',()=>{
 const html=renderToStaticMarkup(createElement(Ship3DView,props));
 assert.match(html,/<select disabled=""><option value="upright" selected="">/);
 assert.match(html,/Upright reference preview/);
 const inspector=html.split('Upright visual reference only')[1].split('</section>')[0];
 for(const value of [manifest.defaultCondition.lcg,manifest.defaultCondition.tcg,manifest.defaultCondition.vcg]) assert.ok(inspector.includes(new Intl.NumberFormat('en',{maximumFractionDigits:4}).format(value)));
 assert.doesNotMatch(inspector,/999|888|777/);
 assert.doesNotMatch(html,/Heel display ·/);
});
test('valid loading restores the mode selector and removes the fallback notice',()=>{
 const html=renderToStaticMarkup(createElement(Ship3DView,{...props,pending:false}));
 assert.doesNotMatch(html,/<select disabled=""><option value="upright"/);
 assert.doesNotMatch(html,/Upright reference preview/);
});
