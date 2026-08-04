// oro-plays — Cloudflare Worker that records and serves per-game play counts
// for 棋類遊戲 3.0 (https://oro1081111.github.io/oro-board-game-3/).
//
// Setup (see worker/README.md):
//   1. Create a KV namespace (e.g. "oro-plays").
//   2. Create a Worker, paste this file, deploy.
//   3. Bind the KV namespace to this Worker as the variable name  PLAYS.
//
// Endpoints:
//   GET  /counts            -> { "<gameId>": <number>, ... }   (30s edge-cached)
//   POST /play?game=<id>    -> increments that game, returns { game, count }

const GAMES = [
  'soulaween', 'mijnlieff', 'santorini', 'zombie-jump', 'four-color-chess',
  'four-moves-chess', 'torii', 'ice-stage', 'gobblet', 'gobblet-classic',
  'chocolate-clash', 'animal-shogi'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra }
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const counts = JSON.parse((await env.PLAYS.get('counts')) || '{}');

    if (request.method === 'GET' && url.pathname === '/counts') {
      return json(counts, 200, { 'Cache-Control': 'public, max-age=30' });
    }

    if (request.method === 'POST' && url.pathname === '/play') {
      const id = url.searchParams.get('game');
      if (!GAMES.includes(id)) return json({ error: 'unknown game' }, 400);
      counts[id] = (counts[id] || 0) + 1;
      await env.PLAYS.put('counts', JSON.stringify(counts));
      return json({ game: id, count: counts[id] });
    }

    return json({ error: 'not found' }, 404);
  }
};
