import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from './test-server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const folder = `${root}validation-references/`;
const source = JSON.parse(execFileSync(process.env.PYTHON ?? 'python3', [
  `${root}scripts/extract-excel-case.py`, process.argv[2] ?? process.env.WORKBOOK_PATH ?? `${folder}apples-calculations-reviewed.xlsx`,
], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
const cell = (sheet, address) => source.cells[sheet][address].value;
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const originalFetch = globalThis.fetch;
try {
  const { computeLoadingCondition } = await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
  const { computeUprightHydrostatics } = await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
  const loaded = computeLoadingCondition(source.weights);
  const rows = [];
  function compare(label, unit, actual, sheet, address, tolerance, scope = 'Simulator calculation') {
    const expected = cell(sheet, address);
    if (![actual, expected].every(Number.isFinite)) throw new Error(`Missing result: ${label}`);
    const delta = actual - expected;
    rows.push({ label, unit, excel: expected, simulator: actual, delta, tolerance,
      status: Math.abs(delta) <= tolerance ? 'PASS' : 'FAIL', scope,
      source: `${sheet}!${address}`, formula: source.cells[sheet][address].formula });
  }
  for (const [key, label, unit, address, tolerance] of [
    ['displacementTonnes', 'Displacement', 't', 'C46', 1e-8],
    ['lcg', 'LCG from AP', 'm', 'D46', 1e-6],
    ['vcg', 'Physical KG', 'm', 'E46', 1e-6],
    ['tcg', 'Signed TCG', 'm', 'F46', 1e-6],
    ['longitudinalMoment', 'Longitudinal moment', 't m', 'G46', .01],
    ['verticalMoment', 'Vertical moment', 't m', 'H46', .01],
    ['transverseMoment', 'Transverse moment', 't m', 'I46', .01],
  ]) compare(label, unit, loaded[key], 'Calc_Trim', address, tolerance);
  for (const [key, label, unit, address, tolerance] of [
    ['freeSurfaceMomentTransverse', 'Transverse FSM', 't m', 'C6', 1e-8],
    ['freeSurfaceCorrectionTransverse', 'Free-surface correction', 'm', 'C7', 1e-10],
    ['virtualVcgTransverse', 'Virtual KG', 'm', 'C8', 1e-6],
  ]) compare(label, unit, loaded[key], 'Calc_Stability', address, tolerance);

  // A private table adapter, without borrowing the pontoon's geometry or KM.
  // Equal table/calculation densities preserve the workbook's mass lookup.
  // Density is a normalization choice here; no inferred volume is compared.
  const csv = 'draft,displacementTonnes,lcb,lcf\n' + [54, 56].map((r, i) => [
    cell('Calc_Trim', `D${r}`), cell('Calc_Trim', `B${r}`),
    cell('Calc_Trim', `B${60 + i * 2}`), cell('Calc_Trim', `F${60 + i * 2}`),
  ].join(',')).join('\n');
  const ship = { baseUrl: '/excel-comparison/', manifest: {
    id: 'reviewed-excel-lookup', name: 'Reviewed Excel upright lookup only',
    units: { length: 'm', mass: 't', density: 't/m3', angle: 'deg' },
    coordinateSystem: { zPositive: 'up' }, defaultCondition: { waterDensity: 1 },
    resources: [{ id: 'excel-table', kind: 'hydrostatics.upright-table', path: 'upright.csv' }],
  } };
  globalThis.fetch = async url => {
    if (url !== '/excel-comparison/upright.csv') throw new Error(`Unexpected resource ${url}`);
    return new Response(csv);
  };
  const hydro = await computeUprightHydrostatics(ship, { ...loaded, waterDensity: 1, heelDeg: 0, trimDeg: 0 });
  compare('Upright lookup draft', 'm', hydro.draft, 'Calc_Trim', 'D55', 1e-8);
  compare('Upright LCB', 'm', hydro.lcb, 'Calc_Trim', 'B61', 1e-8);
  compare('Upright LCF', 'm', hydro.lcf, 'Calc_Trim', 'F61', 1e-8);
  const km = cell('Calc_Stability', 'C21');
  compare('GM using Excel trimmed KM', 'm', km - loaded.vcg, 'Calc_Stability', 'C23', 1e-6, 'Arithmetic only; KM supplied by Excel');
  compare('Corrected GM using Excel trimmed KM', 'm', km - loaded.virtualVcgTransverse, 'Calc_Stability', 'C25', 1e-6, 'Arithmetic only; KM supplied by Excel');

  const fixture = JSON.parse(await readFile(`${folder}reviewed-loading-case.json`, 'utf8'));
  const fixtureMatches = fixture.weights.length === source.weights.length && source.weights.every((w, i) =>
    ['massTonnes', 'lcg', 'vcg', 'tcg', 'freeSurfaceMomentTransverse'].every(k => Math.abs(w[k] - fixture.weights[i][k]) < 1e-10));
  const correctionRetained = source.cells.Calc_G_Cargo.J78.formula.replace(/\s/g, '').toUpperCase() === 'SUM(J67,J77)';
  const passed = rows.every(r => r.status === 'PASS') && fixtureMatches && correctionRetained;
  const report = { workbook: source.workbook, sha256: source.sha256, generatedAt: new Date().toISOString(),
    basis: 'Saved Excel values; workbook not recalculated or modified by this run',
    weightCount: source.weights.length, fixtureMatches, correctionRetained, passed, rows };
  await writeFile(`${folder}excel-simulator-comparison.json`, JSON.stringify(report, null, 2) + '\n');
  const format = v => v.toFixed(9);
  const markdown = `# Excel–simulator comparison\n\n${passed ? 'All 15 comparisons pass their stated tolerances.' : 'Comparison failed; inspect the rows and source checks.'}\n\n` +
    `Scenario: reviewed apples loading condition, including ballast (${source.weights.length} constituent weights). Compared against saved Excel results, without modifying or recalculating the workbook.\n\n` +
    `| Quantity | Unit | Excel | Simulator / arithmetic check | Difference | Tolerance | Result | Excel cell |\n|---|---|---:|---:|---:|---:|---|---|\n` +
    rows.map(r => `| ${r.label} | ${r.unit} | ${format(r.excel)} | ${format(r.simulator)} | ${r.delta.toExponential(3)} | ${r.tolerance} | ${r.status} | ${r.source} |`).join('\n') +
    `\n\n## Interpretation\n\n` +
    `The first 13 rows run the application's loading and upright hydrostatic functions on data freshly extracted from the workbook. The two GM rows check arithmetic using Excel's trimmed KM; they do not independently validate that KM or solve trimmed equilibrium.\n\n` +
    `Excel rounds the other-weights subtotal moments in Calc_G_Cargo H77:J77 to two decimals. The simulator retains constituent precision. Moment tolerance is 0.01 t m and centre tolerance is 0.000001 m. The dunnage allowance scales component masses by ${source.dunnageScale} to reproduce D66 and its corrected moments.\n\n` +
    `The upright lookup uses Calc_Trim B54:D56, B60:B62 and F60:F62. It is not the final trimmed draft. Table and calculation density are equal for this mass-based comparison; no volume or density-dependent result is validated.\n\n` +
    `Existing regression fixture agrees with current workbook inputs: ${fixtureMatches}. J78 retains SUM(J67,J77): ${correctionRetained}.\n\n` +
    `## Not yet comparable\n\n` +
    `- Final trim is not exercised by this legacy comparison. The application now has a trimmed-table solver; see the workbook replacement audit.\n` +
    `- Aft and forward drafts: Excel D119:D120 still say REVIEW DATUM.\n` +
    `- Actual heel and GZ: this load has nonzero TCG, while the workbook's GZ is explicitly a centreline reference. This script does not exercise the installed Vectis cross curves.\n` +
    `- Vectis Castle is included in production. This script validates a numerical fixture, not placement of its aggregate weights in the cargo planner.\n\n` +
    `## Repeat the comparison\n\nRun \`npm run compare:excel\` from the project directory (requires Python 3 and installed project dependencies). It reads the reviewed workbook afresh, writes this report and a full-precision JSON report, and exits nonzero on a mismatch. Use \`PYTHON=/path/to/python3\` if needed.\n\n` +
    `Workbook SHA-256: \`${source.sha256}\`.\n`;
  await writeFile(`${folder}excel-simulator-comparison.md`, markdown);
  console.table(rows.map(({ label, excel, simulator, delta, status }) => ({ label, excel, simulator, delta, status })));
  console.log({ passed, fixtureMatches, correctionRetained, weights: source.weights.length });
  if (!passed) process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
