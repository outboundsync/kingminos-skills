# company-b2b-social — example outputs

Illustrative only (`example.com`). Never a real customer or key.

## Passing — hit with confirmed URL

## Company B2B social — hit

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo789 · path balance · es_decision hit`

- ✓ outcome — hit · exact_one
- ✓ LinkedIn company page — `https://www.linkedin.com/company/acme-example`
- · verification — confirmed · serp_title_snippet
- · unverified candidates — 0
- · credits spent 1 · providers websearch, aiark

## Passing — no_decision

## Company B2B social — no decision

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo790 · path speed · es_decision miss`

- · outcome — no_decision · zero_hits
- · linkedin_url — null
- · verification — rejected · serp_no_match
- · unverified candidates — 1
- · credits spent 0 · providers websearch

## Failing — name-only input

## Company B2B social — no decision

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ░░░░░░░░░░░░░░░░░░░░  ✗ name-only
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · not called
```

### Answer
`— · path balance · es_decision —`

- ✗ input — name-only without domain/website/email (`400 name_only_unsupported`)

### Next
1. Retry with `domain`, `website`, or `email` on the same registrable company

## UNVERIFIED

## Company B2B social — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Answer
`— · path balance · es_decision —`

- · UNVERIFIED — 503 store_unavailable

### Next
1. Retry the same POST with the same `Idempotency-Key` once D1 is healthy — do not invent a LinkedIn URL
