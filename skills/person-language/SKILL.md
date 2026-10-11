---
name: person-language
description: >-
  Decide and audit the KingMinos person.language answer: can we engage this
  person in English, and if not, in which language. Use when the user asks
  which language to sequence or advertise in, why english says likely or
  unconfirmed, what recommended_language or local_language mean, why a
  profile was rejected as person_mismatch, or how to target localized
  outbound for one contact.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos person.language

One decision: **can we engage this person in English — and if not, in what language?** `POST /v1/person/language` reads the person's own profile text and self-identified languages into a ranked answer for sequences and ads. API tenants only — it is **not** in `openapi.es.yaml` and never stamps Salesforce.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Policy (locked)

- **Input:** `email` or `linkedin_url` (top level or under `person`; neither → `400 validation_failed` / `email_or_linkedin_required`). There is **no name-based profile discovery** — `first_name` / `last_name` are match-only: they reject someone else's profile (`person_mismatch`) and never infer, score, or steer any language signal.
- **The answer** (`result`): `english` = `yes` (medium+ English) | `likely` (low-only English) | `unconfirmed` (other languages, no English) | `unknown` (nothing detected) — **never "no"**; `english_confidence`; `recommended_language` (+`_name` / `_confidence` / `_level`) — English whenever `english=yes`, else the top non-English, **set only at medium or high**; `local_language` (+`_name`) — the top non-English for localized sequences/ads; ranked `languages[]` (low guesses live here, with evidence `signal`s: `listed_languages`, `profile_locale`, `profile_text`, `location_country`, `company_language`, `email_cctld`, `text_judge`); `detected` (false = no evidence at all).
- **Hit gate:** `answer.outcome: hit` iff `recommended_language` is set. Low-only evidence is `no_decision` / `ambiguous` (candidates + `english` still returned); nothing is `zero_hits`; a rejected profile is `person_mismatch` (`person: null`). Stamp only when `answer.safe_to_write.recommended_language` — a hit without `conflicting_signals` or `unconfirmed_identity`.
- **Identity is per-profile:** a name conflict or a LinkedIn slug ≠ the requested one drops that profile entirely — no evidence is used, its URL is never followed, and `person_mismatch` is the reason only when no profile survived.
- Paths (`routing.path`; omit → `balance`; only `path` / `preset` is read): `speed` 1 (one profile read + language judge) · `balance` 3 (default; LeadMagic profile-search by LinkedIn URL → AI Ark reverse-lookup by email → Findymail reverse-email **only when AI Ark found no one** — the soc2 path — → LeadMagic on a URL the email hop resolved; stops once listed languages land) · `accuracy` 4 (every structured source, no early stop). Anything else (`coverage`, `auto`, `value`, …) → `400 invalid_routing`.
- Location alone caps at **medium** and keeps every candidate for `multilingual_country` (CH/BE/CA/IN/LU/SG/ZA… return several); common minority languages are never candidates. English prose may make `english=yes` but never erases `local_language`; headlines/job titles count only for non-English. Confidence is a heuristic score, not a calibrated probability.
- Cache: 30 days in D1 (`usage.cached: true` on a replay, 0 credits); `skip_cache` skips the read; the name is part of the key. House LeadMagic/AI Ark/Findymail keys work for any authenticated tenant; workspace BYOK overrides. Under `soc2`, LeadMagic/AI Ark skip `compliance_blocked` and Findymail is the only source.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. Send `POST /v1/person/language` with `email` (reverse-lookup) or `linkedin_url` (profile-search); pass `first_name` / `last_name` when known so a wrong-person profile is rejected instead of trusted.
3. Render the verdict from `answer.outcome` + `result`: `english` + `recommended_language` (+ `_name`) on a hit; `ambiguous` (low-only evidence) with the ranked `languages` still shown; `zero_hits` (`detected: false`); `person_mismatch` (`person: null`).
4. Use `local_language` for localized sequences/ads; `recommended_language` is the engage-in language. Low-confidence guesses stay inside `languages` — never headline them.
5. Business misses stay HTTP 200. `400` codes to relay verbatim: `validation_failed` (`email_or_linkedin_required` | `invalid_linkedin_url`) | `invalid_routing` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`. `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` with `Retry-After`. `409` idempotency family + `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (email or LinkedIn URL) · decision (language verdict rendered).

### Shape

````markdown
## Language — <english | likely english | unconfirmed | unknown | no decision | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | linkedin_url | missing>
Decision  <bar>  <✓|✗|·> <es_decision hit — <english verdict> | ambiguous — low-only evidence | zero_hits | person_mismatch | noop | unverified>
```

### Person
`<email or linkedin_url>`

- <✓ english `yes` — recommended_language `en` | ✗ person_mismatch — profile rejected | · UNVERIFIED — <reason>>
- <· local_language `<code>` — top non-English for localized sequences/ads>
- <· languages: <code <confidence> — evidence signal>>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
