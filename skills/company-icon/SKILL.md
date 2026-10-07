---
name: company-icon
description: >-
  Stamp a company square icon URL via POST /v1/company/icon: domain-required,
  live HTTPS icon_url only (favicon-style), default ladder house favicon-fetch
  (0 credits) then Brandfetch BYOK (1, soft-fail and continue) then ZoomInfo
  enrich logo (1). Use when the user asks for company.icon, company_icon,
  icon_url, account icon stamp, favicon for a company domain, or Brandfetch
  icon lookup — not company logo wording.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.1"
---

# KingMinos company icon (`company.icon`)

Call **KingMinos by OutboundSync** `POST /v1/company/icon` (`company_icon`). One decision: a **square, favicon-style** company **`icon_url`** (live `https://` only) for stamping, or null. This is **`company.icon`**, not a marketing logo field. There is **no R2/D1 cache URL** in the answer — stamp the returned HTTPS URL or abstain. This is not an SFDC write. Never print, log, or commit `KINGMINOS_API_KEY`.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Firmographic text blurbs are **`company.description`** (separate slice) — only cross-link when the user asked for both.

## Workflow

1. Confirm auth (`auth` skill or `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY`). On `401` / transport failure, render UNVERIFIED and stop.
2. Require **domain** (or `website` / `email` that hygiene-normalize to the same registrable domain). **Name-only without domain/website/email is `400`** — do not call.
3. `POST https://api.kingminos.com/v1/company/icon` with JSON. Typical body:

   ```json
   {
     "domain": "example.com",
     "name": "Acme Example",
     "external_ref": "account-demo-1"
   }
   ```

   Optional: `website`, `email`, `routing.only` (BYOK escapes — e.g. `["brandfetch"]`, `["zoominfo"]`), `schema_version`: `"2"`.
4. Prefer `X-Router-Explain: minimal` on CRM callouts. Use `full` only when the user asks for `trace`.
5. Branch on control fields: `answer.outcome` (`hit` | `no_decision`), `es_decision`, `answer.reason_code`. Read **`result.icon_url`** — live **`https://`** square icon/favicon URL or null. Honor **`answer.safe_to_write.icon_url`** for SFDC stamp/fill (never stamp when false or null).
6. Reject non-HTTPS URLs, cached object-store hosts, or rectangular brand marks presented as the icon answer — only the Worker-validated `icon_url` counts.
7. HTTP 200 with `no_decision` is a decision, not UNVERIFIED. `400` `*_credentials_required` → hand off to `credentials` (BYOK Brandfetch / ZoomInfo on the default ladder).

### Default ladder (live Worker)

**house favicon-fetch (0 credits) → Brandfetch BYOK (1, soft-fail and continue) → ZoomInfo enrich logo (1)**

- Brandfetch prefers **icon** over wider brand **logo** when both exist.
- **Enrich-CRM, AI Ark, LeadMagic, and Prospeo are not icon sources** — never use them for `company.icon` stamps.
- Other BYOK vendors are **`routing.only` / explicit order**, not default.

Hosted MCP: `https://mcp.kingminos.com` — same Bearer and `company_icon` tool. Prefer REST for scripts.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · usable input (domain subject) · HTTP 200 decision envelope.

### Shape

````markdown
## Company icon — <hit | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <ready | name-only | missing domain>
Decision  <bar>  <✓|✗|·> <ready | <outcome> | unverified>
```

### Answer
`<run_id> · es_decision <hit|miss|ambiguous|error|noop|reject>`

- <✓|·|✗> outcome — <hit | no_decision> · <reason_code>
- <✓ icon_url — <https url> | · icon_url — null>
- · safe_to_write.icon_url — <true|false> (stamp only when true and URL is https)
- · ladder — house favicon-fetch (0 credits) → Brandfetch BYOK (1, soft-fail and continue) → ZoomInfo enrich logo (1)
- · credits spent <n> · providers <list from usage.providers_ran>
- · UNVERIFIED — <status> (only when the POST failed to return a v2 envelope)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
