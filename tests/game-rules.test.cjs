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

  const santoriniGame = BOARD_GAMES.santorini;
  const santorini = santoriniGame.apply(santoriniGame.create(), santoriniGame.actions(santoriniGame.create())[0]);
  assert.match(santoriniGame.view(santorini, {}).board, /data-anim-id="w0"/, 'Santorini workers have stable animation ids');
  assert.doesNotMatch(santoriniGame.view(santoriniGame.create(), {}).board, /cell legal/, 'Santorini placement does not highlight every empty cell');

  const zombieGame = BOARD_GAMES['zombie-jump'];
  const zombie = zombieGame.create();
  const zombieIds = zombie.board.flat().filter(Boolean).map((piece) => piece.id);
  assert.equal(new Set(zombieIds).size, zombieIds.length, 'Zombie pieces have unique animation ids');
  assert.equal((zombieGame.view(zombie, {}).tray.match(/class="choice-zone zombie-wait/g) || []).length, 2, 'Zombie shows both waiting areas');
  assert.equal(zombieGame.view(zombie, {}).tray.includes('<b>紅方陰間</b>'), false, 'Zombie waiting areas use color instead of visible labels');
  assert.equal((zombieGame.view(zombie, {}).tray.match(/class="piece-count"/g) || []).length, 2, 'Zombie groups duplicate waiting pieces with count badges');
  assert.equal(zombie.waiting.first.every((piece) => piece.id && piece.stack.length === 1), true, 'Zombie waiting pieces keep animation ids');
  assert.equal(zombieGame.animationDuration({ type: 'jump', to: 'out' }), 520);

  const fcgGame = BOARD_GAMES['four-color-chess'];
  const fcg = fcgGame.create('standard').state;
  const fcgBoard = fcgGame.view(fcg, {}).board;
  assert.match(fcgBoard, /fcg-red owner-second/);
  assert.match(fcgBoard, /fcg-green owner-first/);
  assert.equal(fcgGame.view(fcg, {}).hideScores, true, 'Four Color hides mobility score cards');

  const fmgGame = BOARD_GAMES['four-moves-chess'];
  const fmg = fmgGame.create('standard').state;
  const firstFmgAction = fmgGame.actions(fmg)[0];
  assert.equal(firstFmgAction.path.length, firstFmgAction.steps, 'Four Moves keeps its step-by-step animation path');
  assert.equal(firstFmgAction.stepDuration, 280, 'Four Moves uses the slower 1.0-style step timing');
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

  const soulaweenSource = fs.readFileSync(path.join(root, 'interface.html'), 'utf8');
  assert.doesNotMatch(soulaweenSource, /cell === null\) classes\.push\('legal'\)/, 'Soulaween does not highlight every empty cell');
  assert.doesNotMatch(soulaweenSource, /classList\.toggle\('current'/, 'Soulaween score cards do not glow for the current player');

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
