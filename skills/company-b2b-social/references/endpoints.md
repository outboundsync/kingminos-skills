# company.b2b_social endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. REST and hosted MCP (`https://mcp.kingminos.com`) share the same Bearer inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/capabilities` | `get_capabilities` | R | Catalog + default routing (auth check). |
| `POST /v1/company/b2b-social` | `company_b2b_social` | R | LinkedIn company page decision. Business misses stay HTTP 200. |
| `GET /v1/runs/{id}` | `get_run` | R | Replay a recorded run. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/company/b2b-social` | Bearer | B2B social company page (`company.b2b_social`). |
| `GET` | `/v1/runs/{id}` | Bearer | Replay a recorded run. |
| `GET` | `/v1/capabilities` | Bearer | Catalog + default routing (auth check). |

## Request

`CompanyB2bSocialInput` keys are always present on the echo (`name`, `domain`, `website`, `email`, `linkedin_url`) and may be null.

| Field | Required | Notes |
| --- | --- | --- |
| `domain` | subject required | Or `website` / `email` → same registrable domain after hygiene |
| `name` | no | Optional unit/brand corroboration |
| `website` | no | |
| `email` | no | |
| `linkedin_url` | no | Must already be `https://www.linkedin.com/company/{slug}`; person `/in/` is `400` |
| `external_ref` | no | Client correlation key; echoed |
| `routing.path` | no | `speed` \| `balance` \| `accuracy` \| `coverage` (omit = `balance`). Legacy aliases (`auto`, `value`, `fast`, `name_only`) normalize — echoed paths are the four live names. |
| `routing.preset` | no | Back-compat; nested `routing.path` wins when both are sent |
| `routing.only` | no | BYOK / escape providers (e.g. `["zoominfo"]` for scoped enrich, `["aiark"]` for AI Ark alone) |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`.

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.reason_code`, `result.linkedin_url`, `result.verification.status` | Branch here |
| Explain | `answer.summary`, `sources`, `result.unverified` | Humans only; unverified array is not a hit |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `result.linkedin_url` | Meaning |
| --- | --- | --- |
| `hit` | Serper-confirmed company URL or null per path rules | Decision returned |
| `no_decision` | null | Honest abstain |

Output `result.linkedin_url` is only the accept form `https://www.linkedin.com/company/{slug}` (slug lowercased) after Serper confirmation, or null. Reject `/in/`, school/showcase, unverified title/snippet misses, and parent brand pages when the input is a distinct unit.

## Routing (live Worker)

- `speed`: websearch company-page query (cap 1)
- `balance` (default): websearch then house **AI Ark** even after a search candidate (cap 2)
- `accuracy`: LeadMagic, house AI Ark, then Wiza (cap 5) — verified-only accept
- `coverage`: adds Findymail (cap 6) — structurally valid pages with confidence tiers
- Default stacks: **house keys only** (LeadMagic, Wiza, Findymail, AI Ark, websearch)
- BYOK: ZoomInfo (`company_linkedin_enrich` — search → scoped company enrich `socialMediaUrls`), BuiltWith, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM — `routing.only` / explicit order only (not default stacks)

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `name_only_unsupported` / `invalid_routing` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `companyurlfinder_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` | Fix input or store BYOK (`credentials`) |
| `401` | `unauthorized` + `detail` | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
