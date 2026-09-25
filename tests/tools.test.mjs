import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { invokeTool } from '../server/tools.mjs';
import { compareDimensions } from '../artifacts/compare-product-dimensions.mjs';
import { checkFreshness } from '../artifacts/feed-freshness.mjs';
import { reviewInput } from '../artifacts/product-feed-review.mjs';
const read = name => JSON.parse(readFileSync(new URL('../artifacts/' + name, import.meta.url)));
const cases = [
  ...read('product-dimensions-cases.json').cases.map(c => ({id: c.id, name: 'compare_dimensions', args: {input: c.input}, expected: compareDimensions(c.input), status: c.expectedStatus})),
  ...read('feed-freshness-cases.json').cases.map(c => ({id: c.id, name: 'compare_feed_snapshots', args: {input: c.input}, expected: checkFreshness(c.input), status: c.expectedStatus})),
  ...read('product-feed-portability-cases.json').cases.flatMap(c => ['copy', 'mapped'].map(method => ({id: c.id + method, name: 'review_product_record', args: {record: c.input, evidence: c.evidence, method}, expected: reviewInput(JSON.stringify(c.input), JSON.stringify(c.evidence), method), status: method === 'mapped' ? c.expectedAfterMapping : undefined}))),
];
test('all 40 published fixture/method results match the original rules without input mutation', () => {
  assert.equal(cases.length, 40);
  for (const c of cases) {
    const before = JSON.stringify(c.args), actual = invokeTool(c.name, c.args);
    assert.equal(actual.isError, undefined, c.id);
    assert.deepEqual(actual.structuredContent.result, c.expected, c.id);
    if (c.status) assert.equal(actual.structuredContent.result.status, c.status, c.id);
    assert.equal(JSON.stringify(c.args), before, c.id);
  }
});
test('invalid envelopes, excessive inputs and unknown tools return actionable errors', () => {
  for (const [name, args] of [['unknown', {}], ['__proto__', {}], ['compare_dimensions', null], ['compare_dimensions', {input: {}, unexpected: true}], ['compare_dimensions', {input: {value: 'x'.repeat(200001)}}], ['review_product_record', {record: [], method: 'copy'}]]) {
    const result = invokeTool(name, args);
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.length < 1000);
  }
  let input = {};
  for (let i=0; i<30; i++) input = {nested: input};
  assert.equal(invokeTool('compare_dimensions', {input}).isError, true);
});
test('incomplete records return evidence holds, not invented values or protocol failures', () => {
  for (const name of ['compare_dimensions', 'compare_feed_snapshots']) {
    const result = invokeTool(name, {input: {}});
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.result.status, 'hold');
  }
});
test('TypeScript SDK client discovers three read-only tools and invokes all 40 cases over stdio', {timeout: 30000}, async () => {
  const transport = new StdioClientTransport({command: process.execPath, args: [new URL('../server/index.mjs', import.meta.url).pathname], stderr: 'pipe'});
  const client = new Client({name: 'toolkit-protocol-test', version: '1.0.0'});
  try {
    await client.connect(transport);
    const list = await client.listTools();
    assert.equal(list.tools.length, 3);
    for (const tool of list.tools) {
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.openWorldHint, false);
    }
    for (const c of cases) {
      const actual = await client.callTool({name: c.name, arguments: c.args});
      assert.equal(actual.isError, undefined, c.id);
      assert.deepEqual(actual.structuredContent.result, c.expected, c.id);
    }
  } finally { await client.close(); }
});
