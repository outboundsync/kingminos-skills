#!/usr/bin/env node
// Generates skills/api/references/pricing.md, the only place the skills pack
// writes a credit price, from the `x-kingminos-pricing` block on each
// capability operation of a KingMinos OpenAPI JSON document — normally
// api-sync/openapi.snapshot.json, or the live spec the API sync workflow just
// fetched. Those blocks are slices of `GET https://api.kingminos.com/v1/pricing`
// (kingminos-application/src/pricing-table.ts), which is also what kingminos.com
// renders its prices from.
//
// Only capability prices are rendered. Plans (subscriptions, pay-as-you-go,
// free daily credits, onboarding grants) are not in the spec, so the file
// points to `GET /v1/pricing` for them instead of copying them: that keeps the
// `pricing-reference-generated` validate rule hermetic (snapshot in, file out)
// and means a plan change can never leave a stale number in the pack.
//
// Output is deterministic (capabilities sorted by route, paths in spec order),
// so the `pricing-reference-generated` rule can require file == render(snapshot).
// Node built-ins only.
//
//   node scripts/sync-pricing.mjs [spec.json]            # write the reference (default: the snapshot)
//   node scripts/sync-pricing.mjs [spec.json] --check    # exit 1 when the reference is stale
//   node scripts/sync-pricing.mjs [spec.json] --out <path>

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

export const PRICING_REFERENCE = 'skills/api/references/pricing.md';
export const PRICING_EXTENSION = 'x-kingminos-pricing';
const DEFAULT_SPEC = 'api-sync/openapi.snapshot.json';

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Every `x-kingminos-pricing` block in an OpenAPI document, sorted by route then method. */
export function pricingSlices(spec) {
  const out = [];
  if (!isRecord(spec) || !isRecord(spec.paths)) return out;
  for (const route of Object.keys(spec.paths).sort()) {
    const item = spec.paths[route];
    if (!isRecord(item)) continue;
    for (const method of METHODS) {
      const slice = item[method]?.[PRICING_EXTENSION];
      if (isRecord(slice)) out.push({ route, method: method.toUpperCase(), slice });
    }
  }
  return out;
}

/** Every way a pricing slice is unusable. Empty means valid. */
export function sliceProblems({ route, method, slice }) {
  const where = `${method} ${route} ${PRICING_EXTENSION}`;
  const out = [];
  if (typeof slice.id !== 'string' || !/^[a-z]+\.[a-z0-9_]+$/.test(slice.id)) out.push(`${where}: bad id`);
  if (typeof slice.outcome_priced !== 'boolean') out.push(`${where}: outcome_priced is not a boolean`);
  if (!isNumber(slice.max_credits_ceiling)) out.push(`${where}: max_credits_ceiling is not a number`);
  if (!Array.isArray(slice.paths) || slice.paths.length === 0) out.push(`${where}: no paths`);
  for (const p of Array.isArray(slice.paths) ? slice.paths : []) {
    if (!isRecord(p) || typeof p.name !== 'string') {
      out.push(`${where}: a path has no name`);
      continue;
    }
    for (const key of ['cap', 'byok', 'miss']) if (!isNumber(p[key])) out.push(`${where} ${p.name}: ${key} is not a number`);
    const d = p.delivered;
    const ok = slice.outcome_priced
      ? isNumber(d)
      : isRecord(d) && isNumber(d.min) && isNumber(d.max) && (d.typical === null || isNumber(d.typical));
    if (!ok) out.push(`${where} ${p.name}: delivered does not match outcome_priced=${slice.outcome_priced}`);
  }
  for (const hop of Array.isArray(slice.opt_in_hops) ? slice.opt_in_hops : []) {
    if (!isRecord(hop) || typeof hop.provider !== 'string' || !isNumber(hop.price)) out.push(`${where}: bad opt_in_hops entry`);
  }
  return out;
}

const num = (n) => String(n);
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();

/** One delivered price, or `min–max` when the code does not fix one. */
export function deliveredText(delivered) {
  if (isNumber(delivered)) return num(delivered);
  if (delivered.typical !== null && delivered.typical !== undefined) return num(delivered.typical);
  return delivered.min === delivered.max ? num(delivered.min) : `${num(delivered.min)}–${num(delivered.max)}`;
}

function uniform(values) {
  return values.length > 0 && values.every((v) => v === values[0]) ? values[0] : null;
}

/** Renders the pricing reference. Throws when a pricing block is malformed. */
export function renderPricingReference(spec) {
  const slices = pricingSlices(spec);
  const problems = slices.flatMap(sliceProblems);
  if (problems.length > 0) throw new Error(`unusable ${PRICING_EXTENSION} blocks:\n  - ${problems.join('\n  - ')}`);

  const allPaths = slices.flatMap(({ slice }) => slice.paths);
  const miss = uniform(allPaths.map((p) => p.miss));
  const byok = uniform(allPaths.map((p) => p.byok));

  const lines = [
    '# KingMinos capability prices',
    '',
    '<!-- GENERATED by scripts/sync-pricing.mjs from the x-kingminos-pricing blocks in api-sync/openapi.snapshot.json. Do not edit by hand: the API sync workflow regenerates it (`npm run sync:pricing`), and the pricing-reference-generated validate rule fails when it drifts. -->',
    '',
    'Generated from the `x-kingminos-pricing` block on each capability operation of the KingMinos OpenAPI spec (`https://api.kingminos.com/openapi.json`), the same table `GET https://api.kingminos.com/v1/pricing` serves. This is the only file in the pack that states a credit price; every other skill points here. Don\'t quote a price from memory or from an older copy of a skill: read it here, or call `GET /v1/pricing` for the current table.',
    '',
    '## How to read the tables',
    '',
    '- **Path**: the routing path (`routing.path`). The capability\'s default path is marked *(default)*.',
    '- **Cap**: the most provider credits the path reserves by default (`routing.max_provider_credits`). **Ceiling**: the server-side limit that no request can exceed.',
    '- **Delivered**: credits for a delivered answer. One number when the code fixes the price (every outcome-priced capability, and hop-priced paths whose min and max are equal); otherwise `min–max`, the billing steps that answered, clamped to the cap.',
    '- **BYOK**: the flat router fee for a step that runs on your own vendor key, instead of the house price; your vendor bills you directly. Charged per answer or per billing hop, as each capability says.',
    '- **Miss**: credits for a miss, blank, withheld answer, error or timeout.',
  ];
  if (miss !== null) lines.push('', `Every path below bills **${num(miss)}** for a miss.${byok !== null ? ` Every path\'s BYOK fee is **${num(byok)}** credits.` : ''}`);
  else if (byok !== null) lines.push('', `Every path\'s BYOK fee is **${num(byok)}** credits.`);
  lines.push(
    '',
    'Plans (subscriptions, pay-as-you-go, free daily credits, onboarding grants) are not in the OpenAPI spec, so they are not copied here. Read them from `plans` in `GET https://api.kingminos.com/v1/pricing`, or the pricing page at `https://kingminos.com/pricing/`.',
  );

  if (slices.length === 0) {
    lines.push('', '## Capabilities', '', 'The spec carries no `x-kingminos-pricing` blocks yet. Call `GET https://api.kingminos.com/v1/pricing` for prices.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('', '## Capabilities', '', '| Capability | Route | Priced per | Default path | Ceiling |', '| --- | --- | --- | --- | --- |');
  for (const { route, method, slice } of slices) {
    const per = slice.outcome_priced ? 'delivered answer' : 'billing hop';
    lines.push(`| [\`${slice.id}\`](#${anchor(slice.id)}) | \`${method} ${route}\` | ${per} | \`${slice.default_path}\` | ${num(slice.max_credits_ceiling)} |`);
  }

  for (const { route, method, slice } of slices) {
    const priced = slice.outcome_priced
      ? 'Outcome-priced: a delivered answer bills one path price, whatever steps ran.'
      : 'Hop-priced: a delivered answer bills the billing steps that answered, clamped to the path cap.';
    const byokBasis = slice.byok_basis === 'per_answer' ? 'per answer' : slice.byok_basis === 'per_billing_hop' ? 'per billing hop' : String(slice.byok_basis ?? 'per answer');
    lines.push(
      '',
      `## ${slice.id}`,
      '',
      `\`${method} ${route}\`. ${priced} BYOK is charged ${byokBasis}. Ceiling: ${num(slice.max_credits_ceiling)}.`,
      '',
      '| Path | Cap | Delivered | BYOK | Miss |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const p of slice.paths) {
      const name = `\`${p.name}\`${p.name === slice.default_path ? ' *(default)*' : ''}`;
      lines.push(`| ${name} | ${num(p.cap)} | ${deliveredText(p.delivered)} | ${num(p.byok)} | ${num(p.miss)} |`);
    }
    const hops = Array.isArray(slice.opt_in_hops) ? slice.opt_in_hops : [];
    if (hops.length > 0) {
      lines.push('', 'Opt-in hops (off the default paths; each bills its own price when it decides):', '', '| Provider | Price | Note |', '| --- | --- | --- |');
      for (const hop of hops) lines.push(`| \`${hop.provider}\` | ${num(hop.price)} | ${cell(hop.note ?? '')} |`);
    }
    const notes = Array.isArray(slice.notes) ? slice.notes : [];
    if (notes.length > 0) {
      lines.push('');
      for (const note of notes) lines.push(`- ${cell(note)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** GitHub heading anchor for `## company.b2b_social` (dots dropped). */
function anchor(id) {
  return id.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const outIndex = args.indexOf('--out');
  const out = outIndex >= 0 ? args[outIndex + 1] : path.join(ROOT, PRICING_REFERENCE);
  const input = args.find((arg, i) => !arg.startsWith('--') && (outIndex < 0 || i !== outIndex + 1)) ?? path.join(ROOT, DEFAULT_SPEC);

  let rendered;
  try {
    const spec = JSON.parse(readFileSync(input, 'utf8'));
    rendered = renderPricingReference(spec);
  } catch (err) {
    console.error(`::error title=Pricing reference not generated::${input}: ${err.message.replace(/\n/g, ' ')}`);
    process.exit(1);
  }
  const shown = path.relative(process.cwd(), out) || out;
  if (check) {
    let current = null;
    try {
      current = readFileSync(out, 'utf8');
    } catch {
      // missing counts as stale
    }
    if (current !== rendered) {
      console.error(`${shown} does not match ${input}; run \`npm run sync:pricing\` (never edit it by hand).`);
      process.exit(1);
    }
    console.log(`${shown} matches ${input}.`);
    return;
  }
  writeFileSync(out, rendered);
  console.log(`Wrote ${shown} from ${path.relative(process.cwd(), input) || input}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
