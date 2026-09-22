// Reproduce this selected public artifact snapshot with Node.js 24+.
// No network access, provider calls, or dependencies.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkFreshness } from '../artifacts/feed-freshness.mjs';

const root = new URL('../', import.meta.url);
const readJson = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const provenance = readJson('provenance.json');
assert.match(provenance.sourceSiteCommit, /^[a-f0-9]{40}$/);
assert.ok(Number.isFinite(Date.parse(provenance.sourceVerifiedAt)), 'Require the production download verification timestamp.');
const listed = new Set();
for (const file of provenance.files) {
  assert.match(file.file, /^artifacts\/[a-z0-9.-]+$/);
  assert.equal(file.source, `https://www.iamgeorgekelly.com/downloads/${file.file.slice('artifacts/'.length)}`);
  assert.equal(listed.has(file.file), false, `Duplicate provenance: ${file.file}`);
  listed.add(file.file);
  const actual = createHash('sha256').update(readFileSync(new URL(file.file, root))).digest('hex');
  assert.equal(actual, file.sha256, `Artifact hash differs: ${file.file}`);
}
for (const file of readdirSync(new URL('artifacts/', root))) assert.ok(listed.has(`artifacts/${file}`), `Missing provenance: ${file}`);

const cases = readJson('artifacts/feed-freshness-cases.json');
assert.equal(cases.synthetic, true);
assert.equal(cases.cases.length, 6);
for (const fixture of cases.cases) {
  const inputBefore = JSON.stringify(fixture.input);
  const result = checkFreshness(fixture.input);
  assert.equal(result.status, fixture.expectedStatus, fixture.id);
  assert.equal(JSON.stringify(fixture.input), inputBefore, `Input mutated: ${fixture.id}`);
  if (result.status === 'hold') assert.deepEqual(result.changes, [], 'A held case must not propose updates.');
}

const example = spawnSync(process.execPath, ['artifacts/check-feed-freshness.mjs', 'artifacts/feed-freshness-example.json'], { cwd: fileURLToPath(root), encoding: 'utf8' });
assert.equal(example.status, 1, example.stderr);
assert.equal(JSON.parse(example.stdout).status, 'update_needed');
const portability = spawnSync(process.execPath, ['artifacts/product-feed-portability.mjs', '--check'], { cwd: fileURLToPath(root), encoding: 'utf8' });
assert.equal(portability.status, 0, portability.stderr);
console.log(`Verified ${listed.size} artifact hashes, six synthetic freshness cases, the example CLI, and the recorded portability comparison.`);
