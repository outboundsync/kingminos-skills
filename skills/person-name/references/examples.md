# Person name examples

Illustrative only (`example.com`). Never a real key or a real person's profile.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/person/name \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "anna@example.com", "linkedin_url": "https://www.linkedin.com/in/example", "routing": {"path": "accuracy"}}'
```

Trimmed response (HTTP 200):

```json
{
  "ok": true,
  "schema_version": "2",
  "capability": "person.name",
  "es_decision": "hit",
  "answer": {
    "outcome": "resolved",
    "reason_code": "exact_one",
    "es_decision": "hit",
    "confidence": "high"
  },
  "result": {
    "first_name": "Anna",
    "last_name": "Schmidt",
    "full_name": "Anna Schmidt",
    "name_source": "vendor",
    "matched_on": ["email", "linkedin_url"],
    "email_type": "work",
    "linkedin_url_normalized": "https://www.linkedin.com/in/example",
    "person": {
      "email": "anna@example.com",
      "first_name": "Anna",
      "last_name": "Schmidt",
      "linkedin_url": "https://www.linkedin.com/in/example"
    },
    "flags": null,
    "evidence": null
  },
  "usage": {
    "credits": { "spent": 3 },
    "cached": false
  }
}
```

The vendor record said `DR. ANNA SCHMIDT, PHD`; the cleaner stripped the honorific and suffix and proper-cased the rest.

Agent fields on every response (trimmed):

```json
{
  "agent_guidance": "Present options[] to the user with est_credits and wait for their choice before any follow-up call.",
  "options": [
    {
      "endpoint": "/v1/person/name",
      "path": "balance",
      "description": "More sources and checks on the same email or LinkedIn URL.",
      "est_credits": 2,
      "inputs": { "email": "anna@example.com" }
    },
    {
      "endpoint": "/v1/person/b2b-social",
      "description": "Discover a LinkedIn profile URL from the email, then retry person.name with both identifiers.",
      "est_credits": 3,
      "inputs": { "email": "anna@example.com" }
    }
  ],
  "next_steps": [
    {
      "action": "call_capability",
      "endpoint": "/v1/person/b2b-social",
      "reason": "No LinkedIn URL on the request; a profile URL may unlock a higher-confidence name.",
      "est_credits": 3,
      "inputs": { "email": "anna@example.com" }
    }
  ]
}
```

Clay HTTP column: map `result.first_name`, `result.last_name`, `result.full_name`. Write them only when `answer.outcome` is `resolved`, `answer.confidence` meets the user's CRM floor, and `result.quality_flags` is null.

## Cost by path

| Path | Credits on a hit | Default write floor | Miss / conflict / withhold / timeout |
| --- | --- | --- | --- |
| `speed` | 1 | `low` | 0 |
| `balance` (default) | 2 | `medium` | 0 |
| `accuracy` | 3 | `high` | 0 |
| `coverage` | 5 | `low` | 0 |

## Name — resolved

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email + linkedin_url
Decision  ████████████████████  ✓ es_decision hit — accuracy
```

### Person
`anna@example.com`

- ✓ name `Anna Schmidt` (first `Anna` · last `Schmidt`) · high · meets write floor
- · matched on: email + linkedin_url · email type: work
- · credits: 3

### Next
1. Stamp `first_name` / `last_name` on the CRM record when `quality_flags` is null.

## Name — not found (options and next steps)

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ zero_hits
```

### Person
`pat@example.com`

- ✗ zero_hits — no name found
- · matched on: email · email type: work
- · credits: 0

### Options
- · `/v1/person/name` · path `balance` · 2 credits — more sources on the same email
- · `/v1/person/name` · path `accuracy` · 3 credits — judge plus independent confirmation
- · `/v1/person/b2b-social` · 3 credits — find a profile URL, then retry person.name with `linkedin_url`

### Follow-ups
- · `/v1/person/b2b-social` · 3 credits — no LinkedIn URL on the request; discovery may unlock a name

### Next
1. Present the options above with credits and ask which path to run — do not default to speed or stop here.

## Name — quality_flags (do not write)

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ████████████████████  ✓ es_decision hit — balance
```

### Person
`jordan.smith.cpa@example.com`

- · name `Jordan Smith` (first `Jordan` · last `Smith`) · medium · meets write floor — **do not write** (quality flag)
- · quality_flags: credential_suffix — do not write
- · credits: 2

### Options
- · `/v1/person/name` · path `accuracy` · 3 credits — stronger confirmation before a CRM stamp

### Follow-ups
- · `/v1/person/name` · 3 credits — retry at accuracy after the user agrees

### Next
1. Show options with credits; ask whether to retry at accuracy or leave CRM names blank.

## Role address

## Name — role address

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ role_address
```

### Person
`info@example.com`

- ✗ role_address — a shared mailbox is not a person
- · matched on: email · email type: role
- · flags: role_address
- · credits: 0

### Next
1. Find a named contact at the account before you personalize; leave the name fields blank.

## Conflict

## Name — conflict

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email + linkedin_url
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ conflict
```

### Person
`anna@example.com`

- ✗ conflict — sources name different people
- · flags: conflicting_names — do not write
- · credits: 0

### Next
1. Check that the email and the LinkedIn URL belong to the same person, then retry with only the one you trust.

## Withheld below the floor

## Name — withheld

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ below_min_confidence
```

### Person
`anna@example.com`

- ✗ below_min_confidence — medium withheld under the high floor
- · matched on: email · email type: work
- · flags: single_source
- · credits: 0

### Next
1. Review the candidates in `result.evidence` by hand, or retry with a `linkedin_url` so a second source can agree.

## UNVERIFIED

## Name — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Person
`anna@example.com`

- · UNVERIFIED — 503 store_unavailable

### Next
1. Retry the same POST with the same `Idempotency-Key`; do not guess a name from the email.
