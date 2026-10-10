---
name: webhooks
description: >-
  Manage KingMinos platform webhooks: register an HTTPS endpoint, verify
  signatures, inspect deliveries, replay dead ones, and read the events log.
  Active events today are run.failed and run.recovered (Run Health tranche);
  test.ping checks an endpoint. Use when the user asks to set up webhooks,
  register a webhook endpoint, why they did not get a run.failed alert, verify
  a KingMinos-Signature, replay a delivery, list webhook deliveries, or why a
  webhook endpoint was auto-disabled. Mutations only after explicit confirmation.
license: MIT
compatibility: Requires KINGMINOS_API_KEY (workspace owner key or session) and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP).
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos webhooks

KingMinos emits its own platform events and delivers them signed to customer-registered HTTPS endpoints — the push counterpart to the `GET /v1/events` log. Register endpoints, verify `KingMinos-Signature`, watch deliveries, and replay after fixes. Signing secrets (`kmwhsec_…`) are shown **once** at create/rotate — never ask the user to paste one into chat, and never print, log, or commit it.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md). Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol).

## Policy (locked)

| Event | State | Fires when |
| --- | --- | --- |
| `run.failed` | **Active** | A workspace×capability stream transitions healthy→failing — one alert per incident, not per run. 3 consecutive failed runs fire once; platform-breaking failures (storage outage) fire on the first. Successes reset the count. |
| `run.recovered` | **Active** | The same stream is healthy again on its next successful run. |
| `test.ping` | **Active** | Delivered only by `POST /v1/webhooks/{id}/test` — not a subscription type. |
| `billing.frozen` · `billing.unfrozen` · `credits.exhausted` · `credits.low` · `vendor.uptime.changed` · `run.completed` | **Reserved** | Names are held; subscribing returns `400 invalid_webhook_events` with the available list. Do not invent shipping timelines. |

- Every `run.failed` payload pairs a readable `reason` (≤240 chars, emails redacted) with a `remediation` ending in a docs link. Relay both.
- Delivery is at-least-once: 10 s timeout, 1 attempt + 7 retries over ≈2 h (first retry 1 m + jitter, then 2/4/8/16/30/60 min), 404/413 terminal, DEAD after that. **20 consecutive DEAD deliveries auto-disable the endpoint**; a success resets the streak; re-enable with `PATCH { "is_active": true }`.
- Envelope: `{ id (kmevt_…), type, created, summary, data }`; headers `KingMinos-Signature: t=<unix>,v1=<hex>` (HMAC-SHA256 over `<t>.<rawBody>`), `KingMinos-Event-Id`, `KingMinos-Delivery-Id`. Verify against the raw body with a constant-time compare and a tolerance window (e.g. 300 s).
- Dedupe on event `id`; order by `created`. URLs are HTTPS-only; private/loopback/link-local targets (including DNS-resolved) are rejected at create and re-checked per attempt.
- Workspace gate: every `/v1/webhooks*` and `/v1/events` route is `403 webhooks_not_enabled` until an OutboundSync admin enables webhooks for the workspace. Mutations need the workspace **owner** (`403 webhook_owner_required` otherwise). Max 20 endpoints per workspace.
- `GET /v1/events` is the reconciliation log — events stay queryable even when no webhook was active. Use it to recover anything missed while an endpoint was down, then replay.

## Workflow

1. Confirm auth (`GET /v1/capabilities` or the `auth` skill). On `401`, stop.
2. `GET /v1/webhooks` (`list_webhooks`). `403 webhooks_not_enabled` → blocker; the fix is an admin toggle, not a retry.
3. Registering: confirm the exact plan (`Will POST /v1/webhooks {"url": …}`), then send. Return the endpoint `id` and tell the user to store the `kmwhsec_…` secret now — it is never shown again.
4. Prove the endpoint: `POST /v1/webhooks/{id}/test` (`test_webhook`) → `202 { event_id }`; then `GET /v1/webhooks/{id}/deliveries` and require `succeeded`. `pending` with `last_error` is a receiver problem, not a KingMinos one.
5. Diagnosing missing alerts: `GET /v1/events?type=run.failed` — an event with `delivered: false` means emission happened but delivery failed; no event at all means no healthy→failing transition occurred for that workspace×capability.
6. After fixing a receiver: replay the specific delivery (`replay_webhook_delivery`), or re-enable after auto-disable (`patch_webhook` with `{ "is_active": true }`), then replay.
7. Rotate only after explicit confirmation: the previous secret stops working immediately.

## Mutations

Follow the [write-on-confirm protocol](https://github.com/outboundsync/kingminos-skills/blob/main/SECURITY.md#write-on-confirm-protocol). Print a one-line plan and wait for confirmation of **that** plan before sending. REST or hosted MCP (`https://mcp.kingminos.com`) — same tools.

- `create_webhook` / `POST /v1/webhooks` — register an endpoint (secret shown once; store it immediately)
- `patch_webhook` / `PATCH /v1/webhooks/{id}` — update url / `enabled_events` / `is_active` (re-enable clears auto-disable)
- `delete_webhook` / `DELETE /v1/webhooks/{id}` — soft-delete the endpoint
- `rotate_webhook_secret` / `POST /v1/webhooks/{id}/rotate-secret` — new secret shown once, previous stops working
- `test_webhook` / `POST /v1/webhooks/{id}/test` — queues a signed `test.ping` delivery
- `replay_webhook_delivery` / `POST /v1/webhooks/{id}/deliveries/{delivery_id}/replay` — re-send a specific delivery

## Output contract

GitHub-flavored markdown only. Render only this shape. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`.

Gates (3): auth · gate (webhooks enabled for the workspace) · endpoints (at least one active endpoint, or catalog loaded when none registered).

### Shape

````markdown
## Webhooks — <ready | not configured | unverified>

```text
Overall   <bar>  <p>/3 · <ready|not ready|unverified>

Auth      <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
Gate      <bar>  <✓|✗|·> <enabled | 403 webhooks_not_enabled | unverified>
Endpoints <bar>  <✓|✗|·> <n active (m dead-lettered) | none registered | unverified>
```

### Endpoints
`<workspace>`

- <one line per endpoint: ✓|✗|· <id> <url> <enabled_events or all active> — <last delivery status>>
- · Signing secrets are shown once at create/rotate — store them at register time
- · Reserved names (billing.*, credits.*, vendor.uptime.*, run.completed) are held, not delivered

### Events
`GET /v1/events`

- <✓|·> <most recent event: <type> <delivered true|false> <created>>
- · No event for a workspace×capability means no healthy→failing transition occurred

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above — confirm a mutation plan before sending>
````
