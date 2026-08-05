import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { EVENT_CONFIG, RARITIES, OVERCLOCKED_CONFIG } from "../../../lib/config";

const LEADERBOARD_SIZE = 100;

// PERF: EventTab.jsx polls this route every 15s, per open tab. With ~60
// players that's up to ~240 requests/min, and each one used to pull up to
// 2000 rows from event_entries and re-sort them in JS from scratch, with
// caching fully disabled (force-dynamic + no-store). That's a lot of
// avoidable DB + CPU load piling up exactly when the site is busiest.
//
// Fix: keep computing the leaderboard the same correct way (see the big
// comment further down on liveRarityIndex — that logic is unchanged and
// still matters), but only actually hit Supabase + re-sort once every
// CACHE_MS, and serve every request in between from an in-memory copy.
// Worst case, the leaderboard is up to CACHE_MS stale, which is fine for
// a "who's winning right now" board. This turns "up to 240 heavy
// queries/min" into "at most 1 heavy query every 10 seconds," no matter
// how many players/tabs are polling.
const CACHE_MS = 10_000;
let cachedPayload = null;
let cachedAt = 0;

// Without this, Next.js treats this GET route as static (since it never
// touches cookies/headers) and caches the response indefinitely at build
// time — meaning new pulls would never show up until the next deploy. This
// forces it to actually hit Supabase fresh on every request (subject to
// our own short-lived cache above, not Next's build-time cache).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Always recompute a pull's rank from its rarity_key against the CURRENT
// live RARITIES list in lib/config.js, instead of trusting the rarity_index
// value that was stored in the DB back when that pull was submitted.
//
// This is the actual bug: RARITIES gets reordered / grows new top tiers
// over time (e.g. "Sovereign" got added above "Ascended" at some point).
// Every row already in event_entries keeps whatever rarity_index it was
// given at THAT time — it never gets recomputed. So an old "Ascended" pull
// that was stored back when Ascended was index 0 stays at index 0 forever,
// even after Sovereign takes over as the new index 0. That old row then
// ties with (or beats) a brand new, genuinely rarer Sovereign pull on sort,
// and since ties break on pulled_at ascending, the older-but-now-wrong row
// wins the tiebreak and outranks the real best pull. That's exactly what
// was happening: two stale Ascended rows sitting above a real Sovereign.
//
// Fixing this at read-time (instead of just going back and patching old
// rows) means it can never silently drift out of sync again, no matter how
// many more times the rarity tiers get reordered later.
function liveRarityIndex(rarityKey) {
  const idx = RARITIES.findIndex((r) => r.key === rarityKey);
  return idx < 0 ? RARITIES.length - 1 : idx;
}

async function buildLeaderboard() {
  const db = supabaseAdmin();
  // No longer ORDER BY the (unreliable) stored rarity_index column — pull
  // everything reasonable and sort it ourselves off live indices below.
  const { data, error } = await db
    .from("event_entries")
    .select("username, rarity_key, rarity_label, card_name, pulled_at, player_id, is_overclocked")
    .limit(2000);

  if (error) throw error;

  const tiebreakEnabled = !!(OVERCLOCKED_CONFIG && OVERCLOCKED_CONFIG.eventTiebreak);

  const sorted = (data || [])
    .map((row) => ({ ...row, liveIndex: liveRarityIndex(row.rarity_key) }))
    .sort((a, b) => {
      if (a.liveIndex !== b.liveIndex) return a.liveIndex - b.liveIndex;
      // Same rarity — an Overclocked pull outranks a non-Overclocked one
      // (see OVERCLOCKED_CONFIG.eventTiebreak in config.js). A Common
      // Overclocked still can never reach this comparison against a
      // Sovereign, since the liveIndex check above already separated them.
      if (tiebreakEnabled && !!a.is_overclocked !== !!b.is_overclocked) {
        return a.is_overclocked ? -1 : 1;
      }
      return new Date(a.pulled_at).getTime() - new Date(b.pulled_at).getTime();
    });

  // Only each player's single best (now correctly-ranked) pull can place
  // — de-dupe to one entry per player, keeping the first (= best) one
  // seen in the freshly-sorted order.
  const seenPlayers = new Set();
  const leaderboard = [];
  for (const row of sorted) {
    if (seenPlayers.has(row.player_id)) continue;
    seenPlayers.add(row.player_id);
    leaderboard.push(row);
    if (leaderboard.length === LEADERBOARD_SIZE) break;
  }

  // Equipped titles, resolved fresh every time rather than stored on the
  // event_entries row — titles live in player_state.state.equippedTitle
  // (see storage.js / TitlesTab.jsx), which a player can change any time
  // by equipping something else. Reading it live here means the
  // leaderboard always shows whatever title someone has equipped RIGHT
  // NOW, same "read-time, not write-time" fix as liveRarityIndex above —
  // an old event_entries row never goes stale just because someone
  // re-equips later.
  if (leaderboard.length > 0) {
    const playerIds = leaderboard.map((r) => r.player_id);
    const { data: stateRows } = await db
      .from("player_state")
      .select("player_id, state")
      .in("player_id", playerIds);
    const titleByPlayer = {};
    (stateRows || []).forEach((row) => {
      const key = row.state && row.state.equippedTitle;
      if (key) titleByPlayer[row.player_id] = key;
    });
    leaderboard.forEach((row) => {
      row.title_key = titleByPlayer[row.player_id] || null;
    });
  }

  return leaderboard;
}

export async function GET() {
  try {
    if (cachedPayload && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedPayload, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const leaderboard = await buildLeaderboard();
    cachedPayload = { endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, leaderboard };
    cachedAt = Date.now();

    return NextResponse.json(cachedPayload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    console.error("EVENT FETCH ERROR:", e);
    // Fall back to whatever we last had cached (even if stale) rather than
    // an empty board, so a transient DB hiccup doesn't blank the podium.
    return NextResponse.json(
      {
        endsAt: EVENT_CONFIG.endsAt,
        enabled: EVENT_CONFIG.enabled,
        leaderboard: cachedPayload ? cachedPayload.leaderboard : [],
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
