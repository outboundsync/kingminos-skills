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
| `name` | no | Unit/brand corroboration. Sufficient alone on `accuracy` / `coverage` (name→domain). On `speed` / `balance`, name→domain runs only when `hint` is sent; otherwise those paths miss rather than guess when domain, website, and email are absent |
| `hint` | no | Optional list/industry context. Any path uses it with `country` so short names resolve; on `speed` / `balance` it also turns name→domain on |
| `country` | no | Optional ISO country. Used with `hint` for name→domain |
| `website` | no | |
| `email` | no | |
| `linkedin_url` | no | Must already be `https://www.linkedin.com/company/{slug}`; person `/in/` is `400` |
| `external_ref` | no | Client correlation key; echoed |
| `routing.path` | no | `speed` \| `balance` \| `accuracy` \| `coverage` (omit = `balance`). Legacy aliases (`auto`, `value`, `fast`, `name_only`) normalize — echoed paths are the four live names. |
| `routing.preset` | no | Back-compat; nested `routing.path` wins when both are sent |
| `routing.only` | no | BYOK / escape providers (e.g. `["zoominfo"]` with a stored ZoomInfo key) |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`, `X-Router-Max-Provider-Credits` (used only when the body omits `routing.max_provider_credits`; can raise the path default up to the server ceiling; a non-number is `400 invalid_routing`).

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.reason_code`, `result.linkedin_url`, `result.verification.status` | Branch here |
| Explain | `answer.summary`, `sources`, `result.unverified` | Humans only; unverified array is not a hit |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `result.linkedin_url` | Meaning |
| --- | --- | --- |
| `hit` | Search-confirmed company URL or null per path rules | Decision returned |
| `no_decision` | null | Honest abstain |

Output `result.linkedin_url` is only the accept form `https://www.linkedin.com/company/{slug}` (slug lowercased) after search confirmation, or null. Reject `/in/`, school/showcase, unverified title/snippet misses, and parent brand pages when the input is a distinct unit.

## Routing (live Worker)

- `speed`: websearch company-page query (cap 1)
- `balance` (default): websearch then house **AI Ark** even after a search candidate (cap 2)
- `accuracy`: LeadMagic, house AI Ark (cap 18) — verified-only accept. House Wiza is opt-in only (`routing.only` / `routing.order`), off every default path; when that hop decides it bills 15 instead of the path price
- `coverage`: adds Findymail (cap 19) — structurally valid pages with confidence tiers
- Default stacks: **house keys only** (LeadMagic, Findymail, AI Ark, websearch). House Wiza is off every default path
- BYOK: ZoomInfo (`company_linkedin_enrich` — search → scoped company enrich `socialMediaUrls`), BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, Lemlist, Snov.io, Cognism, Lusha, Starbridge, Clay, Databar, QuickEnrich, GetLeads, BlitzAPI — `routing.only` / explicit order only for hop vendors above **except Lemlist, Snov.io, Cognism, Lusha, Starbridge, Clay, Databar, QuickEnrich, GetLeads, and BlitzAPI** (Your Keys catalog only on this route; Lemlist is a `company.resolve` hop only — `company-resolve`; Snov.io is a credential vendor with no enrichment hop)

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `name_only_unsupported` / `invalid_routing` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `brandfetch_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `companyurlfinder_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` / `lemlist_credentials_required` | Fix input or store BYOK (`credentials`) |
| `401` | `unauthorized` + `detail` | `auth` |
| `409` | `idempotency_conflict` / `idempotency_in_flight` / `idempotency_spent` / `idempotency_replay_unavailable` | New key on `idempotency_conflict`. Do not retry `idempotency_spent`. `429` / `503` retry the same key. A free `no_decision` miss is re-run, not replayed |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
