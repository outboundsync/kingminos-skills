# Auth — example outputs

Illustrative only (`example.com`). Never a real key.

## Passing

## Authentication ready

```text
Overall        ████████████████████  3/3 · ready

Key            ████████████████████  ✓ ready
Bearer         ████████████████████  ✓ ready
Capabilities   ████████████████████  ✓ ready
```

### Access
`https://api.kingminos.com · Bearer`

- ✓ Key present in KINGMINOS_API_KEY
- ✓ Bearer accepted
- ✓ Catalog readable — company.resolve, person.verify_employment, company.domain, company.hierarchy, company.b2b_social
- · Health — kingminos-api-prod (unauthenticated)

## Failing — missing key

## Authentication needs a key

```text
Overall        ░░░░░░░░░░░░░░░░░░░░  0/3 · not ready

Key            ░░░░░░░░░░░░░░░░░░░░  ✗ missing
Bearer         ░░░░░░░░░░░░░░░░░░░░  ✗ missing
Capabilities   ░░░░░░░░░░░░░░░░░░░░  ✗ 0/1
```

### Access
`https://api.kingminos.com · Bearer`

- ✗ KINGMINOS_API_KEY is unset
- ✗ 401 missing — No Authorization header. SFDC Custom auth does not emit Auth Parameters as HTTP headers — add a Custom Header
- ✗ Catalog not called — no Bearer token
- · Health — kingminos-api-prod (unauthenticated)

### Next
1. Mint a `km_` token at https://app.kingminos.com (workspace owner → tokens; shown once) and export it
   `export KINGMINOS_API_KEY=...`
2. On SFDC, add External Credential Custom Header `Authorization` (Allow Formulas ON if needed)

## Failing — malformed Bearer

## Authentication rejected

```text
Overall        ███████░░░░░░░░░░░░░  1/3 · not ready

Key            ████████████████████  ✓ ready
Bearer         ░░░░░░░░░░░░░░░░░░░░  ✗ malformed
Capabilities   ░░░░░░░░░░░░░░░░░░░░  ✗ 0/1
```

### Access
`https://api.kingminos.com · Bearer`

- ✓ Key present in KINGMINOS_API_KEY
- ✗ 401 malformed — not Bearer \<token\>
- ✗ Catalog unread — fix the header first
- · Health — kingminos-api-prod (unauthenticated)

### Next
1. Send `Authorization: Bearer $KINGMINOS_API_KEY` (the word Bearer, then a space, then the token)

## UNVERIFIED

## Authentication unverified

```text
Overall        ███████░░░░░░░░░░░░░  1/3 · unverified

Key            ████████████████████  ✓ ready
Bearer         ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
Capabilities   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Access
`https://api.kingminos.com · Bearer`

- ✓ Key present in KINGMINOS_API_KEY
- · UNVERIFIED — 503 store_unavailable
- · UNVERIFIED — capabilities not confirmed
- · Health — kingminos-api-prod (unauthenticated)

### Next
1. Retry `GET /v1/capabilities` after the 503 clears (same Bearer header)
