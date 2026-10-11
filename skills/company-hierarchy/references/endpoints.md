# Company hierarchy endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `POST /v1/company/hierarchy` | `company_hierarchy` | R | Immediate / ultimate parent + capped (50) subsidiaries. Outcomes `subsidiary` \| `ultimate_parent` \| `no_decision`; hit stamps only `zoominfo_company_id` (hit + non-blank). Input `domain` \| `website` \| `email` (name alone is a 400); disagreeing domain/email/website → `400 domain_website_mismatch`. Paths `speed` (free Wikidata `exact_one`, cap 0) \| `balance` (default) \| `accuracy` — ZoomInfo enrich 1 credit on first `FULL_MATCH` only; legacy `fast`/`value`/`name_only` → `speed`, `auto` → `balance`; `coverage` → `400 invalid_routing`. Subsidiary `*_domain` is null unless Wikidata filled it — join via `zoominfo_company_id`. |
