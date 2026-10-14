---
name: person-phone
description: >-
  Decide and audit the KingMinos person.phone answer: one dialable phone
  number for a person, plus the ranked rest. Use when the user asks for a
  prospect's phone or mobile number, how to map best_phone in a Clay HTTP
  column, which number format to request, what a phone's confidence or flags mean, why a lookup came back zero_hits or person_mismatch, what
  phone_types or max_results do, or whether a number is safe to write.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.1.0"
---

# KingMinos person.phone

One decision: **can we dial this person — and on which number?** `POST /v1/person/phone` takes an `email` or `linkedin_url` and returns `result.best_phone` (E.164) with the ranked, typed rest behind it. API tenants only — it is **not** in `openapi.es.yaml` and never stamps Salesforce Contacts or Leads.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples (incl. a `curl` request and JSON response): [references/examples.md](references/examples.md).

## Policy (locked)

- **Input:** `email` (the Smartlead / Clay primary) or `linkedin_url` (top level or under `person`; neither → `400 validation_failed` / `email_or_linkedin_required`; an unparseable URL → `invalid_linkedin_url`). `first_name` / `last_name` are **match-only**: they reject a profile that belongs to someone else (`person_mismatch`) and never infer anything.
- **Options:** `phone_types` — `mobile` | `landline` | `other` | `unknown` (omit = any; anything else → `400 invalid_phone_type`). `max_results` — 1–10, default 3 (out of range → `400 max_results_out_of_range`). `format` — `e164` (default) | `international` | `national` | `digits` | `digits_national` picks the `number` string (anything else → `400 invalid_phone_format`); every phone also carries `e164` and all five under `formats`, and switching format replays the cache at 0 credits. When no ladder vendor can return any requested type, the vendor is not called: 0 credits, `insufficient_input` / `noop`. Also `dry_run`, `skip_cache`, `external_ref`, `compliance`.
- **Routing:** locked ladder. `routing.only` / `routing.ignore` are honored (vendor isolation; unknown provider → `400 unknown_provider`); `routing.path` / `preset` / `order` are ignored.
- **The answer** (`result`): `best_phone` or null, and `phones[]` — each `{ number, e164, formats, country_code, calling_code, type, line_type, source, sources, confidence, flags, safe_to_write }`, ranked safe-to-write first, then mobile, deduped, filter-honoring, capped by `max_results`; `flags` (`conflicting_numbers`, `numbers_dropped`) or null; `person` (null on every miss, including `person_mismatch`).
- **Verification (free, no extra vendor):** libphonenumber validity (invalid numbers dropped); junk (repeated / sequential digits, NANP 555-01xx) dropped; numbering-plan `line_type` — toll-free, premium, shared-cost, pager and the company switchboard are not a direct dial and are dropped (a hit left with nothing is a 0-credit miss); `country_mismatch` (number vs the person's or company's location) lowers confidence; `email_country_mismatch` is informational; `multi_source` (two vendors agree) raises it; `secondary_number` = not the vendor's primary. US/Canada `line_type` is `fixed_line_or_mobile` — no carrier lookup is made.
- **Hit gate:** `answer.outcome: hit` (`reason_code` `exact_one`) iff a matching number was found; otherwise `no_decision` with `answer.reason_code` `zero_hits` | `person_mismatch` | `provider_error` | a skip reason. A `mobile`-only request that only found a landline is `zero_hits`. `es_decision`: `hit` | `miss` | `noop` | `error` (no vendor answered → `provider_error`). Write the number only when `answer.safe_to_write.best_phone` — a hit without `conflicting_numbers` whose `best_phone.safe_to_write` is true. A wrong number is worse than none.
- **Routing & billing:** Agent-managed router (default): plans per request from the input (email / LinkedIn / name+domain) and region, fans out a parallel wave of free-on-miss vendors (ZoomInfo BYOK, LeadMagic, AI Ark, Findymail US-only), scores vendor agreement (`consensus`: unanimous / majority / single / conflict; `do_not_call` when the vendor says), and escalates to Wiza only on a miss, a conflict, or early for non-US. `routing.path` = speed (cap 10) / balance (default) / accuracy / coverage; `routing.only` / `ignore` filter the pool. Only the vendors behind best_phone bill, capped at 38 credits; 0 on a miss; BYOK 0.1. Ceiling 38 (5 Wiza credits = 38). Prefer `best_phone.consensus` majority/unanimous for cold dialing; never dial `do_not_call: true`. 30-day cache keyed on the request filter replays at 0 credits (`usage.cached: true`); `skip_cache` / `X-Router-Cache: bypass` skips the read. Scope `person.phone` (`403 scope_denied` without it).

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Send `POST /v1/person/phone` with `email` (or `linkedin_url`); pass `first_name` / `last_name` when known so a wrong-person profile is rejected instead of trusted. Add `phone_types: ["mobile"]` for dialers that need a mobile.
3. Render the verdict from `answer.outcome` / `answer.reason_code` + `es_decision` + `result`: `best_phone` on a hit; `zero_hits` (no matching number); `person_mismatch` (`person: null`); `noop` (skipped, 0 credits); `provider_error`.
4. Clay: one HTTP column over a Smartlead list — email in, map `result.best_phone.number` (+ `type`, `confidence`) out — pass `format: "national"` (or `digits`) when the dialer wants that string, branch on `es_decision`; gate the write on `answer.safe_to_write.best_phone`.
5. Business misses stay HTTP 200. `400` codes to relay verbatim: `validation_failed` (`email_or_linkedin_required` | `invalid_linkedin_url` | `invalid_phone_type` | `max_results_out_of_range` | `invalid_phone_format`) | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`. `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` with `Retry-After`. `409` idempotency family + `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (email or LinkedIn URL) · decision (phone verdict rendered).

### Shape

````markdown
## Phone — <found | not found | person mismatch | skipped | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | linkedin_url | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — <type> | zero_hits | person_mismatch | noop — <reason> | provider_error | unverified>
```

### Person
`<email or linkedin_url>`

- <✓ best_phone `<E.164>` — <type> via <source> · <confidence> · safe_to_write | ✗ zero_hits — no <phone_types> number | ✗ person_mismatch — profile rejected | · UNVERIFIED — <reason>>
- <· phones: `<E.164> <type>` …>
- <· flags: conflicting_numbers — do not write | country_mismatch — confirm before dialing | numbers_dropped — <n> invalid/junk/switchboard dropped>
- <· credits: <38 | 0 | 0 cached>>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
