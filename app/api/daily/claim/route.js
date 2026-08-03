import { NextResponse } from "next/server";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";
import { supabaseAdmin } from "../../../../lib/supabase";
import { dailyRewardForStreak, randomCardForRarity } from "../../../../lib/engine";

export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const streak = player.daily_streak || 0;
  const lastClaim = player.last_daily_claim || null;
  const todayUTC = new Date().toISOString().slice(0, 10);
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastClaim === todayUTC) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }

  const predictedStreak = lastClaim === yesterdayUTC ? streak + 1 : 1;
  const reward = dailyRewardForStreak(predictedStreak);
  if (!reward) return NextResponse.json({ error: "daily_rewards_disabled" }, { status: 400 });

  const db = supabaseAdmin();
  const params = { p_player_id: player.id, p_predicted_streak: predictedStreak, p_reward_type: reward.type };

  if (reward.type === "coins") {
    params.p_coin_amount = reward.amount;
  } else if (reward.type === "card") {
    const cardName = randomCardForRarity(reward.rarityKey);
    if (!cardName) return NextResponse.json({ error: "bad_reward_config" }, { status: 500 });
    params.p_card_rarity = reward.rarityKey;
    params.p_card_name = cardName;
  } else if (reward.type === "title") {
    params.p_title_key = reward.titleKey;
  }

  const { data, error } = await db.rpc("claim_daily_reward", params);
  if (error || !data || !data.ok) {
    const reason = data?.error || "claim_failed";
    const status = reason === "already_claimed" || reason === "stale" ? 409 : 500;
    return NextResponse.json({ error: reason }, { status });
  }

  return NextResponse.json({ ok: true, streak: data.streak, reward });
}
