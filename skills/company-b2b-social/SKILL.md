---
name: company-b2b-social
description: >-
  Find a company's LinkedIn company page via POST /v1/company/b2b-social:
  domain-required, Serper-verified normalizeLinkedInCompanyUrl company-page
  form or null. Use when the user asks for company LinkedIn URL, company.b2b_social,
  routing.path speed / balance / accuracy / coverage, company_b2b_social,
  or B2B social page lookup.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.6"
---

# KingMinos company B2B social (LinkedIn company page)

Call **KingMinos by OutboundSync** `POST /v1/company/b2b-social` (`company_b2b_social`). One decision: the company's own LinkedIn **company** page URL, or null. Never treat person `/in/` profiles as the answer. This is not an SFDC write. Never print, log, or commit `KINGMINOS_API_KEY`.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Workflow

1. Confirm auth (`auth` skill or `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY`). On `401` / transport failure, render UNVERIFIED and stop.
2. Require **domain** (or `website` / `email` that hygiene-normalize to the same registrable domain). **Name-only without domain/website/email is `400`** — do not call.
3. `POST https://api.kingminos.com/v1/company/b2b-social` with JSON. Typical body:

   ```json
   {
     "domain": "example.com",
     "name": "Acme Example",
     "external_ref": "account-demo-1"
   }
   ```

   Optional: `website`, `email`, `linkedin_url` (must already be `https://www.linkedin.com/company/{slug}` after `normalizeLinkedInCompanyUrl` — agree-check only, not authority), `routing.path` (`speed` | `balance` | `accuracy` | `coverage`; omit = `balance`), `schema_version`: `"2"`.
4. Prefer `X-Router-Explain: minimal` on CRM callouts. Use `full` only when the user asks for `trace`.
5. Branch on control fields: `answer.outcome` (`hit` | `no_decision`), `es_decision`, `answer.reason_code`. Read **`result.linkedin_url`** — Serper-confirmed `https://www.linkedin.com/company/{slug}` (slug lowercased) or null. **`result.verification.status`**: `confirmed` | `unverified` | `rejected`. Structurally valid but unconfirmed pages may appear in `result.unverified` — not hits.
6. HTTP 200 with `no_decision` is a decision, not UNVERIFIED. `400` `*_credentials_required` → hand off to `credentials` (BYOK vendors only on explicit `routing.only` / order — default stacks are house keys).
7. Write **SFDC** or **Salesforce**, never **SF**.

### Paths (live Worker — default stacks are house keys only)

| Path | Stack (summary) | Tier |
| --- | --- | --- |
| `speed` | Websearch company-page query (cap 1) | Fast / tight |
| `balance` (default) | Websearch, then house **AI Ark** even after a search candidate (cap 2) | Verified + broader corroboration |
| `accuracy` | LeadMagic, house AI Ark, then Wiza (cap 5) | Verified-only accept |
| `coverage` | Adds Findymail (cap 6) | All structurally valid LinkedIn hits with confidence (high/low); tighter accept bar than `balance` on verified tier |

BYOK (ZoomInfo `company_linkedin_enrich`, Apollo, Prospeo, Company URL Finder, etc.) is **`routing.only` / explicit order**, not default. `routing.only: ["aiark"]` is allowlisted for km_/session keys when the user wants AI Ark alone.

Hosted MCP: `https://mcp.kingminos.com` — same Bearer and `company_b2b_social` tool. Prefer REST for scripts.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · usable input (domain subject) · HTTP 200 decision envelope.

### Shape

````markdown
## Company B2B social — <hit | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <ready | name-only | missing domain>
Decision  <bar>  <✓|✗|·> <ready | <outcome> | unverified>
```

### Answer
`<run_id> · path <speed|balance|accuracy|coverage> · es_decision <hit|miss|ambiguous|error|noop|reject>`

- <✓|·|✗> outcome — <hit | no_decision> · <reason_code>
- <✓ LinkedIn company page — <url> | · linkedin_url — null>
- · verification — <confirmed|unverified|rejected> · <reason> (from `result.verification`)
- · unverified candidates — <n> (from `result.unverified`; not hits)
- · credits spent <n> · providers <list from usage.providers_ran>
- · UNVERIFIED — <status> (only when the POST failed to return a v2 envelope)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
