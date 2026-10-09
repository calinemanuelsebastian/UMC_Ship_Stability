import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {rollTables,rollFactor,weatherRoll,gustLever,weatherAreas}=await server.ssrLoadModule('/src/core/stability/weather-criterion.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const points=[[-30,-.6],[0,0],[10,.2],[20,.4],[30,.2],[40,0],[50,-.2]].map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected,kn:0,gz:0}));
const curve={points};
test('all IMO factor knots, midpoints and endpoint plateaus',()=>{for(const table of Object.values(rollTables)){for(const [x,y]of table)close(rollFactor(table,x),y);for(let i=1;i<table.length;i++)close(rollFactor(table,(table[i][0]+table[i-1][0])/2),(table[i][1]+table[i-1][1])/2);close(rollFactor(table,table[0][0]-1),table[0][1]);close(rollFactor(table,table.at(-1)[0]+1),table.at(-1)[1]);}});
test('roll formula has a hand-calculable independent result',()=>{
 // B/d=2, KG/d-1=0, C=.376, T=10, s=.079; k=X1=X2=1.
 const i={beam:20,draft:10,lwl:100,cb:.7,kg:10,gm:1.504**2,bilgeArea:0};
 const r=weatherRoll(i);close(r.period,10);close(r.angle,109*Math.sqrt(.73*.079));close(gustLever(.1),.15);
});
test('empirical limits and bad data reject unsupported roll estimates',()=>{
 const i={beam:20,draft:10,lwl:100,cb:.7,kg:10,gm:1.504**2,bilgeArea:0};
 for(const bad of [{beam:35},{kg:6.9},{kg:15.1},{gm:0},{gm:.01},{cb:1.1},{bilgeArea:-1},{lwl:NaN}])assert.throws(()=>weatherRoll({...i,...bad}));
 for(const v of [-1,NaN,Infinity])assert.throws(()=>gustLever(v));
});
test('analytic energy areas integrate radians with exact gust intersections',()=>{
 // phi0=5, start=-5, gust=.15, crossings 7.5 and 32.5.
 const a=weatherAreas(curve,.1,10,45);close(a.start,-5);close(a.first,7.5);close(a.end,32.5);
 close(a.a,1.5625*Math.PI/180);close(a.b,3.125*Math.PI/180);close(a.margin,a.b-a.a);
 const clipped=weatherAreas(curve,.1,10,25);close(clipped.end,25);close(clipped.b,2.5625*Math.PI/180);
});
test('missing port curve and unknown/early flooding limits do not produce energy totals',()=>{
 assert.throws(()=>weatherAreas({points:points.filter(p=>p.heelDeg>=0)},.1,10,45),/coverage/);
 assert.throws(()=>weatherAreas(curve,.1,10,NaN));assert.throws(()=>weatherAreas(curve,.1,10,5));
 assert.throws(()=>weatherAreas({...curve,downflooding:{firstReachedAngle:30}},.1,10,45),/flooding/);
});
test('non-unique roots and truncated upper coverage never extrapolate',()=>{
 assert.throws(()=>weatherAreas({points:points.slice(0,4)},.1,10,45),/coverage/);
 assert.throws(()=>weatherAreas({points:[[-30,-.6],[0,0],[10,.2],[20,0],[30,.2],[40,0]].map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected}))},.1,10,45));
});
