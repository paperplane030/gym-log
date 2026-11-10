import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearLocal, setLocalUser } from '@/db/local'
import { useSyncStore } from './sync'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(false)
  const user = computed(() => session.value?.user ?? null)

  let readyPromise: Promise<void> | null = null

  function init() {
    if (readyPromise) return readyPromise
    readyPromise = (async () => {
      // callback 裡不能直接呼叫其他 Supabase 函式（會互相等待卡住），延到下一輪再處理
      supabase.auth.onAuthStateChange((_event, s) => setTimeout(() => apply(s), 0))

      // token 過期時 getSession 會連網更新；收訊差時可能卡很久，最多等 3 秒
      const result = await Promise.race([
        supabase.auth.getSession().then((r) => r.data.session),
        new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 3000)),
      ])
      apply(result === 'timeout' ? readStoredSession() : result)
      ready.value = true
    })()
    return readyPromise
  }

  /** 直接讀手機裡記住的登入狀態（不連網） */
  function readStoredSession(): Session | null {
    try {
      const key = Object.keys(localStorage).find((k) => /^sb-.+-auth-token$/.test(k))
      const data = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null
      return data?.user ? (data as Session) : null
    } catch {
      return null
    }
  }

  function apply(s: Session | null) {
    const prev = session.value?.user.id
    session.value = s
    if (s) {
      setLocalUser(s.user.id)
      if (prev !== s.user.id) void useSyncStore().sync()
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    // 登出前盡量把資料推上去，再清空本機
    try {
      await useSyncStore().sync()
    } catch {
      /* 離線時仍允許登出 */
    }
    await supabase.auth.signOut()
    await clearLocal()
  }

  return { session, user, ready, init, signInWithGoogle, signOut }
})
