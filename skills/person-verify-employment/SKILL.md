---
name: person-verify-employment
description: >-
  Decide and audit the KingMinos person.verify_employment send decision:
  whether to email this person now, wait, or skip. Use when the user asks to
  verify someone is still at a company before a sequence, why KingMinos
  blocked or sent, what employment left or still_there means, how
  zoominfo_contact_id stamps, or how email validation and job-change signals
  combine.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos person.verify_employment

One decision: **send to this person now, or don't?** `POST /v1/person/verify-employment` is the pre-flight before emailing — email validation, job-change detection, and (on accuracy) AI Ark corroboration collapse into a four-way send/block verdict. Read-only enrichment; every business miss is HTTP 200. Branch on `answer.outcome` / `es_decision`.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Policy (locked)

- Outcomes (`answer.outcome`): **`high_confidence_send` | `low_confidence_send` | `low_confidence_block` | `high_confidence_block` | `no_decision`** — all four send/block answers are `es_decision: hit`; a block is an answer, not a failure. `no_decision` maps by reason (`ambiguous_employment` / `sources_disagree` → `ambiguous`; zero_hits / personal_mailbox / company_mismatch / `email_validate` / `lm_job_change` / `no_match` → `miss`; config / budget / compliance → `noop`; provider errors → `error`).
- Confidence rules: `employment: left` → block (high only if the email is also invalid); status `valid` + not risky → send (high, unless `unknown` employment demotes it to `low_confidence_send`); accuracy needs AI Ark corroboration for high.
- Input: one of `email` | `linkedin_url` | (`first_name` + `last_name`) — top level or under `person`. Without an email, `expected_company` must carry `domain` | `website` | `name` | `identifiers`, or `400 validation_failed` (`expected_company_required_without_email`). Optional `expected_company {domain, website, name, identifiers[]}`, `dry_run`, `external_ref`, `routing`, `compliance {soc2, data}`.
- Paths (`routing.path`; omit → `balance`): `speed` 0.5 (email validation only) · `balance` 13.5 (validation + LeadMagic email_to_profile + job-change when an expected company is present) · `accuracy` 14.5 (adds AI Ark reverse-lookup corroboration). `value` / `auto` / `coverage` / `fast` / `name_only` / `zi_stamp` → `400 invalid_routing`. `allow_paid_linkedin_lookup` defaults on for balance/accuracy.
- Layer-1 is one validator, never two: LeadMagic email validation by default; Findymail only when LeadMagic is blocked/unconfigured or explicitly selected (`routing.only: ["findymail"]`). No websearch, no Wiza on this capability. House LeadMagic/Wiza/Findymail keys work for any authenticated tenant; BYOK overrides them. The post-decision ZoomInfo contact search (`continueForContactId`) appends `result.zoominfo_contact_id` at estimate 0 — house ZoomInfo runs only on tenant `default`, otherwise BYOK.
- Catch-all / SEG / role-based mailboxes are **risk flags** on `result.email_validation`, never fifth outcomes — they shape confidence, not the enum. `result.soft_miss` (14 values, e.g. `ambiguous_current`, `email_ok_job_unknown`, `vendor_conflict`) explains soft non-blocks.
- Stamp: `safe_to_write.zoominfo_contact_id` = true iff `es_decision: hit` and the id is non-blank. The contact id is **not** required for `es_decision: hit`. Id-append only — never overwrite person name/title/company/LinkedIn from ZoomInfo.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Send `POST /v1/person/verify-employment` with the person (`email` preferred) and `expected_company` when known — it anchors the job-change check.
3. Render the verdict from `answer.outcome`: send (with confidence), block (with reason), or `no_decision` with its reason. Blocks cite `result.employment` (`still_there` | `left` | `unknown`) and the validation risk flags.
4. Business misses stay HTTP 200. `400` codes to relay verbatim: `validation_failed` | `invalid_routing` | `invalid_compliance` | `invalid_explain` | `invalid_schema` | `unsupported_schema`.
5. After the verdict, mention `result.zoominfo_contact_id` when present and safe to write.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`. `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` with `Retry-After` (the run never started; the `Idempotency-Key` is not spent). `409` idempotency family + `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (person identity present) · decision (verdict rendered).

### Shape

````markdown
## Employment — <high confidence send | low confidence send | low confidence block | high confidence block | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | linkedin_url | name+company | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — <send|block> | miss — <reason> | ambiguous | noop | unverified>
```

### Person
`<first_name last_name · <email>>`

- <✓ employment `still_there` at `<company_name>` — email `<status>` | ✗ employment `left` — do not send | · UNVERIFIED — <reason>>
- <· email_validation risk flags (catch_all / SEG / role) when present>
- <· soft_miss <value> | zoominfo_contact_id <set|absent> — stamp only when safe_to_write>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
