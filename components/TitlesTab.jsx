"use client";

import { useState } from "react";
import { TITLES, RARITIES } from "../lib/config";
import { unlockedTitleKeys } from "../lib/engine";

function rarityFor(rarityKey) {
  return RARITIES.find((r) => r.key === rarityKey);
}

// `discoveredCards` and `equippedTitle` come straight from game state.
// `onEquip(titleKey | null)` writes the choice back into state — passing
// null unequips whatever's currently worn.
export default function TitlesTab({ discoveredCards, equippedTitle, onEquip }) {
  const [sub, setSub] = useState("all"); // "all" | "owned"

  const unlocked = new Set(unlockedTitleKeys(discoveredCards));
  const list = sub === "owned" ? TITLES.filter((t) => unlocked.has(t.key)) : TITLES;

  return (
    <div>
      <div className="section-title">TITLES <div className="line" /></div>

      <div className="inv-tabs">
        <button className={`inv-subtab${sub === "all" ? " active" : ""}`} onClick={() => setSub("all")}>
          Titles
        </button>
        <button className={`inv-subtab${sub === "owned" ? " active" : ""}`} onClick={() => setSub("owned")}>
          Owned Titles ({unlocked.size})
        </button>
      </div>

      {sub === "owned" && unlocked.size === 0 ? (
        <div className="inv-empty">
          No titles unlocked yet — hatch a rare card to earn your first one. Check the Titles tab to see what each one needs.
        </div>
      ) : (
        <div className="title-grid">
          {list.map((t) => {
            const rarity = rarityFor(t.rarityKey);
            if (!rarity) return null;
            const have = unlocked.has(t.key);
            const isEquipped = equippedTitle === t.key;
            const cardStyle = have && rarity.gradient
              ? { "--rarity-border-gradient": rarity.gradient }
              : have
              ? { "--rarity-glow": rarity.color }
              : undefined;
            const tagStyle = rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: rarity.color };

            return (
              <div
                key={t.key}
                className={`title-card${have ? " have" : ""}${have && rarity.gradient ? " prismatic-border" : ""}`}
                style={cardStyle}
              >
                <div className={`title-tag${rarity.gradient ? " gradient-text" : ""}`} style={tagStyle}>
                  [{t.key}]
                </div>
                <div className="title-name">{rarity.label}</div>
                <div className="title-desc">Hatch a {rarity.label} card to unlock.</div>
                {have ? (
                  <button
                    className={`title-equip-btn${isEquipped ? " equipped" : ""}`}
                    onClick={() => onEquip(isEquipped ? null : t.key)}
                  >
                    {isEquipped ? "Equipped ✓" : "Equip"}
                  </button>
                ) : (
                  <div className="title-locked">Locked</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
