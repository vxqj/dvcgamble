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

    // One row per player — their single best pull, full stop. Previously
    // every pull just inserted ANOTHER row, and figuring out which row was
    // actually "best" got worked out later by sorting on a rarity_index
    // that could go stale whenever RARITIES was reordered (see the GET
    // route). That's what caused leaderboard updates to silently not show
    // up / rank wrong even for a fresh Sovereign pull. Doing the
    // "is this actually better?" comparison right here, live, and keeping
    // exactly one row per player removes that whole class of bug — there's
    // nothing left to sort out incorrectly later.
    const { data: existing, error: fetchErr } = await db
      .from("event_entries")
      .select("id, rarity_key")
      .eq("player_id", player.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (existing) {
      const existingIndex = rarityInfo(existing.rarity_key).index;
      if (index >= existingIndex) {
        // Not an improvement over their current best — leave it alone.
        return NextResponse.json({ ok: true, improved: false });
      }
      const { error: updateErr } = await db
        .from("event_entries")
        .update({
          rarity_key: rarityKey,
          rarity_label: label,
          rarity_index: index,
          card_name: cardName,
          pulled_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await db.from("event_entries").insert({
        player_id: player.id,
        username: player.username,
        rarity_key: rarityKey,
        rarity_label: label,
        rarity_index: index,
        card_name: cardName,
      });
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}