# Contributing

This repo is the source of truth for the **KingMinos by OutboundSync** Agent Skills. Each skill is a folder `skills/<name>/` holding a `SKILL.md` and optional `references/`. The skills ship only Markdown and YAML; `scripts/`, `test/`, and `package.json` are maintainer tooling and are never installed.

This is not the OutboundSync CRM / sequencer skills pack. Do not copy product skills from [outboundsync/skills](https://github.com/outboundsync/skills). Match that repo's **layout, frontmatter, validator, and `npx skills` packaging** — write KingMinos enrichment content only.

Say **KingMinos** in writing. Say **King Minos** out loud. Write **SFDC** or **Salesforce**, never the abbreviation **SF**.

## Prerequisites

- Node.js 22 or newer
- `npm ci` once after cloning

## Check your change

```bash
npm run validate                          # every rule, all problems in one run
npm run validate -- --base origin/main    # also require version bumps (what CI runs on PRs)
npm test                                  # validator + release tooling tests
```

Run `npm run validate -- --list` to see every rule with its severity. Rules and their rationale live in `scripts/validate/rules/`, one file each; severities are in `scripts/validate/config.json`. A rule at `warn` is new and is being rolled out; it becomes an error once every skill complies.

## Add a skill

1. Copy [`templates/SKILL.template.md`](templates/SKILL.template.md) to `skills/<name>/SKILL.md`. The folder name and the `name:` field must match (lowercase kebab-case).
2. Write the description: open with a verb, include "Use when the user asks…" with concrete trigger phrases, and end account-free skills with "No KingMinos API key."
3. Follow [CONVENTIONS.md](CONVENTIONS.md) for output: an `## Output contract` with a `### Shape`, the marks legend, and the status layout for readiness or health checks.
4. Keep every link inside the skill folder or absolute. `npx skills add` installs one folder, so `../../` links break.
5. If the skill writes to KingMinos, add a `## Mutations` section naming each REST call, note that KingMinos MCP is not shipped, and follow the [write-on-confirm protocol](SECURITY.md#write-on-confirm-protocol).
6. Add the skill to every README list: the count, its category table, the install commands, and the "try without installing" commands.
7. Add a line under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md).
8. Teach only what `GET https://api.kingminos.com/openapi.yaml` exposes today. Do not invent MCP tools.

## Versioning

- **Skills:** bump `metadata.version` in a skill's frontmatter whenever any file in its folder changes. Minor for new behavior or output changes, patch for fixes and wording. CI enforces a bump on PRs.
- **Pack:** releases are CalVer tags `YYYY.MM.DD.N`, created automatically after Validate passes on `main`. Preview the next release with `npm run release:preview`.

## After merging

Refresh any public mirror or docs page that lists these skills when a skill's output or triggers change. The live API contract stays at `https://api.kingminos.com/openapi.yaml`.
