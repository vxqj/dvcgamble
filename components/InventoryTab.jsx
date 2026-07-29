"use client";

import { useState } from "react";
import { PACKS, RARITIES, CARDS } from "../lib/config";
import {
  fmtChance,
  fmtNum,
  totalEffectiveWeight,
  effectiveWeightFor,
  multiOpenCount,
  computeSellSummary,
} from "../lib/engine";
import { TrashIcon, PackIcon } from "./Icons";

export default function InventoryTab({
  packsOwned, cards, upgrades, onOpenPack, onSellCards,
  autoOpenPackKey, onAutoOpenPack, onCancelAutoOpen,
}) {
  const [sub, setSub] = useState("packs");
  const openBatch = multiOpenCount(upgrades ? upgrades.multiOpen : 0);

  const ownedPackEntries = PACKS.filter((p) => (packsOwned[p.key] || 0) > 0);
  const cardNames = Object.keys(cards).filter((n) => cards[n] > 0);

  const nameToRarity = {};
  RARITIES.forEach((r) => {
    (CARDS[r.key] || []).forEach((n) => {
      nameToRarity[n] = r;
    });
  });
  const byRarity = {};
  cardNames.forEach((n) => {
    const r = nameToRarity[n] || RARITIES[RARITIES.length - 1];
    if (!byRarity[r.key]) byRarity[r.key] = { rarity: r, items: [] };
    byRarity[r.key].items.push(n);
  });

  return (
    <div>
      <div className="section-title">INVENTORY <div className="line" /></div>
      <div className="inv-tabs">
        <button className={`inv-subtab${sub === "packs" ? " active" : ""}`} onClick={() => setSub("packs")}>
          Packs ({Object.values(packsOwned).reduce((a, b) => a + b, 0)})
        </button>
        <button className={`inv-subtab${sub === "cards" ? " active" : ""}`} onClick={() => setSub("cards")}>
          Cards ({cardNames.length})
        </button>
        <button className={`inv-subtab${sub === "collection" ? " active" : ""}`} onClick={() => setSub("collection")}>
          Collection
        </button>
        <button className={`inv-subtab${sub === "odds" ? " active" : ""}`} onClick={() => setSub("odds")}>
          Odds
        </button>
      </div>

      {sub === "packs" && (
        ownedPackEntries.length === 0 ? (
          <div className="inv-empty">No packs yet — head to the Shop and buy one.</div>
        ) : (
          <div className="owned-pack-grid">
            {ownedPackEntries.map((pack) => {
              const owned = packsOwned[pack.key] || 0;
              const openCount = Math.min(openBatch, owned);
              const isAutoActive = autoOpenPackKey === pack.key;
              // Only one open flow (manual or auto) runs at a time — lock
              // every other pack's buttons while a different one is auto-opening.
              const lockedByOtherAuto = !!autoOpenPackKey && !isAutoActive;
              return (
                <div className="owned-pack" key={pack.key} style={{ "--accent": pack.accent }}>
                  <div className="pack-art" style={{ height: 84, width: "100%" }}>
                    <PackIcon icon={pack.icon} className="pack-icon-svg small" />
                  </div>
                  <div className="pack-title" style={{ fontSize: 14 }}>{pack.label}</div>
                  <div className="count-badge">x{owned}</div>
                  <div className="pack-actions">
                    <button className="open-btn" onClick={() => onOpenPack(pack)} disabled={isAutoActive || lockedByOtherAuto}>
                      {openCount > 1 ? `Open x${openCount}` : "Open"}
                    </button>
                    {onAutoOpenPack && (
                      <button
                        className={`auto-open-btn${isAutoActive ? " active" : ""}`}
                        disabled={lockedByOtherAuto}
                        onClick={() => (isAutoActive ? onCancelAutoOpen() : onAutoOpenPack(pack))}
                      >
                        {isAutoActive && <span className="auto-open-dot" />}
                        {isAutoActive ? "Stop Auto" : "Auto Open"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {sub === "cards" && (
        <CardsView byRarity={byRarity} cards={cards} cardNames={cardNames} onSellCards={onSellCards} />
      )}

      {sub === "collection" && <CollectionView cards={cards} />}

      {sub === "odds" && <OddsTable />}
    </div>
  );
}

/* --------------------------------------------------------------------------
   CARDS VIEW — owned cards, plus sell mode
   Tap "Sell" to enter select mode. A checkbox appears next to each rarity
   group; checking it stages EVERY card (all copies) you own in that rarity
   for sale. A bar slides up from the bottom showing the running total —
   confirm to cash it all in at once.
   -------------------------------------------------------------------------- */
function CardsView({ byRarity, cards, cardNames, onSellCards }) {
  const [sellMode, setSellMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const sellableRarityKeys = RARITIES.filter((r) => byRarity[r.key]).map((r) => r.key);
  const { coins: sellCoins, count: sellCount } = computeSellSummary(cards, Array.from(selected));
  const barOpen = sellMode && selected.size > 0;

  function toggleSellMode() {
    setSellMode((v) => !v);
    setSelected(new Set());
  }

  function toggleRarity(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleConfirmSell() {
    if (sellCount === 0) return;
    onSellCards(Array.from(selected));
    setSelected(new Set());
  }

  if (cardNames.length === 0) {
    return <div className="inv-empty">Nothing unboxed yet — open a pack to start your collection.</div>;
  }

  return (
    <div>
      <div className="inv-toolbar">
        <button
          className={`sell-toggle-btn${sellMode ? " active" : ""}`}
          onClick={toggleSellMode}
          disabled={sellableRarityKeys.length === 0}
        >
          <TrashIcon className="sell-toggle-icon" />
          {sellMode ? "Cancel" : "Sell"}
        </button>
      </div>

      <div>
        {RARITIES.filter((r) => byRarity[r.key]).map((r) => {
          const isSelected = selected.has(r.key);
          const titleStyle = r.gradient ? { "--rarity-gradient": r.gradient } : { color: r.color };
          return (
            <div className={`inv-group${isSelected ? " sell-selected" : ""}`} key={r.key}>
              <div className={`inv-group-title${r.gradient ? " gradient-text" : ""}`} style={titleStyle}>
                {sellMode && (
                  <input
                    type="checkbox"
                    className="sell-checkbox"
                    checked={isSelected}
                    onChange={() => toggleRarity(r.key)}
                    aria-label={`Select all ${r.label} cards to sell`}
                  />
                )}
                {r.label} <span className="inv-group-count">({byRarity[r.key].items.length})</span>
              </div>
              <div className="inv-grid">
                {byRarity[r.key].items.map((name) => (
                  <div className="inv-item" key={name}>
                    <div className="inv-item-name">{name}</div>
                    <div className="inv-item-count">x{cards[name]}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`sell-bar${barOpen ? " show" : ""}`}>
        <div className="sell-bar-info">
          <div className="sell-bar-count">{fmtNum(sellCount)} card{sellCount === 1 ? "" : "s"}</div>
          <div className="sell-bar-coins"><span>🪙</span>{fmtNum(sellCoins)}</div>
        </div>
        <div className="sell-bar-actions">
          <button className="sell-bar-cancel" onClick={() => setSelected(new Set())}>Clear</button>
          <button className="sell-bar-confirm" onClick={handleConfirmSell}>Sell</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   COLLECTION / DEX VIEW — every card that can exist, from lib/config.js.
   Owned cards show their name, count, and rarity color; anything you
   haven't pulled yet shows as "???" so it stays a chase, not a spoiler.
   -------------------------------------------------------------------------- */
function CollectionView({ cards }) {
  const totalCards = RARITIES.reduce((sum, r) => sum + (CARDS[r.key] || []).length, 0);
  const totalOwned = RARITIES.reduce(
    (sum, r) => sum + (CARDS[r.key] || []).filter((n) => (cards[n] || 0) > 0).length,
    0
  );
  const pct = totalCards === 0 ? 0 : (totalOwned / totalCards) * 100;

  return (
    <div>
      <div className="dex-progress">
        <div className="dex-progress-label">{totalOwned} / {totalCards} discovered</div>
        <div className="dex-progress-bar">
          <div className="dex-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {RARITIES.map((r) => {
        const list = CARDS[r.key] || [];
        if (list.length === 0) return null;
        const owned = list.filter((n) => (cards[n] || 0) > 0).length;
        const titleStyle = r.gradient ? { "--rarity-gradient": r.gradient } : { color: r.color };
        return (
          <div className="inv-group" key={r.key}>
            <div className={`inv-group-title${r.gradient ? " gradient-text" : ""}`} style={titleStyle}>
              {r.label} <span className="inv-group-count">({owned}/{list.length})</span>
            </div>
            <div className="dex-grid">
              {list.map((name) => {
                const have = (cards[name] || 0) > 0;
                const itemStyle = have && r.gradient
                  ? { "--rarity-border-gradient": r.gradient }
                  : have ? { borderColor: r.color } : undefined;
                const nameStyle = have && r.gradient ? { "--rarity-gradient": r.gradient } : undefined;
                return (
                  <div
                    className={`dex-item${have ? " have" : ""}${have && r.gradient ? " prismatic-border" : ""}`}
                    key={name}
                    style={itemStyle}
                  >
                    <div className={`dex-item-name${have && r.gradient ? " gradient-text" : ""}`} style={nameStyle}>
                      {have ? name : "???"}
                    </div>
                    {have && <div className="dex-item-count">x{cards[name]}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OddsTable() {
  // Odds shown here are base odds (Starter Pack, no rarity multipliers).
  const basePack = PACKS[0];
  const total = totalEffectiveWeight(basePack);
  return (
    <div className="rarity-list">
      {RARITIES.map((r) => {
        const w = effectiveWeightFor(r, basePack);
        const count = (CARDS[r.key] || []).length;
        const nameStyle = r.gradient ? { "--rarity-gradient": r.gradient } : { color: r.color };
        return (
          <div className="rarity-row-head" key={r.key}>
            <div className="chip" style={{ background: r.gradient || r.color }} />
            <div className={`rname${r.gradient ? " gradient-text" : ""}`} style={nameStyle}>{r.label}</div>
            <div className="rbar">
              <div className="rbar-fill" style={{ width: `${Math.max(0.4, (w / total) * 100)}%`, background: r.gradient || r.color }} />
            </div>
            <div className="rchance">{fmtChance(w, total)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-2)", width: 70, textAlign: "right" }}>
              {count} card{count === 1 ? "" : "s"}
            </div>
          </div>
        );
      })}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--muted-2)", marginTop: 6 }}>
        Odds shown are for the Starter Pack. Other packs shift these — see their tags in the Shop.
      </div>
    </div>
  );
}

export function fmtCount(n) {
  return fmtNum(n);
}