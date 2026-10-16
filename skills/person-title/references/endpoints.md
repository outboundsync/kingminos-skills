# Person title endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `POST /v1/person/title` | `person_title` | R | A person's current job title, seniority and function (`person.title`). `email` or `linkedin_url` required (top level or under `person`; neither → `400 validation_failed` / `email_or_linkedin_required`); `first_name` / `last_name` are match-only (reject someone else's profile → `person_mismatch`), never infer; `company_domain` is match-only (a title at another employer is never a hit → `employer_mismatch`). `fields` (`title` \| `seniority` \| `function`; omit = all) drives the ladder. `routing.path` `speed` \| `balance` (default) \| `accuracy` \| `coverage` — outcome-priced 1 / 2 / 3 / 5 credits on a hit, 0 on a miss or a partial (`fields_incomplete`); `routing.only` / `ignore` honored. `result.title`, `result.seniority`, `result.function`, `result.field_sources`, `result.flags`. ZoomInfo search only on a workspace BYOK key. 30-day cache (`skip_cache` / `X-Router-Cache: bypass`; replay 0 credits); stamp each field only when `answer.safe_to_write.<field>`. API tenants only. → `person-title`. |
