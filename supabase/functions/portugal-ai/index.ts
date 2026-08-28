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

async function safetyIdentifier(userId: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `trip-${hex.slice(0, 32)}`;
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

type ChatMessage = { role:'user'|'assistant'; content:string };

function tripContext(payload:unknown) {
  if (!payload||typeof payload!=='object') return {itinerary:[],bookings:[],reservations:[],drives:[]};
  const trip=payload as Record<string,unknown>;
  const rows=(key:string)=>Array.isArray(trip[key])?trip[key] as Record<string,unknown>[]:[];
  return {
    itinerary:rows('itinerary').map((day)=>({date:day.date,base:day.base,sleep:day.sleep,plan:day.plan,transport:day.transport,status:day.status,note:day.note})),
    bookings:rows('bookings').map((item)=>({item:item.item,choice:item.choice,status:item.status,action:item.action,reservationId:item.reservationId})),
    reservations:rows('reservations').map((item)=>({kind:item.kind,title:item.title,location:item.location,startDate:item.startDate,endDate:item.endDate,status:item.status,provider:item.provider,confirmation:item.confirmation,pin:item.pin,address:item.address,details:item.details,href:item.href})),
    drives:rows('drives').map((drive)=>({name:drive.name,duration:drive.duration,stops:drive.stops,note:drive.note,weather:drive.weather})),
  };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const authHeader = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = getPublishableKey();
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Please sign in again.' }, 401, origin);
  if (!supabaseUrl || !supabaseKey || !openAIKey) return json({ error: 'The AI assistant is not configured yet.' }, 503, origin);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.slice(7));
  if (userError || !user) return json({ error: 'Please sign in again.' }, 401, origin);

  const { data: membership } = await supabase.from('trip_members').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!membership) return json({ error: 'This account is not a trip member.' }, 403, origin);

  let question = '';
  let history:ChatMessage[]=[];
  let mode:'ask'|'translate'='ask';
  let direction:'en-pt'|'pt-en'='en-pt';
  try {
    const body = await request.json() as { question?:unknown; history?:unknown; mode?:unknown; direction?:unknown };
    mode=body.mode==='translate'?'translate':'ask';
    direction=body.direction==='pt-en'?'pt-en':'en-pt';
    question=typeof body.question==='string'?body.question.trim():'';
    if (Array.isArray(body.history)) history=body.history.filter((item):item is ChatMessage=>{
      if (!item||typeof item!=='object') return false;
      const candidate=item as Record<string,unknown>;
      return (candidate.role==='user'||candidate.role==='assistant')&&typeof candidate.content==='string';
    }).slice(-8).map((item)=>({role:item.role,content:item.content.slice(0,1200)}));
  } catch {
    return json({ error: 'The question must be valid JSON.' }, 400, origin);
  }
  if (!question) return json({ error: mode==='translate'?'Type something to translate first.':'Ask a question first.' }, 400, origin);
  if (question.length > 800) return json({ error: 'Keep the text under 800 characters.' }, 400, origin);

  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: minuteCount }, { count: dayCount }] = await Promise.all([
    supabase.from('ai_requests').select('id', { count: 'exact', head: true }).gte('created_at', minuteAgo),
    supabase.from('ai_requests').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
  ]);
  if ((minuteCount ?? 0) >= 6) return json({ error: 'Take a short pause before asking again.' }, 429, origin);
  if ((dayCount ?? 0) >= 50) return json({ error: 'Today’s AI limit has been reached.' }, 429, origin);

  const { error: usageError } = await supabase.from('ai_requests').insert({ user_id: user.id });
  if (usageError) return json({ error: 'The AI rate limit is not configured yet.' }, 503, origin);

  if (mode==='translate') {
    const source=direction==='en-pt'?'English':'European Portuguese';
    const target=direction==='en-pt'?'European Portuguese':'English';
    const translateResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-5.6-luna',
        instructions: `Translate the user's text from ${source} to ${target}. Use European Portuguese as spoken in Portugal, never Brazilian Portuguese. Return only the translation. No quotes, no commentary, no pronunciation guide, no alternatives. Keep the register natural for a traveler speaking to a local.`,
        input: [{ role: 'user' as const, content: question }],
        reasoning: { effort: 'none' },
        text: { verbosity: 'low' },
        max_output_tokens: 400,
        store: false,
        safety_identifier: await safetyIdentifier(user.id),
      }),
    });
    const translatePayload = await translateResponse.json() as Record<string, unknown>;
    if (!translateResponse.ok) {
      console.error('OpenAI translate failed', { status: translateResponse.status, requestId: translateResponse.headers.get('x-request-id') });
      return json({ error: 'The translator could not answer right now.' }, 502, origin);
    }
    const translation = getOutputText(translatePayload);
    if (!translation) return json({ error: 'The translator returned nothing.' }, 502, origin);
    return json({ translation }, 200, origin);
  }

  const {data:tripRow,error:tripError}=await supabase.from('trip_data').select('payload').order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if (tripError||!tripRow?.payload) return json({error:'Your trip context could not be loaded.'},503,origin);
  const knownTrip=tripContext(tripRow.payload);
  const conversationInput=[...history,{role:'user' as const,content:question}];

  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-5.6-luna',
      instructions: 'You are the private Portugal trip assistant for two authorized travelers. Their current itinerary, bookings, reservations, confirmation details, lodging addresses, and drive plans are provided below on every turn. Use that context before asking for dates, places, lodging, transportation, or booking details. Do not ask for information already present. You may provide saved confirmation codes, PINs, seat assignments, and card brand/last four when directly useful, but never request or expose a full payment-card number or security code. Give concrete recommendations tied to their dates and route. Distinguish saved trip facts from live schedules, prices, availability, weather, road status, and trail safety, which must be verified. Use concise, useful bullets and European Portuguese for translations.\n\nKNOWN TRIP CONTEXT:\n'+JSON.stringify(knownTrip),
      input: conversationInput,
      reasoning: { effort: 'none' },
      text: { verbosity: 'low' },
      max_output_tokens: 600,
      store: false,
      safety_identifier: await safetyIdentifier(user.id),
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
