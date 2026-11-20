# GONE Fishing · Session tracker

A local Vite + React + TypeScript app that follows your GONE Fishing play session live:

- **Who's playing:** works out who is in your lobby automatically, with no lobby data in the API. A lobby shares a map and an in-game day:
  - **History scan:** catch ids are one global sequence, so on start the app samples everyone's catches between your first catch of the session and now (about 400–550 cached lookups, throttled to about 8/s) plus a tight window around each of your catches.
  - **Live:** every new catch on the stream is checked the same way.
  - Anyone found on your map + day gets their own catch history compared with yours; players who changed day in lockstep with you are added as crew. You can also add players by name, or dismiss false matches ("Not them").
- **Live catch list:** every fish caught this session by everyone in the crew, appearing within a second or two of the catch (filter by player).
- **Group totals:** fish, weight, species, fish/hour, biggest catch, legendaries, session length; per-player table; per-species table with who caught what.
- **Catch feed:** a live list overlaid on the map. New catches slide in. It's grouped by in-game day, with each fish coloured by tier, a size badge for its species (tiny to record), its weight and its gold value. Hide it with ✕.
- **Value:** each catch's trader gold, using the game's own weight-to-price curves times that catch's bonuses (Fish Whisperer, hotspot, beer, day, golden totem, doubloons, Jeremy Wade). Cooking, totem shop buffs and gambles aren't included. `src/data/goldTable.json` was sampled from gonefishing.gg/fish-curves on 2026-11-20 and matches the site's per-catch values within a few percent. Sort the players by fish, weight or value.
- **Map:** each catch drawn on the top-down map in the player's colour (dot size = weight). Drag to pan, scroll to zoom, landmarks and depth chart toggles. Click a catch in the list to fly to it.

## Run

```
npm install
npm run dev        # http://127.0.0.1:5173
```

Your profile defaults to gonefishing.gg profile 98602. Crew, ignored players and session settings are saved in the browser.

## How it gets data

gonefishing.gg's public API has no CORS headers, so the Vite dev server relays a read-only allow-list under `/gf-api` (see `vite.config.ts`): profiles, catch logs and the live catch stream (`/api/liveview/recent/stream`, server-sent events). Positions and depth come from `/api/catch/{id}` for every session catch (cached in the browser; crew catches go ahead of the history scan in the request queue).

- **Session:** starts at your first catch after a 45+ minute break ("Auto"), or press **New session** to count from now.
- **Detection rules:** `src/detect.ts` (unit-tested in `src/detect.test.ts`).
- **Shared data:** map images, markers and depth charts are the field guide's (`../source/maps`); fish and bait facts are read from `../data.js`.

```
npm run typecheck
npm test
```

Local only for now: a hosted copy would need a relay like `../proxy-worker.js`.
