# Agentic Commerce Field Guide — reproducible artifacts

Practical product-data checks and reference files by [George Kelly](https://www.iamgeorgekelly.com/about). This repository is a public companion to the [Agentic Commerce Field Guide](https://www.iamgeorgekelly.com/field-guide).

**Start with a task:** [product data, commerce economics, supervised releases, or measurement](https://www.iamgeorgekelly.com/field-guide/start-here).

## Reproduce the product-feed experiment

The experiment compares unchanged copying with explicit mapping across **12 synthetic records**: two controls and ten failure cases. Under the declared local checks, copying clears 2 of 12; mapping clears 6 of 12. Mapping repairs four representation problems. Six cases still require missing or conflicting evidence to be resolved.

This is a deterministic demonstration, not provider certification, an AI benchmark, or evidence of customer outcomes. It does not upload a feed or contact a model.

Requires Node.js 24 or later. No packages, API keys, or network access are needed to run the check after downloading the repository.

```sh
node artifacts/product-feed-portability.mjs --check
node artifacts/product-feed-portability.mjs > local-results.json
```

The first command checks the recorded results and source hashes. The second writes a fresh report, including an execution timestamp. Read the [methodology, controls, results, and limitations](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment).

| File | Purpose | Explanation |
| --- | --- | --- |
| [Runner](artifacts/product-feed-portability.mjs) | Local mapping and review rules | [Experiment](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment) |
| [Cases](artifacts/product-feed-portability-cases.json) | Frozen synthetic inputs and supplied evidence | [Variant acceptance](https://www.iamgeorgekelly.com/field-guide/product-variant-acceptance-test) |
| [Recorded results](artifacts/product-feed-portability-results.json) | Expected observations and hashes | [Results and scope](https://www.iamgeorgekelly.com/field-guide/product-feed-portability-experiment#observed-results) |
| [20-field reference](artifacts/product-feed-reference.json) | Selected Shopify, Google, and OpenAI field representations | [Field reference](https://www.iamgeorgekelly.com/field-guide/product-feed-field-reference) |
| [Identity ledger](artifacts/product-identity-ledger.json) | Fictional SKU, GTIN, parent, and offer review decisions | [Product identifiers](https://www.iamgeorgekelly.com/field-guide/product-identifiers-sku-gtin-variants) |
| [Metric dictionary](artifacts/ai-visibility-metrics.json) | Units, source notes, and interpretation limits | [AI visibility metrics](https://www.iamgeorgekelly.com/field-guide/ai-visibility-metrics-reference) |

## Other working resources

- [ROAS and contribution calculator](https://www.iamgeorgekelly.com/field-guide/roas-poas-profit#calculator): compare advertising return with contribution after variable costs.
- [Inventory and ad-spend worksheet](https://www.iamgeorgekelly.com/field-guide/inventory-aware-ad-spend): check the daily stock path before increasing spend.
- [AI review and rework cost calculator](https://www.iamgeorgekelly.com/field-guide/ai-review-rework-cost): count preparation, supervision, review, and corrections.
- [AI search measurement collection](https://www.iamgeorgekelly.com/field-guide/ai-search-measurement): definitions, worksheets, report reconciliation, and planning.
- [Source directory](https://www.iamgeorgekelly.com/field-guide/sources): original references with per-guide scope notes and recorded check dates.
- [Agent access and API documentation](https://www.iamgeorgekelly.com/for-agents): matching Markdown and JSON, feeds, and the implemented read-only contribution endpoint.

## Provenance, updates, and citation

These files were downloaded from their existing public website URLs on 2026-09-18. [provenance.json](provenance.json) records each source URL and SHA-256 hash. This repository is a snapshot; the website carries the current editorial edition. Provider documentation can change after a recorded source check.

Cite the specific article, author, and editorial date. When reproducing these files, also record the repository commit. [CITATION.cff](CITATION.cff) supplies repository citation metadata.

Examples remain synthetic or illustrative. They are not employer performance results. Original frameworks are editorial proposals; linked documentation supports only the claims identified in the source notes. See the [editorial policy and correction process](https://www.iamgeorgekelly.com/for-agents#editorial-policy).
