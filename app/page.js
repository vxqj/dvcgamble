"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import ShopTab from "../components/ShopTab";
import InventoryTab from "../components/InventoryTab";
import FeedTab from "../components/FeedTab";
import UpgradesTab from "../components/UpgradesTab";
import EventTab from "../components/EventTab";
import AuctionTab from "../components/AuctionTab";
import PackOpenModal from "../components/PackOpenModal";
import AuthModal from "../components/AuthModal";
import AdminPanel from "../components/AdminPanel";
import { ShopIcon, InventoryIcon, FeedIcon, UpgradeIcon, TrophyIcon, GavelIcon } from "../components/Icons";
import { loadState, saveState, defaultState, applyOfflineCoins } from "../lib/storage";
import { openPacks, isRarePull, multiOpenCount, upgradeCost, upgradeMaxed, effectiveCoinPerTick, computeSellSummary, unpackSpeedMultiplier, injectForcedCard } from "../lib/engine";
import { broadcastPull } from "../lib/feed";
import { startPresence } from "../lib/presence";
import { recordCardPulls } from "../lib/cardStats";
import {
  getSession,
  setSession as persistSession,
  clearSession,
  loadStateFromCloud,
  saveStateToCloud,
  beaconSave,
  submitEventEntry,
  fetchMeFull,
  fetchLuckMultiplier,
  consumeForcedPull,
  claimPendingCoins,
  fetchAuctionWallet,
  claimAuctionCards,
} from "../lib/authClient";
import { COIN_INTERVAL_MS, PACKS } from "../lib/config";

const TABS = [
  { key: "shop", label: "Shop", Icon: ShopIcon },
  { key: "inventory", label: "Inventory", Icon: InventoryIcon },
  { key: "upgrades", label: "Upgrades", Icon: UpgradeIcon },
  { key: "feed", label: "Feed", Icon: FeedIcon },
  { key: "auction", label: "Auction", Icon: GavelIcon },
  { key: "event", label: "Event", Icon: TrophyIcon },
];

// Small breather between one auto-opened batch collecting and the next one
// starting, so it reads as a sequence rather than a blur. Scaled down by the
// Quick Hands upgrade the same way the reveal pacing inside the modal is.
const BASE_AUTO_NEXT_DELAY_MS = 250;
const MIN_AUTO_NEXT_DELAY_MS = 60;

// PERF: `state` changes on every passive coin tick (COIN_INTERVAL_MS,
// default every 2s) because the coin-income effect below writes a new
// coins/lastCoinTs into state on every tick. The persist effect used to
// fire a cloud save (saveStateToCloud -> Supabase upsert, plus 2 auth
// lookups) every time `state` changed — so every logged-in player was
// hitting the DB roughly every ~2.3 seconds for their *entire* session,
// just from sitting there earning passive coins. With 60 concurrent
// players that's ~90 queries/sec of pure autosave traffic, which is what
// was actually saturating Supabase and making everything feel slow.
//
// Fix: keep the localStorage save on every change (free, local, no
// network) but throttle the *cloud* save to at most once every
// CLOUD_SAVE_MIN_INTERVAL_MS, no matter how often state changes in
// between. Meaningful actions (buying, opening packs, upgrades, selling)
// still get persisted quickly since they also trigger this same effect —
// they just won't necessarily hit the network the instant they happen if
// a cloud save already went out very recently. Tab close / hide is still
// covered separately by beaconSave below, which is NOT throttled, so
// nothing is lost when someone actually leaves.
const CLOUD_SAVE_MIN_INTERVAL_MS = 20_000;

export default function Page() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("shop");
  const [modal, setModal] = useState(null); // { pack, results, accent, openCount, auto, seq }
  const [modalHidden, setModalHidden] = useState(false);
  const [autoOpenPackKey, setAutoOpenPackKey] = useState(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [session, setLocalSession] = useState(null); // { token, username, isAdmin } | null
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [auctionWallet, setAuctionWallet] = useState(0);
  const readyRef = useRef(false);
  const modalSeqRef = useRef(0);
  const autoTimerRef = useRef(null);
  const lastCloudSaveRef = useRef(0);

  // Load + hydrate on mount. If there's an existing login session, the
  // player's cloud save is the source of truth; otherwise fall back to
  // whatever's in localStorage (guest play).
  useEffect(() => {
    const local = loadState() || defaultState();
    const caughtLocal = applyOfflineCoins(local);
    const existingSession = getSession();

    if (existingSession && existingSession.token) {
      setLocalSession(existingSession);
      // Re-verify who this token actually belongs to — AND whether it's an
      // admin account — straight from the DB, every time. This overwrites
      // anything edited in localStorage/devtools with the real username,
      // logs the session out entirely if the token turns out to be
      // invalid/expired, and means isAdmin is never trusted from whatever
      // was cached locally — a revoked admin flag stops showing the admin
      // button the very next load, not whenever localStorage happens to
      // get cleared.
      fetchMeFull(existingSession.token).then((me) => {
        if (!me) {
          clearSession();
          setLocalSession(null);
          return;
        }
        if (me.username !== existingSession.username || me.isAdmin !== !!existingSession.isAdmin) {
          const corrected = { ...existingSession, username: me.username, isAdmin: me.isAdmin };
          persistSession(corrected);
          setLocalSession(corrected);
        }
      });
      loadStateFromCloud(existingSession.token).then((cloudState) => {
        const merged = cloudState
          ? applyOfflineCoins({ ...defaultState(), ...cloudState })
          : caughtLocal;
        setState(merged);
        readyRef.current = true;
      });
    } else {
      setState(caughtLocal);
      readyRef.current = true;
    }
  }, []);

  // Passive coin income
  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const amount = effectiveCoinPerTick(prev.upgrades ? prev.upgrades.coinBoost : 0);
        return { ...prev, coins: prev.coins + amount, lastCoinTs: Date.now() };
      });
    }, COIN_INTERVAL_MS);
    return () => clearInterval(t);
  }, [!!state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on change (debounced) — always to localStorage, and also to the
  // cloud whenever a session is active, throttled to CLOUD_SAVE_MIN_INTERVAL_MS
  // (see the big comment above) so passive coin ticks don't hammer Supabase.
  useEffect(() => {
    if (!state || !readyRef.current) return;
    const t = setTimeout(() => {
      saveState(state);
      if (session && session.token) {
        const now = Date.now();
        if (now - lastCloudSaveRef.current >= CLOUD_SAVE_MIN_INTERVAL_MS) {
          lastCloudSaveRef.current = now;
          saveStateToCloud(session.token, state);
        }
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state, session]);

  // Save on tab close / hide, since the throttled/debounced save above can
  // get cut off (or simply be waiting out its throttle window) if the tab
  // closes mid-timer. sendBeacon fires reliably even as the page is
  // unloading, and intentionally ignores the cloud-save throttle above —
  // this is the "don't lose progress" guarantee, so it always fires.
  useEffect(() => {
    function saveNow() {
      if (session && session.token && state) beaconSave(session.token, state);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") saveNow();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", saveNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", saveNow);
    };
  }, [session, state]);

  // Online presence — anonymous heartbeat over the same no-backend approach
  // the feed uses, no accounts involved.
  useEffect(() => {
    const stop = startPresence(setOnlineCount);
    return stop;
  }, []);

  // Claims any coins an admin queued for this account via Give Coins. Runs
  // once as soon as a session becomes available (covers both "already
  // logged in on page load" and "just logged in this visit"), then on a
  // light recurring poll so a grant sent mid-session shows up on its own
  // rather than requiring a reload. claimPendingCoins clears it server-side
  // as it's read, so a grant is only ever applied once.
  useEffect(() => {
    if (!session || !session.token) return;
    let cancelled = false;
    function claim() {
      claimPendingCoins(session.token).then((amount) => {
        if (cancelled || !amount) return;
        setState((prev) => (prev ? { ...prev, coins: prev.coins + amount } : prev));
      });
    }
    claim();
    const t = setInterval(claim, 25000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [session]);

  // Keeps the displayed auction wallet balance current. Refreshed on
  // session change, on the same poll cadence as pending coins, and
  // on-demand via refreshWallet (passed to AuctionTab) right after a
  // deposit/withdraw/bid so the UI doesn't wait out the poll to update.
  function refreshWallet() {
    if (!session || !session.token) {
      setAuctionWallet(0);
      return;
    }
    fetchAuctionWallet(session.token).then(setAuctionWallet);
  }
  useEffect(() => {
    refreshWallet();
    if (!session || !session.token) return;
    const t = setInterval(refreshWallet, 25000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Merges in any cards this player won (or reclaimed from an unsold
  // auction of their own) since the last check. This can't be applied
  // directly server-side into player_state — see the note in
  // auction_schema_part3.sql — so instead it's queued server-side and
  // picked up here, on the same poll cadence as pending coin grants, then
  // folded into local state exactly like a normal pack pull would be.
  useEffect(() => {
    if (!session || !session.token) return;
    let cancelled = false;
    function claimCards() {
      claimAuctionCards(session.token).then((won) => {
        if (cancelled || !won || won.length === 0) return;
        setState((prev) => {
          if (!prev) return prev;
          const cards = { ...prev.cards };
          const cardSerials = { ...prev.cardSerials };
          const discoveredCards = { ...prev.discoveredCards };
          won.forEach(({ cardName, serial }) => {
            cards[cardName] = (cards[cardName] || 0) + 1;
            discoveredCards[cardName] = discoveredCards[cardName] || Date.now();
            if (serial != null) {
              cardSerials[cardName] = [...(cardSerials[cardName] || []), serial];
            }
          });
          return { ...prev, cards, cardSerials, discoveredCards };
        });
      });
    }
    claimCards();
    const t = setInterval(claimCards, 25000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [session]);

  // Clean up any pending "open the next auto batch" timer on unmount.
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  if (!state) {
    return (
      <div className="wrap">
        <div style={{ padding: "60px 0", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--muted-2)" }}>
          loading...
        </div>
      </div>
    );
  }

  function handleBuy(pack, quantity = 1) {
    setState((prev) => {
      const qty = Math.max(1, Math.floor(quantity || 1));
      const totalCost = pack.cost * qty;
      if (prev.coins < totalCost) return prev;
      return {
        ...prev,
        coins: prev.coins - totalCost,
        packs: { ...prev.packs, [pack.key]: (prev.packs[pack.key] || 0) + qty },
        totalPacksBought: prev.totalPacksBought + qty,
      };
    });
  }

  // `auto: true` marks this batch as part of an auto-open run — it skips
  // the "tap to open" screen and auto-collects instead of waiting on a click.
  async function handleOpenPack(pack, { auto = false } = {}) {
    // Only one open flow runs at a time — refuse to start a different pack
    // while another one is mid auto-open run (belt-and-braces alongside the
    // disabled buttons in InventoryTab).
    if (autoOpenPackKey && autoOpenPackKey !== pack.key) return;
    const owned = state.packs[pack.key] || 0;
    if (owned <= 0) {
      if (auto) stopAutoOpen();
      return;
    }
    const batch = multiOpenCount(state.upgrades ? state.upgrades.multiOpen : 0);
    const openCount = Math.min(batch, owned);

    // Fetched fresh right at open time rather than from a background poll,
    // so the odds always reflect whatever's actually active right now (a
    // luck event starting/ending mid-session, or an admin queuing a forced
    // pull moments ago) instead of a stale cached value. fetchLuckMultiplier
    // works with no token too, so guests still get site-wide luck events;
    // consumeForcedPull is skipped for guests since a forced pull only ever
    // targets a specific logged-in account.
    const [forced, luckMultiplier] = await Promise.all([
      session && session.token ? consumeForcedPull(session.token) : Promise.resolve(null),
      fetchLuckMultiplier(session ? session.token : null),
    ]);

    let results = openPacks(pack, openCount, luckMultiplier);
    // Swaps one random slot for the admin-forced card so it still shows up
    // inside a normal-looking pack open instead of a suspicious standalone
    // popup — see injectForcedCard in lib/engine.js.
    if (forced) results = injectForcedCard(results, forced);

    // Register every pulled card, in exact pull order, with the server —
    // it hands back each one's up-to-date global exist count. For a
    // serialized rarity that returned count IS the card's permanent
    // serial (the Nth copy of that card ever pulled by anyone), assigned
    // atomically server-side so it can never collide or be spoofed.
    const counts = await recordCardPulls(results.map((r) => r.name));
    results.forEach((r, i) => {
      r.count = counts[i] != null ? counts[i] : null;
    });

    setState((prev) => ({
      ...prev,
      packs: { ...prev.packs, [pack.key]: Math.max(0, (prev.packs[pack.key] || 0) - openCount) },
    }));
    modalSeqRef.current += 1;
    setModal({ pack, results, accent: pack.accent, openCount, auto, seq: modalSeqRef.current });
  }

  function handleAutoOpenPack(pack) {
    const owned = state.packs[pack.key] || 0;
    if (owned <= 0) return;
    setAutoOpenPackKey(pack.key);
    setModalHidden(false);
    handleOpenPack(pack, { auto: true });
  }

  function stopAutoOpen() {
    setAutoOpenPackKey(null);
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }

  function handleBuyUpgrade(key) {
    setState((prev) => {
      const level = (prev.upgrades && prev.upgrades[key]) || 0;
      if (upgradeMaxed(key, level)) return prev;
      const cost = upgradeCost(key, level);
      if (prev.coins < cost) return prev;
      return {
        ...prev,
        coins: prev.coins - cost,
        upgrades: { ...prev.upgrades, [key]: level + 1 },
      };
    });
  }

  function handleSellCards(rarityKeys) {
    setState((prev) => {
      const { coins, remainingCards } = computeSellSummary(prev.cards, rarityKeys);
      if (coins <= 0) return prev;
      return { ...prev, coins: prev.coins + coins, cards: remainingCards };
    });
  }

  // Mirrors what create_auction already did server-side (removed exactly
  // one copy of this card, and its serial if applicable) into local
  // state. Without this, the next routine autosave would push the
  // client's stale (still-owning-it) count back up and silently undo the
  // removal, letting the card exist both in the live auction AND back in
  // the seller's own inventory.
  function handleAuctionCreated({ cardName, serial }) {
    setState((prev) => {
      if (!prev) return prev;
      const cards = { ...prev.cards };
      cards[cardName] = Math.max(0, (cards[cardName] || 0) - 1);
      let cardSerials = prev.cardSerials;
      if (serial != null && prev.cardSerials && prev.cardSerials[cardName]) {
        cardSerials = {
          ...prev.cardSerials,
          [cardName]: prev.cardSerials[cardName].filter((s) => s !== serial),
        };
      }
      return { ...prev, cards, cardSerials };
    });
  }

  // Adopts the server's authoritative post-deposit/withdraw coins figure
  // (see lib/authClient.js depositToWallet/withdrawFromWallet, which now
  // return { wallet, coins } thanks to the updated deposit_to_wallet /
  // withdraw_from_wallet SQL) instead of computing a local guess. Also
  // immediately pushes this exact number to the cloud, bypassing the
  // normal CLOUD_SAVE_MIN_INTERVAL_MS throttle — that's the piece that
  // actually fixes "deposit doesn't remove coins": without it, an
  // autosave already in flight with the OLD (pre-deposit) coins number
  // could still land after this and silently overwrite the correct value.
  // Firing our own save immediately, right after, guarantees the correct
  // number is the last thing written.
  function handleCoinsSynced(newCoins) {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, coins: newCoins };
      if (session && session.token) {
        lastCloudSaveRef.current = Date.now();
        saveStateToCloud(session.token, next);
      }
      return next;
    });
  }

  function handleCollect(results) {
    const openedPack = modal ? modal.pack : null;
    const wasAuto = modal ? modal.auto : false;

    setState((prev) => {
      const cards = { ...prev.cards };
      const cardSerials = { ...prev.cardSerials };
      const discoveredCards = { ...prev.discoveredCards };
      results.forEach(({ name, rarity, count }) => {
        cards[name] = (cards[name] || 0) + 1;
        // Keep whatever's already there (don't reset a card's original
        // discovery date just because it got pulled again) — only set it
        // the first time this name has ever appeared for this player.
        discoveredCards[name] = discoveredCards[name] || Date.now();
        if (rarity.serialsEnabled && count != null) {
          cardSerials[name] = [...(cardSerials[name] || []), count];
        }
      });
      return { ...prev, cards, cardSerials, discoveredCards, totalOpened: prev.totalOpened + results.length };
    });

    const rarePulls = results.filter(({ rarity }) => isRarePull(rarity));
    rarePulls.forEach(({ rarity, name }) => {
      broadcastPull({
        rarityKey: rarity.key,
        rarityLabel: rarity.label,
        color: rarity.color,
        name,
        packLabel: openedPack ? openedPack.label : undefined,
      });
      // Event entries are only meaningful for logged-in players — there's
      // no identity to put on the podium otherwise. The server always
      // derives the username from the session token, never from anything
      // sent here.
      if (session && session.token) {
        submitEventEntry(session.token, { rarityKey: rarity.key, cardName: name });
      }
    });

    // Auto-open continuation: if this batch belongs to the active auto-open
    // run and there are still packs of that type left, queue the next one.
    // Runs out of packs → stops on its own. Cancelled mid-run → this was
    // already the last batch, so just fall through to closing the modal.
    if (wasAuto && openedPack && autoOpenPackKey === openedPack.key) {
      const remaining = Math.max(0, (state.packs[openedPack.key] || 0));
      if (remaining > 0) {
        const speedMult = unpackSpeedMultiplier(state.upgrades ? state.upgrades.unpackSpeed : 0);
        const nextDelay = Math.max(MIN_AUTO_NEXT_DELAY_MS, Math.round(BASE_AUTO_NEXT_DELAY_MS * speedMult));
        autoTimerRef.current = setTimeout(() => {
          handleOpenPack(openedPack, { auto: true });
        }, nextDelay);
        return; // keep the modal mounted — handleOpenPack swaps it in-place
      }
      stopAutoOpen();
    }
    setModal(null);
  }

  function handleHideModal() {
    setModalHidden(true);
  }

  function handleShowModal() {
    setModalHidden(false);
  }

  function handleAuthed({ token, username, state: cloudState }) {
    const nextSession = { token, username, isAdmin: false };
    persistSession(nextSession);
    setLocalSession(nextSession);
    // login()/signup() don't return isAdmin, so fetch it separately right
    // after — same server-verified path the mount-time check uses, just
    // triggered immediately instead of waiting for the next page load.
    fetchMeFull(token).then((me) => {
      if (!me) return;
      const withAdmin = { ...nextSession, isAdmin: me.isAdmin };
      persistSession(withAdmin);
      setLocalSession(withAdmin);
    });
    // Login replaces local play with that account's saved progress; signup
    // just echoes back what we already had, so this is a no-op there.
    if (cloudState) {
      setState(applyOfflineCoins({ ...defaultState(), ...cloudState }));
    }
    setAuthModalOpen(false);
  }

  function handleLogout() {
    clearSession();
    setLocalSession(null);
  }

  const autoOpenPack = autoOpenPackKey ? PACKS.find((p) => p.key === autoOpenPackKey) : null;
  const autoOpenRemaining = autoOpenPackKey ? (state.packs[autoOpenPackKey] || 0) : 0;

  return (
    <div className="wrap">
      <TopBar
        coins={state.coins}
        onlineCount={onlineCount}
        coinsPerTick={effectiveCoinPerTick(state.upgrades ? state.upgrades.coinBoost : 0)}
        authedUsername={session ? session.username : null}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        isAdmin={!!(session && session.isAdmin)}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      <div className="page-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`page-nav-btn${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <t.Icon className="nav-icon" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "shop" && <ShopTab coins={state.coins} onBuy={handleBuy} />}
      {tab === "inventory" && (
        <InventoryTab
          packsOwned={state.packs}
          cards={state.cards}
          cardSerials={state.cardSerials}
          discoveredCards={state.discoveredCards}
          upgrades={state.upgrades}
          onOpenPack={handleOpenPack}
          onSellCards={handleSellCards}
          autoOpenPackKey={autoOpenPackKey}
          onAutoOpenPack={handleAutoOpenPack}
          onCancelAutoOpen={stopAutoOpen}
        />
      )}
      {tab === "upgrades" && (
        <UpgradesTab coins={state.coins} upgrades={state.upgrades} onBuy={handleBuyUpgrade} />
      )}
      {tab === "feed" && <FeedTab localFeedCache={[]} />}
      {tab === "auction" && (
        <AuctionTab
          session={session}
          wallet={auctionWallet}
          onWalletChange={refreshWallet}
          onCoinsSynced={handleCoinsSynced}
          coins={state.coins}
          cards={state.cards}
          cardSerials={state.cardSerials}
          onAuctionCreated={handleAuctionCreated}
        />
      )}
      {tab === "event" && <EventTab loggedIn={!!session} />}

      <footer className="app-footer">DVC Gamble</footer>

      {modal && (
        <div style={modalHidden ? { display: "none" } : undefined}>
          <PackOpenModal
            key={modal.seq}
            pack={modal.pack}
            results={modal.results}
            accent={modal.accent}
            openCount={modal.openCount}
            soundEnabled={state.settings.sound}
            speedMultiplier={unpackSpeedMultiplier(state.upgrades ? state.upgrades.unpackSpeed : 0)}
            onCollect={handleCollect}
            isAuto={modal.auto}
            autoStart={modal.auto}
            onCancelAuto={modal.auto ? stopAutoOpen : undefined}
            onHide={modal.auto ? handleHideModal : undefined}
          />
        </div>
      )}

      {authModalOpen && (
        <AuthModal
          localState={state}
          onClose={() => setAuthModalOpen(false)}
          onAuthed={handleAuthed}
        />
      )}

      {adminModalOpen && session && session.token && (
        <AdminPanel token={session.token} onClose={() => setAdminModalOpen(false)} />
      )}

      {/* Stays reachable no matter which tab is on screen, and even while
          the reveal modal itself is minimized — this is what lets an
          auto-open run keep going "off screen". */}
      {autoOpenPack && (
        <div className="auto-open-banner">
          <span className="aob-dot" />
          <span className="aob-text">
            Auto-opening <b>{autoOpenPack.label}</b> — {autoOpenRemaining} left
          </span>
          <span className="aob-actions">
            {modalHidden && (
              <button className="aob-show" onClick={handleShowModal}>Show</button>
            )}
            <button className="aob-cancel" onClick={stopAutoOpen}>Cancel</button>
          </span>
        </div>
      )}
    </div>
  );
}