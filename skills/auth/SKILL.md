---
name: auth
description: >-
  Authenticate to the live KingMinos enrichment API: Bearer header,
  401 missing / malformed / mismatch, SFDC Named Credential Custom Headers,
  and GET /v1/capabilities. Use when the user asks how to call
  api.kingminos.com, whether their KingMinos key works, why they got 401,
  how to set Authorization on an SFDC Named Credential, GET /health,
  GET /openapi.yaml, or GET /v1/capabilities.
license: MIT
compatibility: Requires KINGMINOS_API_KEY and HTTPS to api.kingminos.com (REST) or mcp.kingminos.com (hosted MCP, same tool inventory).
metadata:
  author: outboundsync
  version: "1.1.5"
---

# KingMinos auth

Teach and lightly exercise authentication against **KingMinos by OutboundSync**. **Read-only.** Never print, log, or commit `KINGMINOS_API_KEY`. This is not an OutboundSync CRM-key skill.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Contract: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Credentials

Base URL: `https://api.kingminos.com`.

Mint a personal access token at `https://app.kingminos.com` (workspace owner → tokens). It is shown once, starts with `km_`, is scoped to explicit capabilities (not `*`), and has a daily credit cap (default 100). Do not call session/cookie `/v1/auth/*` or `/v1/account/*` routes from this skill.

```bash
export KINGMINOS_API_KEY=...
```

- Header (every authenticated route): `Authorization: Bearer $KINGMINOS_API_KEY`
- Bare keys (no `Bearer `) are `401` `detail: malformed`
- Public, no auth: `GET /health`, `GET /openapi.yaml`, `GET /v1/openapi.yaml` (JSON twins: `/openapi.json`, `/v1/openapi.json`)
- Spoken name is **King Minos**; write **KingMinos**

Hosted MCP (`https://mcp.kingminos.com`) exposes the same inventory tools. This skill's checks are `get_capabilities` and `get_providers` — do not invent tools outside the pack map.

## Workflow

1. If `$KINGMINOS_API_KEY` is unset, do not guess. Render the missing-key shape and stop.
2. `GET /health` (no auth). Expect `{"ok":true}`. Failure → `· UNVERIFIED — <status>` on Health, not a pass.
3. `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY` and `Accept: application/json`.
   - `200` + JSON catalog → key valid. Treat the body as a catalog; do not require a specific schema field.
   - `401` → map `detail`: `missing` | `malformed` | `mismatch`. Relay `hint`. Never echo the key.
   - Any other non-200 (including `403` / `429` / `5xx`), timeout, or non-JSON → `· UNVERIFIED — <status>`.
   - `429` → wait `Retry-After`; mark UNVERIFIED if you stop. `key_budget_exhausted` means the token's daily credit cap was hit.
4. Optional: `GET /v1/providers` on the same key when the user asks which vendors are configured.
5. SFDC Named Credential / Custom auth: Auth Parameters do **not** leave SFDC. The External Credential must list a Custom Header `Authorization` (Allow Formulas ON if the value is a formula). Write **SFDC** or **Salesforce**, never **SF**.

Do not call `POST /v1/company/resolve` from this skill — hand off to `company-resolve`. Do not store vendor keys — hand off to `credentials` (list + app UI).

## Output contract

GitHub-flavored markdown only. Render only this shape; no prose outside it. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`; the mark leads every bullet.

Gates (3): key present · Bearer accepted (`GET /v1/capabilities` not `401`) · catalog readable (`200` + JSON).

1. `##` is the verdict: `Authentication ready` · `Authentication needs a key` · `Authentication rejected` · `Authentication unverified`.
2. Fenced `text` gauge immediately after. 20-cell bars. `### Next` only when something needs action.

### Shape

````markdown
## Authentication <ready | needs a key | rejected | unverified>

```text
Overall        <bar>  <p>/3 · <ready|not ready|unverified>

Key            <bar>  <✓|✗|·> <ready | missing | unverified>
Bearer         <bar>  <✓|✗|·> <ready | missing | malformed | mismatch | unverified>
Capabilities   <bar>  <✓|✗|·> <ready | p/1 | unverified>
```

### Access
`https://api.kingminos.com · Bearer`

- <✓ Key present in KINGMINOS_API_KEY | ✗ KINGMINOS_API_KEY is unset | · UNVERIFIED — <reason>>
- <✓ Bearer accepted | ✗ 401 <missing|malformed|mismatch> — <hint, no secret> | · UNVERIFIED — <status>>
- <✓ Catalog readable | ✗ Catalog not called — no Bearer token | · UNVERIFIED — <status>>
- · Health — <ok | UNVERIFIED — <status>> (unauthenticated)

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
