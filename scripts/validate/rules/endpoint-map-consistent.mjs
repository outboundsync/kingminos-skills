// The api skill's references/endpoints.md is the pack's REST ↔ tool map.
// Other skills keep trimmed copies (links between skill folders break after
// install), so their rows must agree with it: path, tool, and access for
// endpoint maps; path and tool for tables inside SKILL.md (e.g. ## Mutations).
// `· Inventory:` lines and "<n> resource operations" counts must match the
// canonical tool set so hard-coded lists cannot drift (F9).
const CANONICAL = 'skills/api/references/endpoints.md';
const ROUTE_START = /^\| `(?:GET|POST|PUT|PATCH|DELETE) /;
const ROW = /^\| `((?:GET|POST|PUT|PATCH|DELETE) [^`]+)` \| `([a-z][a-z0-9_]*)` \| ([^|]+?) \|/;
const INVENTORY_LINE = /^[-*]\s+·\s+Inventory:\s+(.+?)\s*$/;
const RESOURCE_COUNT = /(\d+)\s+resource operations/;

/** Parses route rows; reports malformed and duplicate rows instead of skipping them. */
export function endpointRows(text) {
  const rows = new Map();
  const problems = [];
  text.split('\n').forEach((line, index) => {
    if (!ROUTE_START.test(line)) return;
    const match = line.match(ROW);
    if (!match) {
      problems.push({ line: index + 1, msg: 'route row does not match `| `METHOD /path` | `tool` | … |` — fix the formatting so it can be checked' });
      return;
    }
    const [, route, tool, access] = match;
    if (rows.has(route)) problems.push({ line: index + 1, msg: `\`${route}\` appears twice (first on line ${rows.get(route).line})` });
    else rows.set(route, { tool, access: access.trim(), line: index + 1 });
  });
  return { rows, problems };
}

export function inventoryToolsFromLine(rest) {
  return String(rest).split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
}

function sameToolSet(actual, expected) {
  if (actual.length !== expected.length) return false;
  const set = new Set(expected);
  return actual.every((tool) => set.has(tool));
}

function checkInventoryMentions(file, text, expectedTools, out) {
  const expectedList = expectedTools.join(' · ');
  String(text).split('\n').forEach((line, index) => {
    const inventory = line.match(INVENTORY_LINE);
    if (inventory) {
      const tools = inventoryToolsFromLine(inventory[1]);
      if (!sameToolSet(tools, expectedTools)) {
        out.push({ file, line: index + 1, msg: `Inventory lists ${tools.join(' · ') || '(empty)'}; the api map has ${expectedList}` });
      }
    }
    const count = line.match(RESOURCE_COUNT);
    if (count && Number(count[1]) !== expectedTools.length) {
      out.push({ file, line: index + 1, msg: `says ${count[1]} resource operations; the api map has ${expectedTools.length}` });
    }
  });
}

export default {
  id: 'endpoint-map-consistent',
  docRef: CANONICAL,
  description: "Route rows (`| `METHOD /path` | `tool` | … |`) in any skill's references/endpoints.md or SKILL.md match the api skill's canonical map; Inventory lines match that tool set.",
  check(model) {
    const out = [];
    const copies = model.skills.flatMap((skill) =>
      [`${skill.dir}/references/endpoints.md`, skill.skillPath].filter((file) => file !== CANONICAL && skill.files.includes(file)),
    );
    const canonicalText = model.text(CANONICAL);
    if (canonicalText === null) {
      const withRows = copies.filter((file) => endpointRows(model.text(file)).rows.size > 0);
      return withRows.map((file) => ({ file, line: 0, msg: `has REST ↔ tool rows but the canonical map ${CANONICAL} is missing` }));
    }

    const canonical = endpointRows(canonicalText);
    for (const problem of canonical.problems) out.push({ file: CANONICAL, ...problem });
    const expectedTools = [...canonical.rows.values()].map((row) => row.tool);

    for (const file of copies) {
      const isEndpointMap = file.endsWith('/references/endpoints.md');
      const { rows, problems } = endpointRows(model.text(file));
      for (const problem of problems) out.push({ file, ...problem });
      for (const [route, row] of rows) {
        const truth = canonical.rows.get(route);
        if (!truth) out.push({ file, line: row.line, msg: `\`${route}\` is not in ${CANONICAL}` });
        else if (truth.tool !== row.tool) out.push({ file, line: row.line, msg: `\`${route}\` maps to tool \`${row.tool}\`; the api map says \`${truth.tool}\`` });
        else if (isEndpointMap && truth.access !== row.access) out.push({ file, line: row.line, msg: `\`${route}\` access '${row.access}'; the api map says '${truth.access}'` });
      }
    }

    if (canonical.problems.length === 0 && expectedTools.length > 0) {
      for (const skill of model.skills) {
        for (const file of skill.files.filter((f) => f.endsWith('.md'))) {
          checkInventoryMentions(file, model.text(file), expectedTools, out);
        }
      }
    }
    return out;
  },
};
