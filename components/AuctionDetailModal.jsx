"use client";

import { useEffect, useState } from "react";
import { RARITIES, AUCTION_CONFIG } from "../lib/config";

function rarityLookup() {
  const map = {};
  RARITIES.forEach((r) => {
    map[r.key] = r;
  });
  return map;
}
const RARITY_MAP = rarityLookup();

function formatRemaining(ms) {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  if (h > 0) return `${h}h ${mm}m ${ss}s`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

export default function AuctionDetailModal({ auction, wallet, myUsername, onClose, onBid, busy, error }) {
  const [now, setNow] = useState(Date.now());
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rarity = RARITY_MAP[auction.rarityKey] || RARITIES[RARITIES.length - 1];
  const remaining = new Date(auction.endsAt).getTime() - now;
  const ended = remaining <= 0;
  const minNext = auction.currentBid != null ? auction.currentBid + 1 : auction.startingPrice;
  const isSeller = myUsername && auction.sellerUsername === myUsername;
  const canBid = !ended && !isSeller;
  const winningBid = auction.bids.find((b) => b.amount === auction.currentBid);

  const labelStyle = rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: rarity.color };

  function submit() {
    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt)) return;
    onBid(amt);
  }

  return (
    <div className="modal-backdrop auth-modal-backdrop">
      <AuctionDetailStyles />
      <div className="ad-modal" style={{ borderColor: rarity.color }}>
        <button className="modal-close-btn" onClick={onClose} title="Close">×</button>

        <div className="ad-swatch" style={{ background: rarity.gradient || rarity.color }} />
        <div className={`ad-rarity${rarity.gradient ? " gradient-text" : ""}`} style={labelStyle}>
          {rarity.label}
        </div>
        <div className="ad-name">
          {auction.cardName}
          {auction.serial != null && <span className="ad-serial">#{auction.serial}</span>}
        </div>
        <div className="ad-seller">Listed by {auction.sellerUsername}</div>

        <div className="ad-timer-row">
          <span className={`ad-timer${ended ? " ended" : remaining < 60000 ? " urgent" : ""}`}>
            {formatRemaining(remaining)}
          </span>
        </div>

        <div className="ad-current">
          <div className="ad-current-label">{auction.currentBid != null ? "Current bid" : "Starting price"}</div>
          <div className="ad-current-value">
            🪙 {(auction.currentBid != null ? auction.currentBid : auction.startingPrice).toLocaleString("en-US")}
          </div>
        </div>

        {canBid && (
          <div className="ad-bid-form">
            <div className="auth-label">Your bid (min {minNext.toLocaleString("en-US")})</div>
            <input
              className="auth-input"
              type="number"
              min={minNext}
              max={AUCTION_CONFIG.maxBid}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(minNext)}
            />
            <div className="ad-wallet-hint">Wallet balance: 🪙 {wallet.toLocaleString("en-US")}</div>
            {error && <div className="auth-error">{error}</div>}
            <button
              className="auth-submit-btn"
              onClick={submit}
              disabled={busy || !amount || Number(amount) < minNext || Number(amount) > wallet}
            >
              {busy ? "Placing bid..." : "Place Bid"}
            </button>
          </div>
        )}
        {isSeller && !ended && (
          <div className="auth-sub" style={{ marginTop: 6 }}>This is your own auction — you can't bid on it.</div>
        )}
        {ended && (
          <div className="auth-sub" style={{ marginTop: 6 }}>
            This auction has ended{winningBid ? ` — won by ${winningBid.username}` : " with no bids"}.
          </div>
        )}

        <div className="ad-bids-section">
          <div className="ad-bids-header">Bid history ({auction.bids.length})</div>
          {auction.bids.length === 0 ? (
            <div className="ad-no-bids">No bids yet — be the first.</div>
          ) : (
            <div className="ad-bids-list">
              {auction.bids.map((b, i) => (
                <div className="ad-bid-row" key={i}>
                  <span className="ad-bid-user">{b.username}</span>
                  <span className="ad-bid-amount">🪙 {b.amount.toLocaleString("en-US")}</span>
                  <span className="ad-bid-time">{new Date(b.placedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuctionDetailStyles() {
  return (
    <style>{`
      .ad-modal {
        width: min(420px, 94vw);
        max-height: 88vh;
        overflow-y: auto;
        background: var(--surface, #16161a);
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 30px 22px 24px;
        position: relative;
        text-align: center;
      }
      .ad-swatch { width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 14px; }
      .ad-rarity { font-family: var(--font-mono); font-weight: 800; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
      .ad-name { font-weight: 800; font-size: 18px; color: #fff; margin-bottom: 2px; }
      .ad-serial { font-family: var(--font-mono); font-size: 12px; color: var(--muted-2); margin-left: 6px; }
      .ad-seller { font-family: var(--font-mono); font-size: 11.5px; color: var(--muted-2); margin-bottom: 16px; }
      .ad-timer-row { margin-bottom: 14px; }
      .ad-timer { font-family: var(--font-mono); font-weight: 800; font-size: 16px; color: #fff; padding: 6px 14px; border-radius: 8px; background: rgba(255,255,255,0.05); display: inline-block; }
      .ad-timer.urgent { color: #ff5c5c; background: rgba(255,92,92,0.12); }
      .ad-timer.ended { color: var(--muted-2); }
      .ad-current { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px; margin-bottom: 16px; }
      .ad-current-label { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-2); margin-bottom: 4px; }
      .ad-current-value { font-weight: 800; font-size: 22px; color: #fff; }
      .ad-bid-form { text-align: left; margin-bottom: 8px; }
      .ad-wallet-hint { font-family: var(--font-mono); font-size: 11px; color: var(--muted-2); margin: -6px 0 12px; }
      .ad-bids-section { text-align: left; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.07); }
      .ad-bids-header { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-2); margin-bottom: 10px; }
      .ad-no-bids { font-family: var(--font-mono); font-size: 12px; color: var(--muted-2); }
      .ad-bids-list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
      .ad-bid-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); font-size: 12px; }
      .ad-bid-user { font-weight: 700; color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ad-bid-amount { font-family: var(--font-mono); color: var(--accent, #f2c14e); font-weight: 700; }
      .ad-bid-time { font-family: var(--font-mono); font-size: 10.5px; color: var(--muted-2); }
    `}</style>
  );
}
