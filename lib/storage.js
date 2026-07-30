import { COIN_INTERVAL_MS, STARTING_COINS, UPGRADES } from "./config";
import { effectiveCoinPerTick } from "./engine";

function defaultUpgrades() {
  const levels = {};
  Object.keys(UPGRADES).forEach((key) => {
    levels[key] = 0;
  });
  return levels;
}

const KEY = "dvc_gamble_state_v2";

export function defaultState() {
  return {
    coins: STARTING_COINS,
    lastCoinTs: Date.now(),
    packs: {}, // packKey -> count owned, unopened
    cards: {}, // cardName -> count owned
    // cardName -> array of serial numbers owned, for cards pulled from a
    // rarity with serialsEnabled: true. Only serialized cards ever get an
    // entry here — non-serialized cards just use `cards` above as normal.
    cardSerials: {},
    totalOpened: 0,
    totalPacksBought: 0,
    upgrades: defaultUpgrades(), // upgradeKey -> level
    settings: { sound: true, feedNotifications: true },
  };
}

export function loadState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const merged = Object.assign(defaultState(), parsed);
    merged.packs = parsed.packs || {};
    merged.cards = parsed.cards || {};
    merged.cardSerials = parsed.cardSerials || {};
    merged.upgrades = Object.assign(defaultUpgrades(), parsed.upgrades || {});
    merged.settings = Object.assign(defaultState().settings, parsed.settings || {});
    return merged;
  } catch (e) {
    return null;
  }
}

export function saveState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // storage full or unavailable — fail silently, game still runs in-memory
  }
}

// Figures out how many whole coin-intervals have passed since we last saw
// this player, and returns an updated state with coins + timestamp bumped.
export function applyOfflineCoins(state) {
  const now = Date.now();
  const elapsed = now - (state.lastCoinTs || now);
  const cycles = Math.floor(elapsed / COIN_INTERVAL_MS);
  if (cycles <= 0) return state;
  const perTick = effectiveCoinPerTick(state.upgrades ? state.upgrades.coinBoost : 0);
  return {
    ...state,
    coins: state.coins + cycles * perTick,
    lastCoinTs: state.lastCoinTs + cycles * COIN_INTERVAL_MS,
  };
}