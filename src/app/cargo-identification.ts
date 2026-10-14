export type CargoMarkings={scheme:'internal'|'sscc'|'iso6346';sscc?:string;container?:string;port?:string;color?:string;company?:string;image?:string;pattern?:'plain'|'stripes'|'dots';handling?:string;unNumber?:string;hazard?:string;shippingName?:string;layers:{identity:boolean;destination:boolean;company:boolean;handling:boolean;dangerous:boolean}};
export const emptyMarkings=():CargoMarkings=>({scheme:'internal',pattern:'plain',color:'#bfdbfe',layers:{identity:true,destination:true,company:true,handling:true,dangerous:true}});
export function validSSCC(s:string){if(!/^\d{18}$/.test(s))return false;const sum=[...s.slice(0,17)].reduce((n,c,i)=>n+Number(c)*(i%2===0?3:1),0);return (10-sum%10)%10===Number(s[17]);}
export function validContainer(s:string){if(!/^[A-Z]{3}U\d{7}$/.test(s))return false;let sum=0;for(let i=0;i<10;i++){const c=s[i];let v=Number(c);if(!/\d/.test(c)){const n=c.charCodeAt(0)-65;v=10+n+Math.floor((n+9)/10);}sum+=v*2**i;}return sum%11%10===Number(s[10]);}
export function parseCargoMarkings(raw:unknown):CargoMarkings{
 if(!raw||typeof raw!=='object')throw new Error('Invalid cargo identification.');const r=raw as CargoMarkings;
 if(!['internal','sscc','iso6346'].includes(r.scheme))throw new Error('Choose an identification scheme.');
 const result=emptyMarkings();result.scheme=r.scheme;
 for(const key of ['sscc','container','port','company','handling','unNumber','hazard','shippingName'] as const){const v=r[key];if(v!==undefined){if(typeof v!=='string'||v.length>160)throw new Error('Cargo marking text is too long.');if(v.trim())result[key]=v.trim();}}
 if(result.sscc&&!validSSCC(result.sscc))throw new Error('SSCC must contain 18 digits with a valid GS1 check digit.');
 if(result.container&&!validContainer(result.container))throw new Error('Container ID must have three owner letters, U, six serial digits and a valid ISO 6346 check digit.');
 if(r.scheme==='sscc'&&!result.sscc||r.scheme==='iso6346'&&!result.container)throw new Error('Enter the identifier for the selected scheme.');
 if(r.color!==undefined){if(!/^#[a-f\d]{6}$/i.test(r.color))throw new Error('Invalid cargo colour.');result.color=r.color;}
 if(r.pattern!==undefined){if(!['plain','stripes','dots'].includes(r.pattern))throw new Error('Invalid cargo pattern.');result.pattern=r.pattern;}
 if(r.image){if(typeof r.image!=='string'||r.image.length>24000||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(r.image))throw new Error('Use a small embedded PNG logo.');result.image=r.image;}
 if(result.unNumber&&!/^\d{4}$/.test(result.unNumber))throw new Error('Enter the four-digit UN number.');
 if(result.hazard&&!/^(1\.[1-6][ABCDEFGHJKLNS]?|2\.[1-3]|3|4\.[1-3]|5\.[12]|6\.[12]|7|8|9)$/.test(result.hazard))throw new Error('Enter an IMDG class/division, with compatibility group for Class 1 if known.');
 if(r.layers){for(const key of Object.keys(result.layers) as (keyof CargoMarkings['layers'])[]){if(typeof r.layers[key]!=='boolean')throw new Error('Invalid identification layer settings.');result.layers[key]=r.layers[key];}}
 return result;
}
export function cloneMarkings(m:CargoMarkings|undefined){if(!m)return undefined;const {sscc:_,container:__,...rest}=m;return {...rest,scheme:'internal' as const};}
export function validateUniqueIdentifiers(weights:{footprint?:{markings?:CargoMarkings}}[]){for(const key of ['sscc','container'] as const){const seen=new Set<string>();for(const w of weights){const v=w.footprint?.markings?.[key];if(v){if(seen.has(v))throw new Error('External cargo identifiers must be unique within this condition.');seen.add(v);}}}}
export function markingLines(w:{id:string;name:string;footprint?:{keepGapsClear?:boolean;stackability?:string;markings?:CargoMarkings}}){const m=w.footprint?.markings;if(!m)return [w.name,...(w.footprint?.keepGapsClear?['KEEP GAPS CLEAR']:[])];const lines:string[]=[];
 if(m.layers.identity)lines.push(w.name,m.scheme==='sscc'?`SSCC (00) ${m.sscc}`:m.scheme==='iso6346'?`ISO 6346 ${m.container}`:`ID ${w.id.slice(0,8)}`);
 if(m.layers.destination&&m.port)lines.push(m.port);
 if(m.layers.company&&m.company)lines.push(m.company);
 if(m.layers.handling){if(w.footprint?.keepGapsClear)lines.push('KEEP GAPS CLEAR');if(m.handling)lines.push(m.handling);if(w.footprint?.stackability==='unstackable')lines.push('NO STACK');}
 if(m.layers.dangerous&&(m.hazard||m.unNumber))lines.push(`DG ${m.hazard??'?'}${m.unNumber?' · UN '+m.unNumber:''}`,m.shippingName??'');
 return lines.filter(Boolean);
}
