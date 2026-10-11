# Company domain endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `POST /v1/company/domain` | `company_domain` | R | Write-safe domain stamp + account aliases. `result.company_domain` non-null and `safe_to_write.company_domain` true only on a trusted stamp (`verified` / `corrected` / `discovered` → `es_decision: hit`); `rejected` → `reject`; `unverified` → `miss`. Paths `speed` \| `balance` (default) \| `accuracy` \| `coverage`; legacy `fast`/`value`/`name_only` → `speed`, `auto` → `balance`; env `coverage` is ignored. ZoomInfo is BYOK (house key on tenant `default` only); `builtwith_credentials_required` on coverage without a key. Disagreeing domain/email/website is adjudicated, not a 400. Cache ~5 min per tenant; `X-Router-Cache: bypass` / `skip_cache` skips the read. |
