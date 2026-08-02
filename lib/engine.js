import { RARITIES, CARDS, TITLES, FEED_CONFIG, UPGRADES, COIN_PER_TICK, AUCTION_CONFIG } from "./config";

export function rarityIndex(key) {
  return RARITIES.findIndex((r) => r.key === key);
}

export function rarityByKey(key) {
  return RARITIES.find((r) => r.key === key) || RARITIES[RARITIES.length - 1];
}

// luckMultiplier boosts rarer tiers more than common ones: a rarity at
// rank 0 (most common) is untouched, and the boost scales up smoothly to
// full strength at the rarest tier. This keeps a luck event feeling like
// "everything's shifted toward rare" instead of just multiplying every
// weight uniformly (which wouldn't change the odds at all) or overshooting
// and making commons functionally extinct.
function luckFactor(rarity, luckMultiplier) {
  if (!luckMultiplier || luckMultiplier <= 1) return 1;
  const span = Math.max(1, RARITIES.length - 1);
  const rank = rarityIndex(rarity.key) / span;
  return Math.pow(luckMultiplier, rank);
}

function effectiveWeight(rarity, pack, luckMultiplier = 1) {
  const mult = (pack.rarityMultipliers && pack.rarityMultipliers[rarity.key]) || 1;
  return rarity.weight * mult * luckFactor(rarity, luckMultiplier);
}

function pool(pack) {
  let list = RARITIES.filter((r) => (CARDS[r.key] || []).length > 0);
  if (pack && Array.isArray(pack.restrictRarities) && pack.restrictRarities.length > 0) {
    const allow = new Set(pack.restrictRarities);
    list = list.filter((r) => allow.has(r.key));
  }
  return list;
}

function rollRarity(pack, luckMultiplier = 1) {
  const list = pool(pack);
  const total = list.reduce((s, r) => s + effectiveWeight(r, pack, luckMultiplier), 0);
  let roll = Math.random() * total;
  for (const r of list) {
    const w = effectiveWeight(r, pack, luckMultiplier);
    if (roll < w) return r;
    roll -= w;
  }
  return list[list.length - 1];
}

function rollRarityFrom(pack, maxIndex, luckMultiplier = 1) {
  const list = pool(pack).filter((r) => rarityIndex(r.key) <= maxIndex);
  if (list.length === 0) return rollRarity(pack, luckMultiplier);
  const total = list.reduce((s, r) => s + effectiveWeight(r, pack, luckMultiplier), 0);
  let roll = Math.random() * total;
  for (const r of list) {
    const w = effectiveWeight(r, pack, luckMultiplier);
    if (roll < w) return r;
    roll -= w;
  }
  return list[list.length - 1];
}

function pickCardName(rarity) {
  const list = CARDS[rarity.key] || [];
  if (list.length === 0) return rarity.label;
  return list[Math.floor(Math.random() * list.length)];
}

// One card pull: { rarity, name }. luckMultiplier defaults to 1 (no
// change) so every existing call site keeps working untouched.
export function rollCard(pack, luckMultiplier = 1) {
  const rarity = rollRarity(pack, luckMultiplier);
  return { rarity, name: pickCardName(rarity) };
}

// Opens a pack, returns an array of { rarity, name } respecting the pack's
// guarantee rule if one is configured.
export function openPack(pack, luckMultiplier = 1) {
  const results = [];
  for (let i = 0; i < pack.cardsPerPack; i++) {
    results.push(rollCard(pack, luckMultiplier));
  }

  if (pack.guaranteeRarity) {
    const guaranteeIdx = rarityIndex(pack.guaranteeRarity);
    const hasGoodEnough = results.some((r) => rarityIndex(r.rarity.key) <= guaranteeIdx);
    if (!hasGoodEnough && guaranteeIdx >= 0) {
      let worstPos = 0;
      results.forEach((r, i) => {
        if (rarityIndex(r.rarity.key) > rarityIndex(results[worstPos].rarity.key)) worstPos = i;
      });
      const forcedRarity = rollRarityFrom(pack, guaranteeIdx, luckMultiplier);
      results[worstPos] = { rarity: forcedRarity, name: pickCardName(forcedRarity) };
    }
  }

  return results;
}

// Opens `count` copies of the same pack back-to-back and flattens the
// results into one array. Each pack still rolls (and applies its own
// guarantee) independently — this is just a convenience for the Multi
// Open upgrade, which lets a player crack several owned packs in one go.
export function openPacks(pack, count, luckMultiplier = 1) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(...openPack(pack, luckMultiplier));
  }
  return results;
}

// Admin "force a pull" support. Takes whatever results a pack already
// rolled and swaps ONE random slot for the forced card, so it still shows
// up inside a normal-looking pack open instead of a suspicious standalone
// popup. cardName is optional — if omitted, a random card of that rarity
// is picked, same as a normal roll would.
export function injectForcedCard(results, forced) {
  if (!forced || !forced.rarityKey || results.length === 0) return results;
  const rarity = rarityByKey(forced.rarityKey);
  const name = forced.cardName || pickCardName(rarity);
  const idx = Math.floor(Math.random() * results.length);
  const copy = results.slice();
  copy[idx] = { rarity, name };
  return copy;
}

// How many packs a single "Open" click cracks at once, given the player's
// Multi Open upgrade level (0 = just 1 pack).
export function multiOpenCount(level) {
  return 1 + (level || 0);
}

// How many coins land each tick, given the player's Coin Boost upgrade
// level (0 = just the base rate).
export function effectiveCoinPerTick(level) {
  const cfg = UPGRADES.coinBoost;
  const perLevel = cfg ? cfg.coinsPerLevel : 1;
  return COIN_PER_TICK + (level || 0) * perLevel;
}

// How much faster pack-opening reveals should run, given the player's
// Quick Hands (unpackSpeed) upgrade level. Returns a multiplier meant to be
// multiplied against a base delay/duration in ms (0 = no change, smaller =
// faster). Floors out at cfg.minMultiplier so it never gets instant/broken.
export function unpackSpeedMultiplier(level) {
  const cfg = UPGRADES.unpackSpeed;
  const perLevel = cfg ? cfg.speedPerLevel : 0.07;
  const minMultiplier = cfg ? cfg.minMultiplier : 0.3;
  return Math.max(minMultiplier, 1 - (level || 0) * perLevel);
}

export function upgradeCost(key, currentLevel) {
  const cfg = UPGRADES[key];
  if (!cfg) return Infinity;
  return Math.round(cfg.baseCost * Math.pow(cfg.costGrowth, currentLevel || 0));
}

export function upgradeMaxed(key, currentLevel) {
  const cfg = UPGRADES[key];
  if (!cfg) return true;
  return (currentLevel || 0) >= cfg.maxLevel;
}

// Given a list of pull results, return the single rarest one.
export function bestOf(results) {
  let best = results[0];
  for (const r of results) {
    if (rarityIndex(r.rarity.key) < rarityIndex(best.rarity.key)) best = r;
  }
  return best;
}

export function isRarePull(rarity) {
  return rarityIndex(rarity.key) <= FEED_CONFIG.minRarityIndexForBroadcast;
}

// True if this rarity's cards get permanent, globally-numbered serials
// (see lib/cardStats.js + /api/cards/pull). Gate everything serial-related
// through this instead of checking `rarity.serialsEnabled` directly, so
// there's one place to change if that logic ever needs to get smarter.
export function isSerializedRarity(rarity) {
  return !!(rarity && rarity.serialsEnabled);
}

// True if a rarity is allowed to be listed on the Auction tab — must be
// strictly RARER than AUCTION_CONFIG.minRarityKey (lower index = rarer).
// Used both for the UI (so ineligible cards never even show a "Create
// Auction" option) and re-checked in app/api/auction/create/route.js
// before it ever calls create_auction — that route is the only
// server-side path authorized to create an auction for a real player, so
// checking it there (rather than trying to duplicate RARITIES ordering
// inside Postgres, which has no access to this JS config) is sufficient;
// it can't be bypassed by calling the API directly with a disallowed key.
export function isAuctionEligible(rarityKey) {
  const boundary = rarityIndex(AUCTION_CONFIG.minRarityKey);
  if (boundary === -1) return false;
  return rarityIndex(rarityKey) < boundary;
}

export function fmtChance(weight, total) {
  if (!weight || weight <= 0 || !total) return "0%";
  const pct = (weight / total) * 100;
  if (pct >= 1) return pct.toFixed(2) + "%";
  const magnitude = Math.floor(Math.log10(pct));
  const decimals = Math.min(Math.max(-magnitude + 1, 3), 14);
  return pct.toFixed(decimals) + "%";
}

export function totalEffectiveWeight(pack) {
  return pool(pack).reduce((s, r) => s + effectiveWeight(r, pack), 0);
}

export function effectiveWeightFor(rarity, pack) {
  return effectiveWeight(rarity, pack);
}

export function fmtNum(n) {
  return Math.round(n).toLocaleString("en-US");
}

// Coins given for selling a single card of this rarity.
export function sellValueFor(rarityKey) {
  const r = rarityByKey(rarityKey);
  return r.sellValue || 0;
}

// name -> rarity key, for every card defined in config.js
export function nameToRarityKeyMap() {
  const map = {};
  RARITIES.forEach((r) => {
    (CARDS[r.key] || []).forEach((n) => {
      map[n] = r.key;
    });
  });
  return map;
}

// Given owned cards ({name: count}) and a set of rarity keys to sell,
// returns how many cards + coins that sell would produce, and what the
// cards map looks like afterward. Used both to preview a sell (before the
// player confirms) and to actually apply it — same math, one source of
// truth, so the number shown in the sell bar always matches the payout.
export function computeSellSummary(cards, rarityKeys) {
  const keys = new Set(rarityKeys);
  if (keys.size === 0) return { coins: 0, count: 0, remainingCards: cards };
  const nameToRarity = nameToRarityKeyMap();
  let coins = 0;
  let count = 0;
  const remainingCards = { ...cards };
  Object.keys(cards).forEach((name) => {
    const rKey = nameToRarity[name];
    const owned = cards[name] || 0;
    if (keys.has(rKey) && owned > 0) {
      coins += owned * sellValueFor(rKey);
      count += owned;
      delete remainingCards[name];
    }
  });
  return { coins, count, remainingCards };
}

// ----------------------------------------------------------------------
// Titles — see config.js's TITLES for the key/rarityKey pairs. A title
// unlocks the moment the player has ever discovered (pulled) at least one
// card of its linked rarity, reusing `discoveredCards` (already tracked
// permanently in storage.js) + nameToRarityKeyMap above — no separate
// server-side tracking needed, this is purely derived.
// ----------------------------------------------------------------------

export function titleByKey(key) {
  return TITLES.find((t) => t.key === key) || null;
}

// Every rarity a player has ever discovered a card from, as a Set of
// rarity keys — the building block both title-unlock checks below use.
function discoveredRarityKeys(discoveredCards) {
  const set = new Set();
  if (!discoveredCards) return set;
  const nameToRarity = nameToRarityKeyMap();
  Object.keys(discoveredCards).forEach((name) => {
    const rKey = nameToRarity[name];
    if (rKey) set.add(rKey);
  });
  return set;
}

// Returns every title key the player currently has unlocked.
export function unlockedTitleKeys(discoveredCards) {
  const have = discoveredRarityKeys(discoveredCards);
  return TITLES.filter((t) => have.has(t.rarityKey)).map((t) => t.key);
}

export function isTitleUnlocked(titleKey, discoveredCards) {
  const title = titleByKey(titleKey);
  if (!title) return false;
  return discoveredRarityKeys(discoveredCards).has(title.rarityKey);
}