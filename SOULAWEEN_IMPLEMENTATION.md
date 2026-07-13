# Soulaween 完成版實作紀錄

此檔記錄第一個完整樣板遊戲的實作方式。規則來源以 `棋類遊戲2.0/src/soulaweenLogic.ts` 與 `SoulaweenGame.tsx` 為準；未查到可靠公開規則時，不自行補猜。

## 已完成功能

- 4x4 空棋盤開局。
- 雙面靈魂棋：橘色 / 綠色，共用棋子，不屬於特定玩家。
- 人類玩家可選擇橘面或綠面後，在空格放置。
- 放置後翻轉上下左右相鄰棋子，斜角不翻。
- 檢查橫列、直行、兩條對角線的 4 格同色連線。
- 出現連線時進入收取階段，玩家點選連線其中一格即可收取該線。
- 收取後目前玩家得 1 分，先達 3 分獲勝。
- 回合結束若棋盤全滿，移除所有與本回合放置顏色相同的棋子。
- 開始新對局、返回首頁、返回上一步。
- 行動日誌、規則說明、遊戲介紹分頁。
- 先手 / 後手可設定為人類玩家、隨機猴子、電腦AI。
- 電腦AI 使用 MCTS；隨機猴子使用合法落點與顏色隨機。
- 勝率條完全使用 MCTS：人類回合以設定迭代數的一半進行評估，最低 200、最高 600 次；AI 決策使用完整設定迭代數，並由同一次搜尋同時取得動作與勝率，避免重複運算。和局以雙方各 0.5 勝計入顯示比例。

## 核心資料模型

- `board: (null | "green" | "orange")[][]`
- `scores: { first: number, second: number }`
- `turn: "first" | "second"`
- `phase: "move" | "collect" | "gameover"`
- `possibleLines: { color, positions[] }[]`
- `history: snapshot[]`
- `logs: string[]`

## 必要函式

- `createEmptyBoard()`
- `getLegalCells(board)`
- `flipAdjacent(board, r, c)`
- `checkLines(board)`
- `performPlacement(move, automatic)`
- `collectLine(index, automatic)`
- `finalizeTurn(board, placedColor)`
- `mctsSearch(board, scores, turn, iterations)`
- `undoMove()`

## 新增下一個遊戲時的最小 SOP

1. 先確認規則來源；不確定的規則寫入 audit 或直接詢問。
2. 定義該遊戲的 `board / scores / turn / phase / move`。
3. 實作 `getLegalMoves`、`applyMove`、`isTerminal`、`evaluate/result`。
4. 接到共用 UI：棋盤、狀態卡、設定 modal、行動日誌、規則/介紹分頁。
5. 先做隨機 AI，再接 MCTS 或 minimax。
6. 加入 undo snapshot，確認 AI 對局中 undo 會回到人類可操作狀態。
7. 用 headless Chrome 做最小互動測試：載入、合法行動、AI 回合、undo、設定。

## 實作位置

- 主頁：`interface.html`
- 規則頁：`games/soulaween/rules.html`
- 本檔：`SOULAWEEN_IMPLEMENTATION.md`
