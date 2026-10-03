# company.resolve endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. KingMinos MCP is not shipped — REST only.

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
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false. The capability still does not write SFDC from this skill. |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `Idempotency-Key`.

Default `max_provider_credits` is `6` on `auto`, `2` on `value`.

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `answer.outcome`, `es_decision`, `answer.safe_to_write`, `answer.reason_code` | Branch here |
| Explain | `answer.summary`, `sources` | Humans only |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `es_decision` | Stamp ZoomInfo company id? | Account Name |
| --- | --- | --- | --- |
| `resolved` | `hit` only when `result.zoominfo_company_id` is non-blank | Yes, that id | Fill-if-blank from `result.company_name` |
| `resolved_without_primary_id` | `miss` | **Never** | Fill-if-blank when name present (websearch / LeadMagic-only) |
| `no_decision` | `miss` / `noop` / `error` per reason | Never | Do not invent a name |

`result.company_domain` is optional hygiene — never clobber.

A LeadMagic-only or websearch-only hit is `resolved_without_primary_id`. A websearch name is not terminal while ZoomInfo remains in `effectiveOrder`.

## Routing (live Worker)

- Default order: `[websearch, zoominfo, leadmagic]`, `allow_fallbacks`, `free_first: false`
- `auto`: Wiza then Findymail only after a websearch miss/junk reject
- `value`: cheap names; no Wiza / Findymail
- `accuracy` / `coverage`: deeper corroboration / fill
- AIArk: registered, **not** on default paths
- House-key vendor: **LeadMagic only**
- BYOK: ZoomInfo, Findymail, Wiza, AIArk, BuiltWith
- `websearch`: house-only

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `invalid_routing` / `unsupported_schema` / `zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` | Fix input, or store BYOK via `credentials` |
| `401` | `unauthorized` + `detail` missing \| malformed \| mismatch | `auth` |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` — key is **not** spent |
| `503` | `credential_broker_*` / `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
