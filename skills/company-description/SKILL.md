---
name: company-description
description: >-
  Stamp a company description via POST /v1/company/description: domain-required,
  paths speed / balance / accuracy / coverage, result.description with quality
  flags, confidence, identity, and the safe_to_write gate. Use when the user asks for company.description,
  company_description, Account Description, company blurb, firmographic
  description paragraph, routing.path speed balance accuracy coverage for
  description, or whether description text is safe to write to the CRM.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.3"
---

# KingMinos company description (`company.description`)

Call **KingMinos by OutboundSync** `POST /v1/company/description` (`company_description`). One decision: a **usable English company description** (`result.description`, `max_chars` 80–500, default 300) for stamping, or null. Engine **`first_acceptable`**, hits-first: quality issues are **flags**, not misses. This is **`company.description`**, not LinkedIn social copy. This is not an SFDC write. Never print, log, or commit `KINGMINOS_API_KEY`.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Integrator walk-through: [kingminos.com/docs/api/company-description/](https://kingminos.com/docs/api/company-description/). Square **`icon_url`** stamps are **`company-icon`** — cross-link only when the user asked for both.

## Workflow

1. Confirm auth (`auth` skill or `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY`). On `401` / transport failure, render UNVERIFIED and stop.
2. Require **domain** (or `website` / `email` that hygiene-normalize to the same registrable domain). **Name-only without domain/website/email is `400`** — do not call.
3. **Send `path` explicitly** (recommended; or `routing.path`; nested wins). The API accepts an omitted path (it runs `balance`), but the credit cap becomes **6** instead of **2**. The four paths are distinct, nested ladders — a more expensive path never misses where a cheaper one hit:

   | Path | Stack | Cap |
   | --- | --- | --- |
   | `speed` | Homepage meta / og description (deterministic gates), then house **AI Ark** | 1 |
   | `balance` | Jev-ranked homepage extracts + meta/og + AI Ark; optional neutral rewrite (0.5) | 2 |
   | `accuracy` | Neutral third-person **xAI** compose from homepage evidence (2) + one Jev identity check; falls back to the cheaper hit | 3 |
   | `coverage` | Accuracy compose plus off-homepage house websearch (0.1) and **ZoomInfo BYOK** evidence; falls back to the accuracy winner | 6 |

4. `POST https://api.kingminos.com/v1/company/description` with JSON. Typical body:

   ```json
   {
     "domain": "example.com",
     "name": "Acme Example",
     "path": "balance",
     "external_ref": "account-demo-1",
     "schema_version": "2"
   }
   ```

   Optional: `website`, `email`, `max_chars` (80–500), `routing.only` (e.g. `["zoominfo"]` with a stored ZoomInfo key), `dry_run`, `compliance`.
   **Cache bypass** on `company.description` (30-day result cache) and `company.domain` (short TTL, about five minutes max; skips read only, still writes): header `X-Router-Cache: bypass` (any other value → `400 invalid_cache`), or `Cache-Control: no-cache` / `no-store`, or body `skip_cache: true`. Reusing the same `Idempotency-Key` still returns the stored response — omit or rotate that header when you need a fresh run despite bypass. **`company.resolve` silently ignores bypass** and may return a cached answer.
5. Prefer `X-Router-Explain: minimal` on CRM callouts. Use `full` only when the user asks for `trace`.
6. Read control fields: `es_decision`, `answer.outcome` (`hit` | `no_decision`), `answer.confidence` (`high` | `medium` | `low` | null), `answer.identity` (`{method: jev | name_domain | own_homepage, score}` or null), `result.description`, and `result.flags` (`hype`, `first_person`, `tagline`, `same_as_speed`, `truncated`, `cta`, `grammar`; ignore unknown keys).
7. **CRM stamp rule:** stamp `result.description` **only when `answer.safe_to_write.description` is true** — decide from `safe_to_write`, not from `grammar`. It is true only on a hit with non-blank text, confidence `medium`/`high`, **and** a non-null `answer.identity` (Jev ≥ 0.85, name/domain match, or the input domain's own homepage). `truncated` and `cta` force confidence `low`, and **low is never safe to write**. `hype` / `first_person` / `tagline` / `same_as_speed` / `grammar` are advisory flags — `grammar` is informational only and does not change confidence or `safe_to_write`; the text may still be safe; apply your own CRM style bar on top. Never invent description text on `no_decision`.
8. HTTP 200 with `no_decision` is a decision, not UNVERIFIED. `400` `zi_credentials_required` → hand off to `credentials` (ZoomInfo forced via `routing.only` without a stored key).
9. Write **SFDC** or **Salesforce**, never **SF**.

### Vendors

**AI Ark is the only firmographic vendor** on this capability (house key). House site fetch, Jev, xAI compose/rewrite, and websearch (coverage) are house steps. **ZoomInfo is BYOK only** (never the house key). **LeadMagic, Wiza, Findymail, Brandfetch, Lemlist, and Snov.io are not `company.description` vendors.**

### Billing

**Winner-only:** only the hop that produced the returned text is charged (AI Ark 1, rewrite 0.5, compose 2, websearch 0.1, ZoomInfo BYOK 1 on a full match). Rejected/lost hops and a miss cost **0**. Read **`usage.credits.spent`** and **`usage.credits.by_provider`** on every run — do not infer spend from the path name.

Hosted MCP: `https://mcp.kingminos.com` — same Bearer and `company_description` tool. Prefer REST for scripts.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · usable input (domain subject) · HTTP 200 decision envelope.

### Shape

````markdown
## Company description — <hit | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <ready | name-only | missing domain>
Decision  <bar>  <✓|✗|·> <ready | <outcome> | unverified>
```

### Answer
`<run_id> · path <speed|balance|accuracy|coverage> · es_decision <hit|miss|ambiguous|error|noop|reject> · confidence <high|medium|low|null>`

- <✓|·|✗> outcome — <hit | no_decision> · <reason_code>
- <✓ description — <excerpt or full per user> | · description — null>
- · flags — hype <b> · first_person <b> · tagline <b> · same_as_speed <b> · truncated <b> · cta <b> · grammar <b>
- · identity — <jev <score> | name_domain | own_homepage | null>
- <✓|·> safe_to_write.description — <true|false> (stamp only when true; low confidence or null identity is never safe)
- · credits spent <n> · providers <list from usage.providers_ran> (winner-only; miss = 0)
- · UNVERIFIED — <status> (only when the POST failed to return a v2 envelope)

### Next
1. <shortest action tied to a ✗, a false safe_to_write, or UNVERIFIED above>
````
