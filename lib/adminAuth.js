import { getPlayerFromToken, tokenFromRequest } from "./session";

// Every /api/admin/* route calls this FIRST, before doing anything else.
// It re-verifies the session token against the DB (same as any other
// authed route) and additionally checks is_admin on that same canonical
// row. There is no other path to admin power anywhere in the app — no
// client-sent flag, no header, no hidden query param. A person who finds
// the admin button in devtools, or copies one of these API URLs, still
// just gets a 403 unless they're logged into the one account that has
// is_admin = true in Supabase.
export async function requireAdmin(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player || !player.is_admin) return null;
  return player;
}

export async function findPlayerByUsername(db, username) {
  if (!username || typeof username !== "string") return null;
  const { data, error } = await db
    .from("players")
    .select("id, username")
    .eq("username", username.trim())
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
