# Company hierarchy examples

## Subsidiary (hit)

## Hierarchy — subsidiary

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ domain
Decision  ████████████████████  ✓ es_decision hit — tree returned
```

### Tree
`Opel Automobile GmbH · opel.com`

- ✓ immediate_parent `Stellantis N.V.` — (no domain; join via zoominfo id)
- ✓ ultimate_parent `Stellantis N.V.` · hierarchy_depth 2
- · subsidiaries (12 of 41, truncated true) — join websites via zoominfo_company_id

### Next
1. Stamp parent names / `zoominfo_company_id` fill-if-blank; note `truncated` before quoting the subsidiary list.

## No hierarchy data (miss)

## Hierarchy — no decision

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ domain
Decision  ██████████░░░░░░░░░░  ✗ miss — no_hierarchy_data
```

### Tree
`billpay.com`

- ✗ no_decision — no_hierarchy_data
- · The search matched but ZoomInfo returned NO_MATCH — an alias gap, not an entitlement miss; alias repair belongs on company.domain

### Next
1. Run `company_domain` for the trusted stamp; retry hierarchy after the domain is confirmed.
