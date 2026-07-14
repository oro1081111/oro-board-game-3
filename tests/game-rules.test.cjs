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
  assert.equal(mijnView.threeWayWin, true, 'Mijnlieff exposes draw probability as a third win-bar segment');
  assert.equal(mijnView.winColors.first, '#2d2a2e', 'Mijnlieff win bar follows piece colours');
  assert.equal(mijnView.turnColors.secondText, '#2d2a2e', 'Mijnlieff light turn prompt uses dark text');
  assert.match(mijnView.tray, /mark-push/);
  assert.match(mijnView.tray, /mark-pull/);

  const santoriniGame = BOARD_GAMES.santorini;
  const santorini = santoriniGame.apply(santoriniGame.create(), santoriniGame.actions(santoriniGame.create())[0]);
  assert.match(santoriniGame.view(santorini, {}).board, /data-anim-id="w0"/, 'Santorini workers have stable animation ids');
  assert.doesNotMatch(santoriniGame.view(santoriniGame.create(), {}).board, /cell legal/, 'Santorini placement does not highlight every empty cell');
  let santoriniReady = santoriniGame.create();
  for (const pos of [{ r: 0, c: 0 }, { r: 0, c: 2 }, { r: 4, c: 0 }, { r: 4, c: 2 }]) santoriniReady = santoriniGame.apply(santoriniReady, { type: 'place', ...pos });
  const santoriniReadyView = santoriniGame.view(santoriniReady, {});
  assert.equal(santoriniReadyView.hideScores && santoriniReadyView.hideTray, true, 'Santorini keeps one instruction panel');
  assert.match(santoriniReadyView.boardClass, /santorini-worker/);
  assert.equal((santoriniReadyView.board.match(/cell legal/g) || []).length, 2, 'Santorini highlights only movable current workers before selection');
  assert.equal((santoriniReadyView.board.match(/cell selected/g) || []).length, 0, 'Santorini never marks empty cells as selected');
  assert.ok(santoriniGame.actions(santoriniReady).some((action) => action.workerId === 'w0' && action.move.r === 0 && action.move.c === 1 && action.build.r === 0 && action.build.c === 0), 'Santorini may build on the vacated worker cell');
  const santoriniBuilt = santoriniGame.apply(santoriniReady, santoriniGame.actions(santoriniReady)[0]);
  assert.match(santoriniGame.view(santoriniBuilt, {}).board, /data-anim-id="santorini-building-\d-\d-0"/, 'Santorini building levels have stable animation ids');

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
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.99;
    const winningJump = { type: 'jump', score: 1, id: 'winning-jump' };
    assert.equal(zombieGame.rolloutAction(
      { turn: 'first', scores: { first: 7, second: 0 } },
      [{ type: 'move' }, { type: 'jump', score: 0 }, winningJump]
    ), winningJump, 'Zombie rollout always takes an immediate winning jump');

    Math.random = () => 0;
    const stop = { type: 'stop' };
    assert.equal(zombieGame.rolloutAction(
      { turn: 'first', scores: { first: 0, second: 0 } },
      [stop, { type: 'jump', score: 3 }]
    ), stop, 'Zombie rollout keeps a non-zero chance to stop instead of acting greedily');
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(zombieGame.cutoffReward, undefined, 'Zombie MCTS remains terminal-result based without cutoff scoring');

  const fcgGame = BOARD_GAMES['four-color-chess'];
  const fcg = fcgGame.create('standard').state;
  const fcgBoard = fcgGame.view(fcg, {}).board;
  assert.match(fcgBoard, /fcg-red owner-second/);
  assert.match(fcgBoard, /fcg-green owner-first/);
  assert.equal(fcgGame.view(fcg, {}).hideScores, true, 'Four Color hides mobility score cards');
  assert.equal(fcgGame.view(fcg, {}).hideTray, true, 'Four Color removes the colour explanation tray');
  assert.equal(fcgGame.view(fcg, {}).winColors.first, '#2e2a2f', 'Four Color win bar follows player outlines');
  assert.equal(fcgGame.view(fcg, {}).turnColors.secondText, '#2e2a2f', 'Four Color light turn prompt uses dark text');

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
  assert.equal(toriiGame.animationDuration({ type: 'path', path: [{ r: 0, c: 0 }], previewed: true }), 0, 'Torii does not replay the final human step animation');
  assert.match(toriiView.firstScore, /torii-resource-follower/);
  assert.match(toriiView.firstScore, /torii-resource-gate/);
  const toriiAfterTile = toriiGame.apply(torii, { type: 'tile', tile: 1 });
  const toriiOneStepActions = toriiGame.actions(toriiAfterTile);
  assert.ok(toriiOneStepActions.length > 0 && toriiOneStepActions.every((action) => action.path.length === 1), 'Torii tile 1 commits exactly one landing');
  const toriiAfterOneStep = toriiGame.apply(toriiAfterTile, toriiOneStepActions[0]);
  assert.equal(toriiAfterOneStep.followers.flat().filter(Boolean).length, 1, 'Torii tile 1 places exactly one follower');

  const soulaweenSource = fs.readFileSync(path.join(root, 'interface.html'), 'utf8');
  assert.doesNotMatch(soulaweenSource, /cell === null\) classes\.push\('legal'\)/, 'Soulaween does not highlight every empty cell');
  assert.doesNotMatch(soulaweenSource, /classList\.toggle\('current'/, 'Soulaween score cards do not glow for the current player');
  assert.match(soulaweenSource, /class="score-pip/, 'Soulaween renders three circle score markers');
  assert.match(soulaweenSource, /確認並開始新對局/, 'Soulaween settings start a new game');
  assert.match(soulaweenSource, /隨機電腦/);
  assert.match(soulaweenSource, /MCTS 電腦/);
  assert.equal((soulaweenSource.match(/state\.aiStats = null/g) || []).length, 1, 'Soulaween only resets win rate for a new game');
  assert.match(soulaweenSource, /if \(!isHumanTurn\(\)\) aiTimer = setTimeout\(doAI, 520\)/, 'Soulaween evaluates every player type before scheduling computer play');
  const shellCss = fs.readFileSync(path.join(root, 'assets', 'game-shell.css'), 'utf8');
  const lobbyHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(lobbyHtml, /assets\/lobby-boards\//, 'Lobby previews load captured game boards');
  assert.match(lobbyHtml, /board\.replaceWith\(image\)/, 'Lobby replaces synthetic previews with real board images');
  for (const image of ['soulaween', 'mijnlieff', 'santorini', 'zombie-jump', 'four-color-chess', 'four-moves-chess', 'torii']) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'lobby-boards', `${image}.png`)), `Lobby board image exists: ${image}`);
  }
  assert.doesNotMatch(shellCss, /\.follower\s*\{\s*animation:/, 'Torii followers do not replay entry animation on every render');
  assert.doesNotMatch(shellCss, /\.santorini-level[^}]*animation:/, 'Santorini buildings do not replay their entry animation on every render');
  assert.match(shellCss, /\.board-wrap \{ width: 100%; min-width: 0;/, 'Board wrappers keep the board at the available width');
  assert.match(shellCss, /\.santorini-board \{ width: 100%; min-width: 100%; aspect-ratio: 1;[^}]*background: #eef1ef; border-color: #327ab2/);
  assert.match(shellCss, /\.santorini-board \.cell \{[^}]*background: #d8ead2;/, 'Santorini uses pale green cells on a grey-white island');
  assert.match(shellCss, /\.piece\.santorini-worker \{ width: 52%;/, 'Santorini worker sizing applies only to pieces, never the worker-phase board');
  assert.doesNotMatch(shellCss, /(?:^|\n)\.santorini-worker \{/, 'Santorini board and worker piece classes cannot collide');
  assert.match(shellCss, /\.mijn-piece \.piece-mark \{ position: absolute; inset: 19%;/, 'Garden board marks use a centered drawing box');
  assert.match(shellCss, /\.mijn-token \.mark-push, \.mijn-token \.mark-pull \{ width: 30px; height: 30px;/, 'Garden supply circles keep the original size');
  assert.match(shellCss, /\.mijn-piece \.mark-pull \{ border: clamp\(/, 'Garden hollow circles use the centered element box instead of an oversized pseudo-element');
  assert.match(shellCss, /\.mijn-piece \.mark-push, \.mijn-piece \.mark-pull/);
  const coreSource = fs.readFileSync(path.join(root, 'assets', 'game-core.js'), 'utf8');
  assert.match(coreSource, /label: '隨機電腦'/);
  assert.match(coreSource, /label: 'MCTS 電腦'/);
  assert.match(coreSource, /確認並開始新對局/);
  assert.match(coreSource, /animationSequence !== this\.animationSequence/, 'Preview animations use an independent cancellation sequence');
  assert.match(coreSource, /if \(action\?\.previewed \|\| matchMedia/, 'A committed preview path never replays DOM entry animations');
  assert.doesNotMatch(coreSource, /previewUi[\s\S]{0,500}token !== this\.token/, 'MCTS updates cannot strand a preview animation');
  assert.match(coreSource, /if \(type === 'random'\) \{[\s\S]{0,500}runMcts/, 'Random computers still calculate an MCTS win rate');

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
    assert.ok(result.drawRate >= 0 && result.drawRate <= 1, `${id}: MCTS draw rate must be bounded`);
    assert.ok(Math.abs(result.firstWinRate + result.drawRate + result.secondWinRate - 1) < 1e-9, `${id}: MCTS outcome rates must sum to one`);
  }

  console.log(`ok - ${Object.keys(BOARD_GAMES).length} games passed rules and MCTS smoke tests`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
