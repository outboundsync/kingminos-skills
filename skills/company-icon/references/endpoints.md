# company.icon endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. REST and hosted MCP (`https://mcp.kingminos.com`) share the same Bearer inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/capabilities` | `get_capabilities` | R | Catalog + default routing (auth check). |
| `POST /v1/company/icon` | `company_icon` | R | Hosted square `icon_url` stamp decision (`company.icon`). Business misses stay HTTP 200. |
| `GET /v1/runs/{id}` | `get_run` | R | Replay a recorded run. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/company/icon` | Bearer | Company icon (`company.icon`) — KingMinos-hosted `icon_url` only. |
| `GET` | `/v1/runs/{id}` | Bearer | Replay a recorded run. |
| `GET` | `/v1/capabilities` | Bearer | Catalog + default routing (auth check). |

## Request

`CompanyIconInput` keys are always present on the echo (`name`, `domain`, `website`, `email`) and may be null.

| Field | Required | Notes |
| --- | --- | --- |
| `domain` | subject required | Or `website` / `email` → same registrable domain after hygiene |
| `name` | no | Optional corroboration |
| `website` | no | |
| `email` | no | |
| `external_ref` | no | Client correlation key; echoed |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false |

**Domain-only subject.** One implementation — no client `routing`, `routing.only`, `path`, or `preset` (legacy fields are silently ignored).

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`.

**CRM:** allowlist `https://logos.kingminos.com` once for image CSP / trusted sites so stamps render.

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.safe_to_write.icon_url`, `answer.reason_code`, `result.icon_url`, `result.icon_source_url` | Branch here |
| Explain | `answer.summary`, `sources` | Humans only |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `result.icon_url` | Meaning |
| --- | --- | --- |
| `hit` | `https://logos.kingminos.com/i/{sha256}.png` | 256×256 PNG on KingMinos logo CDN — stamp when `safe_to_write.icon_url` |
| `no_decision` | null | Source fetch, validate, or re-host failed — do not invent an icon |

On a hit, **`result.icon_url` is always** the hosted KingMinos URL — never a raw third-party or site favicon URL in the stamp field. **`result.icon_source_url`** (optional) is the winning source URL (favicon, Brandfetch, ZoomInfo logo, etc.) for display/debug only.

**`answer.safe_to_write.icon_url`** is `true` only when `icon_url` is that hosted URL.

## Sources (live Worker → re-host)

Default ladder: **house favicon-fetch (0 credits) → Brandfetch BYOK (1, soft-fail and continue) → ZoomInfo enrich logo (1)**

- KingMinos still resolves from **site favicon**, **Brandfetch**, and **ZoomInfo**; on success it validates, stores, and serves a **256×256 PNG** on `logos.kingminos.com`.
- Brandfetch prefers **icon** over wider brand **logo** when both exist.
- **Enrich-CRM, AI Ark, LeadMagic, and Prospeo are not icon sources.**
- **Brandfetch** and **ZoomInfo** require stored Your Keys for their ladder steps (`credentials` skill).

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `name_only_unsupported` / `invalid_routing` / `invalid_compliance` / `invalid_explain` / `invalid_schema` / `unsupported_schema` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `brandfetch_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `companyurlfinder_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` / `lemlist_credentials_required` | Fix input or store BYOK (`credentials`) |
| `401` | `unauthorized` + `detail` | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider skips or re-host failures **inside** a started run stay HTTP 200 (`no_decision`, `icon_url` null).
