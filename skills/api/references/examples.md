# API — example outputs

Illustrative only (`example.com`). Never a real key.

## Passing

## API ready

```text
Overall     ████████████████████  2/2 · ready

Key         ████████████████████  ✓ ready
Catalog     ████████████████████  ✓ ready
```

### Access
`https://api.kingminos.com · Bearer · 10 resource operations`

- ✓ Key present in KINGMINOS_API_KEY
- ✓ Catalog readable — get_capabilities
- · Inventory: get_providers · get_capabilities · company_resolve · company_domain · company_hierarchy · person_verify_employment · get_run · put_credentials · delete_credentials · delete_subject
- · Hand off: company-resolve

## Failing — missing key

## API needs a key

```text
Overall     ░░░░░░░░░░░░░░░░░░░░  0/2 · not ready

Key         ░░░░░░░░░░░░░░░░░░░░  ✗ missing
Catalog     ░░░░░░░░░░░░░░░░░░░░  ✗ 0/1
```

### Access
`https://api.kingminos.com · Bearer · 10 resource operations`

- ✗ KINGMINOS_API_KEY is unset
- ✗ 401 missing — No Authorization header
- · Inventory: get_providers · get_capabilities · company_resolve · company_domain · company_hierarchy · person_verify_employment · get_run · put_credentials · delete_credentials · delete_subject
- · Hand off: auth

### Next
1. Set KINGMINOS_API_KEY and send `Authorization: Bearer …`

## UNVERIFIED

## API unverified

```text
Overall     ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  0/2 · unverified

Key         ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
Catalog     ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Access
`https://api.kingminos.com · Bearer · 10 resource operations`

- · UNVERIFIED — timeout
- · UNVERIFIED — timeout
- · Inventory: get_providers · get_capabilities · company_resolve · company_domain · company_hierarchy · person_verify_employment · get_run · put_credentials · delete_credentials · delete_subject
- · Hand off: none — REST for a live tool with no dedicated skill

### Next
1. Retry GET /v1/capabilities when api.kingminos.com answers
