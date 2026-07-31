import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { requireAdmin, findPlayerByUsername } from "../../../../lib/adminAuth";

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { targetUsername, multiplier, minutes } = await request.json().catch(() => ({}));
  const mult = Number(multiplier);
  const mins = Number(minutes);
  if (!Number.isFinite(mult) || mult <= 0 || !Number.isFinite(mins) || mins <= 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const until = new Date(Date.now() + mins * 60_000).toISOString();

  if (targetUsername) {
    const target = await findPlayerByUsername(db, targetUsername);
    if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    const { error } = await db
      .from("players")
      .update({ luck_multiplier: mult, luck_until: until })
      .eq("id", target.id);
    if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
    return NextResponse.json({ ok: true, scope: "player", until });
  }

  const { error } = await db
    .from("admin_state")
    .update({ site_luck_multiplier: mult, site_luck_until: until, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ ok: true, scope: "site", until });
}
