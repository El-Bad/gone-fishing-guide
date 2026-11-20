# GONE Fishing: Session Tracker & Field Guide

Two fan-made companions for **GONE Fishing** (GONE Studios, Steam app 3645890), the co-op survival-horror fishing game.

**Use it:** _link added after the first deploy_

## Session tracker (`live/`)
Follow your play session live:
- **Lobby detection:** works out who's in your lobby automatically (players who share your map and change in-game day with you).
- **Live catch feed:** an overlay on the map with every fish the crew catches, colour-coded by tier and size, with weight and gold value, grouped by in-game day.
- **Map:** every catch drawn on a top-down map in each player's colour, with landmarks and a depth chart.
- **Stats:** group and per-player totals (fish, weight, gold value, species, biggest, bait scores), sortable by fish, weight or value.
- **Session history:** finished sessions are saved in your browser. Compare against them or include their catches. Export or import them as files.

Pick your player on first visit, or share `?player=<gonefishing.gg profile number>`.

## Field guide (`/guide/`)
A single-file guide to all 110 fish, 58 baits, 5 maps (interactive, with bait spawns and depth charts), threats, upgrades, a value calculator, guides, a catch book and a Player tab. Open `GONE-Fishing-Field-Guide.html` directly; it also works offline.

## How it works
gonefishing.gg has a public API (profiles, catch logs, single catches, a live catch stream), but it sends no CORS headers, so a web page on another site can't call it. The Cloudflare Worker in `live/worker/` serves the site and relays a read-only allow-list of those calls under `/gf-api/`. It caches responses at the edge, so lots of users don't multiply the load on gonefishing.gg. Each browser also caches what it has fetched (IndexedDB).

## Run / deploy
Needs Node 20.3+.

```
cd live
npm install
npm run dev        # local: http://127.0.0.1:5173 (Vite relays the API)
npm test
npm run deploy     # build + deploy to Cloudflare Workers (run `npx wrangler login` once first)
```

To export a session from the API to a file the tracker can import:

```
node scripts/export-session.mjs --players 98602,98600 --from 2026-11-20T04:30Z --to 2026-11-20T07:30Z --out ../sessions/my-session.json
```

**Field guide:** data lives in `data.js`, layout and logic in `template.html`. Rebuild with `python build.py`. Map assets are in `source/maps/`; refresh them with `python scripts/fetch_maps.py`.

## Credits
- **Live data, map images, markers, depth data and the gold-value curves:** [gonefishing.gg](https://gonefishing.gg).
- **Fish and bait statistics:** [gonefishingwiki.com](https://gonefishingwiki.com/).
- **Rules:** the [official FAQ](https://gonefishing.gg/faq), [gonefishingwiki.vercel.app](https://gonefishingwiki.vercel.app/) and the [Steam page](https://store.steampowered.com/app/3645890/GONE_Fishing/).

Unofficial fan project; not affiliated with GONE Studios or gonefishing.gg.
