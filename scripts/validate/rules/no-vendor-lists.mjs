// Public text (README, CONVENTIONS, SECURITY, CHANGELOG, every skill file) does not list
// house-key or BYOK vendors by name. KingMinos is a router: which vendors sit
// behind it, which are house-key, and the order a path tries them are product
// decisions that change, and the live catalog (`GET /v1/credentials`,
// `house_managed`) already says which is which for a tenant.
//
// A paragraph (a run of non-blank lines, so a table counts as one) fails when
// it names three or more distinct vendors outside inline code. Inline code is
// the API contract and stays: the path `provider` enum, API-key id lists,
// `routing.only` values, `*_credentials_required` codes, and fields such as
// `zoominfo_company_id`. Vendors come from the hermetic inventory
// (scripts/validate/fixtures/providers.yaml); house-only hops are not vendors.
// The generated pricing reference renders the spec as-is and is skipped.
import { PRICING_REFERENCE } from '../../sync-pricing.mjs';
import { loadProvidersFixture } from './provider-enum.mjs';

const PUBLIC_DOCS = new Set(['README.md', 'CONVENTIONS.md', 'SECURITY.md', 'CHANGELOG.md']);
export const LIMIT = 3;

function escapeChar(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `aiark` matches AIArk, AI Ark, ai-ark; `snovio` matches Snov.io. */
export function vendorPattern(id) {
  const body = [...id].map(escapeChar).join('[\\s.-]?');
  return new RegExp(`(?<![A-Za-z0-9_])${body}(?![A-Za-z0-9_])`, 'i');
}

/** Blanks inline code spans, keeping line length. */
function stripInlineCode(line) {
  return line.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
}

export function findVendorLists(text, providers, limit = LIMIT) {
  const vendors = providers.filter((p) => p.supply !== 'house_only').map((p) => ({ ...p, re: vendorPattern(p.id) }));
  const out = [];
  let seen = new Map();
  let reported = false;
  String(text).split('\n').forEach((raw, index) => {
    if (raw.trim() === '') {
      seen = new Map();
      reported = false;
      return;
    }
    const line = stripInlineCode(raw);
    for (const vendor of vendors) {
      if (!seen.has(vendor.id) && vendor.re.test(line)) seen.set(vendor.id, vendor.label);
    }
    if (!reported && seen.size >= limit) {
      reported = true;
      out.push({ line: index + 1, names: [...seen.values()] });
    }
  });
  return out;
}

export default {
  id: 'no-vendor-lists',
  docRef: 'CONVENTIONS.md#brand',
  description: 'Public text does not list house-key or BYOK vendors by name (three or more in one paragraph outside inline code).',
  check(model) {
    const loaded = loadProvidersFixture(model.root);
    if (!loaded.providers || loaded.providers.length === 0) return [];
    const files = model.markdownFiles().filter((file) => (PUBLIC_DOCS.has(file) || file.startsWith('skills/')) && file !== PRICING_REFERENCE);
    const out = [];
    for (const file of files) {
      const text = model.text(file);
      if (text === null) continue;
      for (const hit of findVendorLists(text, loaded.providers)) {
        out.push({
          file,
          line: hit.line,
          msg: `names ${hit.names.length} vendors (${hit.names.join(', ')}). Don't list house-key / BYOK vendors in public text; point to GET /v1/credentials (house_managed). Contract ids in inline code are fine.`,
        });
      }
    }
    return out;
  },
};
