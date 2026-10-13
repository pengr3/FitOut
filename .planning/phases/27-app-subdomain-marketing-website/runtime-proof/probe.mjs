import { verify, timingSafeEqual } from 'node:crypto';

export const PACKET_ID = 'p27-provider-runtime-20261013';
export const SOURCE = '58897a9459cf31b7c8937254dc17ab61ae0ce1d5';
export const PATH = '/api/phase27-provider-proof';
export const PAYMONGO_HOOK = 'hook_6UWbRKJQBt1CUnuhRfoFC6XE';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENTS = ['checkout_session.payment.paid', 'merchant.activated', 'merchant.declined', 'payment.refunded', 'payment.refund.updated'];
const DENIAL = { error: 'Proof unavailable' };
const HEADERS = { 'cache-control': 'private, no-store, max-age=0', 'x-content-type-options': 'nosniff' };
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const exactEvents = (a, b) => Array.isArray(a) && a.length === b.length && b.every(x => a.includes(x));
const secretEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length > 0 && b.length > 0 &&
  Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const keyMode = (key, kind) => typeof key === 'string' && key.startsWith(`${kind}_live_`) ? 'live' :
  typeof key === 'string' && key.startsWith(`${kind}_test_`) ? 'test' : 'unknown';

// Provider payloads and errors never reach output or console. No redirect can forward credentials.
async function readJson(fetcher, url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher(url, { method: 'GET', headers, redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (response.status !== 200) return { status: response.status, body: null };
    const reader = response.body?.getReader();
    if (!reader) return { status: 200, body: null };
    const chunks = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 262144) { await reader.cancel(); return { status: 200, body: null }; }
        chunks.push(Buffer.from(chunk.value));
      }
    } finally { reader.releaseLock(); }
    return { status: 200, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch { return { status: null, body: null }; }
  finally { clearTimeout(timer); }
}

function authorized(request, env, config, now) {
  try {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== PATH || url.search || url.protocol !== 'https:' ||
      !env.VERCEL_URL || url.host !== env.VERCEL_URL || !url.hostname.endsWith('.vercel.app') ||
      env.VERCEL_ENV !== 'production' || env.NODE_ENV !== 'production' ||
      env.CONTACT_PRODUCTION_ENABLED !== 'false' || env.CONTACT_INGRESS_VERIFICATION_MODE !== 'false' ||
      config.approved !== true || config.packetId !== PACKET_ID || config.source !== SOURCE ||
      !Number.isSafeInteger(config.notAfter) || now >= config.notAfter) return false;
    const payload = request.headers.get('x-p27-proof');
    const signature = request.headers.get('x-p27-signature');
    if (!payload || !signature || payload.length > 1024 || signature.length > 128 ||
      !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
    if (!verify(null, Buffer.from(payload), config.publicKey, Buffer.from(signature, 'base64url'))) return false;
    const claim = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claim.packetId === PACKET_ID && claim.host === url.host &&
      Object.keys(claim).sort().join(',') === 'exp,host,iat,nonce,packetId' &&
      typeof claim.nonce === 'string' && /^[a-f0-9]{32}$/.test(claim.nonce) &&
      Number.isSafeInteger(claim.iat) && Number.isSafeInteger(claim.exp) &&
      claim.iat <= now && claim.exp > now && claim.exp - claim.iat <= 300000 &&
      claim.exp > claim.iat && claim.exp <= config.notAfter;
  } catch { return false; }
}

export function createProbe({ env, config, fetcher = fetch, clock = Date.now, callback }) {
  // This prevents warm-instance replay only. The operator driver owns the attempt-wide cap.
  let consumed = false;
  return async request => {
    const now = clock();
    if (!authorized(request, env, config, now)) return Response.json(DENIAL, { status: 404, headers: HEADERS });
    if (consumed) return Response.json(DENIAL, { status: 410, headers: HEADERS });
    consumed = true;
    if (callback !== 'https://app.fitout.live/host/verify') return Response.json(DENIAL, { status: 409, headers: HEADERS });
    const secretMode = keyMode(env.PAYMONGO_SECRET_KEY, 'sk');
    const publicMode = keyMode(env.PAYMONGO_PUBLIC_KEY, 'pk');
    const pay = { secretMode, publicMode, modesAgree: secretMode !== 'unknown' && secretMode === publicMode,
      httpStatus: null, hookIdMatches: false, destinationMatches: false, enabled: false,
      eventsMatch: false, providerModeMatches: false, signingSecretMatches: false };
    if (secretMode !== 'unknown') {
      const read = await readJson(fetcher, `https://api.paymongo.com/v1/webhooks/${PAYMONGO_HOOK}`, {
        accept: 'application/json', authorization: `Basic ${Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString('base64')}` });
      const data = record(record(read.body).data); const attrs = record(data.attributes);
      pay.httpStatus = read.status;
      pay.hookIdMatches = data.id === PAYMONGO_HOOK && data.type === 'webhook';
      pay.destinationMatches = attrs.url === 'https://fitout.live/api/paymongo/webhook';
      pay.enabled = attrs.status === 'enabled'; pay.eventsMatch = exactEvents(attrs.events, EVENTS);
      pay.providerModeMatches = typeof attrs.livemode === 'boolean' && attrs.livemode === (secretMode === 'live');
      pay.signingSecretMatches = pay.hookIdMatches && secretEqual(attrs.secret_key, env.PAYMONGO_WEBHOOK_SECRET);
    }
    const workflowId = UUID.test(env.DIDIT_WORKFLOW_ID ?? '') ? env.DIDIT_WORKFLOW_ID : null;
    const effective = env.DIDIT_ENVIRONMENT ?? 'live';
    const didit = { effectiveEnvironment: ['live', 'sandbox'].includes(effective) ? effective : 'invalid',
      environmentDefaulted: env.DIDIT_ENVIRONMENT === undefined, workflowId, callback,
      workflowHttpStatus: null, workflowIdMatches: false, workflowLabelMatches: false,
      workflowArchived: null, destinationListHttpStatus: null, uniqueApexDestination: false,
      destinationId: null, destinationHttpStatus: null, destinationMatches: false, enabled: false,
      versionMatches: false, eventsMatch: false, signingSecretMatches: false };
    if (typeof env.DIDIT_API_KEY === 'string' && env.DIDIT_API_KEY.length > 0 && workflowId) {
      const headers = { accept: 'application/json', 'x-api-key': env.DIDIT_API_KEY };
      const workflow = await readJson(fetcher, `https://verification.didit.me/v3/workflows/${workflowId}/`, headers);
      const body = record(workflow.body);
      didit.workflowHttpStatus = workflow.status;
      didit.workflowIdMatches = body.uuid === workflowId || body.workflow_id === workflowId;
      didit.workflowLabelMatches = body.workflow_label === 'FitOut Host Verification';
      didit.workflowArchived = typeof body.is_archived === 'boolean' ? body.is_archived : null;
      const destinations = await readJson(fetcher, 'https://verification.didit.me/v3/webhook/destinations/', headers);
      didit.destinationListHttpStatus = destinations.status;
      const matches = Array.isArray(destinations.body) ? destinations.body.filter(row =>
        record(row).url === 'https://fitout.live/api/didit/webhook' && UUID.test(record(row).uuid ?? '')) : [];
      didit.uniqueApexDestination = matches.length === 1;
      if (matches.length === 1) {
        didit.destinationId = matches[0].uuid;
        const destination = await readJson(fetcher, `https://verification.didit.me/v3/webhook/destinations/${didit.destinationId}/`, headers);
        const attrs = record(destination.body);
        didit.destinationHttpStatus = destination.status;
        didit.destinationMatches = attrs.uuid === didit.destinationId && attrs.url === 'https://fitout.live/api/didit/webhook';
        didit.enabled = attrs.enabled === true; didit.versionMatches = attrs.webhook_version === 'v3';
        didit.eventsMatch = exactEvents(attrs.subscribed_events, ['status.updated']);
        didit.signingSecretMatches = didit.destinationMatches && secretEqual(attrs.secret_shared_key, env.DIDIT_WEBHOOK_SECRET);
      }
    }
    return Response.json({ schemaVersion: 1, packetId: PACKET_ID, source: SOURCE, observedAt: new Date(now).toISOString(),
      deploymentId: /^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID ?? '') ? env.VERCEL_DEPLOYMENT_ID : null,
      contactDisabled: true, paymongo: pay, didit }, { headers: HEADERS });
  };
}
