import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const allowedOrigins = new Set([
  'https://portugal.patrikbandak.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const guideContext = `
HOUSE AND DOG GUIDE FOR FLYNN (AND HER BOYFRIEND JEREMY). Aug 29 to Sep 14, 2026.
Patrik and Megan are in Portugal. Portugal is 5 hours ahead of Pennsylvania, so 9:00 PM in PA is 2:00 AM in Portugal. Flynn or Jeremy should still call if something is urgent, regardless of the time. Flynn already has Patrik's and Megan's phone numbers. WhatsApp is the best way to reach them, over wifi, with no international charges either direction.

FEEDING
Bengt gets 3 cups a day total, split 1.5 cups in the morning and 1.5 cups at night. That is the right amount for his 40 pounds. Chloe gets 2 cups a day, 1 cup in the morning and 1 cup at night.

Morning:
- Bengt will need to pee right away.
- Chloe's bowl: 1 cup + nutrition powder + 2 crushed allergy pills + a spoonful of sardines.
- Bengt's bowl: 1.5 cups + nutrition powder + a spoonful of sardines.
- They both usually poop and pee on the walk after eating. Bengt sometimes goes before.

Midday:
- Walk and pee.
- No meal, but treats are great for both of them around now. The frozen treats in the freezer go inside the blue, green, and larger pink balls, and they will snack on those for a good while. Nice after a lunchtime potty trip.

Evening:
- Chloe's bowl: 1 cup + a spoonful of sardines.
- Bengt's bowl: 1.5 cups + a spoonful of sardines.

Only Chloe gets the allergy pills, two of them, crushed, in her morning bowl only. Bengt never gets one. The nutrition powder goes in both morning bowls only, not at dinner. Sardines go in every meal for both dogs.

SNUFFLE MAT
Great at any time for either dog. It is fine to feed Bengt his whole breakfast out of the snuffle mat, with the sardines on the side.

WALKS
Flynn has already walked both dogs with Patrik. Chloe pulls a fair amount in general, and Bengt has his moments. When either dog pulls, stop walking completely and give a little slack back on the leash. If they pull again, stop again. Once the leash is slack and they are not pulling, start walking again. This has been working well with both dogs over the last month. Walking them together or separately is fine, whatever is easier.

TRAINING AND TREATS
Training is highly encouraged and they both like it. They know these commands: touch, sit, stay, place, here, back up, stop. Treats are in the usual spot.

THE CRATE
When Bengt gets nippy and wild, he is overtired. More exercise will make it worse. Say "let's go take a nap" and he goes to his place. He will protest a bit. Once he is in, he sleeps two hours or more.
When he cries in the crate:
- Nonstop, no breaks: take him straight outside to potty, then right back in the crate. Do not let him play or stay out. The point is that crying leads to a potty trip, never to playtime.
- Pauses for a minute or two: he is settled enough to come out. Take him to potty and he can stay out.
In practice he rarely cries nonstop. Usually a minute or two, then he sleeps for a few hours.

LEAVING THE HOUSE
Both dogs go to daycare twice a week at Playtime Pet Resort, 989 E Lancaster Ave, Downingtown, PA 19335, 215-910-4991, open 7:00 AM to 8:00 PM weekdays. On other days, coming home at lunch is ideal. Take Bengt out to pee before leaving. Close the bedroom door and the dogs get the rest of the house. Four hours alone is the maximum for Bengt. Chloe can go about six.

THINGS THAT WILL PROBABLY HAPPEN
Chloe raids the trash if anything in it smells good, and Bengt shreds whatever she drags out. Take the trash out or block the can with a chair. Bengt chews what he should not, so keep personal belongings out of reach and leave his toys around. Bengt will probably have a potty accident, which is fine. To minimize them, take him out right when he wakes up and right when he comes out of the crate. He asks to go out by running over and starting to play, so sudden attention usually means he needs to go.

THE HOUSE
- Trash goes out Thursday evening, picked up early Friday.
- Packages come to the front door.
- Plants were watered before they left and will probably only need water toward the end.
- Thermostat is on a day/night timer, about 74 and 76 upstairs. Flynn is welcome to change it however she likes.
- Wifi password: [Patrik has not written this in yet. Tell her to ask Patrik.]

CONTACTS
Closest by:
- Ruth, next door, always home: 484-888-6733. Good first call for anything quick.
Vets:
- Ruth, also a neighbor, and a vet. This is a DIFFERENT Ruth from the one next door: 610-400-9235.
- East Bradford Veterinary Hospital, their regular practice: (610) 241-3390, 712 W Nields St, West Chester, PA 19382.
General help:
- Jenn, Bubba's mom. Bubba is Chloe's scraggly-haired friend and Flynn has met him: 484-639-1322.
- Marigold, neighbor: 610-329-7502.
If Flynn has to leave or cannot finish the stay:
- Sweta: 215-206-8041.
- Will, Sweta's husband: 615-438-3585.
Daycare:
- Playtime Pet Resort: 215-910-4991, 989 E Lancaster Ave, Downingtown, PA 19335. Open 7:00 AM to 8:00 PM weekdays.
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
  // SITTER_PASSPHRASE holds one passphrase, or several separated by commas.
  const sitterPassphrases = (Deno.env.get('SITTER_PASSPHRASE') || '').split(',').map((value) => value.trim()).filter(Boolean);
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!supabaseUrl || !serviceRoleKey || !sitterPassphrases.length || !openAIKey) return json({ error: 'The sitter guide is not configured yet.' }, 503, origin);

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

  let passphraseOk = false;
  for (const candidate of sitterPassphrases) if (timingSafeEqual(passphrase, candidate)) passphraseOk = true;
  if (!passphraseOk) {
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
      instructions: 'You are a helper for Flynn, who is house and dog sitting for Chloe (adult dog) and Bengt (puppy) while Patrik and Megan are in Portugal. Her boyfriend Jeremy is around sometimes and may also be the one asking. The guide below is the authority on anything about these two dogs and this house, so always prefer it. If the guide does not cover the question, answer from your own knowledge, and use web search when current or local information would help. Make it clear when an answer comes from outside the guide rather than from Patrik and Megan. Keep the tone warm but plain: short sentences, no filler, no catchphrases, and never use em dashes. She is reading this on a phone, often while handling a dog, so lead with the answer. The wifi password is not in the guide, so if she asks, tell her Patrik is writing it in and she should ask him. Never invent a phone number. Be careful about the two Ruths: one is the next door neighbor who is always home, the other is a neighbor who is a vet. Always say which one you mean. You are not a veterinarian. For anything that sounds like a real emergency, tell her to call a vet right away before anything else.\n\nGUIDE:\n' + guideContext,
      input: conversationInput,
      tools: [{ type: 'web_search' }],
      reasoning: { effort: 'none' },
      text: { verbosity: 'low' },
      max_output_tokens: 900,
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
