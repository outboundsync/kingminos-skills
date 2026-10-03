import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { validate } from '../scripts/validate/cli.mjs';
import { endpointRows } from '../scripts/validate/rules/endpoint-map-consistent.mjs';
import {
  FALLBACK_TOOLS,
  loadOpenApi,
  resourceOperations,
  resourceOperationsFromOpenApiText,
  toSnake,
} from '../scripts/validate/rules/endpoint-map-openapi.mjs';
import { makeRepo, readmeFor, skillMd } from './helpers/fixture.mjs';

const INVENTORY = `openapi: 3.1.0
info: { title: t, version: '0.1.0' }
paths:
  /health:
    get: { summary: live }
  /openapi.yaml:
    get: { summary: spec }
  /v1/providers:
    get: { operationId: get_providers }
  /v1/capabilities:
    get: { operationId: get_capabilities }
`;

const MAP = `| REST | MCP tool | Access | Notes |
| --- | --- | --- | --- |
| \`GET /v1/providers\` | \`get_providers\` | R | x |
| \`GET /v1/capabilities\` | \`get_capabilities\` | R | y |
`;

function withOpenApi(inventory, overrides, envExtra = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'km-openapi-'));
  const specPath = path.join(dir, 'openapi.yaml');
  writeFileSync(specPath, inventory);
  const prev = process.env.KINGMINOS_OPENAPI_PATH;
  const prevUrl = process.env.KINGMINOS_OPENAPI_URL;
  process.env.KINGMINOS_OPENAPI_PATH = specPath;
  delete process.env.KINGMINOS_OPENAPI_URL;
  Object.assign(process.env, envExtra);
  const repo = makeRepo({
    'skills/api/SKILL.md': skillMd({ name: 'api' }).replace('references/rubric.md', 'references/endpoints.md'),
    'skills/api/references/endpoints.md': MAP,
    'README.md': readmeFor(['api', 'demo']),
    ...overrides,
  });
  try {
    return validate({ root: repo.root }).diagnostics.filter((d) => d.rule === 'endpoint-map-openapi');
  } finally {
    repo.cleanup();
    if (prev === undefined) delete process.env.KINGMINOS_OPENAPI_PATH;
    else process.env.KINGMINOS_OPENAPI_PATH = prev;
    if (prevUrl === undefined) delete process.env.KINGMINOS_OPENAPI_URL;
    else process.env.KINGMINOS_OPENAPI_URL = prevUrl;
  }
}

test('endpointRows parses METHOD /path to tool', () => {
  const { rows, problems } = endpointRows(MAP);
  assert.equal(problems.length, 0);
  assert.equal(rows.get('GET /v1/providers').tool, 'get_providers');
  assert.equal(rows.get('GET /v1/capabilities').access, 'R');
});

test('toSnake and resourceOperations skip discovery paths', () => {
  assert.equal(toSnake('getProviders'), 'get_providers');
  assert.equal(toSnake('company_resolve'), 'company_resolve');
  const ops = resourceOperations({
    paths: {
      '/health': { get: {} },
      '/v1/openapi.yaml': { get: {} },
      '/v1/company/resolve': { post: { operationId: 'companyResolve' } },
    },
  });
  assert.deepEqual(ops.map((op) => [op.route, op.tool]), [['POST /v1/company/resolve', 'company_resolve']]);
  assert.equal(FALLBACK_TOOLS['DELETE /v1/subjects/{subject_key}'], 'delete_subject');
});

test('endpoint-map-openapi: map matching inventory is clean', () => {
  assert.deepEqual(withOpenApi(INVENTORY, {}), []);
});

test('endpoint-map-openapi: missing resource operation fails', () => {
  const diags = withOpenApi(INVENTORY, {
    'skills/api/references/endpoints.md': `| \`GET /v1/providers\` | \`get_providers\` | R | x |\n`,
  });
  assert.equal(diags.some((d) => /GET \/v1\/capabilities/.test(d.msg)), true);
});

test('endpoint-map-openapi: invented path fails', () => {
  const diags = withOpenApi(INVENTORY, {
    'skills/api/references/endpoints.md': `${MAP}| \`POST /v1/invented\` | \`invented\` | R | no |\n`,
  });
  assert.equal(diags.some((d) => /POST \/v1\/invented/.test(d.msg)), true);
});

test('endpoint-map-openapi: wrong tool name fails', () => {
  const diags = withOpenApi(INVENTORY, {
    'skills/api/references/endpoints.md': `| \`GET /v1/providers\` | \`list_providers\` | R | x |\n| \`GET /v1/capabilities\` | \`get_capabilities\` | R | y |\n`,
  });
  assert.equal(diags.some((d) => /list_providers/.test(d.msg) && /get_providers/.test(d.msg)), true);
});

test('loadOpenApi reads KINGMINOS_OPENAPI_PATH', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'km-oa-'));
  const specPath = path.join(dir, 'spec.yaml');
  writeFileSync(specPath, INVENTORY);
  const loaded = loadOpenApi({ env: { KINGMINOS_OPENAPI_PATH: specPath } });
  assert.equal(resourceOperationsFromOpenApiText(loaded.text).length, 2);
});

test('resourceOperationsFromOpenApiText skips discovery and reads operationId', () => {
  const ops = resourceOperationsFromOpenApiText(INVENTORY);
  assert.deepEqual(ops.map((op) => [op.route, op.tool]), [
    ['GET /v1/providers', 'get_providers'],
    ['GET /v1/capabilities', 'get_capabilities'],
  ]);
});
