import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute } from 'node:path';

// Only declared package assets are published; source documents stay private.
function packagePath(root: string, path: string) {
  if (!path || /^[a-z][a-z0-9+.-]*:/i.test(path) || path.includes('\\') || path.includes('?') || path.includes('#') || isAbsolute(path)) {
    throw new Error(`Invalid ship package path: ${path}`);
  }
  const full = resolve(root, path), rel = relative(root, full);
  if (rel === '..' || rel.startsWith('../')) throw new Error(`Ship package path escapes its directory: ${path}`);
  return full;
}

export async function shipPackageFiles(root: string, extras: string[] = []) {
  const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
  const pending = ['manifest.json', ...manifest.resources.flatMap((r: {path?: string}) => r.path ? [r.path] : []), ...extras];
  const files = new Set<string>();
  while (pending.length) {
    const path = pending.shift()!;
    const full = packagePath(root, path);
    if (files.has(path)) continue;
    try { if (!(await stat(full)).isFile()) throw new Error('Not a file'); }
    catch { throw new Error(`Missing ship package file: ${full}`); }
    files.add(path);
    if (path.endsWith('.gltf')) {
      const gltf = JSON.parse(await readFile(full, 'utf8'));
      for (const asset of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
        if (!asset.uri || asset.uri.startsWith('data:')) continue;
        const uri = decodeURIComponent(asset.uri);
        packagePath(root, uri); // Reject absolute URLs and filesystem paths before joining.
        pending.push(relative(root, resolve(dirname(full), uri)));
      }
    }
  }
  return files;
}

export async function validateBuiltInShips(outputDir: string) {
  const root = resolve(outputDir, 'built-in-ship-models');
  const registry = JSON.parse(await readFile(resolve(root, 'registry.json'), 'utf8'));
  for (const model of registry.models) {
    const manifest = packagePath(root, model.path);
    await shipPackageFiles(dirname(manifest));
  }
}
