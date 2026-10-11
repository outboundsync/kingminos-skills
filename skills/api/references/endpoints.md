# KingMinos API + tool map (api skill)

The pack's single reference for the live KingMinos enrichment API and the 1:1 tool inventory. `auth`, `company-resolve`, and `credentials` keep a trimmed copy of the rows they use; `npm run validate` (`endpoint-map-consistent`) keeps those copies matching this file. `endpoint-map-openapi` fails when these rows drift from the KingMinos OpenAPI **Bearer** resource inventory.

Session/product-app ops (`/v1/auth/*`, `/v1/account/*`) declare no bearer security and are **out of scope** for this pack. `npm run check:surfaces` in this repo uses the same Bearer-only rule.

- REST base: `https://api.kingminos.com` · `Authorization: Bearer $KINGMINOS_API_KEY`
- Hosted MCP: `https://mcp.kingminos.com` — same Bearer token and snake_case tool inventory as this table
- Live OpenAPI (auth-free): `GET /openapi.yaml` (also `/v1/openapi.yaml`, `/openapi.json`, `/v1/openapi.json`)
- Tool names are snake_case of each Bearer resource `operationId` — the inventory `npm run check:surfaces` compares. Do not invent tools outside this map.

Never print, log, or commit the key.

## Calling conventions

| Concern | Rule |
| --- | --- |
| Header | `Authorization: Bearer $KINGMINOS_API_KEY`. Bare keys are `401` `detail: malformed`. |
| Envelope | `schema_version` 2. Optional pin: `X-Router-Schema` / `?schema=` / body `schema_version` (they must agree). |
| Explain | `X-Router-Explain` or `?explain=`: omit/`default`/`minimal` (alias) is the clean envelope; `full` adds `trace`. |
| Errors | JSON `{ ok: false, schema_version, error, retryable, request_id }`. 401 adds `detail` (`missing` \| `malformed` \| `mismatch`) + static `hint`. Never echoes the key. |
| Business misses | Capability POSTs stay HTTP 200. Branch on `answer.outcome` / `es_decision`, not UNVERIFIED. |

## Errors — and when a result is UNVERIFIED

Render these as **`· UNVERIFIED — <reason>`** (include the status code), never as an empty result:

- any `401` / `403` / `5xx`, a timeout, or a non-JSON body
- `429` if you stop instead of waiting `Retry-After`
- `503` `store_unavailable` / `credential_broker_*`

A `404` on a path you expected means **the route is not shipped** — do not retry or invent it.

`401` `detail` to relay: `missing` · `malformed` · `mismatch`. On SFDC Named Credential / Custom auth, Auth Parameters do not leave Salesforce — add a Custom Header named `Authorization`. Write **SFDC** or **Salesforce**, never **SF**.

`403` `scope_denied` means the token lacks this capability scope. `429` `key_budget_exhausted` means the token's daily credit cap was hit.

## REST ↔ tools

One row per OpenAPI **Bearer resource** operation. `R` = Bearer read / enrichment POST. `W` = mutates tenant Your Keys (`credentials` skill: list is read-only; revoke is write-on-confirm; store in the app UI). `E` = needs the `erase` key scope — **never** from these skills.

Discovery (`GET /health`, `GET /openapi.yaml`, `GET /openapi.json`, `GET /v1/openapi.yaml`, `GET /v1/openapi.json`) is not in this table.

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/providers` | `get_providers` | R | Provider registry + configured flags + `billing_mode`. → `auth` / `credentials` (advisory). |
| `GET /v1/capabilities` | `get_capabilities` | R | Capability catalog + default routing. Auth check. → `auth`. |
| `POST /v1/company/hierarchy` | `company_hierarchy` | R | Immediate / ultimate parent + capped subsidiaries. Live; no dedicated skill yet. |
| `POST /v1/company/b2b-social` | `company_b2b_social` | R | LinkedIn company page (`result.linkedin_url` = Serper-confirmed `https://www.linkedin.com/company/{slug}` or null). Paths `speed` \| `balance` (default) \| `accuracy` \| `coverage`; default stacks are house keys (balance = websearch → house AI Ark). BYOK via `routing.only`. → `company-b2b-social`. |
| `POST /v1/company/icon` | `company_icon` | R | Square company `icon_url` (`company.icon`) — resolves site manifest icons / apple-touch-icon / favicon (best first), then Brandfetch BYOK and ZoomInfo brand logos; validates, stores, re-hosts the best as `https://logos.kingminos.com/i/{sha256}.png` (**256x256 PNG**); optional `icon_source_url`; miss → `icon_url` null. Domain plus optional `name`; client routing/path/preset ignored. Under-64px sources still hit (`confidence` low, `flags.low_res` true, `safe_to_write.icon_url` true). Allowlist `logos.kingminos.com` once in CRM image CSP. → `company-icon`. |
| `POST /v1/company/description` | `company_description` | R | English company description (`result.description`, `max_chars` 80–500, default 300, or null) (`company.description`). Domain/website/email required; name-only `400`. Paths `speed` (homepage meta/og → AI Ark, cap 1) \| `balance` (Jev-ranked homepage extracts + meta/og + AI Ark, optional rewrite, cap 2 when `path` is sent; omitted path runs balance at cap 6) \| `accuracy` (xAI compose, cap 3) \| `coverage` (compose + off-homepage websearch / ZoomInfo BYOK, cap 6). AI Ark is the only firmographic vendor; ZoomInfo BYOK only. `result.flags` (`hype`, `first_person`, `tagline`, `same_as_speed`, `truncated`, `cta`, `grammar` — informational only); recommend explicit `path`; cache bypass on description (30-day cache) / domain (short TTL) via `X-Router-Cache: bypass` / `Cache-Control` / `skip_cache` (`company.resolve` ignores bypass); stamp only when `answer.safe_to_write.description` (non-low confidence + `answer.identity`); winner-only billing. → `company-description`. |
| `POST /v1/company/domain` | `company_domain` | R | Write-safe domain stamp + account aliases. Live; no dedicated skill yet. |
| `POST /v1/company/resolve` | `company_resolve` | R | Email/domain/website → one `answer`. Business misses stay 200. → `company-resolve`. |
| `POST /v1/person/verify-employment` | `person_verify_employment` | R | Pre-flight send decision. Live; no dedicated skill yet. |
| `POST /v1/person/language` | `person_language` | R | Can we engage this person in English — and if not, in what language? (`person.language`). `email` or `linkedin_url` required (top level or under `person`; neither → `400 validation_failed` / `email_or_linkedin_required`); `first_name` / `last_name` are match-only (reject someone else's profile → `person_mismatch`), never infer a language. `result.english` `yes` \| `likely` \| `unconfirmed` \| `unknown` (never "no"); `recommended_language` / `local_language` (ISO 639-1) set only at medium or high; ranked `result.languages`. `routing.path` `speed` (cap 1: one profile read + language judge) \| `balance` (default, cap 3: LeadMagic → AI Ark → Findymail ladder) \| `accuracy` (cap 4: every structured source, no early stop); only `path` / `preset` is read; `coverage` (or any other path) → `400 invalid_routing`. 30-day cache (`skip_cache` / `X-Router-Cache: bypass`); stamp only when `answer.safe_to_write.recommended_language`. API tenants only. Live; no dedicated skill yet. |
| `GET /v1/runs/{id}` | `get_run` | R | Recorded run envelope (+ `candidates` when completed). |
| `GET /v1/webhooks` | `list_webhooks` | R | Workspace webhook endpoints (`kmwhk_…`, no secrets). `403 webhooks_not_enabled` while the workspace gate is off (admin toggles it). → `webhooks`. |
| `POST /v1/webhooks` | `create_webhook` | W | Register an HTTPS endpoint (`kmwhsec_…` secret shown once). Owner only; max 20 per workspace; HTTPS-only + DNS egress check; `enabled_events` holds active types only (empty = all). → `webhooks`. |
| `GET /v1/webhooks/{id}` | `get_webhook` | R | One endpoint (url, `enabled_events`, `is_active`, `consecutive_failures`, `auto_disabled_at`). → `webhooks`. |
| `PATCH /v1/webhooks/{id}` | `patch_webhook` | W | Update url / description / `enabled_events` / `is_active` (re-enable clears auto-disable). Owner only. → `webhooks`. |
| `DELETE /v1/webhooks/{id}` | `delete_webhook` | W | Soft-delete the endpoint. Owner only. → `webhooks`. |
| `POST /v1/webhooks/{id}/rotate-secret` | `rotate_webhook_secret` | W | New `kmwhsec_…` shown once; previous secret stops working immediately. Owner only. → `webhooks`. |
| `POST /v1/webhooks/{id}/test` | `test_webhook` | W | Send a `test.ping` delivery (ignores `enabled_events`); `202 { event_id }`. Owner only. → `webhooks`. |
| `GET /v1/webhooks/{id}/deliveries` | `list_webhook_deliveries` | R | Delivery log (`pending` \| `succeeded` \| `failed` \| `dead`, attempt counts, `last_http_status`). → `webhooks`. |
| `POST /v1/webhooks/{id}/deliveries/{delivery_id}/replay` | `replay_webhook_delivery` | W | Replay a delivery as a new attempt (`replay_of_delivery_id` link). Owner only. → `webhooks`. |
| `GET /v1/events` | `list_events` | R | Emitted platform events — the reconciliation log (`run.failed` \| `run.recovered` \| `test.ping`; `delivered` filter; keyset `cursor`). → `webhooks`. |
| `GET /v1/credentials` | `list_credentials` | R | Masked Your Keys catalog (`set` \| `managed` \| `unset`). → `credentials`. |
| `PUT /v1/credentials/{provider}` | `put_credentials` | W | Upsert tenant Your Keys (ciphertext). Store in the app UI — not from chat. → `credentials`. |
| `DELETE /v1/credentials/{provider}` | `delete_credentials` | W | Revoke tenant Your Keys. → `credentials`. |
| `DELETE /v1/subjects/{subject_key}` | `delete_subject` | W · E | Tenant-scoped erasure. Requires `erase`. Not these skills. |
| `POST /v1/feedback` | `submit_feedback` | W | File product feedback when a call misses or comes back low-confidence, you had to work around KingMinos, or you wanted a field or provider we don't have. Free, never costs credits; not a support channel. `summary` is a plain-English headline (15–150 chars, no IDs); `requested` required for provider/endpoint requests; `capability` required for `data_quality`; no secrets in the text. |

Also: `GET /health` (unversioned liveness), `GET /openapi.yaml` / `GET /v1/openapi.yaml` / `GET /openapi.json` / `GET /v1/openapi.json` (auth-free spec). Not resource operations — do not add them as tools.

Out of scope — do not call or invent: extra credential providers, session/product-app `/v1/auth/*` or `/v1/account/*` routes, MCP tools not listed here, or any Bearer path missing from live `GET /openapi.yaml`.

## Sensitive fields

| Field | Print? |
| --- | --- |
| `KINGMINOS_API_KEY` / Bearer token | Never |
| Vendor `apiKey` / `clientId` / `clientSecret` | Never. Store at `https://app.kingminos.com` — never paste into chat |
| `mask` from `list_credentials` | Only the value the API returned; never invent one |
| `request_id` (`cf-ray`) | Safe |
| Capability names, `es_decision`, counts, `billing_mode`, credential `status` | Safe |
