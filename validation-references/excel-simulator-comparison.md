# Excel–simulator comparison

All 15 comparisons pass their stated tolerances.

Scenario: reviewed apples loading condition, including ballast (47 constituent weights). Compared against saved Excel results, without modifying or recalculating the workbook.

| Quantity | Unit | Excel | Simulator / arithmetic check | Difference | Tolerance | Result | Excel cell |
|---|---|---:|---:|---:|---:|---|---|
| Displacement | t | 9644.270000000 | 9644.270000000 | 0.000e+0 | 1e-8 | PASS | Calc_Trim!C46 |
| LCG from AP | m | 59.077523960 | 59.077524209 | 2.489e-7 | 0.000001 | PASS | Calc_Trim!D46 |
| Physical KG | m | 6.632273280 | 6.632273425 | 1.452e-7 | 0.000001 | PASS | Calc_Trim!E46 |
| Signed TCG | m | -0.147695440 | -0.147695948 | -5.081e-7 | 0.000001 | PASS | Calc_Trim!F46 |
| Longitudinal moment | t m | 569759.592003795 | 569759.594403795 | 2.400e-3 | 0.01 | PASS | Calc_Trim!G46 |
| Vertical moment | t m | 63963.434225971 | 63963.435625971 | 1.400e-3 | 0.01 | PASS | Calc_Trim!H46 |
| Transverse moment | t m | -1424.414700000 | -1424.419600000 | -4.900e-3 | 0.01 | PASS | Calc_Trim!I46 |
| Transverse FSM | t m | 309.610000000 | 309.610000000 | 0.000e+0 | 1e-8 | PASS | Calc_Stability!C6 |
| Free-surface correction | m | 0.032103000 | 0.032103000 | 0.000e+0 | 1e-10 | PASS | Calc_Stability!C7 |
| Virtual KG | m | 6.664376280 | 6.664376425 | 1.452e-7 | 0.000001 | PASS | Calc_Stability!C8 |
| Upright lookup draft | m | 5.805664062 | 5.805664062 | 0.000e+0 | 1e-8 | PASS | Calc_Trim!D55 |
| Upright LCB | m | 61.118261719 | 61.118261719 | 0.000e+0 | 1e-8 | PASS | Calc_Trim!B61 |
| Upright LCF | m | 57.713996094 | 57.713996094 | 0.000e+0 | 1e-8 | PASS | Calc_Trim!F61 |
| GM using Excel trimmed KM | m | 1.103875127 | 1.103874982 | -1.452e-7 | 0.000001 | PASS | Calc_Stability!C23 |
| Corrected GM using Excel trimmed KM | m | 1.071772127 | 1.071771982 | -1.452e-7 | 0.000001 | PASS | Calc_Stability!C25 |

## Interpretation

The first 13 rows run the application's loading and upright hydrostatic functions on data freshly extracted from the workbook. The two GM rows check arithmetic using Excel's trimmed KM; they do not independently validate that KM or solve trimmed equilibrium.

Excel rounds the other-weights subtotal moments in Calc_G_Cargo H77:J77 to two decimals. The simulator retains constituent precision. Moment tolerance is 0.01 t m and centre tolerance is 0.000001 m. The dunnage allowance scales component masses by 1.100252427504303 to reproduce D66 and its corrected moments.

The upright lookup uses Calc_Trim B54:D56, B60:B62 and F60:F62. It is not the final trimmed draft. Table and calculation density are equal for this mass-based comparison; no volume or density-dependent result is validated.

Existing regression fixture agrees with current workbook inputs: true. J78 retains SUM(J67,J77): true.

## Not yet comparable

- Final trim is not exercised by this legacy comparison. The application now has a trimmed-table solver; see the workbook replacement audit.
- Aft and forward drafts: Excel D119:D120 still say REVIEW DATUM.
- Actual heel and GZ: this load has nonzero TCG, while the workbook's GZ is explicitly a centreline reference. This script does not exercise the installed Vectis cross curves.
- Vectis Castle is included in production. This script validates a numerical fixture, not placement of its aggregate weights in the cargo planner.

## Repeat the comparison

Run `npm run compare:excel` from the project directory (requires Python 3 and installed project dependencies). It reads the reviewed workbook afresh, writes this report and a full-precision JSON report, and exits nonzero on a mismatch. Use `PYTHON=/path/to/python3` if needed.

Workbook SHA-256: `56ffd96aa635d761d41a56836e66bb42d0cb49b027918b1efa40a9f6d9cc510a`.
