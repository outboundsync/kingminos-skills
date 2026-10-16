# Person title examples

Illustrative only (`example.com`). Never a real key or a real person's profile.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/person/title \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "anna@example.com", "linkedin_url": "https://www.linkedin.com/in/example", "company_domain": "example.com", "routing": {"path": "accuracy"}}'
```

Trimmed response (HTTP 200):

```json
{
  "ok": true,
  "schema_version": "2",
  "capability": "person.title",
  "es_decision": "hit",
  "answer": {
    "outcome": "hit",
    "reason_code": "exact_one",
    "es_decision": "hit",
    "confidence": "high",
    "safe_to_write": { "title": true, "seniority": true, "function": true }
  },
  "result": {
    "person": {
      "email": "anna@example.com",
      "first_name": "Anna",
      "last_name": "Schmidt",
      "job_title": "VP of Sales",
      "linkedin_url": "https://www.linkedin.com/in/example"
    },
    "company": { "name": "Example", "domain": "example.com" },
    "fields": ["title", "seniority", "function"],
    "title": "VP of Sales",
    "seniority": "vp",
    "function": "sales",
    "field_sources": {
      "title": { "method": "vendor", "provider": "leadmagic" },
      "seniority": { "method": "derived", "provider": "leadmagic" },
      "function": { "method": "derived", "provider": "leadmagic" }
    },
    "answered_fields": ["title", "seniority", "function"],
    "sources": [
      { "provider": "leadmagic", "title": "VP of Sales", "agrees": true },
      { "provider": "aiark", "title": "Vice President, Sales", "agrees": true }
    ],
    "flags": null
  },
  "usage": {
    "credits": { "spent": 3 },
    "cached": false
  }
}
```

Clay HTTP column: map `result.title`, `result.seniority`, `result.function`. Write each one only when its `answer.safe_to_write.<field>` is true.

## Cost by path

| Path | Credits on a hit | Miss / partial / timeout |
| --- | --- | --- |
| `speed` | 1 | 0 |
| `balance` (default) | 2 | 0 |
| `accuracy` | 3 | 0 |
| `coverage` | 5 | 0 |

## Persona routing (seniority + function)

Request body: `{"email": "anna@example.com", "fields": ["seniority", "function"]}`. `result.title` stays null because it was not requested.

## Title — found

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ████████████████████  ✓ es_decision hit — balance
```

### Person
`anna@example.com`

- ✓ title not requested · safe_to_write
- · seniority: vp (derived)
- · function: sales (derived)
- · credits: 2

### Next
1. Route the contact to the VP-level sales sequence.

## Incomplete (fields_incomplete)

## Title — incomplete

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ linkedin_url
Decision  ██████████░░░░░░░░░░  ✗ es_decision ambiguous — fields_incomplete
```

### Person
`https://www.linkedin.com/in/example`

- ✗ fields_incomplete — no seniority
- · flags: unclassified
- · credits: 0

### Next
1. Retry on `balance` or `accuracy` so the judge can classify the title, or drop `seniority` from `fields`.

## Employer mismatch

## Title — employer mismatch

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ██████████░░░░░░░░░░  ✗ es_decision ambiguous — employer_mismatch
```

### Person
`anna@example.com`

- ✗ employer_mismatch — title is at another company
- · credits: 0

### Next
1. Run `person-verify-employment` before sending; the contact may have changed jobs.
