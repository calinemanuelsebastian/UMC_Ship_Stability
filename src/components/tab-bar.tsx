import {GuideLink} from '../app/user-guide';
import { useLanguage } from '../app/language-context';
import { tabs, type TabId } from '../app/tabs';
const primary = [ ['home', 'Overview'], ['loading', 'Loading'], ['view3d', '3D inspection'], ['stability', 'Assessment'] ] as const;
const tools = tabs.filter(tab => ['hydrostatics', 'roll', 'validation', 'theory'].includes(tab.id));
export function TabBar({ activeTab, onChange }: { activeTab: TabId; onChange: (id: TabId) => void }) {
  const { t } = useLanguage();
  return <nav aria-label={t('Simulator sections')} className="tab-bar">
    <label className="mobile-workspace-nav"><span className="visually-hidden">{t('Workspace')}</span><select aria-label={t('Workspace')} value={activeTab} onChange={event=>onChange(event.target.value as TabId)}><optgroup label={t('Workspace')}>{primary.map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}<option value="trim">{t('Trim & Drafts')}</option></optgroup><optgroup label={t('Supporting tools')}>{tools.map(tab=><option key={tab.id} value={tab.id}>{t(tab.label)}</option>)}</optgroup></select></label>
    {primary.map(([id,label]) => <button key={id} aria-current={activeTab===id || id==='stability' && activeTab==='trim' ? 'page' : undefined} onClick={()=>onChange(id)}>{t(label)}</button>)}
    <label className="support-tools"><span className="visually-hidden">{t('Supporting tools')}</span><select aria-label={t('Supporting tools')} value={tools.some(tab=>tab.id===activeTab)?activeTab:''} onChange={event=>onChange(event.target.value as TabId)}>
      <option value="" disabled>{t('Supporting tools')}</option>{tools.map(tab=><option key={tab.id} value={tab.id}>{t(tab.label)}</option>)}
    </select></label>
    {!['home','loading','view3d'].includes(activeTab)&&<GuideLink topic="assessment"/>}</nav>;
}
