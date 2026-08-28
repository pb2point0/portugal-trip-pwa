import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const allowedOrigins = new Set([
  'https://portugal.patrikbandak.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const guideContext = `
HOUSE AND DOG GUIDE FOR FLYNN (AND JEREMY) — Aug 29 to Sep 14, 2026
Patrik and Megan are in Portugal. Portugal is 5 hours ahead of Pennsylvania, so 9:00 PM there is 2:00 AM in Portugal. Flynn or Jeremy should still call if something is urgent, regardless of the time.

QUICK REFERENCE
- Chloe: 2 cups/day. 2 crushed allergy pills in the morning.
- Bengt: 3 to 4 cups/day. No allergy pill.
- Both dogs: nutrition powder sprinkled on the morning meal.
- After Bengt eats a big meal, keep him calm for 30 to 60 minutes (no running, wrestling, or stairs).
- Daycare: Playtime Pet Resort, 989 E Lancaster Ave, Downingtown, PA 19335. 215-910-4991. Open 7:00 AM to 8:00 PM weekdays.
- Max time alone: 4 hours for Bengt, up to 6 hours for Chloe.
- Trash goes out Thursday evening; pickup is early Friday morning.
- Wifi password: [not filled in yet — tell the sitter to ask Patrik or Megan directly]

FEEDING
Chloe gets 2 cups of her food per day with a sweet potato or similar topper mixed in (topper is left out for the sitter). Bengt gets 3 to 4 cups per day depending on topper amount — 3 cups if he gets a good amount of topper, since he is a growing puppy that range is fine. Ideally Bengt eats 3 to 4 smaller meals a day since two large meals can upset his stomach, but two cups morning and two at night is fine if that's easier. If Bengt eats two cups at once, keep him calm for 30 to 60 minutes afterward — a big meal followed by hard activity is genuinely risky for a dog his size. This caution is about Bengt only; Chloe is fine eating and carrying on as normal. Every morning both bowls get a sprinkle of the nutrition powder. Only Chloe's morning bowl gets two crushed allergy pills — Bengt does not get any. There are treats in the usual spot, fine to use for tricks.

WALKS
The sitter has already walked both dogs with Patrik. Chloe pulls when she spots one of her dog friends — shorten the leash, stay calm, and she settles once she knows the sitter is in control. Bengt is good on leash but still a puppy, so stay attentive. They walk well together with Patrik but it is fine to walk them separately if that's easier — sitter's call.

BENGT AND THE CRATE (the important one)
Bengt is a puppy and needs a lot of sleep. If he gets nippy, wild, or full of energy, that means he is OVERTIRED, not that he needs more exercise. Saying "let's go take a nap" is his cue to go to his crate — he may put up a small fight but knows the command, and once in he'll sleep two or more hours.
Crying-in-the-crate rule:
- Actively crying (nonstop, no breaks): if the crate is opened during this, the ONLY thing to do is take him straight outside to potty. If he goes, bring him right back to the crate and close it — no play, no staying out. This is intentional: crying should lead to a potty trip, never to playtime, or he'll learn crying gets him out to play.
- If he pauses for a minute or two: he's fine to come out for good, take him to potty, and he can stay out.
In practice he rarely does the nonstop version — usually a minute or two of fussing and then he passes out for hours. If he's recently gone potty, he's likely just being dramatic; it's fine to wait him out.

LEAVING THE HOUSE
Both dogs go to daycare (Playtime Pet Resort, contact above) twice a week. On other days, coming home at lunch is ideal. Before leaving, take Bengt out to pee — he poops twice a day now, otherwise take him out to pee as often as possible. Closing the bedroom door and giving them run of the rest of the house for containment is fine. Do not leave them more than 4 hours, especially Bengt — Chloe can handle around 6.

THINGS THAT WILL PROBABLY HAPPEN (and are fine)
Chloe may get into the trash if something smells good; Bengt will then shred whatever she pulls out — easiest fix is taking the trash out or blocking the can with a chair. Bengt may chew things he shouldn't since he's a puppy — keep personal belongings out of reach and leave plenty of his toys around. Bengt will probably have a potty accident at some point, which is completely fine — to minimize them, get him outside right when he wakes up and right when he comes out of the crate. His subtle way of asking to go out: he runs over and starts playing with you — if he suddenly wants attention, that's usually what it means.

EMERGENCIES
- Ruth: vet, lives across the street, call her first. Contact: [not filled in yet — ask Patrik or Megan]
- East Bradford Veterinary: their regular practice. Contact: [not filled in yet — ask Patrik or Megan]
- Vet down the street (also knows the dogs). Contact: [not filled in yet — ask Patrik or Megan]
- Sweta: primary backup person. Contact: [not filled in yet — ask Patrik or Megan]
- Jen: neighbor. Contact: [not filled in yet — ask Patrik or Megan]

THE HOUSE
- Trash out Thursday evening, pickup early Friday morning.
- Packages delivered to the front door.
- Plants were watered before they left; will probably only need water toward the end of the two weeks.
- Thermostat is on a day/night timer, roughly 74/76 upstairs — the sitter is welcome to change the schedule or temperature however she likes, it's adjusted regularly anyway.
- Wifi password: see above (not filled in yet).

REACHING PATRIK AND MEGAN
- Patrik's number: [not filled in yet — ask Patrik or Megan]
- Megan's number: [not filled in yet — ask Patrik or Megan]
- WhatsApp is the best way to reach them — works over wifi with no international charges either direction.
`.trim();

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

function getOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text.trim();
  if (!Array.isArray(payload.output)) return '';
  return payload.output.flatMap((item) => {
    if (!item || typeof item !== 'object' || !Array.isArray((item as { content?: unknown[] }).content)) return [];
    return (item as { content: unknown[] }).content.flatMap((part) => {
      if (!part || typeof part !== 'object') return [];
      const candidate = part as { type?: string; text?: string };
      return candidate.type === 'output_text' && candidate.text ? [candidate.text] : [];
    });
  }).join('\n').trim();
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const sitterPassphrase = Deno.env.get('SITTER_PASSPHRASE');
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!supabaseUrl || !serviceRoleKey || !sitterPassphrase || !openAIKey) return json({ error: 'The sitter guide is not configured yet.' }, 503, origin);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const identifier = (request.headers.get('x-forwarded-for')?.split(',')[0].trim()) || 'unknown';

  let action: 'verify' | 'ask' = 'ask';
  let passphrase = '';
  let question = '';
  let history: ChatMessage[] = [];
  try {
    const body = await request.json() as { action?: unknown; passphrase?: unknown; question?: unknown; history?: unknown };
    action = body.action === 'verify' ? 'verify' : 'ask';
    passphrase = typeof body.passphrase === 'string' ? body.passphrase : '';
    question = typeof body.question === 'string' ? body.question.trim() : '';
    if (Array.isArray(body.history)) history = body.history.filter((item): item is ChatMessage => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string';
    }).slice(-8).map((item) => ({ role: item.role, content: item.content.slice(0, 1200) }));
  } catch {
    return json({ error: 'The request must be valid JSON.' }, 400, origin);
  }

  const fifteenMinAgo = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count: failCount } = await supabase.from('sitter_ai_events').select('id', { count: 'exact', head: true }).eq('identifier', identifier).eq('kind', 'fail').gte('created_at', fifteenMinAgo);
  if ((failCount ?? 0) >= 8) return json({ error: 'Too many attempts. Wait a few minutes and try again.' }, 429, origin);

  if (!timingSafeEqual(passphrase, sitterPassphrase)) {
    await supabase.from('sitter_ai_events').insert({ identifier, kind: 'fail' });
    return json({ error: 'That passphrase was not recognized.' }, 401, origin);
  }

  if (action === 'verify') return json({ ok: true }, 200, origin);

  if (!question) return json({ error: 'Ask a question first.' }, 400, origin);
  if (question.length > 800) return json({ error: 'Keep the question under 800 characters.' }, 400, origin);

  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: minuteCount }, { count: dayCount }] = await Promise.all([
    supabase.from('sitter_ai_events').select('id', { count: 'exact', head: true }).eq('identifier', identifier).eq('kind', 'ask').gte('created_at', minuteAgo),
    supabase.from('sitter_ai_events').select('id', { count: 'exact', head: true }).eq('kind', 'ask').gte('created_at', dayAgo),
  ]);
  if ((minuteCount ?? 0) >= 6) return json({ error: 'Take a short pause before asking again.' }, 429, origin);
  if ((dayCount ?? 0) >= 80) return json({ error: 'Today’s AI limit has been reached. Call or text Patrik or Megan directly.' }, 429, origin);

  await supabase.from('sitter_ai_events').insert({ identifier, kind: 'ask' });

  const conversationInput = [...history, { role: 'user' as const, content: question }];
  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-5.6-luna',
      instructions: 'You are a helper for Flynn and her boyfriend Jeremy, who are house and dog sitting for Chloe (adult dog) and Bengt (puppy) while Patrik and Megan are traveling. Either of them may be the one asking. Answer only using the guide below. Be warm, concise, and practical — this is being read on a phone, often in the middle of handling a dog. If the guide does not cover something, say so plainly and tell them to call or WhatsApp Patrik or Megan rather than guessing. Several fields in the guide (wifi password, vet phone numbers, Patrik and Megan\'s numbers) are marked "not filled in yet" — if asked about one of those, say it has not been filled in yet and to ask Patrik directly, do not invent a number. This is not a medical professional: for anything that sounds like a real emergency, tell them to call the vet (Ruth first) right away.\n\nGUIDE:\n' + guideContext,
      input: conversationInput,
      reasoning: { effort: 'none' },
      text: { verbosity: 'low' },
      max_output_tokens: 500,
      store: false,
    }),
  });

  const requestId = openAIResponse.headers.get('x-request-id');
  const payload = await openAIResponse.json() as Record<string, unknown>;
  if (!openAIResponse.ok) {
    console.error('OpenAI request failed', { status: openAIResponse.status, requestId });
    return json({ error: 'The AI service could not answer right now.' }, 502, origin);
  }

  const answer = getOutputText(payload);
  if (!answer) return json({ error: 'The AI service returned an empty answer.' }, 502, origin);
  return json({ answer }, 200, origin);
});
