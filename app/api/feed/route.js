import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

const LIMIT = 60;

// Polled every ~4s by every open tab (see lib/feed.js). A short in-memory
// cache means that turns into "at most one real Supabase query every 3
// seconds, no matter how many tabs are polling" instead of one query per
// tab per poll — same idea as the event leaderboard cache.
const CACHE_MS = 3000;
let cachedPayload = null;
let cachedAt = 0;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    if (cachedPayload && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedPayload, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("feed_events")
      .select("id, rarity_key, rarity_label, color, card_name, pack_label, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) throw error;

    const events = (data || []).map((row) => ({
      id: row.id,
      rarityKey: row.rarity_key,
      rarityLabel: row.rarity_label,
      color: row.color,
      name: row.card_name,
      packLabel: row.pack_label || undefined,
      ts: new Date(row.created_at).getTime(),
    }));

    cachedPayload = { events };
    cachedAt = Date.now();
    return NextResponse.json(cachedPayload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    console.error("FEED FETCH ERROR:", e);
    // Fall back to whatever was last cached rather than blanking the feed
    // on a transient DB hiccup.
    return NextResponse.json({ events: cachedPayload ? cachedPayload.events : [] });
  }
}
