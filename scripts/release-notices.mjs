import {readFile, readdir, writeFile, copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output = resolve(process.argv[2] ?? 'dist');
const lock = JSON.parse(await readFile('package-lock.json','utf8'));
const notices = ['Third-party runtime notices — exact installed lockfile versions\n'];
for (const [path, entry] of Object.entries(lock.packages).sort()) {
  if (!path || entry.dev) continue;
  const names = (await readdir(path)).filter(name => /^(?:licen[cs]e|copying|notice)(?:\..*)?$/i.test(name));
  if (!names.length) throw new Error(`No licence notice found: ${path}`);
  notices.push(`\n${path} ${entry.version} (${entry.license ?? 'review required'})\n`);
  for (const name of names.sort()) notices.push(await readFile(resolve(path,name),'utf8'));
}
await copyFile('LICENSE',resolve(output,'LICENSE.txt'));
await writeFile(resolve(output,'THIRD_PARTY_NOTICES.txt'),notices.join('\n'));
