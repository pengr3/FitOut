import { generateKeyPairSync } from 'node:crypto';
import { PACKET_ID, SOURCE } from './probe.mjs';
import { runProof } from './driver.mjs';

export const RETRY_ID = 'p27-provider-runtime-coordinator-retry-20261013';

// Generate, hold and consume the signing key in this one process. No IPC or key export.
export async function executeCoordinator({ approval, ops, clock = Date.now }) {
  if (approval?.status !== 'approved' || approval.packetId !== PACKET_ID || approval.source !== SOURCE ||
    approval.attemptId !== RETRY_ID || !approval.approvedAt || !approval.ownerInstruction ||
    approval.limits?.productionBuilds !== 1 || approval.limits?.diagnosticGets !== 3 || approval.limits?.providerGets !== 4 ||
    approval.contactDisabled !== true) throw new Error('Fresh exact coordinator-retry approval required');
  await ops.beginAttempt(); // Durable exclusive marker; a process restart cannot repeat staging.
  await ops.preflight();
  let keys = generateKeyPairSync('ed25519');
  const config = { approved: true, packetId: PACKET_ID, source: SOURCE, notAfter: clock() + 3600000,
    publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }) };
  let staged;
  try {
    const exported = await ops.prepare({ config, approval });
    staged = await ops.stageOnce(exported);
    const ready = await ops.waitReady(staged, { maximumMs: 1800000, notAfter: config.notAfter });
    // Browser restoration/readback happens while this process retains its private KeyObject.
    // The handoff file contains only verified booleans/IDs; never a private key or signed request.
    const deployment = await ops.waitReconciled(ready, { notAfter: config.notAfter });
    const result = await runProof({ approval, deployment, config, privateKey: keys.privateKey,
      markerPath: ops.diagnosticMarkerPath, transport: ops.transport });
    await ops.saveProof(result);
    return result;
  } finally {
    keys = null;
    await ops.finish({ staged: staged ?? null, hardExpiry: config.notAfter });
  }
}
