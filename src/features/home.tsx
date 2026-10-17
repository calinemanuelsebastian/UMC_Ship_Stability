import {CapabilitiesSummary} from '../app/site-information';
import { useLanguage } from '../app/language-context';
import type { TabId } from '../app/tabs';
import type { LoadingSection } from '../app/navigation';

export function Home({onTabChange,onLoadingSection}: {
  onTabChange:(page:TabId)=>void;onLoadingSection:(section:LoadingSection)=>void;
}) {
  const {t}=useLanguage();
  return <div className="home-workspace">
    <div className="page-heading"><p className="eyebrow">{t('Your ship workspace')}</p><h1>{t('Plan the load. Explore the ship.')}</h1><p>{t('Start with cargo and tanks, then inspect the same condition in 3D.')}</p></div>
    <CapabilitiesSummary/>
    <div className="home-primary">
      <section className="home-feature home-loading">
        <WorkspaceDrawing kind="loading"/>
        <div className="home-feature-body"><p className="eyebrow">{t('01 · Prepare')}</p><h2>{t('Loading')}</h2><p>{t('Arrange cargo in the holds, adjust tank contents and review onboard weights.')}</p>
          <button onClick={()=>onLoadingSection('onboard')}>{t('Prepare onboard condition')} <span aria-hidden="true">→</span></button>
          <div className="home-shortcuts"><button onClick={()=>onLoadingSection('ballast')}>{t('Ballast')}</button><button onClick={()=>onLoadingSection('layout')}>{t('Cargo layout')}</button><button onClick={()=>onLoadingSection('plans')}>{t('Saved cargo plans')}</button><button onClick={()=>onLoadingSection('weights')}>{t('Review totals')}</button></div>
        </div>
      </section>
      <section className="home-feature home-visual">
        <WorkspaceDrawing kind="view3d"/>
        <div className="home-feature-body"><p className="eyebrow">{t('02 · Explore')}</p><h2>{t('3D View')}</h2><p>{t('Inspect the hull and cargo, adjust visibility and explore heel and trim in Teaching mode.')}</p>
          <button onClick={()=>onTabChange('view3d')}>{t('Open 3D workspace')} <span aria-hidden="true">→</span></button>
          <p className="home-feature-note">{t('The viewer uses the selected vessel and current condition. Available simulations depend on the vessel data.')}</p>
        </div>
      </section>
      <section className="home-feature home-assessment">
        <WorkspaceDrawing kind="assessment"/>
        <div className="home-feature-body"><p className="eyebrow">{t('03 · Assess')}</p><h2>{t('Assessment')}</h2><p>{t('Review stability, weather and trim results, including any missing data, before exporting a report.')}</p>
          <button onClick={()=>onTabChange('stability')}>{t('Review assessment')} <span aria-hidden="true">→</span></button>
          <div className="home-shortcuts"><button onClick={()=>onTabChange('trim')}>{t('Trim & Drafts')}</button></div>
        </div>
      </section>
    </div>
  </div>;
}

/** Decorative workflow illustrations; these do not depict the selected hull geometry. */
function WorkspaceDrawing({kind}:{kind:'loading'|'view3d'|'assessment'}) {
  return <svg className="home-illustration" viewBox={kind==='loading'?'0 0 500 140':'0 0 500 190'} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    {kind==='assessment'?<g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M65 25V150H450"/>
      <path d="M65 115H440M65 80H440M65 45H440M150 25V150M235 25V150M320 25V150M405 25V150" strokeOpacity=".15"/>
      <path d="M65 150C120 130 160 53 235 45S350 72 425 150Z" fill="currentColor" fillOpacity=".1" stroke="none"/>
      <path d="M65 150C120 130 160 53 235 45S350 72 425 150" strokeWidth="4"/>
      <text x="28" y="30" fill="currentColor" stroke="none" fontSize="18">GZ</text><text x="448" y="174" fill="currentColor" stroke="none" fontSize="18">φ</text>
    </g>:kind==='loading'?<g fill="none" stroke="currentColor" strokeWidth="2"><path d="M40 28H380L466 70 380 112H40Z"/><path d="M72 43H224V97H72ZM244 43H368V97H244Z"/>{[0,1,2,3,4,5].map(i=><rect key={i} x={82+i%3*44} y={51+Math.floor(i/3)*23} width="35" height="16" rx="2" fill="currentColor" fillOpacity=".2"/>)}<path d="M250 70H356M303 48V92" strokeDasharray="4 4"/></g>:<ShipBanner/>}
  </svg>;
}

/** All parts share one parallel projection; deck footprints stay inside the hull. */
function ShipBanner() {
  const point=(x:number,y:number,z=0)=>`${62+.94*x+.55*y},${87+.32*y-z}`;
  const polygon=(points:number[][])=>points.map(([x,y,z=0])=>point(x,y,z)).join(' ');
  const hatch=(x:number)=>polygon([[x,12],[x+82,12],[x+82,52],[x,52]]);
  return <g stroke="#42647d" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
    {/* A level water plane replaces the detached shadow, keeping the vessel grounded. */}
    <polygon points={polygon([[-24,-24,-17],[364,-24,-17],[364,88,-17],[-24,88,-17]])} fill="#cbdfe9" stroke="none"/>
    <path d={`M${point(-15,78,-17)} L${point(345,78,-17)}`} stroke="#a3c7d8" strokeWidth="1"/>
    {/* Stern and starboard shell, drawn below the shared deck plane. */}
    <polygon points={polygon([[0,0],[0,64],[8,58,-25],[8,6,-25]])} fill="#7899b0"/>
    <polygon points={polygon([[0,64],[300,64],[340,32],[320,32,-25],[282,58,-25],[8,58,-25]])} fill="#aac3d4"/>
    <polygon points={polygon([[0,0],[300,0],[340,32],[300,64],[0,64]])} fill="#e7eff4"/>
    {/* Hatch covers use the same deck projection, with clear margins on all sides. */}
    {[94,193].map(x=><g key={x}><polygon points={hatch(x)} fill="#88a9ba"/>{[1,2,3].map(i=><path key={i} d={`M${point(x+i*20.5,12)} L${point(x+i*20.5,52)}`} fill="none" stroke="#5c8097" strokeWidth="1"/>)}</g>)}
    {/* Accommodation block base is exactly on the deck; verticals share its corners. */}
    <polygon points={polygon([[15,10],[15,54],[15,54,30],[15,10,30]])} fill="#c0d2df"/>
    <polygon points={polygon([[15,54],[65,54],[65,54,30],[15,54,30]])} fill="#d8e4ed"/>
    <polygon points={polygon([[15,10,30],[65,10,30],[65,54,30],[15,54,30]])} fill="#f8fbfd"/>
    {[23,37,51].map(x=><polygon key={x} points={polygon([[x,54,16],[x+9,54,16],[x+9,54,23],[x,54,23]])} fill="#42647d" stroke="none"/>)}
    <path d={`M${point(8,58,-16)} L${point(282,58,-16)} L${point(327,32,-16)}`} fill="none" stroke="#327d96" strokeWidth="3"/>
    {/* Decorative orientation triad follows the same projection as the vessel. */}
    <g transform="translate(25 0)">
    <g fill="none" strokeWidth="2">
      <path d="M385 155H429M423 151L429 155 423 159" stroke="#b34b4b"/>
      <path d="M385 155L411 170M404 170L411 170 408 164" stroke="#408568"/>
      <path d="M385 155V123M381 129L385 123 389 129" stroke="#427caf"/>
    </g>
    <g stroke="none" fontSize="13" fontWeight="600">
      <text x="435" y="159" fill="#b34b4b">x</text>
      <text x="416" y="179" fill="#408568">y</text>
      <text x="381" y="117" fill="#427caf">z</text>
    </g>
    </g>
  </g>;
}
