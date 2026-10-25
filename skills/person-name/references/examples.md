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

Clay HTTP column: map `result.first_name`, `result.last_name`, `result.full_name`. Write them only when `answer.outcome` is `resolved` and `answer.confidence` meets the user's CRM floor.

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
1. Stamp `first_name` / `last_name` on the CRM record.

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
