import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {silhouetteWind}=await server.ssrLoadModule('/src/core/stability/wind-silhouette.ts');
const {assessWeatherDirections,weatherDirection}=await server.ssrLoadModule('/src/core/stability/weather-assessment.ts');
const {weatherRoll}=await server.ssrLoadModule('/src/core/stability/weather-criterion.ts');
const {conditionWind,windConfirmationKey}=await server.ssrLoadModule('/src/app/weather-wind.ts');
const {parseAssessmentSettings}=await server.ssrLoadModule('/src/app/assessment-settings.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const rect=(xMin,xMax,zMin,zMax)=>({xMin,xMax,zMin,zMax});
const c={condition:{vcg:10},gmAtTrim:{correctedGm:1.504**2},points:Array.from({length:121},(_,i)=>{const heelDeg=i-60;return {heelDeg,kn:0,gz:0,gzCorrected:.05*heelDeg-.00001*heelDeg**3};})};
const input={steady:.1,beam:20,draft:10,lwl:100,cb:.7,bilgeArea:0,deckAngle:30,floodAngle:60};
const port={deckAngle:30,floodAngle:60},evidence={profileConfirmed:true,source:'Independent synthetic case'};
test('rectangle union: waterline clipping, shielding and exact first moment',()=>{
 const r=silhouetteWind([rect(0,10,0,10),rect(5,15,8,12)],5,1000);
 // 50×7.5 + 40×10 − 10×9 = 685 m³; union area = 50+40−10 = 80 m².
 near(r.areaM2,80);near(r.centroidAboveBaselineM,8.5625);near(r.steadyLever,504*485/(1000*9.81*1000));
 near(silhouetteWind([rect(0,10,0,10),rect(0,10,0,10)],5,1000).areaM2,50);
 near(silhouetteWind([rect(0,10,0,4)],5,1000).steadyLever,0);
 assert.throws(()=>silhouetteWind([rect(1,0,0,1)],5,1000));
 assert.throws(()=>silhouetteWind([rect(0,1,0,1)],0,1000));
});
test('large repeated/stacked projections count each exposed area once',()=>{
 const r=silhouetteWind(Array.from({length:10000},(_,i)=>rect(i%100,i%100+1,10+Math.floor(i/100),11+Math.floor(i/100))),5,1000);
 near(r.areaM2,10000);near(r.centroidAboveBaselineM,60);
});
test('complete directional case; asymmetric corrected GZ is preserved',()=>{
 const r=assessWeatherDirections(c,input,port,evidence);assert.equal(r.status,'Both directions meet numerical limits');near(r.starboard.areas.a,r.port.areas.a);near(r.starboard.areas.b,r.port.areas.b);
 const asym={...c,points:c.points.map(p=>({...p,gzCorrected:p.gzCorrected-.08*Math.cos(p.heelDeg*Math.PI/180)}))};
 const a=assessWeatherDirections(asym,input,port,evidence);assert.ok(a.starboard.eq.angle>a.port.eq.angle);near(weatherDirection(asym,'port').points[60].gzCorrected,.08);
});
test('missing profile, source, windward flooding, coarse or derived curves remain incomplete',()=>{
 for(const ev of [{...evidence,profileConfirmed:false},{...evidence,source:''}])assert.equal(assessWeatherDirections(c,input,port,ev).status,'Incomplete assessment');
 assert.equal(assessWeatherDirections(c,input,{},evidence).status,'Incomplete assessment');
 assert.equal(assessWeatherDirections({...c,derivedPort:true},input,port,evidence).status,'Incomplete assessment');
 assert.equal(assessWeatherDirections({...c,points:c.points.filter((_,i)=>i%5===0)},input,port,evidence).status,'Incomplete assessment');
 const limited=assessWeatherDirections(c,input,{...port,floodAngle:5},evidence);assert.equal(limited.starboard.areas,undefined);assert.match(limited.starboard.areaError,/windward/);
 const source=assessWeatherDirections({...c,downflooding:{firstReachedAngle:5}},input,port,evidence);assert.equal(source.port.areas,undefined);
 const fail=assessWeatherDirections(c,{...input,deckAngle:1},port,evidence);assert.equal(fail.status,'Outside numerical limit');
});
test('roll configuration, inclusive OG endpoints and invalid period',()=>{
 const i={beam:20,draft:10,lwl:100,cb:.7,kg:10,gm:1.504**2,bilgeArea:0};
 near(weatherRoll({...i,bilgeType:'sharp'}).angle,.7*weatherRoll({...i,bilgeType:'round'}).angle);
 assert.doesNotThrow(()=>weatherRoll({...i,kg:7}));assert.doesNotThrow(()=>weatherRoll({...i,kg:15}));
 assert.ok(assessWeatherDirections(c,{...input,bilgeType:'sharp',bilgeArea:undefined},port,evidence).starboard.roll);assert.throws(()=>weatherRoll({...i,kg:6.99}));assert.throws(()=>weatherRoll({...i,gm:.752**2}));
});
test('source table conversion to 504 Pa, cargo edit invalidation and persisted settings',()=>{
 const data={format:'umc-wind-profiles',version:1,pressureKgPerM2:51.4,profiles:[{id:'p',label:'Profile',rows:[{draftMouldedMetres:1,areaM2:10,momentKgMetres:100},{draftMouldedMetres:10,areaM2:10,momentKgMetres:100}]}]};
 const weights=[{id:'w',category:'cargo',lcg:'5',tcg:'0',footprint:{length:2,width:1,height:2,deckZ:10,rotation:0}}];
 const settings={conditionKey:'key',profile:'p',values:{lwl:'100',cb:'.7',bilge:'0',deck:'30',flood:'60'},estimatePort:false,inputSource:'Test',profileConfirmed:true,layoutKey:windConfirmationKey(data,'p',weights),portDeck:'30',portFlood:'60',direction:'port',bilgeType:'round'};
 const w=conditionWind(data,settings,5,1000,weights);near(w.steadyLever,100/1000000*504/(51.4*9.81));assert.equal(w.profileConfirmed,true);const changedSource=structuredClone(data);changedSource.profiles[0].rows[0].momentKgMetres=101;assert.equal(conditionWind(changedSource,settings,5,1000,weights).profileConfirmed,false);
 const rotated=structuredClone(weights);rotated[0].footprint.rotation=90;assert.equal(conditionWind(data,settings,5,1000,rotated).profileConfirmed,false);
 assert.deepEqual(parseAssessmentSettings(JSON.parse(JSON.stringify({weather:settings}))),{weather:settings});
 assert.throws(()=>parseAssessmentSettings({weather:{...settings,portFlood:'NaN'}}));
 data.profiles[0].baselineSilhouette={source:'Test documented rectangles',rectangles:[rect(0,10,0,10)]};
 const union=conditionWind(data,settings,5,1000,weights);near(union.areaM2,54);assert.equal(union.pressurePa,504);
 assert.throws(()=>conditionWind(data,settings,5,1000,[{id:'unknown',category:'cargo'}]),/dimensions/);
 near(conditionWind(data,settings,6,1000,weights).areaM2,44);
});
test('independently worked linear-GZ complete case and deliberately weak energy case',()=>{
 const gz=x=>x<=20?.02*x:.8-.02*x;
 const fine={...c,points:Array.from({length:111},(_,j)=>{const heelDeg=j-60;return {heelDeg,kn:0,gz:0,gzCorrected:gz(heelDeg)};})};
 const r=assessWeatherDirections(fine,input,port,evidence).starboard;
 const roll=109*Math.sqrt(.73*.079); // independently: B/d=2, C=.376, T=10, all other factors=1.
 near(r.roll.angle,roll);near(r.eq.angle,5);near(r.areas.start,5-roll);near(r.areas.first,7.5);near(r.areas.end,32.5);
 near(r.areas.a,.01*(2.5+roll)**2*Math.PI/180);near(r.areas.b,3.125*Math.PI/180);
 assert.equal(r.numericalStatus,'Outside numerical limit');
 // Raise the restoring plateau without altering the linear ascending limb or windward energy.
 const strong={...fine,points:fine.points.map(p=>({...p,gzCorrected:p.heelDeg<=20?gz(p.heelDeg):.4}))};
 const pass=assessWeatherDirections(strong,input,port,evidence).starboard;
 near(pass.areas.a,r.areas.a);near(pass.areas.b,(1.5625+30*.25)*Math.PI/180);
 assert.equal(pass.numericalStatus,'Meets numerical limit');
});

test('silhouette sweep agrees with an independent unit-cell union on overlapping integer rectangles',()=>{
 let seed=7;const random=()=>{seed=(seed*16807)%2147483647;return seed;};
 for(let run=0;run<30;run++){
  const rectangles=Array.from({length:20},()=>{const x=random()%8,z=random()%8;return rect(x,x+1+random()%5,z,z+1+random()%5);});
  let area=0,moment=0;
  for(let x=0;x<13;x++)for(let z=3;z<13;z++)if(rectangles.some(r=>x>=r.xMin&&x<r.xMax&&z>=r.zMin&&z<r.zMax)){area++;moment+=z+.5;}
  const r=silhouetteWind(rectangles,3,1234);near(r.areaM2,area);near(r.centroidAboveBaselineM,moment/area);near(r.steadyLever,504*(moment-area*1.5)/(1000*9.81*1234));
 }
});
