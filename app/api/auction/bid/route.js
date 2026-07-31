import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";
import { AUCTION_CONFIG } from "../../../../lib/config";

export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const auctionId = typeof body.auctionId === "string" ? body.auctionId : "";
  const amount = Number(body.amount);

  if (!auctionId) {
    return NextResponse.json({ error: "Missing auction id" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0 || amount > AUCTION_CONFIG.maxBid) {
    return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
  }

  const db = supabaseAdmin();
  // Every real check (auction still active, bid high enough, bidder
  // actually has the coins, no self-bidding) happens INSIDE place_bid,
  // atomically, under row locks — this route is just a thin, validated
  // wrapper. Nothing here is trusted as the source of truth.
  const { data, error } = await db.rpc("place_bid", {
    p_auction_id: auctionId,
    p_bidder_id: player.id,
    p_amount: Math.floor(amount),
  });

  if (error) {
    return NextResponse.json({ error: error.message || "Bid failed" }, { status: 400 });
  }

  return NextResponse.json({ auction: Array.isArray(data) ? data[0] : data });
}
