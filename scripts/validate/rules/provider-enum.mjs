// Skills BYOK lists, path-`provider` enums, and `*_credentials_required` lists
// must include every provider in the hermetic inventory. Endpoint-map rules are
// route-only, so a new KingMinos vendor can land in the app contract and miss
// every skills enumeration — that gap is this rule.
//
// Default CI reads scripts/validate/fixtures/providers.yaml (no network).
// Optional: when OpenAPI is loaded, the credentials path-param enum is compared
// to the inventory. Live URL compare never fails the pack for being *ahead* of
// the served spec (warn only). A served spec that adds a provider the inventory
// lacks is an error.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { loadOpenApi } from './endpoint-map-openapi.mjs';

export const FIXTURE = 'scripts/validate/fixtures/providers.yaml';
const SUPPLY = new Set(['house_key', 'byok', 'house_only']);
const CREDENTIALS_REQUIRED = /[a-z]+_credentials_required/g;
const PATH_ID = /`([a-z][a-z0-9_]*)`/g;
const ROUTING_DEFAULT = /default (?:linear )?order|\[websearch,\s*zoominfo,\s*leadmagic\]|routing\.only|effectiveOrder/i;

export const REQUIRED_SURFACES = [
  { file: 'skills/credentials/SKILL.md', kinds: ['policy_table', 'byok'] },
  { file: 'skills/credentials/references/endpoints.md', kinds: ['path_enum', 'byok', 'credentials_required', 'api_key'] },
  { file: 'skills/company-resolve/SKILL.md', kinds: ['byok', 'credentials_required'] },
  { file: 'skills/company-resolve/references/endpoints.md', kinds: ['byok', 'credentials_required'] },
  { file: 'README.md', kinds: ['byok', 'policy_table'] },
  { file: 'CONVENTIONS.md', kinds: ['byok'] },
  { file: 'SECURITY.md', kinds: ['byok'] },
];

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asBool(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

export function parseProviders(raw) {
  const doc = parseDocument(String(raw), { prettyErrors: false });
  if (doc.errors.length > 0) {
    return { providers: [], problems: [{ line: 0, msg: `invalid ${FIXTURE}: ${doc.errors[0].message.split('\n')[0]}` }] };
  }
  const data = doc.toJS();
  const rows = data?.providers;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { providers: [], problems: [{ line: 0, msg: `${FIXTURE} must define a non-empty providers: list` }] };
  }
  const providers = [];
  const problems = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    const id = typeof row?.id === 'string' ? row.id.trim() : '';
    const label = typeof row?.label === 'string' ? row.label.trim() : '';
    const supply = typeof row?.supply === 'string' ? row.supply.trim() : '';
    if (!id || !label) {
      problems.push({ line: 0, msg: `${FIXTURE} providers[${index}] needs id and label` });
      return;
    }
    if (seen.has(id)) {
      problems.push({ line: 0, msg: `${FIXTURE} lists \`${id}\` twice` });
      return;
    }
    if (!SUPPLY.has(supply)) {
      problems.push({ line: 0, msg: `${FIXTURE} \`${id}\` has unknown supply '${supply}' (house_key | byok | house_only)` });
      return;
    }
    seen.add(id);
    const cred = row.credentials_required;
    providers.push({
      id,
      label,
      supply,
      credentialsRequired: typeof cred === 'string' && cred.trim() ? cred.trim() : null,
      companyResolveSurface: row.company_resolve_surface === false ? false : true,
      pathEnum: asBool(row.path_enum, supply !== 'house_only'),
      apiKey: asBool(row.api_key, false),
    });
  });
  return { providers, problems };
}

export function loadProvidersFixture(root) {
  const abs = path.join(root, FIXTURE);
  if (!existsSync(abs)) return { providers: null, problems: [], source: null };
  return { ...parseProviders(readFileSync(abs, 'utf8')), source: FIXTURE };
}

export function idsOf(providers, predicate) {
  return providers.filter(predicate).map((p) => p.id);
}

function missingMessage(kind, missing, expected) {
  const listed = missing.map((p) => `\`${p.id}\``).join(', ');
  const want = expected.map((p) => `\`${p.id}\``).join(', ');
  return `${kind} is missing ${listed} (expected ${want}). Add them here or update ${FIXTURE} if the KingMinos contract dropped them.`;
}

export function mentionsProvider(line, provider) {
  const text = String(line);
  if (new RegExp(`\\b${escapeRe(provider.id)}\\b`, 'i').test(text)) return true;
  if (new RegExp(`\\b${escapeRe(provider.label)}\\b`, 'i').test(text)) return true;
  if (provider.credentialsRequired && text.includes(provider.credentialsRequired)) return true;
  return false;
}

export function mentionedProviders(line, providers) {
  return providers.filter((provider) => mentionsProvider(line, provider));
}

function backtickIds(line) {
  return [...String(line).matchAll(PATH_ID)].map((m) => m[1]);
}

function requiredCodes(line) {
  return String(line).match(CREDENTIALS_REQUIRED) ?? [];
}

function isRoutingDefault(line) {
  return ROUTING_DEFAULT.test(line) && !/are BYOK|\*\*BYOK:\*\*|need tenant Your Keys|^[-*]\s+BYOK:/im.test(line);
}

function hasByokMarker(line) {
  return /are BYOK|\*\*BYOK:\*\*|need tenant Your Keys|^[-*]\s+BYOK:/im.test(line);
}

function vendorTableRows(text, providers) {
  const byLabel = new Map(providers.map((p) => [p.label.toLowerCase(), p]));
  const byId = new Map(providers.map((p) => [p.id, p]));
  const rows = [];
  String(text).split('\n').forEach((line, index) => {
    const match = line.match(/^\| \*?`?([^|`*]+)`?\*? \|/);
    if (!match) return;
    const cell = match[1].trim();
    const provider = byLabel.get(cell.toLowerCase()) ?? byId.get(cell);
    if (provider) rows.push({ provider, line: index + 1 });
  });
  return rows;
}

export function credentialsProviderEnumFromOpenApi(text) {
  const doc = parseDocument(String(text), { prettyErrors: false });
  if (doc.errors.length === 0) {
    const spec = doc.toJS();
    const item = spec?.paths?.['/v1/credentials/{provider}'];
    const found = [];
    const take = (params) => {
      if (!Array.isArray(params)) return;
      for (const param of params) {
        if (param && param.name === 'provider' && Array.isArray(param.schema?.enum)) {
          found.push(...param.schema.enum.filter((v) => typeof v === 'string'));
        }
      }
    };
    if (item && typeof item === 'object') {
      take(item.parameters);
      for (const method of ['get', 'put', 'patch', 'delete']) take(item[method]?.parameters);
    }
    if (found.length > 0) return [...new Set(found)];
  }
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  let inCredentials = false;
  for (const line of lines) {
    if (/^ {2}\/v1\/credentials\/\{provider\}:/.test(line)) {
      inCredentials = true;
      continue;
    }
    if (inCredentials && /^ {2}\/[^ ]/.test(line)) break;
    if (inCredentials) {
      const match = line.match(/enum:\s*\[([^\]]+)\]/);
      if (match) {
        return match[1].split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }
    }
  }
  return [];
}

export function compareOpenApiProviderEnum(specIds, pathEnumIds, source) {
  const spec = new Set(specIds);
  const fixture = new Set(pathEnumIds);
  const live = /^https?:\/\//i.test(String(source ?? ''));
  const out = [];
  for (const id of spec) {
    if (!fixture.has(id)) {
      out.push({
        file: FIXTURE,
        line: 0,
        msg: `OpenAPI credentials path enum includes \`${id}\` (${source}) but ${FIXTURE} does not — add it to the inventory and every BYOK list`,
      });
    }
  }
  for (const id of fixture) {
    if (spec.has(id)) continue;
    out.push({
      file: FIXTURE,
      line: 0,
      severity: live ? 'warn' : undefined,
      msg: live
        ? `${FIXTURE} lists \`${id}\` but live OpenAPI credentials path enum (${source}) does not yet — inventory is ahead of the served spec`
        : `${FIXTURE} path enum includes \`${id}\` but OpenAPI inventory (${source}) does not`,
    });
  }
  return out;
}

function pushMissing(out, file, line, kind, present, expected) {
  const have = new Set(present.map((p) => p.id));
  const missing = expected.filter((p) => !have.has(p.id));
  if (missing.length === 0) return false;
  out.push({ file, line, msg: missingMessage(kind, missing, expected) });
  return true;
}

export function resolveCredentialsRequiredProviders(providers) {
  return providers.filter((p) => p.supply === 'byok' && p.credentialsRequired && p.companyResolveSurface !== false);
}

function classifyLine(line, providers, previous = '', file = '') {
  if (isRoutingDefault(line)) return null;
  const window = previous ? `${previous} ${line}` : line;
  const mentioned = mentionedProviders(line, providers);
  const mentionedWindow = mentionedProviders(window, providers);
  const byok = providers.filter((p) => p.supply === 'byok');
  const pathEnum = providers.filter((p) => p.pathEnum);
  const apiKey = providers.filter((p) => p.apiKey);
  const codes = requiredCodes(line);
  const ids = backtickIds(line).filter((id) => providers.some((p) => p.id === id));

  if (codes.length >= 2) {
    const onResolveSurface = String(file).startsWith('skills/company-resolve/');
    const expected = onResolveSurface ? resolveCredentialsRequiredProviders(providers) : byok.filter((p) => p.credentialsRequired);
    return { kind: 'credentials_required', expected, present: mentioned };
  }
  if (/API-key vendors\s*\(/i.test(line)) {
    return { kind: 'API-key vendor list', expected: apiKey, present: mentioned };
  }
  if (ids.length >= 3 && /\|/.test(line) && !line.trim().startsWith('|')) {
    return { kind: 'Path `provider` enum', expected: pathEnum, present: pathEnum.filter((p) => ids.includes(p.id)) };
  }
  if (hasByokMarker(line)) {
    return { kind: 'BYOK list', expected: byok, present: mentionedWindow };
  }
  if (/Vendor Your Keys \(/i.test(line) && mentioned.filter((p) => p.supply === 'byok').length >= 3) {
    return { kind: 'BYOK list', expected: byok, present: mentioned };
  }
  return null;
}

function fileLooksLikeProviderDoc(text) {
  return /BYOK|credentials_required|Path `provider`|API-key vendors/i.test(text);
}

export function checkProviderSurfaces(files, providers) {
  const out = [];
  const byok = providers.filter((p) => p.supply === 'byok');
  const pathEnum = providers.filter((p) => p.pathEnum);
  const apiKey = providers.filter((p) => p.apiKey);
  const seenKinds = new Map();

  for (const [file, text] of files) {
    if (text === null || text === undefined) continue;
    const kinds = new Set();
    const lines = String(text).split('\n');
    lines.forEach((line, index) => {
      const classified = classifyLine(line, providers, index > 0 ? lines[index - 1] : '', file);
      if (!classified) return;
      kinds.add(classified.kind);
      pushMissing(out, file, index + 1, classified.kind, classified.present, classified.expected);
    });

    const table = vendorTableRows(text, providers);
    if (table.length >= 3) {
      const ids = new Set(table.map((row) => row.provider.id));
      const present = providers.filter((p) => ids.has(p.id));
      const expected = table.some((row) => row.provider.supply === 'house_only')
        ? providers.filter((p) => p.pathEnum || p.supply === 'house_only')
        : pathEnum;
      const last = table[table.length - 1];
      pushMissing(out, file, last.line, 'provider table', present, expected);
      kinds.add('policy_table');
    }
    seenKinds.set(file, kinds);
  }

  const kindAliases = {
    byok: ['BYOK list'],
    path_enum: ['Path `provider` enum'],
    credentials_required: ['credentials_required'],
    api_key: ['API-key vendor list'],
    policy_table: ['policy_table', 'provider table'],
  };

  for (const surface of REQUIRED_SURFACES) {
    const text = files.get(surface.file);
    if (text === null || text === undefined) continue;
    if (!fileLooksLikeProviderDoc(text)) continue;
    const found = seenKinds.get(surface.file) ?? new Set();
    for (const kind of surface.kinds) {
      const aliases = kindAliases[kind] ?? [kind];
      if (aliases.some((name) => found.has(name))) continue;
      if (kind === 'byok' && found.has('credentials_required')) continue;
      let expected = kind === 'path_enum' ? pathEnum : kind === 'api_key' ? apiKey : kind === 'policy_table' ? pathEnum : byok;
      if (kind === 'credentials_required' && surface.file.startsWith('skills/company-resolve/')) {
        expected = resolveCredentialsRequiredProviders(providers);
      }
      out.push({
        file: surface.file,
        line: 0,
        msg: `has no complete ${aliases[0]} covering ${expected.map((p) => `\`${p.id}\``).join(', ')}`,
      });
    }
  }
  return out;
}

export default {
  id: 'provider-enum',
  docRef: FIXTURE,
  description: 'BYOK lists, path-`provider` enums, and `*_credentials_required` lists include every provider in the hermetic KingMinos inventory (no live OpenAPI required).',
  check(model) {
    const loaded = loadProvidersFixture(model.root);
    if (loaded.providers === null) {
      if (existsSync(path.join(model.root, 'scripts/validate/cli.mjs'))) {
        return [{ file: FIXTURE, line: 0, msg: `missing ${FIXTURE} — the hermetic provider inventory (do not depend on live OpenAPI for default CI)` }];
      }
      return [];
    }

    const out = loaded.problems.map((problem) => ({ file: FIXTURE, ...problem }));
    if (loaded.providers.length === 0) return out;

    const files = new Map();
    for (const file of model.markdownFiles()) files.set(file, model.text(file));
    out.push(...checkProviderSurfaces(files, loaded.providers));

    let openapi;
    try {
      openapi = loadOpenApi({ root: model.root });
    } catch {
      return out;
    }
    if (!openapi.text) return out;
    const specIds = credentialsProviderEnumFromOpenApi(openapi.text);
    if (specIds.length === 0) return out;
    const pathEnumIds = idsOf(loaded.providers, (p) => p.pathEnum);
    out.push(...compareOpenApiProviderEnum(specIds, pathEnumIds, openapi.source));
    return out;
  },
};
