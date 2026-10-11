# Webhooks endpoints

Live contract: `GET https://api.kingminos.com/openapi.yaml` (also `/openapi.json`). REST and hosted MCP (`https://mcp.kingminos.com`) share the Bearer tool inventory. Signing secrets (`kmwhsec_…`) are returned once at create/rotate and never echoed again. Trimmed copy of the pack map (`api` skill `references/endpoints.md`); `npm run validate` keeps these rows matching it.

## REST ↔ tools

| REST | Tool id (OpenAPI operationId) | Access | Owner / notes |
| --- | --- | --- | --- |
| `GET /v1/webhooks` | `list_webhooks` | R | Workspace endpoints (`kmwhk_…`, no secrets). `403 webhooks_not_enabled` while the gate is off. |
| `POST /v1/webhooks` | `create_webhook` | W | Register an HTTPS endpoint; secret shown once. Owner only; max 20. |
| `GET /v1/webhooks/{id}` | `get_webhook` | R | One endpoint (url, `enabled_events`, `is_active`, `consecutive_failures`, `auto_disabled_at`). |
| `PATCH /v1/webhooks/{id}` | `patch_webhook` | W | Update url / description / `enabled_events` / `is_active` (re-enable clears auto-disable). Owner only. |
| `DELETE /v1/webhooks/{id}` | `delete_webhook` | W | Soft-delete. Owner only. |
| `POST /v1/webhooks/{id}/rotate-secret` | `rotate_webhook_secret` | W | New secret shown once; the previous stops working immediately. Owner only. |
| `POST /v1/webhooks/{id}/test` | `test_webhook` | W | `202 { event_id }` — queues a `test.ping` delivery (ignores `enabled_events`). `409 webhook_endpoint_inactive` while paused. Owner only. |
| `GET /v1/webhooks/{id}/deliveries` | `list_webhook_deliveries` | R | Delivery log (`status` filter: `pending` \| `succeeded` \| `failed` \| `dead`; `limit` ≤ 100). |
| `POST /v1/webhooks/{id}/deliveries/{delivery_id}/replay` | `replay_webhook_delivery` | W | New delivery linked via `replay_of_delivery_id`. Owner only. |
| `GET /v1/events` | `list_events` | R | Reconciliation log: `type` (run.failed \| run.recovered \| test.ping), `delivered` (true = at least one successful delivery; false = no successful delivery yet — still retrying, dead, or no endpoint subscribed), `limit` ≤ 200, keyset `cursor` (`next_cursor` only on a full page). |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/webhooks` | Bearer | List workspace endpoints. Default read path. |
| `POST` | `/v1/webhooks` | Bearer | Register an endpoint (confirm first; secret shown once). |
| `POST` | `/v1/webhooks/{id}/test` | Bearer | Prove the endpoint with a signed `test.ping`. |
| `GET` | `/v1/events` | Bearer | What KingMinos emitted, delivered or not. |
