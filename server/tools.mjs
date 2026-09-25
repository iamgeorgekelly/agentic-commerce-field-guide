import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { reviewInput } from '../artifacts/product-feed-review.mjs';
import { checkFreshness } from '../artifacts/feed-freshness.mjs';
import { compareDimensions } from '../artifacts/compare-product-dimensions.mjs';

export const version = '0.1.0';
const object = z.record(z.string(), z.unknown());
// Fields remain optional so incomplete evidence reaches the core and returns a hold.
const measure = z.object({value: z.string().optional(), unit: z.string().optional()}).passthrough();
const dimensionRecord = z.object({itemId: z.string().optional(), basis: z.string().optional(), evidenceRef: z.string().optional(), length: measure.optional(), width: measure.optional(), height: measure.optional()}).passthrough();
const dimensions = z.object({schemaVersion: z.string().optional(), source: dimensionRecord.optional(), candidate: dimensionRecord.optional(), toleranceMm: z.string().optional()}).passthrough();
const feedItem = z.object({item_id: z.string().optional(), price: z.string().optional(), sale_price: z.string().nullable().optional(), availability: z.string().optional()}).passthrough();
const snapshot = z.object({capturedAt: z.string().optional(), evidenceRef: z.string().optional(), items: z.array(feedItem).optional()}).passthrough();
const snapshots = z.object({schemaVersion: z.string().optional(), profile: z.string().optional(), asOf: z.string().optional(), maxAgeHours: z.number().optional(), source: snapshot.optional(), feed: snapshot.optional()}).passthrough();
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const definitions = {
  review_product_record: {
    description: 'Review one supplied product record using a selected canonical-field subset and positive USD prices. Optional mapping transforms only explicit supplied fields. Missing or conflicting facts remain on hold. Does not fetch URLs, verify GTIN assignment, or validate a complete provider upload.',
    schema: z.object({ record: object, evidence: object.optional(), method: z.enum(['copy', 'mapped']).default('copy') }).strict(),
    documentation: 'https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment',
    run: ({record, evidence = {}, method}) => reviewInput(JSON.stringify(record), JSON.stringify(evidence), method),
  },
  compare_feed_snapshots: {
    description: 'Compare supplied source and feed snapshots for exact item IDs, current USD prices, sale state and availability. Requires schemaVersion 1.0, profile openai-native-stable, explicit asOf, maxAgeHours, capturedAt and evidenceRef. Unresolved evidence yields hold with no proposed changes. No fetches or feed writes. See examples/feed-snapshots.json.',
    schema: z.object({ input: snapshots }).strict(),
    documentation: 'https://www.iamgeorgekelly.com/field-guide/product-feed-freshness',
    run: ({input}) => checkFreshness(input),
  },
  compare_dimensions: {
    description: 'Compare supplied length, width and height using exact decimal unit conversion. Input requires schemaVersion 1.0, source and candidate with itemId, basis product/package, evidenceRef, and each axis as {value: decimal string, unit: mm/cm/m/in}; toleranceMm is an explicit decimal string. Same item, basis and named axes required. Unknowns yield hold. Does not establish physical fit or source truth. See examples/dimensions.json.',
    schema: z.object({ input: dimensions }).strict(),
    documentation: 'https://www.iamgeorgekelly.com/field-guide/product-dimensions-unit-conversion',
    run: ({input}) => compareDimensions(input),
  },
};

function bound(value) {
  let nodes = 0;
  function visit(item, depth) {
    if (++nodes > 15000 || depth > 25) throw new Error('Input exceeds the node or nesting limit.');
    if (item && typeof item === 'object') for (const child of Object.values(item)) visit(child, depth + 1);
  }
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 200000) throw new Error('Keep each request under 200,000 UTF-8 bytes.');
}

export function invokeTool(name, args) {
  try {
    const definition = definitions[name];
    if (!Object.hasOwn(definitions, name)) throw new Error('Unknown tool.');
    bound(args);
    const parsed = definition.schema.safeParse(args);
    if (!parsed.success) throw new Error('Invalid arguments. Use the published tool schema and example inputs.');
    const structuredContent = { toolVersion: version, documentation: definition.documentation, result: definition.run(parsed.data) };
    return { content: [{type: 'text', text: JSON.stringify(structuredContent)}], structuredContent };
  } catch (error) {
    return { isError: true, content: [{type: 'text', text: error instanceof Error ? error.message : 'The request could not be checked.'}] };
  }
}

export function createServer() {
  const server = new McpServer({ name: 'commerce-evidence-toolkit', version }, { instructions: 'These local checks evaluate caller-supplied records only. References are not fetched or authenticated. A match/clear result is not provider acceptance, verified product truth or installation advice. Preserve holds and evidence limitations when reporting results.' });
  for (const [name, definition] of Object.entries(definitions)) {
    server.registerTool(name, { description: definition.description, inputSchema: definition.schema, annotations }, args => invokeTool(name, args));
  }
  return server;
}
