import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const allowedOrigins = new Set([
  'https://portugal.patrikbandak.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://portugal.patrikbandak.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

function json(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function timingSafeEqual(a: string, b: string) {
  const bytesA = new TextEncoder().encode(a);
  const bytesB = new TextEncoder().encode(b);
  const length = Math.max(bytesA.length, bytesB.length, 1);
  let mismatch = bytesA.length === bytesB.length ? 0 : 1;
  for (let i = 0; i < length; i++) mismatch |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  return mismatch === 0;
}

function getPublishableKey() {
  const direct = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}') as Record<string, string>;
    return keys.default || Object.values(keys)[0];
  } catch {
    return undefined;
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey = getPublishableKey();
  const tripEmail = Deno.env.get('TRIP_EMAIL');
  // TRIP_PASSPHRASE holds one passphrase, or several separated by commas.
  const passphrases = (Deno.env.get('TRIP_PASSPHRASE') || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!supabaseUrl || !serviceRoleKey || !publishableKey || !tripEmail || !passphrases.length) {
    return json({ error: 'Sign-in is not configured yet.' }, 503, origin);
  }

  let passphrase = '';
  try {
    const body = await request.json() as { passphrase?: unknown };
    passphrase = typeof body.passphrase === 'string' ? body.passphrase.trim() : '';
  } catch {
    return json({ error: 'The request must be valid JSON.' }, 400, origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const identifier = 'trip-login:' + ((request.headers.get('x-forwarded-for')?.split(',')[0].trim()) || 'unknown');

  // Short passphrases are only safe behind a hard attempt limit, so keep this tight.
  const windowStart = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count: failures } = await admin.from('sitter_ai_events')
    .select('id', { count: 'exact', head: true })
    .eq('identifier', identifier).eq('kind', 'fail').gte('created_at', windowStart);
  if ((failures ?? 0) >= 5) return json({ error: 'Too many attempts. Wait a few minutes and try again.' }, 429, origin);

  let ok = false;
  for (const candidate of passphrases) if (timingSafeEqual(passphrase, candidate)) ok = true;
  if (!ok) {
    await admin.from('sitter_ai_events').insert({ identifier, kind: 'fail' });
    return json({ error: 'That passphrase was not recognized.' }, 401, origin);
  }

  // Mint a real Supabase session for the trip account. Row-level security and the
  // AI function keep working unchanged; the passphrase only gates who gets a session.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: tripEmail });
  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    console.error('Could not generate the trip session', linkError);
    return json({ error: 'Could not start a session right now.' }, 502, origin);
  }

  const anon = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: hashedToken });
  if (verifyError || !verified.session) {
    console.error('Could not verify the trip session', verifyError);
    return json({ error: 'Could not start a session right now.' }, 502, origin);
  }

  return json({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  }, 200, origin);
});
