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

**Domain-only subject.** One implementation — no `routing`, `routing.only`, `path`, or `preset` (legacy fields are silently ignored).

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
| `hit` | `https://logos.kingminos.com/i/<sha256>.png` | 128×128 PNG on KingMinos logo CDN — stamp when `safe_to_write.icon_url` |
| `no_decision` | null | Fetch, validate, or store failed — do not invent an icon |

On a hit, **`result.icon_url` is always** the hosted KingMinos URL — never a third-party or site favicon URL. **`result.icon_source_url`** (optional) is the original source for display/debug only.

**`answer.safe_to_write.icon_url`** is `true` only when `icon_url` is that hosted URL.

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `name_only_unsupported` / `invalid_compliance` / `invalid_explain` / `invalid_schema` / `unsupported_schema` | Fix input |
| `401` | `unauthorized` + `detail` | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider or storage errors **inside** a started run that fail to produce a hosted asset stay HTTP 200 (`no_decision`, `icon_url` null).
