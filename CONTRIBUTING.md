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

The `validate` job is the required check on `main` (`npm run ci` runs the same thing locally); branches must be up to date and protection applies to admins.

PR and push **Validate** is hermetic: it compares the api map to `scripts/validate/fixtures/openapi-inventory.yaml` and BYOK provider lists to `scripts/validate/fixtures/providers.yaml` only. A live API outage, deploy, or `curl` blip must not fail a typo-fix PR or block CalVer release.

Live OpenAPI comparison is a scheduled + `workflow_dispatch` job (`.github/workflows/openapi-surfaces.yml`). It fails visibly and can open an issue. It never gates release. Run it locally when you change the map or the provider inventory:

```bash
KINGMINOS_OPENAPI_URL=https://api.kingminos.com/openapi.yaml npm run check:surfaces
```

The inventory is **Bearer-only**. Session/product-app ops (`/v1/auth/*`, `/v1/account/*`) declare no bearer security and are out of scope. `GET /v1/credentials` (`list_credentials`) is in scope. `npm run check:surfaces` in this repo uses the same Bearer-only rule as the live API inventory.

`endpoint-map-*` is route-only. Provider ids (`leadmagic`, `prospeo`, …) live in `providers.yaml`. When KingMinos adds a BYOK vendor, add it there first, then to every credentials / company-resolve / README / CONVENTIONS / SECURITY BYOK list, path-`provider` enum, and `*_credentials_required` list. `provider-enum` fails CI if a list is short.

For the full four-repo rollout (API → product app → MCP → skills), use [docs/byok-provider-playbook.md](docs/byok-provider-playbook.md) and [.cursor/skills/byok-provider-rollout/SKILL.md](.cursor/skills/byok-provider-rollout/SKILL.md).

Run `npm run validate -- --list` to see every rule with its severity. Rules and their rationale live in `scripts/validate/rules/`, one file each; severities are in `scripts/validate/config.json`. A rule at `warn` is new and is being rolled out; it becomes an error once every skill complies.

## External links (Lychee)

CI runs [lychee](https://github.com/lycheeverse/lychee) on `**/*.md` (`.github/workflows/links.yml`, config: [`.lychee.toml`](.lychee.toml)).

**Never publish placeholder or template URLs as clickable Markdown** — no `[label](https://www.linkedin.com/company/{slug})`, no autolinks `<https://…>`, and no bare `https://…` outside fenced code blocks. Put contract templates in **inline code** instead, e.g. `` `https://www.linkedin.com/company/{slug}` ``. Illustrative slugs (`acme-example`) and brace placeholders (`{slug}`) must stay inside backticks so link checkers do not HTTP-fetch 404s.

`npm run validate` enforces this for LinkedIn company URLs via `placeholder-linkedin-links`. `.lychee.toml` also excludes a few template URL shapes as a safety net — that does **not** replace backticks in docs.

## Add a skill

1. Copy [`templates/SKILL.template.md`](templates/SKILL.template.md) to `skills/<name>/SKILL.md`. The folder name and the `name:` field must match (lowercase kebab-case).
2. Write the description: open with a verb, include "Use when the user asks…" with concrete trigger phrases. Keyed skills need a `compatibility:` line that mentions `KINGMINOS_API_KEY` or `api.kingminos.com`. Account-free skills omit that line and end the description with "No KingMinos API key."
3. Follow [CONVENTIONS.md](CONVENTIONS.md) for output: an `## Output contract` with a `### Shape`, the marks legend, and the status layout for readiness or health checks.
4. Keep every link inside the skill folder or absolute. `npx skills add` installs one folder, so `../../` links break.
5. If the skill writes to KingMinos, add a `## Mutations` section naming each REST call (and hosted MCP at `https://mcp.kingminos.com` when the same tool exists), and follow the [write-on-confirm protocol](SECURITY.md#write-on-confirm-protocol). Do not ask the user to paste a vendor secret into chat.
6. Add the skill to every README list: the count, its category table, the install commands, and the "try without installing" commands.
7. Add a line under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md).
8. Teach only Bearer resource operations that `GET https://api.kingminos.com/openapi.yaml` exposes today. Those operations belong in `skills/api/references/endpoints.md` (METHOD /path → snake_case tool). Do not invent endpoints or tools outside that map. Do not add session/product-app ops. `npm run check:surfaces` (fixture) and the live surfaces job must stay green.
9. When KingMinos adds a credentials / BYOK provider, add it to `scripts/validate/fixtures/providers.yaml` (and the OpenAPI fixture path-`provider` enum) before listing it in skills. `provider-enum` fails if a BYOK list, path enum, or `*_credentials_required` line is short.

## Versioning

- **Skills:** bump `metadata.version` in a skill's frontmatter whenever any file in its folder changes. Minor for new behavior or output changes, patch for fixes and wording. CI enforces a bump on PRs.
- **Pack:** releases are CalVer tags `YYYY.MM.DD.N`, created automatically after hermetic Validate passes on `main`. Preview the next release with `npm run release:preview`.

## Changelog promotion

Automatic. On each release, `release-calver.yml` runs `release-calver.mjs --apply`, which moves the curated `## Unreleased` lines under `## [YYYY.MM.DD.N] - YYYY-MM-DD`, then publishes the tag and GitHub release. Because `main` is protected (required `validate`, no bot pushes), the workflow lands the CHANGELOG change through a short-lived PR (`chore(release): CHANGELOG for <tag>`, `scripts/release-changelog-pr.sh`). GitHub does not run CI on PRs opened with the default `GITHUB_TOKEN`, so the PR merges itself only when the repository secret `RELEASE_PR_TOKEN` is set (a GitHub App installation token or a fine-grained token for this repo with contents and pull-requests write). Without that secret, a maintainer closes and reopens the bot PR to run `validate`, then squash-merges it with the default title. An empty `## Unreleased` changes nothing, and the promotion commit never cuts another release. Contributors only add lines under `## Unreleased`; do not hand-edit release sections. If the bot PR fails (for example, it conflicts with a newer commit on `main`), move that tag's lines by hand in a normal PR.

## After merging

Refresh any public mirror or docs page that lists these skills when a skill's output or triggers change. The live API contract stays at `https://api.kingminos.com/openapi.yaml` (JSON twin: `/openapi.json`).
