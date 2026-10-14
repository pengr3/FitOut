import { absoluteAppUrl } from '@/lib/app-origins';
import { createProbe } from './probe.mjs';
import config from './probe-config.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const probe = createProbe({ env: process.env, config, callback: absoluteAppUrl('/host/verify') });
export async function GET(request: Request) { return probe(request); }
// Next can synthesize HEAD from GET; explicitly deny it without running the probe.
export async function HEAD() { return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } }); }
