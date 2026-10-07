---
name: credentials
description: >-
  List KingMinos vendor Your Keys and revoke a stored key after confirmation.
  LeadMagic, Wiza, Findymail, and AIArk are house-key; ZoomInfo, BuiltWith,
  Prospeo, Apollo, Brandfetch, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, and Snov.io are BYOK. Use when the user asks to
  list credentials, GET
  /v1/credentials, revoke a ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo,
  Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, or Snov.io key, why they saw a BYOK `*_credentials_required`, or whether LeadMagic needs a
  tenant key.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP). Mutations only after explicit confirmation.
metadata:
  author: outboundsync
  version: "1.1.12"
---

# KingMinos credentials

Teach house-key vs BYOK. **Default path is read-only:** `GET /v1/credentials`. Store or rotate secrets at `https://app.kingminos.com` (Vendor keys / Your Keys). **Never ask the user to paste a vendor secret into chat.** Revoke a stored key only after explicit confirmation. Never print, log, or commit `KINGMINOS_API_KEY` or a vendor secret. Responses never echo the raw key.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

## Policy (locked)

| Vendor | Path id | How the key is supplied | Body (app UI / REST — never chat) |
| --- | --- | --- | --- |
| LeadMagic | `leadmagic` | **House-key by default** (OutboundSync-provided). Tenant store is optional, not required. | `{ "apiKey" }` |
| Findymail | `findymail` | **House-key** (approved; OutboundSync-provided). Tenant store is optional. | `{ "apiKey" }` |
| ZoomInfo | `zoominfo` | BYOK | `{ "clientId", "clientSecret" }` |
| Wiza | `wiza` | **House-key** (approved; OutboundSync-provided). Tenant store is optional. | `{ "apiKey" }` |
| AIArk | `aiark` | **House-key** (approved; OutboundSync-provided). Tenant store is optional. Default on `company.b2b_social` `balance` / `accuracy`; `routing.only: ["aiark"]` for AI-Ark-only. | `{ "apiKey" }` |
| BuiltWith | `builtwith` | BYOK | `{ "apiKey" }` |
| Brandfetch | `brandfetch` | BYOK | `{ "apiKey" }` |
| Prospeo | `prospeo` | BYOK | `{ "apiKey" }` |
| Apollo | `apollo` | BYOK | `{ "apiKey" }` |
| Company URL Finder | `companyurlfinder` | BYOK | `{ "apiKey" }` |
| People Data Labs | `peopledatalabs` | BYOK | `{ "apiKey" }` |
| HG Insights | `hginsights` | BYOK | `{ "apiKey" }` |
| Enrich-CRM | `enrichcrm` | BYOK | `{ "apiKey" }` |
| Snov.io | `snovio` | BYOK (OAuth) | `{ "clientId", "clientSecret" }` |
| websearch | `websearch` | House-only | `PUT` → `byok_not_supported` |

`PUT` also accepts `api_key` as an alias of `apiKey` for API-key vendors. Do not tell a customer they have a house ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, or Snov.io key. Do not call `PUT` from this skill.

List: REST `GET /v1/credentials` or MCP `list_credentials`. Revoke after confirm: REST `DELETE` or MCP `delete_credentials`.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. `GET /v1/credentials` (`list_credentials`). Render one line per vendor from `status` (`set` \| `managed` \| `unset`). Print `mask` only when the API returned a non-null value — never invent one, never a raw key.
3. Base gates on that catalog — not on “no vendor was requested”:
   - House: LeadMagic `managed` or `set` → pass; `unset` → blocker.
   - BYOK: if a vendor was requested (or a live `*_credentials_required`), that vendor must be `set`. If none was requested, the BYOK gate passes only after the catalog loaded (state is known).
4. If they want to **store or rotate** a key: do **not** take a secret in chat and do **not** `PUT`. Next step is the app UI (`https://app.kingminos.com` → Vendor keys / Your Keys).
5. If they want to **revoke** a key:
   - Print a one-line plan: `Will DELETE /v1/credentials/zoominfo (revokes the stored tenant ZoomInfo pair; response will not echo the secret)`.
   - Wait for explicit confirmation of **that** plan. “Revoke my ZoomInfo key” is not confirmation.
   - `DELETE https://api.kingminos.com/v1/credentials/{provider}`.
   - Report `ok`, `provider`, and `revoked: true`. Never re-echo a secret.
6. Map live `400` `*_credentials_required` from `company.resolve` or `company.icon` to the matching BYOK `unset` row. Map `400` `credential_rejected` (vendor rejected the key; nothing was stored) to the report path — re-check the key with the vendor in the app UI.
7. `GET /v1/providers` may show configured flags — use it as advisory, not as a dump of secrets.

## Mutations

Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

- `delete_credentials` / `DELETE /v1/credentials/{provider}` — revoke tenant Your Keys (`revoked_at`). REST or hosted MCP (`https://mcp.kingminos.com`) — same tool.

Do not call `PUT /v1/credentials/{provider}` from this skill (store in the app UI). Do not call `DELETE /v1/subjects/{subject_key}` (`erase` scope).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · house (LeadMagic `managed` or `set` from `GET /v1/credentials`) · BYOK (named vendor `set`, or catalog loaded when none requested).

### Shape

````markdown
## Credentials — <ready | BYOK required | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
House     <bar>  <✓|✗|·> <LeadMagic <managed|set|unset> | unverified>
BYOK      <bar>  <✓|✗|·> <ready | missing <vendor> | unverified>
```

### House
`LeadMagic · <managed|set|unset>`

- <✓ leadmagic <managed|set> — house-key by default; tenant key optional | ✗ leadmagic unset | · UNVERIFIED — <status>>
- · mask — <value the API returned, or null>

### BYOK
`<vendor or catalog>`

- <✓|·|✗> <provider> <set|unset|managed>
- · ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, and Snov.io are BYOK
- · LeadMagic, Wiza, Findymail, and AIArk are house-key (tenant Your Keys optional)
- · websearch is house-only (byok_not_supported)
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above — store in the app UI; confirm a DELETE plan before sending>
````
