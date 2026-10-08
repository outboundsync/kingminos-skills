---
name: company-description
description: >-
  Stamp a company description via POST /v1/company/description: domain-required,
  paths speed / balance / accuracy / coverage, result.description with quality
  flags and confidence. Use when the user asks for company.description,
  company_description, Account Description, company blurb, firmographic
  description paragraph, routing.path speed balance accuracy coverage for
  description, or whether description text is safe to write to the CRM.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos company description (`company.description`)

Call **KingMinos by OutboundSync** `POST /v1/company/description` (`company_description`). One decision: a **usable company description paragraph** (`result.description`, 40–2000 characters) for stamping, or null. Engine **`first_acceptable`** — first text that passes the path’s quality gate wins. This is **`company.description`**, not LinkedIn social copy or a marketing tagline field. This is not an SFDC write. Never print, log, or commit `KINGMINOS_API_KEY`.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Integrator SoT (paths, flags, billing): `docs/company-description.md` in [kingminos-application](https://github.com/outboundsync/kingminos-application) (aligned with PR #177 OpenAPI). Square **`icon_url`** stamps are **`company-icon`** — cross-link only when the user asked for both.

## Workflow

1. Confirm auth (`auth` skill or `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY`). On `401` / transport failure, render UNVERIFIED and stop.
2. Require **domain** (or `website` / `email` that hygiene-normalize to the same registrable domain). **Name-only without domain/website/email is `400`** — do not call.
3. Pick **`routing.path`** (or top-level `path`; nested `routing.path` wins):

   | Path | When to use | What you get |
   | --- | --- | --- |
   | `speed` | Cheapest; good enough for internal preview or when you will human-edit | Raw homepage-derived text — may read hypey or first-person |
   | `balance` (default) | CRM fill when you want a neutral third-person blurb without paying for `accuracy` | Cleaner, neutral sentence (compose when the Worker has enough signal) |
   | `accuracy` | CRM or customer-facing copy that must be tight and factual | Factual compose with a stricter accept bar |
   | `coverage` | Blocked, bot-walled, or very thin homepages where cheaper paths miss | Spends more (higher cap / recovery) to still return text |

4. `POST https://api.kingminos.com/v1/company/description` with JSON. Typical body:

   ```json
   {
     "domain": "example.com",
     "name": "Acme Example",
     "routing": { "path": "balance" },
     "external_ref": "account-demo-1",
     "schema_version": "2"
   }
   ```

   Optional: `website`, `email`, `routing.only` (BYOK escapes — e.g. `["zoominfo"]` for ZoomInfo firmographic only), `dry_run`, `compliance`.
5. Prefer `X-Router-Explain: minimal` on CRM callouts. Use `full` only when the user asks for `trace`.
6. Branch on control fields: `answer.outcome` (`hit` | `no_decision`), `es_decision`, `answer.reason_code`, `answer.confidence` (`high` | `medium` | `low`). Read **`result.description`** and **`result.flags`** (`hype`, `first_person`, `tagline`, `same_as_speed`).
7. **CRM stamp safety:** `answer.safe_to_write.description` is true only when `es_decision=hit` and the text is non-blank. For production CRM writes, **prefer `answer.confidence=high` with `result.flags.hype` and `result.flags.first_person` both false** — hold or human-review when either flag is true, when `tagline` is true on non-`speed` paths, or when `same_as_speed` is true on a path that promised compose. Never invent description text on `no_decision`.
8. HTTP 200 with `no_decision` is a decision, not UNVERIFIED. `400` `*_credentials_required` → hand off to `credentials` (BYOK ZoomInfo when forced via `routing.only`).
9. Write **SFDC** or **Salesforce**, never **SF**.

### Routing (live Worker — default stacks)

**House site fetch → house AI Ark firmographic compose** on default paths. **AI Ark is the only default firmographic vendor** on this slice. **ZoomInfo firmographic is BYOK only** — `routing.only: ["zoominfo"]` (or explicit order), not the default ladder. LeadMagic, Wiza, Findymail, websearch, Brandfetch, and other registered vendors are **not** default description sources — `routing.only` when the user explicitly needs an escape.

### Billing

**Winner-only:** only the winning attempt is charged; a full miss costs **0** credits. Read **`usage.credits.spent`** and **`usage.credits.by_provider`** on every run — do not infer spend from the path name alone.

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
- · flags — hype <true|false> · first_person <true|false> · tagline <true|false> · same_as_speed <true|false>
- · safe_to_write.description — <true|false> (stamp only when true, non-blank text, and flags/confidence meet your CRM bar)
- · stack — house site fetch → AI Ark compose (default); ZoomInfo firmographic BYOK via routing.only only
- · credits spent <n> · providers <list from usage.providers_ran> (winner-only; miss = 0)
- · UNVERIFIED — <status> (only when the POST failed to return a v2 envelope)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
