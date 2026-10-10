---
name: company-resolve
description: >-
  Resolve a company on the live KingMinos API via POST /v1/company/resolve:
  email, domain, or website in, one answer back. Use when the user asks to
  resolve a company, stamp a ZoomInfo company id, fill Account Name,
  run company.resolve, set routing.path auto / value / accuracy / coverage,
  or explain resolved vs resolved_without_primary_id vs es_decision hit/miss.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.2.0"
---

# KingMinos company resolve

Call **KingMinos by OutboundSync** `POST /v1/company/resolve`. This is an enrichment decision, not an SFDC write. Never print, log, or commit `KINGMINOS_API_KEY`. Do not stamp a ZoomInfo company id from a name-only match.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Workflow

1. Confirm auth (`auth` skill or `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY`). On `401` / transport failure, render UNVERIFIED and stop.
2. Require at least one of `email`, `domain`, or `website`. **Name-only is `no_decision` / `no_domain`** — do not search, do not stamp an id.
3. `POST https://api.kingminos.com/v1/company/resolve` with JSON. Typical body:

   ```json
   {
     "email": "contact@example.com",
     "external_ref": "account-demo-1"
   }
   ```

   Optional: `domain`, `website`, `name`, `routing.path` (`value` | `auto` | `accuracy` | `coverage`; omit = `auto`), `routing.preset` (`name_only` → `value`; `zi_stamp` = ZoomInfo-first), `schema_version`: `"2"`.
4. Prefer `X-Router-Explain: minimal` (alias of `default`) on CRM callouts. Use `full` only when the user asks for `trace`.
5. Read **control** fields only: `answer.outcome`, `es_decision`, `answer.safe_to_write`, `answer.reason_code`. `answer.summary` and `sources` are explain — not control flow.
6. Branch on `answer.safe_to_write` (do not re-derive fill/stamp rules):
   - `safe_to_write.zoominfo_company_id` → stamp-safe ZoomInfo company id from `result.zoominfo_company_id`.
   - `safe_to_write.company_name` → fill-if-blank Account Name from `result.company_name`.
   - `safe_to_write.company_domain` → optional domain hygiene; never clobber an existing Website/domain.
   - Label the outcome from `answer.outcome`: `resolved` · `resolved_without_primary_id` · `no_decision` (honest abstain: `no_domain`, `zero_hits`, `not_configured`, credits, compliance).
   - HTTP 200 with a business miss is a decision, not UNVERIFIED.
   - `400` `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` / `lemlist_credentials_required` → hand off to `credentials` (ZoomInfo, BuiltWith, Prospeo, Apollo, People Data Labs, HG Insights, Enrich-CRM, and Lemlist are BYOK on resolve; store in the app UI). LeadMagic, Wiza, Findymail, and AIArk are house-key and should not produce a credentials_required error for a default tenant. `companyurlfinder_credentials_required` is **`company.domain` / name→domain only** — not a normal `company.resolve` 400.
7. Write **SFDC** or **Salesforce**, never **SF**.

Default linear order is `[websearch, zoominfo, leadmagic]` with `allow_fallbacks` and `free_first: false`. `auto` may run Wiza then Findymail only after a websearch miss/junk reject. `value` never calls those paid name hops. AIArk, Prospeo, Apollo, People Data Labs, HG Insights, Enrich-CRM, and Lemlist are registered but **not** on any default resolve path (`routing.only` escapes). Company URL Finder is a **`company.domain`** name→domain hop (`routing.only: ["companyurlfinder"]`), not resolve. For LinkedIn company pages use **`company-b2b-social`** (`POST /v1/company/b2b-social`), not resolve. For favicon-style **`icon_url`** stamping use **`company-icon`** (`POST /v1/company/icon`, `company.icon`) — ladder house favicon-fetch (0 credits) → Brandfetch BYOK (1, soft-fail and continue) → ZoomInfo enrich logo (1); Enrich-CRM, AI Ark, LeadMagic, and Prospeo are not icon sources. LeadMagic, Wiza, Findymail, and AIArk are house-key vendors; ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, Lemlist, Snov.io, Cognism, Lusha, Starbridge, Clay, and Databar are BYOK — store Company URL Finder keys for `company.domain`, Brandfetch keys for `company.icon`; Snov.io is a credential vendor only — not for resolve (`credentials`).

Hosted MCP (`https://mcp.kingminos.com`) tool: `company_resolve`. Do not invent `resolve_company` or tools outside the pack map.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · usable input · HTTP 200 decision envelope. Stamp rules live on the Answer card (not a fourth gate).

### Shape

````markdown
## Company resolve — <resolved | resolved without primary id | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <ready | name-only | missing>
Decision  <bar>  <✓|✗|·> <ready | <outcome> | unverified>
```

### Answer
`<run_id> · path <auto|value|accuracy|coverage> · es_decision <hit|miss|ambiguous|error|noop|reject>`

- <✓|·|✗> outcome — <resolved | resolved_without_primary_id | no_decision> · <reason_code>
- <✓|·> company_name — <name or null> (fill-if-blank when `answer.safe_to_write.company_name`)
- <✓ stamp-safe ZoomInfo company id <id> | · do not stamp — `safe_to_write.zoominfo_company_id` is false>
- · company_domain — <domain or null> (hygiene — write only when `answer.safe_to_write.company_domain`; never clobber)
- · credits spent <n> · providers <list from usage.providers_ran>
- · UNVERIFIED — <status> (only when the POST failed to return a v2 envelope)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
