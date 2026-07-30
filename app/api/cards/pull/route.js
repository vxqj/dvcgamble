import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

// No auth required — exist counts/serials are global across every player,
// guests included, same as the Feed and Presence system. Called once per
// opened batch, right after the client rolls the results, so counts /
// serials are known before the reveal modal even opens.
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { names } = await request.json().catch(() => ({}));
    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ counts: [] });
    }

    // Defensive cap — a normal pack open is at most a few dozen cards even
    // with max Multi Open. This just guards against a garbage/huge payload,
    // it's not a real gameplay limit.
    const capped = names.slice(0, 200).map((n) => String(n).slice(0, 200));

    const db = supabaseAdmin();
    const { data, error } = await db.rpc("record_card_pulls", { names: capped });
    if (error) throw error;

    // record_card_pulls processes the array in order, one row at a time,
    // so counts[i] always lines up with names[i] — including duplicate
    // names within the same batch, which each correctly get their own,
    // increasing count/serial.
    const counts = (data || []).map((row) => row.new_count);
    return NextResponse.json({ counts });
  } catch (e) {
    console.error("CARD PULL RECORD ERROR:", e);
    return NextResponse.json({ counts: [] }, { status: 500 });
  }
}
