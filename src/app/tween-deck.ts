import type {WeightDraft} from './loading-state';
import type {ShipModelPackage} from '../core/domain/ship-model';
export type TweenDeckMode = 'installed' | 'stored' | 'ashore';
type DeckWeight={massTonnes:number;lcg:number;vcg:number;tcg:number};
export type StoredPanel={id:string;x:number;y:number;z:number};
export type DeckDefinition={notes?:string[];source?:string;storedLabel?:string;weights:({id:string}&Record<TweenDeckMode,DeckWeight>)[];storedPanels:StoredPanel[]};
export function deckDefinition(ship?:ShipModelPackage):DeckDefinition|undefined {
 const raw=ship?.manifest.resources.find(r=>r.kind==='loading.cargo-surfaces')?.config?.deck;
 if(raw===undefined)return undefined;
 const d=raw as DeckDefinition;
 if(!d||!Array.isArray(d.weights)||!d.weights.length||!Array.isArray(d.storedPanels))throw new Error('Invalid deck definition.');
 if(d.notes!==undefined&&(!Array.isArray(d.notes)||!d.notes.every(v=>typeof v==='string')))throw new Error('Invalid deck notes.');
 const ids=new Set<string>();for(const w of d.weights){if(!w.id||ids.has(w.id))throw new Error('Deck weight IDs must be unique.');ids.add(w.id);for(const mode of ['installed','stored','ashore'] as const){const v=w[mode];if(!v||![v.massTonnes,v.lcg,v.vcg,v.tcg].every(Number.isFinite)||v.massTonnes<0)throw new Error('Invalid deck mass or centre.');}if(w.installed.massTonnes!==w.stored.massTonnes||w.ashore.massTonnes!==0)throw new Error('Onboard deck storage must preserve mass; ashore mass must be zero.');}
 const nodes=new Set<string>();for(const p of d.storedPanels){if(typeof p.id!=='string'||!p.id||nodes.has(p.id)||![p.x,p.y,p.z].every(Number.isFinite))throw new Error('Invalid stored panel placement.');nodes.add(p.id);}
 return d;
}
export function panelWeight(base:WeightDraft,mode:TweenDeckMode,ship?:ShipModelPackage):WeightDraft {
 const value=deckDefinition(ship)?.weights.find(w=>w.id===base.id)?.[mode];
 return value?{...base,massTonnes:String(value.massTonnes),lcg:String(value.lcg),vcg:String(value.vcg),tcg:String(value.tcg),freeSurfaceMomentTransverse:'0'}:base;
}
export function parseDeckMode(value:unknown):TweenDeckMode {
 if(value===undefined||value==='installed')return 'installed';
 if(value==='ashore'||value==='stored')return value;
 throw new Error('Invalid tween-deck configuration.');
}
