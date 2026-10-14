import {createHash} from 'node:crypto';
import {readdir, readFile, writeFile, lstat} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {pathToFileURL} from 'node:url';

export function checkReleaseGate(gate, revision, tag) {
  if (gate?.schemaVersion !== 1 || gate.acceptedRevision !== revision || !/^[a-f0-9]{40}$/.test(revision)) throw new Error('Release acceptance must identify this exact commit.');
  if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(tag) || gate.tag !== tag) throw new Error('Release must use the accepted version tag.');
  for (const name of ['acceptance', 'redistribution', 'rollback']) {
    const entry = gate[name];
    if (entry?.status !== 'accepted' || typeof entry.reviewer !== 'string' || !entry.reviewer.trim() || typeof entry.evidence !== 'string' || !entry.evidence.trim()) throw new Error(`Release gate remains open: ${name}`);
  }
}
// Evidence is read from the approval checkout, never from the tagged candidate.
export async function verifyReleaseEvidence(gate, root) {
  for (const name of ['acceptance', 'redistribution', 'rollback']) {
    const path = gate[name]?.evidence;
    if (typeof path !== 'string' || !/^docs\//.test(path) || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error(`Invalid release evidence path: ${name}`);
    }
    let full = resolve(root);
    const parts = path.split('/');
    for (let i = 0; i < parts.length; i++) {
      full = resolve(full, parts[i]);
      const stat = await lstat(full);
      if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error(`Evidence must be a regular repository file: ${path}`);
    }
    if (!(await readFile(full, 'utf8')).trim()) throw new Error(`Release evidence is empty: ${path}`);
  }
}
export async function inventory(root) {
  const entries = [];
  async function walk(dir) {
    for (const item of await readdir(dir, {withFileTypes: true})) {
      const full = resolve(dir, item.name), path = relative(root, full).split('\\').join('/');
      if (item.isSymbolicLink()) throw new Error(`Symlink is not a release asset: ${path}`);
      if (item.isDirectory()) await walk(full);
      else if (item.isFile() && path !== 'release-manifest.json') {
        if (/(^|\/)(?:\.git|\.env[^/]*|node_modules|scripts|src|docs|fixtures|test-fixtures)(\/|$)|\.(?:pdf|xlsx?|docx?|pptx?|dwg|dxf|zip|tar|gz|7z|tsx?|jsx|map)$/i.test(path)) throw new Error(`Unexpected release asset: ${path}`);
        const data = await readFile(full);
        entries.push({path, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')});
      }
    }
  }
  await walk(resolve(root));
  return entries.sort((a,b) => a.path.localeCompare(b.path, 'en'));
}
export async function writeManifest(root, metadata) {
  const files = await inventory(root);
  const manifest = {schemaVersion: 1, ...metadata, files};
  await writeFile(resolve(root, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
export async function verifyManifest(root, expected = {}) {
  const manifest = JSON.parse(await readFile(resolve(root, 'release-manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || JSON.stringify(manifest.files) !== JSON.stringify(await inventory(root))) throw new Error('Release artifact differs from its manifest.');
  for (const key of ['revision', 'tag']) {
    if (expected[key] !== undefined && manifest[key] !== expected[key]) throw new Error(`Release artifact ${key} does not match the expected release.`);
  }
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, target = 'dist', revision, tag, approvalRoot = '.'] = process.argv.slice(2);
  if (command === 'gate') {
    const gate = JSON.parse(await readFile(target, 'utf8'));
    checkReleaseGate(gate, revision, tag);
    await verifyReleaseEvidence(gate, approvalRoot);
  }
  else if (command === 'manifest') await writeManifest(resolve(target), {revision: revision ?? 'working-tree', tag: tag ?? 'candidate'});
  else if (command === 'verify') await verifyManifest(resolve(target), {revision, tag});
  else throw new Error('Expected gate, manifest or verify.');
  console.log(`Release ${command}: passed`);
}
