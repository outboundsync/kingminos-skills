# company-resolve — example outputs

Illustrative only (`example.com`). Never a real customer or key.

## Passing — stamp-safe id

## Company resolve — resolved

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo123 · path auto · es_decision hit`

- ✓ outcome — resolved · exact_one
- ✓ company_name — Acme Roofing (fill-if-blank when present, including on miss)
- ✓ stamp-safe ZoomInfo company id 123456789
- · company_domain — acmeexample.com (hygiene — never clobber)
- · credits spent 0 · providers websearch, zoominfo

## Passing — name without primary id

## Company resolve — resolved without primary id

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo456 · path auto · es_decision miss`

- · outcome — resolved_without_primary_id · exact_one
- ✓ company_name — Acme Roofing (fill-if-blank when present, including on miss)
- · do not stamp — miss / no ZoomInfo company id
- · company_domain — acmeexample.com (hygiene — never clobber)
- · credits spent 1 · providers websearch, leadmagic

### Next
1. Store a ZoomInfo Your Key if the user needs a stamp-safe company id (`credentials`)

## Failing — name-only

## Company resolve — no decision

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ░░░░░░░░░░░░░░░░░░░░  ✗ name-only
Decision  ████████████████████  ✓ no_decision
```

### Answer
`— · path auto · es_decision noop`

- ✗ outcome — no_decision · no_domain
- · company_name — null (name-only does not search)
- · do not stamp — name-only
- · company_domain — null (hygiene — never clobber)

### Next
1. Retry with `email`, `domain`, or `website` — never stamp an id from a vendor name match

## UNVERIFIED

## Company resolve — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Answer
`— · path auto · es_decision —`

- · UNVERIFIED — 503 credential_broker_unavailable

### Next
1. Retry the same POST once the broker is up — do not invent a company id
