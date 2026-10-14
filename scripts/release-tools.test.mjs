import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, symlink, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkReleaseGate, verifyReleaseEvidence, writeManifest, verifyManifest} from './release-tools.mjs';
const revision = 'a'.repeat(40), accepted = {status:'accepted', reviewer:'Release reviewer', evidence:'docs/audit.md'};
const gate = {schemaVersion:1, acceptedRevision:revision, tag:'v0.2.0-beta.1', acceptance:accepted, redistribution:accepted, rollback:accepted};
test('release requires exact reviewed revision, tag and all three gates', () => {
  checkReleaseGate(gate, revision, gate.tag);
  for (const name of ['acceptance','redistribution','rollback']) assert.throws(() => checkReleaseGate({...gate,[name]:{...accepted,status:'pending'}},revision,gate.tag));
  assert.throws(() => checkReleaseGate(gate,'b'.repeat(40),gate.tag));
  assert.throws(() => checkReleaseGate(gate,revision,'main'));
  assert.throws(() => checkReleaseGate({...gate,acceptance:{...accepted,reviewer:''}},revision,gate.tag));
});
test('artifact detects changed, added and removed files; excludes source documents and symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(),'release-test-'));
  try {
    await writeFile(join(root,'index.html'),'original');
    await writeManifest(root,{revision}); await verifyManifest(root);
    await writeFile(join(root,'index.html'),'changed'); await assert.rejects(verifyManifest(root));
    await writeFile(join(root,'index.html'),'original');
    await writeFile(join(root,'extra.json'),'{}'); await assert.rejects(verifyManifest(root));
    await rm(join(root,'extra.json')); await rm(join(root,'index.html')); await assert.rejects(verifyManifest(root));
    await writeFile(join(root,'source.pdf'),'private'); await assert.rejects(writeManifest(root,{}));
    await rm(join(root,'source.pdf')); await symlink('/tmp',join(root,'external')); await assert.rejects(writeManifest(root,{}));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('approval evidence must exist, be nonempty and stay inside repository docs without symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-evidence-'));
  const withPath = evidence => ({...gate, acceptance: {...accepted, evidence}});
  try {
    await mkdir(join(root, 'docs'));
    await assert.rejects(verifyReleaseEvidence(gate, root));
    await writeFile(join(root, 'docs/audit.md'), '   ');
    await assert.rejects(verifyReleaseEvidence(gate, root), /empty/);
    await writeFile(join(root, 'docs/audit.md'), 'Recorded review evidence');
    await verifyReleaseEvidence(gate, root);
    for (const path of ['../audit.md', '/tmp/audit.md', 'docs/../audit.md', 'https://example.com', 'docs//audit.md', 'docs/./audit.md']) {
      await assert.rejects(verifyReleaseEvidence(withPath(path), root), /Invalid/);
    }
    await symlink(join(root, 'docs/audit.md'), join(root, 'docs/link.md'));
    await assert.rejects(verifyReleaseEvidence(withPath('docs/link.md'), root), /regular/);
    await symlink(join(root, 'docs'), join(root, 'docs/linked'));
    await assert.rejects(verifyReleaseEvidence(withPath('docs/linked/audit.md'), root), /regular/);
    await assert.rejects(verifyReleaseEvidence(withPath('docs/linked'), root), /regular/);
  } finally { await rm(root, {recursive: true, force: true}); }
});
test('artifact identity is checked independently of valid file hashes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-identity-'));
  try {
    await writeFile(join(root, 'index.html'), 'site');
    await writeManifest(root, {revision, tag: gate.tag});
    await verifyManifest(root, {revision, tag: gate.tag});
    await assert.rejects(verifyManifest(root, {revision: 'b'.repeat(40), tag: gate.tag}), /revision/);
    await assert.rejects(verifyManifest(root, {revision, tag: 'v0.3.0'}), /tag/);
  } finally { await rm(root, {recursive: true, force: true}); }
});
test('malformed acceptance records fail closed', () => {
  for (const value of [null, {}, [], 'accepted']) assert.throws(() => checkReleaseGate(value, revision, gate.tag));
  for (const field of ['reviewer', 'evidence']) {
    for (const value of [null, 12, {}, [], ' ']) assert.throws(() => checkReleaseGate({...gate, acceptance: {...accepted, [field]: value}}, revision, gate.tag));
  }
});

test('release CLI reads evidence from the explicit approval checkout and refuses pending approval', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-cli-'));
  const script = fileURLToPath(new URL('./release-tools.mjs', import.meta.url));
  const record = join(root, 'gate.json');
  const run = () => spawnSync(process.execPath, [script, 'gate', record, revision, gate.tag, root], {encoding: 'utf8'});
  try {
    await mkdir(join(root, 'docs'));
    await writeFile(record, JSON.stringify(gate));
    assert.notEqual(run().status, 0);
    await writeFile(join(root, 'docs/audit.md'), 'Reviewed evidence');
    assert.equal(run().status, 0);
    await writeFile(record, JSON.stringify({...gate, rollback: {...accepted, status: 'pending'}}));
    const rejected = run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Release gate remains open: rollback/);
  } finally { await rm(root, {recursive: true, force: true}); }
});


test('website inventory rejects test fixtures and source archives', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-exclusion-'));
  try {
    for (const path of ['fixture.tsx','source.zip','private.docx','fixture.ts','source.tar.gz','private.pptx']) {
      await writeFile(join(root,path),'not a website asset');
      await assert.rejects(writeManifest(root,{}), /Unexpected release asset/);
      await rm(join(root,path));
    }
    for (const dir of ['scripts','docs','fixtures','test-fixtures']) {
      await mkdir(join(root,dir));
      await writeFile(join(root,dir,'check.html'),'test');
      await assert.rejects(writeManifest(root,{}), /Unexpected release asset/);
      await rm(join(root,dir),{recursive:true});
    }
    await mkdir(join(root,'assets'));
    await writeFile(join(root,'assets','app.js'),'/* built application */');
    await writeFile(join(root,'index.html'),'website');
    await writeManifest(root,{});await verifyManifest(root);
  } finally {await rm(root,{recursive:true,force:true});}
});
