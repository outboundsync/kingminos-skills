---
name: credentials
description: >-
  List KingMinos vendor Your Keys and revoke a stored key after confirmation.
  LeadMagic is house-key by default; Findymail, ZoomInfo, Wiza, AIArk, and
  BuiltWith are BYOK. Use when the user asks to list credentials, GET
  /v1/credentials, revoke a ZoomInfo, Findymail, Wiza, AIArk, or BuiltWith
  key, why they saw zi_credentials_required, or whether LeadMagic needs a
  tenant key.
license: MIT
compatibility: Requires KINGMINOS_API_KEY in the environment and HTTPS access to api.kingminos.com. Mutations only after explicit confirmation. KingMinos MCP is not shipped; use REST.
metadata:
  author: outboundsync
  version: "1.1.0"
---

# KingMinos credentials

Teach house-key vs BYOK. **Default path is read-only:** `GET /v1/credentials`. Store or rotate secrets at `https://app.kingminos.com` (Vendor keys / Your Keys). **Never ask the user to paste a vendor secret into chat.** Revoke a stored key only after explicit confirmation. Never print, log, or commit `KINGMINOS_API_KEY` or a vendor secret. Responses never echo the raw key.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

## Policy (locked)

| Vendor | Path id | How the key is supplied | Body (app UI / REST — never chat) |
| --- | --- | --- | --- |
| LeadMagic | `leadmagic` | **House-key by default** (OutboundSync-provided). Tenant store is optional, not required. | `{ "apiKey" }` |
| Findymail | `findymail` | BYOK | `{ "apiKey" }` |
| ZoomInfo | `zoominfo` | BYOK | `{ "clientId", "clientSecret" }` |
| Wiza | `wiza` | BYOK | `{ "apiKey" }` |
| AIArk | `aiark` | BYOK | `{ "apiKey" }` |
| BuiltWith | `builtwith` | BYOK | `{ "apiKey" }` |
| websearch | `websearch` | House-only | `PUT` → `byok_not_supported` |

`PUT` also accepts `api_key` as an alias of `apiKey` for API-key vendors. Do not tell a customer they have a house ZoomInfo, Findymail, Wiza, AIArk, or BuiltWith key. Do not call `PUT` from this skill.

Hosted MCP is **not shipped**. List is REST `list_credentials`. Revoke is REST `delete_credentials`.

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
6. Map live `400` `*_credentials_required` from `company.resolve` to the matching BYOK `unset` row. Map `400` `credential_rejected` (vendor rejected the key; nothing was stored) to the report path — re-check the key with the vendor in the app UI.
7. `GET /v1/providers` may show configured flags — use it as advisory, not as a dump of secrets.

## Mutations

Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol). KingMinos MCP is not shipped.

- `delete_credentials` / `DELETE /v1/credentials/{provider}` — revoke tenant Your Keys (`revoked_at`). REST; KingMinos MCP is not shipped.

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
- · Findymail, ZoomInfo, Wiza, AIArk, BuiltWith are BYOK
- · websearch is house-only (byok_not_supported)
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above — store in the app UI; confirm a DELETE plan before sending>
````
