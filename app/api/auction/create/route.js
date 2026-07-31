import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";
import { RARITIES, AUCTION_CONFIG } from "../../../../lib/config";
import { isAuctionEligible } from "../../../../lib/engine";

export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const cardName = typeof body.cardName === "string" ? body.cardName.trim().slice(0, 200) : "";
  const rarityKey = typeof body.rarityKey === "string" ? body.rarityKey : "";
  const serial = Number.isFinite(body.serial) ? Math.floor(body.serial) : null;
  const startingPrice = Number(body.startingPrice);
  const durationSeconds = Number(body.durationSeconds);

  if (!cardName) {
    return NextResponse.json({ error: "Missing card name" }, { status: 400 });
  }

  const rarity = RARITIES.find((r) => r.key === rarityKey);
  if (!rarity) {
    return NextResponse.json({ error: "Unknown rarity" }, { status: 400 });
  }
  // Re-checked here, server-side, using the same rule the UI uses to
  // decide what's even offered — this is the actual enforcement point,
  // not the UI. See isAuctionEligible in lib/engine.js for why this can't
  // be duplicated inside the SQL function itself.
  if (!isAuctionEligible(rarityKey)) {
    return NextResponse.json({ error: `Only cards rarer than ${AUCTION_CONFIG.minRarityKey} can be auctioned` }, { status: 400 });
  }

  if (!Number.isFinite(startingPrice) || startingPrice < AUCTION_CONFIG.minStartingPrice || startingPrice > AUCTION_CONFIG.maxBid) {
    return NextResponse.json({ error: "Invalid starting price" }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < AUCTION_CONFIG.minDurationSec || durationSeconds > AUCTION_CONFIG.maxDurationSec) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.rpc("create_auction", {
    p_seller_id: player.id,
    p_card_name: cardName,
    p_rarity_key: rarityKey,
    p_serial: serial,
    p_starting_price: Math.floor(startingPrice),
    p_duration_seconds: Math.floor(durationSeconds),
  });

  if (error) {
    // Postgres RAISE EXCEPTION messages (e.g. "You do not own this card")
    // land here — safe to pass straight through, they're all
    // player-facing by design in the SQL function.
    return NextResponse.json({ error: error.message || "Could not create auction" }, { status: 400 });
  }

  return NextResponse.json({ auction: Array.isArray(data) ? data[0] : data });
}
