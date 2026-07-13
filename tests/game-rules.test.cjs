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
