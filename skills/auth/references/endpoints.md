# Auth endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/v1/openapi.yaml`). No auth. Hosted MCP is not shipped — REST only. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ MCP tools

| REST | MCP tool | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/providers` | `get_providers` | R | Provider registry + configured flags + `billing_mode`. |
| `GET /v1/capabilities` | `get_capabilities` | R | Capability catalog + default routing. Use this to prove the key. |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Liveness. `{"ok":true,"service":"kingminos-api-prod"}`. Unversioned. |
| `GET` | `/openapi.yaml` | No | OpenAPI 3.1. Same document as `/v1/openapi.yaml`. |
| `GET` | `/v1/openapi.yaml` | No | Same OpenAPI document. |
| `GET` | `/v1/capabilities` | Bearer | Capability catalog + default routing. Use this to prove the key. |
| `GET` | `/v1/providers` | Bearer | Provider registry + configured flags + `billing_mode`. |

## Header

```
Authorization: Bearer $KINGMINOS_API_KEY
```

Bare keys are `401` `detail: malformed`. Never send the key as a query param or JSON body field.

## 401 ErrorBody

Every error: `ok: false`, `schema_version: "2"`, `error`, `retryable`, `request_id` (Cloudflare `cf-ray`). 401 adds `detail` + static `hint`. **Never echoes the key.**

| `detail` | Meaning | Shortest fix |
| --- | --- | --- |
| `missing` | No `Authorization` header | Set `KINGMINOS_API_KEY` and send `Authorization: Bearer …`. On SFDC, add a Custom Header — Auth Parameters do not leave SFDC. |
| `malformed` | Header is not `Bearer <token>` | Add the `Bearer ` prefix. |
| `mismatch` | Key did not match | Rotate / paste the current KingMinos key. Do not retry a guessed value. |

`retryable` is false on 401.

## Other statuses

| Status | `error` (typical) | Notes |
| --- | --- | --- |
| `403` | `scope_denied` | Key reached the Worker; this route is out of scope. |
| `429` | `rate_limit_exceeded` / `tenant_budget_exhausted` / `key_budget_exhausted` | Read `Retry-After`. Retryable. |
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
| `credentials` | `put_credentials` / `delete_credentials` |
| Live, no dedicated skill | `company_domain` · `company_hierarchy` · `person_verify_employment` |
| Not these skills (`erase` scope) | `delete_subject` |
