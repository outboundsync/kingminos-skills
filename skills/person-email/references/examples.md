# Person email examples

Illustrative only (`example.com`). Never a real key or a real person's address.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/person/email \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Anna", "last_name": "Example", "company_domain": "example.com", "linkedin_url": "https://www.linkedin.com/in/example", "routing": {"path": "coverage"}}'
```

Trimmed response (HTTP 200; `result.candidates` omitted):

```json
{
  "ok": true,
  "schema_version": "2",
  "capability": "person.email",
  "es_decision": "hit",
  "answer": {
    "outcome": "found",
    "es_decision": "hit",
    "confidence": "high"
  },
  "result": {
    "status": "found",
    "email": "anna.example@example.com",
    "email_status": "valid",
    "route": "name",
    "confidence": "high",
    "flags": ["finders_agree"],
    "person": {
      "first_name": "Anna",
      "last_name": "Example",
      "linkedin_url": "https://www.linkedin.com/in/example"
    }
  },
  "usage": {
    "credits": { "spent": 5 },
    "cached": false
  }
}
```

Clay HTTP column: `first_name`, `last_name`, `company_domain` (plus `linkedin_url` when you have it) in; map `result.email` out. Write it only when `answer.outcome` is `found` and `answer.confidence` meets the user's CRM floor.

## Cost

| Answer | Credits |
| --- | --- |
| Delivered `found` | 2–5 by path (`speed` cheapest, `coverage` most); 0.1 on your own vendor key |
| `not_found`, `conflict`, `catch_all`, below-floor withhold, suppressed address, timeout, dry run | 0 |
| Cached replay | 0 |
| `451 subject_suppressed` | 0 |

## Work email — found

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ name + domain + linkedin_url
Decision  ████████████████████  ✓ es_decision hit — coverage
```

### Person
`Anna Example · example.com`

- ✓ email `anna.example@example.com` · high · meets write floor
- · route: name
- · flags: finders_agree
- · credits: 5

### Next
1. Stamp the email on the CRM record.

## Work email — found, single source (find, then verify)

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ name + domain
Decision  ████████████████████  ✓ es_decision hit — speed
```

### Person
`Anna Example · example.com`

- ✓ email `anna.example@example.com` · medium · meets write floor
- · route: name
- · flags: single_source — verify before a send
- · credits: 2

### Next
1. For extra assurance, run `email-verify` on `anna.example@example.com` with `routing.path: accuracy` and send only on `valid`.

## Work email — conflict

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ name + domain
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ conflict
```

### Person
`Anna Example · example.com`

- ✗ conflict — sources returned different addresses
- · credits: 0

### Next
1. Leave the field blank; confirm which address is current by hand before writing either.

## Work email — catch-all

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ name + domain
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ catch_all
```

### Person
`Anna Example · example.com`

- ✗ catch_all — domain accepts every address
- · credits: 0

### Next
1. Leave the field blank; no source can prove an address on this domain.

## Work email — withheld

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ name + domain
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ below_min_confidence
```

### Person
`Anna Example · example.com`

- ✗ below_min_confidence — medium withheld under the high floor
- · flags: single_source · person_mismatch — another person rejected
- · credits: 0

### Next
1. Retry with a `linkedin_url` on `coverage` so a second source can agree, or accept `medium` with `min_confidence: medium`.

## Work email — insufficient input

```text
Overall   ███████░░░░░░░░░░░░░  1/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ░░░░░░░░░░░░░░░░░░░░  ✗ insufficient_input
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ not called
```

### Person
`Anna Example`

- ✗ 400 validation_failed — insufficient_input (a name needs `company_domain`)
- · credits: 0

### Next
1. Add the company domain (run `company-domain` first if you only have the account name), or send a `linkedin_url`.

## Work email — suppressed

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ linkedin_url
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ 451 subject_suppressed
```

### Person
`https://www.linkedin.com/in/example`

- ✗ 451 subject_suppressed — do not contact
- · credits: 0

### Next
1. Suppress this person in your CRM and sequencer; do not retry.

## Work email — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ name + domain
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Person
`Anna Example · example.com`

- · UNVERIFIED — 503 store_unavailable

### Next
1. Retry the same POST with the same `Idempotency-Key`; never guess an address from the name and domain.
