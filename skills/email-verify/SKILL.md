---
name: email-verify
description: >-
  Decide and audit the KingMinos email.verify answer: whether one mailbox is
  deliverable before a send. Use when the user asks to verify or validate an
  email address, clean a list before a sequence, check whether an address
  will bounce, what valid / invalid / catch_all / unknown means, which path
  (speed / balance / accuracy / coverage) to pick, why a check came back
  unknown, vendor_disagreement or below_min_confidence, or how to double-check
  an email that person-email found.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory). API tenants only.
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos email.verify

One decision: **is this mailbox deliverable?** `POST /v1/email/verify` takes one `email` and returns `result.status` — `valid` | `invalid` | `catch_all` | `unknown` — plus `answer.confidence` and mailbox flags.

API tenants only. It is **not** in `openapi.es.yaml` and never stamps Salesforce Contacts or Leads. To *find* an address from a name, use `person-email` instead.

**Blocked or missing data?** File feedback — MCP submit_feedback or POST /v1/feedback (free, never costs credits). Not a support channel.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples (incl. a `curl` request and JSON response): [references/examples.md](references/examples.md).

## When to use

- **List hygiene before a send:** one row per address, drop `invalid`, decide `catch_all` by the user's policy.
- **Checking an address you already have** — imported, typed by a rep, or older than the last send.
- **Extra assurance after `person-email`** — see [Find, then verify](#find-then-verify).
- Not for finding an address (`person-email`), a LinkedIn profile (`person-b2b-social`), or whether the person still works there (`person-verify-employment`).

## Policy (locked)

### Input

- **`email` is the only input** (≤ 320 characters). Missing → `400 validation_failed` / `email_required`; too long → `email_too_long`.
- The address is canonicalized once (lower-cased, look-alike host spellings folded). `result.email` is that normalized form.
- **A malformed address is an answer, not an error:** `invalid`, `result.source: local`, 0 credits. A junk row in a list still gets a status.
- A suppressed `email` → `451 subject_suppressed` (0 credits), checked before any lookup. Do not retry; suppress the address in your own systems.

### Checks

1. **Free local checks first** (under a second, never billed): syntax, a reserved domain (`.invalid`, `.test`, `.example`, `.localhost`, `.local`), a domain that does not exist, or a domain with no mail host → `invalid`, `source: local`.
2. **Vendor checks** (`source: vendor`) — independent email validation, run per the path.

### Paths

`routing.path`, omit = `balance`. Legacy aliases (`value`, `auto`, `fast`, `name_only`) → `400 invalid_routing`.

| Path | What it does | Default floor | Time limit |
| --- | --- | --- | --- |
| `speed` | One check; a second only when the first did not answer | `low` | 8 s |
| `balance` | One check, plus a second opinion when the first is inconclusive | `medium` | 8 s |
| `accuracy` | Two independent checks; delivers only when both agree | `high` | 10 s |
| `coverage` | Two independent checks; one conclusive check is enough | `low` | 10 s |

- **Pick:** bulk hygiene → `speed` or `balance`; a high-stakes send or a CRM "verified" stamp → `accuracy`; squeeze the most answers out of a hard list → `coverage`.
- **Other routing:** `routing.only` / `routing.ignore` are honored; an unknown provider → `400 unknown_provider`. `routing.max_provider_credits` below the path price → `max_credits_reached` noop at 0.
- **Optional:** `min_confidence` (`high` | `medium` | `low`; overrides the path floor), `dry_run` (offline — no DNS or vendor check), `external_ref`, `compliance`.

### Billing (outcome-priced)

- **Only a delivered vendor `valid` / `invalid`** at or above the floor bills the path price, once: **0.5–1.5 credits** depending on the path (`speed` cheapest; `accuracy` / `coverage` most).
- **0 credits** on `catch_all`, `unknown`, a local `invalid`, a below-floor withhold, a vendor disagreement, a timeout, a compliance skip and a dry run.
- On your own vendor key (BYOK), a delivered answer bills a flat 0.1 router fee; you pay your vendor directly.
- **Not cached** — every call is a fresh check. Report the actual `usage.credits.spent`.
- Requires scope `email.verify` (`403 scope_denied` without it).

### Status

`answer.outcome` (also `result.status`):

| Status | Meaning | `es_decision` | Act |
| --- | --- | --- | --- |
| `valid` | The mailbox accepts mail | `hit` | Send |
| `invalid` | It will bounce (local or vendor) | `hit` | Remove from the send; never retry |
| `catch_all` | The domain accepts every address, so "valid" cannot be proven (`reason_code` `ambiguous`) | `ambiguous` | Apply the user's catch-all policy; a retry will not change it |
| `unknown` | No conclusive answer | `miss` \| `ambiguous` \| `error` \| `noop` | Hold; retry only when `next_steps` suggests a path |

`unknown` `reason_code`: `zero_hits` | `below_min_confidence` → `miss`; `sources_disagree` → `ambiguous`; `provider_error` (incl. a timeout) → `error`; `not_configured` | `max_credits_reached` | `compliance_blocked` | `status_down` → `noop`.

### Confidence and flags

- Two agreeing checks (or a local `invalid`) → `high`. One check → `medium`. Conflicting checks → `unknown`, confidence `low`, flag `vendor_disagreement`.
- Below the floor the status is withheld as `unknown`, `reason_code` `below_min_confidence`; the withheld `answer.confidence` is kept (0 credits).
- **Flags describe the mailbox and never change the status:** `role_based` (shared inbox such as `info@`), `free_mailbox` (personal provider), `disposable`, `relay`, `security_gateway`, `vendor_disagreement`. Surface them so the user can apply their own send policy (for example, skip `disposable`, route `role_based` to an account owner).
- `result.mx_provider` names the mailbox host (for example `google`, `microsoft`); `result.checked_at` is when the check ran.
- `next_steps` suggests a retry only when another path can change the answer: `balance` after a `speed` `unknown`, `coverage` after a below-floor withhold. A `catch_all`, a disagreement or a ceiling refusal gets no retry.

## Find, then verify

When the user wants extra assurance on an address `person-email` found:

1. Read the find first. `finders_agree` or `verified_by_second_vendor` (confidence `high`) already means two independent sources agreed — a second verify adds little.
2. On a `medium` / `single_source` find (typical of `speed`), or before a send well after the find (finds are cached 30 days; verify is never cached), call `POST /v1/email/verify` with `routing.path: accuracy` on `result.email`.
3. Send only when both say yes: find `found` **and** verify `valid`. A verify `invalid` overrides the find. A verify `catch_all` means the find cannot be proven — apply the catch-all policy.
4. The two calls bill separately (find 1.5–5, verify 0.5–1.5); tell the user before running the chain on a list.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. **Bulk:** before a list run, state the row count, the path and the 0.5–1.5-credit range per delivered answer; ask once.
3. Send `POST /v1/email/verify` with `email` and the chosen `routing.path`.
4. Render the verdict from `answer.outcome` / `answer.reason_code`, `es_decision`, `answer.confidence`, `result.source` and `result.flags`.
5. **Clay:** one HTTP column, email in. Map `result.status` out, branch on it, and surface `result.flags` as a second column.
6. Business answers stay HTTP 200. Relay these `400` codes verbatim: `validation_failed` (`email_required` | `email_too_long` | `min_confidence`) | `invalid_routing` | `unknown_provider` | `invalid_compliance` | `invalid_explain`.

## Errors

- `401` `unauthorized` with `detail` (`missing` | `malformed` | `mismatch`) plus a static `hint` — never echoes the key.
- `403` `scope_denied`.
- `429` `rate_limit_exceeded` | `tenant_budget_exhausted` | `key_budget_exhausted` | `max_credits_reached` with `Retry-After`.
- `451` `subject_suppressed` (0 credits; do not retry).
- `409` idempotency family, and `503` `store_unavailable` (retryable, same key).

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · input (email) · decision (status rendered).

### Shape

````markdown
## Email verify — <valid | invalid | catch-all | unknown | withheld | suppressed | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Input     <bar>  <✓|✗|·> <email | missing email>
Decision  <bar>  <✓|✗|·> <valid — <path> | invalid — <local|vendor> | catch_all | unknown — <reason_code> | below_min_confidence | 451 subject_suppressed | unverified>
```

### Mailbox
`<result.email>`

- <✓ valid · <confidence> · <source> | ✗ invalid — <local check | vendor> · will bounce | ✗ catch_all — domain accepts every address | ✗ unknown — <reason_code> | ✗ below_min_confidence — <confidence> withheld under the <floor> floor | ✗ 451 subject_suppressed — do not contact | · UNVERIFIED — <reason>>
- <· flags: <role_based | free_mailbox | disposable | relay | security_gateway | vendor_disagreement — do not trust either check>>
- <· mailbox host: <mx_provider>>
- <· credits: <spent | 0>>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
