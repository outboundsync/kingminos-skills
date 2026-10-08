# company-description — example outputs

Illustrative only (`example.com`). Never a real customer or key.

## Passing — hit safe for CRM

## Company description — hit

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo901 · path balance · es_decision hit · confidence high`

- ✓ outcome — hit · exact_one
- ✓ description — OutboundSync syncs outbound email and sequencer activity into CRMs such as Salesforce and HubSpot.
- · flags — hype false · first_person false · tagline false · same_as_speed false · truncated false · cta false · grammar false
- · identity — jev 0.96
- ✓ safe_to_write.description — true
- · credits spent 0 · providers aiark

## Passing — hit, not safe to write (cta)

## Company description — hit

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo902 · path speed · es_decision hit · confidence low`

- ✓ outcome — hit · exact_one
- ✓ description — Example makes outbound easy for revenue teams. Start your free trial today!
- · flags — hype false · first_person false · tagline false · same_as_speed false · truncated false · cta true · grammar false
- · identity — jev 0.95
- · safe_to_write.description — false (cta forces low confidence)
- · credits spent 0 · providers aiark

### Next
1. Re-run with `path` `balance` or `accuracy`; do not stamp the CRM Description field from this text

## Passing — no_decision

## Company description — no decision

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo903 · path balance · es_decision miss · confidence null`

- · outcome — no_decision · no_match
- · description — null
- · flags — null
- · identity — null
- · safe_to_write.description — false
- · credits spent 0 · providers aiark

## Failing — name-only input

## Company description — no decision

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ░░░░░░░░░░░░░░░░░░░░  ✗ name-only
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · not called
```

### Answer
`— · es_decision — · confidence —`

- ✗ input — name-only without domain/website/email (`400 name_only_unsupported`)

### Next
1. Retry with `domain`, `website`, or `email` on the same registrable company

## UNVERIFIED

## Company description — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Answer
`— · es_decision — · confidence —`

- · UNVERIFIED — 503 store_unavailable

### Next
1. Retry the same POST with the same `Idempotency-Key` once the credential store is healthy — do not invent description text
