export type TrimLimits = {draftReference:'moulded';trimPositive:'bow';source:string;rows:{draftMetres:number;minimumTrimMetres:number;maximumTrimMetres:number}[]};
export function parseTrimLimits(raw:unknown):TrimLimits {
 const d=raw as TrimLimits;
 if(!d||d.draftReference!=='moulded'||d.trimPositive!=='bow'||typeof d.source!=='string'||!d.source.trim()||!Array.isArray(d.rows)||d.rows.length<2)throw new Error('Invalid permissible-trim limits.');
 d.rows.forEach((r,i)=>{if(![r.draftMetres,r.minimumTrimMetres,r.maximumTrimMetres].every(Number.isFinite)||r.draftMetres<=0||r.minimumTrimMetres>r.maximumTrimMetres||i>0&&r.draftMetres<=d.rows[i-1].draftMetres)throw new Error('Invalid permissible-trim row.');});
 return d;
}
export function assessTrim(d:TrimLimits,draft:number,trim:number) {
 parseTrimLimits(d);
 if(![draft,trim].every(Number.isFinite)||draft<d.rows[0].draftMetres||draft>d.rows.at(-1)!.draftMetres)throw new Error('Moulded draught is outside the documented trim-limit range. No extrapolation.');
 const hi=d.rows.findIndex(r=>r.draftMetres>=draft),lo=d.rows[hi].draftMetres===draft?hi:Math.max(0,hi-1),a=d.rows[lo],b=d.rows[hi];
 const f=hi===lo?0:(draft-a.draftMetres)/(b.draftMetres-a.draftMetres);
 const minimum=a.minimumTrimMetres+f*(b.minimumTrimMetres-a.minimumTrimMetres),maximum=a.maximumTrimMetres+f*(b.maximumTrimMetres-a.maximumTrimMetres);
 const lowerMargin=trim-minimum,upperMargin=maximum-trim,margin=Math.min(lowerMargin,upperMargin);
 return {trim,draft,minimum,maximum,lowerMargin,upperMargin,margin,status:margin>=-1e-10?'Within documented limits':'Outside documented limits'};
}
