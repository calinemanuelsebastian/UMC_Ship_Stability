import {useState} from 'react';
import {useLanguage} from '../app/language-context';
import {useReference} from '../app/reference-context';
import {deckDefinition,type TweenDeckMode} from '../app/tween-deck';
import {planDeckChange} from '../app/onboard-operations';
import {evaluateWeights,type WeightDraft} from '../app/loading-state';
import type {ShipModelPackage} from '../core/domain/ship-model';
export function OnboardEquipment({ship,weights,mode,onChange,onUndo,canUndo,ready,error}:{ship:ShipModelPackage;weights:WeightDraft[];mode:TweenDeckMode;onChange:(mode:TweenDeckMode)=>void;onUndo:()=>void;canUndo:boolean;ready:boolean;error:string}){
 const {t}=useLanguage(),reference=useReference();const [choice,setChoice]=useState(mode);
 const deck=deckDefinition(ship);if(!deck)return null;
 const plan=planDeckChange(ship,weights,choice),current=evaluateWeights(weights).result,next=evaluateWeights(plan.weights).result;
 return <section className="panel"><h2>{t('Movable equipment')}</h2><p>{t('Machinery already included in lightship is not added again. Use other onboard weights for additional equipment.')}</p>
 <label>{t('Tween-deck configuration')}<select aria-label={t('Onboard tween-deck configuration')} value={choice} onChange={e=>setChoice(e.target.value as TweenDeckMode)}><option value="installed">{t('Installed')}</option><option value="stored">{t(deck.storedLabel??'Stored onboard')}</option>{mode==='ashore'&&<option value="ashore">{t('Legacy: removed ashore')}</option>}</select></label>
 <p>{t('Current configuration')}: {t(mode==='installed'?'Installed':mode==='stored'?'Stored onboard':'Legacy: removed ashore')}</p>
 {choice!==mode&&current&&next&&<p role="status">{t('After applying')}: {next.displacementTonnes.toFixed(3)} t · LCG {reference.toDisplay('x',next.lcg)?.toFixed(3)} m · KG {reference.toDisplay('z',current.vcg)?.toFixed(3)} → {reference.toDisplay('z',next.vcg)?.toFixed(3)} m</p>}
 <p>{t('Storing the panels onboard keeps their mass and uses the documented storage centre. It does not necessarily lower KG. Cargo spaces and the 3D model follow this setting.')}</p>
 {choice!==mode&&plan.blocked.length>0&&<p role="alert">{t('Move or remove cargo affected by this deck configuration before applying.')}: {plan.blocked.length} ({plan.blocked.slice(0,3).map(w=>w.name).join(', ')})</p>}
 <div className="scene-toolbar"><button disabled={!ready||choice===mode||!next||plan.blocked.length>0} onClick={()=>onChange(choice)}>{t('Apply deck configuration')}</button><button disabled={!canUndo} onClick={onUndo}>{t('Undo deck change')}</button></div>
 {error&&<p role="alert">{t(error)}</p>}
 <details><summary>{t('Source and applicability')}</summary><p>{deck.source}</p>{deck.notes?.map(note=><p key={note}>{note}</p>)}</details>
 </section>;
}
