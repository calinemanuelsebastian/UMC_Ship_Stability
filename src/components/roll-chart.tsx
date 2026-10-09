import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
import type { RollPoint } from '../core/roll/compute-roll-simulation';
export function RollChart({ points }: {
    points: RollPoint[];
}) {
    const { t } = useLanguage();
    const reference = useReference();
    const duration = points[points.length - 1].timeSeconds;
    const limit = Math.max(.5, ...points.map(point => Math.abs(point.heelDeg))) * 1.1;
    const x = (value: number) => 70 + value / duration * 700;
    const y = (value: number) => 170 - value / limit * 140;
    return <figure className="stability-chart"><svg viewBox="0 0 810 385" role="img" aria-label={t("Free-roll heel angle versus time, released from rest. Sample values follow in the table.")}>
    {t([-1, -.5, 0, .5, 1].map(fraction => <g key={fraction}><line x1="70" x2="770" y1={y(limit * fraction)} y2={y(limit * fraction)} stroke="#dce4ea"/><text x="60" y={y(limit * fraction) + 5} textAnchor="end">{t((limit * fraction).toFixed(1))}</text></g>))}
    {t([0, 1, 2, 3, 4, 5].map(index => <text key={index} x={x(duration * index / 5)} y="335" textAnchor="middle">{t((duration * index / 5).toFixed(1))}</text>))}
    <polyline points={points.map(point => `${x(point.timeSeconds)},${y(point.heelDeg)}`).join(' ')} fill="none" stroke="#087f8c" strokeWidth="2"/>
    <text x="420" y="372" textAnchor="middle">{t("Time (s)")}</text><text transform="translate(18 170) rotate(-90)" textAnchor="middle">{t("Heel (\u00B0)")}</text>
  </svg><figcaption>{t(reference.heelSign === 1 ? "Positive heel is starboard. The response starts at the entered heel with zero angular velocity." : "Positive heel is port. The response starts at the entered heel with zero angular velocity.")}</figcaption></figure>;
}
