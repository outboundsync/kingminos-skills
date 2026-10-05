# KingMinos Agent Skills

Public [Agent Skills](https://agentskills.io) for **KingMinos by OutboundSync** — installable with [`npx skills`](https://github.com/vercel-labs/skills) in **Cursor**, **Claude Code**, and **Codex**.

Say **King Minos** out loud. Write **KingMinos**. This pack teaches the live enrichment API at [`https://api.kingminos.com`](https://api.kingminos.com) (`GET /health` returns `kingminos-api-prod`; contract: `GET /openapi.yaml`, also `/openapi.json`).

**This is not the OutboundSync CRM / sequencer skills pack.** That sister repository is [`outboundsync/skills`](https://github.com/outboundsync/skills). Do not install this pack expecting launch preflight, sync monitoring, or cold-email copy. KingMinos decides company identity and vendor credentials; OutboundSync syncs sequencer events into the CRM.

The pack ships **4** skills.

**Output style.** Every skill renders a fixed, terminal-friendly Markdown shape. Readiness checks (`auth`, `credentials`) and `company-resolve` lead with a verdict and a `█░▒` status gauge, then one card per system and a `Next` list. A failed lookup always shows as `UNVERIFIED`, never as a pass or an empty result. Business misses on `company.resolve` stay HTTP 200 and use `answer.outcome` / `es_decision`. See [CONVENTIONS.md](CONVENTIONS.md) and each skill's `references/examples.md`.

### Enrichment API

| Skill | Path | Needs API key? | What it does |
| --- | --- | --- | --- |
| `api` | [`skills/api/`](skills/api/) | Yes (`KINGMINOS_API_KEY`) | KingMinos REST ↔ tool inventory (`skills/api/references/endpoints.md`): one row per OpenAPI Bearer resource operation; routes to `auth`, `company-resolve`, `credentials` |
| `auth` | [`skills/auth/`](skills/auth/) | Yes (`KINGMINOS_API_KEY`) | Bearer auth against `https://api.kingminos.com`, 401 `missing` / `malformed` / `mismatch`, SFDC Named Credential Custom Headers, `GET /v1/capabilities` |
| `company-resolve` | [`skills/company-resolve/`](skills/company-resolve/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/resolve` — email/domain/website in, one `answer` back; honor `answer.safe_to_write` for stamp/fill |
| `credentials` | [`skills/credentials/`](skills/credentials/) | Yes (`KINGMINOS_API_KEY`) | List Your Keys via `GET /v1/credentials`; revoke after confirm. Store secrets at `https://app.kingminos.com`. LeadMagic is house-key by default; Findymail, ZoomInfo, Wiza, AIArk, BuiltWith are BYOK |

Hosted MCP is **not shipped**. Prefer REST. Tool names in the `api` map are the OpenAPI Bearer resource inventory (snake_case `operationId`). Session/product-app ops are out of scope. Do not invent a host or tools outside that map.

## Install (primary — Cursor, Claude Code, Codex)

Same installer as the OutboundSync skills pack — different GitHub repo, different skill names:

```bash
# KingMinos enrichment (needs KINGMINOS_API_KEY)
npx skills add outboundsync/kingminos-skills --skill api -g
npx skills add outboundsync/kingminos-skills --skill auth -g
npx skills add outboundsync/kingminos-skills --skill company-resolve -g
npx skills add outboundsync/kingminos-skills --skill credentials -g
```

The Skills CLI detects the harness (Cursor, Claude Code, Codex, and others). Add `-a claude-code`, `-a codex`, or `-a cursor` only when you want to force a target. OpenClaw global install is the same CLI with `-a openclaw -g`.

Try without installing:

```bash
npx skills use outboundsync/kingminos-skills --skill api
npx skills use outboundsync/kingminos-skills --skill auth
npx skills use outboundsync/kingminos-skills --skill company-resolve
npx skills use outboundsync/kingminos-skills --skill credentials
```

## Credentials

Mint a personal access token at [`https://app.kingminos.com`](https://app.kingminos.com) (workspace owner → tokens). It is shown once, starts with `km_`, is scoped to explicit capabilities (not `*`), and has a daily credit cap (default 100). Set it before live calls. **Never print, log, or commit the API key.**

```bash
export KINGMINOS_API_KEY=...
```

Or put the same variable in a gitignored `.env` (see [`.env.example`](.env.example)).

- Header: `Authorization: Bearer $KINGMINOS_API_KEY` only. A bare key is `401` `detail: malformed`.
- Public, no auth: `GET /health` (`{"ok":true,"service":"kingminos-api-prod"}`) and `GET /openapi.yaml` (also `/v1/openapi.yaml`, `/openapi.json`, `/v1/openapi.json`).
- Authenticated catalog: `GET /v1/capabilities`, `GET /v1/providers`, `GET /v1/credentials`.
- `403` `scope_denied` = the token lacks this capability scope. `429` `key_budget_exhausted` = the token's daily credit cap was hit.
- SFDC Named Credential / Custom auth: Auth Parameters do **not** leave SFDC. Add a Custom Header named `Authorization` (Allow Formulas ON if the value is a formula).

**Vendor Your Keys** (not the KingMinos Bearer token) — store them in the app UI. **Never paste a vendor secret into chat.**

| Vendor | How the key is supplied |
| --- | --- |
| LeadMagic | House-key by default (OutboundSync-provided). Tenant store is optional, not required. |
| Findymail | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| ZoomInfo | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Wiza | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| AIArk | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| BuiltWith | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| websearch | House-only. `PUT` is `byok_not_supported`. |

`GET /v1/credentials` lists `status` (`set` \| `managed` \| `unset`) and never echoes the raw vendor key.

## Security

- Skills are **read-only by default** — see [SECURITY.md](SECURITY.md).
- `credentials` lists Your Keys; it may revoke (`DELETE`) **only after explicit confirmation**. Store secrets at `https://app.kingminos.com`.
- `DELETE /v1/subjects/{subject_key}` (`delete_subject`) exists on the live API (`erase` scope) and is **not** called from these skills.
- Never re-echo vendor secrets. Never paste a vendor secret into chat.

## Disclaimer

These skills reflect KingMinos by OutboundSync practices, shared freely and without warranty of outcomes. Guidance may change; the live OpenAPI wins. See [DISCLAIMER.md](DISCLAIMER.md).

## Maintainers

See [CONTRIBUTING.md](CONTRIBUTING.md) for adding or changing a skill. New skills follow [CONVENTIONS.md](CONVENTIONS.md). Validate before pushing (Node 22+):

```bash
npm ci
npm run validate
npm test
```

## Releases & Changelog

Releases are created automatically after hermetic Validate skill integrity passes on `main` via `.github/workflows/release-calver.yml`. Live OpenAPI drift is a scheduled job and does not block release.

- Versioning format: `YYYY.MM.DD.N` (CalVer). Each skill also has its own `metadata.version`.
- Release notes: [GitHub Releases](https://github.com/outboundsync/kingminos-skills/releases), generated from commit subjects.
- Curated changelog: [CHANGELOG.md](CHANGELOG.md).

To preview the next release locally:

```bash
npm run release:preview
```

## Related

- Live OpenAPI: https://api.kingminos.com/openapi.yaml (JSON: https://api.kingminos.com/openapi.json)
- Live health: https://api.kingminos.com/health
- Sister pack (CRM / sequencer, not enrichment): https://github.com/outboundsync/skills

## License

[MIT](LICENSE)
