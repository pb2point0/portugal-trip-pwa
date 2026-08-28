/**
 * supabase.functions.invoke() returns `data: null` for any non-2xx response and
 * puts the actual Response on `error.context`. Without reading that, real server
 * messages (rate limits, misconfiguration) get replaced by a generic fallback.
 */
export async function functionError(error: unknown, data: { error?: string } | null, fallback: string) {
  if (data?.error) return data.error;
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.clone().json() as { error?: unknown };
      if (typeof body?.error === 'string' && body.error) return body.error;
    } catch {}
  }
  return fallback;
}
