# Employment verify endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `POST /v1/person/verify-employment` | `person_verify_employment` | R | Pre-flight send decision. Outcomes `high_confidence_send` \| `low_confidence_send` \| `low_confidence_block` \| `high_confidence_block` \| `no_decision` — all four-way answers are `es_decision: hit`. Input one of `email` \| `linkedin_url` \| (`first_name` + `last_name`); without an email, `expected_company` needs a domain/website/name/identifiers. Paths `speed` (0.5, validation only) \| `balance` (default, 13.5) \| `accuracy` (14.5, adds corroboration); `value`/`auto`/`coverage`/`fast`/`name_only`/`zi_stamp` → `400 invalid_routing`. One email validator per run. Post-decision ZoomInfo contact search appends `result.zoominfo_contact_id` at estimate 0 — stamp only when `es_decision: hit` and the id is non-blank (id-append only). |
