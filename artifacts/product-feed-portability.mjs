// Local, deterministic demonstration. No network access or model inference.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { version, evaluateCase, reviewInput, MAX_REVIEW_BYTES } from './product-feed-review.mjs';
export { version, evaluateCase, mapRecord, reviewRecord, validGtin, parseReviewInput, reviewInput } from './product-feed-review.mjs';
export function experiment(corpus) {
  if (!Array.isArray(corpus.cases) || corpus.cases.length > 1000) throw new Error('Expected at most 1,000 cases.');
  const cases = corpus.cases.map(c => ({...c,observations:['copy','mapped'].map(method => evaluateCase(c,method))}));
  const summary = ['copy','mapped'].map(method => ({method,records:cases.length,clear:cases.filter(c=>c.observations.find(o=>o.method===method).status==='clear').length,hold:cases.filter(c=>c.observations.find(o=>o.method===method).status==='hold').length}));
  return {experimentId:corpus.experimentId,ruleVersion:version,scope:corpus.scope,target:corpus.target,oracle:corpus.oracle,notTested:['Provider admission or upload acceptance','Live URLs, images, checkout, or stock','GTIN assignment','Whole-feed uniqueness and cross-row option consistency','Country/category-specific requirements outside this subset','Model performance','Traffic or customer outcomes'],summary,cases};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const option = name => {
      const index = process.argv.indexOf(name);
      if (index === -1) return undefined;
      const value = process.argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Supply a value after ${name}.`);
      return value;
    };
    if (process.argv.includes('--record')) {
      if (process.argv.includes('--fixtures') || process.argv.includes('--check')) throw new Error('Use --record separately from the frozen experiment flags.');
      const recordPath = option('--record');
      const evidencePath = option('--evidence');
      const method = option('--method') ?? 'copy';
      const readBounded = path => {
        const file = statSync(path);
        if (!file.isFile() || file.size > MAX_REVIEW_BYTES) throw new Error('Use a regular JSON file no larger than 64 KiB.');
        return readFileSync(path, 'utf8');
      };
      const record = readBounded(recordPath);
      const evidence = evidencePath ? readBounded(evidencePath) : '{}';
      console.log(JSON.stringify(reviewInput(record, evidence, method), null, 2));
    } else {
      if (process.argv.includes('--evidence') || process.argv.includes('--method')) throw new Error('--evidence and --method require --record.');
      const corpusPath = option('--fixtures') ?? join(here, 'product-feed-portability-cases.json');
      const bytes = readFileSync(corpusPath), corpus = JSON.parse(bytes.toString());
      const hash = bytes => createHash('sha256').update(bytes).digest('hex');
      const report = {schemaVersion:'1.1',executedAt:new Date().toISOString(),fixtureSha256:hash(bytes),runnerSha256:hash(readFileSync(fileURLToPath(import.meta.url))),coreSha256:hash(readFileSync(join(here, 'product-feed-review.mjs'))),...experiment(corpus)};
      if (process.argv.includes('--check')) {
        const saved = JSON.parse(readFileSync(join(here,'product-feed-portability-results.json'),'utf8'));
        for (const key of ['fixtureSha256','runnerSha256','coreSha256','summary','cases','notTested'])
          if (JSON.stringify(saved[key]) !== JSON.stringify(report[key])) throw new Error(`Saved experiment drift: ${key}. Rerun and review the observed results.`);
        console.log('Portability results and source hashes verified.');
      } else console.log(JSON.stringify(report,null,2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
