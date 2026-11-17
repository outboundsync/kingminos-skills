import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSpec, renderInventoryFixture, specProblem } from '../scripts/openapi-inventory.mjs';
import { validate } from '../scripts/validate/cli.mjs';
import { SNAPSHOT } from '../scripts/validate/rules/api-sync-snapshot.mjs';
import {
  FIXTURE,
  bearerResourceOperations,
  resourceOperations,
  resourceOperationsFromOpenApiText,
} from '../scripts/validate/rules/endpoint-map-openapi.mjs';
import { credentialsProviderEnumFromOpenApi } from '../scripts/validate/rules/provider-enum.mjs';
import { makeRepo } from './helpers/fixture.mjs';

const bearer = [{ bearer: [] }];

// Ten-plus paths so parseSpec's sanity check passes; key order is deliberately
// not sorted to prove the render is order-independent.
function liveSpec(extra = {}) {
  return {
    openapi: '3.1.0',
    info: { title: 'KingMinos by OutboundSync', version: '0.1.0' },
    paths: {
      '/v1/webhooks/{id}': {
        delete: { operationId: 'deleteWebhook', security: bearer },
        get: { operationId: 'getWebhook', security: bearer },
      },
      '/health': { get: { operationId: 'getHealth' } },
      '/openapi.json': { get: { operationId: 'getOpenApiJson' } },
      '/v1/auth/me': { get: { operationId: 'getSessionUser' } },
      '/v1/account/tokens': { get: { operationId: 'listAccountTokens' } },
      '/v1/admin/signups': { get: { operationId: 'adminListSignups', security: bearer, tags: ['admin'] } },
      '/v1/recipes/guidance': { get: { operationId: 'getRecipesGuidance', security: [] } },
      '/v1/providers': { get: { operationId: 'getProviders', security: bearer, summary: 'Providers: registry' } },
      '/v1/company/x-account': { post: { operationId: 'companyXAccount', security: bearer } },
      '/v1/credentials/{provider}': {
        parameters: [{ $ref: '#/components/parameters/Provider' }],
        put: { operationId: 'putCredentials', security: bearer },
        delete: { operationId: 'deleteCredentials', security: bearer },
      },
      '/v1/feedback': { post: { operationId: 'submitFeedback', security: bearer } },
      ...extra,
    },
    components: {
      parameters: {
        Provider: { name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['zoominfo', 'leadmagic'] } },
      },
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'opaque' } },
    },
  };
}

test('renderInventoryFixture keeps Bearer resource ops and drops session, admin, public ops', () => {
  const yaml = renderInventoryFixture(liveSpec());
  const ops = bearerResourceOperations(resourceOperationsFromOpenApiText(yaml));
  assert.deepEqual(ops.map((op) => `${op.route} ${op.tool}`), [
    'POST /v1/company/x-account company_x_account',
    'PUT /v1/credentials/{provider} put_credentials',
    'DELETE /v1/credentials/{provider} delete_credentials',
    'POST /v1/feedback submit_feedback',
    'GET /v1/providers get_providers',
    'GET /v1/webhooks/{id} get_webhook',
    'DELETE /v1/webhooks/{id} delete_webhook',
  ]);
  const pathKeys = yaml.split('\n').filter((line) => /^  \/\S*:$/.test(line)).map((line) => line.trim().slice(0, -1));
  assert.deepEqual(pathKeys, [
    '/health',
    '/openapi.json',
    '/v1/company/x-account',
    '/v1/credentials/{provider}',
    '/v1/feedback',
    '/v1/providers',
    '/v1/webhooks/{id}',
  ], 'session, admin and public ops are dropped; discovery routes stay so the parser is seen to skip them');
  assert.deepEqual(credentialsProviderEnumFromOpenApi(yaml), ['zoominfo', 'leadmagic']);
});

test('renderInventoryFixture is deterministic regardless of key order', () => {
  const spec = liveSpec();
  const reversed = { ...spec, paths: Object.fromEntries(Object.entries(spec.paths).reverse()) };
  assert.equal(renderInventoryFixture(spec), renderInventoryFixture(reversed));
});

test('renderInventoryFixture inherits root security', () => {
  const spec = liveSpec({ '/v1/usage': { get: { operationId: 'getUsage' } } });
  spec.security = bearer;
  spec.paths['/v1/auth/me'].get.security = [];
  const ops = bearerResourceOperations(resourceOperationsFromOpenApiText(renderInventoryFixture(spec)));
  assert.equal(ops.some((op) => op.route === 'GET /v1/usage'), true);
  assert.equal(ops.some((op) => op.route === 'GET /v1/auth/me'), false);
});

test('parseSpec rejects invalid JSON and implausible specs', () => {
  assert.throws(() => parseSpec('<html>', 'live'), /live is not valid JSON/);
  assert.throws(() => parseSpec('{"paths":{}}', 'live'), /missing `openapi`/);
  assert.throws(() => parseSpec('{"openapi":"3.1.0","paths":{"/a":{}}}', 'live'), /paths` has 1 entries/);
  assert.equal(specProblem(liveSpec()), null);
});

function snapshotDiags(files) {
  const repo = makeRepo({ 'scripts/validate/cli.mjs': '// marker\n', ...files });
  const prevPath = process.env.KINGMINOS_OPENAPI_PATH;
  const prevUrl = process.env.KINGMINOS_OPENAPI_URL;
  delete process.env.KINGMINOS_OPENAPI_PATH;
  delete process.env.KINGMINOS_OPENAPI_URL;
  try {
    return validate({ root: repo.root }).diagnostics.filter((d) => d.rule === 'api-sync-snapshot');
  } finally {
    repo.cleanup();
    if (prevPath !== undefined) process.env.KINGMINOS_OPENAPI_PATH = prevPath;
    if (prevUrl !== undefined) process.env.KINGMINOS_OPENAPI_URL = prevUrl;
  }
}

test('api-sync-snapshot: no snapshot only warns (bootstrap pending)', () => {
  const diags = snapshotDiags({});
  assert.equal(diags.length, 1);
  assert.equal(diags[0].severity, 'warn');
});

test('api-sync-snapshot: fixture rendered from the snapshot is clean', () => {
  const spec = liveSpec();
  assert.deepEqual(snapshotDiags({
    [SNAPSHOT]: JSON.stringify(spec, null, 2),
    [FIXTURE]: renderInventoryFixture(spec),
  }), []);
});

test('api-sync-snapshot: stale or hand-edited fixture fails', () => {
  const spec = liveSpec();
  const fixture = renderInventoryFixture(spec);
  const stale = snapshotDiags({
    [SNAPSHOT]: JSON.stringify(liveSpec({ '/v1/person/new': { post: { operationId: 'personNew', security: bearer } } })),
    [FIXTURE]: fixture,
  });
  assert.equal(stale.length, 1);
  assert.equal(stale[0].severity, 'error');
  assert.equal(stale[0].file, FIXTURE);
  const edited = snapshotDiags({ [SNAPSHOT]: JSON.stringify(spec), [FIXTURE]: fixture.replace('getProviders', 'getProvidersX') });
  assert.equal(edited[0].severity, 'error');
  assert.match(snapshotDiags({ [SNAPSHOT]: JSON.stringify(spec) })[0].msg, /missing/);
});

test('api-sync-snapshot: unusable snapshot fails', () => {
  const diags = snapshotDiags({ [SNAPSHOT]: '{"openapi":"3.1.0","paths":{}}' });
  assert.equal(diags[0].severity, 'error');
  assert.match(diags[0].msg, /not a usable OpenAPI document/);
});

test('Bearer is decided by scheme type, not the scheme key', () => {
  const spec = liveSpec({ '/v1/usage': { get: { operationId: 'getUsage', security: [{ apiToken: [] }] } } });
  spec.components.securitySchemes.apiToken = { type: 'http', scheme: 'bearer' };
  spec.components.securitySchemes.bearer = { type: 'apiKey', in: 'header', name: 'X-Key' };
  const ops = bearerResourceOperations(resourceOperationsFromOpenApiText(renderInventoryFixture(spec)));
  assert.deepEqual(ops.map((op) => op.route), ['GET /v1/usage']);
  const direct = bearerResourceOperations(resourceOperations(spec)).map((op) => op.route);
  assert.deepEqual(direct, ['GET /v1/usage']);
});

test('auth, account and admin prefixes are never public, even with Bearer security', () => {
  const spec = liveSpec({
    '/v1/account/tokens': { get: { operationId: 'listAccountTokens', security: bearer } },
    '/v1/auth/me': { get: { operationId: 'getSessionUser', security: bearer } },
    '/v1/admin/x': { get: { operationId: 'adminX', security: bearer } },
    '/v1/runs/{id}': { get: { operationId: 'adminTagged', security: bearer, tags: ['Admin'] } },
  });
  const routes = bearerResourceOperations(resourceOperations(spec)).map((op) => op.route);
  assert.equal(routes.some((r) => /\/v1\/(auth|account|admin)|runs/.test(r)), false);
});
