# Person phone examples

Illustrative only (`example.com`). Never a real key or a real person's number.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/person/phone \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "anna@example.com", "phone_types": ["mobile"], "max_results": 3, "format": "national"}'
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
    "confidence": "high"
  },
  "result": {
    "person": {
      "email": "anna@example.com",
      "first_name": "Anna",
      "last_name": "Schmidt",
      "linkedin_url": "https://www.linkedin.com/in/example"
    },
    "best_phone": {
      "number": "(415) 555-2672",
      "e164": "+14155552672",
      "formats": {
        "e164": "+14155552672",
        "international": "+1 415 555 2672",
        "national": "(415) 555-2672",
        "digits": "14155552672",
        "digits_national": "4155552672"
      },
      "country_code": "US",
      "calling_code": "1",
      "type": "mobile",
      "line_type": "fixed_line_or_mobile",
      "source": "wiza",
      "sources": ["wiza"],
      "confidence": "high",
      "flags": []
    },
    "phones": [
      {
        "number": "(415) 555-2672",
        "e164": "+14155552672",
        "formats": {
          "e164": "+14155552672",
          "international": "+1 415 555 2672",
          "national": "(415) 555-2672",
          "digits": "14155552672",
          "digits_national": "4155552672"
        },
        "country_code": "US",
        "calling_code": "1",
        "type": "mobile",
        "line_type": "fixed_line_or_mobile",
        "source": "wiza",
        "sources": ["wiza"],
        "confidence": "high",
        "flags": []
      }
    ],
    "flags": null
  },
  "usage": {
    "credits": { "cap": 38, "spent": 38, "by_provider": { "wiza": 38 } },
    "cached": false
  }
}
```

Clay HTTP column: map `result.best_phone.number` (in the requested `format`; `result.best_phone.e164` is always E.164) and `result.best_phone.type` / `confidence`; write when non-blank and `answer.confidence` meets the user's CRM floor.

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

- ✓ best_phone `+14155552672` — mobile via wiza · high · meets write floor
- · phones: `+14155552672 mobile`
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
