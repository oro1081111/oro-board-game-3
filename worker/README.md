# oro-plays — play counts and game availability backend

這個 Cloudflare Worker + KV 同時處理：

- 每款遊戲的全站遊玩次數。
- 每款遊戲是否對玩家開放。
- 使用 `ADMIN_TOKEN` 保護的管理者 API。

## API

### 公開 API

- `GET /counts`
- `POST /play?game=<id>`
- `GET /availability`

### 管理者 API

以下 API 必須附帶：

```http
Authorization: Bearer <ADMIN_TOKEN>
```

- `GET /admin/availability`
- `POST /admin/availability`

修改範例：

```json
{
  "game": "santorini",
  "enabled": false
}
```

## Cloudflare 設定

專案根目錄的 `wrangler.toml` 已將 Worker 名稱設為 `oro-board-game-3`，並將 `PLAYS` 綁定到既有 KV namespace。

合併程式碼後，只需要在 Cloudflare Worker 設定一次管理者 Secret：

1. 進入 Cloudflare Dashboard。
2. 開啟 Worker `oro-board-game-3`。
3. 進入 **Settings → Variables and Secrets**。
4. 新增加密 Secret：
   - 名稱：`ADMIN_TOKEN`
   - 值：自行產生的高強度密碼。
5. 儲存並重新部署 Worker。

建議使用至少 24 個隨機字元，不要使用 GitHub 密碼或其他服務的共用密碼。

## 管理頁

部署完成後開啟：

```text
https://oro1081111.github.io/oro-board-game-3/admin.html
```

輸入 `ADMIN_TOKEN` 後即可切換遊戲。密碼只儲存在目前分頁的 `sessionStorage`，關閉該分頁後即失效。

## KV 資料

- `counts`：各遊戲遊玩次數。
- `availability`：各遊戲開放狀態。

若 `availability` 尚不存在或內容損壞，Worker 會將所有遊戲視為開放，避免新部署時意外關閉整站。

## Notes

- Free tier 的 KV 限額需依 Cloudflare 當期方案為準。
- 遊玩次數仍是由前端觸發，並非防竄改的精確統計。
- KV 寫入在全球節點間可能有短暫傳播延遲。
