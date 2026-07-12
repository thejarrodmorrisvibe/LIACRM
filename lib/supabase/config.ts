/**
 * True once the Supabase env vars are present. Until the owner connects their
 * Supabase project, the app runs on seeded demo data so the UI is fully usable.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Open-access mode: when true, the app skips login entirely and reads/writes a
 * single shared dataset (data still persists in Supabase). Flip to false to
 * require magic-link login again (also re-tighten RLS in supabase/schema.sql).
 */
export const AUTH_DISABLED =
  (process.env.NEXT_PUBLIC_AUTH_DISABLED ?? "true").toLowerCase() !== "false";
