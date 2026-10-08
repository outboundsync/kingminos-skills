# company.description endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. Integrator walk-through: `docs/company-description.md` in kingminos-application (PR #177+). REST and hosted MCP (`https://mcp.kingminos.com`) share the same Bearer inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/capabilities` | `get_capabilities` | R | Catalog + default routing (auth check). |
| `POST /v1/company/description` | `company_description` | R | Company description stamp decision (`company.description`). Business misses stay HTTP 200. |
| `GET /v1/runs/{id}` | `get_run` | R | Replay a recorded run. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/company/description` | Bearer | Company description (`company.description`) — `result.description` or null. |
| `GET` | `/v1/runs/{id}` | Bearer | Replay a recorded run. |
| `GET` | `/v1/capabilities` | Bearer | Catalog + default routing (auth check). |

## Request

`CompanyDescriptionInput` keys are always present on the echo (`name`, `domain`, `website`, `email`) and may be null.

| Field | Required | Notes |
| --- | --- | --- |
| `domain` | subject required | Or `website` / `email` → same registrable domain after hygiene |
| `name` | no | Optional corroboration |
| `website` | no | |
| `email` | no | |
| `external_ref` | no | Client correlation key; echoed |
| `routing.path` | no | `speed` \| `balance` \| `accuracy` \| `coverage` (omit = `balance`). Legacy aliases (`auto`, `value`, `fast`, `name_only`) normalize — echoed paths are the four live names. |
| `routing.preset` | no | Back-compat; nested `routing.path` wins when both are sent |
| `routing.only` | no | BYOK / escape providers (e.g. `["zoominfo"]` for ZoomInfo firmographic) |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`.

### Example request (`balance`)

```json
{
  "domain": "outboundsync.com",
  "name": "OutboundSync",
  "routing": { "path": "balance" },
  "external_ref": "crm-account-42",
  "schema_version": "2"
}
```

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.confidence`, `answer.safe_to_write.description`, `answer.reason_code`, `result.description`, `result.flags` | Branch here |
| Explain | `answer.summary`, `sources` | Humans only |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `result.description` | Meaning |
| --- | --- | --- |
| `hit` | 40–2000 char paragraph | Decision returned — stamp when your CRM bar is met |
| `no_decision` | null | Honest abstain — do not invent copy |

### `result.flags` (quality hints)

| Flag | Meaning |
| --- | --- |
| `hype` | Marketing/hype tone detected — cautious CRM use |
| `first_person` | First-person voice ("we", "our") — cautious CRM use |
| `tagline` | Short tagline-like text rather than a description paragraph |
| `same_as_speed` | Composed path still matches raw `speed` text — review before trusting `balance` / `accuracy` |

Prefer CRM writes when `answer.confidence` is `high` and `hype` / `first_person` are false. `safe_to_write.description` does not clear hype/first_person — agents must read flags.

## Routing (live Worker)

| Path | Intent | Default stack (summary) |
| --- | --- | --- |
| `speed` | Cheapest; raw homepage text | House site fetch (minimal compose) |
| `balance` | Neutral third-person blurb | House site fetch → house **AI Ark** compose |
| `accuracy` | Tight factual compose | Stricter accept on the same house stack |
| `coverage` | Thin/blocked sites | Higher spend / recovery on the house stack |

- **AI Ark** is the **only default firmographic vendor** on this route.
- **ZoomInfo** firmographic is **BYOK only** — `routing.only: ["zoominfo"]` (needs Your Keys; `400` `zi_credentials_required` when forced without creds).
- LeadMagic, Wiza, Findymail, websearch, Brandfetch, and other hop vendors are **not** on the default ladder — explicit `routing.only` only.

## Billing

- **Winner-only:** `usage.credits.spent` reflects charged attempts only; **`no_decision` → spent 0**.
- `usage.credits.cap` is the resolved path budget; `usage.credits.by_provider` breaks down the winner (and any charged skips per Worker policy).
- `GET /v1/providers` exposes per-vendor `billing_mode` for advisory context.

### Example response (`hit`, illustrative)

```json
{
  "ok": true,
  "schema_version": "2",
  "run_id": "run_demo901",
  "status": "completed",
  "capability": "company.description",
  "es_decision": "hit",
  "answer": {
    "outcome": "hit",
    "reason_code": "description_ok",
    "es_decision": "hit",
    "confidence": "high",
    "safe_to_write": {
      "description": true
    },
    "summary": "balance · site_fetch + aiark · hit"
  },
  "result": {
    "company_name": "OutboundSync",
    "company_domain": "outboundsync.com",
    "website": "https://outboundsync.com",
    "description": "OutboundSync syncs outbound email and sequencer activity into CRMs such as Salesforce and HubSpot for reply routing and attribution.",
    "flags": {
      "hype": false,
      "first_person": false,
      "tagline": false,
      "same_as_speed": false
    },
    "identifiers": []
  },
  "usage": {
    "credits": {
      "cap": 6,
      "spent": 1,
      "by_provider": { "aiark": 1 }
    },
    "providers_ran": ["site_probe", "aiark"]
  }
}
```

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `name_only_unsupported` / `invalid_routing` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `brandfetch_credentials_required` / `prospeo_credentials_required` / `apollo_credentials_required` / `companyurlfinder_credentials_required` / `peopledatalabs_credentials_required` / `hginsights_credentials_required` / `enrichcrm_credentials_required` / `lemlist_credentials_required` | Fix input or store BYOK (`credentials`) |
| `401` | `unauthorized` + `detail` | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
