# api-sync

Maintainer tooling state for the `API sync` workflow (`.github/workflows/api-sync.yml`). Nothing here ships with the skills.

- `openapi.snapshot.json`: the live KingMinos OpenAPI spec (`https://api.kingminos.com/openapi.json`) canonicalised with `jq -S .`, as of the last merged API sync PR. The first sync run (bootstrap) adds it.
- Every 6 hours the workflow compares the live spec to this snapshot. When they differ, it regenerates `scripts/validate/fixtures/openapi-inventory.yaml` with `scripts/openapi-inventory.mjs`, has a Cursor CLI agent update the API map and skills (`.github/prompts/api-sync.md`), writes the new snapshot and opens a `chore(api): sync skills pack with KingMinos OpenAPI (<hash>)` PR. A human merges it.
- The `api-sync-snapshot` rule in `npm run validate` fails when the fixture isn't exactly what the snapshot renders. Don't edit either file by hand; to refresh the fixture from the snapshot, run `npm run openapi:fixture`.
