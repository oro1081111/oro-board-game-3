# Soulaween 實作摘要

`interface.html` 是 3.0 第一款完整垂直切片，包含：

- 4×4 雙面靈魂棋規則、相鄰翻轉、四連線收取、滿盤處理與先得 3 分。
- 人類、隨機與 MCTS 玩家。
- MCTS 勝率條；背景計算保留上一個值，終局固定顯示 100/0。
- 遊戲設定、難度／迭代數、開始新對局、Undo、日誌、規則與介紹分頁。
- 手機與桌面響應式介面。

Soulaween 保留為獨立頁面；其他六款已改用 `assets/game-core.js`、`assets/games.js` 與 `assets/game-shell.css` 的共用架構。未來若重構 Soulaween，必須先用現有行為測試鎖定規則，避免功能回歸。
