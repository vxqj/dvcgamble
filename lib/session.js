import { supabaseAdmin } from "./supabase";

// Verifies a session token against the DB and returns the CANONICAL player
// record ({ id, username }) straight from Postgres. Every API route that
// needs to know "who is this" must go through this — never trust a
// username sent in a request body. That's what makes the username
// un-editable from devtools: the client can display whatever it wants
// locally, but nothing it sends is ever written to the DB as "the
// username" — the server always looks it up itself from the token.
export async function getPlayerFromToken(token) {
  if (!token) return null;
  const db = supabaseAdmin();

  const { data: session, error } = await db
    .from("sessions")
    .select("player_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: player, error: perr } = await db
    .from("players")
    .select("id, username")
    .eq("id", session.player_id)
    .maybeSingle();
  if (perr || !player) return null;

  return player;
}

export function tokenFromRequest(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}
