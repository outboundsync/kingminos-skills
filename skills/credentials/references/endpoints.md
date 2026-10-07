# Credentials endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Responses **never** echo the raw key. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

This skill's default path is `GET /v1/credentials`. Store secrets in the product app (`https://app.kingminos.com` → Vendor keys / Your Keys). Never paste a vendor secret into chat.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/providers` | `get_providers` | R | Registry + configured flags (advisory; no secrets). |
| `GET /v1/capabilities` | `get_capabilities` | R | Auth check. |
| `GET /v1/credentials` | `list_credentials` | R | Masked catalog: `status` `set` \| `managed` \| `unset`. Never a raw key. |
| `PUT /v1/credentials/{provider}` | `put_credentials` | W | Upsert tenant Your Keys (AES-GCM ciphertext, `kek_version: 1`). App UI only — not from this skill. |
| `DELETE /v1/credentials/{provider}` | `delete_credentials` | W | Revoke the live row (`revoked: true`). `404` when no live row. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/credentials` | Bearer | Masked Your Keys catalog (`set` \| `managed` \| `unset`). Default read path. |
| `PUT` | `/v1/credentials/{provider}` | Bearer | Upsert tenant Your Keys (AES-GCM ciphertext, `kek_version: 1`). App UI only. |
| `DELETE` | `/v1/credentials/{provider}` | Bearer | Revoke the live row (`revoked: true`). `404` when no live row |
| `GET` | `/v1/providers` | Bearer | Registry + configured flags (advisory; no secrets) |
| `GET` | `/v1/capabilities` | Bearer | Auth check |

## Path `provider`

`zoominfo` | `leadmagic` | `findymail` | `wiza` | `aiark` | `builtwith` | `brandfetch` | `prospeo` | `apollo` | `companyurlfinder` | `peopledatalabs` | `hginsights` | `enrichcrm`

`websearch` is rejected (`byok_not_supported`).

## GET `/v1/credentials` 200

Each item: `provider`, `label`, `kind` (`api_key` \| `oauth`), `status` (`set` \| `managed` \| `unset`), `configured`, `house_managed`, `mask` (nullable). LeadMagic, Wiza, Findymail, and AIArk without a tenant row are `managed` (house key). Other vendors are `unset` until stored. Print `mask` only as returned.

## PUT bodies (app UI / REST — never chat)

ZoomInfo (required pair):

```json
{ "clientId": "...", "clientSecret": "..." }
```

API-key vendors (`leadmagic`, `findymail`, `wiza`, `aiark`, `builtwith`, `brandfetch`, `prospeo`, `apollo`, `companyurlfinder`, `peopledatalabs`, `hginsights`, `enrichcrm`):

```json
{ "apiKey": "..." }
```

`api_key` is accepted as an alias of `apiKey`. `additionalProperties: false`. The Worker checks the secret with the vendor before storing. A rejected key is not stored (`400 credential_rejected`).

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
| `400` | `validation_failed` / `unknown_provider` / `credential_rejected` | Bad body or path. `credential_rejected`: vendor rejected the key — re-check it with the vendor in the app UI; nothing was stored. |
| `401` | `unauthorized` + `detail` | See `auth` |
| `404` | `not_found` | DELETE with no live row |
| `429` | `rate_limit_exceeded` | Retry-After |
| `500` | `credentials_kek_missing` / `credentials_kek_invalid` / `byok_kek_version_unsupported` / `byok_decrypt_failed` | Worker KEK; UNVERIFIED, do not invent a store |

Capability POSTs may return `400` `zi_credentials_required` | `findymail_credentials_required` | `wiza_credentials_required` | `aiark_credentials_required` | `builtwith_credentials_required` | `brandfetch_credentials_required` | `prospeo_credentials_required` | `apollo_credentials_required` | `companyurlfinder_credentials_required` | `peopledatalabs_credentials_required` | `hginsights_credentials_required` | `enrichcrm_credentials_required` when a path needs a BYOK vendor that is not stored.

## Policy

- **House-key:** LeadMagic, Wiza, Findymail, AIArk (optional tenant store; house AI Ark on default `company.b2b_social` paths — `company-b2b-social`).
- **BYOK:** ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM.
- **House-only:** websearch.
- Live writes need `CREDENTIALS_KEK` on Worker `kingminos-api-prod` (operator secret — never a skill input).
- Store secrets at `https://app.kingminos.com`. Never paste a vendor secret into chat.
