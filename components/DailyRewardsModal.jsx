"use client";

import { useEffect, useState } from "react";
import { DAILY_REWARDS_CONFIG } from "../lib/config";
import { dailyRewardLabel } from "../lib/engine";
import { fetchDailyStatus, claimDailyReward } from "../lib/authClient";

// Shown from a TopBar button (or auto-popped once per day) once the player
// is logged in. `onClaimed(reward)` is called with the granted reward so
// the caller can merge coins/cards/titles into local state exactly the way
// claimPendingCoins/consumeForcedPull already do elsewhere.
export default function DailyRewardsModal({ token, onClose, onClaimed }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDailyStatus(token).then(setStatus);
  }, [token]);

  async function handleClaim() {
    setBusy(true);
    setError("");
    try {
      const res = await claimDailyReward(token);
      onClaimed(res.reward);
      setStatus((prev) => ({ ...prev, alreadyClaimedToday: true, streak: res.streak }));
    } catch (e) {
      setError(e.message || "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  const days = DAILY_REWARDS_CONFIG.days;
  const currentDay = status ? status.predictedStreak : null;

  return (
    <div className="modal-backdrop auth-modal-backdrop">
      <div className="auth-modal" style={{ width: "min(520px, 94vw)" }}>
        <button className="modal-close-btn" onClick={onClose} title="Close">×</button>
        <div className="auth-title">Daily Rewards</div>

        {!status ? (
          <div className="auth-sub">Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
              {days.map((d) => {
                const isCurrent = d.day === currentDay;
                const isPast = currentDay && d.day < currentDay;
                return (
                  <div
                    key={d.day}
                    style={{
                      flex: "1 1 90px",
                      padding: "12px 10px",
                      borderRadius: 10,
                      textAlign: "center",
                      border: isCurrent ? "1.5px solid var(--accent, #f2c14e)" : "1px solid rgba(255,255,255,0.1)",
                      background: isCurrent
                        ? "rgba(242,193,78,0.12)"
                        : isPast
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(255,255,255,0.04)",
                      opacity: isPast ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-2)" }}>
                      Day {d.day}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                      {dailyRewardLabel(d)}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit-btn"
              onClick={handleClaim}
              disabled={busy || status.alreadyClaimedToday}
            >
              {status.alreadyClaimedToday
                ? "Come back tomorrow"
                : busy
                ? "Claiming..."
                : `Claim Day ${status.predictedStreak}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
