# company.icon endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. REST and hosted MCP (`https://mcp.kingminos.com`) share the same Bearer inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/capabilities` | `get_capabilities` | R | Catalog + default routing (auth check). |
| `POST /v1/company/icon` | `company_icon` | R | Square company `icon_url` stamp decision (`company.icon`). Business misses stay HTTP 200. |
| `GET /v1/runs/{id}` | `get_run` | R | Replay a recorded run. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/company/icon` | Bearer | Company icon (`company.icon`) — live HTTPS `icon_url` only. |
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
| `routing.only` | no | BYOK / escape providers (e.g. `["brandfetch"]`, `["zoominfo"]`) |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`.

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.safe_to_write.icon_url`, `answer.reason_code`, `result.icon_url` | Branch here |
| Explain | `answer.summary`, `sources` | Humans only |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `result.icon_url` | Meaning |
| --- | --- | --- |
| `hit` | Live `https://` square icon/favicon URL | Decision returned — stamp when `safe_to_write.icon_url` |
| `no_decision` | null | Honest abstain — do not invent an icon |

Output `result.icon_url` is only a **live HTTPS** URL suitable for favicon-style stamping. **No R2/D1 cache URLs.** Reject `http://`, data URLs, and non-square marketing assets unless the Worker accepted them as `icon_url`.

## Routing (live Worker)

Default ladder: **house favicon-fetch (0 credits) → Brandfetch BYOK (1, soft-fail and continue) → ZoomInfo enrich logo (1)**

- Brandfetch prefers **icon** over wider brand **logo** when both exist.
- **Enrich-CRM, AI Ark, LeadMagic, and Prospeo are not icon sources.**
- **Wiza**, **Findymail**, **websearch**, and other resolve/B2B BYOK hops are **not** default — `routing.only` when explicitly needed.
- BYOK: ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, Lemlist — default `company.icon` uses Brandfetch then ZoomInfo only; others are `routing.only` only.
- **Brandfetch** and **ZoomInfo** need tenant Your Keys when their ladder step runs (`credentials`).

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `name_only_unsupported` / `invalid_routing` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `brandfetch_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `companyurlfinder_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` / `lemlist_credentials_required` | Fix input or store BYOK (`credentials`) |
| `401` | `unauthorized` + `detail` | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
