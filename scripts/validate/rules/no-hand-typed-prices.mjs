// No credit price is typed by hand in a skill (SKILL.md or references/) or
// the README. Every per-path price (cap,
// delivered, BYOK, miss) lives in the generated
// skills/api/references/pricing.md, which scripts/sync-pricing.mjs renders
// from the snapshot's `x-kingminos-pricing` blocks (the pricing-generated rule
// keeps it equal to that render). A skill that needs a price points there.
//
// Same heuristic as kingminos-website's `check:pricing`
// (src/lib/pricing-coverage.ts). Fenced and inline code are ignored (field
// names, request examples). A number counts as a price when it is non-zero and:
//   a. is followed by "credit(s)", with at most one word between ("15 credits",
//      "10 free credits");
//   b. follows "cap", "cap is" or "cap of" ("Cap 58", "credit cap of **6**");
//   c. comes within 30 characters after bill/bills/billed/cost/costs/price/
//      charge, in the same sentence ("bills a flat **0.1**", "that hop's price (15)");
//   d. sits in a table column whose header says credit, cap, price or cost.
// Zero is allowed: "a miss bills 0" and "cached replays cost 0 credits" are
// billing rules, not prices.
import { PRICING_REFERENCE } from '../../sync-pricing.mjs';

const NUM = String.raw`\d+(?:,\d{3})*(?:\.\d+)?`;
const NOT_AFTER = String.raw`(?<![\w.,$])`;
const PROSE_RULES = [
  { rule: 'number before "credits"', re: new RegExp(String.raw`${NOT_AFTER}(${NUM})\**\s+(?:[A-Za-z][\w-]*\s+)?credits?\b`, 'gi') },
  { rule: 'number after "cap"', re: new RegExp(String.raw`\bcap(?:\s+(?:is|of))?\s+\**(${NUM})(?![\w]|\.\d)`, 'gi') },
  {
    rule: 'number after bill/cost/price',
    re: new RegExp(String.raw`\b(?:bills?|billed|costs?|price[sd]?|charged?)\b[^.\n|<]{0,30}?${NOT_AFTER}\**\(?(${NUM})(?![\w]|\.\d)`, 'gi'),
  },
];
const TABLE_PRICE_HEADER = /credit|\bcap\b|price|cost/i;
const CELL_NUMBER = new RegExp(`${NOT_AFTER}(${NUM})(?![\\w]|\\.\\d)`);

const nonZero = (n) => Number.parseFloat(n.replaceAll(',', '')) !== 0;

/** Blanks out fenced code and inline code, keeping line numbers. */
function stripCode(text) {
  return text
    .replace(/^([ \t]*)(```|~~~)[\s\S]*?^\1\2[^\n]*$/gm, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
}

function cells(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Every hand-typed price in one Markdown text: `{ line, rule, excerpt }`, 1-based lines. */
export function handTypedPrices(text) {
  const out = [];
  const normalized = text.replace(/\r\n?/g, '\n');
  const raw = normalized.split('\n');
  const lines = stripCode(normalized).split('\n');
  const report = (index, rule, excerpt) => out.push({ line: index + 1, rule, excerpt: excerpt.trim().slice(0, 80) });

  let priceColumns = [];
  for (const [index, line] of lines.entries()) {
    // One report per number, even when several rules match it.
    const seen = new Set();
    for (const { rule, re } of PROSE_RULES) {
      for (const match of line.matchAll(re)) {
        const at = (match.index ?? 0) + match[0].lastIndexOf(match[1]);
        if (!nonZero(match[1]) || seen.has(at)) continue;
        seen.add(at);
        report(index, rule, match[0]);
      }
    }
    // Tables: a header row followed by a `| --- |` row starts one; a non-table line ends it.
    if (!line.trim().startsWith('|')) {
      priceColumns = [];
      continue;
    }
    const next = lines[index + 1] ?? '';
    if (/^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(next)) {
      // Header text keeps its code spans: `max_provider_credits` names a price column.
      priceColumns = cells(raw[index]).flatMap((cell, i) => (TABLE_PRICE_HEADER.test(cell) ? [i] : []));
      continue;
    }
    for (const i of priceColumns) {
      const cell = cells(line)[i] ?? '';
      const match = cell.match(CELL_NUMBER);
      if (match && nonZero(match[1])) report(index, 'number in a credits/cap/price column', cell);
    }
  }
  return out;
}

export default {
  id: 'no-hand-typed-prices',
  docRef: 'CONTRIBUTING.md#prices',
  description: `No skill file (SKILL.md, references) or README.md types a non-zero credit price; prices come from the generated ${PRICING_REFERENCE}.`,
  check(model) {
    const files = [
      ...model.skills.flatMap((skill) => skill.files.filter((file) => file.endsWith('.md') && file !== PRICING_REFERENCE)),
      ...model.docs.filter((file) => file === 'README.md'),
    ];
    return files.flatMap((file) =>
      handTypedPrices(model.text(file)).map((hit) => ({
        file,
        line: hit.line,
        msg: `hand-typed price (${hit.rule}): "${hit.excerpt}"; point to the \`api\` skill's pricing reference (${PRICING_REFERENCE}) instead`,
      })),
    );
  },
};
