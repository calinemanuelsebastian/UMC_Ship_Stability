type Unit={x:number;y:number;turned:boolean;level:number};
export type PracticeState={units:Unit[];selected:number;pan:number;support:boolean};
export const emptyPractice:PracticeState={units:[],selected:-1,pan:0,support:false};
export function practiceAction(s:PracticeState,action:string):PracticeState{
 if(action==='place')return {...s,units:[...s.units,{x:50+s.units.length%4*85,y:140,turned:false,level:0}],selected:s.units.length};
 if(action==='copy'&&s.selected>=0&&s.units.length<8)return {...s,units:[...s.units,{...s.units[s.selected],x:50+s.units.length%4*85}],selected:s.units.length};
 if(action==='pan')return {...s,pan:s.pan===0?30:0};
 if(action==='support')return {...s,support:true};
 if(action==='stack'&&s.support&&s.selected>=0&&s.units[s.selected].level===0&&s.units.length<8){const u=s.units[s.selected];return {...s,units:[...s.units,{...u,level:u.level+1}],selected:s.units.length};}
 if(action==='rotate'&&s.selected>=0)return {...s,units:s.units.map((u,i)=>i===s.selected?{...u,turned:!u.turned}:u)};
 return s;
}
