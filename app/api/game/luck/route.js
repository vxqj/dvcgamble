import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

export const dynamic = "force-dynamic";

// No auth required — a site-wide luck event should affect guests too, same
// as the Feed/Presence system needing no account. If a token IS present
// and valid, this also factors in that specific player's personal boost,
// whichever is currently stronger.
export async function GET(request) {
  try {
    const db = supabaseAdmin();
    const now = Date.now();

    let multiplier = 1;

    const { data: site } = await db
      .from("admin_state")
      .select("site_luck_multiplier, site_luck_until")
      .eq("id", 1)
      .maybeSingle();
    if (site && site.site_luck_until && new Date(site.site_luck_until).getTime() > now) {
      multiplier = Math.max(multiplier, Number(site.site_luck_multiplier) || 1);
    }

    const token = tokenFromRequest(request);
    const player = await getPlayerFromToken(token);
    if (player) {
      const { data: row } = await db
        .from("players")
        .select("luck_multiplier, luck_until")
        .eq("id", player.id)
        .maybeSingle();
      if (row && row.luck_until && new Date(row.luck_until).getTime() > now) {
        multiplier = Math.max(multiplier, Number(row.luck_multiplier) || 1);
      }
    }

    return NextResponse.json({ multiplier });
  } catch (e) {
    console.error("LUCK FETCH ERROR:", e);
    return NextResponse.json({ multiplier: 1 });
  }
}
