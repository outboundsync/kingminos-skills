# Person language examples

## English (hit)

## Language — english

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ email
Decision  ████████████████████  ✓ es_decision hit — english
```

### Person
`jane@acme-corp.com`

- ✓ english `yes` — recommended_language `en`
- · local_language `de` — top non-English; German ads can still work

### Next
1. Sequence in English; optionally test a German variant using `local_language`.

## Ambiguous (low-only evidence)

## Language — unconfirmed

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
Input     ████████████████████  ✓ linkedin_url
Decision  ██████████░░░░░░░░░░  ✗ es_decision ambiguous — low-only evidence
```

### Person
`https://www.linkedin.com/in/jane-doe`

- ✗ english `likely` — only low-confidence signals; no headline recommendation
- · languages: `fr 0.45 — location_country` (multilingual country keeps several candidates)

### Next
1. Sequence in English (safe default); revisit `languages` before spending on localized creative.
