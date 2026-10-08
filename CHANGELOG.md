# Changelog

<!-- release entries -->

## Unreleased

## [2026.10.08.4] - 2026-10-08

### Changed

- Release workflow now promotes `## Unreleased` into the new `## [tag] - date` section on every release and lands it on `main` through a self-merging PR (`main` stays protected). An empty Unreleased is a no-op, and the promotion commit never triggers another release.

## [2026.10.08.2] - 2026-10-08

### Changed

- Public copy scrub: remove internal repository, PR, agent, and production Worker names from skills, CONTRIBUTING, README, and BYOK playbook; link integrators to [kingminos.com/docs](https://kingminos.com/docs/) instead.
- Cache bypass docs: `company.description` uses a 30-day result cache; `company.domain` uses a short TTL (about five minutes max); `company.resolve` silently ignores bypass headers.
- Backfill release sections for 2026.10.05.0–2026.10.08.1.

## [2026.10.08.1] - 2026-10-08

### Changed

- `company-description` skill: `result.flags` adds `grammar` (informational — does not affect confidence or `safe_to_write`); cache bypass on `company.description` (30-day cache) and `company.domain` (short TTL) via `X-Router-Cache: bypass`, `Cache-Control: no-cache|no-store`, or `skip_cache: true`; idempotency replay unchanged; `company.resolve` silently ignores bypass and may return a cached answer; recommend sending `path` explicitly (omit still runs `balance` but raises credit cap from 2 to 6).

## [2026.10.08.0] - 2026-10-07

### Added

- `company-description` skill: `POST /v1/company/description` / MCP `company_description` (`company.description`) — paths `speed` / `balance` / `accuracy` / `coverage`, `result.flags` (`hype`, `first_person`, `tagline`, `same_as_speed`), `answer.confidence` + `safe_to_write.description` CRM guidance, winner-only billing, default house site fetch → AI Ark firmographic compose; ZoomInfo firmographic BYOK via `routing.only` only (aligned with [company.description API docs](https://kingminos.com/docs/api/company-description/)).

## [2026.10.07.7] - 2026-10-07

### Added

- Lemlist BYOK support: `lemlist` is a storable API-key vendor and an off-path `company.resolve` hop (`POST /api/database/companies`, website/domain database filter -> company, HTTP Basic auth; filter id unverified until live-key validation) forceable via `routing.only: ["lemlist"]`. Adds `lemlist_credentials_required`.

## [2026.10.07.6] - 2026-10-07

### Added

- Snov.io BYOK credential vendor: `snovio` is a storable **OAuth** Your Keys vendor (`PUT /v1/credentials/snovio`, `{ "clientId", "clientSecret" }`) — **credential vendor only, no routing hop yet** (the `company.resolve` `domain-search` hop lands once a live key proves the flow). `supply: byok`, `api_key: false`, `credentials_required: null`, `path_enum: true`, `company_resolve_surface: false`. Not cleared for house-key resale.

## [2026.10.07.3] - 2026-10-07

### Added

- `company-icon` skill: `POST /v1/company/icon` / MCP `company_icon` (`company.icon`) — live HTTPS `icon_url`, default ladder house favicon-fetch (0 credits) → Brandfetch BYOK (1, soft-fail and continue) → ZoomInfo enrich logo (1); Enrich-CRM, AI Ark, LeadMagic, and Prospeo are not icon sources; no R2/D1 cache URLs. `brandfetch` BYOK in `providers.yaml` (alongside Enrich-CRM).

## [2026.10.07.2] - 2026-10-07

### Added

- Enrich-CRM BYOK support: `enrichcrm` is a storable API-key vendor and an off-path `company.resolve` hop (`GET /api/ingress/v4/firmographic`, domain -> firmographics, auth via the `apiId` QUERY PARAM only) forceable via `routing.only: ["enrichcrm"]`. Adds `enrichcrm_credentials_required`.

## [2026.10.07.1] - 2026-10-07

### Added

- `company-b2b-social` skill: `POST /v1/company/b2b-social` / MCP `company_b2b_social` — paths, Serper-verified `result.linkedin_url`, house AI Ark on default `balance` stack (aligned with live OpenAPI).
- Document hosted MCP at `https://mcp.kingminos.com` (same Bearer tool inventory as REST); remove stale “MCP not shipped” / “do not invent mcp.kingminos.com” copy.
- Lychee: [`.lychee.toml`](.lychee.toml) excludes template LinkedIn company URLs; `placeholder-linkedin-links` validate rule; CONTRIBUTING guidance on backticks vs Markdown links.

## [2026.10.07.0] - 2026-10-06

### Added

- AI Ark house-key (resale cleared): `aiark` is `supply: house_key` in the hermetic provider inventory alongside LeadMagic, Wiza, and Findymail; tenant Your Keys remain optional. Policy copy notes `company.b2b_social` may use house AI Ark via `routing.only: ["aiark"]`. ZoomInfo and BuiltWith stay BYOK.

## [2026.10.06.3] - 2026-10-06

### Added

- HG Insights BYOK support: `hginsights` is a storable API-key vendor and an off-path `company.resolve` hop (`POST /companies/enrich`, domain -> firmographics, Bearer) forceable via `routing.only: ["hginsights"]`. Adds `hginsights_credentials_required`.

## [2026.10.06.2] - 2026-10-06

### Added

- People Data Labs BYOK support: `peopledatalabs` is a storable API-key vendor and an off-path `company.resolve` hop (`GET /company/enrich`, website -> company, `min_likelihood` 6) forceable via `routing.only: ["peopledatalabs"]`. Adds `peopledatalabs_credentials_required`.

## [2026.10.06.1] - 2026-10-06

### Added

- Company URL Finder BYOK support: `companyurlfinder` is a storable API-key vendor and an off-path `company.domain` name-to-domain hop (`POST /v2/services/name_to_domain`) forceable via `routing.only: ["companyurlfinder"]`. Adds `companyurlfinder_credentials_required`.

### Fixed

- `company-resolve` no longer lists `companyurlfinder_credentials_required` as a normal resolve `400`; Company URL Finder stays BYOK on `company.domain` / name→domain (`credentials` skill unchanged).

## [2026.10.06.0] - 2026-10-06

### Added

- Maintainer docs: [docs/byok-provider-playbook.md](docs/byok-provider-playbook.md) (BYOK rollout across KingMinos product repos) and Cursor skill `.cursor/skills/byok-provider-rollout/SKILL.md`.

## [2026.10.05.2] - 2026-10-05

### Added

- Apollo BYOK support: `apollo` is a storable API-key vendor and an off-path `company.resolve` firmographic hop (`GET /organizations/enrich`) forceable via `routing.only: ["apollo"]`. Adds `apollo_credentials_required`. Also corrects the house-key policy copy: house-key = LeadMagic, Wiza, Findymail; BYOK = ZoomInfo, AIArk, BuiltWith, Prospeo, Apollo.

## [2026.10.05.1] - 2026-10-05

### Added

- Prospeo BYOK support: `prospeo` is a storable API-key vendor (`PUT /v1/credentials/prospeo`) and an off-path `company.resolve` provider forceable via `routing.only: ["prospeo"]`. Adds `prospeo_credentials_required`.
- `provider-enum` validator: CI fails when skills BYOK lists, path-`provider` enums, or `*_credentials_required` lists omit a provider from the checked-in KingMinos inventory (`scripts/validate/fixtures/providers.yaml`). Endpoint-map rules stay route-only; this check is what makes a new vendor visible.

### Fixed

- credentials API-key vendor list includes `prospeo` (missed when Prospeo BYOK support landed).

## [2026.10.05.0] - 2026-10-04

### Changed

- Bearer-only OpenAPI inventory: added `GET /v1/credentials` → `list_credentials`. Session/product-app `/v1/auth/*` and `/v1/account/*` ops are out of scope. `npm run check:surfaces` uses the same Bearer-only rule.
- PR/push Validate is hermetic (fixture only). Live OpenAPI comparison is a scheduled + `workflow_dispatch` job that fails visibly and can open an issue — it never blocks CalVer release.
- `credentials` lists Your Keys via `GET /v1/credentials` and sends store/rotate to https://app.kingminos.com. The skill stays read-only plus revoke. Never paste a vendor secret into chat.
- Auth docs say where to mint a `km_` key (app.kingminos.com, shown once, scoped, daily cap) and map `403` `scope_denied` / `429` `key_budget_exhausted`.
- Company resolve honors `answer.safe_to_write` instead of restating the Account Name fill rule.

### Fixed

- Secrets rule detects `km_` tokens, scans all tracked text, and treats `\$\{` as a placeholder.
- Hard-coded API inventory counts and lists are checked against the canonical map.

## [2026.10.03.0] - 2026-10-03

### Added

- Initial KingMinos Agent Skills pack: `auth`, `company-resolve`, and `credentials`.
- Packaging, validator, and CalVer release tooling modeled on the public OutboundSync skills repo — KingMinos enrichment content only.
- `api` skill with the canonical REST ↔ tool map (`skills/api/references/endpoints.md`) — one row per KingMinos OpenAPI Bearer resource operation.
- `endpoint-map-consistent` and `endpoint-map-openapi` validators so CI fails when skill copies or the OpenAPI inventory drift.
