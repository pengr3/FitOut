import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createProbe, PACKET_ID, SOURCE, PAYMONGO_HOOK } from './probe.mjs';
import { runProof } from './driver.mjs';

const base = resolve('playwright/.cache/phase27-08/provider-runtime-prepared/driver-tests');
await mkdir(base, { recursive: true });
const now = Date.now();
const host = 'fitout-proof-fixture-pengr3s-projects.vercel.app';
const keys = generateKeyPairSync('ed25519');
const config = { approved: true, packetId: PACKET_ID, source: SOURCE, notAfter: now + 600000,
  publicKey: keys.publicKey.export({ format: 'pem', type: 'spki' }) };
const approval = { status: 'approved', packetId: PACKET_ID, source: SOURCE, approvedAt: new Date(now).toISOString(), ownerInstruction: 'offline fixture only' };
const deployment = { id: 'dpl_fixture', host, projectId: 'prj_my7iigeFoojFO2QmXYYfr49p8uiz', teamId: 'team_EZAfhT8qJ6msqrCzas3rvdjG',
  target: 'production', ready: true, protected: true, aliasesAssigned: false, baselineAndRegistrationsVerified: true };
async function context() {
  const dir = await mkdtemp(resolve(base, 'attempt-'));
  let providerGets = 0; let diagnosticGets = 0;
  const probe = createProbe({ env: { NODE_ENV: 'production', VERCEL_ENV: 'production', VERCEL_URL: host, VERCEL_DEPLOYMENT_ID: deployment.id,
    CONTACT_PRODUCTION_ENABLED: 'false', CONTACT_INGRESS_VERIFICATION_MODE: 'false', PAYMONGO_SECRET_KEY: 'sk_test_fixture' },
    config, callback: 'https://app.fitout.live/host/verify', clock: () => now,
    fetcher: async () => { providerGets++; return Response.json({ data: { id: PAYMONGO_HOOK, type: 'webhook', attributes: {} } }); } });
  const transport = async (url, headers) => { diagnosticGets++; const res = await probe(new Request(url, { headers })); return { status: res.status, body: await res.json() }; };
  return { args: { approval, deployment, config, privateKey: keys.privateKey, markerPath: resolve(dir, 'started.json'), transport, clock: () => now },
    counts: () => ({ providerGets, diagnosticGets }) };
}
test('driver refuses prepared authority with zero external actions', async () => {
  const c = await context(); await assert.rejects(runProof({ ...c.args, approval: { ...approval, status: 'prepared' } }));
  assert.deepEqual(c.counts(), { providerGets: 0, diagnosticGets: 0 });
});
test('driver completes bounded three requests and persists marker before HTTP', async () => {
  const c = await context(); const report = await runProof(c.args);
  assert.equal(report.diagnosticGets, 3); assert.equal(report.expiredDenied, true);
  assert.deepEqual(c.counts(), { providerGets: 1, diagnosticGets: 3 });
  assert.equal(JSON.parse(await readFile(c.args.markerPath, 'utf8')).deploymentId, deployment.id);
  await assert.rejects(runProof(c.args)); assert.deepEqual(c.counts(), { providerGets: 1, diagnosticGets: 3 });
});
test('driver rejects every unsafe staged-deployment readback before HTTP', async () => {
  for (const change of [{ protected: false }, { aliasesAssigned: true }, { ready: false }, { target: 'preview' }, { baselineAndRegistrationsVerified: false }, { projectId: 'other' }, { host: 'fitout.live' }]) {
    const c = await context(); await assert.rejects(runProof({ ...c.args, deployment: { ...deployment, ...change } })); assert.equal(c.counts().diagnosticGets, 0);
  }
});
test('unknown HTTP outcome closes the attempt and prevents retries', async () => {
  const c = await context(); let count = 0;
  const args = { ...c.args, transport: async () => { count++; throw new Error('network outcome unknown'); } };
  await assert.rejects(runProof(args)); await assert.rejects(runProof(args)); assert.equal(count, 1);
});
test('unsigned protection page closes attempt before provider request', async () => {
  const c = await context(); let count = 0;
  await assert.rejects(runProof({ ...c.args, transport: async () => { count++; return { status: 401, body: {} }; } })); assert.equal(count, 1);
});
test('unexpected result fields rejected before persistence', async () => {
  const c = await context(); let count = 0;
  const original = c.args.transport;
  await assert.rejects(runProof({ ...c.args, transport: async (url, headers) => {
    count++; const result = await original(url, headers); if (count === 2) result.body.secret = 'must-not-be-saved'; return result;
  } })); assert.equal(count, 2);
});
