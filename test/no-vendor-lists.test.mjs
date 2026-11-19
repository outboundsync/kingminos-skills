import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validate } from '../scripts/validate/cli.mjs';
import { FIXTURE, parseProviders } from '../scripts/validate/rules/provider-enum.mjs';
import { findVendorLists, vendorPattern } from '../scripts/validate/rules/no-vendor-lists.mjs';
import { makeRepo, readmeFor, skillMd } from './helpers/fixture.mjs';

const INVENTORY = `providers:
  - { id: leadmagic, label: LeadMagic, supply: house_key, credentials_required: null, path_enum: true, api_key: true }
  - { id: zoominfo, label: ZoomInfo, supply: byok, credentials_required: zi_credentials_required, path_enum: true, api_key: false }
  - { id: aiark, label: AIArk, supply: house_key, credentials_required: aiark_credentials_required, path_enum: true, api_key: true }
  - { id: snovio, label: Snov.io, supply: byok, credentials_required: null, path_enum: true, api_key: false }
  - { id: websearch, label: websearch, supply: house_only, credentials_required: null, path_enum: false, api_key: false }
`;
const { providers } = parseProviders(INVENTORY);

function diags(files) {
  const repo = makeRepo({ [FIXTURE]: INVENTORY, 'README.md': readmeFor(['demo']), 'skills/demo/SKILL.md': skillMd(), ...files });
  try {
    return validate({ root: repo.root }).diagnostics.filter((d) => d.rule === 'no-vendor-lists');
  } finally {
    repo.cleanup();
  }
}

test('vendorPattern matches label spellings derived from the id', () => {
  assert.equal(vendorPattern('aiark').test('house AI Ark'), true);
  assert.equal(vendorPattern('aiark').test('AIArk'), true);
  assert.equal(vendorPattern('snovio').test('Snov.io'), true);
  assert.equal(vendorPattern('zoominfo').test('zoominfo_company_id'), false);
});

test('findVendorLists flags three vendors in one paragraph, including across a table', () => {
  assert.deepEqual(findVendorLists('LeadMagic, ZoomInfo, and AIArk are vendors.', providers).map((h) => h.line), [1]);
  const table = '| Vendor |\n| --- |\n| LeadMagic |\n| ZoomInfo |\n| Snov.io |\n';
  assert.deepEqual(findVendorLists(table, providers).map((h) => h.line), [5]);
});

test('findVendorLists ignores inline code, house-only hops, and separate paragraphs', () => {
  assert.deepEqual(findVendorLists('`leadmagic` | `zoominfo` | `aiark` | `snovio`', providers), []);
  assert.deepEqual(findVendorLists('`zi_credentials_required` / `aiark_credentials_required` / ZoomInfo', providers), []);
  assert.deepEqual(findVendorLists('websearch, LeadMagic, ZoomInfo', providers), []);
  assert.deepEqual(findVendorLists('LeadMagic and ZoomInfo.\n\nAIArk.', providers), []);
});

test('no-vendor-lists fails a README or skill that lists vendors by name', () => {
  const found = diags({
    'README.md': `${readmeFor(['demo'])}\nLeadMagic and AIArk are house-key; ZoomInfo is BYOK.\n`,
    'skills/demo/references/notes.md': '- BYOK: ZoomInfo, Snov.io, LeadMagic\n',
  });
  assert.deepEqual(found.map((d) => d.file).sort(), ['README.md', 'skills/demo/references/notes.md']);
});

test('no-vendor-lists is clean on generic house-key / BYOK wording', () => {
  assert.deepEqual(diags({ 'README.md': `${readmeFor(['demo'])}\nHouse-key vs BYOK comes from \`GET /v1/credentials\` (\`house_managed\`).\n` }), []);
});
