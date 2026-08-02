import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

// No auth required — same as before, anyone playing (including guests)
// can broadcast a rare pull. username/titleKey are optional: page.js only
// ever sends them when the player is actually logged in (see handleCollect
// in app/page.js), so a guest pull still comes through with both null and
// FeedTab.jsx falls back to showing "Someone", same as always.
//
// NOTE: this route still has no auth check, so nothing stops a raw POST
// from claiming any username it wants — same trust model the rest of this
// endpoint already had (rarity/card name were never verified either). Fine
// for a cosmetic feed; would need a real token check if this ever needs to
// be tamper-proof.
export async function POST(request) {
  try {
    const { rarityKey, rarityLabel, color, name, packLabel, username, titleKey } = await request.json().catch(() => ({}));
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
        username: username ? String(username).slice(0, 60) : null,
        title_key: titleKey ? String(titleKey).slice(0, 10) : null,
      })
      .select("id, rarity_key, rarity_label, color, card_name, pack_label, username, title_key, created_at")
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
        username: data.username || undefined,
        titleKey: data.title_key || undefined,
        ts: new Date(data.created_at).getTime(),
      },
    });
  } catch (e) {
    console.error("FEED BROADCAST ERROR:", e);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}