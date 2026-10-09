import {DownfloodingResults} from './downflooding-results';
import type { StabilityResult } from '../core/domain/stability-result';
import { heelEquilibrium } from '../core/stability/heel-equilibrium';
import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
export function HeelEquilibriumResults({result}: {result: StabilityResult}) {
 const {t}=useLanguage(); const reference=useReference(); const solution=heelEquilibrium(result);
 return <section>{result.downflooding&&<DownfloodingResults result={result.downflooding}/>}<h2>{t('Static heel equilibrium')}</h2><p role="status">{t(solution.message)}</p>
 {solution.equilibrium && <p><strong>{t('Equilibrium heel')}: {(solution.equilibrium.heelDeg*reference.heelSign).toFixed(4)}°</strong></p>}
 <p>{t('Corrected GZ = 0; a crossing from negative to positive GZ is locally stable. Angles are estimated by linear interpolation between curve samples. No external heeling moment or coupled trim equilibrium is included.')}</p>
 {solution.neutralIntervals.length>0 && <p>{t('Neutral intervals of the interpolated curve')}: {solution.neutralIntervals.map(range => [range.fromDeg*reference.heelSign,range.toDeg*reference.heelSign].sort((a,b)=>a-b).map(n=>n.toFixed(4)).join('° … ')+'°').join('; ')}</p>}
 {solution.roots.length>0 && <table><thead><tr><th>{t('Heel (°)')}</th><th>{t('Local equilibrium')}</th></tr></thead><tbody>{solution.roots.map((root,i)=><tr key={i}><td>{(root.heelDeg*reference.heelSign).toFixed(4)}</td><td>{t(root.stability)}</td></tr>)}</tbody></table>}
 <p className="muted">{t(result.downflooding ? 'A local equilibrium is not a stability approval. Only the supplied flooding samples are screened; exact onset, dynamic response and the path to equilibrium remain unresolved.' : 'A local equilibrium is not a stability approval. Downflooding, dynamic response and the path to equilibrium are not evaluated. Roots at the limits of the supplied curve cannot be classified.')}</p></section>;
}
