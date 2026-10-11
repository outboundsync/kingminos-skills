# Employment verify examples

## High confidence send

## Employment — high confidence send

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ████████████████████  ✓ es_decision hit — send
```

### Person
`Jane Doe · jane@acme-corp.com`

- ✓ employment `still_there` at `Acme Corp` — email `valid`
- · zoominfo_contact_id set — stamp only when safe_to_write (id-append, never overwrite)

### Next
1. Safe to send; keep the contact id append-only.

## High confidence block

## Employment — high confidence block

```text
Overall   ███████░░░░░░░░░░░░░  1/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ██████████░░░░░░░░░░  ✗ es_decision hit — block
```

### Person
`John Smith · john@old-employer.com`

- ✗ employment `left` — email `invalid` — do not send
- · soft_miss `left_clear`

### Next
1. Remove the contact from the sequence; re-verify after they land somewhere new.
