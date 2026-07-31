import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.rpc("claim_auction_cards", { p_player_id: player.id });
  if (error) return NextResponse.json({ cards: [] }, { status: 500 });
  return NextResponse.json({ cards: data || [] });
}
