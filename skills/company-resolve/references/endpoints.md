# company.resolve endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

CRM write floors: [`GET /v1/recipes/guidance`](https://api.kingminos.com/v1/recipes/guidance).

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/capabilities` | `get_capabilities` | R | Catalog + default routing (auth check). |
| `POST /v1/company/resolve` | `company_resolve` | R | Resolve a company. Business misses stay HTTP 200. |
| `GET /v1/runs/{id}` | `get_run` | R | Replay a recorded run. Same envelope + `candidates` when completed. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/company/resolve` | Bearer | Resolve a company. Business misses stay HTTP 200. |
| `GET` | `/v1/runs/{id}` | Bearer | Replay a recorded run. Same envelope + `candidates` when completed. |
| `GET` | `/v1/capabilities` | Bearer | Catalog + default routing (auth check). |

## Request

`CompanyResolveInput` keys are always present on the echo (`name`, `domain`, `website`, `email`) and may be null.

| Field | Required | Notes |
| --- | --- | --- |
| `email` | one of email / domain / website | Typical caller input; domain derived after `@` |
| `domain` | one of | Also accepts email-shaped strings |
| `website` | one of | |
| `name` | no | Accepted; **name-only → `no_decision` / `no_domain`** (does not search) |
| `external_ref` | no | Client correlation key; echoed |
| `routing.path` | no | `value` \| `auto` \| `accuracy` \| `coverage` (omit = `auto`). `fast` → `value`. `confidence` is not a path. |
| `routing.preset` | no | Back-compat. `name_only` → `value`. `zi_stamp` = ZoomInfo-first. Prefer `path`. |
| `min_confidence` | no | Overrides path floor — see [guidance](https://api.kingminos.com/v1/recipes/guidance). |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false. The capability still does not write SFDC from this skill. |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`.

Default `max_provider_credits` is `19` on `auto` (`accuracy` 21, `coverage` 23), `2` on `value`. Paid name recovery bills 15 credits; any step on your own key (BYOK) bills 0.1.

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.confidence`, `answer.reason_code` | Branch here |
| Explain | `answer.summary`, `sources` | Humans only |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | Typical `es_decision` | Stamp / fill |
| --- | --- | --- |
| `resolved` | `hit` when a primary ZoomInfo id is present | Stamp id when `es_decision=hit` and `result.zoominfo_company_id` non-blank |
| `resolved_without_primary_id` | `miss` | Fill name when `result.company_name` non-blank; do not stamp id |
| `no_decision` | as returned (`miss` / `noop` / `error` per reason) | Never invent a name or id |

**Account Name:** fill-if-blank from `result.company_name` whenever non-blank (including on `es_decision=miss`). **ZoomInfo id:** Salesforce stamp only when `es_decision=hit` and `result.zoominfo_company_id` is non-blank. **`company_domain`:** optional hygiene when `result.company_domain` is present — never clobber.

A hit without a primary company id is `resolved_without_primary_id`. Connect your own ZoomInfo key for stampable ids.

## Routing (live Worker)

- Default order: `[websearch, zoominfo, leadmagic]`, `allow_fallbacks`, `free_first: false`
- `auto`: Wiza then Findymail only after a websearch miss/junk reject
- `value`: cheap names; no Wiza / Findymail
- `accuracy` / `coverage`: deeper corroboration / fill
- AIArk / Prospeo / Apollo / People Data Labs / HG Insights / Enrich-CRM / Lemlist: registered, **not** on default paths
- House-key vendors: **LeadMagic, Wiza, Findymail, AIArk** (AI Ark on default `company.b2b_social` `balance` path — see `company-b2b-social`)
- BYOK: ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, People Data Labs, HG Insights, Enrich-CRM, Lemlist, Snov.io, Cognism, Lusha, Starbridge, Clay, Databar, QuickEnrich, GetLeads, BlitzAPI, Company URL Finder — resolve uses ZoomInfo/BuiltWith/Prospeo/Apollo/People Data Labs/HG Insights/Enrich-CRM/Lemlist; Brandfetch is `company.icon` (`company-icon`); Snov.io, Cognism, Lusha, Starbridge, Clay, Databar, QuickEnrich, GetLeads, and BlitzAPI are credential vendors only (no hop); Company URL Finder is `company.domain` / name→domain only (`routing.only: ["companyurlfinder"]`, not `POST /v1/company/resolve`)
- `websearch`: house-only

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `invalid_routing` / `unsupported_schema` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` / `lemlist_credentials_required` | Fix input, or store BYOK in the KingMinos app (`credentials` lists status) |

`companyurlfinder_credentials_required` belongs to **`company.domain`** / `POST /v2/services/name_to_domain`, not `POST /v1/company/resolve`.
| `401` | `unauthorized` + `detail` missing \| malformed \| mismatch | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` — key is **not** spent |
| `503` | `credential_broker_*` / `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
