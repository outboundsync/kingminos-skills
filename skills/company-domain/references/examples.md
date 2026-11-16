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

- ✓ company_domain `outboundsync.com` — meets confidence floor
- · corrected_via redirect · account_primary_domain `outboundsync.com`
- · additional_domains (2) — write-safe aliases (ownership-proven hosts)

### Next
1. Stamp `Domain__c` with `outboundsync.com`; fill the name from `result.company_name` when the field is blank.

## Cross-domain redirect (moved brand)

## Domain — corrected

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ domain
Decision  ████████████████████  ✓ es_decision hit — write-safe
```

### Stamp
`snowplowanalytics.com → snowplow.io (redirect)`

- ✓ company_domain `snowplow.io` — meets confidence floor
- · input_domain `snowplowanalytics.com` · corrected_via redirect
- · additional_domains (1) — `snowplow.io` (redirect proof) · additional_domains_csv `snowplow.io`

### Next
1. Keep `Domain__c` as `snowplowanalytics.com` (entered primary); write `Secondary_Domains__c` from `additional_domains_csv` (`snowplow.io`).

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
