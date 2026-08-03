import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";
import { RARITIES, EVENT_CONFIG } from "../../../../lib/config";
import { eventPullBeats } from "../../../../lib/engine";

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

    const { rarityKey, cardName, isOverclocked } = await request.json().catch(() => ({}));
    if (!rarityKey || !cardName) {
      return NextResponse.json({ error: "Missing pull details" }, { status: 400 });
    }
    const overclocked = !!isOverclocked;

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
    //
    // NOTE: this uses .order() + .limit(1) instead of .maybeSingle(). If a
    // player somehow ends up with more than one row (e.g. leftover rows
    // from before this one-row-per-player logic existed, or a race),
    // .maybeSingle() throws the moment it sees 2+ rows and silently 500s
    // the whole request — which is exactly what was breaking submissions
    // for anyone with a stale duplicate row. This is defensive even after
    // the one-time SQL cleanup (see the unique constraint added on
    // player_id) — it just can't ever hard-fail this way again.
    const { data: existingRows, error: fetchErr } = await db
      .from("event_entries")
      .select("id, rarity_key, is_overclocked")
      .eq("player_id", player.id)
      .order("rarity_index", { ascending: true })
      .limit(1);
    if (fetchErr) throw fetchErr;
    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    // eventPullBeats (lib/engine.js) handles the "is this an improvement?"
    // decision: strictly rarer always wins, and within the SAME rarity an
    // Overclocked pull beats a non-Overclocked one (see
    // OVERCLOCKED_CONFIG.eventTiebreak in config.js). A Common Overclocked
    // still can never beat a plain Sovereign — rarity is always checked
    // first.
    const beats = eventPullBeats(
      { rarityKey, isOverclocked: overclocked },
      existing ? { rarityKey: existing.rarity_key, isOverclocked: existing.is_overclocked } : null
    );

    if (existing) {
      if (!beats) {
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
          is_overclocked: overclocked,
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
        is_overclocked: overclocked,
      });
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ ok: true, improved: true });
  } catch (e) {
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
