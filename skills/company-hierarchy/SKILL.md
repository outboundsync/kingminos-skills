---
name: company-hierarchy
description: >-
  Decide and audit the KingMinos company.hierarchy answer: the immediate and
  ultimate parent of a company plus its capped subsidiary list. Use when the
  user asks who owns a company, for a corporate family tree, why hierarchy
  came back no_hierarchy_data, what hierarchy_depth or family_tree_size mean,
  or how to stamp parent names from ZoomInfo safely.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos company.hierarchy

One decision: **who owns this company (immediate + ultimate parent), and who sits under it?** `POST /v1/company/hierarchy` is the corporate family tree — separate from domain identity. Read-only enrichment; every business miss is HTTP 200. Branch on `answer.outcome` / `es_decision`.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Policy (locked)

- Outcomes: **`subsidiary` | `ultimate_parent` | `no_decision`** — there is no "standalone" outcome. `subsidiary` / `ultimate_parent` → `es_decision: hit`; `no_decision` maps by reason (`no_match` / `no_hierarchy_data` → `miss`; `ambiguous` / `sources_disagree` / `domain_mismatch` → `ambiguous`; `provider_unavailable` → `error`; budget/compliance/config → `noop`).
- **Identity first:** `speed` resolves identity with free Wikidata `exact_one` on P856 official-website (cap 0). `balance` (default) / `accuracy` add a ZoomInfo company search (`exact_one`, 0 credits; a candidate whose registrable domain ≠ input is `domain_mismatch`, never enriched) then the corporate-hierarchy enrich — **1 credit on the first `FULL_MATCH` only**; rematch / `NO_MATCH` / errors are free. `speed`/`balance`/`accuracy` all cap at 1; legacy `fast`/`value`/`name_only` → `speed`, `auto` → `balance`; **`coverage` is `400 invalid_routing`**.
- **Input:** one of `domain` | `website` | `email` (required; name alone is `400 validation_failed` with `fields: [domain, website, email]`). Optional `name` (alias `company_name`), `country`, `dry_run`, `external_ref`, `compliance`. **Disagreeing `domain` / `email` / `website` → `400 domain_website_mismatch`** — this capability does not adjudicate identity (contrast `company.domain`).
- Subsidiaries are **capped at 50** with `family_tree_size` (raw node count) + `truncated` (boolean) telling you what was cut; parent/subsidiary `*_domain` is null unless Wikidata filled it — join websites via `zoominfo_company_id`. Raw ZoomInfo `familyTree` never reaches the wire (4 MiB read cap).
- `es_decision: hit` (subsidiary/ultimate_parent) is the stamp gate — fill `zoominfo_company_id` only on hit + non-blank id. Not in `openapi.es.yaml` yet: no External Services action until Harris opens it.
- `exact_one`; no fuzzy; ties never broken. An ambiguous search or a mismatched single hit does **not** enrich. A ZoomInfo alias gap (`billpay.com`-style `NO_MATCH`) is `no_hierarchy_data`, not an entitlement miss — alias repair belongs on `company.domain`.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Send `POST /v1/company/hierarchy` with `domain` (or `website` / `email`) plus optional `name` / `country`. Recommend explicit `routing.path` only when the caller wants `speed`.
3. Render the verdict from `answer.outcome`: the tree (parents + capped subsidiaries, `hierarchy_depth`, `truncated`) on a hit; `no_decision` with its reason on a miss.
4. Business misses stay HTTP 200 — `no_match`, `no_hierarchy_data`, `ambiguous`, `domain_mismatch` are answers, never failures.
5. `400` errors to relay verbatim: `validation_failed` | `domain_website_mismatch` | `invalid_routing` | `invalid_compliance` | `invalid_explain` | `invalid_schema` | `unsupported_schema`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`. `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` with `Retry-After`. A vendor error or timeout after contact is a skipped hop recorded as `provider_unavailable` — HTTP 200, never a 500.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (identity subject present) · decision (tree or reason rendered).

### Shape

````markdown
## Hierarchy — <subsidiary | ultimate parent | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <domain | website | email | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — tree returned | miss — no_hierarchy_data | ambiguous | noop | unverified>
```

### Tree
`<company_name · company_domain>`

- <✓ immediate_parent `<name>` <domain> | ✗ no_decision — <reason>>
- <✓ ultimate_parent `<name>` <domain> · hierarchy_depth <n>>
- <· subsidiaries (n of family_tree_size, truncated true|false) — join websites via zoominfo_company_id>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
