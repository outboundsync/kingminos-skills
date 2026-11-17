---
name: person-name
description: >-
  Decide and audit the KingMinos person.name answer: a person's cleaned,
  proper-cased first, last and full name from an email or LinkedIn URL. Use
  when the user asks for a prospect's first name or last name, how to fix a
  junk or ALL-CAPS name before a CRM stamp or a personalized send, how to map
  the fields in a Clay HTTP column, which path (speed / balance / accuracy /
  coverage) to pick, why a lookup came back role_address, conflict,
  parsed_only or not_found, whether to present options[] and next_steps with
  est_credits, the crm_contact_name_cleanup recipe, quality_flags, or whether
  a name is confident enough to write.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.2.1"
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

| Path | What it does | Default write floor |
| --- | --- | --- |
| `speed` | One profile read; never `high` | `low` |
| `balance` | First usable name wins | `medium` |
| `accuracy` | Same ladder plus the judge; two agreeing sources are `high`, a disagreement is `conflict` | `high` |
| `coverage` | Balance ladder plus a second source | `low` |

A hit bills the path price, once; a miss, conflict or withhold bills 0. Prices per path: the `api` skill's pricing reference (`api/references/pricing.md`); each response also quotes them as `options[].est_credits`.

- **Other routing:** `routing.only` / `routing.ignore` are honored; an unknown provider → `400 unknown_provider`.
- **Optional:** `min_confidence` (overrides the path floor), `dry_run`, `skip_cache`, `external_ref`, `compliance`.

### Billing (outcome-priced)

- **0 credits** on a miss, a conflict, a role address, a below-floor withhold, a `parsed_only` guess and a timeout.
- A `routing.max_provider_credits` below the path price is a 0-credit `max_credits_reached` noop. `X-Router-Max-Provider-Credits` is that ceiling when the body omits it: the lowest of the path cap, the server ceiling, the header, and the body applies (it can only lower the cap). A non-number is `400 invalid_routing`; an empty value is ignored. The effective ceiling is part of the `Idempotency-Key` hash.
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
- **`result.quality_flags`** (`surname_initial_only` \| `surname_truncated` \| `surname_repeats_first` \| `credential_suffix`) mark a weak delivered name. They do not change billing or outcome. **Never write a quality-flagged name to CRM** — surface the flags and follow `next_steps`.

### Agent enrichment (locked)

Every `POST /v1/person/name` response includes **`options[]`**, **`agent_guidance`**, and usually **`next_steps[]`**. These exist so enrichment is a back-and-forth, not a one-shot.

- **`options[]`:** every product path on this endpoint (`speed` / `balance` / `accuracy` / `coverage`) plus related endpoints (for example `/v1/person/b2b-social` when the request had `email` but no `linkedin_url`). Each row has `endpoint`, optional `path`, `description`, `est_credits` (from the path price, never invented), and `inputs`.
- **`next_steps[]`:** on a miss (`not_found`), a below-floor withhold, `parsed_only`, or any `quality_flags` — each item has `action`, `endpoint`, `inputs`, `reason`, and `est_credits`. Honor chained `inputs` shaped `{ from_endpoint, from_field }`.
- **`agent_guidance`:** short instruction to **present every option to the user with credits and wait**. Never assume "keep spending low" or silently pick `speed` / a cheaper path unless the user asked.
- A miss is **not a stop**: render the verdict, then list **`options[]`** and actionable **`next_steps[]`**, and ask what to run next. Only call another endpoint after the user chooses (or confirms a recipe dial they picked).

### CRM name cleanup (`crm_contact_name_cleanup`)

Catalog: `GET /v1/recipes` → recipe id `crm_contact_name_cleanup` (free, 0 credits). Use when a CRM contact has a junk name and/or a blank LinkedIn URL field.

1. `POST /v1/person/name` with the contact's `email` (and `linkedin_url` when already on file). Ask which path (`options[]` / recipe `dials`) before spending.
2. On misses or weak names, run `POST /v1/person/b2b-social` for rows that still have no usable LinkedIn URL — only after the user agrees to the `est_credits` (`person-b2b-social` skill).
3. `POST /v1/person/name` again with `email` plus `linkedin_url` from step 2 (`inputs` / `next_steps` may spell this chain out).
4. Write **`first_name` / `last_name`** only when `answer.outcome` is `resolved`, confidence meets the floor, and **`result.quality_flags` is null**. Write **`linkedin_url`** only when `person.b2b_social` is `found` at the user's floor — same write rules as the dedicated skill.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Offer path choices from **`options[]`** (or recipe dials) with **`est_credits`**; wait for the user. Do not default to the cheapest path.
3. Send `POST /v1/person/name` with `email` and/or `linkedin_url` and the chosen `routing.path`.
4. Render the verdict from `answer.outcome` / `answer.reason_code`, `es_decision`, `answer.confidence` and `result`. Report `result.matched_on`, `result.email_type`, `result.flags`, and any **`result.quality_flags`**.
5. Always show **`options[]`** and **`next_steps[]`** with credits. Relay **`agent_guidance`** when present. On `not_found`, `parsed_only`, below-floor, or quality flags — ask which next step to run; do not end the thread.
6. **Clay:** one HTTP column, email in. Map `result.first_name` / `result.last_name` / `result.full_name` out, branch on `answer.outcome`, gate each write on `answer.confidence` vs the user's floor, and block writes when `quality_flags` is set.
7. Business misses stay HTTP 200. Relay these `400` codes verbatim: `validation_failed` (`email_or_linkedin_required` | `invalid_linkedin_url`) | `invalid_routing` | `unknown_provider` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`.
- `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` | `max_credits_reached` with `Retry-After`.
- `451` `subject_suppressed` (0 credits; do not retry).
- `409` `idempotency_conflict` (same key, different request — use a new key) | `idempotency_in_flight` (still running; ~40 s with no activity re-runs only if no paid vendor was contacted, else `idempotency_spent`) | `idempotency_spent` (a paid vendor was already contacted — do not retry that key) | `idempotency_replay_unavailable`. `503` `store_unavailable` retries the same key (the run was not started). A same-hash completed run replays (`replayed: true`, no new charge); a free `no_decision` miss is re-run instead of replayed.

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
- <· quality_flags: <surname_initial_only | surname_truncated | surname_repeats_first | credential_suffix — do not write>>
- <· credits: <usage.credits.spent | 0 cached>>

### Options
<Present every row from `options[]` — endpoint, path when set, `est_credits`, one-line description. Ask the user which to run.>

- · `<endpoint>` · path `<speed|balance|accuracy|coverage>` when set · `<est_credits>` credits — `<description>`
- …

### Follow-ups
<When `next_steps[]` is non-empty, mirror it here with credits. Empty on a clean `resolved` hit with no quality flags.>

- · `<endpoint>` · `<est_credits>` credits — `<reason>`

### Next
1. <Present `options[]` / `next_steps[]` and wait for the user's choice — or the shortest action tied to a ✗ or UNVERIFIED above>
````
