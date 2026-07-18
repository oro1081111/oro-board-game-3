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
  assert.equal(basic.length, 8);
  assert.deepEqual(basic.filter((item) => !item.ok), []);

  const soulGame = BOARD_GAMES.soulaween;
  const soul = soulGame.create('standard');
  assert.equal(soulGame.actions(soul).length, 32, 'Soulaween starts with two colour choices for every empty cell');
  const soulFlipProbe = structuredClone(soul);
  soulFlipProbe.board[1][0] = 'orange';
  soulFlipProbe.board[0][1] = 'green';
  const flippedSoul = soulGame.apply(soulFlipProbe, { type: 'place', r: 0, c: 0, color: 'green' });
  assert.equal(flippedSoul.board[1][0], 'green', 'Soulaween flips vertically adjacent souls');
  assert.equal(flippedSoul.board[0][1], 'orange', 'Soulaween flips horizontally adjacent souls');
  assert.equal(flippedSoul.turn, 'second', 'Soulaween completes a placement as one shared-core turn');

  const soulLineProbe = soulGame.create('standard');
  soulLineProbe.board[0] = [null, 'orange', 'green', 'green'];
  soulLineProbe.board[1][0] = 'orange';
  soulLineProbe.board[2][0] = 'green';
  soulLineProbe.board[3][0] = 'green';
  const soulLineActions = soulGame.actions(soulLineProbe).filter((action) => action.r === 0 && action.c === 0 && action.color === 'green');
  assert.equal(soulLineActions.length, 2, 'Soulaween exposes every line when one placement creates multiple four-in-a-row lines');
  assert.ok(soulLineActions.every((action) => action.collect?.positions.length === 4), 'Every Soulaween collection action identifies four souls');
  const collectedSoul = soulGame.apply(soulLineProbe, soulLineActions[0]);
  assert.equal(collectedSoul.scores.first, 1, 'Soulaween collection awards exactly one point');
  assert.equal(collectedSoul.board.flat().filter(Boolean).length, 3, 'Soulaween removes only the selected line');

  const soulWinningProbe = structuredClone(soulLineProbe);
  soulWinningProbe.scores.first = 2;
  const wonSoul = soulGame.apply(soulWinningProbe, soulGame.actions(soulWinningProbe).find((action) => action.r === 0 && action.c === 0 && action.color === 'green'));
  assert.equal(soulGame.outcome(wonSoul), 'first', 'Soulaween ends immediately at three points');
  const soulView = soulGame.view(soul, {}, {});
  assert.match(soulView.boardClass, /soulaween-board/);
  assert.match(soulView.tray, /data-soul-color="orange"/);
  assert.match(soulView.firstScore, /score-pip/);
  const pendingSoulView = soulGame.view(soulLineProbe, { color: 'green', pending: { type: 'place', r: 0, c: 0, color: 'green' } }, {});
  assert.equal((pendingSoulView.tray.match(/data-line-choice/g) || []).length, 2, 'Soulaween renders every collection choice in the shared mobile tray');
  assert.match(pendingSoulView.board, /cell collectable/, 'Soulaween highlights collectable lines on the shared board');
  assert.deepEqual(soulGame.historyUi({ color: 'green', pending: { r: 0, c: 0, color: 'green' } }, soulLineActions[0]), { color: 'green' }, 'Soulaween Undo restores the colour choice without restoring an uncommitted preview');

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
  assert.equal(santoriniGame.firstName, '紅方');
  assert.equal(santoriniGame.secondName, '藍方');
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
  const elevatedSantorini = structuredClone(santoriniReady);
  const elevatedWorker = elevatedSantorini.workers[0];
  elevatedSantorini.board[elevatedWorker.pos.r][elevatedWorker.pos.c] = 2;
  assert.match(santoriniGame.view(elevatedSantorini, {}).board, /santorini-worker first[^>]*style="--height:2"/, 'Santorini workers expose their level for vertical visual offset');
  const santoriniWinProbe = structuredClone(santoriniReady);
  santoriniWinProbe.board[0][0] = 2;
  santoriniWinProbe.board[0][1] = 3;
  const santoriniWinResult = await GameCore.runMcts(santoriniGame, santoriniWinProbe, 60, () => true);
  assert.equal(santoriniWinProbe.board[santoriniWinResult.action.move.r][santoriniWinResult.action.move.c], 3, 'Santorini MCTS takes a one-move win through the shared default check');
  assert.equal(santoriniWinResult.firstWinRate, 1, 'The shared immediate-win check reports a 100% terminal rate');
  assert.equal(santoriniWinResult.iterations, 1, 'The shared immediate-win check skips the search entirely');

  const zombieGame = BOARD_GAMES['zombie-jump'];
  const zombie = zombieGame.create();
  const zombieIds = zombie.board.flat().filter(Boolean).map((piece) => piece.id);
  assert.equal(new Set(zombieIds).size, zombieIds.length, 'Zombie pieces have unique animation ids');
  assert.equal((zombieGame.view(zombie, {}).tray.match(/class="choice-zone zombie-wait/g) || []).length, 2, 'Zombie shows both waiting areas');
  assert.equal(zombieGame.view(zombie, {}).tray.includes('<b>紅方陰間</b>'), false, 'Zombie waiting areas use color instead of visible labels');
  assert.equal((zombieGame.view(zombie, {}).tray.match(/class="piece-count"/g) || []).length, 2, 'Zombie groups duplicate waiting pieces with count badges');
  assert.equal(zombie.waiting.first.every((piece) => piece.id && piece.stack.length === 1), true, 'Zombie waiting pieces keep animation ids');
  assert.equal(zombie.board[0][0].owner, 'second', 'Zombie blue pieces start at the top');
  assert.equal(zombie.board[4][0].owner, 'first', 'Zombie red pieces start at the bottom');
  assert.equal(zombieGame.animationDuration({ type: 'jump', to: 'out' }), 520);
  assert.ok(zombieGame.actions(zombie).some((action) => action.type === 'move' && action.from.r === 3 && action.from.c === 0 && action.to.r === 4 && action.to.c === 0), 'Zombie level 1 can move onto its own level 2 piece');
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
  assert.equal(zombieGame.cutoffReward({ scores: { first: 7, second: 3 } }, 'first'), .75, 'Zombie cutoff reward scales the score margin against the 8-point target');
  assert.equal(zombieGame.cutoffReward({ scores: { first: 7, second: 3 } }, 'second'), .25, 'Zombie cutoff reward is symmetric for the other player');
  assert.equal(zombieGame.cutoffReward({ scores: { first: 0, second: 0 } }, 'first'), .5, 'Zombie cutoff reward stays even at zero-zero');
  assert.equal(zombieGame.cutoffReward({ scores: { first: 1, second: 0 } }, 'first'), .5625, 'Zombie cutoff never treats a small lead as a certain win');
  assert.equal(zombieGame.rolloutActions, undefined, 'Zombie rollouts keep whole-turn macros so playouts see full chain scores');
  const zombieMutationProbe = zombieGame.create();
  const zombieSnapshot = JSON.stringify(zombieMutationProbe);
  zombieGame.apply(zombieMutationProbe, zombieGame.actions(zombieMutationProbe).find((action) => action.type === 'jump') || zombieGame.actions(zombieMutationProbe)[0]);
  assert.equal(JSON.stringify(zombieMutationProbe), zombieSnapshot, 'Zombie apply never mutates the source state (required by the shallow state copy)');
  const winningBoard = Array.from({ length: 5 }, () => Array(5).fill(null));
  winningBoard[2][0] = { id: 'winning-zombie', owner: 'first', stack: [2] };
  winningBoard[2][1] = { id: 'scoring-zombie', owner: 'second', stack: [1] };
  const winningState = { turn: 'first', board: winningBoard, waiting: { first: [], second: [] }, scores: { first: 7, second: 0 }, continuing: null, path: [], winner: null, nextId: 2 };
  const immediateResult = await GameCore.runMcts(zombieGame, winningState, 200, () => true);
  assert.equal(immediateResult.action.type, 'zombie-turn');
  assert.equal(immediateResult.action.steps[0].type, 'jump');
  assert.equal(immediateResult.action.score, 1);
  assert.equal(immediateResult.firstWinRate, 1, 'MCTS bypasses search and reports 100% for an immediate Zombie win');
  assert.equal(zombieGame.expandSearchAction(immediateResult.action)[0].type, 'jump', 'Zombie MCTS turns expand back into animated atomic jumps');

  let zombieProbe = zombie;
  let multiJumpTurn = null;
  for (let turn = 0; turn < 24 && !multiJumpTurn; turn += 1) {
    const plans = zombieGame.searchActions(zombieProbe);
    assert.ok(plans.every((plan) => {
      const next = zombieGame.searchApply(zombieProbe, plan);
      return zombieGame.outcome(next) !== null || next.turn !== zombieProbe.turn;
    }), 'Every Zombie search action reaches the end of the current turn');
    multiJumpTurn = plans.find((plan) => plan.steps.length > 1);
    zombieProbe = zombieGame.searchApply(zombieProbe, plans[(turn * 7 + Math.floor(plans.length / 2)) % plans.length]);
    if (zombieGame.outcome(zombieProbe) !== null) break;
  }
  assert.ok(multiJumpTurn, 'Zombie MCTS can represent a complete multi-jump sequence as one search action');

  const outBoard = Array.from({ length: 5 }, () => Array(5).fill(null));
  outBoard[0][3] = { id: 'other-out', owner: 'first', stack: [2] };
  outBoard[0][4] = { id: 'other-target', owner: 'second', stack: [1] };
  outBoard[2][3] = { id: 'selected-out', owner: 'first', stack: [2] };
  outBoard[2][4] = { id: 'selected-target', owner: 'second', stack: [1] };
  const outState = { turn: 'first', board: outBoard, waiting: { first: [], second: [] }, scores: { first: 0, second: 0 }, continuing: { r: 2, c: 3 }, path: [], winner: null, nextId: 4 };
  const outView = zombieGame.view(outState, {});
  assert.match(outView.board, /data-out data-from-r="2" data-from-c="3"[^>]*data-dc="1"/, 'Zombie out control records the selected piece origin');
  assert.match(outView.board, /class="zombie-stop"[^>]*data-stop/, 'Zombie stop control sits on the continuing piece');
  assert.doesNotMatch(outView.tray, /data-stop/, 'Zombie stop control is no longer outside the board');

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
  assert.match(fmgGame.view(fmg, {}).board, /<b>[S1-4]<\/b><span class="piece fmg-piece (?:first|second)"/, 'Four Moves hollow pieces leave the current tile number visible');
  const fmgMoved = fmgGame.apply(fmg, firstFmgAction);
  const fmgBoard = fmgGame.view(fmgMoved, {}).board;
  assert.match(fmgBoard, /removed-space/);
  assert.doesNotMatch(fmgBoard, />X</, 'Removed Four Moves cells are empty holes');

  const toriiGame = BOARD_GAMES.torii;
  const torii = toriiGame.create('standard').state;
  const toriiView = toriiGame.view(torii, {});
  const toriiPlans = toriiGame.searchActions(torii);
  assert.ok(toriiPlans.length > 0 && toriiPlans.every((plan) => plan.type === 'torii-plan' && plan.steps[0].type === 'tile' && plan.steps[1].type === 'path'), 'Torii MCTS combines tile selection and the complete path');
  assert.ok(toriiPlans.every((plan) => {
    const next = toriiGame.searchApply(torii, plan);
    return next.turn !== torii.turn || next.building || toriiGame.outcome(next) !== null;
  }), 'A Torii search plan stops only at gate building, turn end, or game end');
  assert.deepEqual(toriiGame.expandSearchAction(toriiPlans[0]).map((action) => action.type), ['tile', 'path'], 'Torii plans expand into the existing staged animation actions');
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
  // The opponent spirit blocks its entire row AND column; a step that would land on
  // any cell sharing the opponent's row or column jumps over to the cell beyond.
  // Standard opening: first at (1,1), second at (2,2).
  const toriiStepLandings = new Set(toriiOneStepActions.map((action) => `${action.path[0].r},${action.path[0].c}`));
  assert.deepEqual([...toriiStepLandings].sort(), ['0,1', '1,0', '1,3', '3,1'], 'Torii jumps over any cell in the opponent spirit row or column');

  const iceGame = BOARD_GAMES['ice-stage'];
  assert.equal(iceGame.firstName, '藍方');
  assert.equal(iceGame.secondName, '橙方');
  const icePiece = (owner, kind, id) => ({ owner, kind, id });
  const iceEmptyBoard = () => Array.from({ length: 5 }, () => Array(5).fill(null));
  const iceState = (turn, pieces) => {
    const board = iceEmptyBoard();
    pieces.forEach(([r, c, owner, kind], index) => { board[r][c] = icePiece(owner, kind, `t${index}`); });
    return { turn, board, passed: false, winner: null };
  };
  const ice = iceGame.create('standard').state;
  assert.equal(ice.turn, 'first', 'Ice Stage blue moves first');
  assert.ok(ice.board[0].every((item) => item?.owner === 'second') && ice.board[4].every((item) => item?.owner === 'first'), 'Ice Stage standard rows face each other');
  assert.equal(ice.board[0][2].kind, 'circle');
  assert.equal(ice.board[4][2].kind, 'circle');
  const iceOpening = iceGame.actions(ice);
  assert.equal(iceOpening.length, 5, 'Ice Stage standard opening: full rows only slide toward the middle');
  assert.ok(iceOpening.every((action) => action.type === 'move' && action.to.r === 1), 'Ice Stage slides stop in the last empty cell before the orange row');
  const iceSlid = iceGame.apply(ice, iceOpening.find((action) => action.from.c === 0));
  assert.equal(iceSlid.board[1][0].owner, 'first', 'Ice Stage piece lands at the far end of the slide');
  assert.equal(iceSlid.board[4][0], null, 'Ice Stage origin cell is vacated');
  assert.equal(iceSlid.turn, 'second');

  const iceCenterProbe = iceState('first', [[4, 2, 'first', 'circle'], [1, 2, 'second', 'square'], [0, 0, 'second', 'circle']]);
  const iceCenterMove = iceGame.actions(iceCenterProbe).find((action) => action.from.r === 4 && action.from.c === 2 && action.dir.dr === -1);
  assert.deepEqual(iceCenterMove.to, { r: 2, c: 2 }, 'Ice Stage circle stops at the center only because a piece blocks the cell beyond');
  assert.equal(iceGame.apply(iceCenterProbe, iceCenterMove).winner, 'first', 'Ice Stage circle on the center wins immediately');
  const iceOverCenter = iceState('first', [
    [4, 2, 'first', 'circle'], [0, 0, 'second', 'circle'],
    [4, 0, 'first', 'square'], [4, 4, 'first', 'square'], [0, 4, 'second', 'square'], [2, 0, 'second', 'square']
  ]);
  const iceOverMove = iceGame.actions(iceOverCenter).find((action) => action.from.r === 4 && action.from.c === 2 && action.dir.dr === -1);
  assert.deepEqual(iceOverMove.to, { r: 0, c: 2 }, 'Ice Stage circle cannot voluntarily stop on the center and slides past it');
  assert.equal(iceGame.apply(iceOverCenter, iceOverMove).winner, null);

  const iceCaptureProbe = iceState('first', [
    [0, 0, 'second', 'square'], [0, 1, 'first', 'square'], [3, 0, 'first', 'square'],
    [4, 4, 'first', 'circle'], [4, 3, 'first', 'square'],
    [2, 4, 'second', 'circle'], [0, 4, 'second', 'square'], [1, 4, 'second', 'square']
  ]);
  const iceCaptureMove = iceGame.actions(iceCaptureProbe).find((action) => action.from.r === 3 && action.from.c === 0 && action.dir.dr === -1);
  assert.deepEqual(iceCaptureMove.to, { r: 1, c: 0 }, 'Ice Stage slide stops before the occupied corner');
  const iceCaptured = iceGame.apply(iceCaptureProbe, iceCaptureMove);
  assert.equal(iceCaptured.board[0][0], null, 'Ice Stage surrounded group is removed');
  assert.equal(iceCaptured.board[1][4].owner, 'second', 'Ice Stage group with a liberty survives');
  assert.equal(iceCaptured.winner, null, 'Ice Stage game continues while both circles live and more than five pieces remain');
  assert.equal(iceCaptured.turn, 'second');

  const iceCircleCapture = iceState('second', [
    [0, 0, 'first', 'circle'], [0, 1, 'second', 'square'], [3, 0, 'second', 'square'],
    [4, 4, 'second', 'circle'], [2, 2, 'first', 'square'], [4, 0, 'first', 'square'], [2, 4, 'first', 'square']
  ]);
  const iceCircleMove = iceGame.actions(iceCircleCapture).find((action) => action.from.r === 3 && action.from.c === 0 && action.dir.dr === -1);
  assert.equal(iceGame.apply(iceCircleCapture, iceCircleMove).winner, 'second', 'Removing the opponent circle wins immediately');

  const iceCountProbe = iceState('first', [
    [0, 0, 'second', 'square'], [0, 1, 'first', 'square'], [3, 0, 'first', 'square'],
    [4, 4, 'first', 'circle'], [2, 4, 'second', 'circle'], [1, 3, 'second', 'square']
  ]);
  const iceCountMove = iceGame.actions(iceCountProbe).find((action) => action.from.r === 3 && action.from.c === 0 && action.dir.dr === -1);
  assert.equal(iceGame.apply(iceCountProbe, iceCountMove).winner, 'first', 'At five or fewer total pieces the larger side wins');

  const iceStuck = iceState('first', [[0, 0, 'first', 'circle'], [0, 1, 'second', 'square'], [1, 0, 'second', 'square'], [4, 4, 'second', 'circle']]);
  assert.deepEqual(iceGame.actions(iceStuck), [{ type: 'skip' }], 'A player with no legal slide skips the turn');
  const iceSkipped = iceGame.apply(iceStuck, { type: 'skip' });
  assert.equal(iceSkipped.turn, 'second');
  assert.equal(iceGame.apply({ ...iceSkipped, turn: 'first' }, { type: 'skip' }).winner, 'draw', 'Two consecutive skips end the game as a draw');

  const iceRandom = iceGame.create('random');
  const iceRandomState = iceRandom.state;
  const icePlaced = [];
  for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) if (iceRandomState.board[r][c]) icePlaced.push({ r, c, ...iceRandomState.board[r][c] });
  assert.equal(icePlaced.length, 10, 'Ice Stage random setup places all ten pieces');
  assert.ok(icePlaced.every((item) => Math.abs(item.r - 2) + Math.abs(item.c - 2) > 1), 'Ice Stage random setup keeps the center region empty');
  assert.ok(icePlaced.every((item) => {
    const mirror = iceRandomState.board[4 - item.r][4 - item.c];
    return mirror && mirror.owner !== item.owner && mirror.kind === item.kind;
  }), 'Ice Stage random setup is 180-degree symmetric with matching piece kinds');
  assert.equal(icePlaced.filter((item) => item.kind === 'circle').length, 2, 'Ice Stage random setup places exactly one circle per side');
  assert.ok(icePlaced.every((item) => iceGame.actions({ ...iceRandomState, turn: item.owner }).some((action) => action.type === 'move' && action.from.r === item.r && action.from.c === item.c)), 'Every randomly placed piece can move');
  const iceSame = iceGame.create('same', iceRandom.snapshot).state;
  assert.deepEqual(iceSame.board, iceRandomState.board, 'Ice Stage same opening replays the previous layout');
  const iceView = iceGame.view(ice, {});
  assert.match(iceView.boardClass, /ice-board/);
  assert.match(iceView.board, /ice-center/, 'Ice Stage marks the center cell');
  assert.match(iceView.board, /ice-circle/);
  assert.ok(!iceView.threeWayWin, 'Ice Stage uses the two-segment win bar because rule-level draws are unreachable');
  assert.equal(iceView.hideTray, true, 'Ice Stage keeps a single instruction panel');
  assert.equal(iceView.hideScores, true, 'Ice Stage removes the piece-count score row');
  assert.equal((iceView.board.match(/cell ice-center legal/g) || []).length, 0, 'Ice Stage center highlight and legal highlight do not conflict at rest');
  const iceSelectedView = iceGame.view(ice, { selectedPos: { r: 4, c: 0 } });
  assert.match(iceSelectedView.board, /selected/, 'Ice Stage marks the selected piece');
  assert.equal((iceSelectedView.board.match(/cell legal| legal"/g) || []).length, 1, 'Ice Stage highlights only the selected piece destinations');

  const soulaweenPage = fs.readFileSync(path.join(root, 'games', 'soulaween', 'game.html'), 'utf8');
  assert.match(soulaweenPage, /data-game="soulaween"/, 'Soulaween uses the shared game page contract');
  assert.match(soulaweenPage, /assets\/game-core\.js/, 'Soulaween loads the shared controller');
  assert.match(soulaweenPage, /assets\/games\.js/, 'Soulaween loads the shared game registry');
  const shellCss = fs.readFileSync(path.join(root, 'assets', 'game-shell.css'), 'utf8');
  const lobbyHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(lobbyHtml, /assets\/lobby-boards\//, 'Lobby previews load captured game boards');
  assert.match(lobbyHtml, /board\.replaceWith\(image\)/, 'Lobby replaces synthetic previews with real board images');
  for (const image of ['soulaween', 'mijnlieff', 'santorini', 'zombie-jump', 'four-color-chess', 'four-moves-chess', 'torii', 'ice-stage']) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'lobby-boards', `${image}.png`)), `Lobby board image exists: ${image}`);
  }
  assert.doesNotMatch(shellCss, /\.follower\s*\{\s*animation:/, 'Torii followers do not replay entry animation on every render');
  assert.doesNotMatch(shellCss, /\.santorini-level[^}]*animation:/, 'Santorini buildings do not replay their entry animation on every render');
  assert.match(shellCss, /\.board-wrap \{ width: 100%; min-width: 0;/, 'Board wrappers keep the board at the available width');
  assert.match(shellCss, /\.santorini-board \{ width: 100%; min-width: 100%; aspect-ratio: 1;[^}]*background: #eef1ef; border-color: #327ab2/);
  assert.match(shellCss, /\.santorini-board \.cell \{[^}]*background: #d8ead2;/, 'Santorini uses pale green cells on a grey-white island');
  assert.match(shellCss, /\.piece\.santorini-worker \{ width: 52%;/, 'Santorini worker sizing applies only to pieces, never the worker-phase board');
  assert.match(shellCss, /\.piece\.santorini-worker \{ margin-top: calc\(var\(--height, 0\) \* -7px\); \}/, 'Santorini workers rise visually with their building level');
  assert.match(shellCss, /\.piece\.santorini-worker\.first \{ background: var\(--first\); \}/, 'Santorini first player uses shared red');
  assert.match(shellCss, /\.piece\.santorini-worker\.second \{ background: var\(--second\); \}/, 'Santorini second player uses shared blue');
  assert.doesNotMatch(shellCss, /(?:^|\n)\.santorini-worker \{/, 'Santorini board and worker piece classes cannot collide');
  assert.match(shellCss, /\.mijn-piece \.piece-mark \{ position: absolute; inset: 19%;/, 'Garden board marks use a centered drawing box');
  assert.match(shellCss, /\.mijn-token \.mark-push, \.mijn-token \.mark-pull \{ width: 24px; height: 24px;/, 'Garden supply circles stay smaller than their board counterparts');
  assert.equal((lobbyHtml.match(/class="preview-link"/g) || []).length, 8, 'Every lobby board image links to its game');
  assert.doesNotMatch(lobbyHtml, /詳細規則|其他遊戲|統一介面與純 MCTS AI/, 'Lobby omits redundant catalog text and rule buttons');
  assert.match(shellCss, /\.mijn-piece \.mark-pull \{ border: clamp\(/, 'Garden hollow circles use the centered element box instead of an oversized pseudo-element');
  assert.match(shellCss, /\.mijn-piece \.mark-push, \.mijn-piece \.mark-pull/);
  assert.match(shellCss, /\.piece\.fmg-piece \{[^}]*background: transparent;[^}]*border:/, 'Four Moves pieces are hollow rings');
  const coreSource = fs.readFileSync(path.join(root, 'assets', 'game-core.js'), 'utf8');
  assert.match(coreSource, /label: '隨機電腦'/);
  assert.match(coreSource, /label: 'MCTS 電腦'/);
  assert.match(coreSource, /確認並開始新對局/);
  assert.match(coreSource, /animationSequence !== this\.animationSequence/, 'Preview animations use an independent cancellation sequence');
  assert.match(coreSource, /if \(action\?\.previewed \|\| matchMedia/, 'A committed preview path never replays DOM entry animations');
  assert.doesNotMatch(coreSource, /previewUi[\s\S]{0,500}token !== this\.token/, 'MCTS updates cannot strand a preview animation');
  assert.match(coreSource, /if \(type === 'random'\) \{[\s\S]{0,500}runMcts/, 'Random computers still calculate an MCTS win rate');
  assert.match(coreSource, /game\.immediateAction\s*\n?\s*\? game\.immediateAction\(state, searchActions\)/, 'MCTS lets games override the immediate-win check');
  assert.match(coreSource, /: searchActions\.find\(\(action\) => game\.outcome\(applySearch\(action\)\) === state\.turn\)/, 'MCTS checks every game for a one-move win by default before searching');
  assert.match(coreSource, /this\.game\.searchActions\?\.\(state\) \|\| this\.game\.actions\(state\)/, 'MCTS supports game-specific search actions');
  assert.match(coreSource, /this\.game\.rolloutActions\?\.\(state\) \|\| this\.actions\(state\)/, 'Rollouts may use cheaper per-step actions than the search tree');
  assert.match(coreSource, /this\.plannedActions = plan\.slice\(1\)/, 'Computer macro actions are played through the existing atomic animation flow');
  const gamesSource = fs.readFileSync(path.join(root, 'assets', 'games.js'), 'utf8');
  assert.match(gamesSource, /samePos\(item\.from, from\)[\s\S]{0,120}button\.dataset\.dr/, 'Zombie out clicks match both origin and direction');

  for (const [id, game] of Object.entries(BOARD_GAMES)) {
    assert.ok(game.nameZh && game.nameEn, `${id}: intro has separate Chinese and English names`);
    assert.ok(game.publisherHtml && game.publisherLink?.href, `${id}: publisher section has detailed copy and an official/source link`);
    assert.ok(game.ruleLink?.href, `${id}: rules tab has a rules document button`);
    assert.equal(game.links?.length, 3, `${id}: intro uses the shared three-link layout`);
  }
  assert.equal(BOARD_GAMES.mijnlieff.title, '花園棋 Garden', 'Garden uses the requested English title');

  for (const [id, game] of Object.entries(BOARD_GAMES)) {
    const created = game.create(game.openings[0].value, null);
    let state = created.state || created;
    for (let turn = 0; turn < 24 && game.outcome(state) === null; turn += 1) {
      const actions = game.actions(state);
      assert.ok(actions.length > 0, `${id}: ongoing state must have an action`);
      const snapshot = JSON.stringify(state);
      const next = game.apply(state, actions[Math.floor(Math.random() * actions.length)]);
      assert.equal(JSON.stringify(state), snapshot, `${id}: apply must never mutate the source state (required by shallow state copies)`);
      state = next;
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
