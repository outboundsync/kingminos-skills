# Auth endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/v1/openapi.yaml`, `/openapi.json`, `/v1/openapi.json`). No auth. Hosted MCP is not shipped — REST only. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

Session/product-app `/v1/auth/*` and `/v1/account/*` routes are out of scope — do not call them from this skill.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/providers` | `get_providers` | R | Provider registry + configured flags + `billing_mode`. |
| `GET /v1/capabilities` | `get_capabilities` | R | Capability catalog + default routing. Use this to prove the key. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Liveness. `{"ok":true,"service":"kingminos-api-prod"}`. Unversioned. |
| `GET` | `/openapi.yaml` | No | OpenAPI 3.1. Same document as `/v1/openapi.yaml`. JSON twin: `/openapi.json`. |
| `GET` | `/v1/openapi.yaml` | No | Same OpenAPI document. JSON twin: `/v1/openapi.json`. |
| `GET` | `/v1/capabilities` | Bearer | Capability catalog + default routing. Use this to prove the key. |
| `GET` | `/v1/providers` | Bearer | Provider registry + configured flags + `billing_mode`. |

## Header

```
Authorization: Bearer $KINGMINOS_API_KEY
```

Bare keys are `401` `detail: malformed`. Never send the key as a query param or JSON body field.

Mint the token at `https://app.kingminos.com` (workspace owner → tokens). It is shown once (`km_` prefix), scoped to explicit capabilities (not `*`), with a daily credit cap (default 100).

## 401 ErrorBody

Every error: `ok: false`, `schema_version: "2"`, `error`, `retryable`, `request_id` (Cloudflare `cf-ray`). 401 adds `detail` + static `hint`. **Never echoes the key.**

| `detail` | Meaning | Shortest fix |
| --- | --- | --- |
| `missing` | No `Authorization` header | Set `KINGMINOS_API_KEY` and send `Authorization: Bearer …`. On SFDC, add a Custom Header — Auth Parameters do not leave SFDC. |
| `malformed` | Header is not `Bearer <token>` | Add the `Bearer ` prefix. |
| `mismatch` | Key did not match | Set the current KingMinos key in `KINGMINOS_API_KEY`. Do not retry a guessed value. |

`retryable` is false on 401.

## Other statuses

| Status | `error` (typical) | Notes |
| --- | --- | --- |
| `403` | `scope_denied` | Token lacks this capability scope. On `GET /v1/capabilities` (spec lists only `200`), treat any non-200 as UNVERIFIED with the status. |
| `429` | `rate_limit_exceeded` / `tenant_budget_exhausted` / `key_budget_exhausted` | Read `Retry-After`. Retryable. `key_budget_exhausted` = the token's daily credit cap was hit. |
| `503` | `store_unavailable` / `credential_broker_*` | Retryable. Same call. |

## SFDC Named Credential

Write **SFDC** or **Salesforce**, never **SF**.

- Custom auth Auth Parameters stay inside SFDC.
- External Credential **Custom Headers** must emit `Authorization: Bearer <token>`.
- Allow Formulas ON when the header value is a formula.
- Optional static Custom Header `X-Router-Schema: 2` pins the envelope.

## Not this skill

| Skill / inventory | Instead |
| --- | --- |
| `company-resolve` | `company_resolve` |
| `credentials` | `list_credentials` / `delete_credentials` (store in the app UI) |
| Live, no dedicated skill | `company_domain` · `company_b2b_social` · `company_hierarchy` · `person_verify_employment` |
| Not these skills (`erase` scope) | `delete_subject` |
| Session / product app | `/v1/auth/*` · `/v1/account/*` — out of scope |
