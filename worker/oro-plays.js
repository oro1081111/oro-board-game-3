// oro-plays — Cloudflare Worker for play counts and game availability
// for 棋類遊戲 3.0 (https://oro1081111.github.io/oro-board-game-3/).
//
// Public endpoints:
//   GET  /counts                    -> { "<gameId>": <number>, ... }
//   POST /play?game=<id>            -> increments that game's count
//   GET  /availability              -> { "<gameId>": <boolean>, ... }
//
// Admin endpoints (Bearer ADMIN_TOKEN required):
//   GET  /admin/availability
//   POST /admin/availability        -> { game: "<gameId>", enabled: <boolean> }

const GAMES = [
  'soulaween', 'mijnlieff', 'santorini', 'zombie-jump', 'four-color-chess',
  'four-moves-chess', 'torii', 'ice-stage', 'gobblet', 'gobblet-classic',
  'chocolate-clash', 'animal-shogi'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS,
      ...extra
    }
  });

const defaultAvailability = () =>
  Object.fromEntries(GAMES.map((id) => [id, true]));

const normalizeAvailability = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(GAMES.map((id) => [id, source[id] !== false]));
};

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

async function readAvailability(env) {
  const stored = await env.PLAYS.get('availability');
  if (!stored) return defaultAvailability();

  try {
    return normalizeAvailability(JSON.parse(stored));
  } catch (error) {
    return defaultAvailability();
  }
}

function authorizeAdmin(request, env) {
  if (!env.ADMIN_TOKEN) {
    return { ok: false, response: json({ error: 'admin token is not configured' }, 503) };
  }

  const authorization = request.headers.get('Authorization') || '';
  if (authorization !== `Bearer ${env.ADMIN_TOKEN}`) {
    return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  }

  return { ok: true };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/counts') {
      const counts = JSON.parse((await env.PLAYS.get('counts')) || '{}');
      return json(counts, 200, { 'Cache-Control': 'public, max-age=30' });
    }

    if (request.method === 'POST' && url.pathname === '/play') {
      const id = url.searchParams.get('game');
      if (!GAMES.includes(id)) return json({ error: 'unknown game' }, 400);

      const counts = JSON.parse((await env.PLAYS.get('counts')) || '{}');
      counts[id] = (counts[id] || 0) + 1;
      await env.PLAYS.put('counts', JSON.stringify(counts));
      return json({ game: id, count: counts[id] });
    }

    if (request.method === 'GET' && url.pathname === '/availability') {
      return json(await readAvailability(env), 200, { 'Cache-Control': 'no-store' });
    }

    if (url.pathname === '/admin/availability') {
      const authorization = authorizeAdmin(request, env);
      if (!authorization.ok) return authorization.response;

      if (request.method === 'GET') {
        return json({ availability: await readAvailability(env) }, 200, {
          'Cache-Control': 'no-store'
        });
      }

      if (request.method === 'POST') {
        const body = await readJson(request);
        if (!body || !GAMES.includes(body.game) || typeof body.enabled !== 'boolean') {
          return json({ error: 'body must contain a known game and boolean enabled' }, 400);
        }

        const availability = await readAvailability(env);
        availability[body.game] = body.enabled;
        await env.PLAYS.put('availability', JSON.stringify(availability));

        return json({
          game: body.game,
          enabled: body.enabled,
          availability
        }, 200, { 'Cache-Control': 'no-store' });
      }

      return json({ error: 'method not allowed' }, 405);
    }

    return json({ error: 'not found' }, 404);
  }
};
