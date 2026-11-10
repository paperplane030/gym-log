import { registerSW } from 'virtual:pwa-register'

/**
 * Service Worker 更新策略：
 * 新版下載好後先「等待」，不立刻接手，避免開著的舊畫面載入不到舊版檔案。
 * 等使用者下次切換頁面時，才讓新版接手並重新載入到目標頁面。
 */
let registration: ServiceWorkerRegistration | undefined

export function initPwa() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registration = r
      // App 從背景切回來時檢查有沒有新版
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') r?.update().catch(() => {})
      })
    },
  })
}

/** 有新版在等待接手 */
export const hasPendingUpdate = () => Boolean(registration?.waiting && navigator.serviceWorker.controller)

/** 讓新版接手，然後載入指定網址 */
export function applyUpdateAndGo(url: string) {
  const waiting = registration?.waiting
  let done = false
  const go = () => {
    if (done) return
    done = true
    location.assign(url)
  }
  if (!waiting) return go()
  navigator.serviceWorker.addEventListener('controllerchange', go, { once: true })
  waiting.postMessage({ type: 'SKIP_WAITING' })
  setTimeout(go, 3000) // 保險：沒收到 controllerchange 也照樣前往
}

/** 判斷是不是「頁面檔案載入失敗」（各瀏覽器訊息不同） */
export const isChunkLoadError = (err: unknown) =>
  /dynamically imported module|Importing a module script failed|Failed to load module script|error loading dynamically imported module|Couldn't resolve component/i.test(
    String((err as Error)?.message ?? err),
  )

/** 重新載入到目標頁面；10 秒內最多一次，避免無限重新整理 */
export function reloadTo(url: string) {
  const key = 'chunk-reload-at'
  try {
    const last = Number(sessionStorage.getItem(key) || 0)
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    /* ignore */
  }
  location.assign(url)
}
