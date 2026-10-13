import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { executeCoordinator, RETRY_ID } from './coordinator.mjs';
import { createProbe, PACKET_ID, SOURCE } from './probe.mjs';

const base = resolve('playwright/.cache/phase27-08/provider-runtime-prepared/coordinator-tests');
await mkdir(base, { recursive: true });
const host = 'fitout-coordinator-fixture-pengr3s-projects.vercel.app';
const approval = { status: 'approved', packetId: PACKET_ID, source: SOURCE, attemptId: RETRY_ID,
  approvedAt: new Date().toISOString(), ownerInstruction: 'offline fixture only', contactDisabled: true,
  limits: { productionBuilds: 1, diagnosticGets: 3, providerGets: 4 } };
async function context(failure) {
  const dir = await mkdtemp(resolve(base, 'attempt-')); const calls = []; let probe;
  const step = name => { calls.push(name); if (failure === name) throw new Error('fixture failure'); };
  const ops = {
    diagnosticMarkerPath: resolve(dir, 'diagnostic.json'),
    beginAttempt: async () => step('begin'), preflight: async () => step('preflight'),
    prepare: async ({ config }) => {
      step('prepare'); assert.ok(!('privateKey' in config));
      probe = createProbe({ env: { NODE_ENV: 'production', VERCEL_ENV: 'production', VERCEL_URL: host,
        VERCEL_DEPLOYMENT_ID: 'dpl_fixture', CONTACT_PRODUCTION_ENABLED: 'false', CONTACT_INGRESS_VERIFICATION_MODE: 'false' },
        config, callback: 'https://app.fitout.live/host/verify', fetcher: async () => { throw new Error('Unexpected provider call'); } });
      return { destination: dir };
    },
    stageOnce: async () => { step('stage'); return { id: 'dpl_fixture' }; },
    waitReady: async () => { step('ready'); return { id: 'dpl_fixture' }; },
    waitReconciled: async () => { step('reconciled'); return { id: 'dpl_fixture', host,
      projectId: 'prj_my7iigeFoojFO2QmXYYfr49p8uiz', teamId: 'team_EZAfhT8qJ6msqrCzas3rvdjG', target: 'production',
      ready: true, protected: true, aliasesAssigned: false, baselineAndRegistrationsVerified: true }; },
    transport: async (url, headers) => { step('http'); const r = await probe(new Request(url, { headers })); return { status: r.status, body: await r.json() }; },
    saveProof: async () => step('save'), finish: async () => step('finish'),
  };
  return { ops, calls };
}
test('same-process coordinator signs the deployed public key without exporting the private key', async () => {
  const c = await context(); const result = await executeCoordinator({ approval, ops: c.ops });
  assert.equal(result.diagnosticGets, 3); assert.equal(result.runtime.contactDisabled, true);
  assert.deepEqual(c.calls, ['begin','preflight','prepare','stage','ready','reconciled','http','http','http','save','finish']);
});
test('prior packet authority cannot authorize another build', async () => {
  const c = await context(); await assert.rejects(executeCoordinator({ approval: { ...approval, attemptId: undefined }, ops: c.ops })); assert.equal(c.calls.length, 0);
});
test('prepared retry authority cannot perform any action', async () => {
  const c = await context(); await assert.rejects(executeCoordinator({ approval: { ...approval, status: 'prepared' }, ops: c.ops })); assert.equal(c.calls.length, 0);
});
for (const failure of ['preflight','prepare','stage','ready','reconciled','http']) test(`failure at ${failure} never retries`, async () => {
  const c = await context(failure); await assert.rejects(executeCoordinator({ approval, ops: c.ops }));
  assert.equal(c.calls.filter(x => x === 'stage').length, ['preflight','prepare'].includes(failure) ? 0 : 1);
  assert.equal(c.calls.filter(x => x === 'http').length, failure === 'http' ? 1 : 0);
  if (failure !== 'preflight') assert.equal(c.calls.at(-1), 'finish');
});
