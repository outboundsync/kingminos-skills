# Company domain examples

Rendered in the fixed output shape; every business miss stays `UNVERIFIED`/verdict text, never an empty result.

## Write-safe hit

## Domain — verified

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ domain
Decision  ████████████████████  ✓ es_decision hit — write-safe
```

### Stamp
`outboundsync.com → outboundsync.com`

- ✓ company_domain `outboundsync.com` — safe_to_write true
- · corrected_via redirect · account_primary_domain `outboundsync.com`
- · additional_domains (2) — ownership-proven only

### Next
1. Stamp `Domain__c` with `outboundsync.com`; fill the name from `result.company_name` when the field is blank.

## Rejected input

## Domain — rejected

```text
Overall   ███████░░░░░░░░░░░░░  1/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ██████████░░░░░░░░░░  ✗ reject — do not write
```

### Stamp
`personal_mailbox`

- ✗ rejected: personal_mailbox — do not write the input
- · discovered_domain `acme.com` — half-trusted side column, review before use

### Next
1. Do not write `Domain__c`; if `discovered_domain` is shown, hold it for review.
