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

PR and push **Validate** is hermetic: it compares the api map to `scripts/validate/fixtures/openapi-inventory.yaml` and BYOK provider lists to `scripts/validate/fixtures/providers.yaml` only. A live API outage, deploy, or `curl` blip must not fail a typo-fix PR or block CalVer release. The live spec reaches the pack through [API sync](#api-sync) PRs. To compare your branch to the live spec directly:

```bash
npm run check:surfaces:live
```

The inventory is **Bearer-only**. Session/product-app ops (`/v1/auth/*`, `/v1/account/*`) declare no bearer security and are out of scope, and operator routes (`/v1/admin/*`, tagged `admin`) are skipped even when the spec gives them bearer security. `GET /v1/credentials` (`list_credentials`) is in scope. `npm run check:surfaces` in this repo uses the same Bearer-only rule as the live API inventory.

`endpoint-map-*` is route-only. Provider ids (`leadmagic`, `prospeo`, …) live in `providers.yaml`. When KingMinos adds a BYOK vendor, add it there first, then to every credentials / company-resolve / README / CONVENTIONS / SECURITY BYOK list, path-`provider` enum, and `*_credentials_required` list. `provider-enum` fails CI if a list is short.

The API, product app, and hosted MCP changes for a new vendor land first in the KingMinos service code (the cross-service rollout checklist is maintained there). This repo only takes the `providers.yaml`, skill-copy, and version-bump update above.

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
8. Teach only Bearer resource operations that `GET https://api.kingminos.com/openapi.yaml` exposes today. Those operations belong in `skills/api/references/endpoints.md` (METHOD /path → snake_case tool). Do not invent endpoints or tools outside that map. Do not add session/product-app ops or `/v1/admin/*` operator routes. `npm run check:surfaces` (fixture) must stay green.
9. When KingMinos adds a credentials / BYOK provider, add it to `scripts/validate/fixtures/providers.yaml` before listing it in skills. The OpenAPI fixture's path-`provider` enum comes from the live spec through [API sync](#api-sync); don't edit the fixture by hand. `provider-enum` fails if a BYOK list, path enum, or `*_credentials_required` line is short.

## API sync

The `API sync` workflow (`.github/workflows/api-sync.yml`) keeps the pack in step with the live API. Every 6 hours (or from the Actions tab) it fetches `https://api.kingminos.com/openapi.json` and compares it, canonicalised with `jq -S .`, to `api-sync/openapi.snapshot.json`. When the spec changed it:

1. regenerates `scripts/validate/fixtures/openapi-inventory.yaml` from the live spec (`scripts/openapi-inventory.mjs`);
2. has a Cursor CLI agent (Grok, `.github/prompts/api-sync.md`) update the API map, the trimmed copies, the affected skills with `metadata.version` bumps, `providers.yaml` when the credentials `provider` enum changed, and `## Unreleased` in the CHANGELOG. The agent never creates a skill: a new capability operation gets a map row and a "New capability skill needed" note;
3. writes the new snapshot, runs `npm run validate -- --base origin/main` and `npm test`, and opens or updates a `chore(api): sync skills pack with KingMinos OpenAPI (<hash>)` PR on `chore/api-sync` with the agent's notes and the check results.

The agent and the checks run in a `propose` job with a read-only token; a separate `open-pr` job runs no repo code, applies the resulting patch after checking it only touches those paths, and opens the PR. A human reviews and merges every sync PR. The PR is opened with `RELEASE_PR_TOKEN` when that secret is set, so `validate` runs on it; without it, close and reopen the PR to run `validate`. Release, CHANGELOG promotion and the kingminos.com mirror follow the merge automatically. The first run has no snapshot, so it audits the whole pack (bootstrap) and adds one.

The `api-sync-snapshot` validate rule fails when the fixture isn't exactly what the snapshot renders, so don't edit either by hand (`npm run openapi:fixture` refreshes the fixture from the snapshot). Until the first sync PR merges it only warns. The agent needs the `CURSOR_API_KEY` org secret (model: `CURSOR_MODEL` repository variable, default `grok-4.7-high`); without it the PR still opens with the generated files, and you update the skills by hand.

## Versioning

- **Skills:** bump `metadata.version` in a skill's frontmatter whenever any file in its folder changes. Minor for new behavior or output changes, patch for fixes and wording. CI enforces a bump on PRs.
- **Pack:** releases are CalVer tags `YYYY.MM.DD.N`, created automatically after hermetic Validate passes on `main`. Preview the next release with `npm run release:preview`.
- **Distribution:** `npx skills add outboundsync/kingminos-skills` installs from `main`, so a merge is live for new installs immediately. There is no npm package; don't add one.

## Changelog promotion

Automatic. On each release, `release-calver.yml` runs `release-calver.mjs --apply`, which moves the curated `## Unreleased` lines under `## [YYYY.MM.DD.N] - YYYY-MM-DD`, then publishes the tag and GitHub release. Because `main` is protected (required `validate`, no bot pushes), the workflow lands the CHANGELOG change through a short-lived PR (`chore(release): CHANGELOG for <tag>`, `scripts/release-changelog-pr.sh`). GitHub does not run CI on PRs opened with the default `GITHUB_TOKEN`, so the workflow opens the PR with the repository secret `RELEASE_PR_TOKEN` when it is set: a long-lived token limited to this repository with Contents and Pull requests read/write, such as a fine-grained personal access token. A GitHub App installation token can't be stored as this secret because it expires after an hour. The PR's own `pull_request` run provides the required `validate` check, and the workflow squash-merges the PR with `GITHUB_TOKEN` once GitHub reports it mergeable. Without that secret, a maintainer closes and reopens the bot PR to run `validate`, then squash-merges it with the default title. An empty `## Unreleased` changes nothing, and the promotion commit never cuts another release. Contributors only add lines under `## Unreleased`; do not hand-edit release sections. If the bot PR fails (for example, it conflicts with a newer commit on `main`), move that tag's lines by hand in a normal PR.

## After merging

Nothing to do by hand for the skills themselves. A merge to `main` is live right away for `npx skills add outboundsync/kingminos-skills`. Within 6 hours, the `Skills mirror sync` workflow in `outboundsync/kingminos-website` copies the pack into `https://kingminos.com/.well-known/skills/`, has a Cursor CLI agent (Grok) update `/docs/skills/` (`src/content/docs/docs/skills/index.mdx`), and opens a `chore(skills): sync mirror and docs` PR. Close and reopen that PR to run `check`, then merge it. To sync sooner, run that workflow from the website repo's Actions tab. API docs pages under `/docs/api/` are not synced; update them in the website repo when an endpoint changes. The live API contract stays at `https://api.kingminos.com/openapi.yaml` (JSON twin: `/openapi.json`).
