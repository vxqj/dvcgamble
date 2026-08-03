import { NextResponse } from "next/server";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";
import { supabaseAdmin } from "../../../../lib/supabase";

export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("players")
    .select("pending_card_grant")
    .eq("id", player.id)
    .maybeSingle();

  if (error || !data || !data.pending_card_grant) {
    return NextResponse.json({ card: null });
  }

  await db.from("players").update({ pending_card_grant: null }).eq("id", player.id);
  return NextResponse.json({ card: data.pending_card_grant });
}
