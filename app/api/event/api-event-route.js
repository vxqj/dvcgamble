import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { EVENT_CONFIG } from "../../../lib/config";

export async function GET() {
  try {
    const db = supabaseAdmin();
    // Rarest-first, earliest-first for ties. We pull extra rows and then
    // de-dupe to one entry per player client-side of this query, since only
    // each player's single best pull should be able to place.
    const { data, error } = await db
      .from("event_entries")
      .select("username, rarity_key, rarity_label, card_name, rarity_index, pulled_at, player_id")
      .order("rarity_index", { ascending: true })
      .order("pulled_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    const seenPlayers = new Set();
    const podium = [];
    for (const row of data) {
      if (seenPlayers.has(row.player_id)) continue;
      seenPlayers.add(row.player_id);
      podium.push(row);
      if (podium.length === 3) break;
    }

    return NextResponse.json({ endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, podium });
  } catch (e) {
    return NextResponse.json({ endsAt: EVENT_CONFIG.endsAt, enabled: EVENT_CONFIG.enabled, podium: [] });
  }
}
