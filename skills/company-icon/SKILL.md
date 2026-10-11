---
name: company-icon
description: >-
  Stamp a company square icon via POST /v1/company/icon: domain plus optional
  name, KingMinos-hosted icon_url (logos.kingminos.com/i/{sha256}.png, 256x256
  PNG) with optional icon_source_url. Resolves site manifest icons,
  apple-touch-icon, favicon, then Brandfetch and ZoomInfo brand logos, then
  re-hosts the best candidate. Use when the user asks for company.icon,
  company_icon, icon_url, account icon stamp, or favicon for a company domain —
  not company logo wording.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.1.5"
---

# KingMinos company icon (`company.icon`)

Call **KingMinos by OutboundSync** `POST /v1/company/icon` (`company_icon`). One decision: a **square** company **`icon_url`** on a hit — always a **KingMinos-hosted** `https://logos.kingminos.com/i/{sha256}.png` (**256x256 PNG**) — or null on miss. The Worker **resolves** from the **site** (manifest icons, **apple-touch-icon**, and **favicon** — best candidate first), then **brand logo** hops (**Brandfetch**, **ZoomInfo**), then **validates, stores, and re-hosts** the best raster on `logos.kingminos.com` (see ladder below). Optional **`result.icon_source_url`** holds that winning source URL; stamp **`icon_url` only**, never the source. This is **`company.icon`**, not a marketing logo field. This is not an SFDC write. Never print, log, or commit `KINGMINOS_API_KEY`.

**CRM tip:** allowlist **`https://logos.kingminos.com`** once (e.g. Salesforce CSP Trusted Site for images) so hosted stamps render in the UI.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

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

   **Domain** plus optional **`name`** (and optional `website`, `email`, `schema_version`: `"2"`). One server-side implementation; client `routing`, `routing.only`, `path`, and `preset` are **ignored** if sent.
4. Prefer `X-Router-Explain: minimal` on CRM callouts. Use `full` only when the user asks for `trace`.
5. Branch on control fields: `answer.outcome` (`hit` | `no_decision`), `es_decision`, `answer.reason_code`. Read **`result.icon_url`** — hosted `https://logos.kingminos.com/i/{sha256}.png` (**256x256 PNG**) or null. Read **`result.icon_source_url`** when present (advisory origin only). Read **`answer.confidence`** and hit-only **`result.flags.low_res`** when present. Honor **`answer.safe_to_write.icon_url`** for SFDC stamp/fill (true when `icon_url` is the hosted URL — including low-res hits; never stamp when false or null).
6. Treat any non-hosted `icon_url` (third-party favicon, site URL, or non-`logos.kingminos.com` host) as invalid — only the Worker-validated hosted URL counts for stamping.
7. **Hits vs misses:** wrong-company, junk, or empty images are **rejected** (`no_decision`, `icon_url` null). A **fetch or store failure** is also a miss with `icon_url` null. A **small but valid** source (best raster under **64px**) still **re-hosts** as a hit: `answer.confidence` is `low`, `result.flags.low_res` is `true`, and **`safe_to_write.icon_url` stays `true`** — the caller decides whether to stamp.
8. HTTP 200 with `no_decision` is a decision, not UNVERIFIED. `400` `*_credentials_required` on the icon ladder (Brandfetch / ZoomInfo) → hand off to `credentials`.

### Default ladder (resolve → re-host)

**site manifest / apple-touch-icon / favicon (0 credits) → Brandfetch BYOK brand logo (1, soft-fail and continue) → ZoomInfo enrich logo (1)**

- Picks the **best** site icon candidate first, then brand-logo vendors.
- Brandfetch prefers **icon** over wider brand **logo** when both exist.
- **Enrich-CRM, AI Ark, LeadMagic, and Prospeo are not icon sources** — never use them for `company.icon` stamps.
- On a hit, the chosen source is stored and served as a **256x256 PNG** on `logos.kingminos.com`; `icon_source_url` echoes where it came from.

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
- <✓ icon_url — `https://logos.kingminos.com/i/…` (256x256 PNG) | · icon_url — null>
- · icon_source_url — <https url | null> (origin only — do not stamp)
- · confidence — <high|medium|low | —> · flags.low_res — <true|false | —> (low + true when source was under 64px; safe_to_write may still be true)
- · safe_to_write.icon_url — <true|false> (stamp only when true and URL is hosted logos.kingminos.com; caller may skip low_res)
- · ladder — site manifest / apple-touch-icon / favicon → Brandfetch BYOK → ZoomInfo logo
- · credits spent <n> · providers <list from usage.providers_ran>
- · UNVERIFIED — <status> (only when the POST failed to return a v2 envelope)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
