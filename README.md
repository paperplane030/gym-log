# Gym Log

自用健身紀錄 PWA。記錄每次訓練的動作、重量、次數；資料先存在手機，有網路時同步到 Supabase。

## 文件

- [功能說明](docs/FEATURES.md)：每個畫面怎麼用
- [技術文件](docs/TECHNICAL.md)：使用的技術、樣式寫法、資料結構、同步機制

## 技術

Vue 3 · TypeScript · Vite · Tailwind CSS v4 · Pinia · Vue Router · vite-plugin-pwa · Dexie.js（IndexedDB） · Supabase（PostgreSQL + Google 登入） · SortableJS

不使用 UI 元件庫，表單都是原生元素搭配 Tailwind，詳見[技術文件](docs/TECHNICAL.md#3-樣式與-ui)。

## 開始開發

```bash
npm install
cp .env.example .env   # 填入 Supabase Project URL 與 Publishable key（正式環境已寫在 .env.production）
npm run dev            # http://localhost:5173
```

## Supabase 設定

1. 到 Supabase 後台 → **SQL Editor**，貼上 `supabase/migrations/0001_init.sql` 全部內容並執行。
2. **Authentication → Sign In / Providers → Google**：啟用並填入 Google OAuth Client ID / Secret。
3. **Authentication → URL Configuration**：
   - Site URL：正式網址（開發時可先填 `http://localhost:5173`）
   - Redirect URLs：`http://localhost:5173/**`、`https://<正式網址>/**`

## 同步機制

- 所有新增／修改先寫入 IndexedDB，並標記 `_dirty = 1`。
- 同步時依序：推送 dirty 資料（upsert）→ 依 `server_updated_at` 拉取上次之後的變更。
- 衝突處理：以 `updated_at` 較新者為準（資料庫 trigger 會忽略較舊的寫入）。
- 刪除為軟刪除（`deleted_at`）。
- 開啟 App、回到前景、恢復網路時會自動同步。

## 目錄

```
src/
  db/          資料表型別、本機資料庫（Dexie）、同步邏輯、預設動作
  stores/      Pinia：登入、同步狀態
  composables/ 主題切換、Dexie live query
  views/       各頁面
  components/  底部導覽、同步狀態
supabase/migrations/  資料表、trigger、RLS 權限
```

## 進度

- [x] 專案骨架、PWA、深色模式
- [x] 資料表與 RLS
- [x] Google 登入、離線優先同步
- [x] 動作庫（新增／編輯／刪除）
- [x] 課表範本（含目標組數／次數／重量）
- [x] 記錄訓練（顯示上次紀錄與目標作為參考）
- [x] 歷史紀錄
- [x] 拖曳排序（組、範本動作）
- [x] 匯出／匯入（Excel 可貼上格式、CSV）
