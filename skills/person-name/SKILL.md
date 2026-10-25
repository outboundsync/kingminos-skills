---
name: person-name
description: >-
  Decide and audit the KingMinos person.name answer: a person's cleaned,
  proper-cased first, last and full name from an email or LinkedIn URL. Use
  when the user asks for a prospect's first name or last name, how to fix a
  junk or ALL-CAPS name before a CRM stamp or a personalized send, how to map
  the fields in a Clay HTTP column, which path (speed / balance / accuracy /
  coverage) to pick, why a lookup came back role_address, conflict,
  parsed_only or not_found, or whether a name is confident enough to write.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos person.name

One decision: **what is this person called?** `POST /v1/person/name` takes an `email` or `linkedin_url` and returns a cleaned, proper-cased `result.first_name`, `result.last_name` and `result.full_name`, plus `answer.confidence`.

API tenants only. It is **not** in `openapi.es.yaml` and never stamps Salesforce Contacts or Leads.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples (incl. a `curl` request and JSON response): [references/examples.md](references/examples.md).

## Policy (locked)

### Input

- **Identifier:** `email` or `linkedin_url`, top level or under `person`.
  - Neither → `400 validation_failed` / `email_or_linkedin_required`.
  - An unparseable URL → `invalid_linkedin_url`.
- `phone` / `x_handle` are accepted but never looked up. A phone- or X-only request is `unsupported_input` (0 credits).
- A suppressed `email` / `linkedin_url` → `451 subject_suppressed` (0 credits). Do not retry; suppress the person in your own systems.

### Cleaning

- Salutations, titles, honorifics, suffixes, pronouns, emoji and URLs are stripped from every candidate, then the name is proper-cased. Cleaning is deterministic and costs nothing.
- On `balance` and above, a judge classifies only an ambiguous multi-word split. It never invents a name; it only splits words the cleaner already kept.
- A profile whose LinkedIn slug differs from the requested `linkedin_url` is rejected, never trusted.

### Paths

`routing.path`, omit = `balance`. `value` / `fast` / `name_only` → speed; `auto` → balance.

| Path | What it does | Default write floor | Cost on a hit |
| --- | --- | --- | --- |
| `speed` | One profile read; never `high` | `low` | 1 |
| `balance` | First usable name wins | `medium` | 2 |
| `accuracy` | Same ladder plus the judge; two agreeing sources are `high`, a disagreement is `conflict` | `high` | 3 |
| `coverage` | Balance ladder plus a second source | `low` | 5 |

- **Other routing:** `routing.only` / `routing.ignore` are honored; an unknown provider → `400 unknown_provider`.
- **Optional:** `min_confidence` (overrides the path floor), `dry_run`, `skip_cache`, `external_ref`, `compliance`.

### Billing (outcome-priced)

- **0 credits** on a miss, a conflict, a role address, a below-floor withhold, a `parsed_only` guess and a timeout.
- A `routing.max_provider_credits` below the path price is a 0-credit `max_credits_reached` noop.
- The 30-day cache is keyed on path + `min_confidence` + `only` / `ignore`. A replay costs 0 credits (`usage.cached: true`).
- Requires scope `person.name` (`403 scope_denied` without it).

### Outcomes

`answer.outcome`:

- `resolved` — a name from a matched profile (`es_decision` `hit`). `result.name_source: vendor`; `result.matched_on` names the identifier(s) it came from.
- `parsed_only` — last resort when the ladder found nobody: a guess from the email local part at `low` confidence, flagged `email_local_parse` (plus `first_name_only` when there is no last name). Never billed.
- `role_address` — a shared mailbox (`admin@`, `info@`, …) is never a person (`noop`, 0 credits).
- `conflict` — sources disagree, or the two identifiers resolve to different people. Flags `conflicting_names`, 0 credits.
- `not_found` — nothing usable (`miss`, `result.person` null). `answer.reason_code` says why: `zero_hits`, `person_mismatch`, or `below_min_confidence`.
- `unsupported_input` — phone- or X-only request (`noop`, 0 credits).

### Write rule

- **Confidence is the only write signal.** There is no `safe_to_write` on this capability.
- Write `first_name` / `last_name` only on `resolved` when `answer.confidence` meets the path floor (or `min_confidence`) and the user's CRM acceptance floor — [`GET /v1/recipes/guidance`](https://api.kingminos.com/v1/recipes/guidance).
- Below the floor the name fields are blank; the candidates stay in `result.evidence` for review. Never write from `result.evidence`.
- Never write a `parsed_only` guess to a CRM name field. It is fine for a greeting only when the user accepts a `low` guess.
- Withhold on `conflicting_names` and `unconfirmed_identity`.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Pick the path for the job:
   - personalized send or greeting → `balance`;
   - CRM name stamp → `accuracy` (floor `high`), with both `email` and `linkedin_url` when known.
3. Send `POST /v1/person/name` with `email` and/or `linkedin_url`.
4. Render the verdict from `answer.outcome` / `answer.reason_code`, `es_decision`, `answer.confidence` and `result`. Report `result.matched_on`, `result.email_type` and any `flags`.
5. **Clay:** one HTTP column, email in. Map `result.first_name` / `result.last_name` / `result.full_name` out, branch on `answer.outcome`, and gate each write on `answer.confidence` vs the user's floor.
6. Business misses stay HTTP 200. Relay these `400` codes verbatim: `validation_failed` (`email_or_linkedin_required` | `invalid_linkedin_url`) | `invalid_routing` | `unknown_provider` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`.
- `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` | `max_credits_reached` with `Retry-After`.
- `451` `subject_suppressed` (0 credits; do not retry).
- `409` idempotency family, and `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (email or LinkedIn URL) · decision (name verdict rendered).

### Shape

````markdown
## Name — <resolved | parsed only | role address | conflict | not found | person mismatch | withheld | unsupported input | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | linkedin_url | email + linkedin_url | phone or x only | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — <path> | parsed_only | role_address | conflict | zero_hits | person_mismatch | below_min_confidence | noop — <reason> | provider_error | unverified>
```

### Person
`<email or linkedin_url>`

- <✓ name `<full_name>` (first `<first_name>` · last `<last_name>`) · <confidence> · meets write floor | · parsed_only — `<full_name>` guessed from the email · low · do not write | ✗ role_address — a shared mailbox is not a person | ✗ conflict — sources name different people | ✗ zero_hits — no name found | ✗ person_mismatch — profile rejected | ✗ below_min_confidence — <confidence> withheld under the <floor> floor | · UNVERIFIED — <reason>>
- <· matched on: <email | linkedin_url | email + linkedin_url> · email type: <work | freemail | role>>
- <· flags: <conflicting_names — do not write | unconfirmed_identity | single_source | first_name_only | freemail | …>>
- <· credits: <1 | 2 | 3 | 5 | 0 | 0 cached>>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
