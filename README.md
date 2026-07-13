# 棋類遊戲3.0

棋類遊戲3.0採用「一次完整完成一款遊戲」的方式重寫。蒐靈祭 Soulaween 是第一款正式基準遊戲，後續遊戲依同一套UI、規則、AI、undo、日誌與驗證標準實作。

## 開發入口

- `GAME_IMPLEMENTATION_SOP.md`：新增遊戲的完整流程與完成標準。
- `index.html`：正式遊戲大廳。
- `interface.html`：目前可玩的共用介面與Soulaween基準實作。
- `SOULAWEEN_IMPLEMENTATION.md`：Soulaween狀態、規則函式與AI紀錄。
- `games/<game-id>/rules.html`：每款遊戲的詳細規則。

## 重寫順序

1. 依SOP完成規則audit。
2. 完成規則、UI、遊戲流程、AI、undo與日誌。
3. 完成手機、桌面及瀏覽器操作驗證。
4. 更新文件並推送GitHub Pages。
5. 前一款達到完成定義後，才開始下一款。

## 規則來源

- `棋類遊戲`：四色棋、四步棋、Torii。
- `棋類遊戲2.0`：花園棋、Soulaween、Santorini、Zombie Jump。
