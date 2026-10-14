import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {autoDunnageBatch}=await server.ssrLoadModule('/src/app/auto-dunnage.ts');
const area=id=>({id,name:id,xMin:id==='hold-2'?10:0,xMax:id==='hold-2'?20:10,yMin:0,yMax:10,deckZ:0,clearHeight:8});
const cargo=(id,x,areaId='hold-1')=>({id,name:'Cargo',category:'cargo',massTonnes:'1',lcg:String(x),tcg:'5',vcg:'.5',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,areaId,dunnageProfile:'boxed'}});
// Fixture boundary bearing is explicitly declared; production defaults do not assume it.
const settings={boundarySource:'Test fixture bearing wall',length:1,width:1,thickness:.05,mass:1,material:'Pine timber',densityKgM3:470,massMode:'calculated',count:1,gap:0,direction:'x'};
let n=0;const batch=(cargo,selection=[],extra={})=>autoDunnageBatch({cargo,selection,areas:[area('hold-1'),area('hold-2')],settings,maxGap:.2,walls:false,id:()=>`d${++n}`,...extra});
test('no selection fills eligible gaps across all loading areas',()=>{
 const result=batch([cargo('a',2),cargo('b',3.1),cargo('c',12,'hold-2'),cargo('d',13.1,'hold-2')]);
 assert.equal(result.parts.length,2);assert.equal(new Set(result.parts.map(w=>w.footprint.areaId)).size,2);
 assert.ok(result.parts.every(w=>Math.abs(Number(w.massTonnes)-.00235)<1e-9));
});
test('one selected unit can fill a gap beside an unselected neighbour without changing unrelated gaps',()=>{
 const units=[cargo('a',2),cargo('b',3.1),cargo('c',4.2),cargo('d',12,'hold-2'),cargo('e',13.1,'hold-2')];
 const result=batch(units,['a']);assert.equal(result.parts.length,1);assert.ok(Math.abs(Number(result.parts[0].lcg)-2.55)<1e-8);
 assert.equal(batch(units,['b']).parts.length,2);
});
test('repeated addition does not duplicate existing spacers and yields an empty result',()=>{
 const units=[cargo('a',2),cargo('b',3.1)];const first=batch(units);assert.equal(first.parts.length,1);
 const next=batch([...units,...first.parts]);assert.equal(next.parts.length,0);assert.equal(next.skipped,1);
});
test('selection limits hold-boundary fill; selecting only dunnage never falls back to every cargo',()=>{
 const units=[cargo('a',.6),cargo('b',10.6,'hold-2')];assert.equal(batch(units,['a'],{walls:true}).parts.length,1);
 const d={...cargo('support',5),footprint:{...cargo('support',5).footprint,kind:'dunnage'}};
 assert.equal(batch([...units,d],['support'],{walls:true}).parts.length,0);
});
test('profiles, empty cargo and too-wide gaps provide distinct diagnostics',()=>{
 assert.equal(batch([]).targetCount,0);
 const unknown=cargo('a',2);delete unknown.footprint.dunnageProfile;
 assert.equal(batch([unknown],['a']).excluded,0);assert.equal(batch([unknown],['a']).eligibleCount,1);
 unknown.footprint.dunnageProfile='ventilated';assert.equal(batch([unknown],['a']).eligibleCount,0);
 const result=batch([cargo('a',2),cargo('b',4)]);assert.equal(result.eligibleCount,2);assert.equal(result.parts.length,0);
});

test('existing cargo without profiles receives dunnage across holds with nothing selected',()=>{
 const units=[cargo('a',.6),cargo('b',1.7),cargo('c',10.6,'hold-2'),cargo('d',11.7,'hold-2')];
 units.forEach((w,i)=>{if(i%2)w.footprint.dunnageProfile='unspecified';else delete w.footprint.dunnageProfile;});
 const result=batch(units,[],{walls:true});assert.equal(result.parts.length,4);assert.equal(result.excluded,0);
 assert.equal(batch([...units,...result.parts],[],{walls:true}).parts.length,0);
 assert.equal(batch(units,['a'],{walls:true}).parts.length,2);
});

test('four cargo blocks form a connected cross including its centre, and old strips can be repaired',()=>{
 const units=[cargo('a',2),cargo('b',3.4),{...cargo('c',2),tcg:'6.4'},{...cargo('d',3.4),tcg:'6.4'}];
 const result=batch(units,[],{maxGap:.5});assert.equal(result.parts.length,5);
 const centre=result.parts.find(w=>Math.abs(Number(w.lcg)-2.7)<1e-8&&Math.abs(Number(w.tcg)-5.7)<1e-8);
 assert.ok(centre);assert.ok(Math.abs(Number(centre.massTonnes)-.4*.4*.05*470/1000)<1e-9);
 const strips=result.parts.filter(w=>w!==centre);const repair=batch([...units,...strips],[],{maxGap:.5});assert.equal(repair.parts.length,1);
 assert.equal(batch([...units,...result.parts],[],{maxGap:.5}).parts.length,0);
});
test('open three-sided junction remains empty',()=>{
 const units=[cargo('a',2),cargo('b',3.4),{...cargo('c',2),tcg:'6.4'}];
 assert.equal(batch(units,[],{maxGap:.5}).parts.length,2);
});

test('staggered rows fill both halves of a facing gap and repair an existing half spacer',()=>{
 const units=[cargo('a',2),{...cargo('b',3.4),tcg:'4.5'},{...cargo('c',3.4),tcg:'5.5'}];
 const first=batch(units,[],{maxGap:.5});assert.equal(first.parts.length,2);
 assert.ok(Math.abs(first.parts.reduce((sum,w)=>sum+w.footprint.length*w.footprint.width,0)-.4)<1e-8);
 const repair=batch([...units,first.parts[0]],[],{maxGap:.5});assert.equal(repair.parts.length,1);
 assert.equal(batch([...units,...first.parts],[],{maxGap:.5}).parts.length,0);
});

test('frame batch reports actual member mass and does not fill its own openings on repeat',()=>{
 const a={...cargo('a',2),footprint:{...cargo('a',2).footprint,width:4}},b={...cargo('b',4),footprint:{...cargo('b',4).footprint,width:4}};
 const frameSettings={...settings,arrangement:'frame',solidLimit:.2,memberWidth:.1,bearerSpacing:1};
 const result=batch([a,b],[],{maxGap:2,settings:frameSettings});assert.ok(result.parts.length>1);assert.ok(result.massTonnes<result.solidMassTonnes);
 assert.equal(result.massTonnes,result.parts.reduce((sum,w)=>sum+Number(w.massTonnes),0));
 assert.equal(batch([a,b,...result.parts],[],{maxGap:2,settings:frameSettings}).parts.length,0);
 const obstacle={...cargo('obstacle',3),tcg:'6.95',footprint:{...cargo('obstacle',3).footprint,length:.1,width:.1,dunnageProfile:'ventilated'}};
 const blocked=batch([a,b,obstacle],[],{maxGap:2,settings:frameSettings});assert.equal(blocked.parts.length,0);assert.equal(blocked.massTonnes,0);assert.equal(blocked.solidMassTonnes,0);
});
