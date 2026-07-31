import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

// No auth required — same as before, anyone playing (including guests)
// can broadcast a rare pull, and it's still identity-free (no player_id
// stored, no username). This just writes to Supabase instead of posting
// to ntfy.sh, which was the actual problem: ntfy rate-limits by IP, and
// that bucket is shared by everyone behind the same IP (e.g. a whole
// school network), so it was getting exhausted almost instantly and the
// feed just stopped working for everyone behind it. Supabase writes here
// go through Vercel -> Supabase, not through a third-party per-IP limiter.
export async function POST(request) {
  try {
    const { rarityKey, rarityLabel, color, name, packLabel } = await request.json().catch(() => ({}));
    if (!rarityKey || !rarityLabel || !name) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("feed_events")
      .insert({
        rarity_key: String(rarityKey).slice(0, 60),
        rarity_label: String(rarityLabel).slice(0, 60),
        color: color ? String(color).slice(0, 20) : "#888888",
        card_name: String(name).slice(0, 120),
        pack_label: packLabel ? String(packLabel).slice(0, 80) : null,
      })
      .select("id, rarity_key, rarity_label, color, card_name, pack_label, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({
      event: {
        id: data.id,
        rarityKey: data.rarity_key,
        rarityLabel: data.rarity_label,
        color: data.color,
        name: data.card_name,
        packLabel: data.pack_label || undefined,
        ts: new Date(data.created_at).getTime(),
      },
    });
  } catch (e) {
    console.error("FEED BROADCAST ERROR:", e);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
