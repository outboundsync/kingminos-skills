// skills/api/references/pricing.md is generated: it must be exactly what
// scripts/sync-pricing.mjs renders from the `x-kingminos-pricing` blocks in
// api-sync/openapi.snapshot.json. A hand edit to the file (or a snapshot bump
// without a refresh) fails the required `validate` check, so the only way a
// price reaches the pack is the API code → live spec → API sync → this file.
//
// Without a snapshot there is nothing to compare against; api-sync-snapshot
// already warns about that.
import { PRICING_REFERENCE, renderPricingReference } from '../../sync-pricing.mjs';
import { SNAPSHOT } from './api-sync-snapshot.mjs';

export default {
  id: 'pricing-reference-generated',
  docRef: 'CONTRIBUTING.md#prices',
  description: `${PRICING_REFERENCE} is exactly what scripts/sync-pricing.mjs renders from ${SNAPSHOT}.`,
  check(model) {
    const raw = model.text(SNAPSHOT);
    if (raw === null) return [];
    let expected;
    try {
      expected = renderPricingReference(JSON.parse(raw));
    } catch (err) {
      // Invalid JSON is api-sync-snapshot's to report; malformed pricing blocks are ours.
      if (err instanceof SyntaxError) return [];
      return [{ file: SNAPSHOT, line: 0, msg: err.message }];
    }
    const actual = model.text(PRICING_REFERENCE);
    if (actual === expected) return [];
    return [{
      file: PRICING_REFERENCE,
      line: 0,
      msg: actual === null
        ? `missing — generate it with \`npm run sync:pricing\``
        : `does not match the x-kingminos-pricing blocks in ${SNAPSHOT}; do not edit it by hand — regenerate it with \`npm run sync:pricing\``,
    }];
  },
};
