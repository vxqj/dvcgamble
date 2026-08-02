"use client";

import { useState } from "react";
import { TITLES } from "../lib/config";
import { unlockedTitleKeys, titleDisplay } from "../lib/engine";

// `discoveredCards` and `equippedTitle` come straight from game state.
// `isAdmin` is the server-verified flag from fetchMeFull (see page.js) —
// required for adminOnly titles to ever show as unlocked, same trust rule
// as every other admin-gated thing in the app (never a client-side guess).
// `onEquip(titleKey | null)` writes the choice back into state — passing
// null unequips whatever's currently worn.
export default function TitlesTab({ discoveredCards, equippedTitle, isAdmin, onEquip }) {
  const [sub, setSub] = useState("all"); // "all" | "owned"

  const unlocked = new Set(unlockedTitleKeys(discoveredCards, isAdmin));
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
            const display = titleDisplay(t);
            if (!display) return null;
            const have = unlocked.has(t.key);
            const isEquipped = equippedTitle === t.key;
            const cardStyle = have && display.gradient
              ? { "--rarity-border-gradient": display.gradient }
              : have
              ? { "--rarity-glow": display.color }
              : undefined;
            const tagStyle = display.gradient ? { "--rarity-gradient": display.gradient } : { color: display.color };

            return (
              <div
                key={t.key}
                className={`title-card${have ? " have" : ""}${have && display.gradient ? " prismatic-border" : ""}`}
                style={cardStyle}
              >
                <div className={`title-tag${display.gradient ? " gradient-text" : ""}`} style={tagStyle}>
                  [{t.key}]
                </div>
                <div className="title-name">{display.label}</div>
                <div className="title-desc">{display.description}</div>
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