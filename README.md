# Agentic Commerce Field Guide — reproducible artifacts

Practical product-data checks and reference files by [George Kelly](https://www.iamgeorgekelly.com/about). This repository is a public companion to the [Agentic Commerce Field Guide](https://www.iamgeorgekelly.com/field-guide).

**Start with a task:** [product data, commerce economics, supervised releases, or measurement](https://www.iamgeorgekelly.com/field-guide/start-here).

## Compare feed price and stock snapshots

The [feed-freshness guide](https://www.iamgeorgekelly.com/field-guide/product-feed-freshness) includes a local checker for exact item IDs, current USD prices, explicit sale state, and availability. Supply a source snapshot and a feed snapshot in the [example comparison format](artifacts/feed-freshness-example.json). The checker identifies selected-field differences or holds uncertain input for review. It does not fetch evidence, contact a provider, edit a feed, or establish what shoppers see.

Requires Node.js 24 or later. No packages, API keys, or network access are needed after downloading the repository.

```sh
node artifacts/check-feed-freshness.mjs artifacts/feed-freshness-example.json
```

The fictional example reports `update_needed`, with exit code `1`, because the supplied source has a sale and the feed does not. Exit code `0` means the selected fields match; `2` means hold or invalid input. The CLI needs [feed-freshness.mjs](artifacts/feed-freshness.mjs) beside it.

[Six synthetic cases](artifacts/feed-freshness-cases.json) cover a sale starting, a sale ending, stock selling out, preorder availability, one variant changing, and conflicting timestamps. Their fixed reference times make the examples repeatable; they do not describe customer incidents or real-world error rates.

```sh
node scripts/verify-artifacts.mjs
```

This verifies every artifact against its recorded SHA-256 and reproduces the six freshness decisions, the example CLI result, and the recorded portability experiment.

## Reproduce the product-feed experiment

The experiment compares unchanged copying with explicit mapping across **12 synthetic records**: two controls and ten failure cases. Under the declared local checks, copying clears 2 of 12; mapping clears 6 of 12. Mapping repairs four representation problems. Six cases still require missing or conflicting evidence to be resolved.

This is a deterministic demonstration, not provider certification, an AI benchmark, or evidence of customer outcomes. It does not upload a feed or contact a model.

```sh
node artifacts/product-feed-portability.mjs --check
node artifacts/product-feed-portability.mjs > local-results.json
```

The first command checks the recorded results and source hashes. The second writes a fresh report, including an execution timestamp. Read the [methodology, controls, results, and limitations](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment).

| File | Purpose | Explanation |
| --- | --- | --- |
| [Runner](artifacts/product-feed-portability.mjs) | Recorded experiment and local-file entry point | [Experiment](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment) |
| [Shared review core](artifacts/product-feed-review.mjs) | Mapping and review rules also used by the browser checker | [Check your record](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment#explore-cases) |
| [Cases](artifacts/product-feed-portability-cases.json) | Frozen synthetic inputs and supplied evidence | [Variant acceptance](https://www.iamgeorgekelly.com/field-guide/product-variant-acceptance-test) |
| [Recorded results](artifacts/product-feed-portability-results.json) | Expected observations and hashes | [Results and scope](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment#observed-results) |
| [20-field reference](artifacts/product-feed-reference.json) | Selected Shopify, Google, and OpenAI field representations | [Field reference](https://www.iamgeorgekelly.com/field-guide/product-feed-field-reference) |
| [Identity ledger](artifacts/product-identity-ledger.json) | Fictional SKU, GTIN, parent, and offer review decisions | [Product identifiers](https://www.iamgeorgekelly.com/field-guide/product-identifiers-sku-gtin-variants) |
| [Metric dictionary](artifacts/ai-visibility-metrics.json) | Units, source notes, and interpretation limits | [AI visibility metrics](https://www.iamgeorgekelly.com/field-guide/ai-visibility-metrics-reference) |

## Review your own product record

Save one product JSON object as `product.json` and run an unchanged review:

```sh
node artifacts/product-feed-portability.mjs --record product.json
```

To apply the declared field mappings, add `--method mapped`. Optional evidence is a separate JSON object, for example `{"pagePrice":"18.00 USD","dimensionBasis":"product"}`:

```sh
node artifacts/product-feed-portability.mjs --record product.json --evidence evidence.json --method mapped
```

The runner requires [product-feed-review.mjs](artifacts/product-feed-review.mjs) in the same folder. Input and optional evidence together must fit within 64 KiB. The result retains input, supplied evidence, changes, field issues, and limits. Missing or conflicting facts are not inferred; supplied evidence is not independently verified. No issue in this small canonical-field and positive-USD subset does not mean provider acceptance.

## Other working resources

- [ROAS and contribution calculator](https://www.iamgeorgekelly.com/field-guide/roas-poas-profit#calculator): compare advertising return with contribution after variable costs.
- [Inventory and ad-spend worksheet](https://www.iamgeorgekelly.com/field-guide/inventory-aware-ad-spend): check the daily stock path before increasing spend.
- [AI review and rework cost calculator](https://www.iamgeorgekelly.com/field-guide/ai-review-rework-cost): count preparation, supervision, review, and corrections.
- [AI search measurement collection](https://www.iamgeorgekelly.com/field-guide/ai-search-measurement): definitions, worksheets, report reconciliation, and planning.
- [Source directory](https://www.iamgeorgekelly.com/field-guide/sources): original references with per-guide scope notes and recorded check dates.
- [Agent access and API documentation](https://www.iamgeorgekelly.com/for-agents): matching Markdown and JSON, feeds, and the implemented read-only contribution endpoint.

## Provenance, updates, and citation

This September 21, 2026 snapshot contains selected public website download artifacts. [provenance.json](provenance.json) records each public source URL, SHA-256 hash, source website commit, and production verification timestamp. This repository is a snapshot; the website carries the current editorial edition. Provider documentation can change after a recorded source check.

Cite the specific article, author, and editorial date. When reproducing these files, also record the repository commit. [CITATION.cff](CITATION.cff) supplies repository citation metadata.

Examples remain synthetic or illustrative. They are not employer performance results. Original frameworks are editorial proposals; linked documentation supports only the claims identified in the source notes. See the [editorial policy and correction process](https://www.iamgeorgekelly.com/for-agents#editorial-policy).
