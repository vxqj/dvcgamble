/* ==========================================================================
   DVC GAMBLE — GAME CONFIG
   This is the ONLY file you need to touch to change what's in the game.
   ========================================================================== */

// How often the player passively earns coins, in milliseconds, and the
// BASE coins per tick before the Coin Boost upgrade is factored in.
export const COIN_INTERVAL_MS = 1000; // how often income lands
export const COIN_PER_TICK = 1; // base coins earned per tick, before upgrades
export const CURRENCY_NAME = "Coins";
export const STARTING_COINS = 150;

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
  key: "Empyrean", label: "Empyrean", weight: 0.00003,
  color: "#fff2a8",
  gradient: "linear-gradient(120deg, #000000 0%, #403300 20%, #fff2a8 50%, #ffffff 80%, #000000 100%)",
  prismatic: true, fx: 9, sellValue: 5000000000000000000000000,
  pulseColors: ["#fff2a8", "#ffffff", "#ffd700", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Hollow", label: "Hollow", weight: 0.00005,
  color: "#8a8a8a",
  gradient: "linear-gradient(120deg, #000000 0%, #161616 20%, #8a8a8a 50%, #d6d6d6 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 35000000000,
  pulseColors: ["#8a8a8a", "#ffffff", "#444444", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Forbidden", label: "Forbidden", weight: 0.00008,
  color: "#ff3b3b",
  gradient: "linear-gradient(120deg, #000000 0%, #3b0000 20%, #ff3b3b 50%, #8b0000 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 20000000000,
  pulseColors: ["#ff3b3b", "#ff9a9a", "#8b0000", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Supreme", label: "Supreme", weight: 0.0001,
  color: "#ff0033",
  gradient: "linear-gradient(120deg, #000000 0%, #4d000f 20%, #ff0033 50%, #ffffff 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 10000000000,
  pulseColors: ["#ff0033", "#ffffff", "#99001f", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Prime", label: "Prime", weight: 0.0003,
  color: "#4da3ff",
  gradient: "linear-gradient(120deg, #000000 0%, #001f4d 20%, #4da3ff 50%, #b8dcff 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 8500000000,
  pulseColors: ["#4da3ff", "#ffffff", "#82c4ff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "BarkerFamily", label: "Barker Family", weight: 0.0005,
  color: "#4da3ff",
  gradient: "linear-gradient(120deg, #000000 0%, #001f4d 20%, #4da3ff 50%, #b8dcff 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 4500000000,
  pulseColors: ["#4da3ff", "#ffffff", "#82c4ff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Veteran", label: "Veteran", weight: 0.0007,
  color: "#7ea86d",
  gradient: "linear-gradient(120deg, #000000 0%, #24331b 20%, #7ea86d 50%, #b5d49d 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 3500000000,
  pulseColors: ["#7ea86d", "#d9efc9", "#4f6b41", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Danabros", label: "Danabros", weight: 0.001,
  color: "#4f7dff",
  gradient: "linear-gradient(120deg, #000000 0%, #1b2458 20%, #4f7dff 50%, #a47dff 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 250000000,
  pulseColors: ["#4f7dff", "#d8ccff", "#a47dff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Eternal", label: "Eternal", weight: 0.002,
  color: "#f5f5ff",
  gradient: "linear-gradient(120deg, #000000 0%, #1c1c3a 20%, #f5f5ff 50%, #8fd3ff 80%, #000000 100%)",
  prismatic: true, fx: 8, sellValue: 1500000000,
  pulseColors: ["#f5f5ff", "#ffffff", "#8fd3ff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Revenant", label: "Revenant", weight: 0.003,
  color: "#a855f7",
  gradient: "linear-gradient(120deg, #000000 0%, #1a0033 20%, #a855f7 45%, #4c1d95 70%, #000000 100%)",
  prismatic: true, fx: 7, sellValue: 100000000,
  pulseColors: ["#a855f7", "#e9d5ff", "#4c1d95", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Chaos", label: "Chaos", weight: 0.005,
  color: "#ff2a5c",
  gradient: "linear-gradient(120deg, #000000 0%, #240012 20%, #ff2a5c 45%, #8b2cff 70%, #000000 100%)",
  prismatic: true, fx: 7, sellValue: 800000000,
  pulseColors: ["#ff2a5c", "#ff7ca8", "#8b2cff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Digital", label: "Digital", weight: 0.01,
  color: "#00ff95",
  gradient: "linear-gradient(120deg, #050505 0%, #002b1c 20%, #00ff95 50%, #00d9ff 80%, #000000 100%)",
  prismatic: true, fx: 5, sellValue: 400000000,
  pulseColors: ["#00ff95", "#8cffcf", "#00d9ff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Singularity", label: "Singularity", weight: 0.05,
  color: "#7b4dff",
  gradient: "linear-gradient(120deg, #000000 0%, #120026 25%, #7b4dff 50%, #120026 75%, #000000 100%)",
  prismatic: true, fx: 7, sellValue: 250000000,
  pulseColors: ["#7b4dff", "#d7b3ff", "#3a0b73", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Transcendent", label: "Transcendent", weight: 0.1,
  color: "#b8ffff",
  gradient: "linear-gradient(120deg, #050505 0%, #00374a 20%, #b8ffff 50%, #4de4ff 80%, #000000 100%)",
  prismatic: true, fx: 6, sellValue: 100000000,
  pulseColors: ["#b8ffff", "#ffffff", "#4de4ff", "#000000"],
  serialsEnabled: true,
},
  {
  key: "Sacred", label: "Sacred", weight: 0.5,
  color: "#fff4c7",
  gradient: "linear-gradient(120deg, #0a0a0a 0%, #4a3b0a 20%, #fff4c7 50%, #ffd54a 80%, #000000 100%)",
  prismatic: true, fx: 5, sellValue: 40000000,
  pulseColors: ["#fff4c7", "#ffffff", "#ffd54a", "#000000"],
  serialsEnabled: false,
},
  {
  key: "Apex", label: "Apex", weight: 1, color: "#ffd700",
  gradient: "linear-gradient(120deg, #050505 0%, #3d2a00 20%, #ffd700 50%, #8f6a00 80%, #000000 100%)",
  prismatic: true, fx: 4, sellValue: 10000000,
  pulseColors: ["#ffd700", "#fff4b0", "#c99a00", "#000000"],
  serialsEnabled: false,
},
  {
  key: "Bloodline", label: "Bloodline", weight: 1.5, color: "#d1001f",
  gradient: "linear-gradient(120deg, #080808 0%, #3b0000 20%, #d1001f 50%, #5a0000 80%, #000000 100%)",
  prismatic: true, fx: 4, sellValue: 750000,
  pulseColors: ["#d1001f", "#ff3b3b", "#5a0000", "#000000"],
  serialsEnabled: false,
},
  {
  key: "Sovereign", label: "Sovereign", weight: 5, color: "#ffd700",
  gradient: "linear-gradient(120deg, #2b0a3d 0%, #6a0dad 20%, #ffd700 45%, #fff8dc 60%, #b8860b 80%, #4b0082 100%)",
  prismatic: true, fx: 4, sellValue: 400000,
  pulseColors: ["#ffd700", "#6a0dad", "#fff8dc", "#4b0082"],
},
  {
    key: "Ascended", label: "Ascended", weight: 25, color: "#f5f5f5",
    gradient: "linear-gradient(120deg, #f5f5f5 0%, #faebd7 22%, #c0c0c0 48%, #cbbeb5 74%, #f5f5dc 100%)",
    prismatic: false, fx: 4, sellValue: 150000,
    pulseColors: ["#808080", "#dddddd", "#999999", "#cccccc"],
  },
  {
    key: "VM", label: "VM", weight: 65, color: "#ff7373",
    gradient: "linear-gradient(120deg, #fff6b0 0%, #ff7373 22%, #ff2ec4 48%, #7c5cff 74%, #34e0ff 100%)",
    prismatic: false, fx: 4, sellValue: 45000,
    pulseColors: ["#ff7373", "#ff2ec4", "#7c5cff", "#34e0ff"],
  },
  {
    key: "Universal", label: "Universal", weight: 100, color: "#8f5bff",
    gradient: "linear-gradient(120deg, #2a0a4f 0%, #4b0082 30%, #8f5bff 55%, #c9a7ff 78%, #4b0082 100%)",
    prismatic: false, fx: 4, sellValue: 30000,
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
  Empyrean: ["Onttc Laylor"],
  Hollow: ["Xander Herb", "Ewan Cadet Incident"],
  Forbidden: ["Withered Jarrah", "Withered Willis"],
  Supreme: ["Bailey Barbs", "Lucas Galenti (Central Australia Version)"],
  Prime: ["Prime Bunda (Lucas Galenti)", "Year 7 Bethune"],
  BarkerFamily: ["E Barker", "K Barker", "S Barker"],
  Veteran: ["Milan", "Angus Burchfield", "Noah Carol", "Tyson Galea", "Corbs", "Luca Kessler"], 
  Danabros: ["Luke D", "Mav D", "Xav D"],
  Eternal: ["S Luck (Sam Luck)", "Imp"],
  Revenant: ["Sanara", "Grandma Giles", "Jizz (Jye Wellington)"], 
  Chaos: ["Willis Art Incident", "Milan VS Christian T", "SypherPK (year 7 conor)"],
  Digital: ["James Walton", "Maggot March"],
  Singularity: ["fazescat", "Tyrese Landy"],
  Transcendent: ["Kayla Beard"],
  Sacred: ["Sacred Burgess", "Michael Housan"],
  Apex: ["Harry Machin", "Dinger", "Tim Ravoka"],
  Bloodline: ["Evil Willis", "Ervil", "Lil Woldy"],
  Sovereign: ["Master Burgess", "Kale Galenti", "L Philp", "Dj Davo"],
  Ascended: ["Buddhist Burgess", "Bloody Willis", "Rory", "j2trappy"],
  VM: ["T Landy", "O Williams", "S Rith", "Aircon Diddler (Ned White)"],
  Universal: ["JVS", "Jai W", "Prime Year 7 Eden Harris"],
  secret: ["Nathan F", "Izaac F", "Big C", "Efan Bee", "Masci", "Nard (Mitchell)"],
  mythical: [
    "Sam March", "Archie Doyl", "Mav Danahay", "Levin",
    "Punett", "Seven", "Dane / Callie", "Mini Keff", "Bezina", "Scott Burn", "Mat Teles", "Joel Freeman", "Crusty",
  ],
  legendary: [
    "Max Anthony", "Rowan", "Big Keff", "Lakshman", "Jordan Quill",
    "Emily D", "Lily W", "Luke Danahay", "Golden Nug",
  ],
  epic: ["Poopie Panek", "Rocket", "Fat Simpson", "Noah Bergan", "Serrao", "Harper Owen", "Zach Thomas"],
  rare: [
    "Charlie Flint", "Ethan Barker", "Ethan Mathews", "Broby Styles",
    "Oscar Bananda", "Harvey Wold", "Ollie Shields", "Hammer", "Beau",
    "Lottie", "Mikayla", "Kye Harris", "Jacson Atkins", "Beau Puddy", "JT", "Mason Arias",
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
    cost: 55,
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
    cost: 500,
    cardsPerPack: 4,
    rarityMultipliers: { common: 0.45, rare: 1.3, epic: 2, legendary: 3, mythical: 4, secret: 5, Universal: 7, VM: 9 },
    guaranteeRarity: "epic",
    icon: "chest",
    accent: "#a855f7",
  },
  {
    key: "vault",
    label: "Vault Pack",
    description: "Small pack, big swings. Guaranteed Legendary+.",
    cost: 1500,
    cardsPerPack: 5,
    rarityMultipliers: { common: 0.2, rare: 0.6, epic: 2, legendary: 5, mythical: 7, secret: 10, Universal: 7, VM: 10, Ascended: 12, Sovereign: 15, Bloodline: 17, Apex: 19, Sacred: 21, Transcendent: 23, Singularity: 25, Digital: 27, Chaos: 30, Revenant: 35 },
    guaranteeRarity: "legendary",
    icon: "vault",
    accent: "#ff9d1f",
    
  },
  {
    key: "Eclipse",
    label: "Eclipse Pack",
    description: "Decent pack, Decent swings. Guaranteed Legendary+.",
    cost: 5000,
    cardsPerPack: 6,
    rarityMultipliers: { common: 0.2, rare: 0.6, epic: 2, legendary: 5, mythical: 7, secret: 10, Universal: 7, VM: 12, Ascended: 15, Sovereign: 17, Bloodline: 19, Apex: 21, Sacred: 23, Transcendent: 25, Singularity: 27, Digital: 30, Chaos: 33, Revenant: 40, Eternal: 50 },
    guaranteeRarity: "legendary",
    icon: "vault",
    accent: "#ff9d1f",
    
  },
  {
    key: "Legacy",
    label: "Legacy Pack",
    description: "big swings. Guaranteed Mythical +.",
    cost: 10000,
    cardsPerPack: 3,
    rarityMultipliers: { common: 0.2, rare: 0.6, epic: 2, legendary: 5, mythical: 7, secret: 10, Universal: 7, VM: 15, Ascended: 17, Sovereign: 19, Bloodline: 21, Apex: 23, Sacred: 25, Transcendent: 27, Singularity: 29, Digital: 33, Chaos: 36, Revenant: 40 },
    guaranteeRarity: "mythical",
    icon: "dice",
    accent: "#88ff1f",
  },
  {
    key: "DVC",
    label: "Gamble Pack",
    description: "yo dont buy ts",
    cost: 30000,
    cardsPerPack: 2,
    // Only these two rarities can drop at all (see restrictRarities above).
    // common's multiplier stacks on top of its already-huge base weight
    // (600000) while Universal's tiny base weight (100) gets nerfed further
    // — net odds land around 1 in several hundred thousand per card. This
    // is meant to be a real long-shot gamble, not a reliable Universal source.
    restrictRarities: ["common", "Universal"],
    rarityMultipliers: { common: 15, Universal: 15 },
    guaranteeRarity: null,
    icon: "dice",
    accent: "#ff2ec4",
  },
  {
    key: "Abyss",
    label: "Abyss Pack",
    description: "Mad Expensive. Great Outcome, Guaranteed Secret + .",
    cost: 500000,
    cardsPerPack: 5,
    rarityMultipliers: { common: 0.2, rare: 0.6, epic: 2, legendary: 5, mythical: 7, secret: 10, Universal: 7, VM: 20, Ascended: 23, Sovereign: 26, Bloodline: 29, Apex: 31, Sacred: 34, Transcendent: 37, Singularity: 40, Digital: 50, Chaos: 60, Revenant: 70, Danabros: 80, Veteran: 90, BarkerFamily: 100 },
    guaranteeRarity: "secret",
    icon: "dice",
    accent: "#ffb81f",
  },
  {
    key: "Ancient",
    label: "Ancient Pack",
    description: "Mad Expensive. Great Outcome, Guaranteed Sovereign + .",
    cost: 1000000,
    cardsPerPack: 7,
    rarityMultipliers: { common: 0.2, rare: 0.6, epic: 2, legendary: 5, mythical: 7, secret: 10, Universal: 7, VM: 20, Ascended: 23, Sovereign: 26, Bloodline: 29, Apex: 31, Sacred: 34, Transcendent: 37, Singularity: 40, Digital: 50, Chaos: 80, Revenant: 150, Danabros: 250, Veteran: 500, BarkerFamily: 750, Prime: 1000, Supreme: 1250 },
    guaranteeRarity: "secret",
    icon: "dice",
    accent: "#ff1f1f",
  },
];

/* --------------------------------------------------------------------------
   RAINBOW VARIANTS
   Independent of rarity — every single card pulled (Common through
   Singularity, doesn't matter) gets its own separate roll to come out
   Rainbow, same idea as rainbow pets in pet-sim games. A Rainbow Common is
   still a Common for pack odds / guarantee-rarity purposes, it's just a
   shinier, more valuable COPY of it.
   - chance: probability (0-1) that any individual card pulled is Rainbow.
     Kept flat across all rarities on purpose — a rainbow roll on a Common
     should be exactly as likely as a rainbow roll on a Singularity. Written
     as a fraction (1 / N) so "1 in how many" is readable at a glance.
   - sellMultiplier: a Rainbow copy sells for (rarity's normal sellValue *
     sellMultiplier) instead of just sellValue. Bump this up/down freely —
     nothing else needs to change, lib/engine.js's sellValueFor reads it
     directly.
   -------------------------------------------------------------------------- */
export const RAINBOW_CONFIG = {
  enabled: true,
  chance: 1 / 1500, // 1 in 1500, per card, independent of rarity
  sellMultiplier: 10,
};

/* --------------------------------------------------------------------------
   OVERCLOCKED VARIANTS
   Same idea as RAINBOW_CONFIG above — independent of rarity, every single
   card pulled (any rarity, Common through the very top tiers) gets its own
   separate roll to come out Overclocked. An Overclocked Digital card is
   still a Digital card for pack odds / guarantee-rarity purposes, it's
   just a rarer, more valuable COPY of it.
   - chance: probability (0-1) that any individual card pulled is
     Overclocked. Flat across every rarity on purpose — an Overclocked
     roll on a Common is exactly as likely as on a Singularity. Written as
     a fraction (1/N) so "1 in how many" is readable at a glance.
   - sellMultiplier: an Overclocked copy sells for (rarity's normal
     sellValue * sellMultiplier) instead of just sellValue.
   - eventTiebreak: if true, an Overclocked pull outranks a non-Overclocked
     pull of the SAME rarity on the Rarest Pull Event leaderboard (see
     app/api/event/submit/route.js and app/api/event/route.js). It never
     lets a lower rarity beat a higher one — a Common Overclocked still
     cannot outrank a plain Sovereign, only ties within the same rarity are
     affected. Set to false to make Overclocked purely cosmetic/sell-value
     and leave the leaderboard logic untouched.
   -------------------------------------------------------------------------- */
export const OVERCLOCKED_CONFIG = {
  enabled: true,
  chance: 1 / 150, // 1 in 150, per card, independent of rarity
  sellMultiplier: 6,
  eventTiebreak: true,
};

/* --------------------------------------------------------------------------
   PACK SELLING
   Powers the Inventory > Packs "Sell" mode (mirrors card selling below).
   Selling an unopened pack refunds coins WITHOUT opening it — a cleanup
   tool for packs a player doesn't want, kept below what actually opening
   the pack is worth on average so it never out-earns just playing.
   - PACK_SELL_REFUND_RATE: default refund = this fraction of pack.cost,
     used for any pack that doesn't set its own `sellValue` below.
   - To give one specific pack a custom refund instead of the flat rate,
     just add `sellValue: <coins>` to that pack's entry in PACKS above —
     lib/engine.js's packSellValueFor() checks for that override first.
   -------------------------------------------------------------------------- */
export const PACK_SELL_REFUND_RATE = 0.5; // 50% of cost back, per pack

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
    maxLevel: 22, // level 0 = 1 pack at once, level 8 = 9 packs at once
  },
  coinBoost: {
    key: "coinBoost",
    label: "Coin Boost",
    description: "Increases how many coins land every tick of your passive income.",
    baseCost: 150,
    costGrowth: 1.75,
    maxLevel: 25,
    coinsPerLevel: 1, // +1 coin per tick, per level
  },
  unpackSpeed: {
    key: "unpackSpeed",
    label: "Quick Hands",
    description:
      "Speeds up the pack-opening reveal — cards flip faster and auto-open moves to the next batch quicker. Stacks with Multi Open.",
    baseCost: 200,
    costGrowth: 1.9,
    maxLevel: 11,
    speedPerLevel: 0.07, // ~7% faster reveal pacing per level
    minMultiplier: 0.3, // reveal pacing never drops below 30% of base time (~3.3x faster, cap)
  },
  luck: {
    key: "luck",
    label: "Lucky Charm",
    description:
      "Permanently tilts your own odds toward rarer pulls, on top of any site-wide luck event. Biggest effect on Legendary through Universal — the true chase tiers barely move, this is a nudge, not a shortcut.",
    baseCost: 400,
    costGrowth: 1.75,
    maxLevel: 30,
    multiplierPerLevel: 0.06, // level 20 -> 2.2x, see personalLuckMultiplier in lib/engine.js
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
  minRarityIndexForBroadcast: RARITIES.findIndex((r) => r.key === "VM"),
  maxCacheEntries: 30,
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
  heartbeatMs: 20000, // how often each browser pings (jittered, see lib/presence.js)
  timeoutMs: 50000, // a pinger not heard from in this long is dropped
  pruneCheckMs: 10000, // how often we sweep for stale pingers
  pollFallbackMs: 15000, // how often we double-check via a direct poll, independent of the live SSE stream
};

/* --------------------------------------------------------------------------
   ADMIN ANNOUNCEMENTS
   Powers the dismissible banner (components/AnnouncementBanner.jsx) that an
   admin can push to everyone currently on the site via the admin panel's
   Announce tab. Same no-backend ntfy.sh trick as FEED_CONFIG/PRESENCE_CONFIG
   above — deliberately its own topic so an announcement never gets delayed
   by the feed's rate-limit queue (see lib/feed.js) and so the two can't
   collide with each other.
   -------------------------------------------------------------------------- */
export const ANNOUNCEMENT_CONFIG = {
  enabled: true,
  ntfyTopic: "dvcgamble-announce-8f2q1z-v2",
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
  endsAt: "2026-08-07T10:00:00+10:00",
};

/* --------------------------------------------------------------------------
   AUCTIONS
   Powers the Auction tab. Players list a single card (rarity must be
   RARER than `minRarityKey` — checked both here via isAuctionEligible in
   lib/engine.js and again server-side in the create_auction SQL function,
   so it can't be bypassed by calling the API directly) for other players
   to bid on with real coins, atomically escrowed server-side.
   - minRarityKey: cards at or below this rarity's position can't be
     auctioned — only strictly RARER ones can. Matches RARITIES order
     (index 0 = rarest), so "rarer than X" means a lower index than X.
   - minStartingPrice / maxBid: hard bounds enforced again in SQL.
   - minDurationSec / maxDurationSec: 5 minutes to 1 hour, enforced again
     in SQL.
   -------------------------------------------------------------------------- */
export const AUCTION_CONFIG = {
  enabled: true,
  minRarityKey: "Universal", // must be RARER than this, not including it
  minStartingPrice: 0,
  maxBid: 10000000,
  minDurationSec: 300, // 5 minutes
  maxDurationSec: 3600, // 1 hour
};

/* --------------------------------------------------------------------------
   TITLES
   Cosmetic tags a player earns and can equip to show as [KEY] next to their
   name in the TopBar / Global Feed / Event leaderboard.

   Three kinds of entry:
   1. Rarity-linked (most titles): `rarityKey` points at a RARITIES entry —
      unlocks the moment the player hatches a card of that rarity at least
      once (checked against `discoveredCards`, already tracked permanently
      — see lib/engine.js's unlockedTitleKeys, no extra server-side
      tracking needed). label/color/gradient are pulled straight from that
      rarity at render time, so it never drifts out of sync.
   2. Admin-only (`adminOnly: true`): unlocked for any account with
      is_admin = true in Supabase (checked server-side via the same
      session check every other admin action uses — see lib/adminAuth.js —
      so it can't be faked client-side), instead of being tied to a
      rarity. Define its own `label`, `color`, and `gradient` directly
      since there's no rarity to borrow them from.
   3. Given to specific people (`allowedUsernames: [...]`): unlocked only
      for accounts whose exact username (case-sensitive, must match their
      real DB username — see lib/authClient.js's fetchMeFull) appears in
      the list. Same as adminOnly, define your own label/color/gradient.
      Good for a one-off custom title without touching engine.js at all —
      just add the username(s) here.

   - key: the tag shown once equipped, e.g. [APX] or [🜲]. Keep these
     unique. Most are 3 letters, but this isn't enforced — a special title
     can use a symbol instead if you want it to stand out as clearly not
     an earned rarity title.
   -------------------------------------------------------------------------- */
export const TITLES = [
  { key: "$$",   rarityKey: "Supreme"},
  { key: "BAR", rarityKey: "BarkerFamily"},
  { key: "VET", rarityKey: "Veteran"},
  { key: "DAN", rarityKey: "Danabros"},
  { key: "ETE", rarityKey: "Etneral"},
  { key: "REV", rarityKey: "Revenant"},
  { key: "CHS", rarityKey: "Chaos"},
  { key: "DGI", rarityKey: "Digital"},
  { key: "SNG", rarityKey: "Singularity" },
  { key: "TRS", rarityKey: "Transcendent" },
  { key: "SCD", rarityKey: "Sacred" },
  { key: "APX", rarityKey: "Apex" },
  { key: "BLD", rarityKey: "Bloodline" },
  { key: "SOV", rarityKey: "Sovereign" },
  { key: "ASC", rarityKey: "Ascended" },
  { key: "VMX", rarityKey: "VM" },
  { key: "UNI", rarityKey: "Universal" },
  { key: "SEC", rarityKey: "secret" },
  { key: "MYT", rarityKey: "mythical" },
  { key: "CHUD", rarityKey: "common" },
  {
    key: "🜲",
    adminOnly: true,
    label: "Owner",
    description: "-",
    color: "#39ff14",
    gradient: "linear-gradient(120deg, #000000 0%, #001a05 25%, #39ff14 50%, #001a05 75%, #000000 100%)",
  },
{
  key: "danahay",
  allowedUsernames: ["LuckyWizard6645"],
  label: "danahay",
  description: "For Luke Danahay",
  color: "#FFD54A",
  gradient: "linear-gradient(120deg, #fff8cf 0%, #ffe37a 20%, #ffd54a 45%, #5f7cff 70%, #1f1f1f 100%)"
},
  // Example of a title given to a specific person — replace the username
  // and details, or delete this if you don't need one right now.
  // {
  //   key: "OWN",
  //   allowedUsernames: ["ShadowFox6871"],
  //   label: "Owner",
  //   description: "Reserved title.",
  //   color: "#ffd700",
  // },
];

/* --------------------------------------------------------------------------
   PATCH NOTES
   Powers the popup modal (components/PatchNotesModal.jsx) that greets
   players when they load the site. It shows ONCE per `version` string —
   the moment a player closes it, that version is saved to their browser's
   localStorage and it will never show again UNTIL `version` below changes.

   To post a new update: change `version` to anything different from last
   time (e.g. bump "2.1.0" -> "2.2.0", or just use a date like "2026-08-01"
   — any string works, it's just compared for equality) and edit
   `sections` below. Every player will see the popup again on their next
   visit, exactly once, until you change `version` again.

   - title: heading shown at the top of the modal (below the version tag)
   - sections: array of { heading, items } — as many sections as you want,
     each rendered as its own little list. Good headings: "New", "Fixes",
     "Balance Changes", "Known Issues", whatever fits this update.
   -------------------------------------------------------------------------- */
export const PATCH_NOTES = {
  version: "2.3.1",
  title: "Whats New",
  sections: [
    {
      heading: "2/08/2026",
      items: [
        "u can get titles now",
        "new rarities",
        "new luck upgrade",
        "5 more unpack upgrades"
      ],
    },
  ],
};
