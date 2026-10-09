import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
import type { StabilityPoint } from '../core/domain/stability-result';
export function StabilityChart({ points }: {
    points: StabilityPoint[];
}) {
    const { t } = useLanguage();
    const reference = useReference();
    const left = 72, top = 28, width = 700, height = 290;
    const xMin = points[0].heelDeg, xMax = points[points.length - 1].heelDeg;
    const values = points.flatMap(point => [point.gz, point.gzCorrected]);
    const low = Math.min(0, ...values), high = Math.max(0, ...values);
    const padding = Math.max((high - low) * .08, .1);
    const yMin = low - padding, yMax = high + padding;
    const x = (angle: number) => left + (angle - xMin) / (xMax - xMin) * width;
    const y = (value: number) => top + height - (value - yMin) / (yMax - yMin) * height;
    return <figure className="stability-chart"><svg viewBox="0 0 810 385" role="img" aria-label={t("GZ versus signed heel angle. Solid teal is corrected GZ; dashed grey is uncorrected GZ. Exact values are in the table below.")}>
    {t([0, 1, 2, 3, 4].map(index => { const value = yMin + index * (yMax - yMin) / 4; return <g key={index}><line x1={left} x2={left + width} y1={y(value)} y2={y(value)} stroke="#dce4ea"/><text x={left - 10} y={y(value) + 5} textAnchor="end">{t(value.toFixed(2))}</text></g>; }))}
    <line x1={left} x2={left + width} y1={y(0)} y2={y(0)} stroke="#536a7c"/>
    <line x1={x(0)} x2={x(0)} y1={top} y2={top + height} stroke="#bccbd5"/>
    {t([0, 1, 2, 3, 4, 5, 6].map(index => { const angle = xMin + index * (xMax - xMin) / 6; return <text key={index} x={x(angle)} y={top + height + 26} textAnchor="middle">{t(angle.toFixed(0))}{t("\u00B0")}</text>; }))}
    <polyline fill="none" stroke="#697c89" strokeWidth="2" strokeDasharray="7 5" points={points.map(point => `${x(point.heelDeg)},${y(point.gz)}`).join(' ')}/>
    <polyline fill="none" stroke="#007e91" strokeWidth="3" points={points.map(point => `${x(point.heelDeg)},${y(point.gzCorrected)}`).join(' ')}/>
    <text x={left} y={17}>{t("GZ (m)")}</text><text x={left + width / 2} y={378} textAnchor="middle">{t(reference.heelSign === 1 ? "Heel angle · port − / starboard +" : "Heel angle · starboard − / port +")}</text>
  </svg><figcaption>{t("Solid teal: corrected GZ \u00B7 Dashed grey: uncorrected GZ. Straight segments join tabulated angles; they do not resolve extrema between samples.")}</figcaption></figure>;
}
