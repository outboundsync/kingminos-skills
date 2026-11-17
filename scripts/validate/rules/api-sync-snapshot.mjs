// API sync coverage check. api-sync/openapi.snapshot.json is the live KingMinos
// OpenAPI spec (canonical `jq -S .`) as of the last merged API sync PR. The
// hermetic inventory fixture the endpoint-map-openapi and provider-enum rules
// read must be exactly what scripts/openapi-inventory.mjs renders from it, so
// the map, the trimmed copies, and the provider lists are all checked against
// the snapshot — and a hand edit to the fixture (or a snapshot bump without a
// fixture refresh) fails the required `validate` check.
//
// Until the first API sync PR lands there is no snapshot: the rule only warns,
// so today's hand-written fixture keeps CI green.
import { parseSpec, renderInventoryFixture } from '../../openapi-inventory.mjs';
import { FIXTURE } from './endpoint-map-openapi.mjs';

export const SNAPSHOT = 'api-sync/openapi.snapshot.json';

export default {
  id: 'api-sync-snapshot',
  docRef: 'CONTRIBUTING.md#api-sync',
  description: `When ${SNAPSHOT} exists, it is a usable OpenAPI document and ${FIXTURE} is exactly what scripts/openapi-inventory.mjs renders from it.`,
  check(model) {
    const raw = model.text(SNAPSHOT);
    if (raw === null) {
      if (!model.exists('scripts/validate/cli.mjs')) return [];
      return [{
        file: SNAPSHOT,
        line: 0,
        severity: 'warn',
        msg: `no ${SNAPSHOT} yet — skipping the snapshot check; the first API sync run (bootstrap) adds it`,
      }];
    }

    let spec;
    try {
      spec = parseSpec(raw, SNAPSHOT);
    } catch (err) {
      return [{ file: SNAPSHOT, line: 0, msg: err.message }];
    }

    const expected = renderInventoryFixture(spec);
    const actual = model.text(FIXTURE);
    if (actual === expected) return [];
    return [{
      file: FIXTURE,
      line: 0,
      msg: actual === null
        ? `missing — regenerate it with \`node scripts/openapi-inventory.mjs ${SNAPSHOT}\``
        : `does not match ${SNAPSHOT}; do not edit it by hand — regenerate it with \`node scripts/openapi-inventory.mjs ${SNAPSHOT}\``,
    }];
  },
};
