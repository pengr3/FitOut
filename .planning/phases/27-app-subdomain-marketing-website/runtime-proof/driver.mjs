import { sign, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { PACKET_ID, SOURCE, PATH } from './probe.mjs';

export function vercelTransport({ node, cli, cwd }) {
  return (url, headers) => new Promise((resolve, reject) => {
    // Only nonsecret URL/CLI options are arguments. Signed headers enter curl through stdin.
    const child = spawn(node, [cli, 'curl', url, '--', '--config', '-'], { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; let overflow = false;
    child.stdout.on('data', chunk => { if (output.length + chunk.length <= 65536) output += chunk.toString(); else { overflow = true; child.kill(); } });
    child.stderr.on('data', () => {}); // CLI errors may echo request internals; never retain them.
    const timer = setTimeout(() => { child.kill(); reject(new Error('Protected request timed out; attempt closed')); }, 45000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('Protected request failed; attempt closed')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || overflow) return reject(new Error('Protected request failed; attempt closed'));
      try {
        const split = output.lastIndexOf('\nP27_STATUS:');
        if (split < 0) throw new Error();
        resolve({ status: Number(output.slice(split + 12).trim()), body: JSON.parse(output.slice(0, split)) });
      } catch { reject(new Error('Protected response could not be parsed; attempt closed')); }
    });
    const lines = ['silent', 'show-error', 'request = "GET"', 'max-time = 28', 'max-redirs = 0', 'write-out = "\\nP27_STATUS:%{http_code}"'];
    for (const [name, value] of Object.entries(headers)) {
      if (!/^x-p27-(proof|signature)$/.test(name) || !/^[A-Za-z0-9_-]+$/.test(value)) {
        child.kill(); return reject(new Error('Invalid operator header'));
      }
      lines.push(`header = "${name}: ${value}"`);
    }
    child.stdin.end(lines.join('\n') + '\n');
  });
}

function signedHeaders(privateKey, host, iat, exp) {
  const payload = Buffer.from(JSON.stringify({ packetId: PACKET_ID, host, iat, exp, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return { 'x-p27-proof': payload, 'x-p27-signature': sign(null, Buffer.from(payload), privateKey).toString('base64url') };
}
function validProof(body, deploymentId) {
  if (!body || body.packetId !== PACKET_ID || body.source !== SOURCE || body.deploymentId !== deploymentId ||
    body.schemaVersion !== 1 || body.contactDisabled !== true || !body.paymongo || !body.didit) return false;
  const top = ['schemaVersion','packetId','source','observedAt','deploymentId','contactDisabled','paymongo','didit'];
  const pay = ['secretMode','publicMode','modesAgree','httpStatus','hookIdMatches','destinationMatches','enabled','eventsMatch','providerModeMatches','signingSecretMatches'];
  const didit = ['effectiveEnvironment','environmentDefaulted','workflowId','callback','workflowHttpStatus','workflowIdMatches','workflowLabelMatches','workflowArchived','destinationListHttpStatus','uniqueApexDestination','destinationId','destinationHttpStatus','destinationMatches','enabled','versionMatches','eventsMatch','signingSecretMatches'];
  const exact = (obj, keys) => Object.keys(obj).length === keys.length && Object.keys(obj).every(k => keys.includes(k));
  if (!exact(body, top) || !exact(body.paymongo, pay) || !exact(body.didit, didit)) return false;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const http = value => value === null || Number.isInteger(value) && value >= 100 && value <= 599;
  return ['live','test','unknown'].includes(body.paymongo.secretMode) && ['live','test','unknown'].includes(body.paymongo.publicMode) &&
    ['live','sandbox','invalid'].includes(body.didit.effectiveEnvironment) &&
    [body.didit.workflowId, body.didit.destinationId].every(v => v === null || typeof v === 'string' && uuid.test(v)) &&
    body.didit.callback === 'https://app.fitout.live/host/verify' && Number.isFinite(Date.parse(body.observedAt)) &&
    http(body.paymongo.httpStatus) && ['workflowHttpStatus','destinationListHttpStatus','destinationHttpStatus'].every(k => http(body.didit[k])) &&
    pay.filter(k => !['secretMode','publicMode','httpStatus'].includes(k)).every(k => typeof body.paymongo[k] === 'boolean') &&
    didit.filter(k => !['effectiveEnvironment','workflowId','callback','workflowHttpStatus','workflowArchived','destinationListHttpStatus','destinationId','destinationHttpStatus'].includes(k)).every(k => typeof body.didit[k] === 'boolean') &&
    (body.didit.workflowArchived === null || typeof body.didit.workflowArchived === 'boolean');
}

export async function runProof({ approval, deployment, config, privateKey, markerPath, transport, clock = Date.now }) {
  if (approval?.status !== 'approved' || approval.packetId !== PACKET_ID || approval.source !== SOURCE ||
    !approval.approvedAt || !approval.ownerInstruction || config.approved !== true || config.packetId !== PACKET_ID || config.source !== SOURCE ||
    !Number.isSafeInteger(config.notAfter) || config.notAfter <= clock() + 300000 ||
    deployment.projectId !== 'prj_my7iigeFoojFO2QmXYYfr49p8uiz' || deployment.teamId !== 'team_EZAfhT8qJ6msqrCzas3rvdjG' ||
    deployment.target !== 'production' || deployment.ready !== true || deployment.protected !== true || deployment.aliasesAssigned !== false ||
    !/^dpl_[A-Za-z0-9]+$/.test(deployment.id) || !/^fitout-[a-z0-9-]+-pengr3s-projects\.vercel\.app$/.test(deployment.host) ||
    deployment.baselineAndRegistrationsVerified !== true) throw new Error('Approved staged deployment and baseline readbacks required');
  // Exclusive marker is written before any HTTP call. Unknown outcomes are never retried.
  await writeFile(markerPath, JSON.stringify({ packetId: PACKET_ID, source: SOURCE, deploymentId: deployment.id, startedAt: new Date(clock()).toISOString(), maximumDiagnosticGets: 3 }), { flag: 'wx' });
  const url = `https://${deployment.host}${PATH}`;
  const unsigned = await transport(url, {});
  if (unsigned.status !== 404 || JSON.stringify(unsigned.body) !== '{"error":"Proof unavailable"}') throw new Error('Unsigned denial failed; attempt closed');
  const now = clock();
  const proof = await transport(url, signedHeaders(privateKey, deployment.host, now, now + 240000));
  if (proof.status !== 200 || !validProof(proof.body, deployment.id)) throw new Error('Runtime proof invalid; attempt closed');
  const expired = await transport(url, signedHeaders(privateKey, deployment.host, now - 2000, now - 1000));
  if (expired.status !== 404 || JSON.stringify(expired.body) !== '{"error":"Proof unavailable"}') throw new Error('Expired denial failed; attempt closed');
  return { diagnosticGets: 3, providerGetsMaximum: 4, unsignedDenied: true, expiredDenied: true, runtime: proof.body,
    proofScope: 'current Production configuration on protected staged extension; serving-release correspondence requires separate evidence binding' };
}
