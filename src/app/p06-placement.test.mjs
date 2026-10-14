import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {placeSupportedCargo,placeCargoGroup,rotateCargoGroup,intersectsCargo}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const {LayoutHistory}=await server.ssrLoadModule('/src/app/layout-history.ts');
const {deleteCargoSelection}=await server.ssrLoadModule('/src/app/delete-cargo.ts');
const {checkStackingChange}=await server.ssrLoadModule('/src/app/stackability.ts');
const {cancelsCargoDrag,bindCargoDragCancellation}=await server.ssrLoadModule('/src/app/drag-cancellation.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8};
const box=(id,x,y=2,z=0,h=1)=>({id,name:id,category:'cargo',massTonnes:'2',lcg:String(x),tcg:String(y),vcg:String(z+h*.4),freeSurfaceMomentTransverse:'0',footprint:{length:1,width:1,height:h,rotation:0,deckZ:0,bottomZ:z,areaId:'hold',stackability:'stackable',maxTopLoadTonnes:100}});
const pos=(x,y,z=0)=>({x,y,z});
test('support elevation is captured locally, not by a remote pile of another height',()=>{
 const base=box('base',5,2,0,2),remote=box('remote',12,7,0,1.6),moving=box('moving',2);
 const result=placeSupportedCargo(moving,[area],[base,remote,moving],pos(5,2,1.7),true,false);
 assert.equal(result.footprint.bottomZ,2);assert.equal(+result.vcg,2.4);
 assert.equal(placeSupportedCargo(moving,[area],[base,remote,moving],pos(8,2,1.7),true,false).footprint.bottomZ,0);
});
test('nearby partial contact and blocked headroom cannot fall through to another level',()=>{
 const base=box('base',5,2,0,2),moving=box('moving',2);
 assert.throws(()=>placeSupportedCargo(moving,[area],[base,moving],pos(5.3,2,2),true,false),/fully supported/);
 assert.throws(()=>placeSupportedCargo(moving,[{...area,clearHeight:2.8}],[base,moving],pos(5,2,2),true,false),/height/);
});
test('face contact tolerates numerical noise, not a physical intersection or projection-only overlap',()=>{
 const a=box('a',3),touch=box('b',4-1e-10),collision=box('c',4-1e-5),behind=box('d',3,4);
 assert.equal(intersectsCargo(a,touch),false);assert.equal(intersectsCargo(a,collision),true);assert.equal(intersectsCargo(a,behind),false);
});
test('stepped boundaries reject an entire rigid edit; inputs remain byte-for-byte unchanged',()=>{
 const stepped={...area,regions:[{xMin:0,xMax:10,yMin:0,yMax:10},{xMin:10,xMax:20,yMin:3,yMax:7}]};
 const group=[box('a',3),box('b',5)],snapshot=JSON.stringify(group);
 assert.throws(()=>placeCargoGroup(group,'a',[stepped],group,pos(9,2),false,false),/boundary|fit/);
 assert.equal(JSON.stringify(group),snapshot);
});
test('spanning adjoining hatch panels is allowed; an unsupported seam is not',()=>{
 const panels=[{id:'A',xMin:0,xMax:10,yMin:0,yMax:10},{id:'B',xMin:10,xMax:20,yMin:0,yMax:10}];
 const hatch={...area,id:'hatch-top',deckZ:12,panels,supportRegions:panels};const cargo=box('c',2);
 const placed=placeSupportedCargo(cargo,[hatch],[],pos(10,5,12),false,false);assert.equal(placed.footprint.deckZ,12);assert.equal(+placed.vcg,12.4);
 assert.throws(()=>placeSupportedCargo(cargo,[{...hatch,supportRegions:[panels[0],{...panels[1],xMin:10.2}]}],[],pos(10,5,12),false,false),/gap/);
});
test('centred paste, four rotations, delete, undo and redo preserve geometry and mass',()=>{
 const group=[box('a',3),box('b',5)],settings={grid:false,cargo:undefined};let serial=0;
 const preview=pasteCargoGroup(group,area,group,()=>`preview-${serial++}`,false,0,{x:10,y:5},settings);
 const copies=pasteCargoGroup(group,area,group,()=>`copy-${serial++}`,false,0,{x:10,y:5},settings);
 assert.deepEqual(preview.map(({id:_id,...w})=>w),copies.map(({id:_id,...w})=>w));assert.equal((+copies[0].lcg + +copies[1].lcg)/2,10);
 let turned=copies;for(let i=0;i<4;i++)turned=rotateCargoGroup(turned,[area],[...group,...turned]);assert.deepEqual(turned,copies);
 const all=[...group,...copies],history=new LayoutHistory();history.record(group,all,'hold');assert.deepEqual(history.step(all,'hold'),group);assert.deepEqual(history.step(group,'hold',true),all);
 const removed=deleteCargoSelection(all,copies.map(w=>w.id),all.map(w=>w.id));assert.deepEqual(removed,group);
 history.record(all,removed,'hold');assert.deepEqual(history.step(removed,'hold'),all);
 assert.equal(all.reduce((n,w)=>n + +w.massTonnes,0),8);
});
test('moving an entire stack preserves vertical spacing; non-stackable cargo still blocks direct loading',()=>{
 const base={...box('base',3),footprint:{...box('base',3).footprint,stackability:'unstackable'}},top=box('top',3,2,1);
 assert.throws(()=>checkStackingChange([base],[base,top]),/Non-stackable/);
 const stack=[box('base',3),top],moved=placeCargoGroup(stack,'top',[area],stack,pos(8,4,1),true,false);
 assert.deepEqual(moved.map(w=>w.footprint.bottomZ),[0,1]);assert.deepEqual(moved.map(w=>+w.vcg),[.4,1.4]);
 assert.throws(()=>deleteCargoSelection(stack,['base'],['base','top']),/supported/);
});
test('editing commands cancel a provisional drag; modifiers alone do not',()=>{
 for(const key of ['Escape','Delete','r','3','ArrowRight'])assert.equal(cancelsCargoDrag({key,ctrlKey:false,metaKey:false,altKey:false}),true);
 for(const key of ['a','z','v'])assert.equal(cancelsCargoDrag({key,ctrlKey:true,metaKey:false,altKey:false}),true);
 for(const key of ['Shift','Control','Alt'])assert.equal(cancelsCargoDrag({key,ctrlKey:false,metaKey:false,altKey:false}),false);
});
test('blur/hidden/Escape discard provisional edits and cleanup removes handlers',()=>{
 const target=new EventTarget(),page=Object.assign(new EventTarget(),{hidden:false});let draft={x:7},committed={x:2},calls=0;
 const stop=bindCargoDragCancellation(target,page,()=>{draft=undefined;calls++;});
 const release=()=>{if(draft)committed=draft;};
 target.dispatchEvent(Object.assign(new Event('keydown'),{key:'Escape'}));release();assert.deepEqual(committed,{x:2});
 draft={x:8};target.dispatchEvent(new Event('blur'));release();assert.deepEqual(committed,{x:2});
 page.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);
 draft={x:9};page.hidden=true;page.dispatchEvent(new Event('visibilitychange'));release();assert.deepEqual(committed,{x:2});assert.equal(calls,3);
 stop();target.dispatchEvent(new Event('blur'));assert.equal(calls,3);
});
