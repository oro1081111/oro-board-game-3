# 棋類遊戲 3.0

九款雙人棋類遊戲的純靜態網頁版。首頁、遊戲畫面、設定、勝率條、行動日誌、規則分頁與返回上一步採用統一介面，可直接部署到 GitHub Pages。

## 已完成遊戲

| 遊戲 | 遊戲頁 | 規則頁 |
|---|---|---|
| 蒐靈祭 Soulaween | `games/soulaween/game.html` | `games/soulaween/rules.html` |
| 花園棋 Garden | `games/mijnlieff/game.html` | `games/mijnlieff/rules.html` |
| 聖托里尼 Santorini | `games/santorini/game.html` | `games/santorini/rules.html` |
| 殭屍棋 JUMP | `games/zombie-jump/game.html` | `games/zombie-jump/rules.html` |
| 四色棋 Four Color Chess | `games/four-color-chess/game.html` | `games/four-color-chess/rules.html` |
| 四步棋 Four Moves Chess | `games/four-moves-chess/game.html` | `games/four-moves-chess/rules.html` |
| 跳躍森靈 Torii | `games/torii/game.html` | `games/torii/rules.html` |
| 冰塊棋 ICE STAGE | `games/ice-stage/game.html` | `games/ice-stage/rules.html` |
| 奇雞連連 Gobblet Gobblers | `games/gobblet/game.html` | `games/gobblet/rules.html` |

## 共用架構

- `assets/game-shell.css`：手機與桌面共用遊戲介面。
- `assets/game-core.js`：設定、日誌、Undo、勝率、AI 排程與共用 MCTS。
- `assets/games.js`：九款遊戲的狀態、合法行動、狀態轉移與棋盤繪製。
- `interface.html`：舊網址相容轉址，實際遊戲頁為 `games/soulaween/game.html`。
- `tests/game-rules.test.cjs`：九款共用架構遊戲的規則與 MCTS smoke test。
- `GAME_IMPLEMENTATION_SOP.md`：未來新增遊戲的固定流程與驗收條件。

## AI

所有遊戲都使用 MCTS。一般遊戲採隨機 rollout，不使用獨立 Minimax 評分；奇雞連連會在根節點排除可阻擋的下一手敗局，rollout 也依序採用立即獲勝、安全阻擋、隨機行動；聖托里尼因分支數高，依 2.0 實作方向，在 MCTS rollout 中加入立即登三層、高度、可移動性與中央控制評估。最終行動仍由 MCTS 根節點訪問次數決定。

## 本機驗證

```powershell
node tests\game-rules.test.cjs
node tests\static-site.test.cjs
python -m http.server 8875 --bind 127.0.0.1
```

瀏覽 `http://127.0.0.1:8875/`。專案不需要建置步驟或第三方執行期套件。

GitHub Actions 會在每次推送到 `main` 或建立 Pull Request 時，自動執行規則、MCTS、九款共用頁面與內部圖片／連結檢查。

## 規則來源

1. 使用者已確認的規則修正。
2. `棋類遊戲2.0` 的實際狀態轉移與 UI 行為。
3. `棋類遊戲/oro-games-review` 的 1.0 實際程式。
4. 專案內 `games/<game-id>/rules.html`。
5. 官方或可靠公開資料。

來源衝突或沒有記載時不得自行猜測，需記錄衝突並詢問使用者。
