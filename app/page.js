"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import ShopTab from "../components/ShopTab";
import InventoryTab from "../components/InventoryTab";
import FeedTab from "../components/FeedTab";
import UpgradesTab from "../components/UpgradesTab";
import EventTab from "../components/EventTab";
import PackOpenModal from "../components/PackOpenModal";
import AuthModal from "../components/AuthModal";
import { ShopIcon, InventoryIcon, FeedIcon, UpgradeIcon, TrophyIcon } from "../components/Icons";
import { loadState, saveState, defaultState, applyOfflineCoins } from "../lib/storage";
import { openPacks, isRarePull, multiOpenCount, upgradeCost, upgradeMaxed, effectiveCoinPerTick, computeSellSummary } from "../lib/engine";
import { broadcastPull } from "../lib/feed";
import { startPresence } from "../lib/presence";
import {
  getSession,
  setSession as persistSession,
  clearSession,
  loadStateFromCloud,
  saveStateToCloud,
  beaconSave,
  submitEventEntry,
} from "../lib/authClient";
import { COIN_INTERVAL_MS, PACKS } from "../lib/config";

const TABS = [
  { key: "shop", label: "Shop", Icon: ShopIcon },
  { key: "inventory", label: "Inventory", Icon: InventoryIcon },
  { key: "upgrades", label: "Upgrades", Icon: UpgradeIcon },
  { key: "feed", label: "Feed", Icon: FeedIcon },
  { key: "event", label: "Event", Icon: TrophyIcon },
];

// Small breather between one auto-opened batch collecting and the next one
// starting, so it reads as a sequence rather than a blur.
const AUTO_NEXT_DELAY_MS = 250;

export default function Page() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("shop");
  const [modal, setModal] = useState(null); // { pack, results, accent, openCount, auto, seq }
  const [modalHidden, setModalHidden] = useState(false);
  const [autoOpenPackKey, setAutoOpenPackKey] = useState(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [session, setLocalSession] = useState(null); // { token, username } | null
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const readyRef = useRef(false);
  const modalSeqRef = useRef(0);
  const autoTimerRef = useRef(null);

  // Load + hydrate on mount. If there's an existing login session, the
  // player's cloud save is the source of truth; otherwise fall back to
  // whatever's in localStorage (guest play).
  useEffect(() => {
    const local = loadState() || defaultState();
    const caughtLocal = applyOfflineCoins(local);
    const existingSession = getSession();

    if (existingSession && existingSession.token) {
      setLocalSession(existingSession);
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
  // cloud whenever a session is active.
  useEffect(() => {
    if (!state || !readyRef.current) return;
    const t = setTimeout(() => {
      saveState(state);
      if (session && session.token) saveStateToCloud(session.token, state);
    }, 300);
    return () => clearTimeout(t);
  }, [state, session]);

  // Save on tab close / hide, since the debounced save above can get cut
  // off if the tab closes mid-timer. sendBeacon fires reliably even as the
  // page is unloading.
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

  function handleBuy(pack) {
    setState((prev) => {
      if (prev.coins < pack.cost) return prev;
      return {
        ...prev,
        coins: prev.coins - pack.cost,
        packs: { ...prev.packs, [pack.key]: (prev.packs[pack.key] || 0) + 1 },
        totalPacksBought: prev.totalPacksBought + 1,
      };
    });
  }

  // `auto: true` marks this batch as part of an auto-open run — it skips
  // the "tap to open" screen and auto-collects instead of waiting on a click.
  function handleOpenPack(pack, { auto = false } = {}) {
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
    const results = openPacks(pack, openCount);
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

  function handleCollect(results) {
    const openedPack = modal ? modal.pack : null;
    const wasAuto = modal ? modal.auto : false;

    setState((prev) => {
      const cards = { ...prev.cards };
      results.forEach(({ name }) => {
        cards[name] = (cards[name] || 0) + 1;
      });
      return { ...prev, cards, totalOpened: prev.totalOpened + results.length };
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
        autoTimerRef.current = setTimeout(() => {
          handleOpenPack(openedPack, { auto: true });
        }, AUTO_NEXT_DELAY_MS);
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
    const nextSession = { token, username };
    persistSession(nextSession);
    setLocalSession(nextSession);
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