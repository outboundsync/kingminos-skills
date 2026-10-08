// The api skill map is the pack inventory of KingMinos **Bearer** resource
// operations. Session/product-app ops (`/v1/auth/*`, `/v1/account/*`) declare
// no bearer security and are out of scope — the same Bearer-only rule as
// `npm run check:surfaces`. CI on PR/push compares the map to the offline
// fixture; a scheduled workflow curls the live spec.
//
// Prefer structured YAML (`yaml.parseDocument`). Fall back to a line scan only
// when parsing fails (YAML 1.1 compact-mapping quirks).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
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
  'POST /v1/company/b2b-social': 'company_b2b_social',
  'POST /v1/company/icon': 'company_icon',
  'POST /v1/person/verify-employment': 'person_verify_employment',
  'GET /v1/runs/{id}': 'get_run',
  'GET /v1/credentials': 'list_credentials',
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

/** True when the operation (or inherited root) security requirement names `bearer`. */
export function opDeclaresBearer(security) {
  if (!Array.isArray(security) || security.length === 0) return false;
  return security.some((req) => req && typeof req === 'object' && Object.keys(req).some((name) => name.toLowerCase() === 'bearer'));
}

export function bearerResourceOperations(ops) {
  return ops.filter((op) => opDeclaresBearer(op.security));
}

function inheritedSecurity(spec, op) {
  if (op && Object.prototype.hasOwnProperty.call(op, 'security')) return op.security;
  return spec?.security;
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
      out.push({ route, method: method.toUpperCase(), path: routePath, operationId, tool, security: inheritedSecurity(spec, op) });
    }
  }
  return out;
}

function securityFromCompact(rest) {
  if (!rest) return undefined;
  if (/security:\s*\[\s*\]/.test(rest)) return [];
  if (/bearer/i.test(rest) && /security:/.test(rest)) return [{ bearer: [] }];
  return undefined;
}

/** Line-oriented fallback when `yaml` cannot parse the document. */
export function resourceOperationsFromOpenApiLines(text) {
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
        security: securityFromCompact(methodMatch[2]),
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
    if (currentPath && currentMethod) {
      const last = out.at(-1);
      if (last && last.path === currentPath && last.method === currentMethod) {
        if (/^      security:\s*\[\s*\]\s*$/.test(line) || /^      security:\s*$/.test(line)) {
          last.security = last.security ?? [];
        }
        if (/bearer/i.test(line) && /security|^\s+-\s+/.test(line)) {
          last.security = [{ bearer: [] }];
        }
      }
    }
  }
  return out.filter((op) => !DISCOVERY.test(op.path));
}

/** Resource ops from an OpenAPI YAML/JSON document (paths + methods + operationId + security). */
export function resourceOperationsFromOpenApiText(text) {
  const doc = parseDocument(String(text), { prettyErrors: false });
  if (doc.errors.length === 0) {
    const spec = doc.toJS();
    if (spec && typeof spec === 'object' && !Array.isArray(spec)) return resourceOperations(spec);
  }
  return resourceOperationsFromOpenApiLines(text);
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
  description: 'Canonical REST ↔ tool rows are exactly the KingMinos OpenAPI Bearer resource operations (METHOD /path → snake_case operationId).',
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
    if (loaded.text === null) {
      const toolingDir = existsSync(path.join(model.root, 'scripts/validate'));
      if (toolingDir) {
        return [{
          file: CANONICAL,
          line: 0,
          severity: 'warn',
          msg: `no KingMinos OpenAPI inventory loaded (set KINGMINOS_OPENAPI_PATH, KINGMINOS_OPENAPI_URL, or keep ${FIXTURE})`,
        }];
      }
      return [];
    }

    const inventory = bearerResourceOperations(resourceOperationsFromOpenApiText(loaded.text));
    const inventoryByRoute = new Map(inventory.map((op) => [op.route, op]));

    for (const [route, row] of rows) {
      const op = inventoryByRoute.get(route);
      if (!op) {
        out.push({ file: CANONICAL, line: row.line, msg: `\`${route}\` is not a KingMinos OpenAPI Bearer resource operation (${loaded.source})` });
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
          msg: `OpenAPI Bearer resource operation \`${op.route}\` is missing from the api map${op.tool ? ` (tool \`${op.tool}\`)` : ''}`,
        });
      }
    }
    return out;
  },
};
