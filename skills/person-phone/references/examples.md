# Person phone examples

Illustrative only (`example.com`). Never a real key or a real person's number.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/person/phone \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "anna@example.com", "phone_types": ["mobile"], "max_results": 3}'
```

Trimmed response (HTTP 200):

```json
{
  "ok": true,
  "schema_version": "2",
  "capability": "person.phone",
  "es_decision": "hit",
  "answer": {
    "outcome": "hit",
    "reason_code": "exact_one",
    "es_decision": "hit",
    "confidence": "high",
    "safe_to_write": { "best_phone": true }
  },
  "result": {
    "person": {
      "email": "anna@example.com",
      "first_name": "Anna",
      "last_name": "Schmidt",
      "linkedin_url": "https://www.linkedin.com/in/example"
    },
    "best_phone": { "number": "+15555550123", "type": "mobile", "source": "wiza" },
    "phones": [
      { "number": "+15555550123", "type": "mobile", "source": "wiza" }
    ],
    "flags": null
  },
  "usage": {
    "credits": { "cap": 38, "spent": 38, "by_provider": { "wiza": 38 } },
    "cached": false
  }
}
```

Clay HTTP column: map `result.best_phone.number` (and `result.best_phone.type`); write only when `answer.safe_to_write.best_phone` is true.

## Found (hit)

## Phone — found

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ████████████████████  ✓ es_decision hit — mobile
```

### Person
`anna@example.com`

- ✓ best_phone `+15555550123` — mobile via wiza · safe_to_write
- · phones: `+15555550123 mobile`
- · credits: 38

### Next
1. Write `result.best_phone.number` to the dialer column.

## Not found (zero_hits)

## Phone — not found

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ linkedin_url
Decision  ██████████░░░░░░░░░░  ✗ es_decision miss — no_decision / zero_hits
```

### Person
`https://www.linkedin.com/in/example`

- ✗ zero_hits — no mobile number found
- · credits: 0

### Next
1. Keep the row in the email-only sequence; retry after the 30-day cache expires or with `skip_cache`.
