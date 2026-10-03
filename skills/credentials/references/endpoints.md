# Credentials endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. KingMinos MCP is not shipped — REST only. Responses **never** echo the raw key.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `PUT` | `/v1/credentials/{provider}` | Bearer | Upsert tenant Your Keys (AES-GCM ciphertext, `kek_version: 1`) |
| `DELETE` | `/v1/credentials/{provider}` | Bearer | Revoke the live row (`revoked: true`). `404` when no live row |
| `GET` | `/v1/providers` | Bearer | Registry + configured flags (advisory; no secrets) |
| `GET` | `/v1/capabilities` | Bearer | Auth check |

## Path `provider`

`zoominfo` | `leadmagic` | `findymail` | `wiza` | `aiark` | `builtwith`

`websearch` is rejected (`byok_not_supported`).

## PUT bodies

ZoomInfo (required pair):

```json
{ "clientId": "...", "clientSecret": "..." }
```

API-key vendors (`leadmagic`, `findymail`, `wiza`, `aiark`, `builtwith`):

```json
{ "apiKey": "..." }
```

`api_key` is accepted as an alias of `apiKey`. `additionalProperties: false`.

## PUT 200

```json
{ "ok": true, "schema_version": "2", "provider": "zoominfo", "kek_version": 1 }
```

## DELETE 200

```json
{ "ok": true, "schema_version": "2", "provider": "zoominfo", "revoked": true }
```

## Errors

| Status | `error` | Notes |
| --- | --- | --- |
| `400` | `validation_failed` / `unknown_provider` | Bad body or path |
| `401` | `unauthorized` + `detail` | See `auth` |
| `404` | `not_found` | DELETE with no live row |
| `429` | `rate_limit_exceeded` | Retry-After |
| `500` | `credentials_kek_missing` / `credentials_kek_invalid` / `byok_kek_version_unsupported` / `byok_decrypt_failed` | Worker KEK; UNVERIFIED, do not invent a store |

Capability POSTs may return `400` `zi_credentials_required` | `findymail_credentials_required` | `wiza_credentials_required` | `aiark_credentials_required` | `builtwith_credentials_required` when a path needs a BYOK vendor that is not stored.

## Policy

- **House-key:** LeadMagic only.
- **BYOK:** Findymail, ZoomInfo, Wiza, AIArk, BuiltWith.
- **House-only:** websearch.
- Live writes need `CREDENTIALS_KEK` on Worker `kingminos-api-prod` (operator secret — never a skill input).
