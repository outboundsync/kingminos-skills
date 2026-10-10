# company.description endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml`. Integrator walk-through: [kingminos.com/docs/api/company-description/](https://kingminos.com/docs/api/company-description/). REST and hosted MCP (`https://mcp.kingminos.com`) share the same Bearer inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

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

`CompanyDescriptionInput` keys are always present on the echo (`name`, `domain`, `website`, `email`, `max_chars`) and may be null.

| Field | Required | Notes |
| --- | --- | --- |
| `domain` | subject required | Or `website` / `email` → same registrable domain after hygiene |
| `name` | no | Optional hint for composed text; not returned |
| `website` | no | |
| `email` | no | |
| `max_chars` | no | Integer 80–500, default 300. Trims at a sentence boundary |
| `skip_cache` | no | When `true`, skip the 30-day result-cache read and re-run (still writes). Same as `X-Router-Cache: bypass` or `Cache-Control: no-cache` / `no-store`. Non-boolean → `400 invalid_cache` |
| `external_ref` | no | Client correlation key; echoed |
| `path` / `routing.path` | recommended | `speed` \| `balance` \| `accuracy` \| `coverage`. Omit is valid and resolves to `balance`, but the credit cap becomes **6** instead of **2** — send `path` explicitly. Nested `routing.path` wins. Legacy `fast` / `value` / `name_only` → `speed`, `auto` → `balance` |
| `routing.preset` | no | Back-compat; nested `routing.path` wins when both are sent |
| `routing.only` | no | e.g. `["zoominfo"]` with a stored ZoomInfo key |
| `schema_version` | no | Pin `"2"`. Must agree with `X-Router-Schema` / `?schema=` |
| `dry_run` | no | Default false |

Headers: `Authorization: Bearer $KINGMINOS_API_KEY`. Optional `X-Router-Explain: minimal|default|full`, `X-Router-Schema: 2`, `X-Router-Cache: bypass` (only `bypass` is valid — other values → `400 invalid_cache`), `Cache-Control: no-cache` or `no-store` (same bypass effect), `Idempotency-Key` (replay wins over cache bypass — omit or rotate for a fresh run).

### Cache bypass (`company.description` and `company.domain`)

Skips the result-cache **read** only; the fresh answer is still written. TTL differs by capability: **`company.description`** caches about **30 days**; **`company.domain`** uses a **short TTL (about five minutes max)**. Use any of: `X-Router-Cache: bypass`, `Cache-Control: no-cache` / `no-store`, or body `skip_cache: true`. **`company.resolve` does not honor bypass** — it silently ignores `X-Router-Cache: bypass` and `skip_cache`, so a cached answer may still be returned. The same `Idempotency-Key` always returns the stored response even when bypass headers are set on description/domain calls.

### Example request (`balance`)

```json
{
  "domain": "outboundsync.com",
  "name": "OutboundSync",
  "path": "balance",
  "external_ref": "crm-account-42",
  "schema_version": "2"
}
```

## Control vs explain

| Layer | Fields | Use |
| --- | --- | --- |
| Control | `es_decision`, `answer.outcome`, `answer.safe_to_write.description`, `result.description` | Branch here |
| Quality | `answer.confidence`, `answer.identity`, `result.flags` | Why it is (or is not) safe |
| Explain | `answer.summary`, `sources` | Humans only |
| Audit | `trace.*` when `explain=full` | Debug |

### Outcomes

| `answer.outcome` | `result.description` | Meaning |
| --- | --- | --- |
| `hit` | English text (≤ `max_chars`) | Decision returned — stamp only when `answer.safe_to_write.description` is true |
| `no_decision` | null | Honest abstain — do not invent copy |

### `answer.safe_to_write.description`

True only when **all** hold: `es_decision=hit`, non-blank text, `answer.confidence` is `medium` or `high`, and `answer.identity` is non-null (`jev` score ≥ 0.85, `name_domain` match, or `own_homepage`). Low confidence is never safe. `safe_to_write.company_domain` is true only on a hit; `safe_to_write.company_name` is always false here.

### `result.flags` (on a hit; null on a miss)

The API may add new boolean keys over time — ignore unknown flag names.

| Flag | Meaning |
| --- | --- |
| `hype` | Marketing superlatives |
| `first_person` | A `We` / `Our` / `I` sentence |
| `tagline` | Slogan, all-caps headline, blog headline, or article summary |
| `same_as_speed` | Ranked fallback that matches the `speed` winner |
| `truncated` | Trimmed to the last whole word (no complete sentence left) — forces confidence `low` |
| `cta` | Marketing / imperative line (`Join N+ …`, `trusted by`, `Get started`, exclamation) — forces confidence `low` |
| `grammar` | Informational quality signal only — does **not** change `answer.confidence` or `answer.safe_to_write.description`; stamp from `safe_to_write`, not `grammar` |

Other result fields: `source_kind` (`quoted` \| `composed`), `language_note` (`filtered` \| `translated` \| `interpreted` \| null), `company_domain`, `compose_echo`, `homepage_meta_only`. No `company_name` in the result.

## Routing (live Worker)

| Path | Stack | Cap |
| --- | --- | --- |
| `speed` | Homepage meta / og (deterministic gates) → house **AI Ark** | 1 |
| `balance` | Jev-ranked homepage extracts + meta/og + AI Ark; optional rewrite | 2 |
| `accuracy` | xAI neutral third-person compose from homepage evidence + one Jev; falls back to the cheaper hit | 3 |
| `coverage` | Accuracy compose + off-homepage house websearch + **ZoomInfo BYOK**; falls back to the accuracy winner | 6 |

- **AI Ark** is the **only firmographic vendor** on this route.
- **ZoomInfo** is **BYOK only** (coverage evidence when a key is stored; `400` `zi_credentials_required` when forced via `routing.only` without one).
- **LeadMagic, Wiza, Findymail, Brandfetch, Lemlist, Snov.io, Cognism, Lusha, Starbridge, Clay, and Databar are not `company.description` vendors.**
- Hard 10 s cap from request start on every path.

## Billing

- **Winner-only:** `usage.credits.spent` is the winning hop only (AI Ark 1, rewrite 0.5, compose 2, websearch 0.1, ZoomInfo BYOK 1 on full match). Rejected / lost hops and `no_decision` → **0**.
- `usage.credits.cap` is the resolved path budget; `usage.credits.by_provider` breaks down the winner; `usage.hops` lists every attempt.
- Results are cached about 30 days. Bypass: `X-Router-Cache: bypass`, `Cache-Control: no-cache` / `no-store`, or `skip_cache: true` (read skip only; still writes). Idempotency replay is independent of bypass. (`company.domain` uses a shorter cache; same bypass headers apply there.)

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
    "reason_code": "exact_one",
    "es_decision": "hit",
    "confidence": "high",
    "safe_to_write": {
      "company_name": false,
      "zoominfo_company_id": false,
      "company_domain": true,
      "description": true
    },
    "summary": "Site probe search hit via homepage_extract",
    "identity": { "method": "jev", "score": 0.96 }
  },
  "result": {
    "description": "OutboundSync syncs outbound email and sequencer activity into CRMs such as Salesforce and HubSpot.",
    "source_kind": "quoted",
    "language_note": null,
    "company_domain": "outboundsync.com",
    "compose_echo": false,
    "homepage_meta_only": false,
    "flags": {
      "hype": false,
      "first_person": false,
      "tagline": false,
      "same_as_speed": false,
      "truncated": false,
      "cta": false,
      "grammar": false
    }
  },
  "usage": {
    "credits": { "cap": 2, "spent": 0, "by_provider": { "aiark": 0 } },
    "providers_ran": ["aiark"]
  }
}
```

## Errors (run not started)

| Status | `error` | Next |
| --- | --- | --- |
| `400` | `validation_failed` / `domain_website_mismatch` / `invalid_routing` / `invalid_compliance` / `invalid_explain` / `invalid_schema` / `unsupported_schema` / `invalid_cache` / `name_only_unsupported` / `zi_credentials_required` | Fix input or store the ZoomInfo key (`credentials`) |
| `401` | `unauthorized` + `detail` | `auth` |
| `403` | `scope_denied` | Key lacks `company.description` scope |
| `409` | `idempotency_*` | Rotate or reuse `Idempotency-Key` per docs |
| `429` | rate / tenant / key budget | `Retry-After` |
| `503` | `store_unavailable` | Retryable. UNVERIFIED |

Provider errors **inside** a started run stay HTTP 200 (`es_decision: error` or skip reasons).
