# oro-plays — global play-count backend

A tiny Cloudflare Worker + KV that stores each game's play count and serves it
to the lobby. The site calls it from the browser:

- The game page sends `POST /play?game=<id>` the first time a match receives a
  human move (see `assets/game-core.js` → `recordPlay`).
- The lobby fetches `GET /counts` on load and shows "已遊玩 N 次" per card.

`<id>` is the game folder name (e.g. `zombie-jump`, `four-color-chess`).

## Deploy (one-time, free)

1. Sign in at https://dash.cloudflare.com.
2. **Storage & Databases → KV → Create a namespace**, name it `oro-plays`.
3. (git-connected) The Worker config lives at the repo root (`wrangler.toml`, `main = worker/oro-plays.js`); in Cloudflare set **Root directory = /**. Or manually: **Workers & Pages → Create → Worker**, name it `oro-plays`, **Deploy**, then
   **Edit code**, paste `oro-plays.js`, **Deploy** again.
4. Worker **Settings → Bindings → Add → KV namespace**:
   - Variable name: `PLAYS`
   - KV namespace: the `oro-plays` namespace from step 2
   Save and **Deploy**.
5. Copy the Worker URL, e.g. `https://oro-plays.<your-subdomain>.workers.dev`.

Then set that URL as `PLAYS_API` in both `assets/game-core.js` and `index.html`.

## Notes

- Free tier: 100k reads/day + 1k writes/day. One play = one write; the lobby's
  `/counts` read is edge-cached for 30s.
- The count is incremented client-side, so it is not tamper-proof (fine for a
  hobby stat). For exact, race-free counts, swap KV for Durable Objects — the
  site code does not need to change.
