# Changelog

<!-- release entries -->

## Unreleased

### Added

- Prospeo BYOK support: `prospeo` is a storable API-key vendor (`PUT /v1/credentials/prospeo`) and an off-path `company.resolve` provider forceable via `routing.only: ["prospeo"]`. Adds `prospeo_credentials_required`.
- `provider-enum` validator: CI fails when skills BYOK lists, path-`provider` enums, or `*_credentials_required` lists omit a provider from the checked-in KingMinos inventory (`scripts/validate/fixtures/providers.yaml`). Endpoint-map rules stay route-only; this check is what makes a new vendor visible.

### Changed

- Bearer-only OpenAPI inventory: added `GET /v1/credentials` → `list_credentials`. Session/product-app `/v1/auth/*` and `/v1/account/*` ops are out of scope. kingminos-application `check:surfaces` should use the same Bearer-only rule.
- PR/push Validate is hermetic (fixture only). Live OpenAPI comparison is a scheduled + `workflow_dispatch` job that fails visibly and can open an issue — it never blocks CalVer release.
- `credentials` lists Your Keys via `GET /v1/credentials` and sends store/rotate to https://app.kingminos.com. The skill stays read-only plus revoke. Never paste a vendor secret into chat.
- Auth docs say where to mint a `km_` key (app.kingminos.com, shown once, scoped, daily cap) and map `403` `scope_denied` / `429` `key_budget_exhausted`.
- Company resolve honors `answer.safe_to_write` instead of restating the Account Name fill rule.

### Fixed

- Secrets rule detects `km_` tokens, scans all tracked text, and treats `\$\{` as a placeholder.
- Hard-coded API inventory counts and lists are checked against the canonical map.
- credentials API-key vendor list includes `prospeo` (missed when Prospeo landed in #4).

## [2026.10.03.0] - 2026-10-03

### Added

- Initial KingMinos Agent Skills pack: `auth`, `company-resolve`, and `credentials`.
- Packaging, validator, and CalVer release tooling modeled on the public OutboundSync skills repo — KingMinos enrichment content only.
- `api` skill with the canonical REST ↔ tool map (`skills/api/references/endpoints.md`) — one row per KingMinos OpenAPI Bearer resource operation.
- `endpoint-map-consistent` and `endpoint-map-openapi` validators so CI fails when skill copies or the OpenAPI inventory drift.
