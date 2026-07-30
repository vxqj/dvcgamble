import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { EVENT_CONFIG, RARITIES } from "../../../lib/config";

const LEADERBOARD_SIZE = 50;

// Without this, Next.js treats this GET route as static (since it never
// touches cookies/headers) and caches the response indefinitely at build
// time — meaning new pulls would never show up until the next deploy. This
// forces it to actually hit Supabase fresh on every request.
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

export async function GET() {
  try {
    const db = supabaseAdmin();
    // No longer ORDER BY the (unreliable) stored rarity_index column — pull
    // everything reasonable and sort it ourselves off live indices below.
    const { data, error } = await db
      .from("event_entries")
      .select("username, rarity_key, rarity_label, card_name, pulled_at, player_id")
      .limit(2000);

    if (error) throw error;

    const sorted = (data || [])
      .map((row) => ({ ...row, liveIndex: liveRarityIndex(row.rarity_key) }))
      .sort((a, b) => {
        if (a.liveIndex !== b.liveIndex) return a.liveIndex - b.liveIndex;
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

    return NextResponse.json(
      { endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, leaderboard },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("EVENT FETCH ERROR:", e);
    return NextResponse.json(
      { endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, leaderboard: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}