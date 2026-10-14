import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {emptySecuringGroup,assessSecuringGroup,assessSecuringPlan,securingReviewKey,parseSecuringPlan}=await server.ssrLoadModule('/src/app/securing-assessment.ts');
const {parseAssessmentSettings}=await server.ssrLoadModule('/src/app/assessment-settings.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const area={id:'floor',name:'Floor',xMin:-20,xMax:20,yMin:-20,yMax:20,deckZ:0};
const cargo=(id='cargo',m=10,z=0)=>({id,name:id,category:'cargo',massTonnes:String(m),lcg:'0',tcg:'0',vcg:String(z+.5),freeSurfaceMomentTransverse:'0',footprint:{length:4,width:4,height:1,rotation:0,deckZ:0,bottomZ:z,areaId:'floor'}});
const w=[cargo()];
const group=()=>({...emptySecuringGroup('ship'),cargoIds:['cargo'],referenceStatus:'current',source:'Test-only applicable source',confirmed:true,reviewKey:securingReviewKey(w,'case',[area]),values:{ax:'1',ay:'2',az:'1',friction:'.3',forceX:'0',forceY:'0',forceHeight:'0',x:'0',y:'0',z:'0',length:'4',width:'4',bearingKPa:'100'}});
const run=(g,weights=w,areas=[area])=>assessSecuringGroup(g,weights,areas,'ship',securingReviewKey(weights,'case',areas));
const row=(r,label)=>r.rows.find(x=>x.label===label);
const lash=(id='one',changes={})=>({id,anchorId:id,material:'chain',source:'Rated series components',msl:'150',anchorMsl:'30',cargoMsl:'60',azimuth:'180',elevation:'0',...changes});
const support=(id,kind='pad',changes={})=>({id,kind,source:'Test design values, not density',capacity:'1000',area:'.1',compression:'20',span:'2',width:'.2',depth:'.3',bending:'100',shear:'10',joint:'1000',...changes});
test('hand-worked two-axis sliding, tipping, CG and eccentric bearing',()=>{
 const r=run(group());assert.equal(r.status,'Screened within declared limits');near(r.mass,10);near(row(r,'Sliding x+').capacity,26.43);near(row(r,'Sliding y+').demand,20);near(row(r,'Tipping y+').demand,10);near(row(r,'Tipping y+').capacity,176.2);
 near(row(r,'Rectangular full-contact bearing').demand,108.1/16+6*5/64+6*10/64);
 const eccentric=[{...cargo(),lcg:'.2'}],g={...group(),values:{...group().values,length:'5'}};const e=run(g,eccentric);near(row(e,'Tipping x+').capacity,88.1*2.3);assert.match(e.issues.join(' '),/Review/);
});
test('weakest series rating caps restraint and ineffective directions receive no credit',()=>{
 const g=group();g.values.friction='0';g.lashings=[lash()];const r=run(g);near(r.lines[0].csKN,20);near(row(r,'Sliding x+').capacity,20);near(row(r,'Sliding x−').capacity,0);assert.equal(row(r,'Sliding x−').status,'Exceeds declared limit');
 g.lashings=[lash('vertical',{elevation:'90'})];assert.ok(row(run(g),'Sliding x+').capacity<1e-10);
 g.lashings=[lash('bad',{anchorMsl:''})];assert.equal(row(run(g),'Sliding x+').status,'Not assessed');
});
test('mixed lashings require load-sharing evidence; shared anchors and supports stay unresolved',()=>{
 const g=group();g.lashings=[lash(),lash('two',{material:'wire'})];assert.equal(row(run(g),'Sliding x+').status,'Not assessed');g.loadSharingSource='Compatible stiffness/load allocation test';near(row(run(g),'Sliding x+').capacity,66.43);
 g.lashings[1].anchorId='one';assert.equal(row(run(g),'Sliding x+').status,'Not assessed');
 const a=group(),b={...group(),id:'another'};assert.ok(assessSecuringPlan({groups:[a,b]},w,[area],'ship','case').groups.every(r=>r.status==='Incomplete assessment'));
});
test('uplift, partial lift, absent friction, invalid acceleration and dangling cargo cannot pass',()=>{
 for(const change of [{az:'10'},{friction:''},{ax:'-1'},{length:'0'}])assert.notEqual(run({...group(),values:{...group().values,...change}}).status,'Screened within declared limits');
 const g=group();g.values.ax='12';assert.equal(row(run(g),'Rectangular full-contact bearing').status,'Not assessed');
 g.cargoIds=['deleted'];assert.equal(run(g).rows.length,0);
 assert.ok(run(group(),[cargo(),cargo('above',1,2)]).issues.some(i=>i.includes('shares')));
 const floating=[cargo('cargo',10,3)];assert.ok(run(group(),floating).issues.some(i=>i.includes('contact plane')));
});
test('support roles, crushing, beam bending/shear and weak racks/joints use actual total mass',()=>{
 const d=cargo('support',1);d.footprint.kind='dunnage';const weights=[d,cargo('cargo',10,1)],g={...group(),cargoIds:['cargo','support'],unitised:true,supports:[support('support','beam')]};const r=run(g,weights),q=11*10.81;
 near(r.mass,11);near(row(r,'Crushing support').demand,q/.1/1000);near(row(r,'Bending support').demand,q*2/4/(.2*.3*.3/6)/1000);near(row(r,'Shear support').demand,1.5*q/(2*.2*.3)/1000);
 g.supports=[support('support','rack',{capacity:'1',joint:'2'})];assert.equal(row(run(g,weights),'rack support').status,'Exceeds declared limit');assert.equal(row(run(g,weights),'Joint support').status,'Exceeds declared limit');
 g.supports=[support('support','pad',{compression:'',source:'Density 500 kg/m³'})];assert.equal(row(run(g,weights),'Crushing support').status,'Not assessed');
});
test('hatch spanning identifies both panels without allocating invented reactions',()=>{
 const a={...area,panels:[{id:'P1',xMin:-20,xMax:0,yMin:-20,yMax:20},{id:'P2',xMin:0,xMax:20,yMin:-20,yMax:20}]};const r=run(group(),w,[a]);assert.deepEqual(r.panels,['P1','P2']);assert.ok(r.issues.some(i=>i.includes('spans hatch')));
});
test('settings persist editable inputs only and geometry/condition changes revoke review',()=>{
 const g=group(),plan={groups:[g]};assert.deepEqual(parseAssessmentSettings({securing:{...plan,verdict:'PASS'}}),{securing:plan});
 assert.throws(()=>parseSecuringPlan({groups:[{...g,values:{...g.values,ax:'NaN'}}]}));assert.throws(()=>parseSecuringPlan({groups:[g,g]}));
 assert.notEqual(securingReviewKey(w,'case',[area]),securingReviewKey(w,'changed',[area]));
 const changed=structuredClone(w);changed[0].footprint.rotation=90;assert.notEqual(securingReviewKey(w,'case',[area]),securingReviewKey(changed,'case',[area]));
 assert.equal(run({...g,referenceStatus:'superseded'}).rows.length,0);assert.ok(run({...g,vesselId:'wrong'}).issues.some(i=>i.includes('different vessel')));
 const other=assessSecuringGroup({...g,vesselId:'reviewed-apples-vessel',source:'Vectis Isle / YZJ2011-999'},w,[area],'reviewed-apples-vessel',g.reviewKey);assert.ok(other.issues.some(i=>i.includes('does not establish')));
});
test('group settings survive full condition import and stale results are discarded',async()=>{
 const {parseScenario}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
 const saved={version:1,id:'test',name:'Test condition',model:'synthetic',savedAt:'2026-10-13T08:00:00Z',state:{scenario:'loading',weights:w,manual:{},manualMode:'displacement',assessment:{securing:{groups:[group()],results:{status:'PASS'}}}}};
 const parsed=parseScenario(JSON.parse(JSON.stringify(saved)),'synthetic');assert.deepEqual(parsed.state.assessment.securing,{groups:saved.state.assessment.securing.groups});
 const result=assessSecuringPlan(parsed.state.assessment.securing,w,[area],'ship','case');assert.equal(result.groups[0].status,'Screened within declared limits');assert.match(result.longitudinalStrength,/Not assessed/);
});
test('environmental forces, eccentric tipping and changed support geometry stay explicit',()=>{
 const g=group();g.values.forceX='4';g.values.forceY='8';g.values.forceHeight='2';const r=run(g);near(row(r,'Sliding x+').demand,14);near(row(r,'Tipping x+').demand,13);near(row(r,'Tipping y+').demand,26);
 const d=cargo('support',1);d.footprint.kind='dunnage';const weights=[d,cargo('cargo',10,1)],beam={...g,cargoIds:['cargo','support'],unitised:true,supports:[support('support','beam',{span:'20',area:'30'})]};const b=run(beam,weights);assert.ok(b.issues.some(i=>i.includes('physical footprint')));assert.ok(b.issues.some(i=>i.includes('Beam dimensions')));
 const nearZero=group();nearZero.values.friction='0.000001';near(row(run(nearZero),'Sliding x+').capacity,.0000881);
});
