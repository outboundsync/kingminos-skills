---
name: byok-provider-rollout
description: >-
  Roll out one KingMinos BYOK data-provider integration across the API service,
  product app, hosted MCP, and kingminos-skills. Use when adding a new opt-in
  vendor (Apollo/Prospeo-shaped), wiring Your Keys, provider enums, or fixing
  BYOK/house-key copy drift. Prefer over ad-hoc multi-repo edits.
---

# BYOK provider rollout (KingMinos)

Mechanical four-repo rollout for **one** BYOK vendor. Follow checklists; do not invent policy.

**Reference implementations:** Apollo and Prospeo (`company.resolve` domain enrich via `routing.only`).

**Full narrative, traps, smoke tests, and prompt template:** [docs/byok-provider-playbook.md](../../../docs/byok-provider-playbook.md). Public API docs: [kingminos.com/docs](https://kingminos.com/docs/).

Prefer `gh pr view` / `gh pr diff` / `gh api repos/…/contents/…` over cloning whole trees.

## Required inputs

Stop if any are missing:

| Input | Notes |
| --- | --- |
| `provider_id` | lowercase stable id (`apollo`, `prospeo`) |
| Display label | UI / docs string |
| Auth | header scheme (`bearer`, `x-token`, `x-api-key`, or vendor-specific inline) |
| Base URL + docs URL | vendor API root |
| Endpoints + capability | e.g. domain enrich → `company.resolve` only |
| Credential shape | usually `{ apiKey }`; ZoomInfo is OAuth exception |
| Verify call | real auth/credits/health endpoint + reject signals |
| Credits + billingMode | `on_success` or `always` |
| Compliance row | `soc2` / `data` evidence URLs if known |
| Scope cuts | what **not** to build (employment, phone reveal, name search, etc.) |

## Hard rules

1. **House keys cleared:** LeadMagic, Wiza, Findymail, AI Ark. New vendor = BYOK (`resaleAllowed: false`) unless explicitly ordered as house resale. Do **not** add to the house-key resale allowlist without counsel + explicit order.
2. Dogfood `VENDOR_API_KEY` for tenant `default` is OK; that is **not** house resale.
3. **BuiltWith** stays BYOK-only (ToS / reseller parked); tenant cache isolation; never customer house.
4. Never put BYOK vendors on default routing (`field-stacks`). Opt-in via `routing.only` after `presetProvidersFor`.
5. Do **not** bulk-merge closed house-key allowlist PRs.
6. Say **SFDC**, never “SF”.
7. No secrets or live API keys in commits or this skill.
8. Merge ≠ live: deploy API (`api.kingminos.com`), product app, and MCP (`mcp.kingminos.com`) after merge.

## Order

1. **API service** → PR → merge → deploy API
2. **Product app** (Your Keys + [kingminos.com/docs](https://kingminos.com/docs/))
3. **Hosted MCP** (Zod + inventory pin)
4. **kingminos-skills** (`providers.yaml` + copy + version bumps)
5. Redeploy product app / MCP if CI did not auto-deploy
6. Smoke tests in the playbook

Branch: `{provider_id}-byok`. One PR per repo. Squash merge when green.

## Checklist — API service

Copy shape from `src/providers/apollo.ts` or `src/providers/prospeo.ts`. See [playbook §3.1](../../../docs/byok-provider-playbook.md#31-api-service-router-worker).

**Verify:** `npm run check:types && npm run lint && npm test && npm run check:surfaces`

## Checklist — product app

See [playbook §3.2](../../../docs/byok-provider-playbook.md#32-product-app-and-docs-site).

**Verify:** `npm run check:session && npm run lint && npm run check:types && npm run build && npm run check:agent`

## Checklist — hosted MCP

See [playbook §3.3](../../../docs/byok-provider-playbook.md#33-hosted-mcp-server).

**Verify:** `npm run typecheck && npm run check:surfaces && npm run check:providers && npm test`

## Checklist — kingminos-skills

See [playbook §3.4](../../../docs/byok-provider-playbook.md#34-agent-skills-pack-kingminos-skills).

**Verify:** `npm run validate && node scripts/validate/cli.mjs --base origin/main && npm test`

## Traps

See [docs/byok-provider-playbook.md §5](../../../docs/byok-provider-playbook.md#5-token-traps-burned-cycles--avoid). Highlights:

- Missing `presetProvidersFor` → `routing.only` 400 `invalid_routing`.
- Stale “LeadMagic only house-key” copy — sync LeadMagic + Wiza + Findymail + AI Ark.
- Provider-enum CI: update pins in-PR.
- Wrong capability’s 400 list for `*_credentials_required`.
- Verify: map vendor 400/422 rejects or they become 503.
- Live OpenAPI lags until the API is redeployed.

## Smoke / acceptance

1. Live OpenAPI lists `{provider_id}` after API deploy.
2. `PUT /v1/credentials/{provider_id}` with bad key → `credential_rejected` (not verify 503).
3. `POST` capability with `routing.only: ["{provider_id}"]` works when keyed; missing key → `{id}_credentials_required`.
4. Same call **without** `routing.only` does not use the vendor on default paths.
5. All four repo verify commands green; product app + MCP deployed.

Details: [docs/byok-provider-playbook.md §6](../../../docs/byok-provider-playbook.md#6-smoke-tests--acceptance).

## Minimal agent prompt

```
Add BYOK provider [{provider_id}] using skill byok-provider-rollout and
docs/byok-provider-playbook.md. Public docs: https://kingminos.com/docs/
Auth [{…}]; endpoints [{…}]; capability [{…}]; verify [{…}]; credits [{…}].
API first → product app → MCP → skills. resaleAllowed false; presetProvidersFor;
no default routing; no house-key resale allowlist; SFDC not SF; no secrets.
Branch [{provider_id}-byok]. Return four PRs + verify output.
```
