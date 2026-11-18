---
name: person-b2b-social
description: >-
  Decide and audit the KingMinos person.b2b_social answer: a person's LinkedIn
  profile URL from their email address. Use when the user asks for a
  prospect's LinkedIn profile, how to fill a blank LinkedIn URL field before a
  CRM stamp or a social touch, how to map the field in a Clay HTTP column,
  which path (speed / balance / accuracy) to pick, why a lookup came back
  not_found, person_mismatch, below_min_confidence or conflicting_profiles,
  or whether a profile URL is confident enough to write.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.2.1"
---

# KingMinos person.b2b_social

One decision: **which LinkedIn profile belongs to this email?** `POST /v1/person/b2b-social` takes an `email` and returns the person's canonical `result.linkedin_url` (`https://www.linkedin.com/in/<slug>`), plus `answer.confidence`.

API tenants only. It is **not** in `openapi.es.yaml` and never stamps Salesforce Contacts or Leads. For a company's LinkedIn page, use `company-b2b-social` instead.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples (incl. a `curl` request and JSON response): [references/examples.md](references/examples.md).

## Policy (locked)

### Input

- **`email` is required**, top level or under `person`. It is the only discovery key. Without it → `400 validation_failed` / `email_required`.
- **Match-only fields.** These reject a mismatch and never discover, infer or score anything:
  - `linkedin_url` → a profile with a different slug is rejected (`person_mismatch`). A LinkedIn company page → `400 invalid_linkedin_url`.
  - `first_name` / `last_name` → a profile with a conflicting name is rejected (`person_mismatch`).
- A rejected profile is never returned and its URL is never followed.
- A suppressed `email` / `linkedin_url` → `451 subject_suppressed` (0 credits). Do not retry; suppress the person in your own systems.

### Paths

`routing.path` (or `preset`), omit = `balance`. `value` / `fast` / `name_only` → speed; `auto` → balance. `coverage` is the highest-fill path (floor `low`).

| Path | What it does | Default write floor |
| --- | --- | --- |
| `speed` | One email-keyed lookup, with a fallback only when the first answered nothing; never `high` | `low` |
| `balance` | Both email-keyed sources, always (two independent sources) | `medium` |
| `accuracy` | Both sources, plus a public-web check (and your own ZoomInfo key when stored) when they disagree or one is uncorroborated; withholds unless independently confirmed; 10 s cap | `high` |
| `coverage` | Both sources plus a public-web check, and your own ZoomInfo key when stored; highest fill | `low` |

A hit bills the path price, once; a miss, mismatch or withhold bills 0. Prices per path: the `api` skill's pricing reference (`api/references/pricing.md`).

- **Other routing:** `routing.only` / `routing.ignore` are honored; an unknown provider → `400 unknown_provider`.
- **Optional:** `min_confidence` (`high` | `medium` | `low`; overrides the path floor), `dry_run`, `skip_cache`, `external_ref`, `compliance`.

### Billing (outcome-priced)

- Only a delivered, floor-passing hit bills the path price, once.
- **0 credits** on a miss, a person mismatch, a below-floor withhold, a timeout and a refusal.
- A `routing.max_provider_credits` below the path price is a 0-credit `max_credits_reached` noop. `X-Router-Max-Provider-Credits` is that ceiling when the body omits it: the lowest of the path cap, the server ceiling, the header, and the body applies (it can only lower the cap). A non-number is `400 invalid_routing`; an empty value is ignored. The effective ceiling is part of the `Idempotency-Key` hash.
- The 30-day cache is keyed on email + LinkedIn slug + name + path + `only` / `ignore` + `min_confidence`. A replay costs 0 credits (`usage.cached: true`).
- Requires scope `person.b2b_social` (`403 scope_denied` without it).

### Outcomes

`answer.outcome` (also `result.status`):

- `found` — a profile URL at or above the floor (`es_decision` `hit`). `result.linkedin_url`, `result.linkedin_slug`, `result.source: vendor_email`.
- `not_found` — every non-answer. `answer.reason_code` says which:
  - `zero_hits` | `person_mismatch` | `below_min_confidence` → `miss`;
  - `max_credits_reached` | `not_configured` | `compliance_blocked` | `status_down` → `noop`;
  - `provider_error` → `error`.
- On a miss `result.person` is null: a miss is never a free lookup.

### Confidence and write rule

- **Confidence is the only write signal.** There is no `safe_to_write` on this capability.
- Two independent sources agreeing on the same slug → `high`. One source → `medium`. Sources that disagree → the best guess at `low`, flagged `conflicting_profiles`. Speed never claims `high`.
- Below the floor the answer is withheld: `result.linkedin_url` is blank, `reason_code` is `below_min_confidence`, and `answer.confidence` plus `result.candidates` are kept for review (0 credits). Never write from `result.candidates`.
- Write `result.linkedin_url` only on `found` when `answer.confidence` meets the user's CRM acceptance floor — [`GET /v1/recipes/guidance`](https://api.kingminos.com/v1/recipes/guidance).
- Withhold on `conflicting_profiles` and `unconfirmed_identity` (a requested name the record could not be checked against; never `high`). A `person_mismatch` flag on a hit means another profile was rejected; the returned one passed.

### Chaining from person.name

- `POST /v1/person/name` may put **`/v1/person/b2b-social`** in **`next_steps[]`** or **`options[]`** when the request had `email` but no `linkedin_url` (miss, withhold, `parsed_only`, or `quality_flags`). Quote the API's **`est_credits`** and **ask before calling** — the same rule as `agent_guidance` on person.name.
- Step 2 of recipe **`crm_contact_name_cleanup`** (`GET /v1/recipes`). After a profile URL is `found` at the user's floor, a follow-up **`POST /v1/person/name`** with `email` + `linkedin_url` is step 3 (`person-name` skill).

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. When the user arrived from `person.name` `next_steps` / `options`, confirm path and credits before spending.
3. Pick the path for the job:
   - fill a blank LinkedIn field for a social touch → `balance`;
   - CRM profile-URL stamp → `accuracy` (floor `high`: only two agreeing sources deliver).
4. Send `POST /v1/person/b2b-social` with `email`. Pass `first_name` / `last_name` when known, so a wrong-person profile is rejected instead of trusted. Pass a known `linkedin_url` only to confirm it.
5. Render the verdict from `answer.outcome` / `answer.reason_code`, `es_decision`, `answer.confidence` and `result`. Report how many `result.candidates` agree and any `flags`.
6. On `found`, offer a **`person.name`** retry with the new `linkedin_url` when the user wants a CRM name stamp — quote credits from `person.name` `options[]` if you have them.
7. **Clay:** one HTTP column, email in. Map `result.linkedin_url` out, branch on `answer.outcome`, and gate the write on `answer.confidence` vs the user's floor.
8. Business misses stay HTTP 200. Relay these `400` codes verbatim: `validation_failed` (`email_required` | `invalid_linkedin_url` | `min_confidence`) | `invalid_routing` | `unknown_provider` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`.
- `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` | `max_credits_reached` with `Retry-After`.
- `451` `subject_suppressed` (0 credits; do not retry).
- `409` `idempotency_conflict` (same key, different request — use a new key) | `idempotency_in_flight` (still running; ~40 s with no activity re-runs only if no paid vendor was contacted, else `idempotency_spent`) | `idempotency_spent` (a paid vendor was already contacted — do not retry that key) | `idempotency_replay_unavailable`. `503` `store_unavailable` retries the same key (the run was not started). A same-hash completed run replays (`replayed: true`, no new charge); a free `no_decision` miss is re-run instead of replayed.

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (email) · decision (profile verdict rendered).

### Shape

````markdown
## LinkedIn profile — <found | not found | person mismatch | withheld | skipped | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | email + linkedin_url | email + name | missing email>
Decision  <bar>  <✓|✗|·> <es_decision hit — <path> | zero_hits | person_mismatch | below_min_confidence | noop — <reason> | provider_error | unverified>
```

### Person
`<email>`

- <✓ profile `<linkedin_url>` · <confidence> · meets write floor | ✗ zero_hits — no profile found | ✗ person_mismatch — profile rejected | ✗ below_min_confidence — <confidence> withheld under the <floor> floor | · UNVERIFIED — <reason>>
- <· sources: <n> of <m> candidates agree>
- <· flags: <conflicting_profiles — do not write | unconfirmed_identity | single_source | person_mismatch — another profile rejected>>
- <· credits: <usage.credits.spent | 0 cached>>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
