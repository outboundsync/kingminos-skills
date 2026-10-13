# Person phone endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `POST /v1/person/phone` | `person_phone` | R | One dialable phone number for a person, plus the ranked rest (`person.phone`). `email` or `linkedin_url` required (top level or under `person`; neither → `400 validation_failed` / `email_or_linkedin_required`); `first_name` / `last_name` are match-only (reject someone else's profile → `person_mismatch`), never infer. `phone_types` filter (`mobile` \| `landline` \| `other` \| `unknown`; omit = any) + `max_results` (1–10, default 3). `result.best_phone` (`number` E.164, `type`, `source`) or null; `result.phones[]` ranked mobile-first, deduped, filter-honoring; `result.flags` (`conflicting_numbers`). Locked ladder (v1 Wiza only): 38 credits on a hit, 0 on a miss; ceiling 38. `routing.only` / `ignore` honored; `path` / `preset` / `order` ignored. 30-day cache keyed on the filter (`skip_cache` / `X-Router-Cache: bypass`; replay 0 credits); stamp only when `answer.safe_to_write.best_phone`. API tenants only. → `person-phone`. |
