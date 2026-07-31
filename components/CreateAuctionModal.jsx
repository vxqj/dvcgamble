"use client";

import { useMemo, useState } from "react";
import { RARITIES, CARDS, AUCTION_CONFIG } from "../lib/config";
import { isAuctionEligible } from "../lib/engine";

export default function CreateAuctionModal({ cards, cardSerials, onClose, onCreate, busy, error }) {
  const nameToRarity = useMemo(() => {
    const map = {};
    RARITIES.forEach((r) => {
      (CARDS[r.key] || []).forEach((n) => {
        map[n] = r;
      });
    });
    return map;
  }, []);

  const options = useMemo(() => {
    return Object.keys(cards || {})
      .filter((name) => (cards[name] || 0) > 0)
      .map((name) => ({ name, rarity: nameToRarity[name] }))
      .filter((o) => o.rarity && isAuctionEligible(o.rarity.key))
      .sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity));
  }, [cards, nameToRarity]);

  const [selectedName, setSelectedName] = useState(options[0] ? options[0].name : "");
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [startingPrice, setStartingPrice] = useState("0");
  const [duration, setDuration] = useState(String(AUCTION_CONFIG.minDurationSec));

  const selected = options.find((o) => o.name === selectedName);
  const serials = selected && cardSerials ? cardSerials[selectedName] || [] : [];
  const needsSerial = selected && selected.rarity.serialsEnabled;

  function submit() {
    if (!selected) return;
    const price = Math.max(AUCTION_CONFIG.minStartingPrice, Math.min(AUCTION_CONFIG.maxBid, Math.floor(Number(startingPrice) || 0)));
    const durationSeconds = Math.max(
      AUCTION_CONFIG.minDurationSec,
      Math.min(AUCTION_CONFIG.maxDurationSec, Math.floor(Number(duration) || AUCTION_CONFIG.minDurationSec))
    );
    onCreate({
      cardName: selected.name,
      rarityKey: selected.rarity.key,
      serial: needsSerial ? selectedSerial : null,
      startingPrice: price,
      durationSeconds,
    });
  }

  return (
    <div className="modal-backdrop auth-modal-backdrop">
      <div className="auth-modal" style={{ width: "min(440px, 94vw)" }}>
        <button className="modal-close-btn" onClick={onClose} title="Close">×</button>
        <div className="auth-title">Create Auction</div>

        {options.length === 0 ? (
          <div className="auth-body">
            <div className="auth-sub">
              You don't own any cards eligible for auction yet — only cards rarer
              than {AUCTION_CONFIG.minRarityKey} can be listed.
            </div>
          </div>
        ) : (
          <div className="auth-body">
            <div className="auth-label">Card</div>
            <select
              className="auth-input"
              value={selectedName}
              onChange={(e) => {
                setSelectedName(e.target.value);
                setSelectedSerial(null);
              }}
            >
              {options.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name} ({o.rarity.label}) — you own {cards[o.name]}
                </option>
              ))}
            </select>

            {needsSerial && (
              <>
                <div className="auth-label">Which serial?</div>
                <select
                  className="auth-input"
                  value={selectedSerial != null ? selectedSerial : ""}
                  onChange={(e) => setSelectedSerial(Number(e.target.value))}
                >
                  <option value="" disabled>
                    Choose a serial...
                  </option>
                  {serials.map((s) => (
                    <option key={s} value={s}>
                      #{s}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="auth-label">Starting price (0 – {AUCTION_CONFIG.maxBid.toLocaleString("en-US")})</div>
            <input
              className="auth-input"
              type="number"
              min={AUCTION_CONFIG.minStartingPrice}
              max={AUCTION_CONFIG.maxBid}
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
            />

            <div className="auth-label">
              Duration ({Math.round(AUCTION_CONFIG.minDurationSec / 60)}–{Math.round(AUCTION_CONFIG.maxDurationSec / 60)} minutes)
            </div>
            <input
              className="auth-input"
              type="range"
              min={AUCTION_CONFIG.minDurationSec}
              max={AUCTION_CONFIG.maxDurationSec}
              step={60}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <div className="auth-sub" style={{ marginTop: -6, marginBottom: 14 }}>
              {Math.round(Number(duration) / 60)} minutes
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit-btn"
              onClick={submit}
              disabled={busy || (needsSerial && selectedSerial == null)}
            >
              {busy ? "Creating..." : "Create Auction"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}