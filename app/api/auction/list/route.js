import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseAdmin();

    // Cheap, no-auth-required cleanup — anyone loading the Auction tab
    // helps flush any auctions whose timer already ran out, so payouts
    // don't wait on a separate cron job to exist.
    // await db.rpc("settle_expired_auctions");

    const { data: auctions, error } = await db
      .from("auctions")
      .select("id, seller_id, card_name, rarity_key, serial, starting_price, current_bid, current_bidder_id, ends_at, status, created_at")
      .eq("status", "active")
      .order("ends_at", { ascending: true });
    if (error) throw error;

    const ids = (auctions || []).map((a) => a.id);
    let bidsByAuction = {};
    if (ids.length > 0) {
      const { data: bids, error: bidsErr } = await db
        .from("auction_bids")
        .select("auction_id, amount, placed_at, bidder_id")
        .in("auction_id", ids)
        .order("placed_at", { ascending: false });
      if (bidsErr) throw bidsErr;
      // Usernames aren't stored on auction_bids — join against players so
      // the bid history can show who bid what without exposing anything
      // else about the account.
      const bidderIds = [...new Set((bids || []).map((b) => b.bidder_id))];
      let usernames = {};
      if (bidderIds.length > 0) {
        const { data: players } = await db.from("players").select("id, username").in("id", bidderIds);
        (players || []).forEach((p) => {
          usernames[p.id] = p.username;
        });
      }
      (bids || []).forEach((b) => {
        if (!bidsByAuction[b.auction_id]) bidsByAuction[b.auction_id] = [];
        bidsByAuction[b.auction_id].push({
          amount: b.amount,
          placedAt: b.placed_at,
          username: usernames[b.bidder_id] || "Unknown",
        });
      });
    }

    // Look up the seller's username for each auction too.
    const sellerIds = [...new Set((auctions || []).map((a) => a.seller_id))];
    let sellerNames = {};
    if (sellerIds.length > 0) {
      const { data: sellers } = await db.from("players").select("id, username").in("id", sellerIds);
      (sellers || []).forEach((p) => {
        sellerNames[p.id] = p.username;
      });
    }

    const shaped = (auctions || []).map((a) => ({
      id: a.id,
      cardName: a.card_name,
      rarityKey: a.rarity_key,
      serial: a.serial,
      startingPrice: a.starting_price,
      currentBid: a.current_bid,
      sellerUsername: sellerNames[a.seller_id] || "Unknown",
      sellerId: a.seller_id,
      currentBidderId: a.current_bidder_id,
      endsAt: a.ends_at,
      createdAt: a.created_at,
      bids: bidsByAuction[a.id] || [],
    }));

    return NextResponse.json({ auctions: shaped });
  } catch (e) {
    console.error("AUCTION LIST ERROR:", e);
    return NextResponse.json({ auctions: [] }, { status: 500 });
  }
}
