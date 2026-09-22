#!/usr/bin/env node
// Save this wrapper beside feed-freshness.mjs. Node.js 22+; no dependencies.
// Usage: node check-feed-freshness.mjs feed-freshness-example.json
// Exit codes: 0 = match; 1 = update_needed; 2 = hold, invalid JSON, or input error.
import { readFileSync, statSync } from 'node:fs';
import { checkFreshness, limits, ruleVersion, scope } from './feed-freshness.mjs';

function hold(code, message) {
  return { status: 'hold', issues: [{ code, path: '$', message }], changes: [], checkedAt: null, ruleVersion, scope };
}

let report;
if (process.argv.length !== 3) report = hold('input_file', 'Usage: node check-feed-freshness.mjs input.json. Supply one local JSON file.');
else {
  let bytes;
  try {
    const stats = statSync(process.argv[2]);
    if (!stats.isFile()) report = hold('input_file', 'Supply a regular local JSON file.');
    else if (stats.size > limits.maxInputBytes) report = hold('input_size', 'Input exceeds the 200,000-byte local limit.');
    else {
      bytes = readFileSync(process.argv[2]);
      if (bytes.length > limits.maxInputBytes) report = hold('input_size', 'Input exceeds the 200,000-byte local limit.');
    }
  } catch { report = hold('input_file', 'The local input file could not be read.'); }
  if (!report) {
    let input;
    try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { report = hold('invalid_json', 'Input must be valid UTF-8 JSON.'); }
    if (!report) report = checkFreshness(input);
  }
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = { match: 0, update_needed: 1, hold: 2 }[report.status];
