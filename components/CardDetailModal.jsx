"use client";

import { useEffect, useState } from "react";
import { fetchCardCounts, getCachedCount } from "../lib/cardStats";
import { isSerializedRarity } from "../lib/engine";

// Shared detail popup for a single card — opened by clicking a card in
// either the Cards view (owned copies) or the Collection/Dex view
// (discovered cards, owned or not). `ownedCount` and `serials` are the
// CURRENT numbers (0 / empty if sold off); `discovered` distinguishes
// "never pulled" from "pulled then sold", since both can show up here
// from the Dex depending on how the caller wires clicks.
export default function CardDetailModal({ name, rarity, ownedCount, serials, discovered = true, onClose }) {
  const [count, setCount] = useState(() => getCachedCount(name));

  useEffect(() => {
    if (count != null) return;
    let cancelled = false;
    fetchCardCounts([name]).then((res) => {
      if (!cancelled && res[name] != null) setCount(res[name]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const showSerials = isSerializedRarity(rarity) && serials && serials.length > 0;
  const labelStyle = rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: rarity.color };
  const swatchBg = rarity.gradient || rarity.color;
  const sortedSerials = showSerials ? serials.slice().sort((a, b) => a - b) : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <CardDetailStyles />
      <div
        className={`cd-modal${rarity.gradient ? " prismatic-border" : ""}`}
        style={{ borderColor: rarity.color, "--rarity-border-gradient": rarity.gradient }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} title="Close">×</button>

        <div className="cd-swatch" style={{ background: swatchBg }} />

        <div className={`cd-rarity${rarity.gradient ? " gradient-text" : ""}`} style={labelStyle}>
          {rarity.label}
        </div>
        <div className="cd-name">{discovered ? name : "???"}</div>

        {!discovered ? (
          <div className="cd-hint">Not discovered yet — keep opening packs.</div>
        ) : (
          <div className="cd-stats">
            <div className="cd-stat-row">
              <span className="cd-stat-label">You own</span>
              <span className="cd-stat-value">
                {ownedCount > 0 ? `x${ownedCount}` : "0 (sold)"}
              </span>
            </div>
            <div className="cd-stat-row">
              <span className="cd-stat-label">Exist worldwide</span>
              <span className="cd-stat-value">{count != null ? count.toLocaleString("en-US") : "loading..."}</span>
            </div>

            {showSerials && (
              <div className="cd-serials">
                <div className="cd-stat-label" style={{ marginBottom: 6 }}>Your serials</div>
                <div className="cd-serial-list">
                  {sortedSerials.map((s) => (
                    <span
                      key={s}
                      className="cd-serial-badge"
                      style={{ color: rarity.color, borderColor: rarity.color + "66", background: rarity.color + "14" }}
                    >
                      #{s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CardDetailStyles() {
  return (
    <style>{`
      .cd-modal {
        width: min(360px, 92vw);
        background: var(--surface, #16161a);
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 30px 22px 24px;
        position: relative;
        text-align: center;
        box-shadow: 0 24px 60px -20px rgba(0,0,0,0.65);
      }
      .cd-swatch {
        width: 64px;
        height: 64px;
        border-radius: 14px;
        margin: 0 auto 16px;
        box-shadow: 0 6px 20px -6px rgba(0,0,0,0.5);
      }
      .cd-rarity {
        font-family: var(--font-mono);
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .cd-name {
        font-weight: 800;
        font-size: 19px;
        color: #fff;
        margin-bottom: 18px;
        word-break: break-word;
      }
      .cd-hint {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--muted-2);
        padding: 10px 0 2px;
      }
      .cd-stats {
        display: flex;
        flex-direction: column;
        gap: 10px;
        text-align: left;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 14px 16px;
      }
      .cd-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 12.5px;
      }
      .cd-stat-label { color: var(--muted-2); }
      .cd-stat-value { color: #fff; font-weight: 700; }
      .cd-serials {
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.07);
      }
      .cd-serial-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .cd-serial-badge {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-weight: 800;
        border: 1px solid;
        border-radius: 6px;
        padding: 2px 7px;
        line-height: 1.5;
      }
    `}</style>
  );
}
