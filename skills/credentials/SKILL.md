---
name: credentials
description: >-
  Manage KingMinos vendor Your Keys: LeadMagic is the house-key vendor;
  Findymail, ZoomInfo, Wiza, AIArk, and BuiltWith are BYOK. Use when the
  user asks to store a ZoomInfo, Findymail, Wiza, AIArk, or BuiltWith key,
  PUT /v1/credentials, revoke a vendor key, why they saw zi_credentials_required,
  or whether LeadMagic needs a tenant key.
license: MIT
compatibility: Requires KINGMINOS_API_KEY in the environment and HTTPS access to api.kingminos.com. Mutations only after explicit confirmation. KingMinos MCP is not shipped; use REST.
metadata:
  author: outboundsync
  version: "1.0.1"
---

# KingMinos credentials

Teach house-key vs BYOK and, **only after explicit confirmation**, store or revoke tenant Your Keys. Never print, log, or commit `KINGMINOS_API_KEY` or a vendor secret. Responses never echo the raw key.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

## Policy (locked)

| Vendor | Path id | How the key is supplied | Body |
| --- | --- | --- | --- |
| LeadMagic | `leadmagic` | **House-key only** (OutboundSync-provided). Tenant `PUT` is optional, not required. | `{ "apiKey" }` |
| Findymail | `findymail` | BYOK | `{ "apiKey" }` |
| ZoomInfo | `zoominfo` | BYOK | `{ "clientId", "clientSecret" }` |
| Wiza | `wiza` | BYOK | `{ "apiKey" }` |
| AIArk | `aiark` | BYOK | `{ "apiKey" }` |
| BuiltWith | `builtwith` | BYOK | `{ "apiKey" }` |
| websearch | `websearch` | House-only | `PUT` → `byok_not_supported` |

`PUT` also accepts `api_key` as an alias of `apiKey` for API-key vendors. Do not tell a customer they have a house ZoomInfo, Findymail, Wiza, AIArk, or BuiltWith key.

Hosted MCP is **not shipped**. Mutations are REST (`put_credentials` / `delete_credentials`).

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. If the user is only asking the policy, render the gauge + House / BYOK cards. Do **not** mutate.
3. If they want to store or revoke a key:
   - Print a one-line plan: `Will PUT /v1/credentials/zoominfo storing the tenant ZoomInfo OAuth pair (response will not echo the secret)`.
   - Wait for explicit confirmation of **that** plan. “Add my ZoomInfo key” is not confirmation.
   - `PUT https://api.kingminos.com/v1/credentials/{provider}` or `DELETE` the same path.
   - Report `ok`, `provider`, and `kek_version` (store) or `revoked: true` (delete). Never re-echo the secret.
4. Map live `400` `*_credentials_required` from `company.resolve` to the matching BYOK row.
5. `GET /v1/providers` may show configured flags — use it as advisory, not as a dump of secrets.

## Mutations

Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol). KingMinos MCP is not shipped.

- `put_credentials` / `PUT /v1/credentials/{provider}` — upsert tenant Your Keys (ciphertext). REST; KingMinos MCP is not shipped.
- `delete_credentials` / `DELETE /v1/credentials/{provider}` — revoke tenant Your Keys (`revoked_at`). REST; KingMinos MCP is not shipped.

Do not call `DELETE /v1/subjects/{subject_key}` from this skill (`erase` scope).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · house policy (LeadMagic) · requested BYOK (pass when no BYOK vendor was requested, or the named vendor stored/revoked as asked).

### Shape

````markdown
## Credentials — <ready | BYOK required | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
House     <bar>  <✓|✗|·> <LeadMagic house-key>
BYOK      <bar>  <✓|✗|·> <ready | missing <vendor> | unverified>
```

### House
`LeadMagic · house-key`

- ✓ LeadMagic is the only house-key vendor — no tenant key required
- · Tenant PUT /v1/credentials/leadmagic is optional and never echoed

### BYOK
`<vendor or none requested>`

- <✓ no BYOK vendor requested | ✓ <vendor> stored (kek_version 1) | ✓ <vendor> revoked | ✗ <vendor> credentials required | · UNVERIFIED — <status>>
- · Findymail, ZoomInfo, Wiza, AIArk, BuiltWith are BYOK
- · websearch is house-only (byok_not_supported)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above — confirm a PUT/DELETE plan before sending>
````
