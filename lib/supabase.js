import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the SERVICE ROLE key, which bypasses Row Level
// Security entirely. This file must only ever be imported from files under
// app/api/**/route.js (Node runtime, never sent to the browser). Never
// import this from a "use client" component.
let cached = null;

export function supabaseAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are missing");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
