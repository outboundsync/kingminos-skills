---
name: api
description: >-
  Guide agents through the KingMinos enrichment API: Bearer auth, the REST ↔
  MCP inventory, OpenAPI discovery, and which specialized skill to run. Use
  when the user asks how to use the KingMinos API, which endpoint or tool to
  call, OpenAPI discovery, GET /v1/capabilities, or how API work relates to
  auth, company-resolve, and credentials.
license: MIT
compatibility: Requires KINGMINOS_API_KEY in the environment and HTTPS access to api.kingminos.com for live calls. KingMinos MCP is not shipped; use REST.
metadata:
  author: outboundsync
  version: "1.0.0"
---

# KingMinos API

Teach the public enrichment API at **KingMinos by OutboundSync**. **Read-only.** Never print, log, or commit `KINGMINOS_API_KEY`. This is not an OutboundSync CRM-key skill.

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

Render **only** the output shape below — no prose outside it. Every REST path, its inventory tool, access rules, and error handling: [references/endpoints.md](references/endpoints.md). Examples: [references/examples.md](references/examples.md).

## Credentials

Base URL: `https://api.kingminos.com`. Worker: `kingminos-api-prod`.

```bash
export KINGMINOS_API_KEY=...
```

- Header: `Authorization: Bearer $KINGMINOS_API_KEY`
- Live contract (no auth): `GET /openapi.yaml` (also `/v1/openapi.yaml`)
- Spoken name is **King Minos**; write **KingMinos**

Hosted MCP is **not shipped**. Prefer REST. Tool names in the map are the OpenAPI resource `operationId` inventory (snake_case). Do not invent a `mcp.kingminos.com` host or tools outside [references/endpoints.md](references/endpoints.md).

## Workflow

1. If `$KINGMINOS_API_KEY` is unset, render the missing-key shape and stop.
2. Optional liveness: `GET /health` (no auth). Expect `{"ok":true,"service":"kingminos-api-prod"}`.
3. `GET /v1/capabilities` with `Authorization: Bearer $KINGMINOS_API_KEY`. `200` + JSON catalog → key valid. `401` → map `detail` (`missing` \| `malformed` \| `mismatch`). Timeout / non-JSON → `· UNVERIFIED — <status>`.
4. Name the REST path **and** the inventory tool from [references/endpoints.md](references/endpoints.md). One resource operation ↔ one tool. Do not invent endpoints.
5. Hand off writes and specialized decisions:

| User intent | Skill / tool |
| --- | --- |
| Does my key work? 401? SFDC Named Credential header? | `auth` · `get_capabilities` |
| Resolve a company / stamp ZoomInfo company id | `company-resolve` · `company_resolve` |
| Store or revoke vendor Your Keys | `credentials` · `put_credentials` / `delete_credentials` |
| Domain stamp, hierarchy, employment verify | Live tools `company_domain`, `company_hierarchy`, `person_verify_employment` — no dedicated skill yet; stay on REST |
| Erase a subject | `delete_subject` — **not** these skills (`erase` scope) |

Do not call `put_credentials`, `delete_credentials`, or `delete_subject` from this skill.

## Output contract

GitHub-flavored markdown only. Render only this shape; no prose outside it. Marks: `✓` pass · `✗` blocker · `·` advisory or `UNVERIFIED — <reason>`; the mark leads every bullet.

Gates (2): key present · catalog readable (`GET /v1/capabilities` not `401`).

1. `##` is the verdict: `API ready` · `API needs a key` · `API unverified`.
2. Fenced `text` gauge immediately after. 20-cell bars. `### Next` only when something needs action.

### Shape

````markdown
## API <ready | needs a key | unverified>

```text
Overall     <bar>  <p>/2 · <ready|not ready|unverified>

Key         <bar>  <✓|✗|·> <ready | missing | unverified>
Catalog     <bar>  <✓|✗|·> <ready | 401 <detail> | unverified>
```

### Access
`https://api.kingminos.com · Bearer · 10 resource operations`

- <✓ Key present in KINGMINOS_API_KEY | ✗ KINGMINOS_API_KEY is unset | · UNVERIFIED — <reason>>
- <✓ Catalog readable — get_capabilities | ✗ 401 <missing|malformed|mismatch> | · UNVERIFIED — <status>>
- · Inventory: get_providers · get_capabilities · company_resolve · company_domain · company_hierarchy · person_verify_employment · get_run · put_credentials · delete_credentials · delete_subject
- · Hand off: <auth | company-resolve | credentials | none — REST for a live tool with no dedicated skill>

### Next
1. <shortest action tied to a ✗ or UNVERIFIED above>
````
