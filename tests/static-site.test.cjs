const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gameIds = ['soulaween', 'mijnlieff', 'santorini', 'zombie-jump', 'four-color-chess', 'four-moves-chess', 'torii', 'ice-stage', 'gobblet', 'gobblet-classic', 'chocolate-clash', 'animal-shogi'];
const legalNotice = '© 奧羅桌遊設計工作室 ·AI棋類程式實作練習。僅供非商業分享，請勿私自商用。原創桌遊版權屬於各自作者與出版社。提供線上版本推廣給大家更多好玩遊戲，任何線上版都無法取代實體桌遊的樂趣。';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git') return [];
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

async function testWorker() {
  const source = fs.readFileSync(path.join(root, 'worker', 'oro-plays.js'), 'utf8');
  const encoded = Buffer.from(source).toString('base64');
  const worker = (await import(`data:text/javascript;base64,${encoded}`)).default;

  class MemoryKv {
    constructor() { this.values = new Map(); }
    async get(key) { return this.values.get(key) ?? null; }
    async put(key, value) { this.values.set(key, value); }
  }

  const kv = new MemoryKv();
  const env = { PLAYS: kv, ADMIN_TOKEN: 'test-secret' };
  const call = (pathname, options = {}, targetEnv = env) =>
    worker.fetch(new Request(`https://example.test${pathname}`, options), targetEnv);

  let response = await call('/availability');
  assert.equal(response.status, 200, 'Public availability endpoint responds');
  let data = await response.json();
  assert.deepEqual(Object.keys(data), gameIds, 'Availability returns every game');
  assert.ok(gameIds.every((id) => data[id] === true), 'Games default to open');

  response = await call('/admin/availability');
  assert.equal(response.status, 401, 'Admin endpoint rejects missing credentials');

  response = await call('/admin/availability', {
    headers: { Authorization: 'Bearer wrong' }
  });
  assert.equal(response.status, 401, 'Admin endpoint rejects a wrong token');

  response = await call('/admin/availability', {
    headers: { Authorization: 'Bearer test-secret' }
  });
  assert.equal(response.status, 200, 'Admin endpoint accepts the configured token');

  response = await call('/admin/availability', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-secret',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ game: 'santorini', enabled: false })
  });
  assert.equal(response.status, 200, 'Admin can close a game');

  response = await call('/availability');
  data = await response.json();
  assert.equal(data.santorini, false, 'Public availability reflects the admin change');
  assert.equal(data.soulaween, true, 'Other games remain open');

  response = await call('/admin/availability', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-secret',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ game: 'unknown', enabled: false })
  });
  assert.equal(response.status, 400, 'Unknown games are rejected');

  response = await call('/admin/availability', {}, { PLAYS: kv });
  assert.equal(response.status, 503, 'Admin endpoint reports a missing Worker secret');
}

async function main() {
  const htmlFiles = walk(root).filter((file) => file.endsWith('.html'));
  const missing = [];

  for (const file of htmlFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file);
    assert.doesNotMatch(source, /遊戲畫面原型|AI 迭帶次數/, `${relative} must not contain retired prototype wording`);
    if (!relative.endsWith(path.join('game.html'))) assert.ok(source.includes(legalNotice), `${relative} includes the legal notice`);
    if (relative.endsWith(path.join('rules.html'))) {
      assert.match(source, /location\.replace\('game\.html'\)/, `${relative} redirects direct visitors to the game`);
      assert.match(source, /body\{display:none\}/, `${relative} never flashes the hidden rules`);
    }
    for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const reference = match[1];
      if (/^(?:https?:|mailto:|data:|javascript:|#)/.test(reference)) continue;
      const clean = reference.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = path.resolve(path.dirname(file), clean);
      if (!fs.existsSync(target)) missing.push(`${path.relative(root, file)} -> ${reference}`);
    }
  }

  assert.deepEqual(missing, [], `Missing internal assets:\n${missing.join('\n')}`);

  for (const id of gameIds) {
    const file = path.join(root, 'games', id, 'game.html');
    assert.ok(fs.existsSync(file), `Shared game page exists: ${id}`);
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, new RegExp(`data-game="${id}"`), `${id} declares its shared game id`);
    assert.match(source, /assets\/game-shell\.css/, `${id} loads the shared mobile-first shell`);
    assert.match(source, /type="module"[^>]+assets\/game-loader\.js/, `${id} loads the availability-aware game loader`);
    assert.doesNotMatch(source, /<script[^>]+assets\/game-core\.js/, `${id} does not bypass the availability loader`);
    assert.doesNotMatch(source, /<script[^>]+assets\/games\.js/, `${id} does not bypass the availability loader`);
  }

  const lobby = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const lobbyCardCount = (lobby.match(/class="game-card"/g) || []).length;
  assert.equal(lobbyCardCount, gameIds.length, 'Lobby has one card per shared-shell game');
  assert.match(lobby, new RegExp(`<span class="count">${gameIds.length} 款遊戲</span>`), 'Lobby count matches game catalog before runtime filtering');
  assert.match(lobby, /games\/soulaween\/game\.html/, 'Lobby links directly to the shared Soulaween page');
  assert.match(lobby, /assets\/lobby-availability\.js/, 'Lobby loads availability filtering');
  assert.match(lobby, /availability-pending/, 'Lobby avoids flashing disabled games before filtering');

  const lobbyCards = [...lobby.matchAll(/<article class="game-card">([\s\S]*?)<\/article>/g)];
  for (const [, card] of lobbyCards) {
    const metaMatch = card.match(/<div class="meta">([\s\S]*?)<\/div>/);
    assert.ok(metaMatch, 'Each lobby card has metadata');
    const tags = [...metaMatch[1].matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
    assert.ok(tags.length >= 4 && tags.length <= 5, 'Each lobby card has four or five short tags');
    assert.ok(tags.every((tag) => tag !== '2 人' && !/^\d+×\d+ 棋盤$/.test(tag)), 'Lobby tags omit player count and board size');
  }

  const lobbyCss = fs.readFileSync(path.join(root, 'assets', 'lobby.css'), 'utf8');
  assert.match(lobbyCss, /\.status \{[^}]*margin: 0 0 0 auto;/, 'Playable badges align to the right');

  const legacy = fs.readFileSync(path.join(root, 'interface.html'), 'utf8');
  assert.match(legacy, /games\/soulaween\/game\.html/, 'Legacy Soulaween URL redirects to the shared page');

  const gameCore = fs.readFileSync(path.join(root, 'assets', 'game-core.js'), 'utf8');
  assert.ok(gameCore.includes(legalNotice), 'Shared game shell includes the legal notice');
  assert.match(gameCore, /data-tab="rules">遊戲規則/, 'Game information modal exposes the inline game rules tab');
  assert.match(gameCore, /rules\\\.html/, 'Only local rules.html links are filtered from game information');

  const gameLoader = fs.readFileSync(path.join(root, 'assets', 'game-loader.js'), 'utf8');
  assert.match(gameLoader, /\/availability/, 'Game loader checks the public availability endpoint');
  assert.match(gameLoader, /availability\[gameId\] === false/, 'Game loader blocks explicitly closed games');
  assert.match(gameLoader, /await import\('\.\/game-core\.js/, 'Game loader loads the controller only after the check');
  assert.match(gameLoader, /await import\('\.\/games\.js/, 'Game loader loads the rules registry only after the check');

  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(admin, /meta name="robots" content="noindex, nofollow"/, 'Admin page asks search engines not to index it');
  assert.match(admin, /assets\/admin\.js/, 'Admin page loads its controller');
  assert.doesNotMatch(admin, /Bearer\s+[A-Za-z0-9_-]{12,}/, 'Admin page does not contain a hard-coded token');

  const workerSource = fs.readFileSync(path.join(root, 'worker', 'oro-plays.js'), 'utf8');
  assert.match(workerSource, /ADMIN_TOKEN/, 'Worker protects admin writes with a secret');
  assert.match(workerSource, /Access-Control-Allow-Headers': 'Content-Type, Authorization'/, 'Worker allows the Authorization header');

  await testWorker();

  console.log(`ok - ${htmlFiles.length} HTML pages have valid internal assets; ${gameIds.length} games use the availability-aware shared shell`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
