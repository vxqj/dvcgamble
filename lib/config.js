/* ==========================================================================
   DVC GAMBLE — GAME CONFIG
   This is the ONLY file you need to touch to change what's in the game.
   ========================================================================== */

// How often the player passively earns coins, in milliseconds, and the
// BASE coins per tick before the Coin Boost upgrade is factored in.
export const COIN_INTERVAL_MS = 1000; // how often income lands
export const COIN_PER_TICK = 1; // base coins earned per tick, before upgrades
export const CURRENCY_NAME = "Coins";
export const STARTING_COINS = 20;

// Master switch for the "prismatic" reveal treatment (the spin-grow-land-
// shake flip, screen shake, and pulsing foil glow). Turn this off to make
// every rarity — even ones with prismatic: true below — use the normal,
// quick flip instead. Handy if the big effect is too much, or for testing.
export const ENABLE_PRISMATIC_ANIMATION = true;

/* --------------------------------------------------------------------------
   RARITIES
   Ordered from RAREST (index 0) to MOST COMMON (last index) — order matters,
   it's used to figure out which pull in a pack is the "best" one.
   - key: internal id, don't reuse across rarities
   - label: what shows on screen
   - weight: bigger number = more common. Only relative size matters.
   - color: hex used for glow/borders/text (also the fallback if no gradient)
   - gradient: optional CSS gradient string. When set, this is used instead
     of `color` for text/swatch fills (see the `gradient-text` CSS class).
   - prismatic: optional — if true, this rarity gets the full shimmering
     foil treatment: gradient fill everywhere, a spin-grow-land-shake flip
     animation on unbox, and a screen shake when it lands. Reserved for your
     very top tier(s).
   - pulseColors: optional — 4 hex colors used for that rarity's own foil
     glow cycle during the prismatic animation (only read when
     prismatic: true). Order doesn't matter much, just pick 4 colors that
     read as "this rarity's colors" — they cycle in a loop.
   - fx: 0-4, controls how big the reveal animation is (4 = biggest)
   - hidden: if true, the name is shown as "???" until the flip finishes
   - sellValue: coins given when a card of this rarity is sold in the
     Inventory's sell mode. Scaled roughly with rarity, but kept well below
     what the card is "worth" in pack odds so selling stays a dupe-cleanup
     tool rather than a faster way to earn than opening packs.
   - serialsEnabled: optional (default false) — set true to make every
     copy of a card pulled from this rarity get a permanent, sequential
     serial number (#1, #2, #3...), counted globally across EVERY player,
     per card name. The number is assigned atomically server-side (see
     lib/cardStats.js + /api/cards/pull + the record_card_pulls Postgres
     function) the instant the pack is opened, so it can never collide,
     get reused, or be edited client-side — the first-ever "Master
     Burgess" pulled by anyone gets #1, no matter who or how many packs
     are opening at once. The serial shows directly on the card face
     instead of just a count. To make a NEW top rarity serialized: add
     `serialsEnabled: true` here — nothing else needs to change, every
     other file already reads this flag off the rarity object.
   -------------------------------------------------------------------------- */
export const RARITIES = [
  {
    key: "Bloodline", label: "Bloodline", weight: 1, color: "#00e5ff",
    gradient: "linear-gradient(120deg, #001a33 0%, #00e5ff 25%, #ffffff 50%, #00e5ff 75%, #001a33 100%)",
    prismatic: true, fx: 4, sellValue: 250000,
    pulseColors: ["#00e5ff", "#ffffff", "#0077b6", "#00e5ff"],
    serialsEnabled: true,
  },
  {
  key: "Sovereign", label: "Sovereign", weight: 5, color: "#ffd700",
  gradient: "linear-gradient(120deg, #2b0a3d 0%, #6a0dad 20%, #ffd700 45%, #fff8dc 60%, #b8860b 80%, #4b0082 100%)",
  prismatic: true, fx: 4, sellValue: 90000,
  pulseColors: ["#ffd700", "#6a0dad", "#fff8dc", "#4b0082"],
},
  {
    key: "Ascended", label: "Ascended", weight: 25, color: "#f5f5f5",
    gradient: "linear-gradient(120deg, #f5f5f5 0%, #faebd7 22%, #c0c0c0 48%, #cbbeb5 74%, #f5f5dc 100%)",
    prismatic: true, fx: 4, sellValue: 90000,
    pulseColors: ["#808080", "#dddddd", "#999999", "#cccccc"],
  },
  {
    key: "VM", label: "VM", weight: 65, color: "#ff7373",
    gradient: "linear-gradient(120deg, #fff6b0 0%, #ff7373 22%, #ff2ec4 48%, #7c5cff 74%, #34e0ff 100%)",
    prismatic: true, fx: 4, sellValue: 45000,
    pulseColors: ["#ff7373", "#ff2ec4", "#7c5cff", "#34e0ff"],
  },
  {
    key: "Universal", label: "Universal", weight: 100, color: "#8f5bff",
    gradient: "linear-gradient(120deg, #2a0a4f 0%, #4b0082 30%, #8f5bff 55%, #c9a7ff 78%, #4b0082 100%)",
    prismatic: true, fx: 4, sellValue: 30000,
    pulseColors: ["#4b0082", "#8f5bff", "#c9a7ff", "#2a0a4f"],
  },
  {
    // Gradient look only — no spin/glow choreography. Set prismatic: true
    // here too if you ever want Secret to join the full animation.
    key: "secret", label: "Secret", weight: 500, color: "#ff2ec4",
    gradient: "linear-gradient(120deg, #ff2ec4 0%, #ff6ad5 30%, #ffd9f4 55%, #ff6ad5 78%, #ff2ec4 100%)",
    fx: 4, hidden: true, sellValue: 15000,
  },
  { key: "mythical",  label: "Mythical",  weight: 8000,   color: "#ff3b4a", fx: 3, sellValue: 600 },
  { key: "legendary", label: "Legendary", weight: 40000,  color: "#ff9d1f", fx: 2, sellValue: 120 },
  { key: "epic",      label: "Epic",      weight: 100000, color: "#a855f7", fx: 1, sellValue: 30 },
  { key: "rare",      label: "Rare",      weight: 250000, color: "#2f8fff", fx: 0, sellValue: 8 },
  { key: "common",    label: "Common",    weight: 600000, color: "#9aa0ad", fx: 0, sellValue: 3 },
];

/* --------------------------------------------------------------------------
   CARDS
   The names that can pop out of a pack, grouped by rarity key above.
   Add / remove / rename freely — every string here is just display text.
   -------------------------------------------------------------------------- */
export const CARDS = {
  Bloodline: ["CHANGE ME 1", "CHANGE ME 2"],
  Sovereign: ["Master Burgess", "Kale Galenti", "L Philp"],
  Ascended: ["Rabbi Wilson", "Buddhist Burgess", "Bloody Willis"],
  VM: ["T Landy", "O Williams", "S Rith", "Aircon Diddler (Ned White)"],
  Universal: ["JVS", "Jai W", "Cannon", "Prime Year 7 Eden Harris"],
  secret: ["Nathan F", "Izaac F", "Big C", "Efan Bee", "Masci"],
  mythical: [
    "Sam March", "Archie Doyl", "Mav Danahay", "Big Baaaaaaaaaaaz", "Levin",
    "Punett", "Seven", "Dane / Callie", "Mini Keff", "Bezina", "Scott Burn", "Mat Teles", "Joel Freeman", "Crusty",
  ],
  legendary: [
    "Max Anthony", "Rowan", "Big Keff", "Lakshman", "Jordan Quill",
    "Emily D", "Lily W", "Ben Smithenyahu", "Luke Danahay", "Golden Nug",
  ],
  epic: ["Mitchell Taylors Tinder Account", "Poopie Panek", "Rocket", "Fat Simpson"],
  rare: [
    "Charlie Flint", "Ethan Barker", "Ethan Mathews", "Broby Styles",
    "Oscar Bananda", "Harvey Wold", "Ollie Shields", "Hammer", "Beau",
    "Lottie", "Mikayla",
  ],
  common: [
    "Nathan Foster", "Blake Smith", "Conner Cross", "Sam Luck",
    "Mitchell Taylor", "Jarrah Vickery Stewart", "Conner Wilson",
    "Cooper Burgess", "Ben Smith", "Remy Smith", "Michael Andrews",
    "Max Davidson", "Luke Danahay", "Eden Harris", "Jai Pudding",
    "Lachie Masci", "Lucas Galenti", "Lucas Giles", "Jai Wellington",
    "Shannon Knight", "Finbarr", "Cruze McStay", "Charlie Potter",
    "Zahra", "Izzy H", "Tahla B", "Izaac Freeman",
  ],
};

/* --------------------------------------------------------------------------
   PACKS
   What's for sale in the Shop tab.
   - cost: price in coins
   - cardsPerPack: how many cards come out when it's opened
   - rarityMultipliers: optional — multiplies a rarity's weight for THIS pack
     only (e.g. 3 means that rarity is 3x more likely to show up here).
     Any rarity not listed uses its normal weight.
   - restrictRarities: optional — if set, ONLY these rarity keys can drop
     from this pack at all (everything else is completely excluded from the
     roll, not just nerfed). rarityMultipliers still applies on top of this
     to skew the odds between whatever's left.
   - guaranteeRarity: optional — if set, the pack is guaranteed to contain at
     least one card of this rarity or better (rarer). If the random rolls
     didn't produce one, the worst card in the pack gets re-rolled from the
     guaranteed tier or better.
   - icon: which pack-art illustration to draw in the Shop/Inventory. Pick
     one of: "crate" (plain wooden crate — cheap/free packs), "satchel"
     (canvas bag — starter-tier), "chest" (banded treasure chest —
     mid/premium), "vault" (bank vault door — high-value guaranteed packs),
     "dice" (dice + sparks — pure-gamble packs). Falls back to "crate" if
     omitted or unrecognized, so a new pack never renders blank.
   - accent: hex color for that pack's glow/icon/button accent in the Shop
     and Inventory. Set this explicitly for every pack — it's no longer
     guessed from rarityMultipliers, so a new pack won't silently render
     plain yellow just because it forgot to include big multipliers.
   -------------------------------------------------------------------------- */
export const PACKS = [
  {
    key: "Beginner",
    label: "Beginner Pack",
    description: "Free Pack, For the chuds",
    cost: 1,
    cardsPerPack: 1,
    rarityMultipliers: {},
    guaranteeRarity: null,
    icon: "crate",
    accent: "#8fa3b0",
  },
  {
    key: "starter",
    label: "Starter Pack",
    description: "The basics. Mostly common, the odd surprise.",
    cost: 25,
    cardsPerPack: 5,
    rarityMultipliers: {},
    guaranteeRarity: null,
    icon: "satchel",
    accent: "#f2c14e",
  },
  {
    key: "elite",
    label: "Elite Pack",
    description: "Better odds across the board. Fewer commons.",
    cost: 150,
    cardsPerPack: 5,
    rarityMultipliers: { common: 0.45, rare: 1.3, epic: 2, legendary: 3, mythical: 4, secret: 5, Universal: 7, VM: 9 },
    guaranteeRarity: "epic",
    icon: "chest",
    accent: "#a855f7",
  },
  {
    key: "vault",
    label: "Vault Pack",
    description: "Small pack, big swings. Guaranteed Legendary+.",
    cost: 500,
    cardsPerPack: 3,
    rarityMultipliers: { common: 0.2, rare: 0.6, epic: 2, legendary: 5, mythical: 7, secret: 10, Universal: 7, VM: 10 },
    guaranteeRarity: "legendary",
    icon: "vault",
    accent: "#ff9d1f",
  },
  {
    key: "DVC",
    label: "Gamble Pack",
    description: "Either a Common or a Universal. Nothing else can drop — but Universal odds are brutal.",
    cost: 5000,
    cardsPerPack: 2,
    // Only these two rarities can drop at all (see restrictRarities above).
    // common's multiplier stacks on top of its already-huge base weight
    // (600000) while Universal's tiny base weight (100) gets nerfed further
    // — net odds land around 1 in several hundred thousand per card. This
    // is meant to be a real long-shot gamble, not a reliable Universal source.
    restrictRarities: ["common", "Universal"],
    rarityMultipliers: { common: 15, Universal: 0.2 },
    guaranteeRarity: null,
    icon: "dice",
    accent: "#ff2ec4",
  },
];

/* --------------------------------------------------------------------------
   UPGRADES
   Permanent, purchased with coins — the "Upgrades" tab in the UI.
   - baseCost / costGrowth: cost of level N+1 is baseCost * costGrowth^N
   - maxLevel: highest level obtainable
   -------------------------------------------------------------------------- */
export const UPGRADES = {
  multiOpen: {
    key: "multiOpen",
    label: "Multi Open",
    description:
      "Crack open more than one owned pack at a time. Each level adds one more pack per click — every pack still rolls (and can guarantee) independently.",
    baseCost: 300,
    costGrowth: 2.2,
    maxLevel: 15, // level 0 = 1 pack at once, level 8 = 9 packs at once
  },
  coinBoost: {
    key: "coinBoost",
    label: "Coin Boost",
    description: "Increases how many coins land every tick of your passive income.",
    baseCost: 150,
    costGrowth: 1.75,
    maxLevel: 15,
    coinsPerLevel: 1, // +1 coin per tick, per level
  },
  unpackSpeed: {
    key: "unpackSpeed",
    label: "Quick Hands",
    description:
      "Speeds up the pack-opening reveal — cards flip faster and auto-open moves to the next batch quicker. Stacks with Multi Open.",
    baseCost: 200,
    costGrowth: 1.9,
    maxLevel: 10,
    speedPerLevel: 0.07, // ~7% faster reveal pacing per level
    minMultiplier: 0.3, // reveal pacing never drops below 30% of base time (~3.3x faster, cap)
  },
};

/* --------------------------------------------------------------------------
   GLOBAL FEED
   Anonymous, no accounts — just a public log of rare pulls across everyone
   currently on the site. Broadcasts over ntfy.sh (free, no backend needed).
   If pulls from other people never show up, the topic name below is
   probably taken/guessed by someone else — change the suffix to something
   random and re-deploy.
   -------------------------------------------------------------------------- */
export const FEED_CONFIG = {
  enabled: true,
  ntfyTopic: "dvcgamble-rare-feed-8f2q1z-v2",
  // A pull is "rare" (and gets broadcast + shown in the feed) if its rarity
  // is at or above this position in the RARITIES array (0 = rarest).
  minRarityIndexForBroadcast: RARITIES.findIndex((r) => r.key === "legendary"),
  maxCacheEntries: 60,
};

/* --------------------------------------------------------------------------
   ONLINE PRESENCE
   Powers the "online now" count next to the coin pill. Same trick as the
   feed — no login, no backend — everyone pings a shared ntfy.sh topic every
   `heartbeatMs` and we count distinct pingers seen within `timeoutMs`. It's
   an estimate, not an exact number, and resets to 1 (just you) if the topic
   is unreachable. Uses its own topic so it doesn't collide with the feed.
   -------------------------------------------------------------------------- */
export const PRESENCE_CONFIG = {
  enabled: true,
  ntfyTopic: "dvcgamble-presence-8f2q1z-v2",
  heartbeatMs: 20000, // how often each browser pings
  timeoutMs: 50000, // a pinger not heard from in this long is dropped
  pruneCheckMs: 10000, // how often we sweep for stale pingers
};

/* --------------------------------------------------------------------------
   RAREST-PULL EVENT
   Powers the Event tab's live countdown + podium. Whoever's single rarest
   pull (lowest index in RARITIES, i.e. closest to the top) is ranked best
   wins — top 3 distinct players show up on the podium via GET /api/event.
   - endsAt: ISO timestamp the event ends at. Set below for 2 weeks out from
     when this was written (29 Jul 2026) — EDIT THIS if you deploy later,
     it does not auto-adjust.
   - enabled: flip to false to hide the countdown/podium and stop accepting
     new event entries without removing any code.
   -------------------------------------------------------------------------- */
export const EVENT_CONFIG = {
  enabled: true,
  endsAt: "2026-08-12T23:59:00+10:00",
};