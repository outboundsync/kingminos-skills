# Contributing

This repo is the source of truth for the **KingMinos by OutboundSync** Agent Skills. Each skill is a folder `skills/<name>/` holding a `SKILL.md` and optional `references/`. The skills ship only Markdown and YAML; `scripts/`, `test/`, and `package.json` are maintainer tooling and are never installed.

This is not the OutboundSync CRM / sequencer skills pack. Do not copy product skills from [outboundsync/skills](https://github.com/outboundsync/skills). Match that repo's **layout, frontmatter, validator, and `npx skills` packaging** — write KingMinos enrichment content only.

Say **KingMinos** in writing. Say **King Minos** out loud. Write **SFDC** or **Salesforce**, never the abbreviation **SF**.

## Prerequisites

- Node.js 22 or newer
- `npm ci` once after cloning

## Check your change

```bash
npm run validate                          # every rule, all problems in one run (offline fixture)
npm run validate -- --base origin/main    # also require version bumps (what CI runs on PRs)
npm test                                  # validator + release tooling tests
```

PR and push **Validate** is hermetic: it compares the api map to `scripts/validate/fixtures/openapi-inventory.yaml` only. A live API outage, deploy, or `curl` blip must not fail a typo-fix PR or block CalVer release.

Live OpenAPI comparison is a scheduled + `workflow_dispatch` job (`.github/workflows/openapi-surfaces.yml`). It fails visibly and can open an issue. It never gates release. Run it locally when you change the map:

```bash
KINGMINOS_OPENAPI_URL=https://api.kingminos.com/openapi.yaml npm run check:surfaces
```

The inventory is **Bearer-only**. Session/product-app ops (`/v1/auth/*`, `/v1/account/*`) declare no bearer security and are out of scope. `GET /v1/credentials` (`list_credentials`) is in scope. kingminos-application `check:surfaces` should use the same Bearer-only rule (do not change that repo from this pack).

Run `npm run validate -- --list` to see every rule with its severity. Rules and their rationale live in `scripts/validate/rules/`, one file each; severities are in `scripts/validate/config.json`. A rule at `warn` is new and is being rolled out; it becomes an error once every skill complies.

## Add a skill

1. Copy [`templates/SKILL.template.md`](templates/SKILL.template.md) to `skills/<name>/SKILL.md`. The folder name and the `name:` field must match (lowercase kebab-case).
2. Write the description: open with a verb, include "Use when the user asks…" with concrete trigger phrases. Keyed skills need a `compatibility:` line that mentions `KINGMINOS_API_KEY` or `api.kingminos.com`. Account-free skills omit that line and end the description with "No KingMinos API key."
3. Follow [CONVENTIONS.md](CONVENTIONS.md) for output: an `## Output contract` with a `### Shape`, the marks legend, and the status layout for readiness or health checks.
4. Keep every link inside the skill folder or absolute. `npx skills add` installs one folder, so `../../` links break.
5. If the skill writes to KingMinos, add a `## Mutations` section naming each REST call, note that KingMinos MCP is not shipped, and follow the [write-on-confirm protocol](SECURITY.md#write-on-confirm-protocol). Do not ask the user to paste a vendor secret into chat.
6. Add the skill to every README list: the count, its category table, the install commands, and the "try without installing" commands.
7. Add a line under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md).
8. Teach only Bearer resource operations that `GET https://api.kingminos.com/openapi.yaml` exposes today. Those operations belong in `skills/api/references/endpoints.md` (METHOD /path → snake_case tool). Do not invent endpoints or tools outside that map. Do not add session/product-app ops. `npm run check:surfaces` (fixture) and the live surfaces job must stay green.

## Versioning

- **Skills:** bump `metadata.version` in a skill's frontmatter whenever any file in its folder changes. Minor for new behavior or output changes, patch for fixes and wording. CI enforces a bump on PRs.
- **Pack:** releases are CalVer tags `YYYY.MM.DD.N`, created automatically after hermetic Validate passes on `main`. Preview the next release with `npm run release:preview`.

## Changelog promotion

CI `release-calver.yml` only `--dry-run`s. It does **not** write `CHANGELOG.md`. After a CalVer tag is cut (or in a release-prep PR that lands with that tag's notes), run `npm run release:apply` to move curated `## Unreleased` lines under `## [YYYY.MM.DD.N]`. Do this on each release so the file does not lag the published tag.

## After merging

Refresh any public mirror or docs page that lists these skills when a skill's output or triggers change. The live API contract stays at `https://api.kingminos.com/openapi.yaml` (JSON twin: `/openapi.json`).
