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
`https://api.kingminos.com · Bearer · 15 resource operations`

- ✓ Key present in KINGMINOS_API_KEY
- ✓ Catalog readable — get_capabilities
- · Inventory: get_providers · get_capabilities · company_hierarchy · company_b2b_social · company_icon · company_description · company_domain · company_resolve · person_verify_employment · person_language · get_run · list_credentials · put_credentials · delete_credentials · delete_subject
- · company_icon — resolve site/brand sources, re-host 256x256 PNG at `https://logos.kingminos.com/i/{sha256}.png` (allowlist once for CRM image CSP)
- · Hand off: company-resolve

## Failing — missing key

## API needs a key

```text
Overall     ░░░░░░░░░░░░░░░░░░░░  0/2 · not ready

Key         ░░░░░░░░░░░░░░░░░░░░  ✗ missing
Catalog     ░░░░░░░░░░░░░░░░░░░░  ✗ missing
```

### Access
`https://api.kingminos.com · Bearer · 15 resource operations`

- ✗ KINGMINOS_API_KEY is unset
- ✗ Catalog not called — no Bearer token
- · Inventory: get_providers · get_capabilities · company_hierarchy · company_b2b_social · company_icon · company_description · company_domain · company_resolve · person_verify_employment · person_language · get_run · list_credentials · put_credentials · delete_credentials · delete_subject
- · Hand off: auth

### Next
1. Mint a `km_` token at https://app.kingminos.com (workspace owner → tokens; shown once) and export it
   `export KINGMINOS_API_KEY=...`

## UNVERIFIED

## API unverified

```text
Overall     ██████████░░░░░░░░░░  1/2 · unverified

Key         ████████████████████  ✓ ready
Catalog     ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### Access
`https://api.kingminos.com · Bearer · 15 resource operations`

- ✓ Key present in KINGMINOS_API_KEY
- · UNVERIFIED — timeout
- · Inventory: get_providers · get_capabilities · company_hierarchy · company_b2b_social · company_icon · company_description · company_domain · company_resolve · person_verify_employment · person_language · get_run · list_credentials · put_credentials · delete_credentials · delete_subject
- · Hand off: none — REST for a live tool with no dedicated skill

### Next
1. Retry GET /v1/capabilities when api.kingminos.com answers
