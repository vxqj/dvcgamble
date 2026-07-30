import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { EVENT_CONFIG } from "../../../lib/config";

const LEADERBOARD_SIZE = 50;

// Without this, Next.js treats this GET route as static (since it never
// touches cookies/headers) and caches the response indefinitely at build
// time — meaning new pulls would never show up until the next deploy. This
// forces it to actually hit Supabase fresh on every request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = supabaseAdmin();
    // Rarest-first, earliest-first for ties. We pull well more rows than
    // LEADERBOARD_SIZE and then de-dupe to one entry per player client-side
    // of this query, since only each player's single best pull should be
    // able to place — a player with many rare pulls shouldn't crowd out
    // everyone else with their 2nd/3rd/4th-best result. Because rows are
    // sorted globally by rarity first, a player's newest PERSONAL BEST
    // (lower rarity_index) always sorts ahead of their own older, worse
    // pulls — so this naturally reflects improvement without needing an
    // update/upsert anywhere else in the app.
    const { data, error } = await db
      .from("event_entries")
      .select("username, rarity_key, rarity_label, card_name, rarity_index, pulled_at, player_id")
      .order("rarity_index", { ascending: true })
      .order("pulled_at", { ascending: true })
      .limit(1000);

    if (error) throw error;

    const seenPlayers = new Set();
    const leaderboard = [];
    for (const row of data) {
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
