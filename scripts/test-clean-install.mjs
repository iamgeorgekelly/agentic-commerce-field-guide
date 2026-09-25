import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pack = JSON.parse(execFileSync(npm, ['pack', '--json'], {encoding: 'utf8'}))[0];
const temporary = mkdtempSync(join(tmpdir(), 'commerce-evidence-install-'));
try {
  execFileSync(npm, ['install', '--prefix', temporary, '--ignore-scripts', '--no-audit', '--no-fund', resolve(pack.filename)], {stdio: 'pipe'});
  const entry = join(temporary, 'node_modules/@iamgeorgekelly/commerce-evidence-toolkit/server/index.mjs');
  const client = new Client({name: 'clean-package-test', version: '1.0.0'});
  try {
    await client.connect(new StdioClientTransport({command: process.execPath, args: [entry], stderr: 'pipe', cwd: temporary}));
    assert.equal((await client.listTools()).tools.length, 3);
    for (const [name, file, expected] of [['compare_dimensions', 'dimensions', 'match'], ['compare_feed_snapshots', 'feed-snapshots', 'update_needed'], ['review_product_record', 'product-record', 'clear']]) {
      const args = JSON.parse(readFileSync(new URL('../examples/' + file + '.json', import.meta.url)));
      const result = await client.callTool({name, arguments: args});
      assert.equal(result.structuredContent.result.status, expected);
    }
  } finally { await client.close(); }
  console.log('Clean archive installation: three tools discovered and all three example calls passed.');
} finally { rmSync(temporary, {recursive: true, force: true}); }
