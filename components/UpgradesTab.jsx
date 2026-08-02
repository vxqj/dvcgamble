"use client";

import { UPGRADES, COIN_INTERVAL_MS } from "../lib/config";
import { fmtNum, upgradeCost, upgradeMaxed, multiOpenCount, effectiveCoinPerTick, unpackSpeedMultiplier, luckBoostPercent } from "../lib/engine";

export default function UpgradesTab({ coins, upgrades, onBuy }) {
  const entries = Object.values(UPGRADES);

  return (
    <div>
      <div className="section-title">UPGRADES <div className="line" /></div>
      <div className="upgrades-grid">
        {entries.map((cfg) => {
          const level = upgrades[cfg.key] || 0;
          const maxed = upgradeMaxed(cfg.key, level);
          const cost = maxed ? null : upgradeCost(cfg.key, level);
          const canAfford = !maxed && coins >= cost;

          return (
            <div className={`upgrade-card${maxed ? " maxed" : ""}`} key={cfg.key}>
              <div className="u-title">{cfg.label}</div>
              <div className="u-desc">{cfg.description}</div>
              <div className="u-level">
                Level {level} / {cfg.maxLevel}
                {cfg.key === "multiOpen" && ` — opens ${multiOpenCount(level)} pack${multiOpenCount(level) === 1 ? "" : "s"} at once`}
                {cfg.key === "coinBoost" && ` — +${effectiveCoinPerTick(level)} coins every ${(COIN_INTERVAL_MS / 1000).toFixed(0)}s`}
                {cfg.key === "unpackSpeed" && ` — ${Math.round((1 - unpackSpeedMultiplier(level)) * 100)}% faster reveals`}
                {cfg.key === "luck" && ` — Legendary pulls ~+${luckBoostPercent(level, "legendary")}% likely, Secret ~+${luckBoostPercent(level, "secret")}%`}
              </div>
              <div className="u-cost-row">
                <div className="u-cost">
                  {maxed ? "MAXED" : (
                    <>
                      <span>🪙</span> {fmtNum(cost)}
                    </>
                  )}
                </div>
                <button
                  className="upgrade-buy-btn"
                  disabled={maxed || !canAfford}
                  onClick={() => onBuy(cfg.key)}
                >
                  {maxed ? "✓" : "Buy"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}