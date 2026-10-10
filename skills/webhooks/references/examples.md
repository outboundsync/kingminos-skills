# Webhooks — rendered examples

Illustrative data only (`example.com`), never a real customer's.

## Ready (endpoint registered and proven)

## Webhooks — ready

```text
Overall   ████████████████████  3/3 · ready

Auth      ████████████████████  ✓ ready
Gate      ████████████████████  ✓ enabled
Endpoints ████████████████████  ✓ 1 active (0 dead-lettered)
```

### Endpoints
`ws_example`

- ✓ kmwhk_1a2b3c https://hooks.example.com/os all active — last delivery succeeded
- · Signing secrets are shown once at create/rotate — store them at register time
- · Reserved names (billing.*, credits.*, vendor.uptime.*, run.completed) are held, not delivered

### Events
`GET /v1/events`

- ✓ test.ping delivered true 2026-10-10T12:00:00.000Z
- · No event for a workspace×capability means no healthy→failing transition occurred

### Next
1. None — endpoint verified with test.ping; alerts flow on the next healthy→failing transition.

## Blocked (gate off)

## Webhooks — not configured

```text
Overall   ███████░░░░░░░░░░░░░  1/3 · not ready

Auth      ████████████████████  ✓ ready
Gate      ░░░░░░░░░░░░░░░░░░░░  ✗ 403 webhooks_not_enabled
Endpoints ░░░░░░░░░░░░░░░░░░░░  ✗ none registered
```

### Endpoints
`ws_example`

- ✗ 403 webhooks_not_enabled — every /v1/webhooks* and /v1/events route is gated
- · Signing secrets are shown once at create/rotate — store them at register time
- · Reserved names (billing.*, credits.*, vendor.uptime.*, run.completed) are held, not delivered

### Events
`GET /v1/events`

- · UNVERIFIED — 403 webhooks_not_enabled

### Next
1. Ask an OutboundSync admin to enable webhooks for the workspace (admin toggle, not a retry).
2. Register the endpoint after the toggle: `POST /v1/webhooks {"url":"https://hooks.example.com/os"}`.

## Unverified (auth failed)

## Webhooks — unverified

```text
Overall   ░░░░░░░░░░░░░░░░░░░░  0/3 · unverified

Auth      ░░░░░░░░░░░░░░░░░░░░  · UNVERIFIED — 401 unauthorized (detail: mismatch)
Gate      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified — gated behind auth
Endpoints ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  · unverified — gated behind auth
```

### Endpoints
`ws_example`

- · UNVERIFIED — 401 unauthorized (detail: mismatch) — check the Named Credential / key

### Events
`GET /v1/events`

- · UNVERIFIED — 401 unauthorized (detail: mismatch)

### Next
1. Fix the bearer (`detail: mismatch` — wrong key value) and rerun the auth skill first.
