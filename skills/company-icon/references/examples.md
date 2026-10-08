# company-icon — example outputs

Illustrative only (`example.com`). Never a real customer or key.

## Passing — hit with icon_url

## Company icon — hit

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo801 · es_decision hit`

- ✓ outcome — hit · icon_stored
- ✓ icon_url — `https://logos.kingminos.com/i/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.png`
- · icon_source_url — `https://www.example.com/favicon.ico`
- · safe_to_write.icon_url — true
- · credits spent 1 · providers icon-pipeline

## Passing — no_decision

## Company icon — no decision

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo802 · es_decision miss`

- · outcome — no_decision · no_icon_candidate
- · icon_url — null
- · icon_source_url — null
- · safe_to_write.icon_url — false
- · credits spent 1 · providers icon-pipeline

## Failing — name-only input

## Company icon — no decision

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ░░░░░░░░░░░░░░░░░░░░  ✗ name-only
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · not called
```

### Answer
`— · es_decision —`

- ✗ input — name-only without domain/website/email (`400 name_only_unsupported`)

### Next
1. Retry with `domain`, `website`, or `email` on the same registrable company

## UNVERIFIED

## Company icon — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Answer
`— · es_decision —`

- · UNVERIFIED — 503 store_unavailable

### Next
1. Retry the same POST with the same `Idempotency-Key` once the credential store is healthy — do not invent an icon_url
