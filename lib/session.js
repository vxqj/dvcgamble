import { supabaseAdmin } from "./supabase";

// Verifies a session token against the DB and returns the CANONICAL player
// record ({ id, username, is_admin, bonus_titles }) straight from Postgres.
// Every API route that needs to know "who is this" — including every admin
// route and the Daily Rewards routes — must go through this. Never trust a
// username, admin flag, or bonus title list sent in a request body; the
// server always looks all of it up itself from the token.
//
// PERF: this used to do 2 DB round-trips (sessions lookup, then players
// lookup) on EVERY authenticated call — /api/game/state, /api/game/beacon,
// /api/event/submit, /api/auth/me. With ~60 concurrent players autosaving
// every few seconds, that alone could add up to dozens of queries/sec just
// to answer "who is this," which is a big part of what was slowing the
// site down under load.
//
// Fix: a short-lived in-memory cache, keyed by token. A warm serverless
// instance that sees the same token again within CACHE_TTL_MS skips both
// DB calls entirely. Worst case (cold instance, cache miss) it behaves
// exactly like before. TTL is kept short (30s) so a revoked/expired
// session — or a just-flipped is_admin flag / newly granted bonus title —
// is never trusted for long.
const cache = new Map(); // token -> { player, expiresAt }
const CACHE_TTL_MS = 30_000;

export async function getPlayerFromToken(token) {
  if (!token) return null;

  const cached = cache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.player;
  }

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
    .select("id, username, is_admin, bonus_titles")
    .eq("id", session.player_id)
    .maybeSingle();
  if (perr || !player) return null;

  cache.set(token, { player, expiresAt: Date.now() + CACHE_TTL_MS });
  return player;
}

export function tokenFromRequest(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}
