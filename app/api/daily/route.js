import { NextResponse } from "next/server";
import { getPlayerFromToken, tokenFromRequest } from "../../../lib/session";
import { dailyRewardForStreak } from "../../../lib/engine";

export async function GET(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const streak = player.daily_streak || 0;
  const lastClaim = player.last_daily_claim || null;
  const todayUTC = new Date().toISOString().slice(0, 10);
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const alreadyClaimedToday = lastClaim === todayUTC;

  const predictedStreak = alreadyClaimedToday
    ? streak
    : lastClaim === yesterdayUTC
    ? streak + 1
    : 1;

  const upcomingReward = dailyRewardForStreak(predictedStreak);

  return NextResponse.json({
    streak,
    alreadyClaimedToday,
    predictedStreak,
    upcomingReward,
  });
}
