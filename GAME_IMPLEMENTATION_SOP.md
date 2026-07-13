# 棋類遊戲 3.0 新增遊戲 SOP

此文件是新增遊戲的固定規格。Soulaween 與目前六款遊戲是可執行範例；新增遊戲時應延用共用殼層，不複製整份 UI。

## 1. 規則確認順序

1. 使用者已明確修正的規則最高優先。
2. 讀取 2.0 與 1.0 的實際可執行程式，確認初始狀態、合法行動、完整回合與終局。
3. 與 `games/<game-id>/rules.html` 比對。
4. 必要時查官方規則或可靠公開資料。
5. 仍有衝突時停止實作該段，列出兩種行為與來源，直接詢問使用者。

禁止依遊戲名稱、常見玩法或個人印象補規則。

## 2. 固定檔案結構

```text
index.html
assets/
  lobby.css
  game-shell.css
  game-core.js
  games.js
games/<game-id>/
  game.html
  rules.html
tests/
  game-rules.test.cjs
```

新增遊戲通常只需要：

1. 在 `assets/games.js` 新增一個 adapter。
2. 新增最小的 `games/<game-id>/game.html` wrapper。
3. 新增或修正 `rules.html`。
4. 在首頁與桌面遊戲切換清單加連結。
5. 在規則測試中確認新 adapter 會被掃描。

## 3. 遊戲 Adapter 契約

每款遊戲必須提供：

```js
{
  title,
  credit,
  firstName,
  secondName,
  openings,
  rolloutLimit,
  create(opening, previousSnapshot),
  actions(state),
  apply(state, action),
  outcome(state),
  describe(action, before, after),
  view(state, ui, controller),
  bind(state, ui, controller, board, tray)
}
```

- `actions(state)` 必須回傳完整且可序列化的合法行動。
- `apply` 不得修改傳入 state；回傳下一個 state。
- 同一玩家需連續操作時，下一個 state 保持相同 `turn`。
- `outcome` 只能回傳 `first`、`second`、`draw` 或 `null`。
- AI 與真人必須共用同一組 `actions` 與 `apply`，不可各寫一套規則。

## 4. 狀態與完整回合

狀態至少包含：

```text
turn        first 或 second
winner      尚未結束時為 null
board       可序列化棋盤資料
phase       遊戲需要多階段操作時使用
```

UI 暫時選取放在 controller 的 `ui`，不要混入規則狀態。只有會影響合法行動、AI 或 Undo 的資訊才寫入 state。

AI action 應盡量代表一個完整規則行動。例如聖托里尼的 action 同時包含工人、移動格與建築格；Torii 因選板塊與建鳥居會改變後續合法行動，可保留多階段 state。

## 5. 共用 UI 要求

- 64px 以內的標題列：返回、遊戲名稱與設計資訊、設定齒輪。
- MCTS 勝率文字與雙色勝率條。
- 兩側分數或遊戲資源顯示。
- 固定比例棋盤，手機不水平溢出。
- 棋盤下方先顯示可選棋子／行動，再顯示單行玩家提示。
- 開始新對局、遊戲說明、返回上一步三個按鈕。
- 設定中的先手與後手選項必須在手機上各自同列顯示。
- 行動日誌、規則說明、遊戲介紹三個分頁。
- 桌面版增加遊戲切換與狀態側欄；手機版隱藏側欄。

## 6. MCTS 規格

共用 MCTS 介面只依賴：

```text
actions(state)
apply(state, action)
outcome(state)
state.turn
```

- UCT 在對手節點反轉 exploitation，不能假設每個 action 都換手。
- 根節點以最高訪問次數選行動。
- 和局 reward 為 0.5。
- rollout 超過深度上限時，一般遊戲回傳 0.5。
- AI 使用設定的完整迭代數；背景勝率使用較少迭代並保留前一次顯示，不能先閃回 50:50。
- 搜尋必須分批執行並讓出主執行緒，避免手機點擊延遲。
- 終局時勝方固定 100%，敗方固定 0%；和局 50:50。

遊戲可選擇提供：

```js
rolloutAction(state, actions)
cutoffReward(state, rootPlayer)
```

只有規則／產品決策明確允許時才加入啟發式。目前僅聖托里尼使用高度、移動性、中央控制與立即勝利 rollout policy；其他共用遊戲維持隨機 rollout。

## 7. Undo 與日誌

- 每次 `commit` 前保存 state、UI 與日誌長度。
- Undo 取消尚未完成的背景搜尋，還原 snapshot，再重新排程目前玩家。
- 玩家對 AI 時，Undo 應避免停在會立刻由 AI 重播且無法操作的狀態。
- `describe` 必須記錄玩家、行動、座標與得分／建造等必要結果。

## 8. 驗收流程

每款遊戲至少驗證：

1. 初始棋盤、棋子數與先手正確。
2. `actions` 只產生合法行動。
3. 套用 action 後原 state 不變，新 state 正確。
4. 多階段操作不會提早換手。
5. 終局與勝率 100/0 正確。
6. 隨機玩家與 MCTS 玩家可完成行動。
7. Undo、開始新對局、設定、三個說明分頁可操作。
8. 390px 級手機與桌面版無水平溢出、遮擋或文字重疊。
9. `node tests\game-rules.test.cjs` 通過。
10. 瀏覽器 console 無 error。
11. 首頁連結、規則連結與返回首頁正確。
12. 提交、推送後 GitHub Pages 回傳 HTTP 200。

## 9. 完成定義

「完成一款遊戲」表示規則、完整對局、人類操作、隨機玩家、MCTS、勝率、設定、Undo、日誌、規則與介紹分頁、手機／桌面排版及自動測試全部可用。只有棋盤外觀或可點擊原型不算完成。
