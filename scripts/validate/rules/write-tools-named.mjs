import { sectionText } from '../markdown.mjs';

const VAGUE = /matching write tools|matching `?get_\*`? *\/ *`?list_\*`?|matching `?(?:get|list)_\*`? tools/i;
const MCP_NOT_SHIPPED = /mcp is not shipped|kingminos mcp is not shipped|rest(?:-only)?;?\s*kingminos mcp is not shipped/i;

export default {
  id: 'write-tools-named',
  docRef: 'SECURITY.md#write-on-confirm-protocol',
  description: 'Tools and mutations are named exactly — no "matching write tools". A write-capable skill has a `## Mutations` section naming each REST call, and follows the write-on-confirm protocol.',
  check(model) {
    const out = [];
    for (const skill of model.skills) {
      if (!skill.frontmatter) continue;
      const scan = model.scan(skill.skillPath);
      scan.lines.forEach((line, index) => {
        if (VAGUE.test(line)) out.push({ file: skill.skillPath, line: index + 1, msg: 'name the exact REST paths instead of "matching …" wildcards' });
      });
      const mutations = scan.headings.find((h) => h.level === 2 && /^Mutations\b/.test(h.text));
      if (!mutations) continue;
      const text = sectionText(scan, mutations);
      if (!/write-on-confirm/i.test(skill.raw)) {
        out.push({ file: skill.skillPath, line: mutations.line, msg: 'write-capable skill must reference the SECURITY.md write-on-confirm protocol' });
      }
      const rows = text.split('\n').filter((l) => /^\s*(?:[-*]|\|)\s*/.test(l) && /\b(POST|PATCH|PUT|DELETE)\b/.test(l));
      if (rows.length === 0) out.push({ file: skill.skillPath, line: mutations.line, msg: '`## Mutations` lists no calls (one row per METHOD /path)' });
      for (const row of rows) {
        const namesTool = /`[a-z][a-z0-9_]*`/.test(row);
        if (!namesTool && !MCP_NOT_SHIPPED.test(row) && !MCP_NOT_SHIPPED.test(text)) {
          out.push({ file: skill.skillPath, line: scan.lines.indexOf(row) + 1, msg: 'mutation row must name a REST path and note that KingMinos MCP is not shipped' });
        }
      }
    }
    return out;
  },
};
