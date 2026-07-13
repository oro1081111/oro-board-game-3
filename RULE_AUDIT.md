# 規則查核與實作狀態

| 遊戲 | 主要來源 | 3.0 狀態 | 已採用的關鍵判定 |
|---|---|---|---|
| 花園棋 Mijnlieff | 2.0 `gameLogic.ts`、`MijnlieffGame.tsx`、使用者修正 | 完成 | 輪到玩家時手上無棋立即結束；有棋但無落點才跳過並清除限制。 |
| 蒐靈祭 Soulaween | 2.0 `soulaweenLogic.ts`、`SoulaweenGame.tsx`、使用者修正 | 完成 | 棋子為橘／綠雙面同一種棋；勝率使用 MCTS。 |
| 聖托里尼 Santorini | 2.0 `SantoriniGame.tsx`、Roxley 基礎規則 | 完成 | 無神力版；完整 action 包含移動與建築；MCTS rollout 使用局面啟發式。 |
| 殭屍棋 JUMP | 2.0 `ZombieJumpGame.tsx`、使用者修正 | 完成 | 總等級 3 堆疊指單枚 1 與單枚 2 的堆疊；支援復活、堆疊、連跳、停止與跳出。 |
| 四色棋 | 1.0 `FCG.html`、使用者修正 | 完成 | 經典盤面與初始棋子依程式碼；黑方先選焦點，落點格色決定對手焦點。 |
| 四步棋 | 1.0 `FMG.html` | 完成 | 數字決定步數；沿正交方向跳到下一可停留格；離開格封閉。 |
| 跳躍森靈 Torii | 1.0 `Torii.html` | 完成 | 行動板塊、路徑、信徒替換、四連線建鳥居、9 信徒／4 鳥居勝。 |

## 資訊來源註記

- 花園棋設計者 Andy Hopwood；英中版 Garden／花園棋由 Taiwan Boardgame Design 推出。
- 聖托里尼設計者 Gordon（Gord）Hamilton；本專案標示 Roxley Games 版本。
- 四色棋、四步棋與 Torii 的介紹資訊沿用 1.0 頁面記載。
- 殭屍棋參考程式未載設計者與出版社，因此介面明確標示「來源未載」。

仍未有可靠來源的資訊不得補猜測；新增資料前需附來源或由使用者確認。
