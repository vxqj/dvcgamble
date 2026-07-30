"use client";

import { useState } from "react";
import { PACKS } from "../lib/config";
import { fmtNum } from "../lib/engine";
import { PackIcon } from "./Icons";

const QUANTITY_OPTIONS = [1, 10, 50, 100, "max"];

export default function ShopTab({ coins, onBuy }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div>
      <div className="section-title">SHOP <div className="line" /></div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {QUANTITY_OPTIONS.map((opt) => {
          const active = quantity === opt;
          return (
            <button
              key={opt}
              onClick={() => setQuantity(opt)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: active ? "1px solid var(--accent, #f2c14e)" : "1px solid rgba(255,255,255,0.1)",
                background: active ? "rgba(242,193,78,0.14)" : "rgba(255,255,255,0.03)",
                color: active ? "var(--accent, #f2c14e)" : "var(--muted-2)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {opt === "max" ? "Max" : `${opt}x`}
            </button>
          );
        })}
      </div>

      <div className="pack-grid">
        {PACKS.map((pack) => {
          const accent = pack.accent || "#f2c14e";
          const affordableMax = Math.floor(coins / pack.cost);
          const qty = quantity === "max" ? affordableMax : quantity;
          const totalCost = pack.cost * qty;
          const canAfford = qty > 0 && coins >= totalCost;

          let buyLabel;
          if (!canAfford) {
            buyLabel = "Need coins";
          } else if (qty === 1) {
            buyLabel = "Buy";
          } else {
            buyLabel = `Buy ${fmtNum(qty)}x`;
          }

          return (
            <div className="pack-card" key={pack.key} style={{ "--accent": accent }}>
              <div className="pack-art">
                <div className="pack-glow" />
                <PackIcon icon={pack.icon} className="pack-icon-svg" />
              </div>
              <div className="pack-title">{pack.label}</div>
              <div className="pack-desc">{pack.description}</div>
              <div className="pack-tags">
                <span className="pack-tag">{pack.cardsPerPack} cards</span>
                {pack.guaranteeRarity && (
                  <span className="pack-tag">guaranteed {pack.guaranteeRarity}+</span>
                )}
              </div>
              <div className="pack-buy-row">
                <div className="pack-cost">
                  <span>🪙</span>
                  {fmtNum(totalCost)}
                </div>
                <button
                  className="buy-btn"
                  disabled={!canAfford}
                  onClick={() => onBuy(pack, qty)}
                >
                  {buyLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
