# credentials — example outputs

Illustrative only. Never a real key, client secret, or customer.

## Passing — catalog from GET /v1/credentials

## Credentials — ready

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ house-key ready
BYOK      ████████████████████  ✓ ready
```

### House
`house_managed: true · 2 vendors`

- ✓ house-key vendors managed or set — tenant key optional
- · mask — null

### BYOK
`catalog`

- ✓ zoominfo set
- · builtwith unset
- · BYOK vendors are the catalog items with `house_managed: false`; house-key vendors (`house_managed: true`) need no tenant key
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

## Failing — ZoomInfo BYOK unset

## Credentials — BYOK required

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ house-key ready
BYOK      ░░░░░░░░░░░░░░░░░░░░  ✗ missing zoominfo
```

### House
`house_managed: true · 2 vendors`

- ✓ house-key vendors managed or set — tenant key optional
- · mask — null

### BYOK
`zoominfo`

- ✗ zoominfo unset
- · BYOK vendors are the catalog items with `house_managed: false`; house-key vendors (`house_managed: true`) need no tenant key
- · Store or rotate secrets at https://app.kingminos.com (Vendor keys / Your Keys). Never paste a vendor secret into chat.

### Next
1. Store the ZoomInfo pair in the KingMinos app (Vendor keys / Your Keys). Never paste the secret into chat
   `https://app.kingminos.com`

## Failing — vendor rejected the key

## Credentials — BYOK required

```text
Overall   █████████████░░░░░░░  2/3 · not ready

Auth      ████████████████████  ✓ ready
House     ████████████████████  ✓ house-key ready
BYOK      ░░░░░░░░░░░░░░░░░░░░  ✗ missing zoominfo
```

### House
`house_managed: true · 2 vendors`

- ✓ house-key vendors managed or set — tenant key optional
- · mask — null

### BYOK
`zoominfo`

- ✗ zoominfo credential_rejected — vendor rejected the key; nothing was stored
- · BYOK vendors are the catalog items with `house_managed: false`; house-key vendors (`house_managed: true`) need no tenant key
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
`house_managed: true · unverified`

- · UNVERIFIED — timeout

### BYOK
`catalog`

- · UNVERIFIED — GET /v1/credentials timeout

### Next
1. Retry GET /v1/credentials when api.kingminos.com answers — do not ask for a vendor secret in chat
