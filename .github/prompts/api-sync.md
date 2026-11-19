# Update the KingMinos skills pack after a KingMinos API change

You run inside the `API sync` workflow. The live KingMinos OpenAPI spec (`https://api.kingminos.com/openapi.json`) no longer matches `api-sync/openapi.snapshot.json`. Your job is to bring the skills in line with the live spec. A later step writes the new snapshot, runs the checks, commits the result and opens a pull request that a human reviews and merges.

## What changed

The run message tells you the mode and where the live spec is (canonical JSON, `jq -S .`, under `$RUNNER_TEMP`). If your file reader can't open that path, query it with `jq`.

- The workflow has already regenerated `scripts/validate/fixtures/openapi-inventory.yaml` and `skills/api/references/pricing.md` (the pack's only list of credit prices, from each operation's `x-kingminos-pricing` block) from the live spec. `git diff -- skills/api/references/pricing.md` shows which prices changed.
- `git diff -- scripts/validate/fixtures/openapi-inventory.yaml` shows added and removed Bearer resource operations, `operationId` changes and changes to the credentials `provider` enum.
- **Update mode:** `api-sync/openapi.snapshot.json` is the previous spec. `git diff --no-index -- api-sync/openapi.snapshot.json <live spec>` shows every change, including request fields, enums, response fields and descriptions. Both files are sorted the same way, so the diff is meaningful. Use `jq` to read one operation, for example `jq '.paths["/v1/person/phone"].post' <file>`.
- **Bootstrap mode:** there is no previous snapshot. This is the first run, and the pack may have drifted in any way. Audit every skill that teaches an API operation against the live spec. The fixture diff is noisy in this mode because the generated file replaces a hand-written one. Compare routes, tools and the provider enum, not formatting.
- `npm run validate -- --base origin/main` reports what the checks see. Run it first.

## What to update

Only edit these files:

- `skills/api/references/endpoints.md`: the pack's REST ↔ tool map. One row per OpenAPI **Bearer resource operation**: `| \`METHOD /path\` | \`tool\` | R/W | notes |`. Add rows for new operations, remove rows for removed ones, and rename the tool when an `operationId` changes. Write the notes from the spec only (summary, description, required fields, paths/tiers, errors). A new operation without a dedicated skill ends its notes with `→ \`api\` (no dedicated skill).`
- The trimmed copies of those rows in other skills (`skills/<name>/references/endpoints.md`, and REST/tool tables or `· Inventory:` lines inside `SKILL.md`). `endpoint-map-consistent` requires them to match the map.
- Capability skills whose operation changed: `skills/<name>/SKILL.md` and its `references/`. Update request fields, enums, response fields, paths/tiers, errors and examples to what the live spec says. Never prices: see "Prices" below. Keep each skill's structure and output contract.
- `metadata.version` in the frontmatter of every `SKILL.md` whose folder you changed, and of `skills/api/SKILL.md` (patch) whenever `git diff -- skills/api/references/pricing.md` is not empty, with a CHANGELOG line saying the pricing reference was regenerated. Minor for new behavior or output changes, patch for fixes and wording (CONTRIBUTING.md, "Versioning"). `version-bumped` fails without it.
- `scripts/validate/fixtures/providers.yaml`, only when the spec's `/v1/credentials/{provider}` enum changed:
  - **Added id:** add an entry (`id`, `label`, `supply`, `credentials_required`, `path_enum`, `api_key`) following the comments at the top of the file and the spec's parameter description. Then add the id to every path-`provider` enum, API-key id list and `*_credentials_required` list under `skills/` that `provider-enum` reports. Never add a vendor name to prose: public text does not list house-key or BYOK vendors by name or state a path's vendor order (`no-vendor-lists` fails the PR); contract ids stay in inline code. Say in your summary which fields you inferred, so a human can confirm them.
  - **Removed id:** don't delete the entry. Set `path_enum: false`, remove the id from path-`provider` enum lists under `skills/`, and say in your summary that a human must confirm the removal, because it may be a spec mistake.
- `CHANGELOG.md`: add lines under `## Unreleased` only, in the style of the existing entries (``- `<skill>` skill <new version>: <what changed>.``). Never change a released `## [YYYY.MM.DD.N]` section.

Do not edit:

- `scripts/validate/fixtures/openapi-inventory.yaml`, `skills/api/references/pricing.md` or anything under `api-sync/`. The workflow generates them and overwrites any edit.
- Any other file under `scripts/`, `test/`, `templates/` or `.github/`, `package.json`, `package-lock.json`, `CONTRIBUTING.md` or `DISCLAIMER.md`, `README.md`, `CONVENTIONS.md` or `SECURITY.md`. If one of them needs a change, leave it and name the file and line in your summary.
- Don't create a new skill folder. When a new capability operation appears (a new `POST /v1/<subject>/<capability>`), add its map row and say `New capability skill needed: <METHOD /path> (<tool>)` in your summary.

## Prices

You never write a credit price. Prices come from the API code through the spec's `x-kingminos-pricing` blocks into the generated `skills/api/references/pricing.md`, and nowhere else.

- Don't type a non-zero credit amount for a capability path in any skill file, the README or the CHANGELOG: no cap, delivered price or range, BYOK fee, ceiling, hop price or `est_credits` value. That includes a number before "credit(s)", after "cap", near bill / cost / price / charge, or in a credits / cap / price / cost table column. The `no-hand-typed-prices` rule fails the PR when you do.
- When a capability's prices change, change nothing in the skill: the regenerated reference already carries them. When a skill needs to say what something costs, write the billing rule (a miss bills 0, winner-only, outcome- or hop-priced, BYOK bills a flat fee) and point to "the `api` skill's pricing reference" (`api/references/pricing.md`).
- A price in a skill that disagrees with the spec is not a spec conflict to keep: remove the number and point to the reference, and say so in your summary.

## Rules

- **The spec can be wrong.** Never delete a specific fact from the docs (a number, limit, threshold, status code, version or retry schedule; prices are the exception, see "Prices") just because the spec does not mention it. When the docs and the spec disagree on a fact that the spec diff did not change (in bootstrap mode, every fact), keep the docs as they are and list the conflict in your summary under `Spec conflicts to check:` (what the docs say, what the spec says, and where). Change such a fact only when the snapshot diff itself changed it.
- Read `CONTRIBUTING.md`, `CONVENTIONS.md` and `SECURITY.md` first and follow them. Write **KingMinos** (one word) and **SFDC** or **Salesforce**, never **SF**. Put template URLs in inline code, never as links.
- Teach only Bearer resource operations. Out of scope, never added to the map: session/product-app routes (`/v1/auth/*`, `/v1/account/*`), operator routes (`/v1/admin/*` or tagged `admin`), operations with no `bearer` security (for example `GET /v1/billing`, public `GET /v1/recipes/guidance`), and discovery (`/health`, `/openapi.yaml`, `/openapi.json`, `/v1/openapi.*`).
- Tool names are snake_case of the `operationId`: every capital after the first character starts a word (`companyXAccount` → `company_x_account`, `getBalanceLedger` → `get_balance_ledger`).
- Describe only what the live spec says. Never invent endpoints, tools, fields, enums, providers or behavior, and never write prices (see "Prices"). When the spec is ambiguous, keep the existing wording and say so in your summary.
- If a change only touches wording that doesn't change what a skill user would do, change nothing.
- Use illustrative data (`example.com`) in examples, never a real customer's.
- Write only Markdown and YAML files. Never create or edit scripts, JSON or code files anywhere.
- Don't commit, push, create branches or open pull requests.
- When you're done, run `npm run validate -- --base origin/main` and `npm test`, and fix what they report in files you may edit. If a failure needs a file you may not edit, leave it and explain it in your summary.
- End your last message with a line that starts `Summary:`, followed by a short plain-text summary: which operations changed in the spec, which files and skills you changed (with the new versions) and why, any `New capability skill needed:` lines, provider fields to confirm, files you could not edit, any `Spec conflicts to check:`, and anything a human should check. The workflow puts it in the pull request.
