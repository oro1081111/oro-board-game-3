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
  // 蒐靈祭 Soulaween
  // ---------------------------------------------------------------------------
  const SOUL_COLORS = ['orange', 'green'];
  const SOUL_TARGET_SCORE = 3;
  const soulColorName = (color) => color === 'green' ? '綠色' : '橘色';
  const soulEmptyBoard = () => Array.from({ length: 4 }, () => Array(4).fill(null));

  function soulFlip(color) { return color === 'green' ? 'orange' : 'green'; }

  function soulPlace(board, action) {
    const next = clone(board);
    next[action.r][action.c] = action.color;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const r = action.r + dr, c = action.c + dc;
      if (inBounds(r, c, 4, 4) && next[r][c]) next[r][c] = soulFlip(next[r][c]);
    }
    return next;
  }

  function soulLines(board) {
    const candidates = [];
    for (let r = 0; r < 4; r += 1) candidates.push(Array.from({ length: 4 }, (_, c) => ({ r, c })));
    for (let c = 0; c < 4; c += 1) candidates.push(Array.from({ length: 4 }, (_, r) => ({ r, c })));
    candidates.push(Array.from({ length: 4 }, (_, i) => ({ r: i, c: i })));
    candidates.push(Array.from({ length: 4 }, (_, i) => ({ r: i, c: 3 - i })));
    return candidates.flatMap((positions) => {
      const color = board[positions[0].r][positions[0].c];
      return color && positions.every((pos) => board[pos.r][pos.c] === color) ? [{ color, positions }] : [];
    });
  }

  function soulLineLabel(line) {
    const first = line.positions[0], last = line.positions[line.positions.length - 1];
    if (first.r === last.r) return `第 ${first.r + 1} 列${soulColorName(line.color)}連線`;
    if (first.c === last.c) return `第 ${first.c + 1} 欄${soulColorName(line.color)}連線`;
    return `${first.c < last.c ? '左上到右下' : '右上到左下'}${soulColorName(line.color)}斜線`;
  }

  function soulActions(state) {
    if (state.winner) return [];
    const actions = [];
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
      if (state.board[r][c] !== null) continue;
      for (const color of SOUL_COLORS) {
        const base = { type: 'place', r, c, color };
        const lines = soulLines(soulPlace(state.board, base));
        if (lines.length) lines.forEach((line) => actions.push({ ...base, collect: clone(line) }));
        else actions.push(base);
      }
    }
    return actions;
  }

  function soulScorePips(score) {
    return `<span class="score-pips" aria-label="${score} 分">${Array.from({ length: SOUL_TARGET_SCORE }, (_, index) => `<i class="score-pip ${index < score ? 'filled' : ''}"></i>`).join('')}</span>`;
  }

  games.soulaween = {
    title: '蒐靈祭 Soulaween',
    nameZh: '蒐靈祭',
    nameEn: 'Soulaween',
    credit: '設計者：陳曦，出版社：玩聚設計',
    firstName: '先手', secondName: '後手',
    designer: '遊戲設計：陳曦 Shi Chen。美術：費子軒 Tzu-Hsuan Fei、張可靚 Ke-Ching Chang。',
    publisher: '玩聚設計 Play With Us Design。遊戲曾獲 2019 臺灣原創桌遊博覽會最佳機制與最佳美術獎。',
    publisherHtml: '<p>玩聚設計 Play With Us Design 成立於 2015 年，是以臺灣原創遊戲為核心的品牌，作品多以容易上手、便於攜帶與短時間也能反覆遊玩為方向。《蒐靈祭》曾獲 2019 臺灣原創桌遊博覽會最佳機制與最佳美術獎。</p><p><strong>代表作品：</strong>《蒐靈祭 Soulaween》、《羽 AVES》、《猜拆畫畫 Doodle Puzzle》。</p>',
    publisherLink: { label: '前往玩聚設計官網', href: 'https://pwud.ga/' },
    ruleLink: { label: '官方規則（英文 PDF）', href: 'https://pwud.ga/wp-content/uploads/2020/01/Soulaween_v2_rulebook_EN.pdf' },
    introHtml: '<p>死神學園一年一度最熱鬧的「蒐靈祭」即將開始。玩家扮演死神的實習生，放出靈魂並讓彼此碰撞變色，設法排出四枚同色靈魂後一舉收取。棋盤只有 4×4，卻會因每次放置引發相鄰翻面而快速改變，是一款規則精簡、局勢多變的雙人抽象策略遊戲。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>時間</dt><dd>約 15–30 分鐘</dd><dt>年齡</dt><dd>6 歲以上</dd><dt>出版年份</dt><dd>2019 年</dd></dl>',
    cover: '../../assets/covers/soulaween.jpg',
    links: [
      { label: 'BGG 頁面', href: 'https://boardgamegeek.com/boardgame/269766/soulaween' },
      { label: '官方介紹', href: 'https://pwud.ga/product/soulaween-v4/' },
      { label: '中文規則', href: 'https://boardgamegeek.com/boardgame/269766/soulaween/files' }
    ],
    openings: [{ value: 'standard', label: '禿鷹老師簡易模式' }],
    rolloutLimit: 70,
    evaluationIterations: 80,
    rules: [
      { title: '本頁採用的模式', html: '<p>蒐靈祭正式規則包含角色能力；本頁採用「禿鷹老師」簡易模式，雙方沒有個別能力，專注於放置、翻面與四連線收取。</p>' },
      { title: '配件與目標', html: '<ul><li>4×4 靈魂墊一面、16 枚橘／綠雙面靈魂棋，以及雙方計分標記。</li><li>兩位玩家共用同一批雙面棋；棋子不是分屬某位玩家。</li><li>每收取一組同色四連線得 1 分，先取得 3 分者獲勝。</li></ul>' },
      { title: '初始設置', html: '<ol><li>將 4×4 靈魂墊放在中央，16 枚靈魂棋放在一旁作為共同供應。</li><li>雙方分數均為 0，決定先手玩家。</li><li>棋盤初始為空。</li></ol>' },
      { title: '完整回合', html: '<ol><li><strong>選擇顏色：</strong>拿取一枚靈魂棋，選擇要讓橘色面或綠色面朝上。</li><li><strong>放置：</strong>將棋放在任一空格。</li><li><strong>翻轉：</strong>把新棋上、下、左、右正交相鄰的所有棋子翻到另一面；斜角相鄰不翻。</li><li><strong>檢查連線：</strong>檢查棋盤是否出現橫向、直向或斜向的同色四連線。</li></ol>' },
      { title: '收取靈魂', html: '<ul><li>若形成一條或多條同色四連線，當回合玩家必須選擇其中一條收取。</li><li>移除該線的 4 枚棋並放回共同供應，當回合玩家獲得 1 分。</li><li>即使同時形成多條連線，每回合也只收取其中一條。</li></ul>' },
      { title: '滿盤處理與勝利', html: '<ul><li>完成收取後若棋盤仍是全滿，移除所有與本回合新放棋正面顏色相同的棋，放回供應區。</li><li>任一玩家取得第 3 分時，遊戲立即結束並由該玩家獲勝。</li></ul>' }
    ],
    create() {
      return { turn: 'first', board: soulEmptyBoard(), scores: { first: 0, second: 0 }, winner: null };
    },
    actions(state) { return soulActions(state); },
    apply(source, action) {
      const state = clone(source);
      state.board = soulPlace(state.board, action);
      if (action.collect) {
        action.collect.positions.forEach((pos) => { state.board[pos.r][pos.c] = null; });
        state.scores[state.turn] += 1;
        if (state.scores[state.turn] >= SOUL_TARGET_SCORE) {
          state.winner = state.turn;
          return state;
        }
      }
      if (state.board.every((row) => row.every(Boolean))) {
        state.board = state.board.map((row) => row.map((cell) => cell === action.color ? null : cell));
      }
      state.turn = other(state.turn);
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before) {
      const actor = before.turn === 'first' ? '先手' : '後手';
      const placement = `${actor}在${posText(action)}放置${soulColorName(action.color)}面並翻轉正交相鄰棋子`;
      return action.collect ? `${placement}，收取${soulLineLabel(action.collect)}並取得 1 分。` : `${placement}。`;
    },
    historyUi(ui, action) { return { color: ui.color || action.color }; },
    nextUi(action) { return { color: action.color }; },
    view(state, ui, controller) {
      const selectedColor = ui.color || 'green';
      const pending = ui.pending && state.board[ui.pending.r]?.[ui.pending.c] === null ? ui.pending : null;
      const pendingActions = pending ? this.actions(state).filter((action) => action.r === pending.r && action.c === pending.c && action.color === pending.color && action.collect) : [];
      const displayBoard = pending ? soulPlace(state.board, pending) : state.board;
      const lineByCell = new Map();
      pendingActions.forEach((action, index) => action.collect.positions.forEach((pos) => {
        if (!lineByCell.has(key(pos.r, pos.c))) lineByCell.set(key(pos.r, pos.c), index);
      }));
      let board = '';
      for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
        const color = displayBoard[r][c];
        const lineIndex = lineByCell.get(key(r, c));
        const classes = [];
        if (lineIndex !== undefined) classes.push('collectable');
        if (pending && pending.r === r && pending.c === c) classes.push('selected');
        const piece = color ? `<span class="piece ${color}" data-anim-id="soul-${r}-${c}"></span>` : '';
        const label = lineIndex !== undefined ? `${posText({ r, c })}，點選收取${soulLineLabel(pendingActions[lineIndex].collect)}` : `${posText({ r, c })}${color ? `，${soulColorName(color)}靈魂` : '，空格'}`;
        board += `<button class="cell ${classes.join(' ')}" data-r="${r}" data-c="${c}" ${lineIndex !== undefined ? `data-line="${lineIndex}"` : ''} aria-label="${label}">${piece}</button>`;
      }
      const tray = pendingActions.length
        ? `<div class="soulaween-line-choices">${pendingActions.map((action, index) => `<button class="tray-btn soul-line-btn" data-line-choice="${index}">${soulLineLabel(action.collect)}</button>`).join('')}<button class="tray-btn soul-cancel" data-cancel-collect>取消</button></div>`
        : `<div class="soulaween-colors">${SOUL_COLORS.map((color) => `<button class="tray-btn soul-color ${selectedColor === color ? 'selected' : ''}" data-soul-color="${color}" aria-label="選擇${soulColorName(color)}面"><span class="piece ${color}"></span></button>`).join('')}</div>`;
      const outcome = this.outcome(state);
      const hint = outcome ? `遊戲結束：${outcome === 'first' ? '先手' : '後手'}獲勝` : pending ? '形成四連線，請選擇要收取的連線' : `現在是${state.turn === 'first' ? '先手' : '後手'}的回合，選擇顏色後放置靈魂`;
      return {
        cols: 4, board, tray, hint,
        boardClass: 'soulaween-board',
        winColors: { first: '#fb6a70', second: '#7188f4' },
        turnColors: { first: '#fb6a70', second: '#7188f4' },
        firstScore: soulScorePips(state.scores.first), secondScore: soulScorePips(state.scores.second)
      };
    },
    bind(state, ui, controller, board, tray) {
      tray.querySelectorAll('[data-soul-color]').forEach((button) => button.addEventListener('click', () => controller.setUi({ color: button.dataset.soulColor, pending: null })));
      tray.querySelector('[data-cancel-collect]')?.addEventListener('click', () => controller.setUi({ pending: null }));
      const commitLine = (index) => {
        if (!controller.isHumanTurn() || !ui.pending) return;
        const action = this.actions(state).filter((item) => item.r === ui.pending.r && item.c === ui.pending.c && item.color === ui.pending.color && item.collect)[index];
        if (action) controller.commit(action);
      };
      tray.querySelectorAll('[data-line-choice]').forEach((button) => button.addEventListener('click', () => commitLine(Number(button.dataset.lineChoice))));
      board.querySelectorAll('[data-line]').forEach((button) => button.addEventListener('click', () => commitLine(Number(button.dataset.line))));
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn() || ui.pending || button.dataset.line !== undefined) return;
        const r = Number(button.dataset.r), c = Number(button.dataset.c), color = ui.color || 'green';
        const choices = this.actions(state).filter((action) => action.r === r && action.c === c && action.color === color);
        if (!choices.length) return;
        if (choices.some((action) => action.collect)) controller.setUi({ color, pending: { type: 'place', r, c, color } });
        else controller.commit(choices[0]);
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // 花園棋 Garden（Mijnlieff 系統）
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
    title: '花園棋 Garden',
    nameZh: '花園棋',
    nameEn: 'Garden',
    credit: '設計者：Andy Hopwood，出版社：Taiwan Boardgame Design',
    firstName: '深色',
    secondName: '淺色',
    designer: '遊戲設計：Andy Hopwood。Garden 版本美術：Daisy Ching-Yi Chen。',
    publisher: '《花園棋 Garden》為 Mijnlieff 系統的新美術版本，由 TBD 台灣桌遊設計推出英中版本。',
    publisherHtml: '<p>TBD 台灣桌遊設計成立於 2013 年，長期協助臺灣設計師測試、製作並把原創桌遊帶往海外展會。《花園棋 Garden》是 Andy Hopwood 的 Mijnlieff 系統重新美術設計後推出的英中版本。</p><p><strong>代表作品：</strong>《花園棋 Garden》、《臺灣夜市 Taiwan Night Market》、《福爾摩沙茶 Formosa Tea》。</p>',
    publisherLink: { label: '前往 TBD 官方網站', href: 'https://www.tbd.com.tw/' },
    ruleLink: { label: '官方中文規則', href: 'https://boardgamegeek.com/filepage/307349/garden-chinese-rules' },
    introHtml: '<p>風和日麗的午後，蝴蝶、瓢蟲、蜻蜓與蝸牛在花瓣上展開搶地盤比賽。玩家輪流放置四種昆蟲棋；每枚棋都會限制對手下一枚棋可以落下的位置，因此每一步既要延伸自己的連線，也要避免替對手留下好位置。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>時間</dt><dd>約 15 分鐘</dd><dt>年齡</dt><dd>8 歲以上</dd><dt>類型</dt><dd>連線、落點限制、抽象策略</dd></dl>',
    cover: '../../assets/covers/mijnlieff.png',
    links: [
      { label: 'BGG 頁面', href: 'https://boardgamegeek.com/boardgame/72667/mijnlieff' },
      { label: '官方介紹', href: 'https://www.tbd.com.tw/products/garden' },
      { label: '中文規則', href: 'https://boardgamegeek.com/filepage/307349/garden-chinese-rules' }
    ],
    openings: [{ value: 'A', label: '經典 A' }, { value: 'B', label: '缺角 B' }, { value: 'C', label: '工字 C' }],
    rolloutLimit: 40,
    rules: [
      { title: '配件與目標', html: '<ul><li>每位玩家使用同一顏色的 8 枚棋子：十字、交叉、實心圓、空心圓各 2 枚。</li><li>目標是在棋盤上組成橫向、直向或斜向的己方連線，取得比對手更高的分數。</li></ul>' },
      { title: '初始設置', html: '<ol><li>選擇棋盤配置，雙方各拿取一組 8 枚棋子。</li><li>棋盤初始為空，由深色玩家先手。</li><li>第一枚棋必須放在棋盤外圍的可用格；之後的落點由上一枚棋的圖案決定。</li></ol>' },
      { title: '四種落點限制', html: '<ul><li><strong>十字：</strong>對手下一枚棋必須放在同一列或同一行。</li><li><strong>交叉：</strong>對手下一枚棋必須放在同一條斜線。</li><li><strong>實心圓：</strong>對手下一枚棋必須放在周圍相鄰八格之一。</li><li><strong>空心圓：</strong>對手下一枚棋必須放在相鄰八格以外的空格。</li></ul><p>落點必須同時是棋盤上的可用空格；已放棋或不屬於棋盤的格子不能使用。</p>' },
      { title: '無法落子與結束', html: '<ul><li>輪到玩家時若手上已沒有任何棋子，遊戲立即結束。</li><li>玩家仍有棋子、但依目前限制找不到合法落點時，跳過該回合並清除限制，讓對手可重新選擇任一合法空格。</li><li>若雙方連續都沒有合法落點，遊戲結束。</li></ul>' },
      { title: '計分與勝負', html: '<ul><li>同色棋橫、直或斜向連續 3 枚，該線得 1 分。</li><li>同色棋連續 4 枚以上，該線得 2 分。</li><li>遊戲結束後加總所有連線；分數較高者獲勝，同分則為平手。</li></ul>' }
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
    nameZh: '聖托里尼',
    nameEn: 'Santorini',
    credit: '設計者：Gordon Hamilton，出版社：Roxley Games',
    firstName: '紅方', secondName: '藍方',
    designer: '遊戲設計：Gordon Hamilton。Roxley 版本美術與視覺設計由 Mr. Cuddington 團隊參與。', publisher: 'Roxley Games。此頁採用不含神力卡的雙人基本對戰。',
    publisherHtml: '<p>Roxley Games 重視創新、完成度、耐玩性與視覺呈現；《聖托里尼》是其容易入門、同時保有策略深度的代表性抽象遊戲。本頁採用不含神力卡的雙人基本對戰。</p><p><strong>代表作品：</strong>《Santorini》、《Brass: Birmingham》、《Radlands》。</p>',
    publisherLink: { label: '前往 Roxley 官網', href: 'https://roxley.com/' },
    ruleLink: { label: '官方經典版規則（英文 PDF）', href: 'https://files.roxley.com/Santorini-Rulebook-Web-2016.08.14.pdf' },
    introHtml: '<p>在愛琴海的小島上，雙方各帶領兩名工人逐層建起白色村落。每回合先移動、再建築；玩家必須同時替自己鋪出登高路線，並用建築或圓頂阻斷對手。規則精簡，但位置、層高與行動順序會形成高度互動的立體策略。</p><dl class="game-facts"><dt>人數</dt><dd>2 人基本對戰</dd><dt>時間</dt><dd>約 20 分鐘</dd><dt>年齡</dt><dd>8 歲以上</dd><dt>類型</dt><dd>立體建築、位置控制、抽象策略</dd></dl>',
    cover: '../../assets/covers/santorini.png',
    links: [
      { label: 'BGG 頁面', href: 'https://boardgamegeek.com/boardgame/194655/santorini' },
      { label: '官方介紹', href: 'https://roxley.com/products/santorini' },
      { label: '中文規則', href: 'https://www.dropbox.com/scl/fi/2h8md0s2p30339jro39n4/Santorini_TC.pdf?rlkey=7wq3962lt7veqnrz5t58wxjd2&e=1&dl=0' }
    ],
    openings: [{ value: 'standard', label: '標準空盤' }], rolloutLimit: 70,
    animationDuration(action) { return action.type === 'place' ? 220 : action.previewed ? 240 : 420; },
    animationOptions() { return { spring: true }; },
    rules: [
      { title: '配件與目標', html: '<ul><li>使用 5×5 棋盤、雙方各 2 名工人，以及第一層、第二層、第三層與圓頂建築。</li><li>讓自己的工人由較低位置移動到第三層，即可立即獲勝。</li></ul>' },
      { title: '初始設置', html: '<ol><li>棋盤初始沒有建築。</li><li>紅方在任意兩個不同空格放置兩名工人。</li><li>藍方再於其餘空格放置兩名工人。</li><li>四名工人放妥後，由紅方開始第一個完整回合。</li></ol>' },
      { title: '完整回合', html: '<ol><li><strong>選擇：</strong>選擇自己一名仍可合法移動的工人。</li><li><strong>移動：</strong>移到周圍八格中的一格。</li><li><strong>建築：</strong>在移動後工人周圍八格中的一格加蓋一層。</li></ol><p>除非工人因登上第三層而立即獲勝，否則每回合必須依序完成移動與建築。</p>' },
      { title: '移動規則', html: '<ul><li>目的地不能有其他工人，也不能有圓頂。</li><li>工人可以留在相同高度、向下移動任意層，或最多向上爬一層。</li><li>不可一次向上跨越兩層以上。</li></ul>' },
      { title: '建築規則', html: '<ul><li>建築格不能有工人，也不能已有圓頂。</li><li>可在空地蓋第一層，或在既有建築上依序加蓋第二、第三層。</li><li>第三層上再建築時放置圓頂；有圓頂的格子之後不能再進入或建築。</li><li>工人剛離開的起始格若符合上述條件，也可以成為本回合的建築位置。</li></ul>' },
      { title: '勝負判定', html: '<ul><li>自己的工人從較低層移動到第三層時，立即獲勝。</li><li>輪到玩家時若兩名工人都沒有任何合法移動，該玩家落敗。</li></ul>' }
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

  // 棋子物件不可就地修改（合併、復活、入陰間都建立新物件），因此狀態可用淺結構拷貝。
  function zombieCloneState(state) {
    return {
      turn: state.turn,
      board: state.board.map((row) => row.slice()),
      waiting: { first: state.waiting.first.slice(), second: state.waiting.second.slice() },
      scores: { first: state.scores.first, second: state.scores.second },
      continuing: state.continuing ? { r: state.continuing.r, c: state.continuing.c } : null,
      path: state.path.map((pos) => ({ r: pos.r, c: pos.c })),
      winner: state.winner,
      nextId: state.nextId
    };
  }

  function zombieWeightedPick(actions, weight) {
    let total = 0;
    for (const action of actions) total += weight(action);
    let target = Math.random() * total;
    for (const action of actions) {
      target -= weight(action);
      if (target < 0) return action;
    }
    return actions[actions.length - 1];
  }

  // 模擬抽樣必須看得到完整連跳鏈的總分（zombie-turn 巨集），
  // 改用只看單段分數的原子抽樣會大幅弱化 playout 品質（實測 1:19）。
  function zombieRolloutWeight(action) {
    if (action.type === 'zombie-turn') {
      if (action.score > 0) return 1.5 + action.score * 4;
      if (action.steps.some((step) => step.type === 'jump')) return 1.5 + action.steps.length * .25;
      return zombieRolloutWeight(action.steps[0]);
    }
    if (action.type === 'jump') return 1.5 + (action.score || 0) * 4;
    if (action.type === 'stop') return 0.25;
    if (action.type === 'revive') return 0.8;
    return 1;
  }

  games['zombie-jump'] = {
    title: '殭屍棋 JUMP',
    nameZh: '殭屍棋',
    nameEn: 'JUMP',
    credit: '設計者：Kevin Zhang，出版社：MAGICA',
    firstName: '紅方', secondName: '藍方', designer: '遊戲設計與美術：Kevin Zhang。', publisher: 'MAGICA 瑪吉卡工作室；2025 年推出中文／英文版本。',
    publisherHtml: '<p>MAGICA 瑪吉卡工作室以原創桌遊設計、試玩與群眾集資發行為主。《殭屍棋 JUMP》在 2025 年完成集資，使用簡潔的移動、堆疊與連跳規則形成雙人對戰。</p><p><strong>相關作品：</strong>《殭屍棋 JUMP》、《骰子貓與魚》、《狗骨頭爭霸戰》。</p>',
    publisherLink: { label: '前往 MAGICA 粉專', href: 'https://www.instagram.com/magica_studiovo/' },
    ruleLink: { label: '官方中文規則', href: 'https://drive.google.com/drive/folders/1v4JW7-4D5lLHNqgEyPc8M76hH-FL9CKO' },
    introHtml: '<p>陰陽兩界的殭屍在 5×5 棋盤上甦醒。玩家可以讓陰間棋子復活、移動並堆疊，也能以較高總等級的殭屍越過棋群，將對手送回陰間並取得分數。棋子的等級既是行動資源，也是跳躍力量，何時堆高、何時拆散會直接改變戰局。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>時間</dt><dd>約 10–20 分鐘</dd><dt>年齡</dt><dd>6 歲以上</dd><dt>類型</dt><dd>跳躍、堆疊、組合移動</dd></dl>',
    cover: '../../assets/covers/zombie-jump.jpg',
    links: [
      { label: 'BGG 頁面', href: 'https://boardgamegeek.com/boardgame/451607/jump' },
      { label: '官方介紹', href: 'https://www.zeczec.com/projects/Catandjump' },
      { label: '中文規則', href: 'https://drive.google.com/drive/folders/1v4JW7-4D5lLHNqgEyPc8M76hH-FL9CKO' }
    ],
    openings: [{ value: 'standard', label: '標準設置' }], rolloutLimit: 140,
    animationDuration(action) { return action.type === 'stop' ? 0 : action.to === 'out' ? 520 : 380; },
    animationOptions() { return { spring: true }; },
    immediateAction(state, actions) {
      return actions.find((action) => state.scores[state.turn] + (action.score || 0) >= 8);
    },
    cutoffReward(state, rootPlayer) {
      return .5 + (state.scores[rootPlayer] - state.scores[other(rootPlayer)]) / 16;
    },
    rolloutAction(state, actions) {
      const winningJump = this.immediateAction(state, actions);
      if (winningJump) return winningJump;
      return zombieWeightedPick(actions, zombieRolloutWeight);
    },
    rules: [
      { title: '配件與目標', html: '<ul><li>使用 5×5 棋盤；雙方各有等級 1、2、3 的殭屍棋，並各有一個陰間區域。</li><li>跳過對手棋可依被跳過棋的等級得分；先取得 8 分的玩家立即獲勝。</li></ul>' },
      { title: '初始設置', html: '<ul><li>藍方位於棋盤上側：第二排放滿 5 枚等級 1，最外排依序放置等級 2、空格、等級 3、空格、等級 2。</li><li>紅方以相同配置放在棋盤下側，並由紅方先手。</li><li>雙方陰間各另放 2 枚等級 2 棋，等待復活。</li></ul>' },
      { title: '回合行動', html: '<p>輪到玩家時選擇下列一種行動：</p><ol><li><strong>復活：</strong>從自己的陰間選一枚棋，放到棋盤任一空格。</li><li><strong>移動：</strong>將自己一枚棋移到上下左右相鄰的空格。</li><li><strong>堆疊：</strong>依堆疊規則，將自己的棋移到上下左右相鄰的己方棋上。</li><li><strong>跳躍：</strong>沿上下左右直線越過一串連續棋子，落在其後空格或直接跳出棋盤。</li></ol>' },
      { title: '堆疊規則', html: '<ul><li>等級 1 單棋可疊到己方等級 2 或等級 3 單棋上。</li><li>等級 2 單棋可疊到己方等級 3 單棋上。</li><li>由等級 1 單棋疊上等級 2 單棋形成的「總等級 3 堆疊」，可再疊到己方等級 3 單棋上。</li><li>等級 1 單棋可疊到己方總等級 5 的堆疊上。</li><li>堆疊棋的總等級等於其中所有單棋等級的總和。</li></ul>' },
      { title: '跳躍、吃子與陰間', html: '<ul><li>跳躍方向的相鄰格必須有棋，且其後為可落腳的空格或棋盤外。</li><li>一次跳躍可越過同一直線上一串連續棋；被越過棋的總等級不得高於跳躍棋的總等級。</li><li>被跳過的對手棋會拆成單枚送回對手陰間，跳躍玩家依其總等級得分。</li><li>跳過己方棋不會得分，也不會移除己方棋。</li><li>若跳出棋盤，跳躍棋拆成單枚回到自己的陰間，並結束回合。</li></ul>' },
      { title: '連跳與勝利', html: '<ul><li>跳躍落地後若仍有合法跳躍，可以用同一枚棋繼續跳；同一串連跳不能回到已走過的位置。</li><li>有後續跳躍時，玩家也可選擇停止，立即結束回合。</li><li>任一玩家累積 8 分，遊戲立即結束並由該玩家獲勝。</li></ul>' }
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
    searchActions(state) {
      const actor = state.turn;
      const turns = [];
      const walk = (current, steps, score) => {
        for (const action of this.actions(current)) {
          const next = this.apply(current, action);
          const nextSteps = [...steps, action];
          const nextScore = score + (action.score || 0);
          if (this.outcome(next) !== null || next.turn !== actor) turns.push({ type: 'zombie-turn', steps: nextSteps, score: nextScore });
          else walk(next, nextSteps, nextScore);
        }
      };
      walk(state, [], 0);
      return turns;
    },
    searchApply(source, action) {
      if (action.type !== 'zombie-turn') return this.apply(source, action);
      return action.steps.reduce((state, step) => this.apply(state, step), source);
    },
    expandSearchAction(action) { return action.type === 'zombie-turn' ? action.steps : [action]; },
    apply(source, action) {
      const state = zombieCloneState(source);
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
    title: '四色棋 Four Color Chess',
    nameZh: '四色棋',
    nameEn: 'Four Color Chess',
    credit: '設計者：奧羅，出版社：奧羅桌遊設計工作室',
    firstName: '黑方', secondName: '白方', designer: '遊戲設計：奧羅。這是設計者的第一款雙人抽象棋作品。', publisher: '獨立創作與非商業分享版本，目前沒有正式商業出版社。',
    publisherHtml: '<p>本作由奧羅桌遊設計工作室獨立創作，目前以非商業形式公開玩法，尚未交由正式商業出版社發行。因沒有可核實的完整出版目錄，這裡不另列未確認的代表作品。</p>',
    publisherLink: { label: '查看工作室創作來源', href: 'https://www.instagram.com/p/B5bsCvqla9f/?igsh=dGlyZndjbzR6ZGR3' },
    ruleLink: { label: '開啟本站完整規則', href: 'rules.html' },
    introHtml: '<p>四色棋把「下一步要動哪一枚棋」交給上一回合的落點決定。四種顏色同時存在於棋盤與棋子上；棋子停在哪一種顏色的格子，就會指定對手下一回合必須移動同色棋。玩家要在滑行、阻擋與指定焦點之間連續布局，迫使對手被指定的棋無路可走。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>時間</dt><dd>約 10–20 分鐘</dd><dt>類型</dt><dd>滑行、指定行動、封鎖</dd><dt>版本</dt><dd>獨立創作</dd></dl>',
    links: [
      { label: '創作來源', href: 'https://www.instagram.com/p/B5bsCvqla9f/?igsh=dGlyZndjbzR6ZGR3' },
      { label: '完整規則', href: 'rules.html' },
      { label: '遊戲大廳', href: '../../index.html' }
    ],
    openings: [{ value: 'standard', label: '經典' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }], rolloutLimit: 80,
    animationDuration(action) { return action.type === 'move' ? 360 : 0; },
    rules: [
      { title: '配件與目標', html: '<ul><li>4×4 四色棋盤一面；每一列各含紅、藍、黃、綠四種格色。</li><li>黑方與白方各有紅、藍、黃、綠棋各 1 枚。</li><li>讓對手回合中被指定的棋子沒有合法移動，即可獲勝。</li></ul>' },
      { title: '初始設置', html: '<ol><li>白方四枚棋放在最上列，黑方四枚棋放在最下列；每枚棋的顏色與起始格顏色相同。</li><li>黑方先手，先從有合法移動的黑棋中選擇一枚作為第一枚焦點棋。</li><li>若選擇隨機棋盤，四種格色仍會在每列各出現一次。</li></ol>' },
      { title: '焦點與移動', html: '<ol><li>回合開始時，只有焦點指定的棋子可以移動。</li><li>該棋可沿上下左右任一方向直線滑行，並停在路徑上的任一空格。</li><li>棋子不能斜走、不能跳過其他棋子，也不能停在有棋的格子。</li><li>完成移動後，查看落點的格色；對手同色棋成為下一回合的焦點棋。</li></ol>' },
      { title: '勝利條件', html: '<p>若輪到玩家時，焦點指定的棋子在四個方向都沒有任何合法空格可到達，該玩家立即落敗，上一位玩家獲勝。</p>' }
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
    title: '四步棋 Four Moves Chess',
    nameZh: '四步棋',
    nameEn: 'Four Moves Chess',
    credit: '設計者：來源未載，遊戲名稱：奧羅暫定',
    firstName: '紅方', secondName: '藍方', designer: '原始短片未列出可核實的個人設計者；玩法來源為 Instagram 帳號 celine.et.sasha，中文與英文遊戲名稱由奧羅暫定。', publisher: '未查到正式出版版本或出版社；目前為依公開玩法整理的非商業版本。',
    publisherHtml: '<p>目前未查到正式出版版本或出版社；本站依 Instagram 帳號 celine.et.sasha 公開的短片整理成可遊玩的非商業版本，中文與英文名稱皆為奧羅暫定。由於沒有出版目錄，因此不列代表作品。</p>',
    publisherLink: { label: '前往玩法來源帳號', href: 'https://www.instagram.com/celine.et.sasha/' },
    ruleLink: { label: '開啟本站完整規則', href: 'rules.html' },
    introHtml: '<p>四步棋是一款以數字格控制移動長度的雙人封鎖遊戲。棋子所在格的數字決定本回合必須走幾步，每一步都沿直線跳到下一個仍存在的格子；棋子離開後，原本的格子會從棋盤上移除。棋盤因此逐回合縮減，玩家要安排路徑並留下退路，直到對手再也無法完成移動。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>時間</dt><dd>約 10–15 分鐘</dd><dt>類型</dt><dd>路徑規劃、逐步移除、封鎖</dd><dt>名稱</dt><dd>暫定名稱</dd></dl>',
    links: [
      { label: '原始玩法短片', href: 'https://www.instagram.com/reel/DM0XE8Mo41a/?igsh=MXJic2dpODF4NndxdA==' },
      { label: '完整規則', href: 'rules.html' },
      { label: '遊戲大廳', href: '../../index.html' }
    ],
    openings: [{ value: 'standard', label: '經典' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }], rolloutLimit: 50,
    animationDuration(action) { return action.type === 'move' ? action.path.length * 250 : 0; },
    rules: [
      { title: '配件與目標', html: '<ul><li>使用 4×4 數字棋盤，格子標示 1、2、3、4 或起點 S。</li><li>紅、藍雙方各有 1 枚空心棋子，讓玩家仍能看見棋子下方的格子數字。</li><li>讓對手在自己的回合無法完成任何合法路徑，即可獲勝。</li></ul>' },
      { title: '初始設置', html: '<ol><li>依所選配置排列 16 個格子。</li><li>紅、藍棋分別放在兩個 S 格上，由紅方先手。</li><li>經典配置固定；隨機配置會重新排列數字與起點；相同配置沿用上一盤的排列。</li></ol>' },
      { title: '決定本回合步數', html: '<ul><li>棋子位於數字格時，本回合必須走足該數字所示的步數。</li><li>棋子位於 S 格時，可選擇走 1、2、3 或 4 步。</li><li>玩家直接選擇最終可到達的高亮格，棋子會依合法路徑逐步移動。</li></ul>' },
      { title: '每一步的走法', html: '<ul><li>每一步只能選擇上、下、左、右其中一個方向，不能斜走。</li><li>沿所選方向略過已移除的格子與另一枚棋子，停在該方向遇到的下一個仍存在且未被占用的格子。</li><li>同一回合不能再次停在已經過的格子，也不能停到對手棋所在格。</li><li>整條路徑必須剛好完成指定步數；少走或多走都不合法。</li></ul>' },
      { title: '移除格子與勝利', html: '<ul><li>完整移動結束後，該回合的起始格會從棋盤上移除，之後只能被跳過，不能再停留。</li><li>換對手回合後，若對手找不到任何能走足指定步數的完整路徑，上一位玩家立即獲勝。</li></ul>' }
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
    title: '跳躍森靈 Torii',
    nameZh: '跳躍森靈',
    nameEn: 'Torii',
    credit: '設計者：陳致寬，出版社：桌遊愛樂事',
    firstName: '紅方', secondName: '藍方', designer: '遊戲設計：陳致寬 Kuan Chen。美術設計：Julia Reynaud。', publisher: '桌遊愛樂事 EmperorS4。',
    publisherHtml: '<p>桌遊愛樂事 EmperorS4 成立於 2013 年，已推出數十款桌遊並發行至四十多個國家。《跳躍森靈 Torii》延續其重視主題、美術與易學策略的原創出版方向。</p><p><strong>代表作品：</strong>《花見小路》、《圓樓》、《神殿之謎》。</p>',
    publisherLink: { label: '前往桌遊愛樂事官網', href: 'https://tw.emperors4.com/' },
    ruleLink: { label: '官方中文規則（PDF）', href: 'https://tw.emperors4.com/files/rules/2024/08/Torii_Rulebook--Cn-.pdf' },
    introHtml: '<p>森靈在森林小徑間跳躍，引領信徒並建立鳥居。玩家每回合選擇一枚 1、2、3 行動板塊，讓森靈走足指定步數，並在沿途停留處散播自己的信徒。四名信徒連成一線便能建立鳥居；玩家必須在擴張信徒與保護既有成果之間掌握節奏。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>時間</dt><dd>約 15–30 分鐘</dd><dt>年齡</dt><dd>10 歲以上</dd><dt>類型</dt><dd>行動點、連鎖移動、區域建立</dd></dl>',
    cover: '../../assets/covers/torii.png',
    links: [
      { label: 'BGG 頁面', href: 'https://boardgamegeek.com/boardgame/424808/torii' },
      { label: '官方介紹', href: 'https://tw.emperors4.com/game/Torii' },
      { label: '中文說明書', href: 'https://tw.emperors4.com/files/rules/2024/08/Torii_Rulebook--Cn-.pdf' }
    ],
    openings: [{ value: 'standard', label: '標準' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }], rolloutLimit: 80,
    animationDuration(action) { return action.type === 'path' && !action.previewed ? action.path.length * 200 : action.type === 'build' ? 200 : 0; },
    rules: [
      { title: '配件與目標', html: '<ul><li>使用 4×4 棋盤、紅藍森靈各 1 枚、雙方信徒各 9 枚、鳥居各 4 座，以及每方 1、2、3 行動板塊各 1 枚。</li><li>在場上同時保有 9 名己方信徒，或先建立 4 座己方鳥居，即可獲勝。</li></ul>' },
      { title: '標準設置', html: '<ol><li>紅方森靈放在第 2 列第 2 欄，藍方森靈放在第 3 列第 3 欄。</li><li>紅方的 2 號板塊與藍方的 1 號板塊先翻至已使用面。</li><li>其餘信徒與鳥居放在各自供應區，由紅方先手。</li></ol>' },
      { title: '完整回合', html: '<ol><li><strong>選板塊：</strong>選擇自己一枚尚未使用的 1、2、3 板塊；數字就是本回合必須走足的步數。</li><li><strong>移動：</strong>森靈逐步向上下左右相鄰格移動，不能斜走。</li><li><strong>散播信徒：</strong>在每個實際停留的格子放置己方信徒；若有對手信徒則以己方信徒取代。</li><li><strong>建立鳥居：</strong>若形成橫向或直向四格己方信徒，必須在該線上選一格建立鳥居。</li></ol>' },
      { title: '移動與跳躍', html: '<ul><li>路徑必須剛好走足板塊數字；同一回合不能重訪格子，也不能回到起點。</li><li>森靈不能停在另一名森靈所在格。</li><li>遇到對手森靈阻隔所在路徑時，依跳躍規則越過該段；起點與被越過的格子不放置信徒。</li><li>鳥居所在格不放置信徒，既有鳥居不會被一般信徒取代。</li></ul>' },
      { title: '建立鳥居', html: '<ul><li>己方信徒填滿同一列或同一行四格時，立即從該線選一格放置己方鳥居。</li><li>鳥居所在格的信徒受到保護；該線其餘沒有鳥居保護的信徒移回供應區。</li><li>若一次行動同時形成多條完整直線，依序處理所有仍成立的建造。</li></ul>' },
      { title: '板塊重置與勝利', html: '<ul><li>使用過的行動板塊翻至已使用面；當自己的三枚板塊都已使用，於回合結束時全部重置。</li><li>場上同時有 9 名己方信徒，或建成第 4 座己方鳥居時，立即獲勝。</li></ul>' }
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
    searchActions(state) {
      if (state.building || state.pendingTile !== null) return this.actions(state);
      const plans = [];
      for (const tileAction of this.actions(state)) {
        const afterTile = this.apply(state, tileAction);
        for (const pathAction of this.actions(afterTile)) {
          plans.push({ type: 'torii-plan', tile: tileAction.tile, path: clone(pathAction.path), steps: [tileAction, pathAction] });
        }
      }
      return plans;
    },
    searchApply(source, action) {
      if (action.type !== 'torii-plan') return this.apply(source, action);
      return action.steps.reduce((state, step) => this.apply(state, step), source);
    },
    expandSearchAction(action) { return action.type === 'torii-plan' ? action.steps : [action]; },
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

  // ---------------------------------------------------------------------------
  // 冰塊棋 ICE STAGE
  // ---------------------------------------------------------------------------
  const ICE_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const ICE_CENTER = { r: 2, c: 2 };
  const iceCenterRegion = (r, c) => Math.abs(r - 2) + Math.abs(c - 2) <= 1;
  const icePlayerName = (player) => player === 'first' ? '藍方' : '橙方';
  const iceKindName = (kind) => kind === 'circle' ? '圓形棋' : '方塊棋';

  function iceSlide(board, from, dr, dc) {
    let r = from.r, c = from.c;
    while (inBounds(r + dr, c + dc, 5, 5) && !board[r + dr][c + dc]) { r += dr; c += dc; }
    return r === from.r && c === from.c ? null : { r, c };
  }
  function iceMovesFrom(board, from) {
    const moves = [];
    for (const [dr, dc] of ICE_DIRS) {
      const to = iceSlide(board, from, dr, dc);
      if (to) moves.push({ type: 'move', from: clone(from), to, dir: { dr, dc } });
    }
    return moves;
  }
  function iceGroups(board) {
    const seen = Array.from({ length: 5 }, () => Array(5).fill(false));
    const groups = [];
    for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
      if (!board[r][c] || seen[r][c]) continue;
      const owner = board[r][c].owner;
      const cells = [];
      const stack = [{ r, c }];
      seen[r][c] = true;
      let liberties = 0;
      while (stack.length) {
        const pos = stack.pop();
        cells.push(pos);
        for (const [dr, dc] of ICE_DIRS) {
          const rr = pos.r + dr, cc = pos.c + dc;
          if (!inBounds(rr, cc, 5, 5)) continue;
          const item = board[rr][cc];
          if (!item) liberties += 1;
          else if (item.owner === owner && !seen[rr][cc]) { seen[rr][cc] = true; stack.push({ r: rr, c: cc }); }
        }
      }
      groups.push({ owner, cells, liberties });
    }
    return groups;
  }
  function iceCounts(board) {
    const counts = { first: 0, second: 0 };
    const circles = { first: false, second: false };
    for (const row of board) for (const item of row) if (item) {
      counts[item.owner] += 1;
      if (item.kind === 'circle') circles[item.owner] = true;
    }
    return { counts, circles };
  }
  function iceStandardLayout() {
    const layout = [];
    for (let c = 0; c < 5; c += 1) {
      layout.push({ r: 0, c, owner: 'second', kind: c === 2 ? 'circle' : 'square' });
      layout.push({ r: 4, c, owner: 'first', kind: c === 2 ? 'circle' : 'square' });
    }
    return layout;
  }
  function iceRandomLayout() {
    const pairs = [];
    for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
      if (iceCenterRegion(r, c)) continue;
      if (r * 5 + c < (4 - r) * 5 + (4 - c)) pairs.push([{ r, c }, { r: 4 - r, c: 4 - c }]);
    }
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const shuffled = [...pairs].sort(() => Math.random() - .5).slice(0, 5);
      const circleIndex = Math.floor(Math.random() * 5);
      const layout = [];
      shuffled.forEach((pair, index) => {
        const flip = Math.random() < .5;
        const kind = index === circleIndex ? 'circle' : 'square';
        layout.push({ ...pair[flip ? 1 : 0], owner: 'first', kind });
        layout.push({ ...pair[flip ? 0 : 1], owner: 'second', kind });
      });
      const board = iceBoardFromLayout(layout);
      if (layout.every((item) => iceMovesFrom(board, item).length)) return layout;
    }
    return iceStandardLayout();
  }
  function iceBoardFromLayout(layout) {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    layout.forEach((item, index) => { board[item.r][item.c] = { owner: item.owner, kind: item.kind, id: `ice-${index}` }; });
    return board;
  }

  games['ice-stage'] = {
    title: '冰塊棋 ICE STAGE',
    nameZh: '冰塊棋',
    nameEn: 'ICE STAGE',
    credit: '設計者：來源未載，規則依本站說明書',
    firstName: '藍方', secondName: '橙方',
    designer: '說明書未載明可核實的設計者與美術；本頁依使用者提供的《ICE STAGE 冰塊棋》完整說明書實作。',
    publisher: '未載明出版資訊；目前為依說明書整理的網頁版本。',
    publisherHtml: '<p>說明書未載明出版社或發行資訊；本頁依使用者提供的完整說明書整理成可遊玩的網頁版本。因沒有可核實的出版目錄，這裡不另列代表作品。</p>',
    publisherLink: { label: '開啟本站完整規則', href: 'rules.html' },
    ruleLink: { label: '開啟本站完整規則', href: 'rules.html' },
    introHtml: '<p>在冰封的舞臺上，每一枚棋子都會一路滑行，直到碰上阻礙才停下。玩家運用棋子的位置封鎖對手、包圍敵方棋群，同時保護自己的核心棋子；設法讓自己的圓形棋抵達棋盤中央，或將對手逼入無法逃脫的局面。</p><dl class="game-facts"><dt>人數</dt><dd>2 人</dd><dt>棋盤</dt><dd>5×5</dd><dt>類型</dt><dd>滑行、包圍、封鎖</dd><dt>先手</dt><dd>藍方</dd></dl>',
    links: [
      { label: '完整規則', href: 'rules.html' },
      { label: '規則摘要', href: 'rules.html#summary' },
      { label: '遊戲大廳', href: '../../index.html' }
    ],
    openings: [{ value: 'standard', label: '標準' }, { value: 'random', label: '隨機' }, { value: 'same', label: '相同' }],
    rolloutLimit: 80,
    animationDuration(action) { return action.type === 'move' ? 380 : 0; },
    animationOptions() { return { spring: true }; },
    rules: [
      { title: '配件與目標', html: '<ul><li>5×5 棋盤；藍、橙雙方各有圓形棋 1 枚與方塊棋 4 枚，藍方先手。</li><li>棋盤正中央的格子稱為「中央格」。</li><li>讓自己的圓形棋抵達中央格、包圍移除對手的圓形棋，或在棋子總數不超過 5 枚時擁有較多棋子，即可獲勝。</li></ul>' },
      { title: '初始設置', html: '<ol><li><strong>標準：</strong>橙方 5 枚棋放在最上排、藍方 5 枚棋放在最下排，圓形棋位於該排中央。</li><li><strong>隨機：</strong>中央格與其上下左右 4 格保持空置；其餘格子中隨機選 5 組旋轉 180 度的對稱格，每組放置藍、橙棋各一枚，其中隨機一組放置雙方圓形棋。</li><li>設置完成後每一枚棋子必須至少能向一個方向移動，否則重新設置。</li></ol>' },
      { title: '滑行移動', html: '<ul><li>每回合選擇自己一枚棋子，沿上、下、左、右其中一個方向滑行，不能斜走。</li><li>棋子會持續滑行，停在棋盤邊界或其他棋子之前的最後一個空格；不能自行選擇距離或停在中途。</li><li>不能跳過或重疊任何棋子；所選方向的相鄰格已被占據時，該方向不能移動。</li><li>圓形棋與方塊棋的移動方式相同。</li></ul>' },
      { title: '中央格', html: '<ul><li>中央格不會主動使棋子停下；圓形棋仍依一般滑行規則移動。</li><li>只有當中央格剛好是該方向上最遠的合法位置時，圓形棋才能停在中央格。</li></ul>' },
      { title: '包圍與移除', html: '<ul><li>透過上、下、左、右相連的同色棋子組成棋群；圓形棋與方塊棋同色即可相連。</li><li>每次移動完成後檢查雙方所有棋群；整個棋群周圍沒有任何正交相鄰空格時，該棋群被完全包圍。</li><li>被完全包圍的棋群整群移除；所有被包圍的棋群先全部確認，再同時移除。</li><li>棋盤外不算空格；玩家可以進行使自己棋群被包圍的移動（自我包圍），移動後仍依正常規則移除。</li></ul>' },
      { title: '勝負與和局', html: '<ul><li>每次移除結算後依序檢查：圓形棋仍位於中央格者獲勝；只有一方圓形棋被移除時，另一方獲勝；棋子總數不超過 5 枚時，棋子較多者獲勝。</li><li>雙方圓形棋同時被移除、數量結算時雙方相同，或雙方都沒有合法行動時，遊戲和局。</li><li>輪到玩家時若所有棋子都無法移動，跳過該回合；只要有合法行動就必須移動。</li></ul>' }
    ],
    create(mode, previous) {
      let layout;
      if (mode === 'random') layout = iceRandomLayout();
      else if (mode === 'same' && previous?.layout) layout = clone(previous.layout);
      else layout = iceStandardLayout();
      return {
        state: { turn: 'first', board: iceBoardFromLayout(layout), passed: false, winner: null },
        snapshot: { layout }
      };
    },
    actions(state) {
      if (state.winner) return [];
      const result = [];
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
        if (state.board[r][c]?.owner !== state.turn) continue;
        result.push(...iceMovesFrom(state.board, { r, c }));
      }
      return result.length ? result : [{ type: 'skip' }];
    },
    apply(source, action) {
      const state = clone(source);
      if (action.type === 'skip') {
        if (state.passed) { state.winner = 'draw'; return state; }
        state.passed = true;
        state.turn = other(state.turn);
        return state;
      }
      const actor = state.turn;
      const piece = state.board[action.from.r][action.from.c];
      state.board[action.from.r][action.from.c] = null;
      state.board[action.to.r][action.to.c] = piece;
      const surrounded = iceGroups(state.board).filter((group) => group.liberties === 0);
      for (const group of surrounded) for (const pos of group.cells) state.board[pos.r][pos.c] = null;
      const centerPiece = state.board[ICE_CENTER.r][ICE_CENTER.c];
      if (centerPiece?.kind === 'circle') { state.winner = centerPiece.owner; return state; }
      const { counts, circles } = iceCounts(state.board);
      if (!circles.first && !circles.second) { state.winner = 'draw'; return state; }
      if (!circles.first) { state.winner = 'second'; return state; }
      if (!circles.second) { state.winner = 'first'; return state; }
      if (counts.first + counts.second <= 5) {
        state.winner = counts.first === counts.second ? 'draw' : counts.first > counts.second ? 'first' : 'second';
        return state;
      }
      state.passed = false;
      state.turn = other(actor);
      return state;
    },
    outcome(state) { return state.winner; },
    describe(action, before, after) {
      const actor = icePlayerName(before.turn);
      if (action.type === 'skip') return `${actor}沒有合法行動，跳過回合。`;
      const piece = before.board[action.from.r][action.from.c];
      const removed = before.board.flat().filter(Boolean).length - after.board.flat().filter(Boolean).length;
      const base = `${actor}將${iceKindName(piece.kind)}滑到${posText(action.to)}`;
      const capture = removed > 0 ? `，包圍移除 ${removed} 枚棋子` : '';
      const result = after.winner === 'draw' ? '，雙方和局' : after.winner ? `，${icePlayerName(after.winner)}獲勝` : '';
      return `${base}${capture}${result}。`;
    },
    view(state, ui) {
      const actions = this.actions(state);
      const selected = ui.selectedPos && state.board[ui.selectedPos.r]?.[ui.selectedPos.c]?.owner === state.turn ? ui.selectedPos : null;
      const movable = new Set(actions.filter((action) => action.type === 'move').map((action) => key(action.from.r, action.from.c)));
      const targets = new Set(selected ? actions.filter((action) => action.type === 'move' && samePos(action.from, selected)).map((action) => key(action.to.r, action.to.c)) : []);
      let board = '';
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) {
        const item = state.board[r][c];
        const isCenter = r === ICE_CENTER.r && c === ICE_CENTER.c;
        const classes = [];
        if (isCenter) classes.push('ice-center');
        if (selected && samePos(selected, { r, c })) classes.push('selected');
        else if (targets.has(key(r, c))) classes.push('legal');
        else if (!selected && item?.owner === state.turn && movable.has(key(r, c))) classes.push('legal');
        const piece = item ? `<span class="piece ice-piece ice-${item.kind} ${item.owner}" data-anim-id="${item.id}"></span>` : '';
        const label = `${posText({ r, c })}${isCenter ? '，中央格' : ''}${item ? `，${icePlayerName(item.owner)}${iceKindName(item.kind)}` : '，空格'}`;
        board += cellButton(r, c, classes.join(' '), piece, label);
      }
      const outcome = this.outcome(state);
      const hint = outcome
        ? outcome === 'draw' ? '遊戲結束：雙方和局' : `遊戲結束：${icePlayerName(outcome)}獲勝`
        : selected ? '請選擇目的地，棋子會滑到該方向最遠的空格' : `現在是${icePlayerName(state.turn)}的回合，請選擇要滑行的棋子`;
      return {
        cols: 5, rows: 5, boardClass: 'ice-board', board, hideTray: true, hint,
        hideScores: true,
        winColors: { first: '#3e7ede', second: '#ee8a34' },
        turnColors: { first: '#3e7ede', second: '#ee8a34' },
        firstScore: '', secondScore: ''
      };
    },
    bind(state, ui, controller, board) {
      board.querySelectorAll('[data-r]').forEach((button) => button.addEventListener('click', () => {
        if (!controller.isHumanTurn()) return;
        const pos = { r: Number(button.dataset.r), c: Number(button.dataset.c) };
        const piece = state.board[pos.r][pos.c];
        const selected = ui.selectedPos && state.board[ui.selectedPos.r]?.[ui.selectedPos.c]?.owner === state.turn ? ui.selectedPos : null;
        if (selected) {
          const action = this.actions(state).find((item) => item.type === 'move' && samePos(item.from, selected) && samePos(item.to, pos));
          if (action) { controller.commit(action); return; }
          if (samePos(selected, pos)) { controller.setUi({ selectedPos: null }); return; }
        }
        if (piece?.owner === state.turn && this.actions(state).some((item) => item.type === 'move' && samePos(item.from, pos))) {
          controller.setUi({ selectedPos: pos });
        }
      }));
      const only = this.actions(state);
      if (controller.isHumanTurn() && only.length === 1 && only[0].type === 'skip') setTimeout(() => controller.commit(only[0]), 250);
    }
  };

  window.BOARD_GAMES = games;
}());
