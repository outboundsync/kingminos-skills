---
name: company-domain
description: >-
  Decide and audit the KingMinos company.domain stamp: which domain a CRM
  account should carry, whether it is write-safe, and which ownership-proven
  account aliases come with it. Use when the user asks to verify a company
  domain, why a domain was rejected or unverified, what discovered_domain or
  additional_domains mean, which domain_family to use, or how to fill
  Domain__c safely from KingMinos.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos company.domain

One decision: **what should the CRM domain field say, and is it safe to write?** `POST /v1/company/domain` returns a trusted stamp (`company_domain`), optional ownership-proven account aliases (`additional_domains`), and review columns (`review_domains`, `related_domains`, `discovered_domain`). Read-only enrichment: a business miss is HTTP 200 — branch on `answer.outcome` / `es_decision`, never on the status code.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Policy (locked)

| `answer.outcome` | `es_decision` | What it means | Domain field action |
| --- | --- | --- | --- |
| `verified` / `corrected` / `discovered` | `hit` | Trusted stamp — `result.company_domain` non-null | Write the domain (`safe_to_write.company_domain` true) |
| `rejected` | `reject` | Input is junk (mailbox, social, directory, platform apex, unparseable) | **Do not write** the input; optional half-trusted find is `discovered_domain` only |
| `unverified` | `miss` | Clean enough to look at, not safe to stamp (mismatch, unconfirmed, dead, parked, no web, sources disagree) | Hold for review |
| `no_decision` | by reason (`insufficient_input` → `noop`) | Router skipped | Do not write |

- **Write-safe gate is `answer.safe_to_write.company_domain`** — `result.company_domain` non-null and `es_decision: hit`. Read the gate instead of re-implementing it.
- Paths (`routing.path` or flattened `path`; nested wins; omit → `balance`): `speed` (hygiene + DNS + site probe, cap 0) · `balance` (adds a 0-credit ZoomInfo search on tenant `default`; no-ZI fallthrough to LeadMagic then Serper, cap 0-2) · `accuracy` (ZI → LeadMagic → websearch, miss-only, plus free Wikidata/GLEIF/RDAP evidence, cap 2) · `coverage` (adds BuiltWith Relationships, cap 3). Legacy `fast`/`value`/`name_only` → `speed`, `auto` → `balance`.
- **Disagreeing `domain` / `email` / `website` is accepted, not a 400** — the capability adjudicates. ZoomInfo is BYOK for workspace keys; the house key runs only on tenant `default` (SFDC Flow).
- Result fields that are **not** the stamp: `account_primary_domain` (HubSpot `domain` — `collapse_brand` can lift a regional above `company_domain`), `additional_domains` (ownership-proven only — never "all domains found"), `review_domains` / `related_domains` (review columns), `discovered_domain` (half-trusted side column), `corrected_from` / `corrected_via`.
- `exact_one`; no fuzzy. Weak discovery abstains (`R11_discovery_abstain`) — it never invents. A dead-domain verdict is soft `unverified`, not `rejected`.
- Cache: per-tenant ~5-minute result cache; bypass the **read** with `X-Router-Cache: bypass` / `Cache-Control: no-cache` / `skip_cache: true`. Bypass does not skip Idempotency-Key replay — omit or rotate the key.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Send `POST /v1/company/domain` with any of `domain` / `website` / `email` / `name` (alias `company_name`); ≥ 1 required or `400 validation_failed`. Optional `family_policy` (`collapse_brand` default | `separate_regional`), `city` / `state` / `country` / `postal_code` / `phone`, `dry_run`, `external_ref`.
3. A `/in/` LinkedIn URL is `400 validation_failed` (`linkedin_person_url_not_allowed`) — company pages only.
4. Branch on `answer.outcome` / `es_decision`. Business misses (`rejected` / `unverified` / `no_decision`) stay HTTP 200 — render them as the verdict, never as an empty result.
5. Stamp only when `answer.safe_to_write.company_domain` is true. Name fill-if-blank may use `result.company_name` whenever present (including a miss); never clobber an existing domain with `discovered_domain`.
6. Aliases: HubSpot `domain` ← `account_primary_domain` and `hs_additional_domains` ← `additional_domains.join(";")` — the caller joins. `review_domains` / `related_domains` are review columns, never merges.
7. `400` errors to relay verbatim: `validation_failed` | `invalid_routing` | `invalid_compliance` | `invalid_explain` | `invalid_schema` | `unsupported_schema` | `invalid_cache` | `builtwith_credentials_required` (coverage path needs the BuiltWith key) | `zi_credentials_required` (explicit `zi_stamp` / `routing.only: ["zoominfo"]` without Your Keys).

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied` — the key lacks the `company.domain` scope. `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` with `Retry-After`. `503` `store_unavailable` is retryable with the same `Idempotency-Key`.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (one subject field present) · decision (outcome rendered with the stamp verdict).

### Shape

````markdown
## Domain — <verified | corrected | discovered | rejected | unverified | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <domain | website | email | name | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — write-safe | reject — do not write | miss — hold for review | noop | unverified>
```

### Stamp
`<input summary>`

- <✓ company_domain `<domain>` — safe_to_write true | ✗ rejected: <reason> — do not write the input | · UNVERIFIED — <reason>>
- <· discovered_domain / corrected_from / family_policy / account_primary_domain when present>
- <· additional_domains (n) — ownership-proven only | review_domains (n) — review before use>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
