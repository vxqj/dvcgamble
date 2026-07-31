"use client";

import { useEffect, useRef, useState } from "react";
import { RARITIES, AUCTION_CONFIG } from "../lib/config";
import { fetchAuctions, createAuction, placeBid, depositToWallet, withdrawFromWallet } from "../lib/authClient";
import CreateAuctionModal from "./CreateAuctionModal";
import AuctionDetailModal from "./AuctionDetailModal";
import { GavelIcon } from "./Icons";

const RARITY_MAP = {};
RARITIES.forEach((r) => {
  RARITY_MAP[r.key] = r;
});

const LIST_POLL_MS = 8000;

function formatRemaining(ms) {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function AuctionTab({
  session, wallet, onWalletChange, onCoinsSynced, coins, cards, cardSerials, onAuctionCreated,
}) {
  const [auctions, setAuctions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [detailAuction, setDetailAuction] = useState(null);
  const [bidBusy, setBidBusy] = useState(false);
  const [bidError, setBidError] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState("");
  // Every fetchAuctions() call (poll or manual refresh) gets a ticket. If
  // responses come back out of order — e.g. a poll that started BEFORE a
  // create/bid resolves AFTER the manual post-action refresh — the older
  // one is discarded instead of stomping the fresher list. Without this,
  // a just-created auction can appear then immediately vanish again until
  // the next poll cycle catches up.
  const fetchSeqRef = useRef(0);

  function refreshAuctions() {
    const seq = ++fetchSeqRef.current;
    fetchAuctions().then((list) => {
      if (seq === fetchSeqRef.current) setAuctions(list);
    });
  }

  useEffect(() => {
    refreshAuctions();
    const poll = setInterval(refreshAuctions, LIST_POLL_MS);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keep the open detail modal's data fresh against the latest poll —
  // otherwise its bid history/current price would freeze the moment you
  // open it, even while other players keep bidding.
  useEffect(() => {
    if (!detailAuction) return;
    const fresh = auctions.find((a) => a.id === detailAuction.id);
    if (fresh) setDetailAuction(fresh);
  }, [auctions]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate({ cardName, rarityKey, serial, startingPrice, durationSeconds }) {
    if (!session || !session.token) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      await createAuction(session.token, { cardName, rarityKey, serial, startingPrice, durationSeconds });
      // Mirror the removal locally right away — the server already
      // decremented the card, and without this the next routine autosave
      // would push the client's stale (still-owning-it) count back up and
      // silently undo the listing's card removal.
      onAuctionCreated({ cardName, serial });
      setCreateOpen(false);
      refreshAuctions();
    } catch (e) {
      setCreateError(e.message || "Could not create auction");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleBid(amount) {
    if (!session || !session.token || !detailAuction) return;
    setBidBusy(true);
    setBidError("");
    try {
      await placeBid(session.token, { auctionId: detailAuction.id, amount });
      onWalletChange();
      refreshAuctions();
    } catch (e) {
      setBidError(e.message || "Bid failed");
    } finally {
      setBidBusy(false);
    }
  }

  async function handleDeposit() {
    const amt = Math.floor(Number(depositAmount));
    if (!Number.isFinite(amt) || amt <= 0) return;
    setWalletBusy(true);
    setWalletError("");
    try {
      const res = await depositToWallet(session.token, amt);
      setDepositAmount("");
      onWalletChange();
      // Adopt the server's authoritative post-deposit coins figure rather
      // than subtracting locally — this is what actually fixes the
      // deposit-doesn't-remove-coins bug, since a stale autosave landing
      // around the same time can no longer win with a guessed number.
      // Guarded because a missing/undefined onCoinsSynced prop should
      // degrade to "coins just won't sync instantly" rather than a hard
      // crash that blanks the whole tab — that's exactly what happened
      // when this prop briefly got dropped from page.js.
      if (res && res.coins != null && typeof onCoinsSynced === "function") onCoinsSynced(res.coins);
    } catch (e) {
      setWalletError(e.message || "Deposit failed");
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleWithdraw() {
    const amt = Math.floor(Number(depositAmount));
    if (!Number.isFinite(amt) || amt <= 0) return;
    setWalletBusy(true);
    setWalletError("");
    try {
      const res = await withdrawFromWallet(session.token, amt);
      setDepositAmount("");
      onWalletChange();
      if (res && res.coins != null && typeof onCoinsSynced === "function") onCoinsSynced(res.coins);
    } catch (e) {
      setWalletError(e.message || "Withdraw failed");
    } finally {
      setWalletBusy(false);
    }
  }

  const loggedIn = !!(session && session.token);

  return (
    <div>
      <AuctionTabStyles />
      <div className="section-title">AUCTION <div className="line" /></div>

      {!loggedIn ? (
        <div className="evt-login-hint" style={{ marginBottom: 20 }}>
          Sign up or log in to bid or list a card for auction.
        </div>
      ) : (
        <div className="auc-wallet-bar">
          <div className="auc-wallet-balance">
            <span className="auc-wallet-label">Auction wallet</span>
            <span className="auc-wallet-value">🪙 {wallet.toLocaleString("en-US")}</span>
          </div>
          <input
            className="auth-input"
            type="number"
            placeholder="Amount"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            style={{ maxWidth: 130, marginBottom: 0 }}
          />
          <button className="auc-wallet-btn" onClick={handleDeposit} disabled={walletBusy}>
            Deposit
          </button>
          <button className="auc-wallet-btn secondary" onClick={handleWithdraw} disabled={walletBusy}>
            Withdraw
          </button>
          <button className="auc-create-btn" onClick={() => setCreateOpen(true)}>
            <GavelIcon style={{ width: 15, height: 15 }} />
            Create Auction
          </button>
        </div>
      )}
      {walletError && <div className="auth-error" style={{ marginBottom: 14 }}>{walletError}</div>}
      <div className="auc-wallet-note">
        Spendable coins: 🪙 {coins.toLocaleString("en-US")} — deposit some into your auction wallet to bid.
        Bidding always uses the wallet balance above, never your spendable coins directly.
      </div>

      {auctions.length === 0 ? (
        <div className="inv-empty" style={{ marginTop: 24 }}>No active auctions right now.</div>
      ) : (
        <div className="pack-grid" style={{ marginTop: 24 }}>
          {auctions.map((a) => {
            const rarity = RARITY_MAP[a.rarityKey] || RARITIES[RARITIES.length - 1];
            const remaining = new Date(a.endsAt).getTime() - now;
            const displayPrice = a.currentBid != null ? a.currentBid : a.startingPrice;
            const bids = a.bids || [];
            return (
              <div
                className="pack-card"
                key={a.id}
                style={{ "--accent": rarity.color, cursor: "pointer" }}
                onClick={() => setDetailAuction(a)}
              >
                <div className="pack-art">
                  <div className="pack-glow" />
                  <div
                    className="auc-card-swatch"
                    style={{ background: rarity.gradient || rarity.color }}
                  />
                </div>
                <div className="pack-title">
                  {a.cardName}
                  {a.serial != null && <span className="auc-card-serial"> #{a.serial}</span>}
                </div>
                <div className="pack-desc">{rarity.label} · listed by {a.sellerUsername}</div>
                <div className="pack-tags">
                  <span className="pack-tag">{bids.length} bid{bids.length === 1 ? "" : "s"}</span>
                  <span className={`pack-tag${remaining < 60000 ? " auc-urgent-tag" : ""}`}>
                    {formatRemaining(remaining)}
                  </span>
                </div>
                <div className="pack-buy-row">
                  <div className="pack-cost">
                    <span>🪙</span>
                    {displayPrice.toLocaleString("en-US")}
                  </div>
                  <button className="buy-btn" onClick={() => setDetailAuction(a)}>
                    {a.currentBid != null ? "Bid" : "Open"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateAuctionModal
          cards={cards}
          cardSerials={cardSerials}
          onClose={() => {
            setCreateOpen(false);
            setCreateError("");
          }}
          onCreate={handleCreate}
          busy={createBusy}
          error={createError}
        />
      )}

      {detailAuction && (
        <AuctionDetailModal
          auction={detailAuction}
          wallet={wallet}
          myUsername={session ? session.username : null}
          onClose={() => {
            setDetailAuction(null);
            setBidError("");
          }}
          onBid={handleBid}
          busy={bidBusy}
          error={bidError}
        />
      )}
    </div>
  );
}

function AuctionTabStyles() {
  return (
    <style>{`
      .auc-wallet-bar {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        padding: 14px 16px; border-radius: 12px;
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 10px;
      }
      .auc-wallet-balance { display: flex; flex-direction: column; margin-right: 8px; }
      .auc-wallet-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-2); }
      .auc-wallet-value { font-weight: 800; font-size: 17px; color: #fff; }
      .auc-wallet-btn {
        padding: 9px 14px; border-radius: 8px; border: 1px solid var(--accent, #f2c14e);
        background: rgba(242,193,78,0.12); color: var(--accent, #f2c14e);
        font-family: var(--font-mono); font-weight: 700; font-size: 12px; cursor: pointer;
      }
      .auc-wallet-btn.secondary { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); color: var(--muted-2); }
      .auc-wallet-btn:disabled { opacity: 0.5; cursor: default; }
      .auc-create-btn {
        margin-left: auto; display: flex; align-items: center; gap: 6px;
        padding: 9px 16px; border-radius: 8px; border: 1px solid #a855f7;
        background: rgba(168,85,247,0.14); color: #c9a7ff;
        font-family: var(--font-mono); font-weight: 700; font-size: 12px; cursor: pointer;
      }
      .auc-wallet-note {
        font-family: var(--font-mono); font-size: 11px; color: var(--muted-2);
        margin-bottom: 8px;
      }
      .auc-card-swatch { width: 46px; height: 46px; border-radius: 10px; }
      .auc-card-serial { font-family: var(--font-mono); font-size: 11px; color: var(--muted-2); }
      .auc-urgent-tag { color: #ff5c5c !important; border-color: rgba(255,92,92,0.35) !important; }
    `}</style>
  );
}