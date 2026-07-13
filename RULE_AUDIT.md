# 規則查核表

本資料夾第一階段的規則說明書分成兩種來源：

1. 目前程式碼實作規則：可作為 3.0 重寫時的直接規格。
2. 公開/官方規則：若查得到，需與程式碼比對；不一致時要決定以哪個為準。

## 已整理遊戲

| 遊戲 | 文件 | 目前來源 | 查核狀態 | 待確認 |
|---|---|---|---|---|
| 花園棋 Mijnlieff | `games/mijnlieff/rules.html` | `棋類遊戲2.0/src/gameLogic.ts`、`MijnlieffGame.tsx` | 未查到可靠公開規則頁；目前以程式碼為準 | A/B/C 變體是否為自訂；內圈/外圈命名是否與實體規則一致 |
| 蒐靈祭 Soulaween | `games/soulaween/rules.html` | `棋類遊戲2.0/src/soulaweenLogic.ts`、`SoulaweenGame.tsx` | 未查到可靠公開規則頁；目前以程式碼為準 | 滿盤移除「本回合放置顏色」是否為正式規則 |
| 聖托里尼 Santorini | `games/santorini/rules.html` | `棋類遊戲2.0/src/SantoriniGame.tsx`；公開基礎規則可交叉確認 | 基礎流程與公開規則一致：5x5、移動後建築、上升最多 1 層、登上第 3 層勝、對手無法移動勝 | 是否要加入神力規則；目前文件是無神力版本 |
| 殭屍棋 JUMP | `games/zombie-jump/rules.html` | `棋類遊戲2.0/src/ZombieJumpGame.tsx` | 未查到可靠公開規則頁；目前以程式碼為準 | 復活是否消耗整回合；跳出棋盤回陰間是否為正式規則；堆疊特例是否完整 |
| 四色棋 Four Color Chess | `games/four-color-chess/rules.html` | `棋類遊戲/oro-games-review/FCG.html` | 看起來是自製遊戲；目前以程式碼為準 | 是否有紙本/正式版規則與目前網頁版不同 |
| 四步棋 Four Moves Chess | `games/four-moves-chess/rules.html` | `棋類遊戲/oro-games-review/FMG.html` | 未查到可靠公開規則頁；目前以程式碼為準 | 是否有原始 IG 影片以外的正式規則；S 格與跳過空格描述需確認 |
| Torii 跳躍森靈 | `games/torii/rules.html` | `棋類遊戲/oro-games-review/Torii.html` | 未查到可靠公開規則頁；目前以程式碼為準 | 舊版程式標示為「沒有森靈能力的基礎版本」，需確認是否只做基礎版 |

## 下一步原則

- 有公開規則的遊戲：先比對公開規則與目前程式碼。
- 查不到公開規則的遊戲：不補猜測，列出問題請使用者確認。
- 確認後才進入 3.0 程式重寫。

