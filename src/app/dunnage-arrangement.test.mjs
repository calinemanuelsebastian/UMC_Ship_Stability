import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {dunnageMembers}=await server.ssrLoadModule('/src/app/dunnage-arrangement.ts');
const f={x:4,y:5,z:1.2,length:4,width:2};const options={arrangement:'frame',solidLimit:.2,memberWidth:.1,bearerSpacing:1};
test('open frames conserve material and members stay inside their envelope without overlapping',()=>{
 const members=dunnageMembers(f,options);assert.equal(members.length,7);
 const volume=members.reduce((sum,m)=>sum+m.length*m.width,0);assert.ok(volume<8);
 for(const m of members){assert.ok(m.x-m.length/2>=2-1e-8&&m.x+m.length/2<=6+1e-8);assert.ok(m.y-m.width/2>=4-1e-8&&m.y+m.width/2<=6+1e-8);assert.equal(m.z,1.2);}
 for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){const a=members[i],b=members[j];assert.ok(Math.min(a.x+a.length/2,b.x+b.length/2)-Math.max(a.x-a.length/2,b.x-b.length/2)<=1e-8||Math.min(a.y+a.width/2,b.y+b.width/2)-Math.max(a.y-a.width/2,b.y-b.width/2)<=1e-8);}
});
test('small gaps remain solid and axes can be exchanged',()=>{
 const narrow={...f,width:.15};assert.deepEqual(dunnageMembers(narrow,options),[narrow]);
 const a=dunnageMembers(f,options),b=dunnageMembers({...f,length:2,width:4},options);assert.equal(a.length,b.length);
 assert.equal(a.reduce((v,m)=>v+m.length*m.width,0),b.reduce((v,m)=>v+m.length*m.width,0));
 assert.deepEqual(dunnageMembers(f,{arrangement:'solid'}),[f]);
 assert.throws(()=>dunnageMembers(f,{...options,memberWidth:0}));
});
