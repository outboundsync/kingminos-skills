---
name: person-title
description: >-
  Decide and audit the KingMinos person.title answer: a person's current job
  title plus derived seniority and function. Use when the user asks for a
  prospect's title, seniority or department, how to route a persona or map
  the fields in a Clay HTTP column, which path (speed / balance / accuracy /
  coverage) to pick, why a lookup came back fields_incomplete, person_mismatch
  or employer_mismatch, or whether a title is safe to write.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.1.0"
---

# KingMinos person.title

One decision: **who is this person at work?** `POST /v1/person/title` takes an `email` or `linkedin_url` and returns the cleaned current `result.title`, plus the persona behind it: `result.seniority` and `result.function`.

API tenants only. It is **not** in `openapi.es.yaml` and never stamps Salesforce Contacts or Leads.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples (incl. a `curl` request and JSON response): [references/examples.md](references/examples.md).

## Policy (locked)

### Input

- **Identifier:** `email` or `linkedin_url`, top level or under `person`.
  - Neither → `400 validation_failed` / `email_or_linkedin_required`.
  - An unparseable URL → `invalid_linkedin_url`.
- **Match-only fields.** These reject a mismatch and never infer anything:
  - `first_name` / `last_name` → `person_mismatch`.
  - `company_domain` → a title at another employer is never a hit (`employer_mismatch`). An unparseable domain → `invalid_domain`.

### Fields

- `fields` is any of `title` | `seniority` | `function`. Omit = all three; anything else → `400 invalid_title_field`.
- The ladder walks until every requested field is answered. Only requested fields are returned.
- `seniority` and `function` are derived from the vendor title (`result.field_sources.<field>.method` is `derived` or `jev`).

### Paths

`routing.path`, omit = `balance`. `value` / `fast` / `name_only` → speed; `auto` → balance.

| Path | What it does | Cost on a hit |
| --- | --- | --- |
| `speed` | One profile read, keywords only, never `high` | 1 |
| `balance` | First usable title wins | 2 |
| `accuracy` | Two independent sources plus a judge; agreement is `high`, a disagreement flags `conflicting_titles`; 10 s cap | 3 |
| `coverage` | Adds AI Ark people search and Findymail whenever a second source is wanted | 5 |

- **Other routing:** `routing.only` / `routing.ignore` are honored; an unknown provider → `400 unknown_provider`. ZoomInfo is searched only on a workspace BYOK key.
- **Optional:** `dry_run`, `skip_cache`, `external_ref`, `compliance`.

### Billing (outcome-priced)

- **0 credits** on a miss, on a partial (`fields_incomplete`) and on a timeout.
- A `routing.max_provider_credits` below the path price is a 0-credit `max_credits_reached` noop.
- The 30-day cache is keyed on path + `fields` + `company_domain` + `only` / `ignore`. A replay costs 0 credits (`usage.cached: true`).
- Requires scope `person.title` (`403 scope_denied` without it).

### Hit gate

- `answer.outcome: hit` (`reason_code` `exact_one`) iff every requested field is answered at medium or high confidence.
- **Partial:** `no_decision` / `fields_incomplete` (`es_decision` `ambiguous`). Values are withheld; `result.answered_fields` names what was found.
- **Headline-only or wrong-employer evidence:** `ambiguous`.
- **Nothing found:** `zero_hits` (`miss`, `result.person` null).
- **Write rule:** write each non-blank field when `answer.confidence` meets path/`min_confidence` and the user's CRM acceptance floor — [`GET /v1/recipes/guidance`](https://api.kingminos.com/v1/recipes/guidance). Withhold on `conflicting_titles`, `unconfirmed_identity`, `employer_mismatch`, or below-floor blanks.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Pick `fields` for the job:
   - persona routing → `["seniority", "function"]`;
   - CRM title stamp → `["title"]` with `routing.path: "accuracy"` and `company_domain` set to the account's domain.
3. Send `POST /v1/person/title` with `email` and/or `linkedin_url`. Pass `first_name` / `last_name` when known, so a wrong-person profile is rejected instead of trusted.
4. Render the verdict from `answer.outcome` / `answer.reason_code`, `es_decision` and `result`. Report the per-field source (`vendor` / `derived` / `jev`) and any `flags`.
5. **Clay:** one HTTP column, email in. Map `result.title` / `result.seniority` / `result.function` out, branch on `es_decision`, and gate each write on `answer.confidence` vs the user's floor.
6. Business misses stay HTTP 200. Relay these `400` codes verbatim: `validation_failed` (`email_or_linkedin_required` | `invalid_linkedin_url` | `invalid_domain` | `invalid_title_field`) | `invalid_routing` | `unknown_provider` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`.
- `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` with `Retry-After`.
- `409` idempotency family, and `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (email or LinkedIn URL) · decision (title verdict rendered).

### Shape

````markdown
## Title — <found | incomplete | not found | person mismatch | employer mismatch | skipped | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | linkedin_url | email + linkedin_url | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — <path> | fields_incomplete | zero_hits | person_mismatch | employer_mismatch | noop — <reason> | provider_error | unverified>
```

### Person
`<email or linkedin_url>`

- <✓ title `<title>` via <provider> · <confidence> · meets write floor | ✗ fields_incomplete — no <missing fields> | ✗ zero_hits — no title found | ✗ person_mismatch — profile rejected | ✗ employer_mismatch — title is at another company | · UNVERIFIED — <reason>>
- <· seniority: <seniority> (<vendor | derived | jev>)>
- <· function: <function> (<vendor | derived | jev>)>
- <· flags: <conflicting_titles — do not write | stale_title | single_source | …>>
- <· credits: <1 | 2 | 3 | 5 | 0 | 0 cached>>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
