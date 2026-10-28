# Email verify examples

Illustrative only (`example.com`). Never a real key or a real person's address.

## Request and response

```bash
curl -sS https://api.kingminos.com/v1/email/verify \
  -H "Authorization: Bearer $KINGMINOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "anna@example.com", "routing": {"path": "accuracy"}}'
```

Trimmed response (HTTP 200; `result.candidates` omitted):

```json
{
  "ok": true,
  "schema_version": "2",
  "capability": "email.verify",
  "es_decision": "hit",
  "answer": {
    "outcome": "valid",
    "es_decision": "hit",
    "confidence": "high"
  },
  "result": {
    "status": "valid",
    "email": "anna@example.com",
    "source": "vendor",
    "confidence": "high",
    "flags": [],
    "mx_provider": "google",
    "checked_at": "2026-10-28T15:04:05Z"
  },
  "usage": {
    "credits": { "spent": 1.5 },
    "cached": false
  }
}
```

Clay HTTP column: map `result.status` and `result.flags`. Send on `valid`; drop `invalid`; route `catch_all` and `unknown` by the user's policy.

## Cost

| Answer | Credits |
| --- | --- |
| Delivered vendor `valid` / `invalid` | 0.5–1.5 by path (`speed` cheapest, `accuracy` / `coverage` most); 0.1 on your own vendor key |
| Local `invalid` (syntax, no such domain, no mail host) | 0 |
| `catch_all`, `unknown`, below-floor withhold, timeout, dry run | 0 |
| `451 subject_suppressed` | 0 |

## Email verify — valid

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ████████████████████  ✓ valid — accuracy
```

### Mailbox
`anna@example.com`

- ✓ valid · high · vendor
- · mailbox host: google
- · credits: 1.5

## Email verify — invalid (local)

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ invalid — local
```

### Mailbox
`anna@example.invalid`

- ✗ invalid — local check (reserved domain) · will bounce
- · credits: 0

### Next
1. Remove the address from the send; do not retry it.

## Email verify — catch-all

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ catch_all
```

### Mailbox
`anna@example.com`

- ✗ catch_all — domain accepts every address
- · flags: security_gateway
- · mailbox host: microsoft
- · credits: 0

### Next
1. Apply your catch-all policy (send at low volume, or hold); a retry on another path will not change this answer.

## Email verify — unknown (checks disagree)

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ unknown — sources_disagree
```

### Mailbox
`anna@example.com`

- ✗ unknown — sources_disagree · low
- · flags: vendor_disagreement — do not trust either check
- · credits: 0

### Next
1. Hold the address out of this send; re-check it later rather than guessing.

## Email verify — withheld

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ below_min_confidence
```

### Mailbox
`anna@example.com`

- ✗ below_min_confidence — medium withheld under the high floor
- · flags: role_based
- · credits: 0

### Next
1. Retry with `routing.path: coverage` (one conclusive check is enough), or accept `medium` with `min_confidence: medium`.

## Email verify — suppressed

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ░░░░░░░░░░░░░░░░░░░░  ✗ 451 subject_suppressed
```

### Mailbox
`anna@example.com`

- ✗ 451 subject_suppressed — do not contact
- · credits: 0

### Next
1. Suppress this address in your CRM and sequencer; do not retry.

## Email verify — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Mailbox
`anna@example.com`

- · UNVERIFIED — 503 store_unavailable

### Next
1. Retry the same POST with the same `Idempotency-Key`; do not treat the address as valid or invalid.
