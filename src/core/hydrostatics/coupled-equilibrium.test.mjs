import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {immersedBox,solveBoxEquilibrium,rotateEquilibriumPoint,computeCoupledEquilibrium,hasCoupledEquilibrium}=await server.ssrLoadModule('/src/core/hydrostatics/coupled-equilibrium.ts');
const {hullPose,exaggerateTrim}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
const b={length:100,beam:20,depth:8},rho=1.025,mass=8200;
const close=(a,c,t=1e-7)=>assert.ok(Math.abs(a-c)<t,`${a} != ${c}`);
test('clipped box reproduces independent upright volume and centroid',()=>{
 for(const depth of [.01,1,4,7.99]){const r=immersedBox(b,[0,1,0],depth);close(r.volume,2000*depth);close(r.centre[0],0);close(r.centre[1],depth/2);close(r.centre[2],0);}
});
test('upright equilibrium has analytic immersion and buoyancy',()=>{const r=solveBoxEquilibrium(b,mass,rho,[0,4,0]);close(r.heave,-4);close(r.heel,0);close(r.pitch,0);close(r.buoyancy[1],2);close(r.verticalDraftAft,4);});
test('simultaneous signed heel and trim conserve volume and balance world moments',()=>{
 for(const x of [-1,1])for(const z of [-.4,.4]){
 const r=solveBoxEquilibrium(b,mass,rho,[x,4,z]);assert.ok(Math.abs(r.pitch)>0&&Math.abs(r.heel)>0);
 const B=rotateEquilibriumPoint(r.buoyancy,r.pitch,r.heel),G=rotateEquilibriumPoint([x,4,z],r.pitch,r.heel);close(B[0],G[0]);close(B[2],G[2]);close(r.volume,mass/rho);
 for(const p of r.waterline)close(rotateEquilibriumPoint(p,r.pitch,r.heel)[1]+r.heave,0);
 // Independently integrate y=T+a*x+c*z while all corners pierce the vertical sides.
 const a=-Math.tan(r.pitch),c=Math.tan(r.heel)/Math.cos(r.pitch),T=-r.heave/(Math.cos(r.heel)*Math.cos(r.pitch));
 close(r.volume,b.length*b.beam*T);
 close(r.buoyancy[0],a*b.length**2/(12*T));close(r.buoyancy[2],c*b.beam**2/(12*T));
 close(r.buoyancy[1],T/2+(a*a*b.length**2+c*c*b.beam**2)/(24*T));
 close(r.verticalDraftAft,-rotateEquilibriumPoint([-50,0,0],r.pitch,r.heel)[1]-r.heave);
 }
});
test('small-angle heel agrees with analytic GM, mirrored CG mirrors heel',()=>{
 const r=solveBoxEquilibrium(b,mass,rho,[0,4,.001]),s=solveBoxEquilibrium(b,mass,rho,[0,4,-.001]);
 const gm=2+20**2/(12*4)-4;close(r.heel,.001/gm,1e-9);close(r.heel,-s.heel,1e-9);
});
test('impossible displacement, unstable roots and invalid inputs fail closed',()=>{
 for(const m of [0,16400,17000])assert.throws(()=>solveBoxEquilibrium(b,m,rho,[0,4,0]));
 assert.throws(()=>solveBoxEquilibrium(b,mass,rho,[0,20,0]),/unstable/);
 assert.throws(()=>solveBoxEquilibrium(b,mass,NaN,[0,4,0]));
 assert.throws(()=>solveBoxEquilibrium(b,mass,rho,[0,4,50]));
});
test('shared solution gates geometry and liquid corrections, survives reference conventions',async()=>{
 const manifest=JSON.parse(await readFile('public/built-in-ship-models/training-pontoon-100x20/manifest.json','utf8'));
 const ship={manifest,baseUrl:'/'},c={displacementTonnes:mass,waterDensity:rho,lcg:51,tcg:.4,vcg:4,heelDeg:0,trimDeg:0,freeSurfaceMomentTransverse:0};
 assert.equal(hasCoupledEquilibrium(ship),true);
 const r=await computeCoupledEquilibrium(ship,c,0);assert.equal(await computeCoupledEquilibrium(ship,c,0),r);
 const reverse=structuredClone(ship);Object.assign(reverse.manifest.coordinateSystem,{longitudinalOriginFromAP:50,xPositive:'aft',yPositive:'port',zPositive:'down'});
 const s=await computeCoupledEquilibrium(reverse,{...c,lcg:-1,tcg:-.4,vcg:-4},0);close(r.heel,s.heel);close(r.pitch,s.pitch);
 await assert.rejects(computeCoupledEquilibrium(ship,{...c,freeSurfaceMomentTransverse:10},0),/liquid/);
 await assert.rejects(computeCoupledEquilibrium(ship,c,10),/liquid/);
 const unavailable=structuredClone(ship);unavailable.manifest.resources=[];
 await assert.rejects(computeCoupledEquilibrium(unavailable,c),/validated/);
 const data={draftAft:r.draftAft,draftForward:r.draftForward,equilibriumPose:r};assert.equal(hullPose(b,data),r);assert.equal(exaggerateTrim(b,data,5),undefined);
});
