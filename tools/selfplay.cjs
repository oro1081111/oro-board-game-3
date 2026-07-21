#!/usr/bin/env node
// MCTS 自我對弈實驗工具：不經 UI、直接呼叫共用引擎、多行程平行。
// 用法：node tools/selfplay.cjs [gameId=soulaween] [games=100] [iterations=5000] [workers=CPU數]
// 兩個 AI 使用相同迭代數對弈,統計先手／後手勝率。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { fork } = require('node:child_process');

const [gameId = 'soulaween', gamesArg = '100', itersArg = '5000', workersArg, variantArg] = process.argv.slice(2);
const totalGames = Number(gamesArg);
const iterations = Number(itersArg);
const MAX_PLIES = 400;

// 實驗用初始設置變體：只影響本工具的對局，不改動正式遊戲。
const VARIANTS = {
  // 跳躍森靈：先手 1、3 可用（2 已翻面）維持標準；後手 1、2、3 全可用。
  'torii-second-all'(engine) {
    const original = engine.game.create.bind(engine.game);
    engine.game.create = (mode, previous) => {
      const created = original(mode, previous);
      created.state.tilesUsed = { first: { 1: false, 2: true, 3: false }, second: { 1: false, 2: false, 3: false } };
      return created;
    };
  }
};

// 各遊戲的「勝利方式」分類器（可選）：回傳字串標籤，統計會依先後手分開列出。
const WIN_CLASSIFIERS = {
  torii(state, winner) {
    const gates = state.torii.flat().filter((cell) => cell === winner).length;
    return gates >= 4 ? '鳥居勝利' : '信徒勝利';
  },
  'ice-stage'(state, winner) {
    const center = state.board[2][2];
    if (center && center.kind === 'circle' && center.owner === winner) return '抵達中央';
    const circles = { first: false, second: false };
    for (const row of state.board) for (const item of row) if (item?.kind === 'circle') circles[item.owner] = true;
    if (!circles.first || !circles.second) return '圓形棋被移除';
    return '數量結算';
  }
};

function loadEngine() {
  const root = path.resolve(__dirname, '..');
  global.window = { addEventListener() {} };
  vm.runInThisContext(fs.readFileSync(path.join(root, 'assets', 'game-core.js'), 'utf8'), { filename: 'game-core.js' });
  vm.runInThisContext(fs.readFileSync(path.join(root, 'assets', 'games.js'), 'utf8'), { filename: 'games.js' });
  return { game: global.window.BOARD_GAMES[gameId], runMcts: global.window.GameCore.runMcts };
}

async function playGame(engine) {
  const { game, runMcts } = engine;
  const created = game.create(game.openings[0].value, null);
  let state = created.state || created;
  let plies = 0;
  while (game.outcome(state) === null && plies < MAX_PLIES) {
    const result = await runMcts(game, state, iterations, () => true);
    if (!result || !result.action) break;
    state = game.searchApply ? game.searchApply(state, result.action) : game.apply(state, result.action);
    plies += 1;
  }
  return { outcome: game.outcome(state), plies, state };
}

async function workerMain() {
  const count = Number(process.env.SELFPLAY_COUNT);
  const engine = loadEngine();
  if (!engine.game) { process.exit(2); }
  if (variantArg) VARIANTS[variantArg](engine);
  const classify = WIN_CLASSIFIERS[gameId];
  const tally = { first: 0, second: 0, draw: 0, unfinished: 0, plies: 0, ms: 0, types: {} };
  for (let i = 0; i < count; i += 1) {
    const t0 = Date.now();
    const { outcome, plies, state } = await playGame(engine);
    tally.ms += Date.now() - t0;
    tally.plies += plies;
    if (outcome === 'first' || outcome === 'second' || outcome === 'draw') tally[outcome] += 1;
    else tally.unfinished += 1;
    if (classify && (outcome === 'first' || outcome === 'second')) {
      const key = `${outcome}:${classify(state, outcome)}`;
      tally.types[key] = (tally.types[key] || 0) + 1;
    }
    process.send({ type: 'progress', done: i + 1 });
  }
  process.send({ type: 'result', tally }, () => process.exit(0));
}

async function main() {
  if (process.env.SELFPLAY_COUNT) return workerMain();
  const probe = loadEngine();
  if (!probe.game) { console.error(`找不到遊戲：${gameId}`); process.exit(1); }
  if (!Number.isFinite(totalGames) || !Number.isFinite(iterations) || totalGames < 1 || iterations < 1) {
    console.error('用法：node tools/selfplay.cjs [gameId] [games] [iterations] [workers]');
    process.exit(1);
  }
  if (variantArg && !VARIANTS[variantArg]) { console.error(`找不到變體：${variantArg}（可用：${Object.keys(VARIANTS).join('、')}）`); process.exit(1); }
  const workers = Math.max(1, Math.min(Number(workersArg) || os.cpus().length, totalGames));
  const per = Math.floor(totalGames / workers);
  const counts = Array.from({ length: workers }, (_, i) => per + (i < totalGames % workers ? 1 : 0));
  console.log(`自我對弈：${gameId} × ${totalGames} 場，每步 ${iterations.toLocaleString()} 次 MCTS 模擬，${workers} 個行程平行${variantArg ? `，變體設置：${variantArg}` : ''}`);
  const started = Date.now();
  const tallies = [];
  const progress = new Array(workers).fill(0);
  await Promise.all(counts.map((count, index) => new Promise((resolve, reject) => {
    const child = fork(__filename, process.argv.slice(2), { env: { ...process.env, SELFPLAY_COUNT: String(count) } });
    child.on('message', (message) => {
      if (message.type === 'progress') {
        progress[index] = message.done;
        process.stdout.write(`\r已完成 ${progress.reduce((a, b) => a + b, 0)}/${totalGames} 場 `);
      } else if (message.type === 'result') {
        tallies.push(message.tally);
      }
    });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`worker exited ${code}`)));
  })));
  const total = tallies.reduce((acc, t) => {
    for (const k of ['first', 'second', 'draw', 'unfinished', 'plies', 'ms']) acc[k] += t[k];
    for (const [key, value] of Object.entries(t.types || {})) acc.types[key] = (acc.types[key] || 0) + value;
    return acc;
  }, { first: 0, second: 0, draw: 0, unfinished: 0, plies: 0, ms: 0, types: {} });
  console.log(`\n總耗時 ${((Date.now() - started) / 1000).toFixed(0)}s（單場平均 ${(total.ms / totalGames / 1000).toFixed(1)}s、平均 ${(total.plies / totalGames).toFixed(1)} 步）`);
  console.log(`先手勝 ${total.first} 場（${(total.first / totalGames * 100).toFixed(1)}%）`);
  console.log(`後手勝 ${total.second} 場（${(total.second / totalGames * 100).toFixed(1)}%）`);
  if (total.draw) console.log(`和局 ${total.draw} 場（${(total.draw / totalGames * 100).toFixed(1)}%）`);
  if (total.unfinished) console.log(`未在 ${MAX_PLIES} 步內結束 ${total.unfinished} 場`);
  const typeKeys = Object.keys(total.types).sort();
  if (typeKeys.length) {
    console.log('勝利方式：');
    for (const seat of ['first', 'second']) {
      const seatKeys = typeKeys.filter((key) => key.startsWith(`${seat}:`));
      const wins = total[seat];
      for (const key of seatKeys) {
        const label = key.slice(seat.length + 1);
        console.log(`  ${seat === 'first' ? '先手' : '後手'}：${label} ${total.types[key]} 場（佔其勝場 ${(total.types[key] / Math.max(1, wins) * 100).toFixed(1)}%）`);
      }
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
