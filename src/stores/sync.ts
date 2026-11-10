import { defineStore } from 'pinia'
import { ref } from 'vue'
import { syncAll } from '@/db/sync'

export const useSyncStore = defineStore('sync', () => {
  const syncing = ref(false)
  const lastSyncedAt = ref<Date | null>(null)
  const error = ref<string | null>(null)
  const online = ref(navigator.onLine)

  async function sync() {
    if (!navigator.onLine) return
    syncing.value = true
    error.value = null
    try {
      await syncAll()
      lastSyncedAt.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      syncing.value = false
    }
  }

  // 恢復網路、回到 App 時自動同步
  window.addEventListener('online', () => {
    online.value = true
    void sync()
  })
  window.addEventListener('offline', () => (online.value = false))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sync()
  })

  return { syncing, lastSyncedAt, error, online, sync }
})
