const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gameIds = ['soulaween', 'mijnlieff', 'santorini', 'zombie-jump', 'four-color-chess', 'four-moves-chess', 'torii', 'ice-stage'];

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
  assert.doesNotMatch(source, /遊戲畫面原型|AI 迭帶次數/, `${path.relative(root, file)} must not contain retired prototype wording`);
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
assert.match(lobby, /games\/soulaween\/game\.html/, 'Lobby links directly to the shared Soulaween page');
const legacy = fs.readFileSync(path.join(root, 'interface.html'), 'utf8');
assert.match(legacy, /games\/soulaween\/game\.html/, 'Legacy Soulaween URL redirects to the shared page');

console.log(`ok - ${htmlFiles.length} HTML pages have valid internal assets; ${gameIds.length} games use the shared shell`);
