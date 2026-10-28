---
name: person-email
description: >-
  Decide and audit the KingMinos person.email answer: a person's verified work
  email from their name and company domain, or their LinkedIn URL. Use when
  the user asks to find someone's work email, fill a blank email field before
  a sequence or CRM stamp, map the field in a Clay HTTP column, which path
  (speed / balance / accuracy / coverage) to pick, why a lookup came back
  not_found, conflict, catch_all, person_mismatch or below_min_confidence,
  whether a found email is confident enough to write, or how to verify it
  again before sending.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos person.email

One decision: **what is this person's work email?** `POST /v1/person/email` takes a name plus company domain and/or a LinkedIn URL and returns one verified `result.email`, plus `answer.confidence`. It never guesses a pattern (`first.last@`): only addresses a source has verified are delivered.

API tenants only. It is **not** in `openapi.es.yaml` and never stamps Salesforce Contacts or Leads. To check an address you already have, use `email-verify` instead.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples (incl. a `curl` request and JSON response): [references/examples.md](references/examples.md).

## When to use

- **Fill a blank email** on a lead or contact before a sequence or a CRM write.
- **Turn a LinkedIn profile into a work email** (e.g. from a social-selling list).
- Not for checking an address you already have (`email-verify`), a phone (`person-phone`), or a LinkedIn URL from an email (`person-b2b-social`).

## Policy (locked)

### Input

Send at least one route (fields top level or under `person`):

- **Name route:** `first_name` + `last_name` + `company_domain` (`domain` is an alias; normalized to the registrable domain). A packed full name on `first_name` with `last_name` blank is split.
- **LinkedIn route:** `linkedin_url` (a person profile; a company page → `400 validation_failed` / `invalid_linkedin_url`).
- Send both when you have them: the name route runs first, and `coverage` can use the LinkedIn route to corroborate or recover.
- A name without a domain, or a domain without a name and no `linkedin_url` → `400 validation_failed` / `insufficient_input`. Never invent the missing piece.
- A suppressed `linkedin_url` → `451 subject_suppressed` (0 credits), checked before any lookup. Do not retry; suppress the person in your own systems.

### Paths

`routing.path`, omit = `balance`. Legacy aliases → `400 invalid_routing`.

| Path | What it does | Default floor | Time limit |
| --- | --- | --- | --- |
| `speed` | One finder; a second only when the first found nothing | `low` | 8 s |
| `balance` | Speed, then an independent mailbox check on the found address | `medium` | 8 s |
| `accuracy` | Two finders in parallel; the independent check when only one found it | `high` | 10 s |
| `coverage` | Accuracy, plus the LinkedIn route when `linkedin_url` is sent | `low` | 10 s |

- **Pick:** fill a field for a sequence → `balance`; a CRM email stamp → `accuracy`; the hardest-to-find people, with a `linkedin_url` → `coverage`.
- **Other routing:** `routing.only` / `routing.ignore` are honored; an unknown provider → `400 unknown_provider`. `routing.max_provider_credits` below the path price → `max_credits_reached` noop at 0.
- **Optional:** `min_confidence` (`high` | `medium` | `low`; overrides the path floor), `dry_run`, `skip_cache`, `external_ref`, `compliance`.

### Billing (outcome-priced)

- **Only a delivered `found`** at or above the floor bills the path price, once: **1.5–5 credits** depending on the path (`speed` cheapest, `coverage` most).
- **0 credits** on `not_found`, `conflict`, `catch_all`, a disagreement, a person mismatch, a below-floor withhold, a suppressed address, a timeout and a dry run.
- On your own vendor key (BYOK), a delivered email bills a flat 0.1 router fee; you pay your vendor directly.
- 30-day hits-only cache; a replay costs 0 credits (`usage.cached: true`). `skip_cache` / `X-Router-Cache: bypass` skip the read only.
- Requires scope `person.email` (`403 scope_denied` without it).

### Outcomes

`answer.outcome` (also `result.status`). Only `found` returns an address.

- `found` — a verified work email at or above the floor (`es_decision` `hit`). `result.email`, `result.email_status: valid`, `result.route` (`name` | `linkedin`), `result.person` (identity echo).
- `conflict` — sources returned two different addresses. No address; 0 credits.
- `catch_all` — the domain accepts every address, so the find cannot be proven. Withheld; 0 credits.
- `not_found` — every other non-answer. `answer.reason_code` says which: `zero_hits` | `person_mismatch` | `no_match` | `sources_disagree` (the independent check said `invalid`) | `below_min_confidence` | `compliance_blocked` (the found address is suppressed) | `provider_error` (retry later) | `max_credits_reached` | `not_configured` | `status_down`.
- Off a hit, `result.candidates` lists only the source, route and status — never an address. Never write from `result.candidates`.

### Identity gates

A wrong person's email is worse than none. These are dropped before any answer:

- a source person whose first or last name conflicts with the request → flag `person_mismatch`;
- an address on a different domain than `company_domain` → flag `domain_mismatch`;
- a personal mailbox (gmail, outlook.com, …) → flag `personal_mailbox`. This returns work emails only.

### Confidence and write rule

- **Confidence is the only write signal.** There is no `safe_to_write` on this capability.
- Two independent sources agreeing on the address → `high`, flagged `finders_agree` (two finders) or `verified_by_second_vendor` (a finder plus a `valid` independent check). One source → `medium`, flagged `single_source`.
- Below the floor the answer is withheld: `result.email` is blank, `reason_code` is `below_min_confidence`, `answer.confidence` is kept (0 credits).
- Write `result.email` only on `found` when `answer.confidence` meets the user's CRM acceptance floor — [`GET /v1/recipes/guidance`](https://api.kingminos.com/v1/recipes/guidance). Ask the floor once per batch.

## Find, then verify

When the user wants extra assurance before a send:

1. A `high` find (`finders_agree` or `verified_by_second_vendor`) already has two independent sources — a second verify adds little.
2. On a `medium` / `single_source` find (typical of `speed`), or a cached find well before the send, hand `result.email` to `email-verify` (`POST /v1/email/verify`, `routing.path: accuracy`).
3. Send only when the find is `found` **and** the verify is `valid`. A verify `invalid` overrides the find; a verify `catch_all` means the address cannot be proven.
4. The two calls bill separately (find 1.5–5, verify 0.5–1.5). Tell the user before running the chain on a list.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. **Bulk:** before a list run, state the row count, the path and the 1.5–5-credit range per delivered email; ask once, including the write floor.
3. Send `POST /v1/person/email` with the name route, the LinkedIn route, or both.
4. Render the verdict from `answer.outcome` / `answer.reason_code`, `es_decision`, `answer.confidence`, `result.route` and `result.flags`.
5. **Clay:** one HTTP column, `first_name` / `last_name` / `company_domain` (and `linkedin_url` when you have it) in. Map `result.email` out, branch on `answer.outcome`, and gate the write on `answer.confidence` vs the user's floor.
6. Business misses stay HTTP 200. Relay these `400` codes verbatim: `validation_failed` (`insufficient_input` | `invalid_linkedin_url` | `invalid_domain` | `min_confidence`) | `invalid_routing` | `unknown_provider` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`.
- `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` | `max_credits_reached` with `Retry-After`.
- `451` `subject_suppressed` (0 credits; do not retry).
- `409` idempotency family, and `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (a complete route) · decision (email verdict rendered).

### Shape

````markdown
## Work email — <found | not found | conflict | catch-all | withheld | suppressed | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <name + domain | linkedin_url | name + domain + linkedin_url | insufficient_input>
Decision  <bar>  <✓|✗|·> <es_decision hit — <path> | zero_hits | person_mismatch | conflict | catch_all | sources_disagree | below_min_confidence | compliance_blocked | noop — <reason> | provider_error | 451 subject_suppressed | unverified>
```

### Person
`<first_name> <last_name> · <company_domain | linkedin_url>`

- <✓ email `<email>` · <confidence> · meets write floor | ✗ zero_hits — no verified email found | ✗ conflict — sources returned different addresses | ✗ catch_all — domain accepts every address | ✗ person_mismatch — source person rejected | ✗ sources_disagree — independent check said invalid | ✗ below_min_confidence — <confidence> withheld under the <floor> floor | ✗ 451 subject_suppressed — do not contact | · UNVERIFIED — <reason>>
- <· route: <name | linkedin>>
- <· flags: <finders_agree | verified_by_second_vendor | single_source — verify before a send | domain_mismatch | personal_mailbox | person_mismatch — another person rejected>>
- <· credits: <spent | 0 | 0 cached>>

### Next
1. <shortest action tied to a ✗, UNVERIFIED or single_source line above>
````
