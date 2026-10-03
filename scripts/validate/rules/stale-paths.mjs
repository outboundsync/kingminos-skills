// Paths and names from the OutboundSync skills pack or earlier layouts that
// must not reappear here. This repo is KingMinos enrichment, not CRM sync.
const STALE = /outboundsync_signals|outboundsync-signals|docs\/hubspot_fields\.md|docs\/salesforce_fields\.md|docs\/prompt_library\.md|SKILL-blue\.md|SKILL-red\.md|openclaw-skills|outboundsync-analysis\/|skills\/preflight|skills\/sync-monitoring|mcp\.outboundsync\.com|OUTBOUNDSYNC_API_KEY/;

export default {
  id: 'stale-paths',
  docRef: 'CONTRIBUTING.md',
  description: 'No references to OutboundSync product-skill paths, keys, or retired pack names.',
  check(model) {
    const out = [];
    const files = [...model.docs.filter((f) => f !== 'CHANGELOG.md'), ...model.skills.flatMap((s) => s.files.filter((f) => /\.(md|ya?ml)$/.test(f)))];
    for (const file of files) {
      model.text(file).split('\n').forEach((line, index) => {
        const match = line.match(STALE);
        if (match) out.push({ file, line: index + 1, msg: `stale OutboundSync-skills reference '${match[0]}' — this pack is KingMinos` });
      });
    }
    return out;
  },
};
