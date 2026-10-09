import { useId } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';

/** Two orthographic schematics; hull outlines are illustrative, not model geometry. */
export function ReferenceDiagram({ ship }: { ship: ShipModelPackage }) {
  const { settings } = useReference();
  const { t } = useLanguage();
  const id = useId();
  const source = ship.manifest.coordinateSystem;
  const active = settings.profile === 'source' ? source : settings;
  const offset = settings.profile === 'source' ? 0 : settings.longitudinalOrigin;
  const lbp = ship.manifest.principalDimensions.lbp;
  const originAP = source.longitudinalOriginFromAP;
  const position = originAP === undefined ? undefined : originAP + offset * (source.xPositive === 'forward' ? 1 : -1);
  const located = position !== undefined && Number.isFinite(position) && Number.isFinite(lbp) && lbp > 0;
  const outside = located && (position < 0 || position > lbp);
  // Outside origins are pinned beyond the hull and explicitly marked off-scale.
  const ox = located ? position < 0 ? 55 : position > lbp ? 505 : 100 + 360 * position / lbp : 280;
  const xEnd = ox + (active.xPositive === 'forward' ? 40 : -40);
  const yEnd = 100 + (active.yPositive === 'starboard' ? 55 : -55);
  const zEnd = 115 + (active.zPositive === 'up' ? -65 : 45);
  const summary = `+x: ${t(active.xPositive)}; +y: ${t(active.yPositive)}; +z: ${t(active.zPositive)}`;
  return <figure className="reference-diagram">
    <figcaption><strong>{t('Reference-system diagram')}</strong><span>{t('Illustrative hull · not to scale')}</span></figcaption>
    <svg viewBox="0 0 560 200" role="img" aria-labelledby={`${id}-plan-title ${id}-plan-desc`}>
      <title id={`${id}-plan-title`}>{t('Top view')}</title><desc id={`${id}-plan-desc`}>{summary}. {t(located ? 'O marks the selected origin.' : 'Origin position is unknown; O is schematic.')}</desc>
      <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      <text x="18" y="22">{t('Top view')}</text>
      <path className="reference-hull" d="M100 65 L360 65 Q425 65 460 100 Q425 135 360 135 L100 135 Z" />
      <path className="reference-datum" d="M85 100 H475" />
      <text x="95" y="184">{t('Stern')}</text><text x="450" y="184" textAnchor="end">{t('Bow')}</text>
      <g className="reference-axis" markerEnd={`url(#${id}-arrow)`}><path d={`M${ox} 100 H${xEnd}`} /><path d={`M${ox} 100 V${yEnd}`} /></g>
      <circle cx={ox} cy="100" r="4" className="reference-origin" />
      <text x={ox - 10} y="90" textAnchor="end">O</text><text x={xEnd} y="90" textAnchor="middle">+x</text><text x={ox + 10} y={yEnd + 4}>+y</text>
    </svg>
    <svg viewBox="0 0 560 200" role="img" aria-labelledby={`${id}-side-title ${id}-side-desc`}>
      <title id={`${id}-side-title`}>{t('Side view')}</title><desc id={`${id}-side-desc`}>{summary}. {t('Baseline and centreline are unchanged.')}</desc>
      <text x="18" y="22">{t('Side view')}</text>
      <path className="reference-hull" d="M100 65 H460 L425 115 H115 Z" />
      <path className="reference-datum" d="M85 115 H475" />
      <text x="95" y="184">{t('Stern')}</text><text x="450" y="184" textAnchor="end">{t('Bow')}</text>
      <g className="reference-axis" markerEnd={`url(#${id}-arrow)`}><path d={`M${ox} 115 H${xEnd}`} /><path d={`M${ox} 115 V${zEnd}`} /></g>
      <circle cx={ox} cy="115" r="4" className="reference-origin" />
      <text x={ox - 10} y="137" textAnchor="end">O</text><text x={xEnd} y="105" textAnchor="middle">+x</text><text x={ox + 10} y={zEnd + 4}>+z</text>
    </svg>
    <p>{summary}</p>
    <p className="muted">{located ? <>{t('Origin forward of AP')}: {Number(position.toFixed(3))} m. {outside && t('Origin outside AP–FP; marker shown off-scale.')}</> : t('Origin position is unknown; O is schematic.')}</p>
  </figure>;
}
