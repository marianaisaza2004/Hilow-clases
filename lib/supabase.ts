import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/**
 * Server-only client using the service role key (bypasses RLS).
 * There's no per-coach Supabase Auth session (the app gates access with one
 * shared password, see lib/auth.ts) so every table has RLS enabled with no
 * anon policies — all reads/writes go through server components/API routes
 * using this client, never a browser-side anon-key client.
 */
export function createServiceSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
