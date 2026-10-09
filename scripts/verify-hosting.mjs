import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateBuiltInShips} from './ship-package-files.ts';
const output=resolve(process.argv[2]??'dist'), base=process.argv[3]??'/';
assert.ok(base.startsWith('/')&&base.endsWith('/'),'Hosting base must start and end with /');
const html=await readFile(resolve(output,'index.html'),'utf8');
const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
assert.ok(assets.some(p=>p.endsWith('.js')),'Missing app entry script');
for(const path of assets){
 assert.ok(path.startsWith(base),`Asset outside hosting base: ${path}`);
 assert.ok((await stat(resolve(output,path.slice(base.length)))).isFile(),`Missing asset: ${path}`);
}
await validateBuiltInShips(output);
console.log(`Hosting check passed: ${base}, entry assets and all built-in vessel resources.`);
