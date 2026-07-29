"use client";

import { PACKS } from "../lib/config";
import { fmtNum } from "../lib/engine";
import { PackIcon } from "./Icons";

export default function ShopTab({ coins, onBuy }) {
  return (
    <div>
      <div className="section-title">SHOP <div className="line" /></div>
      <div className="pack-grid">
        {PACKS.map((pack) => {
          const canAfford = coins >= pack.cost;
          const accent = pack.accent || "#f2c14e";
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
                  {fmtNum(pack.cost)}
                </div>
                <button className="buy-btn" disabled={!canAfford} onClick={() => onBuy(pack)}>
                  {canAfford ? "Buy" : "Need coins"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
