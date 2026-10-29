# KingMinos Agent Skills

Website: [kingminos.com](https://kingminos.com/) · Docs: [kingminos.com/docs](https://kingminos.com/docs)

Public [Agent Skills](https://agentskills.io) for **KingMinos by OutboundSync** — installable with [`npx skills`](https://github.com/vercel-labs/skills) in **Cursor**, **Claude Code**, and **Codex**.

Say **King Minos** out loud. Write **KingMinos**. This pack teaches the live enrichment API at [`https://api.kingminos.com`](https://api.kingminos.com) (`GET /health` returns HTTP 200 JSON with `"ok": true` plus `service` / `version` / `git_sha`; contract: `GET /openapi.yaml`, also `/openapi.json`).

**This is not the OutboundSync CRM / sequencer skills pack.** That sister repository is [`outboundsync/skills`](https://github.com/outboundsync/skills). Do not install this pack expecting launch preflight, sync monitoring, or cold-email copy. KingMinos decides company identity and vendor credentials; OutboundSync syncs sequencer events into the CRM.

The pack ships **18** skills.

**Output style.** Every skill renders a fixed, terminal-friendly Markdown shape. Readiness checks (`auth`, `credentials`) and `company-resolve` lead with a verdict and a `█░▒` status gauge, then one card per system and a `Next` list. A failed lookup always shows as `UNVERIFIED`, never as a pass or an empty result. Business misses on `company.resolve` stay HTTP 200 and use `answer.outcome` / `es_decision`. See [CONVENTIONS.md](CONVENTIONS.md) and each skill's `references/examples.md`.

### Enrichment API

| Skill | Path | Needs API key? | What it does |
| --- | --- | --- | --- |
| `api` | [`skills/api/`](skills/api/) | Yes (`KINGMINOS_API_KEY`) | KingMinos REST ↔ tool inventory (`skills/api/references/endpoints.md`): one row per OpenAPI Bearer resource operation (incl. `POST /v1/company/x-account` / `company.x_account`); CRM write floors in [`GET /v1/recipes/guidance`](https://api.kingminos.com/v1/recipes/guidance); routes to `auth`, `company-resolve`, `credentials` |
| `auth` | [`skills/auth/`](skills/auth/) | Yes (`KINGMINOS_API_KEY`) | Bearer auth against `https://api.kingminos.com`, 401 `missing` / `malformed` / `mismatch`, SFDC Named Credential Custom Headers, `GET /v1/capabilities` |
| `company-resolve` | [`skills/company-resolve/`](skills/company-resolve/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/resolve` — email/domain/website in, one `answer` back; stamp id on `es_decision=hit` + non-blank `zoominfo_company_id`; use `answer.confidence` + user acceptance per [guidance](https://api.kingminos.com/v1/recipes/guidance) |
| `company-b2b-social` | [`skills/company-b2b-social/`](skills/company-b2b-social/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/b2b-social` — search-verified LinkedIn `https://www.linkedin.com/company/{slug}` or null; paths `speed` / `balance` / `accuracy` / `coverage` |
| `company-icon` | [`skills/company-icon/`](skills/company-icon/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/icon` (`company.icon`) — pick the best company icon and re-host it at `https://logos.kingminos.com/i/{sha256}.png` (**256x256 PNG**); optional `icon_source_url`; domain + optional `name`; low-res hits return `confidence` low + `flags.low_res` (default floor `low`); optional `min_confidence` |
| `company-description` | [`skills/company-description/`](skills/company-description/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/description` (`company.description`) — paths `speed` / `balance` / `accuracy` / `coverage`; ZoomInfo runs only with your own key; flags incl. `truncated` / `cta` / `grammar` (informational); send `path` explicitly (recommended — omit runs balance at cap 6 not 2); stamp when non-blank text and `answer.confidence` meets path/`min_confidence` floor; winner-only billing |
| `webhooks` | [`skills/webhooks/`](skills/webhooks/) | Yes (`KINGMINOS_API_KEY`) | Register webhook endpoints, verify `KingMinos-Signature`, inspect deliveries, replay after fixes, read the `GET /v1/events` log; active events `run.failed` / `run.recovered` / `test.ping` |
| `credentials` | [`skills/credentials/`](skills/credentials/) | Yes (`KINGMINOS_API_KEY`) | List Your Keys via `GET /v1/credentials`; revoke after confirm. Store secrets at `https://app.kingminos.com`. LeadMagic, Wiza, Findymail, and AIArk are house-key; ZoomInfo, BuiltWith, Brandfetch, Prospeo, Apollo, Company URL Finder, People Data Labs, HG Insights, Enrich-CRM, Lemlist, Snov.io, Cognism, Lusha, Starbridge, Clay, Databar, QuickEnrich, GetLeads, and BlitzAPI are BYOK |
| `company-domain` | [`skills/company-domain/`](skills/company-domain/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/domain` (`company.domain`) — trusted domain stamp + ownership-proven aliases; branch on `answer.outcome` / `es_decision`; stamp when trusted outcome + non-blank domain and `answer.confidence` meets path/`min_confidence` floor |
| `company-hierarchy` | [`skills/company-hierarchy/`](skills/company-hierarchy/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/company/hierarchy` — immediate / ultimate parent + capped subsidiaries; `speed` is free; the hierarchy lookup bills 1 on first `FULL_MATCH` only; `coverage` is `400` |
| `person-verify-employment` | [`skills/person-verify-employment/`](skills/person-verify-employment/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/verify-employment` — four-way send/block pre-flight (`high_confidence_send` … `high_confidence_block`); email validation + job-change; paths `speed`/`balance`/`accuracy` only |
| `person-language` | [`skills/person-language/`](skills/person-language/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/language` (`person.language`) — can we engage this person in English, and if not in what; API tenants only; `email` or `linkedin_url` required; name is match-only |
| `person-phone` | [`skills/person-phone/`](skills/person-phone/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/phone` (`person.phone`) — one dialable `best_phone` (E.164) plus ranked typed `phones[]`; API tenants only; `email` or `linkedin_url` required; name is match-only; `phone_types` / `max_results`; 38 credits on a hit, 0 on a miss; write when non-blank `best_phone` and `answer.confidence` meets path/`min_confidence` floor |
| `person-title` | [`skills/person-title/`](skills/person-title/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/title` (`person.title`) — cleaned current `title` plus derived `seniority` / `function`; API tenants only; `email` or `linkedin_url` required; name and `company_domain` are match-only; `fields` picks the answer; outcome-priced 1 / 2 / 3 / 5 credits on a hit (speed / balance / accuracy / coverage), 0 on a miss; write each non-blank field when `answer.confidence` meets path/`min_confidence` floor |
| `person-b2b-social` | [`skills/person-b2b-social/`](skills/person-b2b-social/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/b2b-social` (`person.b2b_social`) — a person's canonical LinkedIn profile URL from an email; API tenants only; `email` required; `linkedin_url` and name are match-only (`person_mismatch`); paths `speed` / `balance` / `accuracy` only, outcome-priced 2 / 3 / 5 credits on a hit, 0 on a miss or below-floor withhold; write when `answer.outcome` is `found` and `answer.confidence` meets path/`min_confidence` floor |
| `person-name` | [`skills/person-name/`](skills/person-name/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/name` (`person.name`) — cleaned, proper-cased `first_name` / `last_name` / `full_name`; API tenants only; `email` or `linkedin_url` required; a role address is never a person (`role_address`), disagreeing sources are a `conflict`; outcome-priced 1 / 2 / 3 / 5 credits on a hit (speed / balance / accuracy / coverage), 0 on a miss; write when `answer.outcome` is `resolved` and `answer.confidence` meets path/`min_confidence` floor |
| `person-email` | [`skills/person-email/`](skills/person-email/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/person/email` (`person.email`) — a person's verified work email from name + company domain and/or a LinkedIn URL; API tenants only; no guessed patterns; `found` / `not_found` / `conflict` / `catch_all`; outcome-priced 1.5–5 credits on a delivered email, 0 otherwise; write when `answer.outcome` is `found` and `answer.confidence` meets path/`min_confidence` floor; chain `email-verify` for extra assurance |
| `email-verify` | [`skills/email-verify/`](skills/email-verify/) | Yes (`KINGMINOS_API_KEY`) | `POST /v1/email/verify` (`email.verify`) — is this mailbox deliverable: `valid` / `invalid` / `catch_all` / `unknown` plus mailbox flags; API tenants only; `email` is the only input; free local checks first; outcome-priced 0.5–1.5 credits on a delivered vendor `valid` / `invalid`, 0 on `catch_all`, `unknown`, a local `invalid` or a withhold |

REST: `https://api.kingminos.com`. Hosted MCP: `https://mcp.kingminos.com` — same Bearer token and snake_case tool inventory as the `api` map. Session/product-app ops are out of scope. Do not invent tools outside that map.

## Install (primary — Cursor, Claude Code, Codex)

Same installer as the OutboundSync skills pack — different GitHub repo, different skill names:

```bash
# KingMinos enrichment (needs KINGMINOS_API_KEY)
npx skills add outboundsync/kingminos-skills --skill api -g
npx skills add outboundsync/kingminos-skills --skill auth -g
npx skills add outboundsync/kingminos-skills --skill company-resolve -g
npx skills add outboundsync/kingminos-skills --skill company-b2b-social -g
npx skills add outboundsync/kingminos-skills --skill company-icon -g
npx skills add outboundsync/kingminos-skills --skill company-description -g
npx skills add outboundsync/kingminos-skills --skill credentials -g
npx skills add outboundsync/kingminos-skills --skill webhooks -g
npx skills add outboundsync/kingminos-skills --skill company-domain -g
npx skills add outboundsync/kingminos-skills --skill company-hierarchy -g
npx skills add outboundsync/kingminos-skills --skill person-verify-employment -g
npx skills add outboundsync/kingminos-skills --skill person-language -g
npx skills add outboundsync/kingminos-skills --skill person-phone -g
npx skills add outboundsync/kingminos-skills --skill person-title -g
npx skills add outboundsync/kingminos-skills --skill person-b2b-social -g
npx skills add outboundsync/kingminos-skills --skill person-name -g
npx skills add outboundsync/kingminos-skills --skill person-email -g
npx skills add outboundsync/kingminos-skills --skill email-verify -g
```

The Skills CLI detects the harness (Cursor, Claude Code, Codex, and others). Add `-a claude-code`, `-a codex`, or `-a cursor` only when you want to force a target. OpenClaw global install is the same CLI with `-a openclaw -g`.

Try without installing:

```bash
npx skills use outboundsync/kingminos-skills --skill api
npx skills use outboundsync/kingminos-skills --skill auth
npx skills use outboundsync/kingminos-skills --skill company-resolve
npx skills use outboundsync/kingminos-skills --skill company-b2b-social
npx skills use outboundsync/kingminos-skills --skill company-icon
npx skills use outboundsync/kingminos-skills --skill company-description
npx skills use outboundsync/kingminos-skills --skill credentials
npx skills use outboundsync/kingminos-skills --skill webhooks
npx skills use outboundsync/kingminos-skills --skill company-domain
npx skills use outboundsync/kingminos-skills --skill company-hierarchy
npx skills use outboundsync/kingminos-skills --skill person-verify-employment
npx skills use outboundsync/kingminos-skills --skill person-language
npx skills use outboundsync/kingminos-skills --skill person-phone
npx skills use outboundsync/kingminos-skills --skill person-title
npx skills use outboundsync/kingminos-skills --skill person-b2b-social
npx skills use outboundsync/kingminos-skills --skill person-name
npx skills use outboundsync/kingminos-skills --skill person-email
npx skills use outboundsync/kingminos-skills --skill email-verify
```

## Credentials

Mint a personal access token at [`https://app.kingminos.com`](https://app.kingminos.com) (workspace owner → tokens). It is shown once, starts with `km_`, is scoped to explicit capabilities (not `*`), and has a daily credit cap (default 100). Set it before live calls. **Never print, log, or commit the API key.**

```bash
export KINGMINOS_API_KEY=...
```

Or put the same variable in a gitignored `.env` (see [`.env.example`](.env.example)).

- Header: `Authorization: Bearer $KINGMINOS_API_KEY` only. A bare key is `401` `detail: malformed`.
- Public, no auth: `GET /health` (HTTP 200 JSON with `"ok": true` plus `service`, `version`, and `git_sha`; check `ok` only) and `GET /openapi.yaml` (also `/v1/openapi.yaml`, `/openapi.json`, `/v1/openapi.json`).
- Authenticated catalog: `GET /v1/capabilities`, `GET /v1/providers`, `GET /v1/credentials`.
- `403` `scope_denied` = the token lacks this capability scope. `429` `key_budget_exhausted` = the token's daily credit cap was hit.
- SFDC Named Credential / Custom auth: Auth Parameters do **not** leave SFDC. Add a Custom Header named `Authorization` (Allow Formulas ON if the value is a formula).

**Vendor Your Keys** (not the KingMinos Bearer token) — store them in the app UI. **Never paste a vendor secret into chat.**

| Vendor | How the key is supplied |
| --- | --- |
| LeadMagic | House-key by default (OutboundSync-provided). Tenant store is optional, not required. |
| Findymail | House-key (approved; OutboundSync-provided). Tenant store is optional. |
| ZoomInfo | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Brandfetch | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys); `company.icon` source (stamp re-hosted on logos.kingminos.com) |
| Wiza | House-key (approved; OutboundSync-provided). Tenant store is optional. |
| AIArk | House-key (approved; OutboundSync-provided). Tenant store is optional. |
| BuiltWith | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Prospeo | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Apollo | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Company URL Finder | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| People Data Labs | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| HG Insights | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Enrich-CRM | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Lemlist | BYOK — store at `https://app.kingminos.com` (Vendor keys / Your Keys) |
| Snov.io | BYOK — OAuth (client ID + secret). Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| Cognism | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| Lusha | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| Starbridge | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| Clay | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| Databar | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| QuickEnrich | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| GetLeads | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
| BlitzAPI | BYOK — API key. Store at `https://app.kingminos.com` (Vendor keys / Your Keys). Credential vendor only — no routing hop yet |
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

See [CONTRIBUTING.md](CONTRIBUTING.md) for adding or changing a skill. New skills follow [CONVENTIONS.md](CONVENTIONS.md).

**BYOK provider rollout:** when KingMinos adds a BYOK vendor, this pack takes the `providers.yaml` and skill-copy update described in [CONTRIBUTING.md](CONTRIBUTING.md). The cross-service rollout checklist is maintained with the KingMinos service code.

Validate before pushing (Node 22+):

```bash
npm ci
npm run validate
npm test
```

## Releases & Changelog

Releases are created automatically after hermetic Validate skill integrity passes on `main` via `.github/workflows/release-calver.yml`. Live OpenAPI drift is a scheduled job and does not block release.

- Versioning format: `YYYY.MM.DD.N` (CalVer). Each skill also has its own `metadata.version`.
- Release notes: [GitHub Releases](https://github.com/outboundsync/kingminos-skills/releases), generated from commit subjects.
- Curated changelog: [CHANGELOG.md](CHANGELOG.md). Each release moves the `## Unreleased` lines under the new tag automatically through a bot PR (`main` is protected; see CONTRIBUTING).

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
