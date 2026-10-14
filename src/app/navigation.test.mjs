import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {readNavigation,navigationUrl}=await server.ssrLoadModule('/src/app/navigation.ts');
test('page, vessel and loading section round-trip in links',()=>{
 const url=navigationUrl(new URL('https://example.com/simulator/'),{page:'loading',vessel:'castle',section:'onboard'});
 assert.deepEqual(readNavigation(url,['pontoon','castle']),{page:'loading',vessel:'castle',section:'onboard'});
 assert.equal(url.pathname,'/simulator/');
});
test('unknown bookmarks fall back to available pages and models',()=>{
 assert.deepEqual(readNavigation(new URL('https://example.com/?page=bad&vessel=missing&section=bad'),['pontoon']),{page:'home',vessel:'pontoon',section:'onboard'});
});
test('legacy theory anchors select theory and are removed when leaving it',()=>{
 const url=new URL('https://example.com/?page=loading#theory-hydrostatics');
 assert.equal(readNavigation(url,['pontoon']).page,'theory');
 const next=navigationUrl(url,{page:'view3d'});assert.equal(next.hash,'');assert.equal(readNavigation(next,['pontoon']).page,'view3d');
});
test('navigation preserves unrelated query parameters and never adds loading inputs',()=>{
 const next=navigationUrl(new URL('https://example.com/?theme=dark'),{page:'trim',vessel:'castle'});
 assert.equal(next.searchParams.get('theme'),'dark');assert.deepEqual([...next.searchParams.keys()],['theme','page','vessel']);
});

test('new visits open Home while explicit simulator bookmarks remain valid',()=>{
 assert.equal(readNavigation(new URL('https://example.com/'),['pontoon']).page,'home');
 assert.equal(readNavigation(new URL('https://example.com/?page=hydrostatics'),['pontoon']).page,'hydrostatics');
});

test('old tank bookmarks open the unified workplan',()=>{assert.equal(readNavigation(new URL('https://example.com/?page=loading&section=tanks'),['pontoon']).section,'onboard');});
