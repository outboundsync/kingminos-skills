// The api skill map is the pack inventory of KingMinos resource operations.
// CI compares it to OpenAPI (live GET /openapi.yaml, or a local fixture) so
// a drifted METHOD /path or snake_case tool fails this repo the same way
// kingminos-application `check:surfaces` will once it can clone the pack.
//
// Path extraction is line-oriented on the OpenAPI `paths:` block so a live
// spec with YAML 1.1 compact-mapping quirks still yields a resource inventory.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { endpointRows } from './endpoint-map-consistent.mjs';

export const CANONICAL = 'skills/api/references/endpoints.md';
export const FIXTURE = 'scripts/validate/fixtures/openapi-inventory.yaml';
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const DISCOVERY = /(?:^|\/)(?:health|openapi\.(?:ya?ml|json))$/;

// snake_case tools when the served spec has not yet published operationId
// (PR 137 inventory). Live paths still win; this only names the tool.
export const FALLBACK_TOOLS = {
  'GET /v1/providers': 'get_providers',
  'GET /v1/capabilities': 'get_capabilities',
  'POST /v1/company/resolve': 'company_resolve',
  'POST /v1/company/domain': 'company_domain',
  'POST /v1/company/hierarchy': 'company_hierarchy',
  'POST /v1/person/verify-employment': 'person_verify_employment',
  'GET /v1/runs/{id}': 'get_run',
  'PUT /v1/credentials/{provider}': 'put_credentials',
  'DELETE /v1/credentials/{provider}': 'delete_credentials',
  'DELETE /v1/subjects/{subject_key}': 'delete_subject',
};

export function toSnake(operationId) {
  return String(operationId)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

export function resourceOperations(spec) {
  const out = [];
  for (const [routePath, item] of Object.entries(spec?.paths ?? {})) {
    if (DISCOVERY.test(routePath) || !item || typeof item !== 'object') continue;
    for (const method of METHODS) {
      const op = item[method];
      if (!op || typeof op !== 'object') continue;
      const route = `${method.toUpperCase()} ${routePath}`;
      const operationId = typeof op.operationId === 'string' && op.operationId.trim() ? op.operationId.trim() : null;
      const tool = operationId ? toSnake(operationId) : (FALLBACK_TOOLS[route] ?? null);
      out.push({ route, method: method.toUpperCase(), path: routePath, operationId, tool });
    }
  }
  return out;
}

/** Resource ops from an OpenAPI YAML/JSON document (paths + methods + operationId). */
export function resourceOperationsFromOpenApiText(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  let inPaths = false;
  let currentPath = null;
  let currentMethod = null;
  const out = [];
  for (const line of lines) {
    if (!inPaths) {
      if (line === 'paths:') inPaths = true;
      continue;
    }
    if (/^[A-Za-z]/.test(line)) break;
    const pathMatch = line.match(/^  (\/[^\s:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      currentMethod = null;
      continue;
    }
    const methodMatch = line.match(/^    (get|post|put|patch|delete):\s*(.*)$/);
    if (methodMatch && currentPath) {
      currentMethod = methodMatch[1].toUpperCase();
      const route = `${currentMethod} ${currentPath}`;
      const compactId = methodMatch[2].match(/operationId:\s*['"]?([A-Za-z0-9_-]+)/);
      out.push({
        route,
        method: currentMethod,
        path: currentPath,
        operationId: compactId?.[1] ?? null,
        tool: compactId ? toSnake(compactId[1]) : (FALLBACK_TOOLS[route] ?? null),
      });
      continue;
    }
    const opId = line.match(/^      operationId:\s*['"]?([A-Za-z0-9_-]+)/);
    if (opId && currentPath && currentMethod) {
      const last = out.at(-1);
      if (last && last.path === currentPath && last.method === currentMethod) {
        last.operationId = opId[1];
        last.tool = toSnake(opId[1]);
      }
    }
  }
  return out.filter((op) => !DISCOVERY.test(op.path));
}

export function loadOpenApi({ root, env = process.env } = {}) {
  const fromPath = env.KINGMINOS_OPENAPI_PATH;
  if (fromPath) return { text: readFileSync(fromPath, 'utf8'), source: fromPath };
  const url = env.KINGMINOS_OPENAPI_URL;
  if (url) {
    const text = execFileSync('curl', ['-fsSL', '--max-time', '20', url], { encoding: 'utf8' });
    return { text, source: url };
  }
  const fixture = root ? path.join(root, FIXTURE) : FIXTURE;
  if (root && existsSync(fixture)) return { text: readFileSync(fixture, 'utf8'), source: FIXTURE };
  return { text: null, source: null };
}

export default {
  id: 'endpoint-map-openapi',
  docRef: CANONICAL,
  description: 'Canonical REST ↔ MCP rows are exactly the KingMinos OpenAPI resource operations (METHOD /path → snake_case tool).',
  check(model) {
    const canonicalText = model.text(CANONICAL);
    if (canonicalText === null) return [];

    const { rows, problems } = endpointRows(canonicalText);
    const out = problems.map((problem) => ({ file: CANONICAL, ...problem }));

    let loaded;
    try {
      loaded = loadOpenApi({ root: model.root });
    } catch (err) {
      return [{ file: CANONICAL, line: 0, msg: `cannot load KingMinos OpenAPI inventory: ${err.message}` }];
    }
    if (loaded.text === null) return [];

    const inventory = resourceOperationsFromOpenApiText(loaded.text);
    const inventoryByRoute = new Map(inventory.map((op) => [op.route, op]));

    for (const [route, row] of rows) {
      const op = inventoryByRoute.get(route);
      if (!op) {
        out.push({ file: CANONICAL, line: row.line, msg: `\`${route}\` is not a KingMinos OpenAPI resource operation (${loaded.source})` });
        continue;
      }
      if (op.tool && op.tool !== row.tool) {
        out.push({ file: CANONICAL, line: row.line, msg: `\`${route}\` maps to \`${row.tool}\`; OpenAPI inventory says \`${op.tool}\`` });
      }
    }

    for (const op of inventory) {
      if (!rows.has(op.route)) {
        out.push({
          file: CANONICAL,
          line: 0,
          msg: `OpenAPI resource operation \`${op.route}\` is missing from the api map${op.tool ? ` (tool \`${op.tool}\`)` : ''}`,
        });
      }
    }
    return out;
  },
};
