import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { validate } from '../scripts/validate/cli.mjs';
import {
  FIXTURE,
  compareOpenApiProviderEnum,
  credentialsProviderEnumFromOpenApi,
  mentionsProvider,
  parseProviders,
  resolveCredentialsRequiredProviders,
} from '../scripts/validate/rules/provider-enum.mjs';
import { makeRepo, readmeFor, skillMd } from './helpers/fixture.mjs';

const INVENTORY = `providers:
  - { id: leadmagic, label: LeadMagic, supply: house_key, credentials_required: null, path_enum: true, api_key: true }
  - { id: findymail, label: Findymail, supply: byok, credentials_required: findymail_credentials_required, path_enum: true, api_key: true }
  - { id: zoominfo, label: ZoomInfo, supply: byok, credentials_required: zi_credentials_required, path_enum: true, api_key: false }
  - { id: wiza, label: Wiza, supply: byok, credentials_required: wiza_credentials_required, path_enum: true, api_key: true }
  - { id: aiark, label: AIArk, supply: byok, credentials_required: aiark_credentials_required, path_enum: true, api_key: true }
  - { id: builtwith, label: BuiltWith, supply: byok, credentials_required: builtwith_credentials_required, path_enum: true, api_key: true }
  - { id: prospeo, label: Prospeo, supply: byok, credentials_required: prospeo_credentials_required, path_enum: true, api_key: true }
  - { id: websearch, label: websearch, supply: house_only, credentials_required: null, path_enum: false, api_key: false }
`;

const BYOK = 'Findymail, ZoomInfo, Wiza, AIArk, BuiltWith, Prospeo are BYOK';
const PATH_ENUM = '`zoominfo` | `leadmagic` | `findymail` | `wiza` | `aiark` | `builtwith` | `prospeo`';
const CODES = '`zi_credentials_required` / `findymail_credentials_required` / `wiza_credentials_required` / `aiark_credentials_required` / `builtwith_credentials_required` / `prospeo_credentials_required`';
const API_KEYS = 'API-key vendors (`leadmagic`, `findymail`, `wiza`, `aiark`, `builtwith`, `prospeo`):';
const TABLE = `| Vendor | Path id | How |
| --- | --- | --- |
| LeadMagic | \`leadmagic\` | House-key |
| Findymail | \`findymail\` | BYOK |
| ZoomInfo | \`zoominfo\` | BYOK |
| Wiza | \`wiza\` | BYOK |
| AIArk | \`aiark\` | BYOK |
| BuiltWith | \`builtwith\` | BYOK |
| Prospeo | \`prospeo\` | BYOK |
| websearch | \`websearch\` | House-only |
`;

function completeDocs(overrides = {}) {
  return {
    [FIXTURE]: INVENTORY,
    'CONVENTIONS.md': `- LeadMagic is the only house-key vendor. ${BYOK}. \`websearch\` is house-only.\n`,
    'SECURITY.md': `# Security\n\n## Vendor key policy\n\n- **BYOK:** ${BYOK.replace(' are BYOK', '')}.\n`,
    'README.md': `${readmeFor(['demo', 'credentials', 'company-resolve'])}\n${BYOK}.\n\n${TABLE}\n`,
    'skills/credentials/SKILL.md': skillMd({
      name: 'credentials',
      extraFrontmatter: 'compatibility: Requires KINGMINOS_API_KEY.\n',
      description: 'List vendor Your Keys. Use when the user asks to list credentials.',
      body: `## Workflow\n\n- · ${BYOK}\n\n${TABLE}\n\n## Output contract\n\n### Shape\n\n- x\n`,
    }),
    'skills/credentials/references/endpoints.md': `## Path \`provider\`\n\n${PATH_ENUM}\n\n- **BYOK:** ${BYOK.replace(' are BYOK', '')}.\n\n${CODES}\n\n${API_KEYS}\n`,
    'skills/company-resolve/SKILL.md': skillMd({
      name: 'company-resolve',
      extraFrontmatter: 'compatibility: Requires KINGMINOS_API_KEY.\n',
      description: 'Resolve a company. Use when the user asks to resolve a company.',
      body: `## Workflow\n\n- 400 ${CODES} (those vendors are BYOK)\n- ZoomInfo / Findymail / Wiza / AIArk / BuiltWith / Prospeo need tenant Your Keys\n\n## Output contract\n\n### Shape\n\n- x\n`,
    }),
    'skills/company-resolve/references/endpoints.md': `- BYOK: ${BYOK.replace(' are BYOK', '')}\n\n| Status | error |\n| --- | --- |\n| \`400\` | ${CODES} |\n`,
    ...overrides,
  };
}

function diags(overrides = {}, env = {}) {
  const prevPath = process.env.KINGMINOS_OPENAPI_PATH;
  const prevUrl = process.env.KINGMINOS_OPENAPI_URL;
  delete process.env.KINGMINOS_OPENAPI_PATH;
  delete process.env.KINGMINOS_OPENAPI_URL;
  Object.assign(process.env, env);
  const repo = makeRepo(completeDocs(overrides));
  try {
    return validate({ root: repo.root }).diagnostics.filter((d) => d.rule === 'provider-enum');
  } finally {
    repo.cleanup();
    if (prevPath === undefined) delete process.env.KINGMINOS_OPENAPI_PATH;
    else process.env.KINGMINOS_OPENAPI_PATH = prevPath;
    if (prevUrl === undefined) delete process.env.KINGMINOS_OPENAPI_URL;
    else process.env.KINGMINOS_OPENAPI_URL = prevUrl;
  }
}

test('parseProviders reads the inventory and rejects unknown supply', () => {
  const { providers, problems } = parseProviders(INVENTORY);
  assert.equal(problems.length, 0);
  assert.deepEqual(providers.filter((p) => p.supply === 'byok').map((p) => p.id), [
    'findymail', 'zoominfo', 'wiza', 'aiark', 'builtwith', 'prospeo',
  ]);
  assert.equal(providers.find((p) => p.id === 'zoominfo').credentialsRequired, 'zi_credentials_required');
  assert.equal(parseProviders('providers:\n  - { id: x, label: X, supply: paid }\n').problems[0].msg.includes('unknown supply'), true);
});

test('resolveCredentialsRequiredProviders skips company_resolve_surface: false', () => {
  const { providers } = parseProviders(readFileSync(path.join(process.cwd(), FIXTURE), 'utf8'));
  const ids = resolveCredentialsRequiredProviders(providers).map((p) => p.id);
  assert.equal(ids.includes('apollo'), true);
  assert.equal(ids.includes('companyurlfinder'), false);
});

test('mentionsProvider matches id, label, and zi_credentials_required', () => {
  const zoominfo = parseProviders(INVENTORY).providers.find((p) => p.id === 'zoominfo');
  assert.equal(mentionsProvider('ZoomInfo is BYOK', zoominfo), true);
  assert.equal(mentionsProvider('`zoominfo` unset', zoominfo), true);
  assert.equal(mentionsProvider('400 zi_credentials_required', zoominfo), true);
  assert.equal(mentionsProvider('LeadMagic only', zoominfo), false);
});

test('provider-enum: complete surfaces are clean', () => {
  assert.deepEqual(diags(), []);
});

test('provider-enum: wrapped BYOK description is one list; "Your Keys (store" is not', () => {
  assert.deepEqual(diags({
    'skills/credentials/SKILL.md': skillMd({
      name: 'credentials',
      extraFrontmatter: 'compatibility: Requires KINGMINOS_API_KEY.\n',
      description: 'List vendor Your Keys. Use when the user asks to list credentials.',
      body: `## Workflow\n\nLeadMagic is house-key by default; Findymail, ZoomInfo, Wiza, AIArk,\nBuiltWith, and Prospeo are BYOK.\n\n| User intent | Skill |\n| --- | --- |\n| List or revoke vendor Your Keys (store in the app UI) | credentials |\n\n${TABLE}\n\n## Output contract\n\n### Shape\n\n- x\n`,
    }),
  }), []);
});

test('provider-enum: dropping prospeo from a BYOK list fails', () => {
  const found = diags({
    'CONVENTIONS.md': '- LeadMagic is the only house-key vendor. Findymail, ZoomInfo, Wiza, AIArk, and BuiltWith are BYOK.\n',
  });
  assert.equal(found.some((d) => d.file === 'CONVENTIONS.md' && /prospeo/.test(d.msg) && /BYOK list/.test(d.msg)), true);
});

test('provider-enum: dropping prospeo from the path enum fails', () => {
  const found = diags({
    'skills/credentials/references/endpoints.md': `## Path \`provider\`\n\n\`zoominfo\` | \`leadmagic\` | \`findymail\` | \`wiza\` | \`aiark\` | \`builtwith\`\n\n- **BYOK:** Findymail, ZoomInfo, Wiza, AIArk, BuiltWith, Prospeo.\n\n${CODES}\n\n${API_KEYS}\n`,
  });
  assert.equal(found.some((d) => /Path `provider` enum/.test(d.msg) && /prospeo/.test(d.msg)), true);
});

test('provider-enum: dropping prospeo_credentials_required fails', () => {
  const found = diags({
    'skills/company-resolve/SKILL.md': skillMd({
      name: 'company-resolve',
      extraFrontmatter: 'compatibility: Requires KINGMINOS_API_KEY.\n',
      description: 'Resolve a company. Use when the user asks to resolve a company.',
      body: `## Workflow\n\n- 400 \`zi_credentials_required\` / \`findymail_credentials_required\` / \`wiza_credentials_required\` / \`aiark_credentials_required\` / \`builtwith_credentials_required\` → BYOK\n- ZoomInfo / Findymail / Wiza / AIArk / BuiltWith / Prospeo need tenant Your Keys\n\n## Output contract\n\n### Shape\n\n- x\n`,
    }),
  });
  assert.equal(found.some((d) => /prospeo_credentials_required|prospeo/.test(d.msg) && /credentials_required/.test(d.msg)), true);
});

test('provider-enum: default routing order is not an enumeration', () => {
  const found = diags({
    'skills/company-resolve/SKILL.md': skillMd({
      name: 'company-resolve',
      extraFrontmatter: 'compatibility: Requires KINGMINOS_API_KEY.\n',
      description: 'Resolve a company. Use when the user asks to resolve a company.',
      body: `## Workflow\n\n- Default linear order is [websearch, zoominfo, leadmagic]\n- 400 ${CODES} (those vendors are BYOK)\n- ZoomInfo / Findymail / Wiza / AIArk / BuiltWith / Prospeo need tenant Your Keys\n\n## Output contract\n\n### Shape\n\n- x\n`,
    }),
  });
  assert.equal(found.some((d) => /websearch, zoominfo, leadmagic/.test(d.msg)), false);
  assert.deepEqual(found, []);
});

test('provider-enum: missing fixture next to validate cli is an error', () => {
  const repo = makeRepo({
    'scripts/validate/cli.mjs': 'export {}\n',
  });
  try {
    const found = validate({ root: repo.root }).diagnostics.filter((d) => d.rule === 'provider-enum');
    assert.equal(found.length, 1);
    assert.match(found[0].msg, /missing .*providers\.yaml/);
  } finally {
    repo.cleanup();
  }
});

test('provider-enum: demo repos without the fixture are skipped', () => {
  const repo = makeRepo();
  try {
    const found = validate({ root: repo.root }).diagnostics.filter((d) => d.rule === 'provider-enum');
    assert.deepEqual(found, []);
  } finally {
    repo.cleanup();
  }
});

test('credentialsProviderEnumFromOpenApi reads path-param enums', () => {
  const yaml = `paths:
  /v1/credentials/{provider}:
    parameters:
      - name: provider
        schema:
          enum: [zoominfo, leadmagic, findymail, wiza, aiark, builtwith, prospeo]
`;
  assert.deepEqual(credentialsProviderEnumFromOpenApi(yaml), [
    'zoominfo', 'leadmagic', 'findymail', 'wiza', 'aiark', 'builtwith', 'prospeo',
  ]);
  const compact = `paths:\n  /v1/credentials/{provider}:\n    put: { operationId: put_credentials }\n      enum: [zoominfo, prospeo]\n`;
  assert.deepEqual(credentialsProviderEnumFromOpenApi(compact), ['zoominfo', 'prospeo']);
});

test('compareOpenApiProviderEnum: live missing inventory ids is a warn; extra spec ids error', () => {
  const ahead = compareOpenApiProviderEnum(
    ['zoominfo', 'leadmagic'],
    ['zoominfo', 'leadmagic', 'prospeo'],
    'https://api.kingminos.com/openapi.yaml',
  );
  assert.equal(ahead.length, 1);
  assert.equal(ahead[0].severity, 'warn');
  assert.match(ahead[0].msg, /prospeo/);

  const extra = compareOpenApiProviderEnum(
    ['zoominfo', 'leadmagic', 'newvendor'],
    ['zoominfo', 'leadmagic'],
    'https://api.kingminos.com/openapi.yaml',
  );
  assert.equal(extra.some((d) => /newvendor/.test(d.msg) && d.severity === undefined), true);
});

test('provider-enum: hermetic OpenAPI enum missing prospeo fails', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'km-prov-oa-'));
  const specPath = path.join(dir, 'openapi.yaml');
  writeFileSync(specPath, `openapi: 3.1.0
paths:
  /v1/credentials/{provider}:
    parameters:
      - name: provider
        schema:
          enum: [zoominfo, leadmagic, findymail, wiza, aiark, builtwith]
    put:
      operationId: put_credentials
`);
  const found = diags({}, { KINGMINOS_OPENAPI_PATH: specPath });
  assert.equal(found.some((d) => /prospeo/.test(d.msg) && /OpenAPI inventory/.test(d.msg)), true);
});
