import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createProbe, PACKET_ID, SOURCE, PATH, PAYMONGO_HOOK } from './probe.mjs';

const now = 1791880000000;
const host = 'fitout-runtime-proof-fixture.vercel.app';
const workflowId = '63f24717-1234-4567-8910-123456789012';
const destinationId = '12345678-1234-4567-8910-123456789012';
const keys = generateKeyPairSync('ed25519');
const config = { approved: true, packetId: PACKET_ID, source: SOURCE, notAfter: now + 600000,
  publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }) };
const env = { NODE_ENV: 'production', VERCEL_ENV: 'production', VERCEL_URL: host, VERCEL_DEPLOYMENT_ID: 'dpl_fixture',
  CONTACT_PRODUCTION_ENABLED: 'false', CONTACT_INGRESS_VERIFICATION_MODE: 'false',
  PAYMONGO_SECRET_KEY: 'sk_test_private_fixture', PAYMONGO_PUBLIC_KEY: 'pk_test_public_fixture',
  PAYMONGO_WEBHOOK_SECRET: 'private_paymongo_signing_fixture', DIDIT_API_KEY: 'private_didit_fixture',
  DIDIT_WORKFLOW_ID: workflowId, DIDIT_ENVIRONMENT: 'sandbox', DIDIT_WEBHOOK_SECRET: 'private_didit_signing_fixture' };
const payloads = {
  pay: { data: { id: PAYMONGO_HOOK, type: 'webhook', attributes: { livemode: false, status: 'enabled',
    url: 'https://fitout.live/api/paymongo/webhook', secret_key: env.PAYMONGO_WEBHOOK_SECRET,
    events: ['checkout_session.payment.paid', 'merchant.activated', 'merchant.declined', 'payment.refunded', 'payment.refund.updated'] } } },
  workflow: { uuid: workflowId, workflow_label: 'FitOut Host Verification', is_archived: false },
  list: [{ uuid: destinationId, url: 'https://fitout.live/api/didit/webhook' }],
  destination: { uuid: destinationId, url: 'https://fitout.live/api/didit/webhook', enabled: true,
    webhook_version: 'v3', subscribed_events: ['status.updated'], secret_shared_key: env.DIDIT_WEBHOOK_SECRET },
};
function request(claimChanges = {}, changes = {}) {
  const claim = { packetId: PACKET_ID, host, iat: now, exp: now + 240000, nonce: 'a'.repeat(32), ...claimChanges };
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const headers = { 'x-p27-proof': payload, 'x-p27-signature': sign(null, Buffer.from(payload), keys.privateKey).toString('base64url'), ...changes.headers };
  return new Request(changes.url ?? `https://${host}${PATH}`, { method: changes.method ?? 'GET', headers });
}
function setup(changes = {}) {
  const calls = [];
  const data = { ...payloads, ...changes.data };
  const fetcher = changes.fetcher ?? (async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    const u = new URL(url);
    assert.ok(['api.paymongo.com', 'verification.didit.me'].includes(u.host));
    const which = u.host === 'api.paymongo.com' ? 'pay' : u.pathname === '/v3/webhook/destinations/' ? 'list' :
      u.pathname.startsWith('/v3/workflows/') ? 'workflow' : 'destination';
    if (u.host === 'api.paymongo.com') assert.equal(options.headers.authorization, `Basic ${Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString('base64')}`);
    else assert.equal(options.headers['x-api-key'], env.DIDIT_API_KEY);
    return Response.json(data[which]);
  });
  return { calls, probe: createProbe({ env: { ...env, ...changes.env }, config: { ...config, ...changes.config },
    callback: changes.callback ?? 'https://app.fitout.live/host/verify', fetcher, clock: () => now }) };
}
const denialCases = [
  ['unapproved config', { config: { approved: false } }, request()],
  ['expired build', { config: { notAfter: now } }, request()],
  ['wrong source', { config: { source: 'other' } }, request()],
  ['Contact enabled', { env: { CONTACT_PRODUCTION_ENABLED: 'true' } }, request()],
  ['Contact verification enabled', { env: { CONTACT_INGRESS_VERIFICATION_MODE: 'true' } }, request()],
  ['missing Contact flag', { env: { CONTACT_PRODUCTION_ENABLED: undefined } }, request()],
  ['preview environment', { env: { VERCEL_ENV: 'preview' } }, request()],
  ['development runtime', { env: { NODE_ENV: 'development' } }, request()],
  ['missing authorization', {}, new Request(`https://${host}${PATH}`)],
  ['bad signature', {}, request({}, { headers: { 'x-p27-signature': 'invalid' } })],
  ['expired claim', {}, request({ iat: now - 1000, exp: now })],
  ['future claim', {}, request({ iat: now + 1 })],
  ['long claim', {}, request({ exp: now + 300001 })],
  ['extra claim field', {}, request({ unexpected: true })],
  ['claim host drift', {}, request({ host: 'other.vercel.app' })],
  ['public alias', {}, request({}, { url: `https://fitout.live${PATH}` })],
  ['query-string authorization', {}, request({}, { url: `https://${host}${PATH}?token=x` })],
  ['HEAD', {}, request({}, { method: 'HEAD' })],
  ['POST', {}, request({}, { method: 'POST' })],
];
for (const [name, changes, req] of denialCases) test(name, async () => {
  const s = setup(changes); const response = await s.probe(req);
  assert.equal(response.status, 404); assert.equal(s.calls.length, 0); assert.deepEqual(await response.json(), { error: 'Proof unavailable' });
});
test('success: exactly four fixed read-only calls and no credential output', async () => {
  const s = setup(); const response = await s.probe(request()); const result = await response.json();
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(s.calls.length, 4);
  assert.ok(result.paymongo.signingSecretMatches); assert.ok(result.paymongo.providerModeMatches); assert.ok(result.paymongo.modesAgree);
  assert.ok(result.didit.signingSecretMatches); assert.ok(result.didit.workflowIdMatches); assert.ok(result.didit.eventsMatch);
  assert.equal(result.didit.effectiveEnvironment, 'sandbox'); assert.equal(result.contactDisabled, true);
  const output = JSON.stringify(result);
  for (const value of [env.PAYMONGO_SECRET_KEY, env.PAYMONGO_PUBLIC_KEY, env.PAYMONGO_WEBHOOK_SECRET, env.DIDIT_API_KEY, env.DIDIT_WEBHOOK_SECRET]) assert.ok(!output.includes(value));
  assert.deepEqual(Object.keys(result).sort(), ['contactDisabled','deploymentId','didit','observedAt','packetId','paymongo','schemaVersion','source']);
  assert.equal((await s.probe(request())).status, 410); assert.equal(s.calls.length, 4);
});
test('callback drift refuses all provider reads', async () => {
  const s = setup({ callback: 'https://fitout.live/host/verify' }); assert.equal((await s.probe(request())).status, 409); assert.equal(s.calls.length, 0);
});
test('provider error strings never escape', async () => {
  const s = setup({ fetcher: async () => { throw new Error(env.DIDIT_API_KEY); } });
  const result = await (await s.probe(request())).json(); assert.equal(result.paymongo.httpStatus, null); assert.equal(result.didit.workflowHttpStatus, null);
  assert.ok(!JSON.stringify(result).includes(env.DIDIT_API_KEY));
});
test('mismatched signing secrets remain false', async () => {
  const s = setup({ env: { PAYMONGO_WEBHOOK_SECRET: 'wrong', DIDIT_WEBHOOK_SECRET: 'wrong' } });
  const result = await (await s.probe(request())).json(); assert.equal(result.paymongo.signingSecretMatches, false); assert.equal(result.didit.signingSecretMatches, false);
});
test('ambiguous Didit destination stops before detail read', async () => {
  const s = setup({ data: { list: [...payloads.list, ...payloads.list] } });
  const result = await (await s.probe(request())).json(); assert.equal(s.calls.length, 3); assert.equal(result.didit.uniqueApexDestination, false); assert.equal(result.didit.destinationId, null);
});
test('missing Didit environment retains actual production default', async () => {
  const s = setup({ env: { DIDIT_ENVIRONMENT: undefined } }); const result = await (await s.probe(request())).json();
  assert.equal(result.didit.effectiveEnvironment, 'live'); assert.equal(result.didit.environmentDefaulted, true);
});
test('invalid mode values never echoed', async () => {
  const s = setup({ env: { DIDIT_ENVIRONMENT: env.DIDIT_API_KEY, PAYMONGO_SECRET_KEY: 'unknown', DIDIT_WORKFLOW_ID: '../../session' } });
  const result = await (await s.probe(request())).json(); assert.equal(s.calls.length, 0); assert.equal(result.didit.effectiveEnvironment, 'invalid'); assert.equal(result.didit.workflowId, null);
});
test('non-200 and malformed responses cannot pass correspondence', async () => {
  for (const response of [() => new Response('private', { status: 403 }), () => new Response('not-json'), () => new Response('x'.repeat(262145))]) {
    const s = setup({ fetcher: async () => response() }); const result = await (await s.probe(request())).json();
    assert.equal(result.paymongo.signingSecretMatches, false); assert.equal(result.didit.workflowIdMatches, false); assert.equal(result.didit.signingSecretMatches, false);
  }
});
test('provider timeout aborts without leaking details', async () => {
  const s = setup({ env: { DIDIT_API_KEY: undefined }, fetcher: async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('private')), { once: true });
  }) });
  const result = await (await s.probe(request())).json(); assert.equal(result.paymongo.httpStatus, null);
});
