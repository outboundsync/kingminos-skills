# Changelog

<!-- release entries -->

## Unreleased

### Added

- Initial KingMinos Agent Skills pack: `auth`, `company-resolve`, and `credentials`.
- Packaging, validator, and CalVer release tooling modeled on the public OutboundSync skills repo — KingMinos enrichment content only.
- `api` skill with the canonical REST ↔ MCP map (`skills/api/references/endpoints.md`) — one row per KingMinos OpenAPI resource operation.
- `endpoint-map-consistent` and `endpoint-map-openapi` validators so CI fails when skill copies or the OpenAPI inventory drift.
