# 技術文件

Gym Log 是自用的健身紀錄 PWA。前端用 Vue 3，資料先存在瀏覽器的 IndexedDB，有網路時同步到 Supabase。沒有自己寫後端，前端直接呼叫 Supabase，權限由資料庫的 RLS 控制。

- 功能說明請看 [FEATURES.md](./FEATURES.md)
- 安裝與部署請看 [README](../README.md)

---

## 1. 技術總覽

| 分類 | 技術 | 版本 | 用途 |
|---|---|---|---|
| 框架 | Vue 3（Composition API、`<script setup>`） | 3.5 | 畫面 |
| 語言 | TypeScript（strict 模式） | 6.0 | 型別檢查 |
| 建置 | Vite | 8 | 開發伺服器、打包 |
| 樣式 | Tailwind CSS v4（`@tailwindcss/vite`） | 4.3 | 所有樣式 |
| 路由 | Vue Router | 5 | 頁面切換 |
| 狀態管理 | Pinia | 4 | 登入狀態、同步狀態 |
| 本機資料庫 | Dexie.js（IndexedDB 封裝） | 4 | 離線儲存、即時查詢 |
| 雲端 | Supabase（PostgreSQL、Auth） | supabase-js 2 | 資料備份、Google 登入 |
| PWA | vite-plugin-pwa（Workbox） | 2 | 加入主畫面、離線快取 |
| 拖曳排序 | SortableJS | 1.15 | 組、範本動作的排序 |

### 沒有使用的東西
- **沒有 UI 元件庫**：Element Plus、Vant、Vuetify、Headless UI 等都沒用。所有元件都是自己寫的。
- **沒有 CSS 前處理器**：沒用 Sass 或 Less，樣式全部用 Tailwind。
- **沒有圖示套件**：圖示是直接寫在元件裡的 inline SVG。
- **沒有 HTTP 套件**：Supabase 請求都透過 `@supabase/supabase-js`。
- **沒有自建後端**：所有邏輯都在前端，安全性靠 Supabase 的 RLS。

---

## 2. 目錄結構

```
gym-log/
├─ index.html              入口 HTML（在 Vue 載入前先套用深色模式，避免閃白）
├─ vite.config.ts          Vite、Tailwind、PWA 設定
├─ .env.example            本機開發用環境變數範本
├─ .env.production         正式環境變數（公開值，可放進 repo）
├─ vercel.json             Vercel 部署：所有路徑導回 index.html
├─ wrangler.jsonc          Cloudflare Workers 部署設定
├─ public/                 App 圖示（SVG、PNG）
├─ supabase/migrations/    資料表、trigger、RLS 權限的 SQL
├─ docs/                   技術文件、功能說明
└─ src/
   ├─ main.ts              建立 Vue App，掛上 Pinia 與 Router
   ├─ App.vue              版面骨架：上方標題列、內容區、底部導覽
   ├─ router.ts            路由表與登入檢查
   ├─ style.css            Tailwind 匯入、深色模式設定、共用樣式
   ├─ db/                  資料層
   │  ├─ types.ts          資料表型別、部位清單、同步順序
   │  ├─ local.ts          Dexie 資料庫定義、新增／修改／刪除的共用函式
   │  ├─ sync.ts           與 Supabase 的同步邏輯
   │  ├─ workouts.ts       訓練相關操作（加入動作、新增組、排序、上次紀錄）
   │  ├─ templates.ts      範本相關操作
   │  ├─ categories.ts     類別相關操作、useCategories()
   │  └─ defaults.ts       第一次登入時建立的預設動作
   ├─ lib/
   │  ├─ supabase.ts       Supabase client
   │  ├─ exchange.ts       匯出（TSV、CSV）與匯入（解析、檢查、寫入）
   │  └─ format.ts         日期、數字、組數的顯示格式
   ├─ stores/              Pinia
   │  ├─ auth.ts           登入、登出、目前使用者
   │  └─ sync.ts           同步狀態、自動同步的觸發時機
   ├─ composables/
   │  ├─ useLiveQuery.ts   把 Dexie 查詢接成 Vue 的響應式資料
   │  └─ useTheme.ts       深色模式切換
   ├─ directives/
   │  └─ sortable.ts       v-sortable 拖曳排序指令
   ├─ components/          共用元件
   └─ views/               頁面
```

---

## 3. 樣式與 UI

### 3.1 Tailwind CSS v4
- 透過 `@tailwindcss/vite` 外掛整合，**沒有 `tailwind.config.js`**。v4 的設定都寫在 CSS 裡。
- 入口是 `src/style.css`：

```css
@import 'tailwindcss';

/* 深色模式改成看 <html class="dark">，不是只看系統設定 */
@custom-variant dark (&:where(.dark, .dark *));
```

### 3.2 共用樣式（`@utility`）
常用的組合寫成自訂 utility，用法跟一般 Tailwind class 一樣，也可以再疊加其他 class。

| class | 用途 |
|---|---|
| `card` | 圓角卡片（白底／深色底、邊框、內距） |
| `btn` | 按鈕基本樣式（圓角、按下縮小、disabled 半透明） |
| `btn-primary` | 主要按鈕（綠色） |
| `btn-ghost` | 次要按鈕（灰底） |
| `input` | 輸入框、下拉選單、textarea 共用樣式（含 focus 外框） |

> Tailwind v4 不能 `@apply` 一個寫在 `@layer components` 裡的 class，所以這些都用 `@utility` 定義。`btn-primary` 才能 `@apply btn`。

範例：

```html
<button class="btn-primary w-full">開始訓練</button>
<input class="input py-2 text-center" />
```

### 3.3 表單元件
**全部使用原生 HTML 元素**，再用 Tailwind 調整樣式：

| 用途 | 元素 | 說明 |
|---|---|---|
| 重量 | `<input inputmode="decimal">` | iPhone 會跳出有小數點的數字鍵盤 |
| 次數、組數 | `<input inputmode="numeric" pattern="[0-9]*">` | iPhone 會跳出純數字鍵盤 |
| 日期 | `<input type="date">` | 使用系統內建的日期選擇器 |
| 部位 | `<select>` | 使用系統內建的選單 |
| 匯入資料 | `<textarea>` | |
| 檔案 | `<input type="file">` | 藏起來，外面包一個按鈕樣式的 `<label>` |
| 勾選 | `<input type="checkbox">` | 用 `accent-emerald-500` 改顏色 |

不用 `type="number"`，原因是：
- iOS 的 `type="number"` 跳出的是含符號的鍵盤，不是純數字鍵盤
- 可以輸入 `e`、`-` 這類字元
- 數值為空和數值無效時都讀到空字串，很難分辨

其他細節：
- 所有輸入框的字級都固定是 **16px**。iOS 遇到小於 16px 的輸入框，focus 時會自動放大畫面。
- 數字輸入框 focus 時會**全選**，方便直接覆蓋。

### 3.4 自製元件

| 元件 | 用途 |
|---|---|
| `LazyInput.vue` | 輸入中不會被外部資料覆蓋的輸入框（見 3.5） |
| `BottomSheet.vue` | 從下方滑出的面板，用 `<Teleport to="body">`，點背景關閉 |
| `ExercisePicker.vue` | 選擇動作：搜尋、類別篩選、找不到時直接新增 |
| `CategoryChips.vue` | 類別篩選按鈕列（全部／各類別／未分類） |
| `CategoryManager.vue` | 管理類別：新增、改名、拖曳排序、刪除 |
| `WorkoutEditor.vue` | 訓練編輯器（今日訓練、歷史紀錄共用） |
| `ImportSheet.vue` | 匯入資料：貼上、選檔、預覽、確認 |
| `BottomNav.vue` | 底部導覽列，子頁面也會標示所在分頁 |
| `SyncBadge.vue` | 右上角同步狀態（綠：已同步、黃：同步中、紅：失敗、灰：離線），點擊立即同步 |

### 3.5 LazyInput：為什麼需要它
畫面上的資料來自 Dexie 的 live query，任何寫入都會觸發重繪。Vue 重繪時**一定會重設 input 的 `value`**，就算值沒變也一樣。所以使用者正在輸入、還沒存檔的內容會被清掉，例如：
- 剛填完重量、正在打次數，重量存檔觸發重繪，次數被清空
- 背景同步完成，更新了 `_dirty` 欄位，觸發重繪

`LazyInput` 的做法：
1. 用元件自己的 `text` 狀態綁定輸入框。
2. focus 期間，外部 `value` 改變**不會**覆蓋 `text`。
3. blur 或按 Enter 時才解析數值，有變動才 `emit('commit')`。

```vue
<LazyInput class="input" kind="decimal" :value="s.weight" @commit="saveSet(s, 'weight', $event)" />
```

`kind` 有三種：`decimal`（重量）、`int`（次數、組數）、`text`（備註、名稱）。

### 3.6 深色模式
- 設定有三種：跟隨系統、淺色、深色，存在 `localStorage` 的 `theme`。
- `index.html` 裡有一小段 inline script，在 Vue 載入**前**就加上 `html.dark`，避免畫面先白一下再變黑。
- `useTheme.ts` 負責切換，也會監聽系統設定的變化，並更新 `<meta name="theme-color">`。
- 元件寫法：`bg-white dark:bg-neutral-900`。

### 3.7 iPhone 相關處理
- `viewport-fit=cover`，加上 `env(safe-area-inset-*)`，避開瀏海和底部 Home 指示條。
- `min-h-dvh` 取代 `100vh`，避免 Safari 網址列造成高度計算錯誤。
- `overscroll-behavior-y: none`：關掉頁面拉到底的回彈效果。
- `-webkit-tap-highlight-color: transparent`：去掉點擊時的灰色底。
- 拖曳把手加上 `touch-none`，按住把手時不會捲動頁面。

---

## 4. 資料層

### 4.1 資料表

| 資料表 | 說明 | 主要欄位 |
|---|---|---|
| `categories` | 動作類別 | `name`、`sort_order`、`code`（預設類別的代碼，自訂類別是 null） |
| `exercises` | 動作 | `name`、`category_id`（null = 未分類）、`note`、`sort_order` |
| `templates` | 課表範本 | `name`、`note`、`sort_order` |
| `template_items` | 範本中的動作 | `template_id`、`exercise_id`、`sort_order`、`target_sets`、`target_reps`、`target_weight` |
| `workouts` | 一次訓練 | `date`（本地日期 YYYY-MM-DD）、`template_id`、`note` |
| `workout_sets` | 每一組 | `workout_id`、`exercise_id`、`exercise_order`、`set_no`、`weight`、`reps`、`unit`、`note` |

每張表都有的共通欄位：

| 欄位 | 說明 |
|---|---|
| `id` | UUID，由前端 `crypto.randomUUID()` 產生，離線新增也不會撞號 |
| `user_id` | 擁有者，由資料庫 trigger 設定，前端不會上傳 |
| `created_at` / `updated_at` | 前端時間；`updated_at` 用來判斷哪一份比較新 |
| `deleted_at` | 軟刪除。資料不會真的刪掉，同步時其他裝置才知道被刪了 |
| `server_updated_at` | 伺服器收到資料的時間，同步時用它當「上次拉到哪裡」的游標 |
| `_dirty` | **只存在本機**：1 = 還沒上傳 |

**類別**：每個人有自己的類別清單，分成兩種：

| | 預設類別 | 自訂類別 |
|---|---|---|
| 項目 | 胸、背、腿、肩、手臂、核心、其他 | 使用者自己新增的 |
| `code` | `chest`、`back`、`legs`、`shoulders`、`arms`、`core`、`other` | `null` |
| 排序 | 可以 | 可以 |
| 改名、刪除 | **不行** | 可以 |

- 每次同步完都會檢查，缺少的預設類別會自動補上（新使用者第一次登入時會全部建立）。
- 預設類別的鎖定有兩層：前端 `categories.ts` 會擋，資料庫的 `protect_default_category` trigger 也會把改名、刪除還原，`(user_id, code)` 的唯一索引則防止重複建立。
- 刪除自訂類別時，底下動作的 `category_id` 會改成 null，顯示為「未分類」。

> `exercises.category` 是舊版的固定部位欄位（`chest`、`back`…），`0002_categories.sql` 已經把資料搬到 `category_id`。這個欄位保留只是為了讓舊版 App 同步不會失敗，程式已經不再使用。

`unit` 欄位目前固定是 `kg`，`lb` 是預留給之後支援磅用的。

欄位命名本機和雲端一致（snake_case），同步時不需要轉換。

### 4.2 本機資料庫（Dexie）
- 定義在 `src/db/local.ts`，資料庫名稱 `gym-log`。
- 所有寫入都要透過共用函式，才會自動處理 `id`、時間、`_dirty`：

| 函式 | 說明 |
|---|---|
| `insertRow(table, data)` | 新增，自動產生 `id`、時間，標記 `_dirty = 1` |
| `updateRow(table, id, changes)` | 修改，更新 `updated_at`，標記 `_dirty = 1` |
| `deleteRow(table, id)` | 軟刪除，設定 `deleted_at` |
| `alive(row)` | 過濾掉已刪除的資料，查詢時要記得加 |

- 畫面用 `useLiveQuery(() => 查詢, 初始值)` 取資料。本機資料一變動，畫面就自動更新，不需要手動重新查詢。

### 4.3 Supabase 端（`supabase/migrations/0001_init.sql`）

**Trigger `gym_before_write`**，每次寫入前執行：
- 新增時：`user_id` 設成目前登入的人（`auth.uid()`）
- 修改時：不允許改 `user_id`；如果送來的 `updated_at` 比資料庫裡的舊，**忽略這次寫入**
- 一律更新 `server_updated_at = now()`

**RLS（Row Level Security）**：每張表都只允許 `user_id = auth.uid()` 的讀寫。前端用的是公開的 publishable key，安全性完全靠這一層。

---

## 5. 同步機制

```
          使用者操作
              │
              ▼
   ┌──────────────────────┐
   │  IndexedDB (Dexie)   │ ← 畫面只讀這裡
   │  _dirty = 1          │
   └──────────┬───────────┘
              │  syncAll()
     ① push   │   ▲  ② pull
    (upsert)  ▼   │  (server_updated_at > 游標)
   ┌──────────────────────┐
   │ Supabase PostgreSQL  │
   └──────────────────────┘
```

### 5.1 流程（`src/db/sync.ts`）
1. **推送**：依序處理 `categories → exercises → templates → template_items → workouts → workout_sets`（被參照的表先推，外鍵才不會失敗）。把 `_dirty = 1` 的資料 upsert 上去，每批最多 1000 筆。
2. **清除標記**：只清除「上傳後沒有再被修改」的資料的 `_dirty`，避免同步途中的修改被漏掉。
3. **拉取**：每張表查詢 `server_updated_at > 上次游標` 的資料，寫回本機。如果本機有**更新的**未同步修改，保留本機版本。
4. **初始化**：補上缺少的預設類別；第一次使用時，再建立 23 個預設動作。如果雲端還沒執行 `0003_default_categories.sql`（拉下來的類別沒有 `code` 欄位），就先不補，避免建立重複的類別。

同一時間只會跑一個同步，重複呼叫會共用同一個 Promise。

### 5.2 自動同步的時機（`src/stores/sync.ts`）
- 登入後
- App 從背景切回前景（`visibilitychange`）
- 網路恢復（`online`）
- 匯入資料後
- 手動：點右上角狀態，或到設定頁按「立即同步」

### 5.3 衝突處理
**以 `updated_at` 較新的為準（last write wins）**。前端拉取時會比較，資料庫 trigger 也會擋掉較舊的寫入。目前只有一個人使用，這樣就夠了。

### 5.4 登出
登出前會先嘗試同步一次，然後**清空本機資料**。離線時也可以登出，但還沒上傳的資料會遺失。

---

## 6. 路由

| 路徑 | 頁面 | 說明 |
|---|---|---|
| `/` | `TodayView` | 今日訓練 |
| `/history` | `HistoryView` | 歷史紀錄列表 |
| `/workouts/:id` | `WorkoutView` | 檢視／編輯某次訓練 |
| `/templates` | `TemplatesView` | 範本列表 |
| `/templates/:id` | `TemplateEditView` | 編輯範本 |
| `/exercises` | `ExercisesView` | 動作庫 |
| `/settings` | `SettingsView` | 設定 |
| `/login` | `LoginView` | 登入（不需要登入就能進入） |

`router.beforeEach` 會等登入狀態初始化完成。沒登入就導到 `/login`，已登入卻進 `/login` 就導回首頁。

如果沒有設定 Supabase 環境變數，會略過登入檢查，並在畫面上方顯示黃色提示，方便純前端開發。

---

## 7. 拖曳排序

`src/directives/sortable.ts` 提供 `v-sortable` 指令，底層用 SortableJS：

```vue
<div v-sortable="(from, to) => reorderSets(id, exerciseId, from, to)">
  <div v-for="s in sets" :key="s.id" class="sortable-item">
    <span class="drag-handle">⠿</span>
    ...
  </div>
</div>
```

- 只有 `.drag-handle` 可以拖曳；只有 `.sortable-item` 會參與排序。
- **放開後先把 DOM 還原**，再呼叫 callback 更新資料，交給 Vue 依資料重新渲染。不這樣做的話，SortableJS 直接改 DOM 會跟 Vue 的虛擬 DOM 衝突，畫面會亂掉。
- 排序更新包在一個 Dexie transaction 裡，畫面不會看到中間狀態。

---

## 8. 匯出／匯入（`src/lib/exchange.ts`）

### 欄位順序
```
日期  動作  部位  組  重量  單位  次數  備註  訓練備註
```
每一組一列。只匯出有填重量或次數的組。

### 匯出
- **複製**：Tab 分隔（TSV），貼到 Excel／Google 試算表會自動分欄。欄位內的 Tab 和換行會換成空白。
- **下載 CSV**：開頭加 UTF-8 BOM，Excel 打開中文才不會亂碼；換行用 `\r\n`。

### 匯入
1. **解析**：第一行有 Tab 就當 TSV，否則當 CSV。支援引號包起來的欄位，以及欄位內換行。
2. **對應欄位**：第一列含「日期」和「動作」就當成標題列，依標題名稱對應欄位，所以欄位順序可以不同；沒有標題列就照預設順序。
3. **檢查**：
   - 日期接受 `2026-11-10`、`2026/11/10`、`2026.11.10`，也會檢查日期是否存在
   - 重量要是數字、次數要是整數，兩個不能同時是空的
   - 部位填類別名稱。只對**新動作**有作用：不存在的類別會自動建立，空白或「未分類」會變成未分類。已經存在的動作維持原本的類別
   - 單位填 `lb`、`lbs`、`磅` 會當成磅，其他一律當成 kg
   - 組號空白的話自動遞增
4. **預覽**：顯示會匯入幾次訓練、幾組、會新增哪些動作，並列出有問題的資料列和原因。
5. **寫入**：同一天的資料合併成一次訓練。預設**略過本機已經有紀錄的日期**，避免重複匯入。全部寫入包在一個 transaction 裡，最後觸發同步。

---

## 9. PWA

設定在 `vite.config.ts` 的 `VitePWA()`：
- `registerType: 'autoUpdate'`：有新版時在背景下載，下次開啟 App 時套用
- Workbox 預先快取所有打包出來的檔案，離線也能開啟
- `navigateFallback: '/index.html'`：離線時任何路徑都能開啟
- 圖示：`public/pwa-192.png`、`pwa-512.png`（也當 maskable 用）、`apple-touch-icon.png`（iOS 主畫面用）
- `index.html` 有 `apple-mobile-web-app-*` 等 meta，讓 iOS 以全螢幕模式開啟

> iOS 上從主畫面開啟的 App 和 Safari 的儲存空間是分開的，所以登入狀態、本機資料都不共用。

---

## 10. 開發指令

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器，`http://localhost:5173` |
| `npm run build` | 型別檢查（`vue-tsc -b`）+ 打包到 `dist/` |
| `npm run type-check` | 只做型別檢查 |
| `npm run preview` | 預覽打包結果（可以測試 PWA） |

### 環境變數
| 名稱 | 說明 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 專案網址 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key（公開金鑰） |

- 本機開發：複製 `.env.example` 為 `.env`
- 正式環境：已寫在 `.env.production`，部署平台不用另外設定

> 這兩個值都會打包進前端程式，本來就是公開的。**絕對不要**把 Supabase 的 `secret` / `service_role` key 放進任何 `VITE_` 開頭的變數。

### 開發注意事項
- 新增資料表時，要同時修改：`supabase/migrations/` 的 SQL、`src/db/types.ts` 的型別和 `SYNC_TABLES`、`src/db/local.ts` 的 Dexie schema（要**升版本號** `db.version(n)`）。
- 資料庫變更要新增一個編號更大的 SQL 檔（例如 `0003_xxx.sql`），不要修改已經執行過的檔案。部署時要**先執行 SQL，再更新前端**。
- 本機資料庫目前是第 3 版：
  - v2：新增 `categories`，並清除 `exercises` 的同步游標，讓動作重新從雲端拉一次，取得 `category_id`
  - v3：清除 `categories` 的同步游標，重新拉一次以取得 `code`
- 查詢時記得用 `alive` 過濾掉已刪除的資料。
- 寫入一律透過 `insertRow` / `updateRow` / `deleteRow`，不要直接呼叫 Dexie 的 `add` / `put`，不然不會被同步。
- 會被資料更新影響的輸入框，請用 `LazyInput`，不要用 `:value` + `@change`。
