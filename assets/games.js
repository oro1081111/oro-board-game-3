(function () {
  'use strict';

  const { clone, other, key, samePos } = window.GameCore;
  const games = {};
  const posText = (pos) => `第 ${pos.r + 1} 列第 ${pos.c + 1} 欄`;
  const scoreHtml = (value, label) => `<strong>${value}</strong><small>${label}</small>`;
  const scoreInline = (value, label) => `<span class="score-inline"><strong>${value}</strong><small>${label}</small></span>`;
  const cellButton = (r, c, classes, content, label) => `<button class="cell ${classes || ''}" data-r="${r}" data-c="${c}" aria-label="${label || posText({ r, c })}">${content || ''}</button>`;
  const inBounds = (r, c, rows, cols) => r >= 0 && r < rows && c >= 0 && c < cols;

  // ---------------------------------------------------------------------------
  // 花園棋 Mijnlieff
  // ---------------------------------------------------------------------------
  const MIJN_TYPES = ['straight', 'diagonal', 'push', 'pull'];
  const MIJN_MARKS = { straight: '＋', diagonal: '×', push: '●', pull: '○' };
  const MIJN_NAMES = { straight: '十字棋', diagonal: '交叉棋', push: '內圈棋', pull: '外圈棋' };

  function mijnBoard(mode) {
    const rows = 4;
    const cols = mode === 'A' ? 4 : mode === 'B' ? 5 : 6;
    return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
      if (mode === 'B') return (r < 2 && c === 0) || (r >= 2 && c === 4) ? false : null;
      if (mode === 'C') return (r === 0 || r === 3) && (c < 2 || c >= 4) ? false : null;
      return null;
    }));
  }

  function mijnHand() { return { straight: 2, diagonal: 2, push: 2, pull: 2 }; }
  function mijnHandTotal(hand) { return MIJN_TYPES.reduce((sum, type) => sum + hand[type], 0); }

  function mijnLegalCells(state) {
    const cells = [];
    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        if (state.board[r][c] !== null) continue;
        if (state.placed === 0) {
          const outer = r === 0 || r === state.rows - 1 || c === 0 || c === state.cols - 1;
          const specialB = state.mode === 'B' && ((r === 1 && c === 1) || (r === 2 && c === 3));
          const specialC = state.mode === 'C' && ((r === 1 || r === 2) && (c === 1 || c === 4));
          if (!outer && !specialB && !specialC) continue;
        } else if (state.last) {
          const dr = Math.abs(r - state.last.r);
          const dc = Math.abs(c - state.last.c);
          if (state.last.type === 'straight' && r !== state.last.r && c !== state.last.c) continue;
          if (state.last.type === 'diagonal' && dr !== dc) continue;
          if (state.last.type === 'push' && (dr > 1 || dc > 1)) continue;
          if (state.last.type === 'pull' && dr <= 1 && dc <= 1) continue;
        }
        cells.push({ r, c });
      }
    }
    return cells;
  }

  function mijnScores(state) {
    const scores = { first: 0, second: 0 };
    const lines = [];
    for (let r = 0; r < state.rows; r += 1) lines.push(Array.from({ length: state.cols }, (_, c) => ({ r, c })));
    for (let c = 0; c < state.cols; c += 1) lines.push(Array.from({ length: state.rows }, (_, r) => ({ r, c })));
    for (let r = 0; r < state.rows; r += 1) {
      for (const dc of [-1, 1]) {
        const line = [];
        for (let rr = r, cc = 0; inBounds(rr, cc, state.rows, state.cols); rr += dc, cc += 1) line.push({ r: rr, c: cc });
        if (line.length >= 3) lines.push(line);
      }
    }
    for (let c = 1; c < state.cols; c += 1) {
      for (const startRow of [0, state.rows - 1]) {
        const dr = startRow === 0 ? 1 : -1;
        const line = [];
        for (let r = startRow, cc = c; inBounds(r, cc, state.rows, state.cols); r += dr, cc += 1) line.push({ r, c: cc });
        if (line.length >= 3) lines.push(line);
      }
    }
    for (const line of lines) {
      let owner = null;
      let count = 0;
      for (let i = 0; i <= line.length; i += 1) {
        const piece = i < line.length ? state.board[line[i].r][line[i].c] : null;
        const nextOwner = piece && piece !== false ? piece.owner : null;
        if (nextOwner && nextOwner === owner) count += 1;
        else {
          if (owner && count === 3) scores[owner] += 1;
          else if (owner && count >= 4) scores[owner] += 2;
          owner = nextOwner;
          count = nextOwner ? 1 : 0;
        }
      }
    }
    return scores;
  }

  function mijnFinish(state) {
    const scores = mijnScores(state);
    state.finished = true;
    state.result = scores.first === scores.second ? 'draw' : scores.first > scores.second ? 'first' : 'second';
    return state;
  }

  games.mijnlieff = {
    title: '花園棋 Mijnlieff',
    credit: '設計者：Andy Hopwood，出版社：Taiwan Boardgame Design',
    firstName: '深色',
    secondName: '淺色',
    designer: 'Andy Hopwood。官方 Hopwood Games 頁面標示 Mijnlieff 為其設計，並以 Garden 推出新版。',
    publisher: '花園棋（Garden）英中版本由 Taiwan Boardgame Design 推出；早期 Mijnlieff 另有其他出版版本。',
    intro: '玩家放置四種效果棋，上一枚棋子的類型會限制對手下一枚棋的落點。遊戲結束後以三連線與四連線計分。',
    openings: [{ value: 'A', label: '經典 A' }, { value: 'B', label: '缺角 B' }, { value: 'C', label: '工字 C' }],
    rolloutLimit: 40,
    rules: [
      { title: '回合流程', html: '<ol><li>選擇手上仍有的棋子。</li><li>依上一枚棋子的效果放到合法空格。</li><li>十字限制同行或同列；交叉限制同斜線；內圈限制相鄰；外圈限制非相鄰。</li></ol>' },
      { title: '跳過與結束', html: '<p>輪到玩家時若手上沒有棋，立即結束遊戲。若仍有棋但沒有合法落點才跳過，並清除落點限制。雙方連續無法落子時也結束。</p>' },
      { title: '計分', html: '<p>橫、直、斜連續 3 枚得 1 分；連續 4 枚以上得 2 分。高分者勝，同分和局。</p>' }
    ],
    create(mode) {
      return {
        turn: 'first', mode, rows: 4, cols: mode === 'A' ? 4 : mode === 'B' ? 5 : 6,
        board: mijnBoard(mode), hands: { first: mijnHand(), second: mijnHand() },
        last: null, placed: 0, passed: false, finished: false, result: null
      };
    },
    actions(state) {
      if (this.outcome(state) !== null) return [];
      const cells = mijnLegalCells(state);
      const actions = [];
      for (const type of MIJN_TYPES) if (state.hands[state.turn][type] > 0) for (const pos of cells) actions.push({ type: 'place', piece: type, ...pos });
      return actions.length ? actions : [{ type: 'skip' }];
    },
    apply(source, action) {
      const state = clone(source);
      if (action.type === 'skip') {
        if (state.passed) return mijnFinish(state);
        state.turn = other(state.turn);
        state.last = null;
        state.passed = true;
      } else {
        state.board[action.r][action.c] = { owner: state.turn, type: action.piece };
        state.hands[state.turn][action.piece] -= 1;
        state.last = { r: action.r, c: action.c, type: action.piece };
        state.placed += 1;
        state.passed = false;
        state.turn = other(state.turn);
      }
      if (mijnHandTotal(state.hands[state.turn]) === 0) return mijnFinish(state);
      return state;
    },
    outcome(state) { return state.finished ? state.result : null; },
    describe(action, before) {
      const actor = before.turn === 'first' ? '深色玩家' : '淺色玩家';
      return action.type === 'skip' ? `${actor}沒有合法落點，跳過回合。` : `${actor}將${MIJN_NAMES[action.piece]}放在${posText(action)}。`;
    },
    view(state, ui) {
      const scores = mijnScores(state);
      const selected = ui.pieceType;
      const legal = new Set(this.actions(state).filter((action) => action.type === 'place' && (!selected || action.piece === selected)).map((action) => key(action.r, action.c)));
      let board = '';
      for (let r = 0; r < state.rows; r += 1) for (let c = 0; c < state.cols; c += 1) {
        const item = state.board[r][c];
        if (item === false) board += cellButton(r, c, 'blocked', '', '不可用格');
        else {
          const piece = item ? `<span class="piece mijn-piece ${item.owner === 'first' ? 'dark' : 'light'}" data-anim-id="mijn-${r}-${c}"><span class="piece-mark mark-${item.type}">${MIJN_MARKS[item.type]}</span></span>` : '';
          board += cellButton(r, c, legal.has(key(r, c)) ? 'legal' : '', piece);
        }
      }
      const handPanel = (owner) => `<section class="choice-zone mijn-hand ${owner} ${state.turn === owner ? 'active' : ''}" aria-label="${owner === 'first' ? '深色' : '淺色'}剩餘棋子"><div>${MIJN_TYPES.map((type) => `<button class="tray-btn mijn-token ${state.turn === owner && selected === type ? 'selected' : ''}" data-piece="${type}" data-owner="${owner}" ${state.turn === owner && state.hands[owner][type] ? '' : 'disabled'}><span class="piece-mark mark-${type}">${MIJN_MARKS[type]}</span><small>×${state.hands[owner][type]}</small></button>`).join('')}</div></section>`;
      const tray = `<div class="dual-choice">${handPanel('first')}${handPanel('second')}</div>`;
      const outcome = this.outcome(state);
      const hint = outcome ? outcome === 'draw' ? '遊戲結束：雙方平手' : `遊戲結束：${outcome === 'first' ? '深色' : '淺色'}玩家獲勝` : `現在是${state.turn === 'first' ? '深色' : '淺色'}玩家的回合，請先選棋子`;
      return {
        cols: state.cols, rows: state.rows, board, tray, hint,
        compactScores: true, threeWayWin: true,
        winColors: { first: '#2d2a2e', draw: '#d9a441', second: '#ebe7db', secondText: '#77746d' },
        turnColors: { first: '#2d2a2e', second: '#ebe7db', secondText: '#2d2a2e' },
        firstScore: scoreInline(scores.first, '分'), secondScore: scoreInline(scores.second, '分')
      };
    },
    bind(state, ui, controller, board, tray) {
      tray.querySelectorAll(`[data-piece][data-owner="${state.turn}"]`).forEach((button) => button.addEventListener('click', () => controller.setUi({ pieceType: button.dataset.piece })));
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn() || !ui.pieceType) return;
        const r = Number(button.dataset.r), c = Number(button.dataset.c);
        const action = this.actions(state).find((item) => item.type === 'place' && item.piece === ui.pieceType && item.r === r && item.c === c);
        if (action) controller.commit(action);
      }));
      const only = this.actions(state);
      if (controller.isHumanTurn() && only.length === 1 && only[0].type === 'skip') setTimeout(() => controller.commit(only[0]), 250);
    }
  };

  // ---------------------------------------------------------------------------
  // 聖托里尼 Santorini
  // ---------------------------------------------------------------------------
  const around = (pos, size = 5) => {
    const result = [];
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = pos.r + dr, c = pos.c + dc;
      if (inBounds(r, c, size, size)) result.push({ r, c });
    }
    return result;
  };
  const workerAt = (state, pos) => state.workers.find((worker) => samePos(worker.pos, pos));
  function santoriniMoves(state, worker) {
    return around(worker.pos).filter((pos) => !workerAt(state, pos) && state.board[pos.r][pos.c] < 4 && state.board[pos.r][pos.c] - state.board[worker.pos.r][worker.pos.c] <= 1);
  }
  function santoriniBuilds(state, workerId, move) {
    return around(move).filter((pos) => {
      if (state.board[pos.r][pos.c] >= 4) return false;
      return !state.workers.some((worker) => worker.id !== workerId ? samePos(worker.pos, pos) : samePos(move, pos));
    });
  }
  function santoriniAllMoves(state, player = state.turn) {
    const result = [];
    for (const worker of state.workers.filter((item) => item.owner === player)) {
      for (const move of santoriniMoves(state, worker)) {
        if (state.board[move.r][move.c] === 3) result.push({ type: 'turn', workerId: worker.id, move, build: null });
        else for (const build of santoriniBuilds(state, worker.id, move)) result.push({ type: 'turn', workerId: worker.id, move, build });
      }
    }
    return result;
  }
  function santoriniPositionScore(state, owner) {
    let score = 0;
    for (const worker of state.workers.filter((item) => item.owner === owner)) {
      const height = state.board[worker.pos.r][worker.pos.c];
      score += [1, 18, 70, 10000][height] || 0;
      score += santoriniMoves(state, worker).length * 2;
      score += 4 - (Math.abs(worker.pos.r - 2) + Math.abs(worker.pos.c - 2)) * .4;
      for (const next of santoriniMoves(state, worker)) if (state.board[next.r][next.c] === 3) score += 500;
    }
    return score;
  }
  function santoriniHeuristic(state, owner) {
    if (state.winner) return state.winner === owner ? 1 : 0;
    const mine = santoriniPositionScore(state, owner);
    const theirs = santoriniPositionScore(state, other(owner));
    return Math.max(.03, Math.min(.97, .5 + (mine - theirs) / (Math.abs(mine) + Math.abs(theirs) + 80)));
  }

  games.santorini = {
    title: '聖托里尼 Santorini',
    credit: '設計者：Gordon Hamilton，出版社：Roxley Games',
    firstName: '紅方', secondName: '藍方',
    designer: 'Gordon Hamilton。', publisher: 'Roxley Games；本頁採用不含神力的基本規則。',
    intro: '雙方各控制兩名工人，每回合移動一名工人並在相鄰格建築。登上第三層或封鎖對手即可獲勝。',
    openings: [{ value: 'standard', label: '標準空盤' }], rolloutLimit: 70,
    animationDuration(action) { return action.type === 'place' ? 220 : action.previewed ? 240 : 420; },
    animationOptions() { return { spring: true }; },
    rules: [
      { title: '初始設置', html: '<p>紅方先放置兩名工人，接著藍方放置兩名工人，再由紅方開始第一回合。</p>' },
      { title: '完整回合', html: '<ol><li>選自己一名工人。</li><li>往周圍八格移動一格，最多向上爬一層。</li><li>在移動後的工人周圍八格建築一層。</li></ol>' },
      { title: '勝利', html: '<p>工人移動到第三層立即勝利；或完成建築後使對手沒有任何合法移動，也立即勝利。</p>' }
    ],
    create() { return { turn: 'first', board: Array.from({ length: 5 }, () => Array(5).fill(0)), workers: [], phase: 'placement', winner: null }; },
    actions(state) {
      if (state.winner) return [];
      if (state.phase === 'placement') {
        const actions = [];
        for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) if (!workerAt(state, { r, c })) actions.push({ type: 'place', r, c });
        return actions;
      }
      return santoriniAllMoves(state);
    },
    rolloutAction(state, actions) {
      const immediate = actions.find((action) => action.type === 'turn' && state.board[action.move.r][action.move.c] === 3);
      if (immediate) return immediate;
      const sample = [];
      const count = Math.min(3, actions.length);
      while (sample.length < count) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        if (!sample.includes(action)) sample.push(action);
      }
      const actor = state.turn;
      return sample.reduce((best, action) => santoriniHeuristic(this.apply(state, action), actor) > santoriniHeuristic(this.apply(state, best), actor) ? action : best);
    },
    cutoffReward(state, rootPlayer) { return santoriniHeuristic(state, rootPlayer); },
    apply(source, action) {
      const state = clone(source);
      if (action.type === 'place') {
        state.workers.push({ id: `w${state.workers.length}`, owner: state.turn, pos: { r: action.r, c: action.c } });
        if (state.workers.length === 2) state.turn = 'second';
        if (state.workers.length === 4) { state.turn = 'first'; state.phase = 'move'; }
        return state;
      }
      const worker = state.workers.find((item) => item.id === action.workerId);
      worker.pos = clone(action.move);
      if (state.board[action.move.r][action.move.c] === 3) { state.winner = state.turn; return state; }
      state.board[action.build.r][action.build.c] += 1;
      const actor = state.turn;
      state.turn = other(state.turn);
      if (!santoriniAllMoves(state).length) state.winner = actor;
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before) {
      const actor = before.turn === 'first' ? '紅方' : '藍方';
      if (action.type === 'place') return `${actor}將工人放在${posText(action)}。`;
      return `${actor}移動工人到${posText(action.move)}${action.build ? `，並在${posText(action.build)}建築` : '並登上第三層'}。`;
    },
    view(state, ui) {
      const all = this.actions(state);
      const moves = ui.workerId ? all.filter((action) => action.workerId === ui.workerId) : [];
      const movableWorkers = new Set(all.map((action) => action.workerId).filter(Boolean));
      const moveKeys = new Set(moves.map((action) => key(action.move.r, action.move.c)));
      const buildKeys = new Set(ui.move ? moves.filter((action) => samePos(action.move, ui.move) && action.build).map((action) => key(action.build.r, action.build.c)) : []);
      const visualWorkerAt = (pos) => state.workers.find((worker) => samePos(worker.id === ui.workerId && ui.move ? ui.move : worker.pos, pos));
      let board = '';
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
        const height = state.board[r][c];
        const worker = visualWorkerAt({ r, c });
        const building = height ? `<span class="santorini-building">${Array.from({ length: height }, (_, level) => `<i class="santorini-level ${level === 3 ? 'dome' : ''}" data-anim-id="santorini-building-${r}-${c}-${level}" style="--level:${level}"></i>`).join('')}</span>` : '';
        const piece = worker ? `<span class="piece worker santorini-worker ${worker.owner}" data-anim-id="${worker.id}" style="--height:${height}"><span class="worker-head"></span><span class="worker-body"></span></span>` : '';
        let classes = '';
        if (state.phase === 'move' && !ui.workerId && worker?.owner === state.turn && movableWorkers.has(worker.id)) classes = 'legal';
        if (ui.workerId && worker?.id === ui.workerId) classes = 'selected';
        if (!ui.move && moveKeys.has(key(r, c))) classes = 'legal';
        if (ui.move && buildKeys.has(key(r, c))) classes = 'legal';
        board += cellButton(r, c, classes, building + piece);
      }
      const outcome = this.outcome(state);
      let hint;
      if (outcome) hint = `遊戲結束：${outcome === 'first' ? '紅方' : '藍方'}獲勝`;
      else if (state.phase === 'placement') hint = `${state.turn === 'first' ? '紅方' : '藍方'}請放置工人`;
      else if (!ui.workerId) hint = `${state.turn === 'first' ? '紅方' : '藍方'}請選擇工人`;
      else if (!ui.move) hint = '請選擇移動位置';
      else hint = '請選擇建築位置';
      const boardMode = state.phase === 'placement' ? 'placement' : ui.move ? 'build' : ui.workerId ? 'move' : 'worker';
      return { cols: 5, rows: 5, boardClass: `santorini-board santorini-${boardMode}`, board, hideScores: true, hideTray: true, hint, firstScore: '', secondScore: '' };
    },
    bind(state, ui, controller, board) {
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const pos = { r: Number(button.dataset.r), c: Number(button.dataset.c) };
        if (state.phase === 'placement') {
          const action = this.actions(state).find((item) => item.r === pos.r && item.c === pos.c);
          if (action) controller.commit(action);
          return;
        }
        const actions = this.actions(state).filter((action) => action.workerId === ui.workerId);
        if (ui.move) {
          const action = actions.find((item) => samePos(item.move, ui.move) && samePos(item.build, pos));
          if (action) controller.commit({ ...action, previewed: true });
          return;
        }
        const worker = workerAt(state, pos);
        if (worker?.owner === state.turn) {
          if (this.actions(state).some((action) => action.workerId === worker.id)) controller.setUi({ workerId: worker.id, move: null });
          return;
        }
        const candidates = actions.filter((action) => samePos(action.move, pos));
        if (!candidates.length) return;
        const chosen = candidates[0];
        const finishMove = chosen.build === null ? () => controller.commit({ ...chosen, previewed: true }) : null;
        controller.previewUi({ move: pos }, { spring: true }, 360, finishMove);
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // 殭屍棋 JUMP
  // ---------------------------------------------------------------------------
  const zombieTotal = (piece) => piece.stack.reduce((sum, tier) => sum + tier, 0);
  const zombiePiece = (owner, tier, id) => ({ id, owner, stack: [tier] });
  function zombieCanStack(moving, target) {
    const m = zombieTotal(moving), t = zombieTotal(target);
    const movingStack = moving.stack.length > 1, targetStack = target.stack.length > 1;
    if (!targetStack) {
      if (m === 1) return t === 2 || t === 3;
      if (m === 2) return t === 3;
      if (movingStack && m === 3 && t === 3) return true;
    } else if (m === 1 && t === 5) return true;
    return false;
  }
  function zombieMoves(state, from) {
    const piece = state.board[from.r][from.c];
    if (!piece) return [];
    const result = [];
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const r = from.r + dr, c = from.c + dc;
      if (!inBounds(r, c, 5, 5)) continue;
      const target = state.board[r][c];
      if (!target || target.owner === piece.owner && zombieCanStack(piece, target)) result.push({ r, c });
    }
    return result;
  }
  function zombieJumps(state, from, excluded = []) {
    const piece = state.board[from.r][from.c];
    if (!piece) return [];
    const result = [];
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let r = from.r + dr, c = from.c + dc;
      const jumped = [];
      let total = 0, score = 0;
      if (!inBounds(r, c, 5, 5) || !state.board[r][c]) continue;
      while (inBounds(r, c, 5, 5) && state.board[r][c]) {
        const over = state.board[r][c];
        if (jumped.length && total <= zombieTotal(piece) && over.owner === piece.owner && zombieCanStack(piece, over) && !excluded.some((pos) => pos.r === r && pos.c === c)) {
          result.push({ type: 'jump', from: clone(from), to: { r, c }, jumped: clone(jumped), score, dir: { dr, dc } });
        }
        jumped.push({ r, c });
        total += zombieTotal(over);
        if (over.owner !== piece.owner) score += zombieTotal(over);
        r += dr; c += dc;
      }
      if (total > zombieTotal(piece)) continue;
      if (!inBounds(r, c, 5, 5)) result.push({ type: 'jump', from: clone(from), to: 'out', jumped, score, dir: { dr, dc } });
      else if (!excluded.some((pos) => pos.r === r && pos.c === c)) result.push({ type: 'jump', from: clone(from), to: { r, c }, jumped, score, dir: { dr, dc } });
    }
    return result;
  }
  function zombieCombine(moving, target) { return { id: moving.id, owner: moving.owner, stack: [...target.stack, ...moving.stack] }; }

  function zombieRolloutWeight(action) {
    if (action.type === 'jump') return 1.5 + (action.score || 0) * 4;
    if (action.type === 'stop') return 0.25;
    if (action.type === 'revive') return 0.8;
    return 1;
  }

  games['zombie-jump'] = {
    title: '殭屍棋 JUMP', credit: '設計者：來源未載，出版社：來源未載',
    firstName: '紅方', secondName: '藍方', designer: '1.0 與 2.0 參考程式未記載設計者。', publisher: '1.0 與 2.0 參考程式未記載出版社。',
    intro: '玩家讓殭屍復活、移動、堆疊與跳躍。跳過對手殭屍可依等級得分，先得到 8 分獲勝。',
    openings: [{ value: 'standard', label: '標準設置' }], rolloutLimit: 90,
    animationDuration(action) { return action.type === 'stop' ? 0 : action.to === 'out' ? 520 : 380; },
    animationOptions() { return { spring: true }; },
    immediateAction(state, actions) {
      return actions.find((action) => action.type === 'jump' && state.scores[state.turn] + (action.score || 0) >= 8);
    },
    rolloutAction(state, actions) {
      const winningJump = this.immediateAction(state, actions);
      if (winningJump) return winningJump;

      let total = 0;
      for (const action of actions) {
        total += zombieRolloutWeight(action);
      }
      let target = Math.random() * total;
      for (const action of actions) {
        target -= zombieRolloutWeight(action);
        if (target < 0) return action;
      }
      return actions[actions.length - 1];
    },
    rules: [
      { title: '三種行動', html: '<p>每回合可從陰間復活一枚棋、將棋往正交相鄰格移動，或沿正交方向跳過一串連續棋。</p>' },
      { title: '堆疊', html: '<p>等級 1 可疊上單枚 2 或 3；等級 2 可疊上單枚 3；由單枚 1 與單枚 2 組成的總等級 3 堆疊可疊上單枚 3；等級 1 可疊上總等級 5 的堆疊。</p>' },
      { title: '跳躍與勝利', html: '<p>被跳過棋的總等級不得超過跳躍棋。對手棋拆回對手陰間並計分；跳出盤外的己方棋拆回己方陰間。跳後可連跳或停止，先得 8 分勝。</p>' }
    ],
    create() {
      const board = Array.from({ length: 5 }, () => Array(5).fill(null));
      let nextId = 0;
      const piece = (owner, tier) => zombiePiece(owner, tier, `z${nextId++}`);
      board[0][0] = piece('second', 2); board[0][2] = piece('second', 3); board[0][4] = piece('second', 2);
      for (let c = 0; c < 5; c += 1) board[1][c] = piece('second', 1);
      for (let c = 0; c < 5; c += 1) board[3][c] = piece('first', 1);
      board[4][0] = piece('first', 2); board[4][2] = piece('first', 3); board[4][4] = piece('first', 2);
      return { turn: 'first', board, waiting: { first: [piece('first', 2), piece('first', 2)], second: [piece('second', 2), piece('second', 2)] }, scores: { first: 0, second: 0 }, continuing: null, path: [], winner: null, nextId };
    },
    actions(state) {
      if (state.winner) return [];
      if (state.continuing) return [{ type: 'stop' }, ...zombieJumps(state, state.continuing, state.path)];
      const result = [];
      const tiers = [...new Set(state.waiting[state.turn].map((piece) => piece.stack[0]))];
      for (const tier of tiers) for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) if (!state.board[r][c]) result.push({ type: 'revive', tier, to: { r, c } });
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
        if (state.board[r][c]?.owner !== state.turn) continue;
        const from = { r, c };
        for (const to of zombieMoves(state, from)) result.push({ type: 'move', from, to });
        result.push(...zombieJumps(state, from));
      }
      return result;
    },
    apply(source, action) {
      const state = clone(source);
      if (action.type === 'stop') { state.turn = other(state.turn); state.continuing = null; state.path = []; return state; }
      if (action.type === 'revive') {
        const index = state.waiting[state.turn].findIndex((piece) => piece.stack[0] === action.tier);
        state.board[action.to.r][action.to.c] = state.waiting[state.turn].splice(index, 1)[0];
        state.turn = other(state.turn);
        return state;
      }
      if (action.type === 'move') {
        const piece = state.board[action.from.r][action.from.c];
        const target = state.board[action.to.r][action.to.c];
        state.board[action.from.r][action.from.c] = null;
        state.board[action.to.r][action.to.c] = target ? zombieCombine(piece, target) : piece;
        state.turn = other(state.turn);
        return state;
      }
      const piece = state.board[action.from.r][action.from.c];
      state.board[action.from.r][action.from.c] = null;
      for (const pos of action.jumped) {
        const over = state.board[pos.r][pos.c];
        if (over && over.owner !== state.turn) {
          state.waiting[over.owner].push(...over.stack.map((tier) => zombiePiece(over.owner, tier, `z${state.nextId++}`)));
          state.board[pos.r][pos.c] = null;
        }
      }
      state.scores[state.turn] += action.score;
      if (action.to === 'out') {
        state.waiting[state.turn].push(...piece.stack.map((tier) => zombiePiece(state.turn, tier, `z${state.nextId++}`)));
        state.turn = other(state.turn);
        state.continuing = null;
        state.path = [];
      } else {
        const target = state.board[action.to.r][action.to.c];
        state.board[action.to.r][action.to.c] = target ? zombieCombine(piece, target) : piece;
        const excluded = [...state.path, action.from];
        const more = target ? [] : zombieJumps(state, action.to, excluded);
        if (more.length) { state.continuing = clone(action.to); state.path = excluded; }
        else { state.turn = other(state.turn); state.continuing = null; state.path = []; }
      }
      if (state.scores.first >= 8) state.winner = 'first';
      if (state.scores.second >= 8) state.winner = 'second';
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before) {
      const actor = before.turn === 'first' ? '紅方' : '藍方';
      if (action.type === 'stop') return `${actor}停止連跳。`;
      if (action.type === 'revive') return `${actor}復活等級 ${action.tier} 棋到${posText(action.to)}。`;
      if (action.type === 'move') return `${actor}移動到${posText(action.to)}。`;
      return `${actor}跳躍${action.to === 'out' ? '出棋盤' : `到${posText(action.to)}`}，得到 ${action.score} 分。`;
    },
    view(state, ui) {
      const selected = state.continuing || ui.selectedPos;
      const waitTier = ui.waitTier;
      const legal = this.actions(state);
      const targets = new Set(legal.filter((action) => {
        if (!action.to || action.to === 'out') return false;
        if (waitTier) return action.type === 'revive' && action.tier === waitTier;
        if (selected) return (action.type === 'move' || action.type === 'jump') && samePos(action.from, selected);
        return false;
      }).map((action) => key(action.to.r, action.to.c)));
      let board = '';
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
        const piece = state.board[r][c];
        const total = piece ? zombieTotal(piece) : '';
        const outActions = selected && samePos(selected, { r, c }) ? legal.filter((action) => action.type === 'jump' && action.to === 'out' && samePos(action.from, selected)) : [];
        const outControls = outActions.map((action) => `<span class="zombie-out dr-${action.dir.dr} dc-${action.dir.dc}" role="button" tabindex="0" data-out data-from-r="${r}" data-from-c="${c}" data-dr="${action.dir.dr}" data-dc="${action.dir.dc}" aria-label="跳出棋盤">${action.dir.dr < 0 ? '↑' : action.dir.dr > 0 ? '↓' : action.dir.dc < 0 ? '←' : '→'}</span>`).join('');
        const stopControl = state.continuing && samePos(selected, { r, c }) ? '<span class="zombie-stop" role="button" tabindex="0" data-stop aria-label="停止連跳">■</span>' : '';
        const content = piece ? `<span class="piece zombie-piece ${piece.owner}" data-anim-id="${piece.id}">${piece.stack.map((tier, index) => `<i style="--stack:${index}">${index === piece.stack.length - 1 ? total : ''}</i>`).join('')}<span class="stack-list">${piece.stack.join('+')}</span>${stopControl}</span>${outControls}` : '';
        const classes = samePos(selected, { r, c }) ? 'selected' : targets.has(key(r, c)) ? 'legal' : '';
        board += cellButton(r, c, classes, content);
      }
      const waitingZone = (owner, label) => {
        const groups = [...new Set(state.waiting[owner].map((piece) => piece.stack[0]))].map((tier) => {
          const pieces = state.waiting[owner].filter((piece) => piece.stack[0] === tier);
          return `<button class="tray-btn zombie-wait-piece ${state.turn === owner && waitTier === tier ? 'selected' : ''}" data-anim-id="${pieces[0].id}" data-wait="${tier}" data-owner="${owner}" ${state.turn === owner ? '' : 'disabled'}><span>${tier}</span>${pieces.length > 1 ? `<small class="piece-count">${pieces.length}</small>` : ''}</button>`;
        }).join('');
        return `<section class="choice-zone zombie-wait ${state.turn === owner ? 'active' : ''}" aria-label="${label}陰間"><div>${groups}</div></section>`;
      };
      const tray = `<div class="dual-choice">${waitingZone('first', '紅方')}${waitingZone('second', '藍方')}</div>`;
      const outcome = this.outcome(state);
      let hint = outcome ? `遊戲結束：${outcome === 'first' ? '紅方' : '藍方'}獲勝` : state.continuing ? '可繼續跳躍，或選擇停止連跳' : `${state.turn === 'first' ? '紅方' : '藍方'}請選擇復活、移動或跳躍`;
      return { cols: 5, rows: 5, boardClass: 'zombie-board', board, tray, hint, compactScores: true, firstScore: scoreInline(`${state.scores.first} / 8`, '分'), secondScore: scoreInline(`${state.scores.second} / 8`, '分') };
    },
    bind(state, ui, controller, board, tray) {
      tray.querySelectorAll(`[data-wait][data-owner="${state.turn}"]`).forEach((button) => button.addEventListener('click', () => controller.setUi({ waitTier: Number(button.dataset.wait), selectedPos: null })));
      board.querySelector('[data-stop]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (controller.isHumanTurn()) controller.commit({ type: 'stop' });
      });
      board.querySelectorAll('[data-out]').forEach((button) => button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!controller.isHumanTurn()) return;
        const from = { r: Number(button.dataset.fromR), c: Number(button.dataset.fromC) };
        const action = this.actions(state).find((item) => item.type === 'jump' && item.to === 'out' && samePos(item.from, from) && item.dir.dr === Number(button.dataset.dr) && item.dir.dc === Number(button.dataset.dc));
        if (action) controller.commit(action);
      }));
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const pos = { r: Number(button.dataset.r), c: Number(button.dataset.c) };
        const piece = state.board[pos.r][pos.c];
        const selected = state.continuing || ui.selectedPos;
        let action;
        if (ui.waitTier) action = this.actions(state).find((item) => item.type === 'revive' && item.tier === ui.waitTier && samePos(item.to, pos));
        else if (selected) action = this.actions(state).find((item) => (item.type === 'move' || item.type === 'jump') && samePos(item.from, selected) && item.to !== 'out' && samePos(item.to, pos));
        if (action) { controller.commit(action); return; }
        if (!state.continuing && piece?.owner === state.turn) controller.setUi({ selectedPos: pos, waitTier: null });
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // 四色棋 Four Color Chess
  // ---------------------------------------------------------------------------
  const FCG_COLORS = ['red', 'blue', 'yellow', 'green'];
  const FCG_NAMES = { red: '紅', blue: '藍', yellow: '黃', green: '綠' };
  const FCG_STANDARD = [
    ['red', 'blue', 'yellow', 'green'],
    ['blue', 'red', 'green', 'yellow'],
    ['yellow', 'green', 'red', 'blue'],
    ['green', 'yellow', 'blue', 'red']
  ];
  function fcgRandomPattern() {
    const symbols = [...FCG_COLORS].sort(() => Math.random() - .5);
    const rows = [0, 1, 2, 3].sort(() => Math.random() - .5);
    const cols = [0, 1, 2, 3].sort(() => Math.random() - .5);
    return rows.map((r) => cols.map((c) => symbols[FCG_COLORS.indexOf(FCG_STANDARD[r][c])]));
  }
  function fcgPieces(pattern) {
    const pieces = { first: {}, second: {} };
    for (const color of FCG_COLORS) {
      pieces.second[color] = { r: 0, c: pattern[0].indexOf(color) };
      pieces.first[color] = { r: 3, c: pattern[3].indexOf(color) };
    }
    return pieces;
  }
  function fcgOccupied(state, pos) {
    for (const owner of ['first', 'second']) for (const color of FCG_COLORS) if (samePos(state.pieces[owner][color], pos)) return { owner, color };
    return null;
  }
  function fcgMoves(state, owner, color) {
    const from = state.pieces[owner][color];
    const moves = [];
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      for (let r = from.r + dr, c = from.c + dc; inBounds(r, c, 4, 4); r += dr, c += dc) {
        if (fcgOccupied(state, { r, c })) break;
        moves.push({ r, c });
      }
    }
    return moves;
  }
  function fcgMobility(state, owner) { return FCG_COLORS.reduce((sum, color) => sum + fcgMoves(state, owner, color).length, 0); }

  games['four-color-chess'] = {
    title: '四色棋 Four Color Chess', credit: '設計者：奧羅，出版社：奧羅桌遊設計工作室',
    firstName: '黑方', secondName: '白方', designer: '奧羅。1.0 遊戲介紹記載此作為其第一款雙人抽象棋。', publisher: '奧羅桌遊設計工作室；目前為程式練習與非商業分享版本。',
    intro: '落點的格色會指定對手下一回合必須移動的棋子。玩家持續改變焦點，直到被指定的棋無路可走。',
    openings: [{ value: 'standard', label: '經典' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }], rolloutLimit: 80,
    animationDuration(action) { return action.type === 'move' ? 360 : 0; },
    rules: [
      { title: '初始設置', html: '<p>白方棋放在最上列，黑方棋放在最下列，棋子顏色對應所在格色。黑方先手並先選一枚有合法移動的黑棋作為焦點。</p>' },
      { title: '移動焦點棋', html: '<p>焦點棋可沿正交直線滑行到任一空格，不能跳過棋子。落點格色會把焦點移到對手同色棋上。</p>' },
      { title: '勝利', html: '<p>輪到玩家時，被焦點指定的棋子沒有任何合法移動，對手立即獲勝。</p>' }
    ],
    create(mode, previous) {
      let pattern;
      if (mode === 'random') pattern = fcgRandomPattern();
      else if (mode === 'same' && previous?.pattern) pattern = clone(previous.pattern);
      else pattern = clone(FCG_STANDARD);
      return { state: { turn: 'first', pattern, pieces: fcgPieces(pattern), focus: null, winner: null }, snapshot: { pattern } };
    },
    actions(state) {
      if (state.winner) return [];
      if (!state.focus) return FCG_COLORS.filter((color) => fcgMoves(state, 'first', color).length).map((color) => ({ type: 'focus', color }));
      return fcgMoves(state, state.turn, state.focus.color).map((to) => ({ type: 'move', color: state.focus.color, to }));
    },
    apply(source, action) {
      const state = clone(source);
      if (action.type === 'focus') { state.focus = { owner: 'first', color: action.color }; return state; }
      const actor = state.turn;
      state.pieces[actor][action.color] = clone(action.to);
      const targetColor = state.pattern[action.to.r][action.to.c];
      state.turn = other(actor);
      state.focus = { owner: state.turn, color: targetColor };
      if (!fcgMoves(state, state.turn, targetColor).length) state.winner = actor;
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before) {
      const actor = before.turn === 'first' ? '黑方' : '白方';
      if (action.type === 'focus') return `黑方將焦點放在${FCG_NAMES[action.color]}色棋。`;
      return `${actor}移動${FCG_NAMES[action.color]}色棋到${posText(action.to)}，下一個焦點為${FCG_NAMES[before.pattern[action.to.r][action.to.c]]}色。`;
    },
    view(state) {
      const legal = new Set(this.actions(state).filter((action) => action.type === 'move').map((action) => key(action.to.r, action.to.c)));
      let board = '';
      for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
        const occupied = fcgOccupied(state, { r, c });
        const piece = occupied ? `<span class="piece fcg-piece fcg-${occupied.color} owner-${occupied.owner}" data-anim-id="fcg-${occupied.owner}-${occupied.color}" aria-label="${occupied.owner === 'first' ? '黑方' : '白方'}${FCG_NAMES[occupied.color]}棋"></span>` : '';
        const focused = occupied && state.focus && occupied.owner === state.focus.owner && occupied.color === state.focus.color;
        const classes = `tile-${state.pattern[r][c]} ${focused ? 'focused' : legal.has(key(r, c)) ? 'legal' : ''}`;
        board += cellButton(r, c, classes, piece, `${FCG_NAMES[state.pattern[r][c]]}格`);
      }
      const outcome = this.outcome(state);
      const hint = outcome ? `遊戲結束：${outcome === 'first' ? '黑方' : '白方'}獲勝` : !state.focus ? '黑方請選擇第一枚焦點棋' : `${state.turn === 'first' ? '黑方' : '白方'}請移動${FCG_NAMES[state.focus.color]}色焦點棋`;
      return {
        cols: 4, rows: 4, board, tray: '', hint,
        hideScores: true, hideTray: true,
        winColors: { first: '#2e2a2f', second: '#bab9b3', secondText: '#77746f' },
        turnColors: { first: '#2e2a2f', second: '#e5e2d8', secondText: '#2e2a2f' },
        firstScore: '', secondScore: ''
      };
    },
    bind(state, ui, controller, board) {
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const pos = { r: Number(button.dataset.r), c: Number(button.dataset.c) };
        const occupied = fcgOccupied(state, pos);
        let action;
        if (!state.focus && occupied?.owner === 'first') action = this.actions(state).find((item) => item.type === 'focus' && item.color === occupied.color);
        else action = this.actions(state).find((item) => item.type === 'move' && samePos(item.to, pos));
        if (action) controller.commit(action);
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // 四步棋 Four Moves Chess
  // ---------------------------------------------------------------------------
  const FMG_STANDARD = [
    [1, 2, 3, 4],
    [2, 3, 'SB', 1],
    [3, 'SR', 1, 2],
    [4, 1, 2, 3]
  ];
  function fmgFromTiles(tiles) {
    let first, second;
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
      if (tiles[r][c] === 'SR') first = { r, c };
      if (tiles[r][c] === 'SB') second = { r, c };
    }
    return { turn: 'first', tiles, covered: Array.from({ length: 4 }, () => Array(4).fill(false)), positions: { first, second }, winner: null };
  }
  function fmgRandomTiles() {
    const bag = [1,1,1,1,2,2,2,2,3,3,3,3,4,4,'SR','SB'];
    for (let i = bag.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    return Array.from({ length: 4 }, (_, r) => bag.slice(r * 4, r * 4 + 4));
  }
  function fmgBlocked(state, pos) { return state.covered[pos.r][pos.c] || samePos(state.positions.first, pos) || samePos(state.positions.second, pos); }
  function fmgJump(state, pos, dr, dc) {
    for (let r = pos.r + dr, c = pos.c + dc; inBounds(r, c, 4, 4); r += dr, c += dc) if (!fmgBlocked(state, { r, c })) return { r, c };
    return null;
  }
  function fmgReachable(state, steps) {
    const start = state.positions[state.turn];
    const results = new Map();
    const walk = (pos, depth, visited, path) => {
      if (depth === steps) {
        const id = key(pos.r, pos.c);
        if (!results.has(id)) results.set(id, { r: pos.r, c: pos.c, path: clone(path) });
        return;
      }
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const next = fmgJump(state, pos, dr, dc);
        if (!next || visited.has(key(next.r, next.c))) continue;
        const nextVisited = new Set(visited); nextVisited.add(key(next.r, next.c));
        walk(next, depth + 1, nextVisited, [...path, next]);
      }
    };
    walk(start, 0, new Set([key(start.r, start.c)]), []);
    results.delete(key(start.r, start.c));
    return [...results.values()];
  }
  function fmgStepChoices(state) {
    const tile = state.tiles[state.positions[state.turn].r][state.positions[state.turn].c];
    return tile === 'SR' || tile === 'SB' ? [1, 2, 3, 4] : [Number(tile)];
  }
  games['four-moves-chess'] = {
    title: '四步棋 Four Moves Chess', credit: '設計者：來源未載，遊戲名稱：奧羅暫定',
    firstName: '紅方', secondName: '藍方', designer: '具體設計者不可考。1.0 記載此玩法來自 IG 帳號 celine.et.sasha 的短片，網頁名稱由奧羅暫定。', publisher: '沒有查到正式出版社；目前為非商業網頁實作。',
    intro: '棋子所在格的數字決定本回合步數。每一步沿正交方向跳到下一個可停留格，離開後原格封閉；讓對手無路可走即可獲勝。',
    openings: [{ value: 'standard', label: '經典' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }], rolloutLimit: 50,
    animationDuration(action) { return action.type === 'move' ? action.path.length * 250 : 0; },
    rules: [
      { title: '步數', html: '<p>所在格為數字 n 時必須移動 n 步；所在格為 S 時可選 1 到 4 步。</p>' },
      { title: '每一步', html: '<p>只能往上下左右，並跳過已封閉格與棋子，停在該方向下一個可停留格。同一回合不能重訪格子。</p>' },
      { title: '勝利', html: '<p>完成移動後起始格封閉。若輪到對手時對手沒有任何合法目的地，剛完成回合的玩家獲勝。</p>' }
    ],
    create(mode, previous) {
      let tiles;
      if (mode === 'random') tiles = fmgRandomTiles();
      else if (mode === 'same' && previous?.tiles) tiles = clone(previous.tiles);
      else tiles = clone(FMG_STANDARD);
      return { state: fmgFromTiles(tiles), snapshot: { tiles } };
    },
    actions(state) {
      if (state.winner) return [];
      const actions = new Map();
      for (const steps of fmgStepChoices(state)) for (const destination of fmgReachable(state, steps)) {
        const { path, ...to } = destination;
        const destinationKey = key(to.r, to.c);
        if (!actions.has(destinationKey)) actions.set(destinationKey, { type: 'move', steps, to, path, stepDuration: 250 });
      }
      return [...actions.values()];
    },
    apply(source, action) {
      const state = clone(source);
      const actor = state.turn;
      const from = state.positions[actor];
      state.covered[from.r][from.c] = true;
      state.positions[actor] = clone(action.to);
      state.turn = other(actor);
      if (!this.actions(state).length) state.winner = actor;
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before) { return `${before.turn === 'first' ? '紅方' : '藍方'}移動 ${action.steps} 步到${posText(action.to)}。`; },
    view(state) {
      const legal = new Set(this.actions(state).map((action) => key(action.to.r, action.to.c)));
      let board = '';
      for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
        const first = samePos(state.positions.first, { r, c });
        const second = samePos(state.positions.second, { r, c });
        const piece = first ? '<span class="piece fmg-piece first" data-anim-id="fmg-first" aria-label="紅方棋子"></span>' : second ? '<span class="piece fmg-piece second" data-anim-id="fmg-second" aria-label="藍方棋子"></span>' : '';
        const tile = state.tiles[r][c] === 'SR' || state.tiles[r][c] === 'SB' ? 'S' : state.tiles[r][c];
        const classes = `${state.covered[r][c] ? 'removed-space' : ''} ${legal.has(key(r, c)) ? 'legal' : ''}`;
        board += cellButton(r, c, classes, state.covered[r][c] ? '' : `<b>${tile}</b>${piece}`);
      }
      const outcome = this.outcome(state);
      const hint = outcome ? `遊戲結束：${outcome === 'first' ? '紅方' : '藍方'}獲勝` : `${state.turn === 'first' ? '紅方' : '藍方'}請選擇高亮目的地`;
      return { cols: 4, rows: 4, boardClass: 'four-moves-board', board, hideScores: true, hideTray: true, hint, firstScore: '', secondScore: '' };
    },
    bind(state, ui, controller, board) {
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const pos = { r: Number(button.dataset.r), c: Number(button.dataset.c) };
        const action = this.actions(state).find((item) => samePos(item.to, pos));
        if (action) controller.commit(action);
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // 跳躍森靈 Torii
  // ---------------------------------------------------------------------------
  function toriiEmptyGrid() { return Array.from({ length: 4 }, () => Array(4).fill(null)); }
  function toriiCount(grid, owner) { return grid.flat().filter((item) => item === owner).length; }
  function toriiLines(state, owner) {
    const lines = [];
    for (let r = 0; r < 4; r += 1) if (state.followers[r].every((item) => item === owner)) lines.push(Array.from({ length: 4 }, (_, c) => ({ r, c })));
    for (let c = 0; c < 4; c += 1) if ([0,1,2,3].every((r) => state.followers[r][c] === owner)) lines.push(Array.from({ length: 4 }, (_, r) => ({ r, c })));
    return lines;
  }
  function toriiBuildChoices(state, owner) {
    const map = new Map();
    for (const line of toriiLines(state, owner)) for (const pos of line) if (!state.torii[pos.r][pos.c] && state.followers[pos.r][pos.c] === owner) map.set(key(pos.r, pos.c), pos);
    return [...map.values()];
  }
  function toriiNextSteps(state, path) {
    const current = path.length ? path[path.length - 1] : state.spirits[state.turn];
    const opponent = state.spirits[other(state.turn)];
    const start = state.spirits[state.turn];
    const visited = new Set([key(start.r, start.c), ...path.map((pos) => key(pos.r, pos.c))]);
    const result = [];
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let r = current.r + dr, c = current.c + dc;
      if (!inBounds(r, c, 4, 4)) continue;
      if (r === opponent.r || c === opponent.c) { r += dr; c += dc; }
      if (!inBounds(r, c, 4, 4) || samePos({ r, c }, start) || visited.has(key(r, c))) continue;
      result.push({ r, c });
    }
    return result;
  }
  function toriiResourceScore(state, owner) {
    const followers = toriiCount(state.followers, owner);
    const gates = toriiCount(state.torii, owner);
    return `<span class="torii-resource-score"><span aria-label="信徒 ${followers} / 9"><i class="torii-resource-follower"></i><strong>${followers}</strong><small>/9</small></span><span aria-label="鳥居 ${gates} / 4"><i class="torii-resource-gate"><b></b><b></b></i><strong>${gates}</strong><small>/4</small></span></span>`;
  }
  function toriiPaths(state, steps) {
    const results = [];
    const walk = (path) => {
      if (path.length === steps) { results.push(clone(path)); return; }
      for (const next of toriiNextSteps(state, path)) walk([...path, next]);
    };
    walk([]);
    return results;
  }
  function toriiEndTurn(state, owner) {
    state.tilesUsed[owner][state.pendingTile] = true;
    if ([1,2,3].every((tile) => state.tilesUsed[owner][tile])) state.tilesUsed[owner] = { 1: false, 2: false, 3: false };
    state.pendingTile = null;
    state.turn = other(owner);
  }
  function toriiFinishPath(state, owner) {
    if (toriiCount(state.followers, owner) >= 9) { state.winner = owner; return; }
    state.buildChoices = toriiBuildChoices(state, owner);
    if (state.buildChoices.length) state.building = true;
    else toriiEndTurn(state, owner);
  }
  function toriiRandomSpirits() {
    const first = { r: Math.floor(Math.random() * 4), c: Math.floor(Math.random() * 4) };
    const candidates = [];
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) if (r !== first.r && c !== first.c) candidates.push({ r, c });
    return { first, second: clone(candidates[Math.floor(Math.random() * candidates.length)]) };
  }

  games.torii = {
    title: '跳躍森靈 Torii', credit: '設計者：陳致寬，出版社：桌遊愛樂事',
    firstName: '紅方', secondName: '藍方', designer: '陳致寬；1.0 介紹記載其為臺灣原創抽象棋設計團隊作品。', publisher: '桌遊愛樂事。1.0 頁面記載已取得原出版社與設計師同意製作與分享。',
    intro: '玩家使用 1、2、3 行動板塊移動森靈，在停留格放置或替換信徒；四名信徒連線可建立鳥居。',
    openings: [{ value: 'standard', label: '標準' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }], rolloutLimit: 80,
    animationDuration(action) { return action.type === 'path' && !action.previewed ? action.path.length * 200 : action.type === 'build' ? 200 : 0; },
    rules: [
      { title: '回合流程', html: '<ol><li>選一張尚未使用的 1、2、3 行動板塊。</li><li>森靈依數字走足步數，不能重訪或回起點。</li><li>在每個實際停留格放置或替換己方信徒。</li></ol>' },
      { title: '跳躍與鳥居', html: '<p>移動遇到對手森靈所在行列時依 1.0 程式整段跳過，被跳過格不放信徒。四格己方信徒成橫列或直列時，在其中一格建立鳥居並移除該線其他未受鳥居保護的信徒。</p>' },
      { title: '勝利', html: '<p>場上同時有 9 名己方信徒，或建成 4 座己方鳥居，立即獲勝。</p>' }
    ],
    create(mode, previous) {
      let spirits;
      if (mode === 'random') spirits = toriiRandomSpirits();
      else if (mode === 'same' && previous?.spirits) spirits = clone(previous.spirits);
      else spirits = { first: { r: 1, c: 1 }, second: { r: 2, c: 2 } };
      return {
        state: { turn: 'first', spirits, followers: toriiEmptyGrid(), torii: toriiEmptyGrid(), tilesUsed: { first: { 1: false, 2: true, 3: false }, second: { 1: true, 2: false, 3: false } }, pendingTile: null, building: false, buildChoices: [], winner: null },
        snapshot: { spirits }
      };
    },
    actions(state) {
      if (state.winner) return [];
      if (state.building) return state.buildChoices.map((pos) => ({ type: 'build', pos }));
      if (state.pendingTile === null) return [1,2,3].filter((tile) => !state.tilesUsed[state.turn][tile] && toriiPaths(state, tile).length).map((tile) => ({ type: 'tile', tile }));
      return toriiPaths(state, state.pendingTile).map((path) => ({ type: 'path', path }));
    },
    apply(source, action) {
      const state = clone(source);
      if (action.type === 'tile') { state.pendingTile = action.tile; return state; }
      if (action.type === 'path') {
        const owner = state.turn;
        state.spirits[owner] = clone(action.path[action.path.length - 1]);
        for (const pos of action.path) if (!state.torii[pos.r][pos.c]) state.followers[pos.r][pos.c] = owner;
        toriiFinishPath(state, owner);
        return state;
      }
      const owner = state.turn;
      const line = toriiLines(state, owner).find((cells) => cells.some((pos) => samePos(pos, action.pos)));
      if (!line || state.torii[action.pos.r][action.pos.c]) return state;
      state.torii[action.pos.r][action.pos.c] = owner;
      for (const pos of line) if (!samePos(pos, action.pos) && !state.torii[pos.r][pos.c]) state.followers[pos.r][pos.c] = null;
      if (toriiCount(state.torii, owner) >= 4) { state.winner = owner; state.building = false; state.buildChoices = []; return state; }
      state.buildChoices = toriiBuildChoices(state, owner);
      if (state.buildChoices.length) state.building = true;
      else { state.building = false; toriiEndTurn(state, owner); }
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before) {
      const actor = before.turn === 'first' ? '紅方' : '藍方';
      if (action.type === 'tile') return `${actor}選擇移動 ${action.tile} 步。`;
      if (action.type === 'path') return `${actor}沿 ${action.path.map(posText).join('、')} 移動森靈。`;
      return `${actor}在${posText(action.pos)}建立鳥居。`;
    },
    view(state, ui) {
      const path = ui.path || [];
      const next = state.pendingTile !== null && !state.building ? new Set(toriiNextSteps(state, path).map((pos) => key(pos.r, pos.c))) : new Set();
      const builds = new Set(state.buildChoices.map((pos) => key(pos.r, pos.c)));
      const visibleSpirits = path.length ? { ...state.spirits, [state.turn]: path[path.length - 1] } : state.spirits;
      let board = '';
      for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
        const pos = { r, c };
        const spiritOwner = samePos(visibleSpirits.first, pos) ? 'first' : samePos(visibleSpirits.second, pos) ? 'second' : null;
        const follower = state.followers[r][c] ? `<span class="follower ${state.followers[r][c]}" data-anim-id="torii-follower-${r}-${c}"></span>` : '';
        const gate = state.torii[r][c] ? `<span class="torii-mark ${state.torii[r][c]}" data-anim-id="torii-gate-${state.torii[r][c]}-${r}-${c}"><i></i><i></i></span>` : '';
        const spirit = spiritOwner ? `<span class="piece spirit ${spiritOwner}" data-anim-id="torii-spirit-${spiritOwner}"><i></i></span>` : '';
        const classes = `${path.some((item) => samePos(item, pos)) ? 'path' : ''} ${next.has(key(r, c)) || builds.has(key(r, c)) ? 'legal' : ''}`;
        board += cellButton(r, c, classes, follower + gate + spirit);
      }
      const tileZone = (owner) => `<section class="choice-zone torii-tiles ${owner} ${state.turn === owner ? 'active' : ''}" aria-label="${owner === 'first' ? '紅方' : '藍方'}行動板塊"><div>${[1,2,3].map((tile) => {
        const used = state.tilesUsed[owner][tile];
        const selected = state.turn === owner && state.pendingTile === tile;
        const unavailable = used || state.turn !== owner || state.building || state.pendingTile !== null;
        return `<button class="tray-btn ${used ? 'used' : ''} ${selected ? 'selected' : ''}" data-tile="${tile}" data-owner="${owner}" aria-disabled="${unavailable}" ${used ? 'disabled' : ''}>${tile}</button>`;
      }).join('')}</div></section>`;
      const tray = `<div class="dual-choice">${tileZone('first')}${tileZone('second')}</div>${state.building ? '<small class="tray-note">請在四連線中選擇鳥居位置</small>' : ''}`;
      const outcome = this.outcome(state);
      let hint;
      if (outcome) hint = `遊戲結束：${outcome === 'first' ? '紅方' : '藍方'}獲勝`;
      else if (state.building) hint = `${state.turn === 'first' ? '紅方' : '藍方'}請建立鳥居`;
      else if (state.pendingTile === null) hint = `${state.turn === 'first' ? '紅方' : '藍方'}請選擇行動板塊`;
      else hint = `請走第 ${path.length + 1} / ${state.pendingTile} 步`;
      return { cols: 4, rows: 4, boardClass: 'torii-board', board, tray, hint, compactScores: true, firstScore: toriiResourceScore(state, 'first'), secondScore: toriiResourceScore(state, 'second') };
    },
    bind(state, ui, controller, board, tray) {
      tray.querySelectorAll(`[data-tile][data-owner="${state.turn}"]`).forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const action = this.actions(state).find((item) => item.type === 'tile' && item.tile === Number(button.dataset.tile));
        if (action) controller.commit(action);
      }));
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const pos = { r: Number(button.dataset.r), c: Number(button.dataset.c) };
        if (state.building) {
          const action = this.actions(state).find((item) => item.type === 'build' && samePos(item.pos, pos));
          if (action) controller.commit(action);
          return;
        }
        if (state.pendingTile === null) return;
        const path = ui.path || [];
        if (!toriiNextSteps(state, path).some((item) => samePos(item, pos))) return;
        const nextPath = [...path, pos];
        const finishPath = nextPath.length === state.pendingTile ? () => controller.commit({ type: 'path', path: nextPath, previewed: true }) : null;
        controller.previewUi({ path: nextPath }, { path: [pos], stepDuration: 200 }, 200, finishPath);
      }));
    }
  };

  window.BOARD_GAMES = games;
}());
