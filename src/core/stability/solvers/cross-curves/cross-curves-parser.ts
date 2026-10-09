import { parseCsv, readCsvNumber } from '../../../../platform/files/csv';
export type CrossCurveRow = { volume: number; heelDeg: number; kn: number };
export type CrossCurvesTable = { volumes: number[]; angles: number[]; rows: CrossCurveRow[] };

export function parseCrossCurvesCsv(text: string): CrossCurvesTable {
  const pairs = new Set<string>();
  const rows = parseCsv(text).map((row, index) => {
    const volume = readCsvNumber(row, 'volume');
    const heelDeg = readCsvNumber(row, 'heelDeg');
    const kn = readCsvNumber(row, 'kn');
    if (volume === undefined || volume <= 0 || heelDeg === undefined || Math.abs(heelDeg) > 180 || kn === undefined) throw new Error(`Cross-curve row ${index + 1} needs positive volume, heel in −180…180°, and KN.`);
    const pair = `${volume}/${heelDeg}`;
    if (pairs.has(pair)) throw new Error(`Duplicate cross-curve volume/heel pair: ${pair}.`);
    pairs.add(pair);
    return { volume, heelDeg, kn };
  });
  if (!rows.length) throw new Error('Cross-curve table is empty.');
  const volumes = [...new Set(rows.map(row => row.volume))].sort((a, b) => a - b);
  const angles = [...new Set(rows.map(row => row.heelDeg))].sort((a, b) => a - b);
  if (angles.length < 2 || !angles.includes(0)) throw new Error('Cross curves require zero heel and at least one other heel angle.');
  if (rows.length !== volumes.length * angles.length) throw new Error('Cross curves require the same heel-angle grid at every volume.');
  return { volumes, angles, rows };
}
