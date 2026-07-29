# DVC Gamble — Card Unbox

A Next.js idle/gacha game: earn coins passively, buy packs in the Shop, open
them in your Inventory with an animated reveal, spend coins in Upgrades to
open packs faster, and chase rare pulls that show up on an anonymous Global
Feed. A live "online now" count sits next to your coins.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Where to edit things

Everything you'll want to change lives in **`lib/config.js`**:

- `RARITIES` — the tiers (Common → Rare → Epic → Legendary → Mythical → ???),
  their colors, and how common each one is (`weight`).
- `CARDS` — the actual names that can pop out, grouped by rarity key.
- `PACKS` — what's for sale in the Shop: cost, how many cards per pack, and
  optional odds boosts / guaranteed-rarity rules per pack.
- `COIN_INTERVAL_MS` — how often you passively earn 1 coin (default: every 2s).
- `UPGRADES` — permanent, coin-bought upgrades in the Upgrades tab. Ships with
  `multiOpen` (open several owned packs at once — level 4 opens 5 packs, e.g.
  25 cards from a Starter Pack, in one go).
- `FEED_CONFIG` — controls the anonymous Global Feed (which rarities get
  broadcast, and the ntfy.sh topic name it uses).
- `PRESENCE_CONFIG` — controls the "online now" count next to the coin pill
  (heartbeat interval, timeout, and its own ntfy.sh topic).

No other file needs to change for normal tweaks — add a name to an array,
add a pack object, adjust a weight, and it just works.

## How the Global Feed works

There's no login system by design. Rare pulls (Legendary or better, by
default) get broadcast anonymously over [ntfy.sh](https://ntfy.sh) — a free
public pub/sub service, no backend or database required. Everyone on the
site subscribes to the same topic and sees the same feed in real time, shown
simply as "Someone pulled a Legendary" — no name or identity attached.

If pulls from other browsers/people never show up in your feed, someone else
may already be using the same topic name. Open `lib/config.js` and change
`FEED_CONFIG.ntfyTopic` to something else random, then redeploy.

## How the online count works

Same trick as the feed, on its own ntfy.sh topic (`PRESENCE_CONFIG.ntfyTopic`
in `lib/config.js`): every open tab pings the topic every 20s, and everyone
listening counts distinct pingers seen in the last 50s. It's an estimate,
not exact, and needs no accounts or database. If it seems stuck at 1 with
other people definitely playing, the topic name may be collided — change it
the same way as the feed topic above.

## Deploying to Vercel

This repo is already set up for Vercel — it's a stock Next.js app, no env
vars required.

```bash
# from inside the project folder
git init
git add .
git commit -m "DVC Gamble - card unbox game"
git branch -M main
git remote add origin https://github.com/vxqj/dvcgamble.git
git push -u origin main
```

Then on [vercel.com](https://vercel.com):
1. New Project → Import the `vxqj/dvcgamble` GitHub repo
2. Framework preset: Next.js (auto-detected)
3. Deploy — no environment variables needed

Every push to `main` will auto-redeploy.
