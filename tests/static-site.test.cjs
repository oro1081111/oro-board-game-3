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
  assert.match(source, /assets\/game-core\.js/, `${id} loads the shared controller`);
  assert.match(source, /assets\/games\.js/, `${id} loads the shared rules registry`);
}

const lobby = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const lobbyCardCount = (lobby.match(/class="game-card"/g) || []).length;
assert.equal(lobbyCardCount, gameIds.length, 'Lobby has one card per shared-shell game');
assert.match(lobby, new RegExp(`<span class="count">${gameIds.length} 款遊戲</span>`), 'Lobby count matches game catalog');
assert.match(lobby, /games\/soulaween\/game\.html/, 'Lobby links directly to the shared Soulaween page');
const lobbyCards = [...lobby.matchAll(/<article class="game-card">([\s\S]*?)<\/article>/g)];
for (const [, card] of lobbyCards) {
  const tags = [...card.match(/<div class="meta">([\s\S]*?)<\/div>/)[1].matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
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

console.log(`ok - ${htmlFiles.length} HTML pages have valid internal assets; ${gameIds.length} games use the shared shell`);
