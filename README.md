# Commerce Evidence Toolkit

Three local, read-only checks for agents working with product data. The package wraps the same versioned comparison rules published in the [Agentic Commerce Field Guide](https://www.iamgeorgekelly.com/field-guide).

**Release candidate 0.1.0.** Packaging and protocol tests are complete. A reuse-license decision and public registry publication are pending; do not infer a registry listing from this repository. Original code retains its existing rights-reserved status until an explicit license is applied.

## What it does

| Tool | Inputs | Result |
|---|---|---|
| `review_product_record` | One product object, optional supplied evidence, `copy` or `mapped` method | Selected-field review: `clear` or `hold` |
| `compare_feed_snapshots` | Explicit source and feed snapshots, item IDs, evidence references, timestamps and age policy | `match`, `update_needed` or `hold` |
| `compare_dimensions` | Same item and measurement basis, named length/width/height, units and tolerance | `match`, `mismatch` or `hold` |

The checks do not fetch references, authenticate evidence, contact a merchant, change a feed, place orders or send telemetry. A match is not provider acceptance, live product truth, physical fit or compatibility. This is a selected local review contract, not a complete provider schema validator. Hold results are evidence decisions, not protocol failures.

## Run from source

Requires Node.js 22 or later and npm. Dependency installation uses the network; the three comparison operations run locally after installation.

```sh
npm ci --ignore-scripts
npm test
node server/index.mjs
```

The final command starts an MCP server over standard input/output. It waits for a compatible client; it is not a browser URL. Do not print debug messages to stdout, which carries the protocol.

For a compatible client that accepts an MCP JSON configuration, replace the path below with the absolute location of your checkout:

```json
{
  "mcpServers": {
    "commerce-evidence": {
      "command": "node",
      "args": ["/absolute/path/agentic-commerce-field-guide/server/index.mjs"]
    }
  }
}
```

Client configuration locations differ. This example declares the transport and executable; it does not claim every assistant automatically installs or invokes the server.

## Try a complete input

The files in `examples/` are complete **tool arguments**, not bare internal records. All examples are fictional and use frozen times where relevant.

| Tool | Arguments file | Expected example result |
|---|---|---|
| `compare_dimensions` | [examples/dimensions.json](examples/dimensions.json) | `match` |
| `compare_feed_snapshots` | [examples/feed-snapshots.json](examples/feed-snapshots.json) | `update_needed` |
| `review_product_record` | [examples/product-record.json](examples/product-record.json) | `clear` after explicit mapping |

Ask your client to call the named tool with that file's JSON object. Every successful response includes structured content with `toolVersion`, a canonical `documentation` URL and the full `result`. Each core result retains its own ruleset version and evidence limitations. Incomplete accepted inputs return holds; malformed envelopes and excessive requests return protocol tool errors. The wrapper caps serialized requests at 200,000 UTF-8 bytes and nesting at 25 levels; individual checks impose narrower limits.

Dimension values are positive decimal strings and explicit units (`in`, `cm`, `mm`, `m`); tolerance is a nonnegative decimal string in millimetres. Do not silently rename depth to length, treat diameter as two axes, or substitute package measurements. Product-record review covers selected positive USD fields; feed freshness is a selected current USD snapshot contract. References are caller assertions and are never fetched.

## Verify and package

```sh
npm run verify:artifacts
npm test
node scripts/test-clean-install.mjs
npm run bundle
```

`npm run bundle` creates a local `.mcpb` archive with the production dependencies and a SHA-256 file under `dist/`. The Node package can be built with `npm pack`. A local package build is not an npm or MCP Registry publication.

The test suite compares all 40 fixture/method cases against their source rules (10 dimensions, 6 freshness, and 12 product records under 2 methods), checks error bounds and input immutability, and invokes all 40 over stdio with the TypeScript SDK client. The clean-install test installs the archive into a temporary directory and calls all three tools. A separate [Python SDK client test](scripts/test-python-client.py) calls all three examples and an incomplete-input hold. These are protocol tests with synthetic inputs, not independent users or desktop-app certification.

## Evidence and scope

`provenance.json` records the source site commit, actual production download verification time, and SHA-256 for every file in `artifacts/`. The September 24 snapshot adds dimensions to the existing product-feed and measurement artifacts. Verification recomputes hashes and the earlier portability/freshness cases. Synthetic cases show rule behavior, not merchant error rates or model accuracy.

Primary tool documentation:

- [Product record review](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment)
- [Feed freshness](https://www.iamgeorgekelly.com/field-guide/product-feed-freshness)
- [Dimension comparison](https://www.iamgeorgekelly.com/field-guide/product-dimensions-unit-conversion)
- [Agent access and editorial policy](https://www.iamgeorgekelly.com/for-agents)

Please cite the relevant guide and this version or commit. `CITATION.cff` provides author metadata. To report a correction, open an issue with the tool version, a minimal non-sensitive input, expected result, actual result and supporting reference. Never post customer data or credentials.

## Licensing

No new reuse grant has been applied to the original code in this release candidate. Third-party dependencies retain their own license notices in the packaged dependency directories. Linked specifications, source pages, images and trademarks are not relicensed by this repository.
