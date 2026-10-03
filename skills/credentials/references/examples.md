# credentials — example outputs

Illustrative only. Never a real key, client secret, or customer.

## Passing — policy only

## Credentials — ready

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ LeadMagic house-key
BYOK      ████████████████████  ✓ ready
```

### House
`LeadMagic · house-key`

- ✓ LeadMagic is the only house-key vendor — no tenant key required
- · Tenant PUT /v1/credentials/leadmagic is optional and never echoed

### BYOK
`none requested`

- ✓ no BYOK vendor requested
- · Findymail, ZoomInfo, Wiza, AIArk, BuiltWith are BYOK
- · websearch is house-only (byok_not_supported)

## Failing — ZoomInfo BYOK missing

## Credentials — BYOK required

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ LeadMagic house-key
BYOK      ░░░░░░░░░░░░░░░░░░░░  ✗ missing zoominfo
```

### House
`LeadMagic · house-key`

- ✓ LeadMagic is the only house-key vendor — no tenant key required
- · Tenant PUT /v1/credentials/leadmagic is optional and never echoed

### BYOK
`zoominfo`

- ✗ zoominfo credentials required
- · Findymail, ZoomInfo, Wiza, AIArk, BuiltWith are BYOK
- · websearch is house-only (byok_not_supported)

### Next
1. Confirm this plan, then send the ZoomInfo OAuth pair (the response will not echo the secret)
   `PUT /v1/credentials/zoominfo` with `{ "clientId", "clientSecret" }`

## UNVERIFIED

## Credentials — unverified

```text
Overall   █████████████░░░░░░░  2/3 · unverified

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ LeadMagic house-key
BYOK      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### House
`LeadMagic · house-key`

- ✓ LeadMagic is the only house-key vendor — no tenant key required
- · Tenant PUT /v1/credentials/leadmagic is optional and never echoed

### BYOK
`zoominfo`

- · UNVERIFIED — 500 credentials_kek_missing

### Next
1. Ask an operator to set CREDENTIALS_KEK on kingminos-api-prod — do not retry with the raw vendor secret in chat
