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

- ✓ outcome — hit · description_ok
- ✓ description — OutboundSync syncs outbound email and sequencer activity into CRMs such as Salesforce and HubSpot for reply routing and attribution.
- · flags — hype false · first_person false · tagline false · same_as_speed false
- · safe_to_write.description — true
- · stack — house site fetch → AI Ark compose (default); ZoomInfo firmographic BYOK via routing.only only
- · credits spent 1 · providers site_probe, aiark

## Passing — hit but hold for CRM (speed / hype)

## Company description — hit

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ ready
Decision  ████████████████████  ✓ ready
```

### Answer
`run_demo902 · path speed · es_decision hit · confidence medium`

- ✓ outcome — hit · homepage_text_ok
- ✓ description — We help revenue teams crush pipeline with the best outbound platform on the planet.
- · flags — hype true · first_person true · tagline false · same_as_speed false
- · safe_to_write.description — true
- · stack — house site fetch → AI Ark compose (default); ZoomInfo firmographic BYOK via routing.only only
- · credits spent 0 · providers site_probe

### Next
1. Re-run with `routing.path` `balance` or `accuracy`, or human-edit before stamping the CRM Description field

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

- · outcome — no_decision · no_usable_description
- · description — null
- · flags — hype false · first_person false · tagline false · same_as_speed false
- · safe_to_write.description — false
- · stack — house site fetch → AI Ark compose (default); ZoomInfo firmographic BYOK via routing.only only
- · credits spent 0 · providers site_probe, aiark

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
