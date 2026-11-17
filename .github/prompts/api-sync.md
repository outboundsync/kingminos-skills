# Update the KingMinos skills pack after a KingMinos API change

You run inside the `API sync` workflow. The live KingMinos OpenAPI spec (`https://api.kingminos.com/openapi.json`) no longer matches `api-sync/openapi.snapshot.json`. Your job is to bring the skills in line with the live spec. A later step writes the new snapshot, runs the checks, commits the result and opens a pull request that a human reviews and merges.

## What changed

The run message tells you the mode and where the live spec is (canonical JSON, `jq -S .`, under `$RUNNER_TEMP`). If your file reader can't open that path, query it with `jq`.

- The workflow has already regenerated `scripts/validate/fixtures/openapi-inventory.yaml` from the live spec. `git diff -- scripts/validate/fixtures/openapi-inventory.yaml` shows added and removed Bearer resource operations, `operationId` changes and changes to the credentials `provider` enum.
- **Update mode:** `api-sync/openapi.snapshot.json` is the previous spec. `git diff --no-index -- api-sync/openapi.snapshot.json <live spec>` shows every change, including request fields, enums, response fields and descriptions. Both files are sorted the same way, so the diff is meaningful. Use `jq` to read one operation, for example `jq '.paths["/v1/person/phone"].post' <file>`.
- **Bootstrap mode:** there is no previous snapshot. This is the first run, and the pack may have drifted in any way. Audit every skill that teaches an API operation against the live spec. The fixture diff is noisy in this mode because the generated file replaces a hand-written one. Compare routes, tools and the provider enum, not formatting.
- `npm run validate -- --base origin/main` reports what the checks see. Run it first.

## What to update

Only edit these files:

- `skills/api/references/endpoints.md`: the pack's REST ↔ tool map. One row per OpenAPI **Bearer resource operation**: `| \`METHOD /path\` | \`tool\` | R/W | notes |`. Add rows for new operations, remove rows for removed ones, and rename the tool when an `operationId` changes. Write the notes from the spec only (summary, description, required fields, paths/tiers, errors). A new operation without a dedicated skill ends its notes with `→ \`api\` (no dedicated skill).`
- The trimmed copies of those rows in other skills (`skills/<name>/references/endpoints.md`, and REST/tool tables or `· Inventory:` lines inside `SKILL.md`). `endpoint-map-consistent` requires them to match the map.
- Capability skills whose operation changed: `skills/<name>/SKILL.md` and its `references/`. Update request fields, enums, response fields, paths/tiers, errors, prices and examples to what the live spec says. Keep each skill's structure and output contract.
- `metadata.version` in the frontmatter of every `SKILL.md` whose folder you changed. Minor for new behavior or output changes, patch for fixes and wording (CONTRIBUTING.md, "Versioning"). `version-bumped` fails without it.
- `scripts/validate/fixtures/providers.yaml`, only when the spec's `/v1/credentials/{provider}` enum changed:
  - **Added id:** add an entry (`id`, `label`, `supply`, `credentials_required`, `path_enum`, `api_key`) following the comments at the top of the file and the spec's parameter description. Then add the id to every BYOK list, path-`provider` enum and `*_credentials_required` list under `skills/` that `provider-enum` reports. Say in your summary which fields you inferred, so a human can confirm them.
  - **Removed id:** don't delete the entry. Set `path_enum: false`, remove the id from path-`provider` enum lists under `skills/`, and say in your summary that a human must confirm the removal, because it may be a spec mistake.
- `README.md`, `CONVENTIONS.md` and `SECURITY.md`: only the BYOK / house-key provider lists that `provider-enum` checks, after a provider change. Edit nothing else in these files.
- `CHANGELOG.md`: add lines under `## Unreleased` only, in the style of the existing entries (``- `<skill>` skill <new version>: <what changed>.``). Never change a released `## [YYYY.MM.DD.N]` section.

Do not edit:

- `scripts/validate/fixtures/openapi-inventory.yaml` or anything under `api-sync/`. The workflow generates them.
- Any other file under `scripts/`, `test/`, `templates/` or `.github/`, `package.json`, `package-lock.json`, `CONTRIBUTING.md` or `DISCLAIMER.md`, and anything in `README.md`, `CONVENTIONS.md` or `SECURITY.md` other than those provider lists. If one of them needs a change, leave it and name the file and line in your summary.
- Don't create a new skill folder. When a new capability operation appears (a new `POST /v1/<subject>/<capability>`), add its map row and say `New capability skill needed: <METHOD /path> (<tool>)` in your summary.

## Rules

- Read `CONTRIBUTING.md`, `CONVENTIONS.md` and `SECURITY.md` first and follow them. Write **KingMinos** (one word) and **SFDC** or **Salesforce**, never **SF**. Put template URLs in inline code, never as links.
- Teach only Bearer resource operations. Out of scope, never added to the map: session/product-app routes (`/v1/auth/*`, `/v1/account/*`), operator routes (`/v1/admin/*` or tagged `admin`), operations with no `bearer` security (for example `GET /v1/billing`, public `GET /v1/recipes/guidance`), and discovery (`/health`, `/openapi.yaml`, `/openapi.json`, `/v1/openapi.*`).
- Tool names are snake_case of the `operationId`: every capital after the first character starts a word (`companyXAccount` → `company_x_account`, `getBalanceLedger` → `get_balance_ledger`).
- Describe only what the live spec says. Never invent endpoints, tools, fields, enums, prices, providers or behavior. When the spec is ambiguous, keep the existing wording and say so in your summary.
- If a change only touches wording that doesn't change what a skill user would do, change nothing.
- Use illustrative data (`example.com`) in examples, never a real customer's.
- Write only Markdown and YAML files. Never create or edit scripts, JSON or code files anywhere.
- Don't commit, push, create branches or open pull requests.
- When you're done, run `npm run validate -- --base origin/main` and `npm test`, and fix what they report in files you may edit. If a failure needs a file you may not edit, leave it and explain it in your summary.
- End your last message with a line that starts `Summary:`, followed by a short plain-text summary: which operations changed in the spec, which files and skills you changed (with the new versions) and why, any `New capability skill needed:` lines, provider fields to confirm, files you could not edit, and anything a human should check. The workflow puts it in the pull request.
