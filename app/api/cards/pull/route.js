import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

// No auth required — exist counts/serials are global across every player,
// guests included, same as the Feed and Presence system. Called once per
// opened batch, right after the client rolls the results, so counts /
// serials are known before the reveal modal even opens.
export const dynamic = "force-dynamic";

// Each RPC call to record_card_pulls runs as ONE Postgres transaction, and
// every row lock it takes on card_counts is held until the WHOLE batch
// finishes and commits — not released row-by-row as it goes. With Multi
// Open / Auto Open letting a single request carry up to 200 names, a big
// batch that touches a popular common card early on ends up holding that
// row's lock for the entire rest of its own loop, blocking every OTHER
// concurrent player's pull of that same card until the first batch fully
// commits. Under real concurrency that creates a lock convoy — waits stack
// on waits until Postgres's statement_timeout kills the query (this is what
// was producing the climbing 8s/13s/18s/24s+ durations and 500s).
//
// Fix: split each request into smaller chunks and call the RPC once per
// chunk, awaited sequentially (never in parallel — order must be preserved
// since duplicate names within a batch rely on call order to get correctly
// ascending serial numbers). Each chunk is its own short transaction, so a
// lock on a hot row is only ever held for a fraction of a second instead of
// however long it takes to process up to 200 rows.
const RPC_CHUNK_SIZE = 20;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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
    const counts = [];
    for (const batch of chunk(capped, RPC_CHUNK_SIZE)) {
      const { data, error } = await db.rpc("record_card_pulls", { names: batch });
      if (error) throw error;
      // record_card_pulls processes each chunk in order, one row at a
      // time, so counts lines up with names within — and across chunks,
      // since chunks are awaited sequentially, not in parallel.
      (data || []).forEach((row) => counts.push(row.new_count));
    }
    return NextResponse.json({ counts });
  } catch (e) {
    console.error("CARD PULL RECORD ERROR:", e);
    return NextResponse.json({ counts: [] }, { status: 500 });
  }
}