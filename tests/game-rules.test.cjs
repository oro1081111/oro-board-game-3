const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

global.window = { addEventListener() {} };

const root = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'assets', 'game-core.js'), 'utf8'), { filename: 'game-core.js' });
vm.runInThisContext(fs.readFileSync(path.join(root, 'assets', 'games.js'), 'utf8'), { filename: 'games.js' });

const { BOARD_GAMES, GameCore } = window;

(async () => {
  const basic = GameCore.runSelfTests(BOARD_GAMES);
  assert.equal(basic.length, 6);
  assert.deepEqual(basic.filter((item) => !item.ok), []);

  const mijn = BOARD_GAMES.mijnlieff.create('A');
  const mijnView = BOARD_GAMES.mijnlieff.view(mijn, {});
  assert.equal((mijnView.tray.match(/class="choice-zone/g) || []).length, 2, 'Mijnlieff shows both remaining-piece hands');
  assert.doesNotMatch(mijnView.tray, /<b>.*剩餘棋子/, 'Mijnlieff hands use colour instead of visible labels');
  assert.match(mijnView.board, /cell legal/, 'Mijnlieff shows legal cells before selecting a piece');
  assert.equal(mijnView.compactScores, true, 'Mijnlieff uses compact inline scores');
  assert.equal(mijnView.winColors.first, '#2d2a2e', 'Mijnlieff win bar follows piece colours');

  const santoriniGame = BOARD_GAMES.santorini;
  const santorini = santoriniGame.apply(santoriniGame.create(), santoriniGame.actions(santoriniGame.create())[0]);
  assert.match(santoriniGame.view(santorini, {}).board, /data-anim-id="w0"/, 'Santorini workers have stable animation ids');
  assert.doesNotMatch(santoriniGame.view(santoriniGame.create(), {}).board, /cell legal/, 'Santorini placement does not highlight every empty cell');
  let santoriniReady = santoriniGame.create();
  for (const pos of [{ r: 0, c: 0 }, { r: 0, c: 2 }, { r: 4, c: 0 }, { r: 4, c: 2 }]) santoriniReady = santoriniGame.apply(santoriniReady, { type: 'place', ...pos });
  const santoriniReadyView = santoriniGame.view(santoriniReady, {});
  assert.equal(santoriniReadyView.hideScores && santoriniReadyView.hideTray, true, 'Santorini keeps one instruction panel');
  assert.equal((santoriniReadyView.board.match(/cell legal/g) || []).length, 2, 'Santorini highlights only movable current workers before selection');
  assert.equal((santoriniReadyView.board.match(/cell selected/g) || []).length, 0, 'Santorini never marks empty cells as selected');
  assert.ok(santoriniGame.actions(santoriniReady).some((action) => action.workerId === 'w0' && action.move.r === 0 && action.move.c === 1 && action.build.r === 0 && action.build.c === 0), 'Santorini may build on the vacated worker cell');

  const zombieGame = BOARD_GAMES['zombie-jump'];
  const zombie = zombieGame.create();
  const zombieIds = zombie.board.flat().filter(Boolean).map((piece) => piece.id);
  assert.equal(new Set(zombieIds).size, zombieIds.length, 'Zombie pieces have unique animation ids');
  assert.equal((zombieGame.view(zombie, {}).tray.match(/class="choice-zone zombie-wait/g) || []).length, 2, 'Zombie shows both waiting areas');
  assert.equal(zombieGame.view(zombie, {}).tray.includes('<b>紅方陰間</b>'), false, 'Zombie waiting areas use color instead of visible labels');
  assert.equal((zombieGame.view(zombie, {}).tray.match(/class="piece-count"/g) || []).length, 2, 'Zombie groups duplicate waiting pieces with count badges');
  assert.equal(zombie.waiting.first.every((piece) => piece.id && piece.stack.length === 1), true, 'Zombie waiting pieces keep animation ids');
  assert.equal(zombieGame.animationDuration({ type: 'jump', to: 'out' }), 520);
  assert.ok(zombieGame.actions(zombie).some((action) => action.type === 'move' && action.from.r === 1 && action.from.c === 0 && action.to.r === 0 && action.to.c === 0), 'Zombie level 1 can move onto its own level 2 piece');
  assert.equal(zombieGame.view(zombie, {}).compactScores, true, 'Zombie scores stay on one compact line');

  const fcgGame = BOARD_GAMES['four-color-chess'];
  const fcg = fcgGame.create('standard').state;
  const fcgBoard = fcgGame.view(fcg, {}).board;
  assert.match(fcgBoard, /fcg-red owner-second/);
  assert.match(fcgBoard, /fcg-green owner-first/);
  assert.equal(fcgGame.view(fcg, {}).hideScores, true, 'Four Color hides mobility score cards');
  assert.equal(fcgGame.view(fcg, {}).winColors.first, '#2e2a2f', 'Four Color win bar follows player outlines');

  const fmgGame = BOARD_GAMES['four-moves-chess'];
  const fmg = fmgGame.create('standard').state;
  const firstFmgAction = fmgGame.actions(fmg)[0];
  assert.equal(firstFmgAction.path.length, firstFmgAction.steps, 'Four Moves keeps its step-by-step animation path');
  assert.equal(firstFmgAction.stepDuration, 250, 'Four Moves uses the exact 1.0 step timing');
  assert.equal(new Set(fmgGame.actions(fmg).map((action) => `${action.to.r},${action.to.c}`)).size, fmgGame.actions(fmg).length, 'Four Moves exposes each destination once and keeps the shortest path');
  assert.equal(fmgGame.view(fmg, {}).hideScores && fmgGame.view(fmg, {}).hideTray, true, 'Four Moves removes step and mobility panels');
  const fmgMoved = fmgGame.apply(fmg, firstFmgAction);
  const fmgBoard = fmgGame.view(fmgMoved, {}).board;
  assert.match(fmgBoard, /removed-space/);
  assert.doesNotMatch(fmgBoard, />X</, 'Removed Four Moves cells are empty holes');

  const toriiGame = BOARD_GAMES.torii;
  const torii = toriiGame.create('standard').state;
  const toriiView = toriiGame.view(torii, {});
  assert.match(toriiView.tray, /data-owner="first"/);
  assert.match(toriiView.tray, /data-owner="second"/);
  assert.equal((toriiView.tray.match(/class="choice-zone torii-tiles/g) || []).length, 2, 'Torii shows both action-tile sets');
  assert.doesNotMatch(toriiView.tray, /<b>.*行動板塊/, 'Torii identifies action tiles by colour rather than text');
  assert.equal((toriiView.tray.match(/ used /g) || []).length, 2, 'Torii always shows used tiles for both players');
  assert.equal(toriiGame.animationDuration({ type: 'path', path: [{ r: 0, c: 0 }] }), 200, 'Torii uses the 1.0 step timing');

  const soulaweenSource = fs.readFileSync(path.join(root, 'interface.html'), 'utf8');
  assert.doesNotMatch(soulaweenSource, /cell === null\) classes\.push\('legal'\)/, 'Soulaween does not highlight every empty cell');
  assert.doesNotMatch(soulaweenSource, /classList\.toggle\('current'/, 'Soulaween score cards do not glow for the current player');
  assert.match(soulaweenSource, /class="score-pip/, 'Soulaween renders three circle score markers');
  const shellCss = fs.readFileSync(path.join(root, 'assets', 'game-shell.css'), 'utf8');
  assert.doesNotMatch(shellCss, /\.follower\s*\{\s*animation:/, 'Torii followers do not replay entry animation on every render');

  for (const [id, game] of Object.entries(BOARD_GAMES)) {
    const created = game.create(game.openings[0].value, null);
    let state = created.state || created;
    for (let turn = 0; turn < 24 && game.outcome(state) === null; turn += 1) {
      const actions = game.actions(state);
      assert.ok(actions.length > 0, `${id}: ongoing state must have an action`);
      state = game.apply(state, actions[Math.floor(Math.random() * actions.length)]);
    }
    const initial = created.state || created;
    const result = await GameCore.runMcts(game, initial, 40, () => true);
    assert.ok(result && result.action, `${id}: MCTS must return an action`);
    assert.ok(result.firstRate >= 0 && result.firstRate <= 1, `${id}: MCTS rate must be bounded`);
  }

  console.log(`ok - ${Object.keys(BOARD_GAMES).length} games passed rules and MCTS smoke tests`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
