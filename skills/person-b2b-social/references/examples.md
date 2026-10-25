# Person B2B social examples

Illustrative only (`example.com`). Never a real key or a real person's profile.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/person/b2b-social \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "anna@example.com", "first_name": "Anna", "last_name": "Schmidt", "routing": {"path": "accuracy"}}'
```

Trimmed response (HTTP 200):

```json
{
  "ok": true,
  "schema_version": "2",
  "capability": "person.b2b_social",
  "es_decision": "hit",
  "answer": {
    "outcome": "found",
    "reason_code": "exact_one",
    "es_decision": "hit",
    "confidence": "high"
  },
  "result": {
    "status": "found",
    "linkedin_url": "https://www.linkedin.com/in/example",
    "linkedin_slug": "example",
    "source": "vendor_email",
    "candidates": [
      { "linkedin_url": "https://www.linkedin.com/in/example", "agrees": true },
      { "linkedin_url": "https://www.linkedin.com/in/example", "agrees": true }
    ],
    "confidence": "high",
    "flags": null,
    "person": {
      "email": "anna@example.com",
      "first_name": "Anna",
      "last_name": "Schmidt",
      "linkedin_url": "https://www.linkedin.com/in/example"
    }
  },
  "usage": {
    "credits": { "spent": 5 },
    "cached": false
  }
}
```

Locale hosts such as `de.linkedin.com` come back canonicalized to `www.linkedin.com`.

Clay HTTP column: map `result.linkedin_url`. Write it only when `answer.outcome` is `found` and `answer.confidence` meets the user's CRM floor.

## Cost by path

| Path | Credits on a hit | Default write floor | Miss / mismatch / withhold / timeout |
| --- | --- | --- | --- |
| `speed` | 2 | `low` | 0 |
| `balance` (default) | 3 | `medium` | 0 |
| `accuracy` | 5 | `high` | 0 |

`coverage` is not a path for this capability (`400 invalid_routing`).

## LinkedIn profile — found

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email + name
Decision  ████████████████████  ✓ es_decision hit — accuracy
```

### Person
`anna@example.com`

- ✓ profile `https://www.linkedin.com/in/example` · high · meets write floor
- · sources: 2 of 2 candidates agree
- · credits: 5

### Next
1. Stamp the profile URL on the CRM record.

## Person mismatch

## LinkedIn profile — person mismatch

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email + linkedin_url
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ person_mismatch
```

### Person
`anna@example.com`

- ✗ person_mismatch — profile rejected
- · credits: 0

### Next
1. The email resolves to a different profile than the `linkedin_url` on file. Check which one is current before you overwrite either.

## Withheld below the floor

## LinkedIn profile — withheld

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ below_min_confidence
```

### Person
`anna@example.com`

- ✗ below_min_confidence — low withheld under the high floor
- · sources: 1 of 2 candidates agree
- · flags: conflicting_profiles — do not write
- · credits: 0

### Next
1. Review `result.candidates` by hand, or retry with `first_name` / `last_name` so the wrong profile is rejected.

## UNVERIFIED

## LinkedIn profile — unverified

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
1. Retry the same POST with the same `Idempotency-Key`; do not guess a profile URL from the name.
