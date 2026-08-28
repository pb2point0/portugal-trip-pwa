# Private Portugal trip PWA

Installable trip companion for authorized travelers. The static frontend can be hosted publicly, while itinerary, booking, route, and budget data remains in Supabase behind email-and-password authentication and row-level security.

## Required configuration

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the intended Supabase project.
2. Create the traveler accounts in **Authentication → Users**, then insert their user IDs into `public.trip_members`.
3. Add GitHub repository secrets named `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Add `OPENAI_API_KEY` in **Supabase → Edge Functions → Secrets** and deploy `supabase/functions/portugal-ai` with **Verify JWT with legacy secret** disabled. The function verifies the current user and trip membership itself.
5. Configure GitHub Pages and the custom domain only after the privacy scan passes.

The publishable Supabase key is intentionally used by the browser. Database row-level policies—not key secrecy—protect the private tables. The OpenAI key exists only in the Edge Function environment.

## Privacy model

- The public bundle contains only the authenticated application shell.
- Personal trip details are loaded from `public.trip_data` only after login.
- The OpenAI helper sends only the question typed by the user and uses `store: false`; it does not read the private trip payload.
- AI rate limiting stores request timestamps only.
- Signing out removes the active Supabase session. Trip payloads are not persisted in the browser by application code.

## Sitter guide app

`yoursite.com/sitter/` is a separate, much simpler page for whoever is house/dog sitting while you're away. It has no per-user Supabase login — instead it's gated by one shared passphrase, checked server-side by the `sitter-ai` Edge Function on every request.

1. Run the updated [`supabase/schema.sql`](supabase/schema.sql) (adds the `sitter_ai_events` table used for rate limiting; it's only ever touched by the service role key, so it needs no RLS policies).
2. Deploy `supabase/functions/sitter-ai` with **Verify JWT** disabled (already set via `verify_jwt = false` in `supabase/config.toml`).
3. In **Supabase → Edge Functions → Secrets**, add:
   - `SITTER_PASSPHRASE` — the passphrase you'll text the sitter.
   - `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API. This is different from the publishable key the browser uses; never expose it client-side.
   - `OPENAI_API_KEY` (can reuse the same key as `portugal-ai`).
4. Fill in the blanks in [`app/sitter/sitter-data.ts`](app/sitter/sitter-data.ts) — wifi password, vet/emergency contacts, and your and Megan's phone numbers — before sending the link. Anything left blank shows as "not filled in yet" on the page, and the assistant is instructed to say the same rather than guess. The same guide text (kept in sync by hand) is baked into `supabase/functions/sitter-ai/index.ts` as the AI's context, so update both files together.
5. Send the sitter `https://yoursite.com/sitter/` and the passphrase.

## Local development

Copy `.env.example` to `.env.local`, add the intended Supabase project values, then run:

```bash
pnpm install
pnpm dev
```

Production verification:

```bash
pnpm lint
pnpm build
```
