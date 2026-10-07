# credentials — example outputs

Illustrative only. Never a real key, client secret, or customer.

## Passing — catalog from GET /v1/credentials

## Credentials — ready

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ LeadMagic managed
BYOK      ████████████████████  ✓ ready
```

### House
`LeadMagic · managed`

- ✓ leadmagic managed — house-key by default; tenant key optional
- · mask — null

### BYOK
`catalog`

- ✓ zoominfo set
- · findymail managed — house-key
- · wiza managed — house-key
- · aiark managed — house-key
- · builtwith unset
- · ZoomInfo, BuiltWith, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, and Enrich-CRM are BYOK
- · LeadMagic, Wiza, Findymail, and AIArk are house-key (tenant Your Keys optional)
- · websearch is house-only (byok_not_supported)
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

## Failing — ZoomInfo BYOK unset

## Credentials — BYOK required

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ LeadMagic managed
BYOK      ░░░░░░░░░░░░░░░░░░░░  ✗ missing zoominfo
```

### House
`LeadMagic · managed`

- ✓ leadmagic managed — house-key by default; tenant key optional
- · mask — null

### BYOK
`zoominfo`

- ✗ zoominfo unset
- · ZoomInfo, BuiltWith, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, and Enrich-CRM are BYOK
- · websearch is house-only (byok_not_supported)
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

### Next
1. Store the ZoomInfo pair in the KingMinos app (Vendor keys / Your Keys). Never paste the secret into chat
   `https://app.kingminos.com`

## Failing — vendor rejected the key

## Credentials — BYOK required

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ LeadMagic managed
BYOK      ░░░░░░░░░░░░░░░░░░░░  ✗ missing zoominfo
```

### House
`LeadMagic · managed`

- ✓ leadmagic managed — house-key by default; tenant key optional
- · mask — null

### BYOK
`zoominfo`

- ✗ zoominfo credential_rejected — vendor rejected the key; nothing was stored
- · ZoomInfo, BuiltWith, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, and Enrich-CRM are BYOK
- · websearch is house-only (byok_not_supported)
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

### Next
1. Re-check the ZoomInfo pair with the vendor, then store it again in the KingMinos app. Never paste the secret into chat
   `https://app.kingminos.com`

## UNVERIFIED

## Credentials — unverified

```text
Overall   ███████░░░░░░░░░░░░░  1/3 · unverified

Auth      ████████████████████  ✓ ready
House     ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
BYOK      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified
```

### House
`LeadMagic · unverified`

- · UNVERIFIED — timeout

### BYOK
`catalog`

- · UNVERIFIED — GET /v1/credentials timeout

### Next
1. Retry GET /v1/credentials when api.kingminos.com answers — do not ask for a vendor secret in chat
