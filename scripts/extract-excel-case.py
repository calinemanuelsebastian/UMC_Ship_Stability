"""Read the reviewed workbook's saved values and formulas without rewriting it."""
import hashlib
import json
import math
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

path = Path(sys.argv[1])
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(path) as z:
    strings = [''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    rels = {e.attrib['Id']: e.attrib['Target'] for e in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheets = {}
    for sheet in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet', ns):
        target = rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        cells = {}
        for c in ET.fromstring(z.read(target)).findall('.//s:sheetData/s:row/s:c', ns):
            value = c.findtext('s:v', None, ns)
            kind = c.get('t')
            if kind == 's' and value is not None:
                value = strings[int(value)]
            elif kind == 'inlineStr':
                value = ''.join(c.find('s:is', ns).itertext())
            elif value is not None and kind not in ('str', 'e'):
                value = float(value)
            cells[c.attrib['r']] = {'value': value, 'formula': c.findtext('s:f', None, ns)}
        sheets[sheet.attrib['name']] = cells

def number(sheet, cell):
    value = sheets[sheet][cell]['value']
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'Missing numeric cached value: {sheet}!{cell}')
    return value

cargo = 'Calc_G_Cargo'
trim = 'Calc_Trim'
scale = number(cargo, 'D66') / sum(number(cargo, f'D{r}') for r in range(48, 66))
weights = []
for sheet, rows, cols in [(cargo, list(range(40, 46)) + list(range(48, 66)) + list(range(68, 77)), 'DEFG'), (trim, range(30, 44), 'CDEF')]:
    for r in rows:
        item = {'id': f'{sheet}-{r}', 'name': sheets[sheet][f'B{r}']['value']}
        for field, col in zip(['massTonnes', 'lcg', 'vcg', 'tcg'], cols):
            item[field] = number(sheet, f'{col}{r}')
        if sheet == cargo and 48 <= r <= 65:
            item['massTonnes'] *= scale
        item['freeSurfaceMomentTransverse'] = number(sheet, f'K{r}') if sheet == trim or r >= 69 else 0
        weights.append(item)

print(json.dumps({'workbook': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'weights': weights, 'cells': sheets, 'dunnageScale': scale}, ensure_ascii=False))
