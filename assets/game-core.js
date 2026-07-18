(function () {
  'use strict';

  const PLAYER_TYPES = [
    { value: 'human', label: '人類玩家', icon: 'human' },
    { value: 'random', label: '隨機電腦', icon: 'random' },
    { value: 'mcts', label: 'MCTS 電腦', icon: 'mcts' }
  ];
  const PRESETS = [
    { label: '簡單', value: 400 },
    { label: '中級', value: 1200 },
    { label: '困難', value: 2500 },
    { label: '專家', value: 5000 }
  ];
  const GAME_LINKS = [
    ['soulaween', '蒐靈祭 Soulaween'],
    ['mijnlieff', '花園棋 Garden'],
    ['santorini', '聖托里尼 Santorini'],
    ['zombie-jump', '殭屍棋 JUMP'],
    ['four-color-chess', '四色棋 Four Color Chess'],
    ['four-moves-chess', '四步棋 Four Moves Chess'],
    ['torii', '跳躍森靈 Torii'],
    ['ice-stage', '冰塊棋 ICE STAGE']
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const other = (player) => player === 'first' ? 'second' : 'first';
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const key = (r, c) => `${r},${c}`;
  const samePos = (a, b) => Boolean(a && b && a.r === b.r && a.c === b.c);

  class MctsSearch {
    constructor(game, state) {
      this.game = game;
      this.rootPlayer = state.turn;
      this.root = this.node(clone(state), null, null);
    }

    actions(state) { return this.game.searchActions?.(state) || this.game.actions(state); }
    apply(state, action) { return this.game.searchApply?.(state, action) || this.game.apply(state, action); }

    node(state, parent, action) {
      const done = this.game.outcome(state) !== null;
      return {
        state,
        parent,
        action,
        children: [],
        untried: done ? [] : this.actions(state),
        visits: 0,
        value: 0,
        firstWins: 0,
        secondWins: 0,
        draws: 0
      };
    }

    select(node) {
      while (node.untried.length === 0 && node.children.length > 0) {
        const maximizing = node.state.turn === this.rootPlayer;
        let best = null;
        let bestScore = -Infinity;
        for (const child of node.children) {
          const mean = child.value / Math.max(1, child.visits);
          const exploit = maximizing ? mean : 1 - mean;
          const explore = Math.SQRT2 * Math.sqrt(Math.log(Math.max(1, node.visits)) / Math.max(1, child.visits));
          const score = exploit + explore;
          if (score > bestScore) {
            best = child;
            bestScore = score;
          }
        }
        node = best;
      }
      return node;
    }

    expand(node) {
      if (!node.untried.length || this.game.outcome(node.state) !== null) return node;
      const index = Math.floor(Math.random() * node.untried.length);
      const action = node.untried.splice(index, 1)[0];
      const child = this.node(this.apply(node.state, action), node, action);
      node.children.push(child);
      return child;
    }

    rollout(start) {
      let state = clone(start);
      const limit = this.game.rolloutLimit || 100;
      for (let depth = 0; depth < limit; depth += 1) {
        const outcome = this.game.outcome(state);
        if (outcome !== null) return outcome;
        const actions = this.game.rolloutActions?.(state) || this.actions(state);
        if (!actions.length) return 'draw';
        const action = this.game.rolloutAction ? this.game.rolloutAction(state, actions) : pick(actions);
        state = this.apply(state, action);
      }
      return this.game.cutoffReward ? this.game.cutoffReward(state, this.rootPlayer) : 'draw';
    }

    iterate() {
      let node = this.select(this.root);
      node = this.expand(node);
      const result = this.rollout(node.state);
      const reward = typeof result === 'number' ? result : result === 'draw' ? .5 : result === this.rootPlayer ? 1 : 0;
      while (node) {
        node.visits += 1;
        node.value += reward;
        if (result === 'first') node.firstWins += 1;
        else if (result === 'second') node.secondWins += 1;
        else if (result === 'draw') node.draws += 1;
        node = node.parent;
      }
    }

    result() {
      if (!this.root.children.length) return null;
      const best = this.root.children.reduce((a, b) => a.visits >= b.visits ? a : b);
      const rootRate = this.root.value / Math.max(1, this.root.visits);
      const counted = this.root.firstWins + this.root.secondWins + this.root.draws;
      const firstWinRate = counted ? this.root.firstWins / counted : this.rootPlayer === 'first' ? rootRate : 1 - rootRate;
      const secondWinRate = counted ? this.root.secondWins / counted : 1 - firstWinRate;
      const drawRate = counted ? this.root.draws / counted : 0;
      const firstRate = firstWinRate + drawRate / 2;
      return {
        action: clone(best.action),
        firstRate,
        firstWinRate,
        secondWinRate,
        drawRate,
        visits: best.visits,
        iterations: this.root.visits
      };
    }
  }

  function runMcts(game, state, iterations, tokenIsCurrent) {
    const searchActions = game.searchActions?.(state) || game.actions(state);
    const applySearch = (action) => game.searchApply?.(state, action) || game.apply(state, action);
    const immediate = game.immediateAction
      ? game.immediateAction(state, searchActions)
      : searchActions.find((action) => game.outcome(applySearch(action)) === state.turn);
    if (immediate) {
      const next = applySearch(immediate);
      const outcome = game.outcome(next);
      if (outcome === 'first' || outcome === 'second') return Promise.resolve({
        action: clone(immediate),
        firstRate: outcome === 'first' ? 1 : 0,
        firstWinRate: outcome === 'first' ? 1 : 0,
        secondWinRate: outcome === 'second' ? 1 : 0,
        drawRate: 0,
        visits: 1,
        iterations: 1
      });
    }
    const search = new MctsSearch(game, state);
    const total = Math.max(1, Number(iterations) || 1);
    return new Promise((resolve) => {
      let batch = 12;
      const work = () => {
        if (!tokenIsCurrent()) return resolve(null);
        const started = Date.now();
        const until = Math.min(total, search.root.visits + batch);
        while (search.root.visits < until) search.iterate();
        // 自適應批次：每批目標約 10-16ms，讓快的遊戲少付固定的讓出開銷，仍保持 UI 回應。
        const elapsed = Date.now() - started;
        if (elapsed < 8) batch = Math.min(batch * 2, 4000);
        else if (elapsed > 20) batch = Math.max(12, Math.floor(batch / 2));
        if (search.root.visits < total) setTimeout(work, 4);
        else resolve(search.result());
      };
      work();
    });
  }

  const gearSvg = '<svg class="gear-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.35 1.05V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.05-.35H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .35-1.05V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.37.37.7.69.93.29.21.65.32 1.01.32H21a2 2 0 1 1 0 4h-.09c-.36 0-.72.11-1.01.32-.32.23-.55.56-.69.93Z"></path></svg>';

  function shell(game) {
    return `
      <div class="desktop-shell">
        <div class="game-layout">
          <main class="phone-app" aria-live="polite">
            <header class="topbar">
              <button class="icon-btn" id="backHome" aria-label="返回首頁"><span class="back-icon"></span></button>
              <div class="title-block"><h1>${game.title}</h1><p>${game.credit}</p></div>
              <button class="icon-btn" id="openSettings" aria-label="遊戲設定">${gearSvg}</button>
            </header>
            <section class="play-area">
              <div class="win-labels"><span class="first" id="firstWin"></span><span class="draw" id="drawWin"></span><span class="second" id="secondWin"></span></div>
              <div class="winbar"><span class="first" id="firstBar"></span><span class="draw" id="drawBar"></span><span class="second" id="secondBar"></span></div>
              <div class="score-row" id="scoreRow">
                <div class="score-card first" id="firstScore"></div>
                <div class="score-card second" id="secondScore"></div>
              </div>
              <div class="board-wrap"><div class="board" id="board"></div></div>
              <div class="below-board"><div class="choice-tray" id="choiceTray"></div><div class="turn-card" id="turnCard"></div></div>
              <div class="action-row">
                <button class="game-btn primary" id="newGame">開始新對局</button>
                <button class="game-btn secondary" id="openInfo">遊戲說明</button>
                <button class="game-btn" id="undoMove">返回上一步</button>
              </div>
            </section>
          </main>
          <aside class="desktop-panel">
            <section class="desktop-card"><h2>遊戲切換</h2><div class="game-list" id="gameList"></div></section>
            <section class="desktop-card status-lines"><h2>目前狀態</h2><div id="desktopStatus"></div></section>
          </aside>
        </div>
      </div>
      <div class="modal-layer" id="settingsLayer">
        <section class="modal" role="dialog" aria-modal="true" aria-label="遊戲設定">
          <header class="modal-head"><h2>遊戲設定</h2><button class="icon-btn" data-close="settingsLayer" aria-label="關閉設定">${gearSvg}</button></header>
          <div class="modal-body">
            <section class="settings-section" id="openingSection"><div class="settings-label">棋盤設置</div><div class="mode-options" id="openingOptions"></div></section>
            <section class="settings-section"><div class="settings-label">先手設置</div><div class="player-grid" data-player="first"></div></section>
            <section class="settings-section"><div class="settings-label">後手設置</div><div class="player-grid" data-player="second"></div></section>
            <section class="settings-section"><div class="settings-label">AI 迭代次數</div><input class="ai-input" id="iterations" type="number" min="100" step="100"><div class="difficulty-row" id="difficulty"></div></section>
          </div>
          <button class="confirm-btn" id="applySettings">確認並開始新對局</button>
        </section>
      </div>
      <div class="modal-layer" id="infoLayer">
        <section class="modal info-modal" role="dialog" aria-modal="true" aria-label="遊戲資訊">
          <div class="info-tabs"><button class="tab-btn active" data-tab="log">行動日誌</button><button class="tab-btn" data-tab="rules">規則說明</button><button class="tab-btn" data-tab="intro">遊戲介紹</button></div>
          <div class="info-content"><div class="info-panel active" id="tab-log"></div><div class="info-panel" id="tab-rules"></div><div class="info-panel" id="tab-intro"></div></div>
          <button class="confirm-btn" data-close="infoLayer">確認並關閉</button>
        </section>
      </div>`;
  }

  class GameController {
    constructor(gameId, game) {
      this.gameId = gameId;
      this.game = game;
      this.settings = {
        opening: game.openings[0].value,
        players: { first: 'human', second: 'mcts' },
        iterations: 1200
      };
      this.state = null;
      this.ui = {};
      this.history = [];
      this.logs = [];
      this.plannedActions = [];
      this.plannedPlayer = null;
      this.firstRate = .5;
      this.firstWinRate = .5;
      this.secondWinRate = .5;
      this.drawRate = 0;
      this.busy = false;
      this.animating = false;
      this.token = 0;
      this.animationSequence = 0;
      this.openingSnapshot = null;
      document.getElementById('app').innerHTML = shell(game);
      this.bindShell();
      this.renderSettings();
      this.newGame();
    }

    $(id) { return document.getElementById(id); }
    isHumanTurn() { return !this.busy && !this.animating && this.game.outcome(this.state) === null && this.settings.players[this.state.turn] === 'human'; }
    setUi(patch) { this.ui = { ...this.ui, ...patch }; this.render(); }
    previewUi(patch, action, duration = 260, done) {
      if (this.animating) return;
      this.animating = true;
      const animationSequence = ++this.animationSequence;
      this.animationAction = { ...action, duration };
      this.ui = { ...this.ui, ...patch };
      this.render();
      setTimeout(() => {
        if (animationSequence !== this.animationSequence) return;
        this.animating = false;
        if (done) done();
        else this.render();
      }, duration);
    }

    bindShell() {
      this.$('backHome').addEventListener('click', () => { location.href = '../../index.html'; });
      this.$('openSettings').addEventListener('click', () => this.open('settingsLayer'));
      this.$('openInfo').addEventListener('click', () => this.open('infoLayer'));
      this.$('newGame').addEventListener('click', () => this.newGame());
      this.$('undoMove').addEventListener('click', () => this.undo());
      this.$('applySettings').addEventListener('click', () => {
        this.settings.iterations = Math.max(100, Number(this.$('iterations').value) || 1200);
        this.close('settingsLayer');
        this.newGame();
      });
      document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => this.close(button.dataset.close)));
      document.querySelectorAll('.modal-layer').forEach((layer) => layer.addEventListener('click', (event) => { if (event.target === layer) this.close(layer.id); }));
      document.querySelectorAll('.tab-btn').forEach((button) => button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((item) => item.classList.toggle('active', item === button));
        document.querySelectorAll('.info-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${button.dataset.tab}`));
      }));
      this.$('gameList').innerHTML = GAME_LINKS.map(([id, label]) =>
        `<a class="list-btn ${id === this.gameId ? 'active' : ''}" href="../${id}/game.html">${label}</a>`).join('');
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') document.querySelectorAll('.modal-layer.open').forEach((layer) => this.close(layer.id));
      });
    }

    renderSettings() {
      this.$('openingSection').hidden = this.game.openings.length <= 1;
      this.$('openingOptions').innerHTML = this.game.openings.map((item) => `<button class="mode-card ${item.value === this.settings.opening ? 'selected' : ''}" data-opening="${item.value}">${item.label}</button>`).join('');
      this.$('openingOptions').querySelectorAll('[data-opening]').forEach((button) => button.addEventListener('click', () => {
        this.settings.opening = button.dataset.opening;
        this.renderSettings();
      }));
      document.querySelectorAll('.player-grid').forEach((grid) => {
        const side = grid.dataset.player;
        grid.innerHTML = PLAYER_TYPES.map((item) => `<button class="player-choice ${this.settings.players[side] === item.value ? 'selected' : ''}" data-type="${item.value}"><b class="player-type-icon ${item.icon}" aria-hidden="true"></b><span>${item.label}</span></button>`).join('');
        grid.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => {
          this.settings.players[side] = button.dataset.type;
          this.renderSettings();
        }));
      });
      this.$('iterations').value = this.settings.iterations;
      this.$('difficulty').innerHTML = PRESETS.map((item) => `<button class="difficulty-btn ${item.value === this.settings.iterations ? 'selected' : ''}" data-value="${item.value}">${item.label}</button>`).join('');
      this.$('difficulty').querySelectorAll('[data-value]').forEach((button) => button.addEventListener('click', () => {
        this.settings.iterations = Number(button.dataset.value);
        this.renderSettings();
      }));
    }

    open(id) { this.renderInfo(); this.$(id).classList.add('open'); }
    close(id) { this.$(id).classList.remove('open'); }

    newGame() {
      this.token += 1;
      this.animationSequence += 1;
      this.busy = false;
      this.animating = false;
      const created = this.game.create(this.settings.opening, this.openingSnapshot);
      this.state = created.state || created;
      if (created.snapshot) this.openingSnapshot = clone(created.snapshot);
      this.ui = {};
      this.history = [];
      this.plannedActions = [];
      this.plannedPlayer = null;
      this.logs = [`開始新對局：${this.game.openings.find((item) => item.value === this.settings.opening)?.label || '標準'}。`];
      this.firstRate = .5;
      this.firstWinRate = .5;
      this.secondWinRate = .5;
      this.drawRate = 0;
      this.render();
      this.scheduleTurn();
    }

    commit(action, source = 'human') {
      if (this.busy || this.game.outcome(this.state) !== null) return;
      if (source === 'human' && !this.isHumanTurn()) return;
      this.token += 1;
      this.animationSequence += 1;
      const before = clone(this.state);
      const previousUi = clone(this.ui);
      const historyUi = this.game.historyUi?.(previousUi, action) || previousUi;
      this.history.push({ state: before, ui: clone(historyUi), logLength: this.logs.length, firstRate: this.firstRate, firstWinRate: this.firstWinRate, secondWinRate: this.secondWinRate, drawRate: this.drawRate });
      this.state = this.game.apply(this.state, action);
      this.ui = this.game.nextUi?.(action, before, this.state, previousUi) || {};
      this.logs.push(this.game.describe(action, before, this.state));
      const duration = this.game.animationDuration?.(action) || 0;
      this.animationAction = { ...action, ...this.game.animationOptions?.(action), duration };
      this.animating = duration > 0;
      this.render();
      if (!duration) this.scheduleTurn();
      else {
        const token = this.token;
        setTimeout(() => {
          if (token !== this.token) return;
          this.animating = false;
          this.render();
          this.scheduleTurn();
        }, duration);
      }
    }

    undo() {
      if (this.busy || !this.history.length) return;
      this.token += 1;
      this.animationSequence += 1;
      this.animating = false;
      this.plannedActions = [];
      this.plannedPlayer = null;
      let entry = this.history.pop();
      while (this.history.length && this.settings.players[entry.state.turn] !== 'human') entry = this.history.pop();
      this.state = clone(entry.state);
      this.ui = clone(entry.ui);
      this.logs.length = entry.logLength;
      this.logs.push('已返回上一步。');
      this.firstRate = entry.firstRate ?? this.firstRate;
      this.firstWinRate = entry.firstWinRate ?? this.firstWinRate;
      this.secondWinRate = entry.secondWinRate ?? this.secondWinRate;
      this.drawRate = entry.drawRate ?? this.drawRate;
      this.render();
      this.scheduleTurn();
    }

    scheduleTurn() {
      const outcome = this.game.outcome(this.state);
      if (outcome !== null) {
        this.firstRate = outcome === 'draw' ? .5 : outcome === 'first' ? 1 : 0;
        this.firstWinRate = outcome === 'first' ? 1 : 0;
        this.secondWinRate = outcome === 'second' ? 1 : 0;
        this.drawRate = outcome === 'draw' ? 1 : 0;
        this.render();
        return;
      }
      const type = this.settings.players[this.state.turn];
      if (type !== 'human' && this.plannedPlayer === this.state.turn && this.plannedActions.length) {
        const action = this.plannedActions.shift();
        if (!this.plannedActions.length) this.plannedPlayer = null;
        const token = this.token;
        setTimeout(() => {
          if (token === this.token) this.commit(action, 'plan');
        }, 180);
        return;
      }
      if (this.plannedPlayer !== this.state.turn) {
        this.plannedActions = [];
        this.plannedPlayer = null;
      }
      if (type === 'human') {
        const scheduledToken = ++this.token;
        setTimeout(() => { if (scheduledToken === this.token) this.evaluatePosition(); }, 60);
      }
      else setTimeout(() => this.runComputer(type), 320);
    }

    async evaluatePosition() {
      const token = ++this.token;
      const result = await runMcts(this.game, this.state, Math.min(this.game.evaluationIterations || 40, Math.max(20, Math.round(this.settings.iterations / 50))), () => token === this.token);
      if (!result || token !== this.token) return;
      this.firstRate = result.firstRate;
      this.firstWinRate = result.firstWinRate;
      this.secondWinRate = result.secondWinRate;
      this.drawRate = result.drawRate;
      this.render();
    }

    async runComputer(type) {
      if (this.game.outcome(this.state) !== null || this.settings.players[this.state.turn] !== type) return;
      const actions = this.game.actions(this.state);
      if (!actions.length) return;
      this.busy = true;
      this.render();
      const token = ++this.token;
      let action;
      if (type === 'random') {
        const result = await runMcts(this.game, this.state, Math.min(this.game.evaluationIterations || 40, Math.max(20, Math.round(this.settings.iterations / 50))), () => token === this.token);
        if (!result || token !== this.token) return;
        this.firstRate = result.firstRate;
        this.firstWinRate = result.firstWinRate;
        this.secondWinRate = result.secondWinRate;
        this.drawRate = result.drawRate;
        action = pick(actions);
      } else {
        const result = await runMcts(this.game, this.state, this.settings.iterations, () => token === this.token);
        if (!result || token !== this.token) return;
        const plan = this.game.expandSearchAction?.(result.action) || [result.action];
        action = plan[0];
        this.plannedActions = plan.slice(1);
        this.plannedPlayer = this.plannedActions.length ? this.state.turn : null;
        this.firstRate = result.firstRate;
        this.firstWinRate = result.firstWinRate;
        this.secondWinRate = result.secondWinRate;
        this.drawRate = result.drawRate;
      }
      if (token !== this.token) return;
      this.busy = false;
      this.commit(action, type);
    }

    render() {
      const previousPieces = this.captureAnimatedPieces();
      const view = this.game.view(this.state, this.ui, this);
      const outcome = this.game.outcome(this.state);
      const rate = Math.max(0, Math.min(1, this.firstRate));
      const firstWinRate = Math.max(0, Math.min(1, this.firstWinRate));
      const secondWinRate = Math.max(0, Math.min(1, this.secondWinRate));
      const drawRate = Math.max(0, Math.min(1, this.drawRate));
      const threeWayWin = Boolean(view.threeWayWin);
      const phone = document.querySelector('.phone-app');
      const winColors = view.winColors || {};
      const turnColors = view.turnColors || {};
      phone.style.setProperty('--win-first', winColors.first || 'var(--first)');
      phone.style.setProperty('--win-second', winColors.second || 'var(--second)');
      phone.style.setProperty('--win-draw', winColors.draw || '#d9a441');
      phone.style.setProperty('--win-first-text', winColors.firstText || winColors.first || 'var(--first)');
      phone.style.setProperty('--win-second-text', winColors.secondText || winColors.second || 'var(--second)');
      phone.style.setProperty('--turn-first', turnColors.first || 'var(--first)');
      phone.style.setProperty('--turn-second', turnColors.second || 'var(--second)');
      phone.style.setProperty('--turn-first-text', turnColors.firstText || '#fff');
      phone.style.setProperty('--turn-second-text', turnColors.secondText || '#fff');
      this.$('firstWin').textContent = threeWayWin ? `${this.game.firstName} ${(firstWinRate * 100).toFixed(1)}%` : `${this.game.firstName}勝率${(rate * 100).toFixed(1)}%`;
      this.$('drawWin').textContent = `平手 ${(drawRate * 100).toFixed(1)}%`;
      this.$('secondWin').textContent = threeWayWin ? `${this.game.secondName} ${(secondWinRate * 100).toFixed(1)}%` : `${this.game.secondName}勝率${((1 - rate) * 100).toFixed(1)}%`;
      this.$('firstBar').style.width = `${(threeWayWin ? firstWinRate : rate) * 100}%`;
      this.$('drawBar').style.width = `${threeWayWin ? drawRate * 100 : 0}%`;
      this.$('secondBar').style.width = `${(threeWayWin ? secondWinRate : 1 - rate) * 100}%`;
      this.$('drawWin').hidden = !threeWayWin;
      this.$('drawBar').hidden = !threeWayWin;
      this.$('firstWin').parentElement.classList.toggle('three-way', threeWayWin);
      this.$('firstBar').parentElement.classList.toggle('three-way', threeWayWin);
      this.$('firstScore').className = `score-card first ${this.state.turn === 'first' && !outcome ? 'current' : ''}`;
      this.$('secondScore').className = `score-card second ${this.state.turn === 'second' && !outcome ? 'current' : ''}`;
      this.$('firstScore').innerHTML = view.firstScore;
      this.$('secondScore').innerHTML = view.secondScore;
      this.$('scoreRow').hidden = Boolean(view.hideScores);
      this.$('scoreRow').classList.toggle('compact', Boolean(view.compactScores));
      this.$('board').className = `board cols-${view.cols} ${view.boardClass || ''}`;
      this.$('board').style.setProperty('--board-cols', view.cols);
      this.$('board').style.setProperty('--board-rows', view.rows || view.cols);
      this.$('board').innerHTML = view.board;
      this.$('choiceTray').hidden = Boolean(view.hideTray);
      this.$('choiceTray').innerHTML = view.hideTray ? '' : view.tray || '<span>本回合直接操作棋盤</span>';
      this.$('turnCard').className = `turn-card ${outcome ? 'finished' : this.state.turn === 'second' ? 'second' : ''}`;
      this.$('turnCard').textContent = this.busy ? `${this.state.turn === 'first' ? this.game.firstName : this.game.secondName}思考中…` : view.hint;
      this.$('undoMove').disabled = this.busy || this.animating || !this.history.length;
      this.$('desktopStatus').innerHTML = `<strong>${view.hint}</strong><br>AI：純 MCTS 隨機模擬<br>迭代：${this.settings.iterations.toLocaleString()} 次`;
      this.game.bind(this.state, this.ui, this, this.$('board'), this.$('choiceTray'));
      this.animatePieces(previousPieces, this.animationAction);
      this.animationAction = null;
      this.renderInfo();
    }

    captureAnimatedPieces() {
      const app = document.getElementById('app');
      if (!app) return new Map();
      return new Map([...app.querySelectorAll('[data-anim-id]')].map((element) => {
        const rect = element.getBoundingClientRect();
        const cell = element.closest('[data-r][data-c]');
        return [element.dataset.animId, { rect, clone: element.cloneNode(true), r: Number(cell?.dataset.r), c: Number(cell?.dataset.c) }];
      }));
    }

    animatePieces(previous, action) {
      if (action?.previewed || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const current = new Map([...document.getElementById('app').querySelectorAll('[data-anim-id]')].map((element) => [element.dataset.animId, element]));
      current.forEach((element, id) => {
        const old = previous.get(id);
        if (!old) {
          element.animate([{ opacity: 0, transform: 'scale(.72)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
          return;
        }
        const next = element.getBoundingClientRect();
        const dx = old.rect.left - next.left;
        const dy = old.rect.top - next.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        let frames = [{ transform: `translate(${dx}px, ${dy}px) scale(1.04)`, zIndex: 20 }, { transform: 'translate(0, 0) scale(1)', zIndex: 20 }];
        let duration = action?.duration || 360;
        if (Array.isArray(action?.path) && (id.startsWith('torii-spirit-') || id.startsWith('fmg-'))) {
          frames = [{ transform: `translate(${dx}px, ${dy}px) scale(1.04)`, zIndex: 20 }];
          action.path.forEach((pos) => {
            const cell = this.$('board').querySelector(`[data-r="${pos.r}"][data-c="${pos.c}"]`);
            const rect = cell?.getBoundingClientRect();
            if (rect) frames.push({ transform: `translate(${rect.left + rect.width / 2 - next.left - next.width / 2}px, ${rect.top + rect.height / 2 - next.top - next.height / 2}px) scale(1.04)`, zIndex: 20 });
          });
          duration = action?.duration || Math.max(260, action.path.length * (action.stepDuration || 220));
        }
        element.animate(frames, { duration, easing: action?.spring ? 'cubic-bezier(.22,1,.36,1)' : 'ease-in-out' });
      });
      previous.forEach((old, id) => {
        if (current.has(id)) return;
        const ghost = old.clone;
        ghost.classList.add('piece-ghost');
        Object.assign(ghost.style, { position: 'fixed', left: `${old.rect.left}px`, top: `${old.rect.top}px`, width: `${old.rect.width}px`, height: `${old.rect.height}px`, margin: 0, pointerEvents: 'none', zIndex: 50 });
        document.body.appendChild(ghost);
        const out = action?.to === 'out' && action.dir && action.from?.r === old.r && action.from?.c === old.c;
        const x = out ? action.dir.dc * old.rect.width * 2.5 : 0;
        const y = out ? action.dir.dr * old.rect.height * 2.5 : 0;
        ghost.animate([{ opacity: 1, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: `translate(${x}px,${y}px) scale(.65)` }], { duration: out ? 520 : 220, easing: 'ease-in', fill: 'forwards' }).finished.finally(() => ghost.remove());
      });
    }

    renderInfo() {
      if (!this.state) return;
      this.$('tab-log').innerHTML = `<section class="info-box"><h3>行動日誌</h3><ol class="log-list">${this.logs.map((line) => `<li>${line}</li>`).join('')}</ol></section>`;
      const ruleLink = this.game.ruleLink
        ? `<nav class="rules-actions" aria-label="規則文件"><a class="info-link" href="${this.game.ruleLink.href}" target="_blank" rel="noopener noreferrer">${this.game.ruleLink.label}</a></nav>`
        : '';
      this.$('tab-rules').innerHTML = `${this.game.rules.map((section) => `<section class="info-box"><h3>${section.title}</h3>${section.html}</section>`).join('')}${ruleLink}`;
      const nameZh = this.game.nameZh || this.game.title;
      const nameEn = this.game.nameEn || '';
      const nameRow = `<header class="game-name-row"><div class="game-name-card"><span>中文名稱</span><h2>${nameZh}</h2></div><div class="game-name-card"><span>English name</span><p>${nameEn}</p></div></header>`;
      const cover = this.game.cover ? `<img class="game-cover" src="${this.game.cover}" alt="${this.game.title} 遊戲封面">` : '';
      const links = (this.game.links || []).map((link) => `<a class="info-link" href="${link.href}" target="_blank" rel="noopener noreferrer">${link.label}</a>`).join('');
      const publisherLink = this.game.publisherLink
        ? `<div class="publisher-actions"><a class="info-link" href="${this.game.publisherLink.href}" target="_blank" rel="noopener noreferrer">${this.game.publisherLink.label}</a></div>`
        : '';
      const publisher = this.game.publisherHtml || `<p>${this.game.publisher}</p>`;
      this.$('tab-intro').innerHTML = `${nameRow}${cover}<section class="info-box"><h3>遊戲介紹</h3>${this.game.introHtml || `<p>${this.game.intro}</p>`}</section><section class="info-box"><h3>設計與美術</h3><p>${this.game.designer}</p></section><section class="info-box publisher-box"><h3>出版資訊</h3>${publisher}${publisherLink}</section>${links ? `<nav class="info-links" aria-label="遊戲相關連結">${links}</nav>` : ''}`;
    }
  }

  function runSelfTests(games) {
    const results = [];
    for (const [id, game] of Object.entries(games)) {
      try {
        const created = game.create(game.openings[0].value, null);
        const state = created.state || created;
        const actions = game.actions(state);
        if (!actions.length) throw new Error('初始狀態沒有合法行動');
        const next = game.apply(state, actions[0]);
        if (JSON.stringify(next) === JSON.stringify(state)) throw new Error('套用行動後狀態未改變');
        results.push({ id, ok: true, actions: actions.length });
      } catch (error) {
        results.push({ id, ok: false, error: error.message });
      }
    }
    return results;
  }

  window.GameCore = { clone, other, pick, key, samePos, GameController, runMcts, runSelfTests };
  window.addEventListener('DOMContentLoaded', () => {
    const gameId = document.body.dataset.game;
    const game = window.BOARD_GAMES?.[gameId];
    if (!game) throw new Error(`找不到遊戲：${gameId}`);
    window.gameApp = new GameController(gameId, game);
    window.runGameSelfTests = () => runSelfTests(window.BOARD_GAMES);
  });
}());
