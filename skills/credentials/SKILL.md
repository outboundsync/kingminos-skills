---
name: credentials
description: >-
  List KingMinos vendor Your Keys and revoke a stored key after confirmation.
  Explains house-key vs bring-your-own-key (BYOK) vendors from the live
  catalog. Use when the user asks to list credentials, GET /v1/credentials,
  revoke a stored vendor key, why they saw a BYOK `*_credentials_required`,
  or whether a vendor needs a tenant key.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP). Mutations only after explicit confirmation.
metadata:
  author: outboundsync
  version: "1.5.0"
---

# KingMinos credentials

Teach house-key vs BYOK. **Default path is read-only:** `GET /v1/credentials`. Store or rotate secrets at `https://app.kingminos.com` (Vendor keys / Your Keys). **Never ask the user to paste a vendor secret into chat.** Revoke a stored key only after explicit confirmation. Never print, log, or commit `KINGMINOS_API_KEY` or a vendor secret. Responses never echo the raw key.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

## Policy (locked)

Which vendors are house-key and which are BYOK comes from the live catalog, never from a list in this skill. `GET /v1/credentials` returns one item per vendor with `provider` (path id), `label`, `kind`, `status`, `house_managed`, and `mask`.

| Catalog field | Meaning | How the key is supplied (app UI / REST — never chat) |
| --- | --- | --- |
| `house_managed: true` | **House-key** (OutboundSync-provided). `status` is `managed` with no tenant row. | Tenant store optional, not required. |
| `house_managed: false` | **BYOK**. `status` is `unset` until the tenant stores a key. | Store at `https://app.kingminos.com` (Vendor keys / Your Keys). |
| `kind: api_key` | API-key vendor | Body `{ "apiKey" }` (`api_key` is an accepted alias) |
| `kind: oauth` | OAuth vendor | Body `{ "clientId", "clientSecret" }` |

House-only hops (not in the catalog, not storable) reject `PUT` with `400 validation_failed`, reason `byok_not_supported`. Path ids are in [references/endpoints.md](references/endpoints.md).

Never tell a customer they have a house key for a vendor the catalog shows as `house_managed: false`. Do not call `PUT` from this skill.

List: REST `GET /v1/credentials` or MCP `list_credentials`. Revoke after confirm: REST `DELETE` or MCP `delete_credentials`.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. `GET /v1/credentials` (`list_credentials`). Render one line per vendor from `status` (`set` \| `managed` \| `unset`). Print `mask` only when the API returned a non-null value — never invent one, never a raw key.
3. Base gates on that catalog — not on “no vendor was requested”:
   - House: every `house_managed: true` item is `managed` or `set` → pass; any of them `unset` → blocker.
   - BYOK: if a vendor was requested (or a live `*_credentials_required`), that vendor must be `set`. If none was requested, the BYOK gate passes only after the catalog loaded (state is known).
4. If they want to **store or rotate** a key: do **not** take a secret in chat and do **not** `PUT`. Next step is the app UI (`https://app.kingminos.com` → Vendor keys / Your Keys).
5. If they want to **revoke** a key:
   - Print a one-line plan: `Will DELETE /v1/credentials/{provider} (revokes the stored tenant key for <label>; response will not echo the secret)`.
   - Wait for explicit confirmation of **that** plan. “Revoke my key” is not confirmation.
   - `DELETE https://api.kingminos.com/v1/credentials/{provider}`.
   - Report `ok`, `provider`, and `revoked: true`. Never re-echo a secret.
6. Map a live `400` `*_credentials_required` from any capability call to the matching BYOK `unset` row (the code names the provider; see [references/endpoints.md](references/endpoints.md)). Map `400` `credential_rejected` (vendor rejected the key; nothing was stored) to the report path — re-check the key with the vendor in the app UI.
7. `GET /v1/providers` may show configured flags — use it as advisory, not as a dump of secrets.

## Mutations

Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

- `delete_credentials` / `DELETE /v1/credentials/{provider}` — revoke tenant Your Keys (`revoked_at`). REST or hosted MCP (`https://mcp.kingminos.com`) — same tool.

Do not call `PUT /v1/credentials/{provider}` from this skill (store in the app UI). Do not call `DELETE /v1/subjects/{subject_key}` (`erase` scope).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · house (every `house_managed: true` item `managed` or `set` in `GET /v1/credentials`) · BYOK (named vendor `set`, or catalog loaded when none requested).

### Shape

````markdown
## Credentials — <ready | BYOK required | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
House     <bar>  <✓|✗|·> <house-key ready | <provider> unset | unverified>
BYOK      <bar>  <✓|✗|·> <ready | missing <vendor> | unverified>
```

### House
`house_managed: true · <n> vendors`

- <✓ house-key vendors managed or set — tenant key optional | ✗ <provider> unset | · UNVERIFIED — <status>>
- · mask — <value the API returned, or null>

### BYOK
`<vendor or catalog>`

- <✓|·|✗> <provider> <set|unset|managed>
- · BYOK vendors are the catalog items with `house_managed: false`; house-key vendors (`house_managed: true`) need no tenant key
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above — store in the app UI; confirm a DELETE plan before sending>
````
