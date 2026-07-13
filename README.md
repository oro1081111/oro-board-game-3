# 棋類遊戲3.0 規劃

第一階段只做純靜態說明書，不寫遊戲互動程式。

## 目錄原則

每款遊戲一個資料夾：

- `games/<game-id>/rules.html`：該遊戲的配件、設置、流程、勝利條件。
- 未來可在同資料夾加入 `logic.ts`、`ai.ts`、`tests`、素材圖示。

## 重寫順序建議

1. 規則文件定稿。
2. 抽出每款遊戲的 State / Action / Rules。
3. 建立共用搜尋介面，先支援 MCTS，再加 minimax/alpha-beta。
4. 做返回上一步：以 history stack 儲存狀態，不做反向操作。
5. 最後做連線：只同步 Action，由雙方各自套用同一套 rules。

## 規則來源

本批文件依目前兩個既有專案的程式碼整理：

- `棋類遊戲`：四色棋、四步棋、Torii。
- `棋類遊戲2.0`：Mijnlieff、Soulaween、Santorini、Zombie Jump。
