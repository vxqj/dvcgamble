import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { requireAdmin, findPlayerByUsername } from "../../../../lib/adminAuth";
import { RARITIES } from "../../../../lib/config";

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { targetUsername, rarityKey, cardName } = await request.json().catch(() => ({}));
  if (!targetUsername || !rarityKey || !RARITIES.some((r) => r.key === rarityKey)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const target = await findPlayerByUsername(db, targetUsername);
  if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { error } = await db
    .from("players")
    .update({ pending_forced_pull: { rarityKey, cardName: cardName || null } })
    .eq("id", target.id);
  if (error) return NextResponse.json({ error: "Failed to set forced pull" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
