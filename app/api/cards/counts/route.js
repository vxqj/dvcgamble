import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

// Powers the Inventory hover tooltip ("N exist") for cards that were
// pulled in an earlier session and aren't already cached client-side.
// Read-only, no auth needed.
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("names") || "";
    const names = raw.split(",").map((n) => n.trim()).filter(Boolean).slice(0, 100);
    if (names.length === 0) return NextResponse.json({ counts: {} });

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("card_counts")
      .select("card_name, count")
      .in("card_name", names);
    if (error) throw error;

    const counts = {};
    (data || []).forEach((row) => {
      counts[row.card_name] = row.count;
    });
    return NextResponse.json({ counts });
  } catch (e) {
    console.error("CARD COUNTS FETCH ERROR:", e);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}
