import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validate } from '../scripts/validate/cli.mjs';
import { FIXTURE, parseProviders } from '../scripts/validate/rules/provider-enum.mjs';
import { findVendorLists, vendorPattern } from '../scripts/validate/rules/no-vendor-lists.mjs';
import { makeRepo, readmeFor, skillMd } from './helpers/fixture.mjs';

const INVENTORY = `providers:
  - { id: alphadata, label: AlphaData, supply: house_key, credentials_required: null, path_enum: true, api_key: true }
  - { id: betalink, label: BetaLink, supply: byok, credentials_required: bl_credentials_required, path_enum: true, api_key: false }
  - { id: gammaark, label: GammaArk, supply: house_key, credentials_required: gammaark_credentials_required, path_enum: true, api_key: true }
  - { id: deltaio, label: Delta.io, supply: byok, credentials_required: null, path_enum: true, api_key: false }
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
  assert.equal(vendorPattern('gammaark').test('house Gamma Ark'), true);
  assert.equal(vendorPattern('gammaark').test('GammaArk'), true);
  assert.equal(vendorPattern('deltaio').test('Delta.io'), true);
  assert.equal(vendorPattern('betalink').test('betalink_company_id'), false);
});

test('findVendorLists flags three vendors in one paragraph, including across a table', () => {
  assert.deepEqual(findVendorLists('AlphaData, BetaLink, and GammaArk are vendors.', providers).map((h) => h.line), [1]);
  const table = '| Vendor |\n| --- |\n| AlphaData |\n| BetaLink |\n| Delta.io |\n';
  assert.deepEqual(findVendorLists(table, providers).map((h) => h.line), [5]);
});

test('findVendorLists ignores inline code, house-only hops, and separate paragraphs', () => {
  assert.deepEqual(findVendorLists('`alphadata` | `betalink` | `gammaark` | `deltaio`', providers), []);
  assert.deepEqual(findVendorLists('`bl_credentials_required` / `gammaark_credentials_required` / BetaLink', providers), []);
  assert.deepEqual(findVendorLists('websearch, AlphaData, BetaLink', providers), []);
  assert.deepEqual(findVendorLists('AlphaData and BetaLink.\n\nGammaArk.', providers), []);
});

test('no-vendor-lists fails a README or skill that lists vendors by name', () => {
  const found = diags({
    'README.md': `${readmeFor(['demo'])}\nAlphaData and GammaArk are house-key; BetaLink is BYOK.\n`,
    'skills/demo/references/notes.md': '- BYOK: BetaLink, Delta.io, AlphaData\n',
  });
  assert.deepEqual(found.map((d) => d.file).sort(), ['README.md', 'skills/demo/references/notes.md']);
});

test('no-vendor-lists is clean on generic house-key / BYOK wording', () => {
  assert.deepEqual(diags({ 'README.md': `${readmeFor(['demo'])}\nHouse-key vs BYOK comes from \`GET /v1/credentials\` (\`house_managed\`).\n` }), []);
});
