"use client";

import { useEffect, useState } from "react";
import { PACKS, RARITIES, CARDS } from "../lib/config";
import {
  fmtChance,
  fmtNum,
  totalEffectiveWeight,
  effectiveWeightFor,
  multiOpenCount,
  computeSellSummary,
  isSerializedRarity,
} from "../lib/engine";
import { fetchCardCounts, getCachedCount } from "../lib/cardStats";
import { TrashIcon, PackIcon } from "./Icons";
import CardDetailModal from "./CardDetailModal";

export default function InventoryTab({
  packsOwned, cards, cardSerials, discoveredCards, upgrades, onOpenPack, onSellCards,
  autoOpenPackKey, onAutoOpenPack, onCancelAutoOpen,
}) {
  const [sub, setSub] = useState("packs");
  // { name, rarity, ownedCount, serials, discovered } | null — shared by
  // both the Cards view and the Collection/Dex view, so only one detail
  // modal can ever be open at a time regardless of which sub-tab it was
  // opened from.
  const [detailCard, setDetailCard] = useState(null);
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
        <CardsView
          byRarity={byRarity}
          cards={cards}
          cardSerials={cardSerials}
          cardNames={cardNames}
          onSellCards={onSellCards}
          onOpenDetail={setDetailCard}
        />
      )}

      {sub === "collection" && (
        <CollectionView
          cards={cards}
          cardSerials={cardSerials}
          discoveredCards={discoveredCards}
          onOpenDetail={setDetailCard}
        />
      )}

      {sub === "odds" && <OddsTable />}

      {detailCard && (
        <CardDetailModal
          name={detailCard.name}
          rarity={detailCard.rarity}
          ownedCount={detailCard.ownedCount}
          serials={detailCard.serials}
          discovered={detailCard.discovered}
          onClose={() => setDetailCard(null)}
        />
      )}
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
function CardsView({ byRarity, cards, cardSerials, cardNames, onSellCards, onOpenDetail }) {
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
                  <InventoryCardItem
                    key={name}
                    name={name}
                    ownedCount={cards[name]}
                    rarity={r}
                    serials={cardSerials ? cardSerials[name] : null}
                    onClick={
                      sellMode
                        ? undefined
                        : () =>
                            onOpenDetail({
                              name,
                              rarity: r,
                              ownedCount: cards[name],
                              serials: cardSerials ? cardSerials[name] : null,
                              discovered: true,
                            })
                    }
                  />
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
   Single owned-card tile.
   - Non-serialized rarity: shows "xN" like before. Hover shows a tooltip
     with the card's GLOBAL exist count (fetched lazily on first hover,
     cached after that — see lib/cardStats.js).
   - Serialized rarity: instead of "xN", shows one small badge per owned
     copy with its permanent serial (#12, #47, ...) printed right on the
     card, no hover needed. Hovering still shows the exist-count tooltip
     too, for consistency.
   -------------------------------------------------------------------------- */
function InventoryCardItem({ name, ownedCount, rarity, serials, onClick }) {
  const [hover, setHover] = useState(false);
  const [count, setCount] = useState(() => getCachedCount(name));

  useEffect(() => {
    if (!hover || count != null) return;
    let cancelled = false;
    fetchCardCounts([name]).then((res) => {
      if (!cancelled && res[name] != null) setCount(res[name]);
    });
    return () => {
      cancelled = true;
    };
  }, [hover, name, count]);

  const showSerials = isSerializedRarity(rarity) && serials && serials.length > 0;

  return (
    <div
      className="inv-item"
      style={{ position: "relative", cursor: onClick ? "pointer" : undefined }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="inv-item-name">{name}</div>
      {showSerials ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
          {serials
            .slice()
            .sort((a, b) => a - b)
            .map((s) => (
              <span
                key={s}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 800,
                  color: rarity.color,
                  border: `1px solid ${rarity.color}66`,
                  background: `${rarity.color}14`,
                  borderRadius: 6,
                  padding: "1px 6px",
                  lineHeight: 1.5,
                }}
              >
                #{s}
              </span>
            ))}
        </div>
      ) : (
        <div className="inv-item-count">x{ownedCount}</div>
      )}
      {hover && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 6,
            padding: "5px 9px",
            borderRadius: 8,
            background: "rgba(10,10,14,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "#fff",
            whiteSpace: "nowrap",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {count != null ? `${fmtNum(count)} exist` : "loading..."}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   COLLECTION / DEX VIEW — every card that can exist, from lib/config.js.
   Owned cards show their name, count, and rarity color; anything you
   haven't pulled yet shows as "???" so it stays a chase, not a spoiler.
   -------------------------------------------------------------------------- */
function CollectionView({ cards, cardSerials, discoveredCards, onOpenDetail }) {
  // Fall back to owned-count if discoveredCards hasn't been wired up yet
  // upstream (e.g. mid-deploy, or an old save that predates the field) —
  // this keeps the tab from breaking, it just reverts to the old (buggy)
  // behavior until the caller passes discoveredCards through.
  const discovered = discoveredCards || cards;

  const totalCards = RARITIES.reduce((sum, r) => sum + (CARDS[r.key] || []).length, 0);
  const totalOwned = RARITIES.reduce(
    (sum, r) => sum + (CARDS[r.key] || []).filter((n) => !!discovered[n]).length,
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
        const owned = list.filter((n) => !!discovered[n]).length;
        const titleStyle = r.gradient ? { "--rarity-gradient": r.gradient } : { color: r.color };
        return (
          <div className="inv-group" key={r.key}>
            <div className={`inv-group-title${r.gradient ? " gradient-text" : ""}`} style={titleStyle}>
              {r.label} <span className="inv-group-count">({owned}/{list.length})</span>
            </div>
            <div className="dex-grid">
              {list.map((name) => {
                const have = !!discovered[name];
                const itemStyle = have && r.gradient
                  ? { "--rarity-border-gradient": r.gradient }
                  : have ? { borderColor: r.color } : undefined;
                const nameStyle = have && r.gradient ? { "--rarity-gradient": r.gradient } : undefined;
                // Current owned count (0 if sold off) — shown only when
                // still owned; a discovered-but-sold card shows its name
                // with no count, rather than reverting to "???".
                const ownedCount = cards[name] || 0;
                return (
                  <div
                    className={`dex-item${have ? " have" : ""}${have && r.gradient ? " prismatic-border" : ""}`}
                    key={name}
                    style={{ ...itemStyle, cursor: have ? "pointer" : undefined }}
                    onClick={
                      have
                        ? () =>
                            onOpenDetail({
                              name,
                              rarity: r,
                              ownedCount,
                              serials: cardSerials ? cardSerials[name] : null,
                              discovered: true,
                            })
                        : undefined
                    }
                    role={have ? "button" : undefined}
                    tabIndex={have ? 0 : undefined}
                  >
                    <div className={`dex-item-name${have && r.gradient ? " gradient-text" : ""}`} style={nameStyle}>
                      {have ? name : "???"}
                    </div>
                    {have && ownedCount > 0 && <div className="dex-item-count">x{ownedCount}</div>}
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