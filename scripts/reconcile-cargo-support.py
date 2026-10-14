"""Read-only workbook reconciliation; writes a separate accounting audit, never the workbook.
Usage: bundled-python scripts/reconcile-cargo-support.py /absolute/path/reference.xlsx
"""
import hashlib
import json
import math
from pathlib import Path
import sys
import openpyxl

root = Path(__file__).resolve().parents[1]
path = Path(sys.argv[1]).resolve()
source_bytes = path.read_bytes()
f = openpyxl.load_workbook(path, data_only=False)
v = openpyxl.load_workbook(path, data_only=True)
s, cached = f['Calc_G_Cargo'], v['Calc_G_Cargo']
reference = json.loads((root / 'validation-references/apples-reference-case-v2.json').read_text())
drawing = json.loads((root / 'validation-references/apples-dxf-arrangement.json').read_text())

def cell(address):
    return {'cell': 'Calc_G_Cargo!' + address, 'formulaOrInput': s[address].value, 'cachedValue': cached[address].value}

def totals(weights):
    mass = sum(w['massTonnes'] for w in weights)
    moments = {axis: sum(w['massTonnes'] * w[axis] for w in weights) for axis in ('lcg', 'tcg', 'vcg')}
    return {'massTonnes': mass, 'momentsTonneMetres': moments,
            'centreMetres': {axis: value / mass for axis, value in moments.items()}}

rows = []
for r in range(40, 66):
    if r in (46, 47):
        continue
    rows.append({'id': f'Calc_G_Cargo-{r}', 'name': cached[f'B{r}'].value,
                 'category': 'cargo' if r < 46 else 'support',
                 'quantityOrVolume': cached[f'C{r}'].value,
                 'quantityUnit': 'packages' if r < 46 else 'm3',
                 'massTonnes': cached[f'D{r}'].value,
                 'lcg': cached[f'E{r}'].value, 'vcg': cached[f'F{r}'].value, 'tcg': cached[f'G{r}'].value,
                 'evidence': [cell(f'{c}{r}') for c in 'CDEFG']})
cargo = [w for w in rows if w['category'] == 'cargo']
support = [w for w in rows if w['category'] == 'support']
raw_volume = sum(w['quantityOrVolume'] for w in support)
raw_mass = totals(support)['massTonnes']
allowance_mass = cached['D66'].value - raw_mass
scale = cached['D66'].value / raw_mass
support_totals = totals(support)
allowance = {'id': 'support-contingency-and-rounding', 'name': '10% timber allowance plus volume rounding',
             'massTonnes': allowance_mass, **support_totals['centreMetres'],
             'basis': 'Mass-equivalent remainder at raw timber weighted CG, reproduces workbook proportional moment scaling; not a physical member',
             'evidence': [cell('C66'), cell('D66'), cell('H66'), cell('I66')]}

# Isolate datum corrections from all unresolved changes to quantities, density and cargo tare.
corrections = []
changed = []
for w in reference['weights']:
    updated = dict(w)
    r = int(w['id'].split('-')[-1]) if w['id'].startswith('Calc_G_Cargo-') else None
    target = 3.394 if r in (49, 52, 61) else 9.394 if r == 64 else None
    if target is not None:
        corrections.append({'weightId': w['id'], 'name': w['name'], 'oldVcg': w['vcg'], 'candidateVcg': target,
                            'massTonnes': w['massTonnes'], 'deltaVerticalMoment': w['massTonnes'] * (target-w['vcg']),
                            'basis': 'Defined 100 mm interlayer at floor + 2.144 m; retains workbook mass and uniform interlayer CG assumption'})
        updated['vcg'] = target
    changed.append(updated)
old = totals(reference['weights']); new = totals(changed)

# Drawing records keep their own coordinate frame and no fabricated ship CG.
packages = []
for footprint in drawing['footprints']:
    bay_id = f"bay-{footprint['view']}-{footprint['handle']}"
    for tier, base in [('lower', 0), ('upper', 2.244)]:
        packages.append({'id': bay_id + '-' + tier, 'bayId': bay_id, 'hold': footprint['hold'],
                         'drawingView': footprint['view'], 'sourceHandle': footprint['handle'],
                         'tier': tier, 'localBaseMetres': base, 'referenceMassTonnes': 1,
                         'massBasis': 'User-agreed gross package including pallet tare; original workbook treatment unverified',
                         'shipCg': None})

result = {
    'format': 'umc-cargo-support-accounting', 'version': 1, 'status': 'Reconciled legacy accounts; physical completion blocked by listed inputs',
    'sourceWorkbook': {'path': str(path), 'sha256': hashlib.sha256(source_bytes).hexdigest()},
    'sourceDrawingSha256': drawing['sha256'],
    'packageMassAssumption': {'tareIncluded': True, 'basis': 'User instruction, 10 October 2026; original coursework inclusion uncertain'},
    'packageMassEvidence': [cell(a) for a in ('C26', 'C27', 'C28')],
    'materialEvidence': [cell(a) for a in ('C30', 'C31', 'C32', 'C33')],
    'aggregateLedger': rows, 'cargo': totals(cargo), 'rawSupport': support_totals,
    'rawSupportVolumeM3': raw_volume, 'separateAllowance': allowance,
    'cargoAndSupport': totals(cargo + support + [allowance]),
    'formulaEquivalentMemberSchedule': [
        {'family': 'posts', 'quantity': 3376*2, 'sectionMetres': [.1,.1], 'lengthMetres': 2.388,
         'volumeM3': 3376*2*.1*.1*2.388},
        {'family': 'intermediate-long', 'quantity': 3376*2, 'sectionMetres': [.1,.1], 'lengthMetres': 1.3,
         'volumeM3': 3376*2*.1*.1*1.3},
        {'family': 'intermediate-short', 'quantity': 3376, 'sectionMetres': [.1,.1], 'lengthMetres': 1.15,
         'volumeM3': 3376*.1*.1*1.15},
        {'family': 'fore-blocking-allowance', 'quantity': None, 'volumeM3': 23}
    ],
    'memberScheduleStatus': 'Algebraic expansion of workbook formulas only; not independently counted physical timber',
    'spatialPackages': packages,
    'datumCorrectionScenario': {'status': 'Candidate; not applied to workbook, app or accepted numerical fixture',
        'corrections': corrections, 'before': old, 'after': new,
        'deltaKgMetres': new['centreMetres']['vcg']-old['centreMetres']['vcg'],
        'gmChangeAtUnchangedDisplacementAndFSM': -(new['centreMetres']['vcg']-old['centreMetres']['vcg']),
        'weights': changed},
    'missingInputs': [
        'Physical support repetition: per package, per two-tier bay, or shared across bays; do not halve automatically',
        'Post endpoints, intermediate beam arrangement and structural contacts',
        'Drawing-to-ship mapping and actual package mass CG',
        'Actual fore-blocking geometry, and placement of any additional allowance'
    ],
    'checks': {}
}
assert len(packages) == 3376 and len({p['id'] for p in packages}) == 3376
assert sum(w['quantityOrVolume'] for w in cargo) == len(packages)
assert math.isclose(sum(w['volumeM3'] for w in result['formulaEquivalentMemberSchedule']), raw_volume)
assert math.isclose(result['cargoAndSupport']['massTonnes'], cached['D67'].value)
for axis, address in [('lcg','H67'), ('vcg','I67'), ('tcg','J67')]:
    assert math.isclose(result['cargoAndSupport']['momentsTonneMetres'][axis], cached[address].value, abs_tol=1e-8)
assert math.isclose(old['massTonnes'], new['massTonnes'])
assert math.isclose(old['momentsTonneMetres']['lcg'], new['momentsTonneMetres']['lcg'])
assert hashlib.sha256(path.read_bytes()).hexdigest() == result['sourceWorkbook']['sha256']
result['checks'] = {'uniquePackageIds': True, 'drawingAndWorkbookCountsAgree': True,
                    'formulaVolumesReconcile': True, 'legacyMassAndAllMomentsReconcile': True,
                    'datumScenarioPreservesMassAndLCG': True, 'sourceUnchanged': True}
out = root / 'validation-references/apples-cargo-support-accounting.json'
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k:result[k] for k in ('rawSupportVolumeM3','cargo','rawSupport','separateAllowance','cargoAndSupport','checks')},indent=2))
print('Candidate delta KG:', result['datumCorrectionScenario']['deltaKgMetres'])
