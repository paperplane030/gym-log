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
      const { data } = await supabase.auth.getSession()
      apply(data.session)
      supabase.auth.onAuthStateChange((_event, s) => apply(s))
      ready.value = true
    })()
    return readyPromise
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
