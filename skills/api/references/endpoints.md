# KingMinos API + tool map (api skill)

The pack's single reference for the live KingMinos enrichment API and the 1:1 tool inventory. `auth`, `company-resolve`, and `credentials` keep a trimmed copy of the rows they use; `npm run validate` (`endpoint-map-consistent`) keeps those copies matching this file. `endpoint-map-openapi` fails when these rows drift from the KingMinos OpenAPI **Bearer** resource inventory.

Session/product-app ops (`/v1/auth/*`, `/v1/account/*`) declare no bearer security and are **out of scope** for this pack. kingminos-application `check:surfaces` should use the same Bearer-only rule.

- REST base: `https://api.kingminos.com` · `Authorization: Bearer $KINGMINOS_API_KEY`
- Live OpenAPI (auth-free): `GET /openapi.yaml` (also `/v1/openapi.yaml`, `/openapi.json`, `/v1/openapi.json`)
- Hosted MCP is **not shipped**. Tool names are snake_case of each Bearer resource `operationId` — the inventory kingminos-application `check:surfaces` compares. Do not invent a host or extra tools.

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
| `POST /v1/company/b2b-social` | `company_b2b_social` | R | B2B social company page (v1 LinkedIn `/company/{slug}`). Default stacks use house websearch + LeadMagic / Wiza / Findymail; house AI Ark via `routing.only: ["aiark"]`. Live; no dedicated skill yet. |
| `POST /v1/company/domain` | `company_domain` | R | Write-safe domain stamp + account aliases. Live; no dedicated skill yet. |
| `POST /v1/company/resolve` | `company_resolve` | R | Email/domain/website → one `answer`. Business misses stay 200. → `company-resolve`. |
| `POST /v1/person/verify-employment` | `person_verify_employment` | R | Pre-flight send decision. Live; no dedicated skill yet. |
| `GET /v1/runs/{id}` | `get_run` | R | Recorded run envelope (+ `candidates` when completed). |
| `GET /v1/credentials` | `list_credentials` | R | Masked Your Keys catalog (`set` \| `managed` \| `unset`). → `credentials`. |
| `PUT /v1/credentials/{provider}` | `put_credentials` | W | Upsert tenant Your Keys (ciphertext). Store in the app UI — not from chat. → `credentials`. |
| `DELETE /v1/credentials/{provider}` | `delete_credentials` | W | Revoke tenant Your Keys. → `credentials`. |
| `DELETE /v1/subjects/{subject_key}` | `delete_subject` | W · E | Tenant-scoped erasure. Requires `erase`. Not these skills. |

Also: `GET /health` (unversioned liveness), `GET /openapi.yaml` / `GET /v1/openapi.yaml` / `GET /openapi.json` / `GET /v1/openapi.json` (auth-free spec). Not resource operations — do not add them as tools.

Not shipped — do not call or invent: a hosted MCP URL, extra credential providers, session/product-app `/v1/auth/*` or `/v1/account/*` routes, or any Bearer path missing from live `GET /openapi.yaml`.

## Sensitive fields

| Field | Print? |
| --- | --- |
| `KINGMINOS_API_KEY` / Bearer token | Never |
| Vendor `apiKey` / `clientId` / `clientSecret` | Never. Store at `https://app.kingminos.com` — never paste into chat |
| `mask` from `list_credentials` | Only the value the API returned; never invent one |
| `request_id` (`cf-ray`) | Safe |
| Capability names, `es_decision`, counts, `billing_mode`, credential `status` | Safe |
