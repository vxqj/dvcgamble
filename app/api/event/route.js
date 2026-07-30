import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { EVENT_CONFIG } from "../../../lib/config";

const LEADERBOARD_SIZE = 50;

export async function GET() {
  try {
    const db = supabaseAdmin();
    // Rarest-first, earliest-first for ties. We pull well more rows than
    // LEADERBOARD_SIZE and then de-dupe to one entry per player client-side
    // of this query, since only each player's single best pull should be
    // able to place — a player with many rare pulls shouldn't crowd out
    // everyone else with their 2nd/3rd/4th-best result.
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

    return NextResponse.json({ endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, leaderboard });
  } catch (e) {
    console.error("EVENT FETCH ERROR:", e);
    return NextResponse.json({ endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, leaderboard: [] });
  }
}
