<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { useTheme, type ThemePref } from '@/composables/useTheme'

const auth = useAuthStore()
const sync = useSyncStore()
const { pref } = useTheme()

const themes: { value: ThemePref; label: string }[] = [
  { value: 'system', label: '跟隨系統' },
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
]

async function logout() {
  if (!confirm('確定登出？本機資料會在同步後清除。')) return
  await auth.signOut()
  location.href = '/login'
}
</script>

<template>
  <div class="space-y-4">
    <section class="card space-y-3">
      <h2 class="font-medium">外觀</h2>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="t in themes"
          :key="t.value"
          class="btn"
          :class="pref === t.value ? 'bg-emerald-500 text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800'"
          @click="pref = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </section>

    <section class="card space-y-2">
      <h2 class="font-medium">同步</h2>
      <p class="text-sm text-neutral-500">
        {{ sync.lastSyncedAt ? `上次同步：${sync.lastSyncedAt.toLocaleString()}` : '尚未同步' }}
      </p>
      <p v-if="sync.error" class="text-sm text-red-500">{{ sync.error }}</p>
      <button class="btn-ghost w-full" :disabled="sync.syncing" @click="sync.sync()">
        {{ sync.syncing ? '同步中…' : '立即同步' }}
      </button>
    </section>

    <section class="card space-y-2">
      <h2 class="font-medium">資料</h2>
      <p class="text-sm text-neutral-500">匯出／匯入（Excel 格式）— 待實作</p>
    </section>

    <section v-if="auth.user" class="card space-y-2">
      <h2 class="font-medium">帳號</h2>
      <p class="text-sm text-neutral-500">{{ auth.user.email }}</p>
      <button class="btn-ghost w-full text-red-500" @click="logout">登出</button>
    </section>
  </div>
</template>
