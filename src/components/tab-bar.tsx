import {GuideLink} from '../app/user-guide';
import { useLanguage } from '../app/language-context';
import { tabs, type TabId } from '../app/tabs';
const primary = [ ['home', 'Overview'], ['loading', 'Loading'], ['view3d', 'Inspect'], ['stability', 'Assess'], ['theory', 'Learn'] ] as const;
const groups = [{label:'Advanced tools', ids:['hydrostatics','roll','validation']}];
const help = {hydrostatics:'hydrostatics',roll:'roll',validation:'validation',theory:'theory',stability:'assessment',trim:'assessment'} as const;
export function TabBar({ activeTab, onChange }: { activeTab: TabId; onChange: (id: TabId) => void }) {
  const { t } = useLanguage();
  return <nav aria-label={t('Simulator sections')} className="tab-bar">
    <label className="mobile-workspace-nav"><span className="visually-hidden">{t('Workspace')}</span><select aria-label={t('Workspace')} value={activeTab==='trim'?'stability':activeTab} onChange={event=>onChange(event.target.value as TabId)}><optgroup label={t('Workspace')}>{primary.map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</optgroup>{groups.map(group=><optgroup key={group.label} label={t(group.label)}>{tabs.filter(tab=>group.ids.includes(tab.id)).map(tab=><option key={tab.id} value={tab.id}>{t(tab.label)}</option>)}</optgroup>)}</select></label>
    {primary.map(([id,label]) => <button key={id} aria-current={activeTab===id || id==='stability' && activeTab==='trim' ? 'page' : undefined} onClick={()=>onChange(id)}>{t(label)}</button>)}
    {groups.map(group=><label key={group.label} className="support-tools"><span className="visually-hidden">{t(group.label)}</span><select aria-label={t(group.label)} value={group.ids.includes(activeTab)?activeTab:''} onChange={event=>onChange(event.target.value as TabId)}>
      <option value="" disabled>{t(group.label)}</option>{tabs.filter(tab=>group.ids.includes(tab.id)).map(tab=><option key={tab.id} value={tab.id}>{t(tab.label)}</option>)}
    </select></label>)}
    {!['home','loading','view3d'].includes(activeTab)&&<GuideLink topic={help[activeTab as keyof typeof help]}/>}</nav>;
}
