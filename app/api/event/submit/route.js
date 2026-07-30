import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";
import { RARITIES, EVENT_CONFIG } from "../../../../lib/config";

function rarityInfo(key) {
  const idx = RARITIES.findIndex((r) => r.key === key);
  const r = RARITIES[idx] || RARITIES[RARITIES.length - 1];
  return { index: idx < 0 ? RARITIES.length - 1 : idx, label: r.label };
}

export async function POST(request) {
  try {
    if (!EVENT_CONFIG.enabled) return NextResponse.json({ ok: false, reason: "event not enabled" });
    if (Date.now() > new Date(EVENT_CONFIG.endsAt).getTime()) {
      return NextResponse.json({ ok: false, reason: "event ended" });
    }

    const token = tokenFromRequest(request);
    const player = await getPlayerFromToken(token);
    if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { rarityKey, cardName } = await request.json().catch(() => ({}));
    if (!rarityKey || !cardName) {
      return NextResponse.json({ error: "Missing pull details" }, { status: 400 });
    }

    // player.username comes from the DB lookup in getPlayerFromToken, not
    // from the request — so nothing the client sends (or edits in devtools)
    // can put a different name on the podium.
    const { index, label } = rarityInfo(rarityKey);
    const db = supabaseAdmin();
    const { error } = await db.from("event_entries").insert({
      player_id: player.id,
      username: player.username,
      rarity_key: rarityKey,
      rarity_label: label,
      rarity_index: index,
      card_name: cardName,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
