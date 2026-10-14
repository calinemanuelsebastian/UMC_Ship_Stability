import {tabs,type TabId} from './tabs';
export const loadingSections=['onboard','capacity','layout','ballast','tanks','weights','plans'] as const;
export type LoadingSection=typeof loadingSections[number];
export function readNavigation(url:URL,modelIds:string[]) {
 const requested=url.searchParams.get('page');
 const page:TabId=url.hash.startsWith('#theory-')?'theory':tabs.find(t=>t.id===requested)?.id??'home';
 const requestedModel=url.searchParams.get('vessel');
 const vessel=modelIds.includes(requestedModel??'')?requestedModel!:modelIds[0]??'';
 const requestedSection=url.searchParams.get('section');
 const section=requestedSection==='tanks'?'onboard':loadingSections.find(s=>s===requestedSection)??'onboard';
 return {page,vessel,section};
}
export function navigationUrl(current:URL,change:{page?:TabId;vessel?:string;section?:LoadingSection}):URL {
 const url=new URL(current);
 if(change.page){url.searchParams.set('page',change.page);if(change.page!=='theory')url.hash='';}
 if(change.vessel)url.searchParams.set('vessel',change.vessel);
 if(change.section)url.searchParams.set('section',change.section);
 return url;
}
/** Only navigational state belongs in links; cargo data stays in saved plans. */
export function writeNavigation(change:Parameters<typeof navigationUrl>[1],replace=false) {
 const next=navigationUrl(new URL(window.location.href),change);
 if(next.href!==window.location.href)window.history[replace?'replaceState':'pushState'](null,'',next);
}
