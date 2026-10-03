// KingMinos brand locks. Spoken name is "King Minos"; written product is KingMinos.
// Salesforce is SFDC or Salesforce — never the abbreviation SF.
const SF_ABBREV = /(^|[^A-Za-z])SF([^A-Za-z]|$)/;
const OUTBOUNDSYNC_PRODUCT_SKILL = /\b(preflight|sync-monitoring|crm-analysis|list-building|cold-email-body)\b/;

export default {
  id: 'brand',
  docRef: 'CONVENTIONS.md#brand',
  description: 'Write KingMinos / King Minos correctly, say SFDC or Salesforce (never SF), and do not ship OutboundSync product-skill names.',
  check(model) {
    const out = [];
    const files = [...model.docs.filter((f) => f !== 'CHANGELOG.md'), ...model.skills.flatMap((s) => s.files.filter((f) => f.endsWith('.md')))];
    for (const file of files) {
      const content = model.text(file);
      if (content === null) continue;
      content.split('\n').forEach((line, index) => {
        if (SF_ABBREV.test(line) && !/SFDC|never|abbreviation|do not write|don't (?:write|say)|forbidden|must not/.test(line)) {
          out.push({ file, line: index + 1, msg: "write SFDC or Salesforce — never the abbreviation SF" });
        }
        if (file.startsWith('skills/') && OUTBOUNDSYNC_PRODUCT_SKILL.test(line) && !/not (?:the |an )?OutboundSync/.test(line)) {
          out.push({ file, line: index + 1, msg: `do not ship OutboundSync product-skill name '${line.match(OUTBOUNDSYNC_PRODUCT_SKILL)?.[1]}'` });
        }
      });
    }
    return out;
  },
};
