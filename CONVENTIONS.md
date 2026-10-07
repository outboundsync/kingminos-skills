# Skill output conventions

How KingMinos Agent Skills render their output. **New skills follow these by default** so the pack reads as one system. Security and write behavior live in [SECURITY.md](SECURITY.md) (see the Write-on-confirm protocol); this file covers presentation.

## Brand

- Written product: **KingMinos** (one word). Spoken name: **King Minos** (two words).
- Byline: **KingMinos by OutboundSync**.
- This pack teaches the enrichment API at `https://api.kingminos.com`. It is not the OutboundSync CRM / sequencer skills pack.
- Write **SFDC** or **Salesforce**. Never the abbreviation **SF**.
- LeadMagic, Wiza, Findymail, and AIArk are house-key vendors (tenant Your Keys optional). ZoomInfo, BuiltWith, Prospeo, Apollo, Company URL Finder, People Data Labs, and HG Insights are BYOK. House AI Ark is on the default `company.b2b_social` `balance` / `accuracy` stacks; BYOK ZoomInfo LinkedIn uses `company_linkedin_enrich` via `routing.only`. `websearch` is house-only. Hosted MCP: `https://mcp.kingminos.com` (same Bearer tool inventory as REST).

## Shared visual language

Every output-producing skill renders **GitHub-flavored markdown only**, terminal-friendly:

- **Marks:** `✓` pass · `✗` fail/blocker · `·` advisory/warning. A check that could not be confirmed is a `·` line that says `UNVERIFIED — ` (the lookup failed) or `manual — ` (no API exists for it). Never a silent pass, and never an empty result.
- **Mark first.** Every status bullet starts with its mark: `- ✓ Bearer accepted`, not `- Bearer: ✓`. Sub-marks inside a `·` advisory are fine.
- **No colored emoji, no ASCII boxes.** The only "graphics" are monospace **block glyphs** (`█` `░` `▒`) inside fenced `text` blocks or table cells.
- **Blank line between blocks;** one status line per `-` bullet; never two marks on one line.
- Output-producing skills declare an **`## Output contract`** with a fenced **`### Shape`** template, and render only that shape — no prose outside it.

## Status layout — required for readiness, health, and audit skills

Any skill that answers "is this ready / authenticated / set up correctly?" renders the **status layout**. `auth` is the reference implementation; `credentials` uses it too; `company-resolve` uses its card grammar for the decision.

1. **The `##` heading is the verdict**, not the skill name: `## Authentication ready`, `## Company resolve — resolved`, `## Credentials — BYOK required`. Compute the verdict; never print the verdict logic.
2. **A fenced `text` gauge follows immediately** — the glance layer:
   - One `Overall` row, then one row per system or item. Pad labels so every bar starts in the same column.
   - Bars are **20 cells**: `█` passed gate · `░` failed gate · `▒` unverified or manual. Filled = `round(passed / total × 20)`. A wholly unverified row is 20 `▒`.
   - Each row ends with `<✓|✗|·> <ready | p/t | unverified — hint>`.
   - Overall ends with `<p>/<t> · <ready|not ready>[ · <n> manual][ · unverified]`.
3. **`###` cards carry the detail**, one per system, in the gauge's order. Under each heading, one backtick **context line** identifies what was checked (`` `https://api.kingminos.com · Bearer` ``, `` `run abc123 · path auto` ``). Then mark-first bullets, one check per line.
4. **`### Next`** — numbered, shortest actions first, present only when something needs action. Every item maps to a `✗`, an `UNVERIFIED`, or an actionable `·` line above it. A full URL or command goes on its own line in inline code under the step that needs it.
5. **Failures are data.** An auth error, 4xx/5xx, timeout, or a non-JSON body renders as `· UNVERIFIED — <reason>` with the status code when there is one — never as "none found", `false`, or `0`. Business misses on `POST /v1/company/resolve` stay HTTP 200 and use `answer.outcome` / `es_decision`, not UNVERIFIED.

```text
Overall        █████████████░░░░░░░  2/3 · not ready

Key            ████████████████████  ✓ ready
Bearer         ████████████████████  ✓ ready
Capabilities   ░░░░░░░░░░░░░░░░░░░░  ✗ 0/1
```

`npm run validate` checks every bar's width and fill (`bar-geometry`).

**Examples are part of the contract.** Every status-layout skill ships a `references/examples.md` with rendered outputs covering at least a passing state, a failing state, and an UNVERIFIED state. Use illustrative data (`example.com`), never a real customer's.

**API facts live in each skill.** Keep a trimmed `references/endpoints.md` inside the skill folder (`npx skills add` installs one folder, so links between skill folders break). The pack's canonical REST ↔ tool map is [`skills/api/references/endpoints.md`](skills/api/references/endpoints.md) — one row per OpenAPI **Bearer** resource operation. Session/product-app ops are out of scope. Trimmed copies must match it (`endpoint-map-consistent`); the map must match the KingMinos Bearer OpenAPI inventory (`endpoint-map-openapi`). BYOK / path-`provider` / `*_credentials_required` lists must match [`scripts/validate/fixtures/providers.yaml`](scripts/validate/fixtures/providers.yaml) (`provider-enum`).

**Adding a BYOK vendor (maintainers):** follow [`docs/byok-provider-playbook.md`](docs/byok-provider-playbook.md) (mirrored in application, website, and mcp) or the Cursor skill [`.cursor/skills/byok-provider-rollout/SKILL.md`](.cursor/skills/byok-provider-rollout/SKILL.md).

## Score meter — required for any skill that scores or rates

Any skill that produces a numeric score, rating, or lever breakdown **must lead that section with a compact meter**. KingMinos v1 skills use the [status layout](#status-layout--required-for-readiness-health-and-audit-skills) instead of scores.

**Glyphs:** `█` filled · `░` empty (monospace only).

**Bar width by scale:**

| Scale | Width | Fill |
| --- | --- | --- |
| `/5` (levers) | 5 | `█`×n, then `░` to 5 |
| `/20` | 10 | `█`×round(n/20×10), then `░` to 10 |
| `/100` | 20 | `█`×round(n/100×20), then `░` to 20 |

## Disclaimer note

Every skill carries this note directly after its opening paragraph. The link is absolute because `npx skills add` installs a single skill folder, so relative `../../` links break after install:

```markdown
**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).
```

## Frontmatter & naming

Checked by `npm run validate` (rules `frontmatter`, `metadata`, `description-style`; see [CONTRIBUTING.md](CONTRIBUTING.md)):

- `name:` must equal the folder name; `description:` present and non-empty.
- `description` style: **verb-led** first word, then a sentence beginning "Use when the user asks…" listing concrete trigger phrases. Account-free skills end the description with "No KingMinos API key."
- Include `license: MIT` and `metadata:` (`author: outboundsync`, `version`). Add `compatibility:` when the skill needs `KINGMINOS_API_KEY` or `https://api.kingminos.com`.
