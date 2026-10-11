# Person language endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `POST /v1/person/language` | `person_language` | R | Can we engage this person in English — and if not, in what language? (`person.language`). `email` or `linkedin_url` required (neither → `400 validation_failed` / `email_or_linkedin_required`); `first_name` / `last_name` are match-only (reject someone else's profile → `person_mismatch`), never infer a language. `result.english` `yes` \| `likely` \| `unconfirmed` \| `unknown` (never "no"); `recommended_language` / `local_language` set only at medium or high. `routing.path` `speed` (cap 1) \| `balance` (default, cap 3: LeadMagic → AI Ark → Findymail ladder) \| `accuracy` (cap 4); anything else → `400 invalid_routing`. 30-day cache (`skip_cache` / `X-Router-Cache: bypass`); stamp only when `answer.safe_to_write.recommended_language`. API tenants only — not in `openapi.es.yaml`. |
