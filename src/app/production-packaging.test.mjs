import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shipPackageFiles, validateBuiltInShips } from '../../scripts/ship-package-files.ts';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'umc-package-'));
  try { await run(root); } finally { await rm(root, {recursive:true, force:true}); }
}
const manifest = resources => JSON.stringify({resources});
test('reviewed vessel package includes every declared resource, including the symmetry audit', async () => {
  const files = await shipPackageFiles('validation-references/reviewed-apples-vessel');
  assert.ok(files.has('port-symmetry-audit.json'));
  assert.ok(files.has('vectis-castle-apples.gltf'));
});
test('package discovery includes external glTF buffers and images but not unrelated files', async () => fixture(async root => {
  await writeFile(join(root, 'manifest.json'), manifest([{path:'hull.gltf'}]));
  await writeFile(join(root, 'hull.gltf'), JSON.stringify({buffers:[{uri:'hull.bin'}],images:[{uri:'texture.png'},{uri:'data:image/png;base64,AA=='}]}));
  for(const file of ['hull.bin','texture.png','private-notes.txt']) await writeFile(join(root,file),'fixture');
  assert.deepEqual([...await shipPackageFiles(root)].sort(), ['manifest.json','hull.gltf','hull.bin','texture.png'].sort());
}));
test('missing declared resources and traversal paths fail packaging', async () => fixture(async root => {
  await writeFile(join(root,'manifest.json'),manifest([{path:'missing.json'}]));
  await assert.rejects(shipPackageFiles(root), /Missing ship package file/);
  await writeFile(join(root,'manifest.json'),manifest([{path:'../private.txt'}]));
  await assert.rejects(shipPackageFiles(root), /escapes/);
}));
test('production validation checks all registry entries', async () => fixture(async root => {
  const packages=join(root,'built-in-ship-models');
  await mkdir(join(packages,'one'),{recursive:true});
  await mkdir(join(packages,'two'),{recursive:true});
  await writeFile(join(packages,'registry.json'),JSON.stringify({models:[{path:'one/manifest.json'},{path:'two/manifest.json'}]}));
  await writeFile(join(packages,'one/manifest.json'),manifest([]));
  await writeFile(join(packages,'two/manifest.json'),manifest([{path:'missing.csv'}]));
  await assert.rejects(validateBuiltInShips(root), /missing.csv/);
  await writeFile(join(packages,'two/missing.csv'),'draft\n1');
  await validateBuiltInShips(root);
}));
