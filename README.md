# KingMinos Agent Skills

Public [Agent Skills](https://agentskills.io) for **KingMinos by OutboundSync** — installable with [`npx skills`](https://github.com/vercel-labs/skills) in **Cursor**, **Claude Code**, and **Codex**.

Say **King Minos** out loud. Write **KingMinos**. This pack teaches the live enrichment API at [`https://api.kingminos.com`](https://api.kingminos.com) (`GET /health` returns `kingminos-api-prod`; contract: `GET /openapi.yaml`).

**This is not the OutboundSync CRM / sequencer skills pack.** That sister repository is [`outboundsync/skills`](https://github.com/outboundsync/skills). Do not install this pack expecting launch preflight, sync monitoring, or cold-email copy. KingMinos decides company identity and vendor credentials; OutboundSync syncs sequencer events into the CRM.

The pack ships **3** skills.

**Output style.** Every skill renders a fixed, terminal-friendly Markdown shape. Readiness checks (`auth`, `credentials`) and `company-resolve` lead with a verdict and a `█░▒` status gauge, then one card per system and a `Next` list. A failed lookup always shows as `UNVERIFIED`, never as a pass or an empty result. Business misses on `company.resolve` stay HTTP 200 and use `answer.outcome` / `es_decision`. See [CONVENTIONS.md](CONVENTIONS.md) and each skill's `references/examples.md`.

### Enrichment API

| Skill | Path | Needs API key? | What it does |
| --- | --- | --- | --- |
| `auth` | [`skills/auth/`](skills/auth/) | Yes (`KINGMINOS_API_KEY`) | Bearer auth against `https://api.kingminos.com`, 401 `missing` / `malformed` / `mismatch`, SFDC Named Credential Custom Headers, `GET /v1/capabilities` |
| `company-resolve` | [`skills/company-resolve/`](skills/company-resolve/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/resolve` — email/domain/website in, one `answer` back; stamp ZoomInfo company id only on `es_decision=hit` |
| `credentials` | [`skills/credentials/`](skills/credentials/) | Yes (`KINGMINOS_API_KEY`) | House vs BYOK policy and `PUT`/`DELETE /v1/credentials/{provider}` (write-on-confirm). LeadMagic is house-key; Findymail, ZoomInfo, Wiza, AIArk, BuiltWith are BYOK |

KingMinos MCP is **not shipped**. Prefer REST. If a hosted MCP later answers, use it only after `auth` confirms the URL; do not invent tool names.

## Install (primary — Cursor, Claude Code, Codex)

Same installer as the OutboundSync skills pack — different GitHub repo, different skill names:

```bash
# KingMinos enrichment (needs KINGMINOS_API_KEY)
npx skills add outboundsync/kingminos-skills --skill auth -g
npx skills add outboundsync/kingminos-skills --skill company-resolve -g
npx skills add outboundsync/kingminos-skills --skill credentials -g
```

The Skills CLI detects the harness (Cursor, Claude Code, Codex, and others). Add `-a claude-code`, `-a codex`, or `-a cursor` only when you want to force a target. OpenClaw global install is the same CLI with `-a openclaw -g`.

Try without installing:

```bash
npx skills use outboundsync/kingminos-skills --skill auth
npx skills use outboundsync/kingminos-skills --skill company-resolve
npx skills use outboundsync/kingminos-skills --skill credentials
```

## Credentials

Set before live calls. **Never print, log, or commit the API key.**

```bash
export KINGMINOS_API_KEY=...
```

Or put the same variable in a gitignored `.env` (see [`.env.example`](.env.example)).

- Header: `Authorization: Bearer $KINGMINOS_API_KEY` only. A bare key is `401` `detail: malformed`.
- Public, no auth: `GET /health` (`{"ok":true,"service":"kingminos-api-prod"}`) and `GET /openapi.yaml` (also `/v1/openapi.yaml`).
- Authenticated catalog: `GET /v1/capabilities`, `GET /v1/providers`.
- SFDC Named Credential / Custom auth: Auth Parameters do **not** leave SFDC. Add a Custom Header named `Authorization` (Allow Formulas ON if the value is a formula).

**Vendor Your Keys** (not the KingMinos Bearer token):

| Vendor | How the key is supplied |
| --- | --- |
| LeadMagic | House-key (OutboundSync-provided). Tenant PUT is optional, not required. |
| Findymail | BYOK — `PUT /v1/credentials/findymail` `{ "apiKey": "..." }` |
| ZoomInfo | BYOK — `PUT /v1/credentials/zoominfo` `{ "clientId", "clientSecret" }` |
| Wiza | BYOK — `PUT /v1/credentials/wiza` `{ "apiKey": "..." }` |
| AIArk | BYOK — `PUT /v1/credentials/aiark` `{ "apiKey": "..." }` |
| BuiltWith | BYOK — `PUT /v1/credentials/builtwith` `{ "apiKey": "..." }` |
| websearch | House-only. `PUT` is `byok_not_supported`. |

Responses never echo the raw vendor key.

## Security

- Skills are **read-only by default** — see [SECURITY.md](SECURITY.md).
- `credentials` may mutate tenant Your Keys **only after explicit confirmation**.
- `DELETE /v1/subjects/{subject_key}` exists on the live API (`erase` scope) and is **not** part of these three skills.
- Never re-echo vendor secrets after store/revoke.

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

Releases are created automatically after Validate skill integrity passes on `main` via `.github/workflows/release-calver.yml`.

- Versioning format: `YYYY.MM.DD.N` (CalVer). Each skill also has its own `metadata.version`.
- Release notes: [GitHub Releases](https://github.com/outboundsync/kingminos-skills/releases), generated from commit subjects.
- Curated changelog: [CHANGELOG.md](CHANGELOG.md).

To preview the next release locally:

```bash
npm run release:preview
```

## Related

- Live OpenAPI: https://api.kingminos.com/openapi.yaml
- Live health: https://api.kingminos.com/health
- Sister pack (CRM / sequencer, not enrichment): https://github.com/outboundsync/skills

## License

[MIT](LICENSE)
