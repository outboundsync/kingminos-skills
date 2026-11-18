import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRICING_REFERENCE, deliveredText, pricingSlices, renderPricingReference } from '../scripts/sync-pricing.mjs';
import { validate } from '../scripts/validate/cli.mjs';
import { SNAPSHOT } from '../scripts/validate/rules/api-sync-snapshot.mjs';
import { handTypedPrices } from '../scripts/validate/rules/no-hand-typed-prices.mjs';
import { makeRepo, skillMd } from './helpers/fixture.mjs';

const bearer = [{ bearer: [] }];
const path = (name, cap, delivered, extra = {}) => ({ name, cap, delivered, byok: 0.1, miss: 0, ...extra });

function spec(overrides = {}) {
  const paths = {};
  for (let i = 0; i < 9; i += 1) paths[`/v1/filler/${i}`] = { get: { operationId: `filler${i}`, security: bearer } };
  return {
    openapi: '3.1.0',
    info: { title: 'KingMinos', version: '0.1.0' },
    paths: {
      ...paths,
      '/v1/person/title': {
        post: {
          operationId: 'personTitle',
          security: bearer,
          'x-kingminos-pricing': {
            id: 'person.title', route: '/v1/person/title', method: 'POST', outcome_priced: true, byok_basis: 'per_answer',
            default_path: 'balance', max_credits_ceiling: 6, opt_in_hops: [], notes: [],
            paths: [path('speed', 2, 1), path('balance', 4, 2)],
          },
        },
      },
      '/v1/company/domain': {
        parameters: [{ name: 'x', in: 'query' }],
        post: {
          operationId: 'companyDomain',
          security: bearer,
          'x-kingminos-pricing': {
            id: 'company.domain', route: '/v1/company/domain', method: 'POST', outcome_priced: false, byok_basis: 'per_billing_hop',
            default_path: 'balance', max_credits_ceiling: 4,
            opt_in_hops: [{ provider: 'wiza', price: 15, note: 'Off | every default path.' }],
            notes: ['Winner-only.'],
            paths: [path('speed', 0, { min: 0, typical: 0, max: 0 }), path('balance', 3, { min: 0, typical: null, max: 3 })],
          },
        },
      },
      ...overrides,
    },
  };
}

test('pricing slices are sorted by route and ignore path-level parameters', () => {
  assert.deepEqual(pricingSlices(spec()).map((s) => s.slice.id), ['company.domain', 'person.title']);
});

test('delivered: one number when fixed, min–max otherwise', () => {
  assert.equal(deliveredText(2.5), '2.5');
  assert.equal(deliveredText({ min: 0, typical: 0, max: 0 }), '0');
  assert.equal(deliveredText({ min: 1, typical: 1, max: 1 }), '1');
  assert.equal(deliveredText({ min: 5, typical: null, max: 38 }), '5–38');
  assert.equal(deliveredText({ min: 2, typical: null, max: 2 }), '2');
});

test('renderPricingReference is deterministic and renders every path, hop and note', () => {
  const s = spec();
  const reversed = { ...s, paths: Object.fromEntries(Object.entries(s.paths).reverse()) };
  const md = renderPricingReference(s);
  assert.equal(md, renderPricingReference(reversed));
  assert.match(md, /\| `balance` \*\(default\)\* \| 3 \| 0–3 \| 0\.1 \| 0 \|/);
  assert.match(md, /\| `speed` \| 2 \| 1 \| 0\.1 \| 0 \|/);
  assert.match(md, /\| `wiza` \| 15 \| Off \\\| every default path\. \|/);
  assert.match(md, /- Winner-only\./);
  assert.match(md, /Every path below bills \*\*0\*\* for a miss\. Every path's BYOK fee is \*\*0\.1\*\* credits\./);
  assert.ok(md.indexOf('## company.domain') < md.indexOf('## person.title'));
});

test('renderPricingReference rejects a malformed pricing block', () => {
  const bad = spec();
  bad.paths['/v1/person/title'].post['x-kingminos-pricing'].paths[0].delivered = { min: 1, max: 2 };
  assert.throws(() => renderPricingReference(bad), /delivered does not match outcome_priced=true/);
});

test('handTypedPrices: same heuristic as kingminos.com check:pricing', () => {
  const rules = (text) => handTypedPrices(text).map((hit) => hit.rule);
  assert.deepEqual(rules('A hit costs 15 credits.'), ['number before "credits"']);
  assert.deepEqual(rules('10 free credits a day'), ['number before "credits"']);
  assert.deepEqual(rules('Paths `speed` (cap 1) and a credit cap of **6**.'), ['number after "cap"', 'number after "cap"']);
  assert.deepEqual(rules("BYOK bills a flat **0.1** router fee; that hop's price (15)."), ['number after bill/cost/price', 'number after bill/cost/price']);
  assert.deepEqual(rules('| Path | Cost on a hit |\n| --- | --- |\n| `speed` | 2 |\n| `balance` | 0 |\n'), ['number in a credits/cap/price column']);
  assert.deepEqual(rules('| `max_provider_credits` | Notes |\n| --- | --- |\n| 19 | x |\n'), ['number in a credits/cap/price column']);
  // Zero is a rule, not a price; code is never a price; other columns are free.
  assert.deepEqual(rules('A miss bills 0 and a replay costs 0 credits.'), []);
  assert.deepEqual(rules('Send `{"cap": 6}` or `15 credits`.\n\n```json\n{ "spent": 38 }\n```\n'), []);
  assert.deepEqual(rules('| Path | Floor |\n| --- | --- |\n| `speed` | 2 |\n'), []);
  assert.deepEqual(rules('Answers in < 10 s; up to 5 ranked numbers.'), []);
});

function diags(files, rule) {
  const repo = makeRepo(files);
  try {
    return validate({ root: repo.root }).diagnostics.filter((d) => d.rule === rule);
  } finally {
    repo.cleanup();
  }
}

test('no-hand-typed-prices: flags skill files and the README, never the generated reference', () => {
  const hit = diags({ 'skills/demo/references/rubric.md': '# Rubric\n\n## Levels\n\nOutcome-priced 2 / 3 / 5 credits on a hit.\n' }, 'no-hand-typed-prices');
  // "priced 2" and "5 credits" are two numbers, so two reports.
  assert.deepEqual(hit.map((d) => `${d.file}:${d.line}`), ['skills/demo/references/rubric.md:5', 'skills/demo/references/rubric.md:5']);
  assert.equal(diags({ 'skills/demo/SKILL.md': skillMd({ body: '## Output contract\n\n### Shape\n\nPaths `speed` (cap 10).\n' }) }, 'no-hand-typed-prices').length, 1);
  const readme = diags({ 'README.md': `${makeReadme()}\nIt costs 38 credits.\n` }, 'no-hand-typed-prices');
  assert.deepEqual(readme.map((d) => d.file), ['README.md']);
  assert.deepEqual(diags({ [PRICING_REFERENCE]: '# Prices\n\n| Path | Cap |\n| --- | --- |\n| `speed` | 10 |\n' }, 'no-hand-typed-prices'), []);
});

function makeReadme() {
  return '# Skills\n\nThe pack ships **1** skills.\n\n| Skill | Path | Needs API key? | What it does |\n| --- | --- | --- | --- |\n| `demo` | [`skills/demo/`](skills/demo/) | No | Demo |\n\n```bash\nnpx skills add outboundsync/kingminos-skills --skill demo\nnpx skills use outboundsync/kingminos-skills --skill demo\n```\n';
}

test('pricing-reference-generated: matches the snapshot render; a hand edit or a missing file fails', () => {
  const s = spec();
  const md = renderPricingReference(s);
  const base = { [SNAPSHOT]: JSON.stringify(s), 'skills/api/SKILL.md': skillMd({ name: 'api' }), 'skills/api/references/rubric.md': '# Rubric\n\n## Levels\n' };
  assert.deepEqual(diags({ ...base, [PRICING_REFERENCE]: md }, 'pricing-reference-generated'), []);
  const edited = diags({ ...base, [PRICING_REFERENCE]: md.replace('| 3 | 0–3 |', '| 3 | 2 |') }, 'pricing-reference-generated');
  assert.equal(edited.length, 1);
  assert.equal(edited[0].file, PRICING_REFERENCE);
  assert.match(edited[0].msg, /do not edit it by hand/);
  assert.match(diags(base, 'pricing-reference-generated')[0].msg, /missing/);
  // No snapshot: nothing to compare (api-sync-snapshot warns instead).
  assert.deepEqual(diags({}, 'pricing-reference-generated'), []);
});
